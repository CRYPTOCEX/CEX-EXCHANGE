"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const core_1 = require("@b/api/(ext)/copy-trading/utils/core");
const notifications_1 = require("@b/api/(ext)/copy-trading/utils/notifications");
const settings_core_1 = require("@b/api/(ext)/copy-trading/utils/settings-core");
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancelling open copy orders and releasing held funds");
    const { teardownOpenFollowerTrades } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/copy-trading/utils/teardown")));
    await teardownOpenFollowerTrades(id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for held positions");
    const heldPositions = await db_1.models.copyTradingTrade.findAll({
        where: {
            followerId: id,
            isLeaderTrade: false,
            status: { [sequelize_1.Op.in]: ["OPEN", "PARTIALLY_FILLED", "CLOSING"] },
            executedAmount: { [sequelize_1.Op.gt]: 0 },
        },
        attributes: ["id", "symbol", "side", "executedAmount"],
    });
    if (heldPositions.length > 0) {
        const symbols = [
            ...new Set(heldPositions.map((t) => t.symbol)),
        ].join(", ");
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`${heldPositions.length} position(s) still open: ${symbols}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `You still have ${heldPositions.length} open position(s) from this trader ` +
                `(${symbols}). They have to close before the subscription can be stopped, ` +
                `or the funds behind them cannot be returned to you. Pause the subscription ` +
                `to stop new trades being copied in the meantime.`,
        });
    }
    const leaderId = subscription.leaderId;
    const oldStatus = subscription.status;
    const allocations = await db_1.models.copyTradingFollowerAllocation.findAll({
        where: { followerId: id, isActive: true },
    });
    const returnedFunds = [];
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Stopping subscription and returning funds");
    await db_1.sequelize.transaction(async (transaction) => {
        for (const allocation of allocations) {
            const allocationData = allocation;
            const [baseCurrency, quoteCurrency] = allocationData.symbol.split("/");
            const refundWalletType = allocationData.marketType === "BINARY" ? "SPOT" : "ECO";
            const baseToReturn = allocationData.baseAmount - allocationData.baseUsedAmount;
            if (baseToReturn > 0) {
                const transferIdempotencyKey = `ct_stop_base_${id}_${allocationData.id}`;
                const transferResult = await wallet_1.walletService.transfer({
                    idempotencyKey: transferIdempotencyKey,
                    fromUserId: user.id,
                    toUserId: user.id,
                    fromWalletType: "COPY_TRADING",
                    toWalletType: refundWalletType,
                    fromCurrency: baseCurrency,
                    toCurrency: baseCurrency,
                    amount: baseToReturn,
                    description: `Transfer ${baseToReturn} ${baseCurrency} from CT to ${refundWalletType} wallet (stop subscription for ${allocationData.symbol})`,
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
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId: subscription.leaderId,
                    followerId: id,
                    type: "DEALLOCATION",
                    amount: baseToReturn,
                    currency: baseCurrency,
                    balanceBefore: transferResult.fromResult.previousBalance,
                    balanceAfter: transferResult.fromResult.newBalance,
                    description: `Transfer ${baseToReturn} ${baseCurrency} from CT to ${refundWalletType} wallet (stop subscription for ${allocationData.symbol})`,
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
                    toWalletType: refundWalletType,
                    fromCurrency: quoteCurrency,
                    toCurrency: quoteCurrency,
                    amount: quoteToReturn,
                    description: `Transfer ${quoteToReturn} ${quoteCurrency} from CT to ${refundWalletType} wallet (stop subscription for ${allocationData.symbol})`,
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
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId: subscription.leaderId,
                    followerId: id,
                    type: "DEALLOCATION",
                    amount: quoteToReturn,
                    currency: quoteCurrency,
                    balanceBefore: transferResult.fromResult.previousBalance,
                    balanceAfter: transferResult.fromResult.newBalance,
                    description: `Transfer ${quoteToReturn} ${quoteCurrency} from CT to ${refundWalletType} wallet (stop subscription for ${allocationData.symbol})`,
                }, transaction);
            }
            await allocationData.update({ isActive: false }, { transaction });
        }
        await subscription.update({ status: "STOPPED" }, { transaction });
        await (0, settings_core_1.createAuditLog)({
            entityType: "FOLLOWER",
            entityId: id,
            action: "UNFOLLOW",
            oldValue: { status: oldStatus },
            newValue: { status: "STOPPED", returnedFunds },
            userId: user.id,
        }, transaction);
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating leader stats");
    await (0, core_1.updateLeaderStats)(leaderId);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending follower notification");
    await (0, notifications_1.notifyFollowerSubscriptionEvent)(id, "STOPPED", undefined, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending leader notification");
    await (0, notifications_1.notifyLeaderFollowerStopped)(leaderId, user.id, undefined, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Subscription stopped");
    return {
        message: "Subscription stopped successfully",
        returnedFunds,
    };
};
