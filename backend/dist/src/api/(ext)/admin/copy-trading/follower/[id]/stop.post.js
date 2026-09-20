"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const settings_core_1 = require("@b/api/(ext)/copy-trading/utils/settings-core");
const teardown_1 = require("@b/api/(ext)/copy-trading/utils/teardown");
const wallet_1 = require("@b/services/wallet");
const transaction_1 = require("@b/utils/transaction");
exports.metadata = {
    summary: "Force stop copy trading follower subscription",
    description: "Administratively forces a follower subscription to stop, returns any unused allocated funds to the user's wallet, creates a deallocation transaction record, decrements the leader's follower count, and creates an audit log entry. This operation uses database transactions to ensure data consistency. Returns an error if the subscription is already stopped.",
    operationId: "forceStopCopyTradingFollower",
    tags: ["Admin", "Copy Trading", "Follower"],
    requiresAuth: true,
    permission: "edit.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Force Stop Copy Trading Follower Subscription",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Unique identifier of the follower subscription to stop",
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "Administrative reason for force stopping the subscription",
                            example: "Policy violation",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Follower subscription stopped successfully and funds returned",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                example: "Subscription stopped successfully",
                                description: "Success message",
                            },
                            returnedFunds: {
                                type: "array",
                                description: "Allocation balances returned to the follower's ECO/SPOT wallets by this stop.",
                                items: {
                                    type: "object",
                                    properties: {
                                        currency: { type: "string" },
                                        amount: { type: "number" },
                                    },
                                },
                            },
                        },
                        required: ["message"],
                    },
                },
            },
        },
        400: {
            description: "Bad request - subscription already stopped, or the follower still holds open positions whose funds cannot be returned yet",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                example: "Subscription already stopped",
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Follower"),
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    const { reason } = body || {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching follower subscription");
    const preCheck = await db_1.models.copyTradingFollower.findByPk(id);
    if (!preCheck) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Follower not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Follower not found" });
    }
    if (preCheck.status === "STOPPED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Subscription already stopped");
        throw (0, error_1.createError)({ statusCode: 400, message: "Subscription already stopped" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancelling open copy orders and releasing held funds");
    await (0, teardown_1.teardownOpenFollowerTrades)(id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for held positions");
    const heldPositions = await db_1.models.copyTradingTrade.findAll({
        where: {
            followerId: id,
            isLeaderTrade: false,
            status: { [sequelize_1.Op.in]: ["OPEN", "PARTIALLY_FILLED", "CLOSING"] },
            executedAmount: { [sequelize_1.Op.gt]: 0 },
        },
        attributes: ["id", "symbol"],
    });
    if (heldPositions.length > 0) {
        const symbols = [...new Set(heldPositions.map((p) => p.symbol))].join(", ");
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`${heldPositions.length} position(s) still open: ${symbols}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `This follower still holds ${heldPositions.length} open position(s) (${symbols}). ` +
                `Stopping now would leave the funds behind them in the COPY_TRADING wallet with no ` +
                `way out. Pause the subscription to halt new copies, and stop it once the positions ` +
                `have closed.`,
        });
    }
    const returnedFunds = [];
    const t = await db_1.sequelize.transaction();
    try {
        const follower = await db_1.models.copyTradingFollower.findByPk(id, {
            include: [
                { model: db_1.models.user, as: "user" },
                { model: db_1.models.copyTradingLeader, as: "leader" },
            ],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!follower) {
            await t.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Follower not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Follower not found" });
        }
        const followerData = follower;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating follower status");
        if (followerData.status === "STOPPED") {
            await t.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Subscription already stopped");
            throw (0, error_1.createError)({ statusCode: 400, message: "Subscription already stopped" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Returning allocated funds");
        const allocations = await db_1.models.copyTradingFollowerAllocation.findAll({
            where: { followerId: id, isActive: true },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        for (const allocation of allocations) {
            const [baseCurrency, quoteCurrency] = String(allocation.symbol).split("/");
            const refundWalletType = allocation.marketType === "BINARY" ? "SPOT" : "ECO";
            const legs = [
                {
                    currency: baseCurrency,
                    amount: (Number(allocation.baseAmount) || 0) -
                        (Number(allocation.baseUsedAmount) || 0),
                    currencyType: "BASE",
                },
                {
                    currency: quoteCurrency,
                    amount: (Number(allocation.quoteAmount) || 0) -
                        (Number(allocation.quoteUsedAmount) || 0),
                    currencyType: "QUOTE",
                },
            ];
            for (const leg of legs) {
                if (!(leg.amount > 0) || !leg.currency)
                    continue;
                const transferResult = await wallet_1.walletService.transfer({
                    idempotencyKey: `ct_admin_stop_${leg.currencyType.toLowerCase()}_${id}_${allocation.id}`,
                    fromUserId: followerData.userId,
                    toUserId: followerData.userId,
                    fromWalletType: "COPY_TRADING",
                    toWalletType: refundWalletType,
                    fromCurrency: leg.currency,
                    toCurrency: leg.currency,
                    amount: leg.amount,
                    description: `Transfer ${leg.amount} ${leg.currency} from CT to ${refundWalletType} wallet (admin force stop for ${allocation.symbol})`,
                    metadata: {
                        followerId: id,
                        leaderId: followerData.leaderId,
                        allocationId: allocation.id,
                        symbol: allocation.symbol,
                        currencyType: leg.currencyType,
                        adminId: user.id,
                    },
                    transaction: t,
                });
                returnedFunds.push({ currency: leg.currency, amount: leg.amount });
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: followerData.userId,
                    leaderId: followerData.leaderId,
                    followerId: id,
                    type: "DEALLOCATION",
                    amount: leg.amount,
                    currency: leg.currency,
                    balanceBefore: transferResult.fromResult.previousBalance,
                    balanceAfter: transferResult.fromResult.newBalance,
                    description: `Transfer ${leg.amount} ${leg.currency} from CT to ${refundWalletType} wallet (admin force stop for ${allocation.symbol})`,
                }, t);
            }
            await allocation.update({ isActive: false }, { transaction: t });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating follower status");
        await follower.update({
            status: "STOPPED",
        }, { transaction: t });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
        await (0, settings_core_1.createAuditLog)({
            userId: user.id,
            action: "ADMIN_FORCE_STOP",
            entityType: "copyTradingFollower",
            entityId: id,
            metadata: {
                reason,
                followerId: followerData.userId,
                leaderId: followerData.leaderId,
                returnedFunds,
            },
            ipAddress: ((_a = data.request) === null || _a === void 0 ? void 0 : _a.ip) || "unknown",
        });
        await t.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Subscription stopped successfully");
        return {
            message: "Subscription stopped successfully",
            returnedFunds,
        };
    }
    catch (error) {
        await (0, transaction_1.rollbackIfActive)(t);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to stop subscription");
        throw error;
    }
};
