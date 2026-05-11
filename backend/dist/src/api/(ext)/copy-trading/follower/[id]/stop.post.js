"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Stop Subscription",
    description: "Stops a subscription permanently and returns all allocated funds to wallet.",
    operationId: "stopCopyTradingSubscription",
    tags: ["Copy Trading", "Followers"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Stop following",
    middleware: ["copyTradingFollowerAction"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Subscription ID",
        },
    ],
    responses: {
        200: {
            description: "Subscription stopped successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            returnedFunds: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        currency: { type: "string" },
                                        amount: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Subscription not found" },
        429: { description: "Too Many Requests" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!(0, security_1.isValidUUID)(id)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid subscription ID" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching subscription");
    const subscription = await db_1.models.copyTradingFollower.findByPk(id, {
        include: [
            {
                model: db_1.models.copyTradingFollowerAllocation,
                as: "allocations",
                where: { isActive: true },
                required: false,
            },
        ],
    });
    if (!subscription) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Subscription not found" });
    }
    if (subscription.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Access denied" });
    }
    if (subscription.status === "STOPPED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Subscription is already stopped",
        });
    }
    const activeTrades = await db_1.models.copyTradingTrade.count({
        where: { followerId: id, status: "OPEN" },
    });
    if (activeTrades > 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot stop subscription with ${activeTrades} active trades. Please close all positions first.`,
        });
    }
    const leaderId = subscription.leaderId;
    const oldStatus = subscription.status;
    const allocations = subscription.allocations || [];
    const returnedFunds = [];
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Stopping subscription and returning funds");
    await db_1.sequelize.transaction(async (transaction) => {
        for (const allocation of allocations) {
            const allocationData = allocation;
            const [baseCurrency, quoteCurrency] = allocationData.symbol.split("/");
            const baseToReturn = allocationData.baseAmount - allocationData.baseUsedAmount;
            if (baseToReturn > 0) {
                const transferIdempotencyKey = `ct_stop_base_${id}_${allocationData.id}`;
                const transferResult = await wallet_1.walletService.transfer({
                    idempotencyKey: transferIdempotencyKey,
                    fromUserId: user.id,
                    toUserId: user.id,
                    fromWalletType: "COPY_TRADING",
                    toWalletType: "ECO",
                    fromCurrency: baseCurrency,
                    toCurrency: baseCurrency,
                    amount: baseToReturn,
                    description: `Transfer ${baseToReturn} ${baseCurrency} from CT to ECO wallet (stop subscription for ${allocationData.symbol})`,
                    metadata: {
                        followerId: id,
                        leaderId: subscription.leaderId,
                        allocationId: allocationData.id,
                        symbol: allocationData.symbol,
                        currencyType: "BASE",
                    },
                    transaction,
                });
                returnedFunds.push({ currency: baseCurrency, amount: baseToReturn });
                await (0, utils_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId: subscription.leaderId,
                    followerId: id,
                    type: "DEALLOCATION",
                    amount: baseToReturn,
                    currency: baseCurrency,
                    balanceBefore: transferResult.fromResult.previousBalance,
                    balanceAfter: transferResult.fromResult.newBalance,
                    description: `Transfer ${baseToReturn} ${baseCurrency} from CT to ECO wallet (stop subscription for ${allocationData.symbol})`,
                }, transaction);
            }
            const quoteToReturn = allocationData.quoteAmount - allocationData.quoteUsedAmount;
            if (quoteToReturn > 0) {
                const transferIdempotencyKey = `ct_stop_quote_${id}_${allocationData.id}`;
                const transferResult = await wallet_1.walletService.transfer({
                    idempotencyKey: transferIdempotencyKey,
                    fromUserId: user.id,
                    toUserId: user.id,
                    fromWalletType: "COPY_TRADING",
                    toWalletType: "ECO",
                    fromCurrency: quoteCurrency,
                    toCurrency: quoteCurrency,
                    amount: quoteToReturn,
                    description: `Transfer ${quoteToReturn} ${quoteCurrency} from CT to ECO wallet (stop subscription for ${allocationData.symbol})`,
                    metadata: {
                        followerId: id,
                        leaderId: subscription.leaderId,
                        allocationId: allocationData.id,
                        symbol: allocationData.symbol,
                        currencyType: "QUOTE",
                    },
                    transaction,
                });
                returnedFunds.push({
                    currency: quoteCurrency,
                    amount: quoteToReturn,
                });
                await (0, utils_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId: subscription.leaderId,
                    followerId: id,
                    type: "DEALLOCATION",
                    amount: quoteToReturn,
                    currency: quoteCurrency,
                    balanceBefore: transferResult.fromResult.previousBalance,
                    balanceAfter: transferResult.fromResult.newBalance,
                    description: `Transfer ${quoteToReturn} ${quoteCurrency} from CT to ECO wallet (stop subscription for ${allocationData.symbol})`,
                }, transaction);
            }
            await allocationData.update({ isActive: false }, { transaction });
        }
        await subscription.update({ status: "STOPPED" }, { transaction });
        await (0, utils_1.createAuditLog)({
            entityType: "FOLLOWER",
            entityId: id,
            action: "UNFOLLOW",
            oldValue: { status: oldStatus },
            newValue: { status: "STOPPED", returnedFunds },
            userId: user.id,
        }, transaction);
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating leader stats");
    await (0, utils_1.updateLeaderStats)(leaderId);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending follower notification");
    await (0, utils_1.notifyFollowerSubscriptionEvent)(id, "STOPPED", undefined, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending leader notification");
    await (0, utils_1.notifyLeaderFollowerStopped)(leaderId, user.id, undefined, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Subscription stopped");
    return {
        message: "Subscription stopped successfully",
        returnedFunds,
    };
};
