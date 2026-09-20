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
exports.LIVE_TRADE_STATUSES = void 0;
exports.teardownFollowerTrade = teardownFollowerTrade;
exports.teardownOpenFollowerTrades = teardownOpenFollowerTrades;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
exports.LIVE_TRADE_STATUSES = [
    "PENDING",
    "PENDING_REPLICATION",
    "REPLICATED",
    "OPEN",
    "PARTIALLY_FILLED",
];
async function resolveFollowerUserId(followerTrade) {
    var _a;
    if ((_a = followerTrade.follower) === null || _a === void 0 ? void 0 : _a.userId)
        return followerTrade.follower.userId;
    if (followerTrade.followerId) {
        const f = await db_1.models.copyTradingFollower.findByPk(followerTrade.followerId, {
            attributes: ["userId"],
        });
        return f ? f.userId : null;
    }
    return null;
}
async function teardownFollowerTrade(followerTrade) {
    var _a;
    try {
        const userId = await resolveFollowerUserId(followerTrade);
        if (followerTrade.marketType === "BINARY") {
            if (!followerTrade.followerOrderId) {
                const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                    where: {
                        followerId: followerTrade.followerId,
                        symbol: followerTrade.symbol,
                        marketType: "BINARY",
                    },
                });
                const allocationId = allocation ? allocation.id : null;
                let placedOrder = null;
                if (userId) {
                    try {
                        placedOrder = await db_1.models.binaryOrder.findOne({
                            where: {
                                userId,
                                metadata: {
                                    idempotencyKey: `ct_binary_${followerTrade.leaderOrderId}_${followerTrade.followerId}`,
                                },
                            },
                        });
                    }
                    catch (_b) {
                    }
                }
                if (placedOrder) {
                    const { reopenBinaryClaimWithOrder } = await Promise.resolve().then(() => __importStar(require("./binary")));
                    const adopted = await reopenBinaryClaimWithOrder(followerTrade.id, placedOrder, allocationId);
                    if (adopted) {
                        followerTrade.followerOrderId = placedOrder.id;
                        followerTrade.status = "OPEN";
                    }
                    else {
                        const { releaseBinaryClaim } = await Promise.resolve().then(() => __importStar(require("./binary")));
                        await releaseBinaryClaim(followerTrade.id, allocationId, Number(followerTrade.amount) || 0, "Claim released during teardown (adopt of in-flight order failed)");
                        return true;
                    }
                }
                else {
                    const { releaseBinaryClaim } = await Promise.resolve().then(() => __importStar(require("./binary")));
                    await releaseBinaryClaim(followerTrade.id, allocationId, Number(followerTrade.amount) || 0, "Claim released during teardown (subscription stopped / market disabled)");
                    return true;
                }
            }
            if (userId) {
                try {
                    const { BinaryOrderService } = await Promise.resolve().then(() => __importStar(require("@b/api/exchange/binary/order/util/BinaryOrderService")));
                    const result = await BinaryOrderService.cancelOrder(userId, followerTrade.followerOrderId);
                    const order = await db_1.models.binaryOrder.findOne({
                        where: { id: followerTrade.followerOrderId },
                    });
                    const orderStatus = order === null || order === void 0 ? void 0 : order.status;
                    const { handleBinaryOrderCanceled, settleBinaryCopyTrade } = await Promise.resolve().then(() => __importStar(require("./binary")));
                    if (orderStatus && ["WIN", "LOSS", "DRAW"].includes(orderStatus)) {
                        await settleBinaryCopyTrade(followerTrade, orderStatus, Number(order.profit) || 0, order.closePrice != null
                            ? Number(order.closePrice)
                            : undefined);
                        return true;
                    }
                    const stake = Number(followerTrade.amount) || 0;
                    let refunded;
                    try {
                        const rawMeta = order === null || order === void 0 ? void 0 : order.metadata;
                        const meta = typeof rawMeta === "string" ? JSON.parse(rawMeta) : rawMeta || {};
                        if ((meta === null || meta === void 0 ? void 0 : meta.refundedAmount) != null)
                            refunded = Number(meta.refundedAmount);
                    }
                    catch (_c) {
                    }
                    if (refunded === undefined) {
                        const refundPercentage = typeof (result === null || result === void 0 ? void 0 : result.refundPercentage) === "number"
                            ? result.refundPercentage
                            : 100;
                        refunded = Math.max(0, (stake * refundPercentage) / 100);
                    }
                    await handleBinaryOrderCanceled(followerTrade.followerOrderId, userId, refunded);
                    return true;
                }
                catch (cancelError) {
                    console_1.logger.warn("COPY_TRADING", `teardownFollowerTrade: binary order ${followerTrade.followerOrderId} not cancellable (${cancelError.message}); it will settle at expiry`);
                    return false;
                }
            }
            return false;
        }
        try {
            const { assertMatchingQueueAcceptsOrders } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/queries")));
            await assertMatchingQueueAcceptsOrders();
        }
        catch (error) {
            console_1.logger.warn("COPY_TRADING", `teardownFollowerTrade: refusing to tear down trade ${followerTrade.id} here — ` +
                `${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error} Nothing was written, so the trade stays recoverable; it ` +
                `can only be torn down on the process that holds the matching lease.`);
            return false;
        }
        const orderId = followerTrade.followerOrderId || followerTrade.leaderOrderId;
        let releasedAmount = 0;
        if (userId && orderId) {
            try {
                const { cancelEcosystemOrder } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/cancelOrder")));
                const res = await cancelEcosystemOrder(userId, orderId, "COPY_TRADING");
                if (res.reason === "deferred" || res.reason === "deferral_failed") {
                    console_1.logger.info("COPY_TRADING", `teardownFollowerTrade: cancellation of ${orderId} was handed to the matching ` +
                        `leaseholder (${res.reason}); leaving trade ${followerTrade.id} untouched until ` +
                        `the next reconcile pass confirms the release.`);
                    return false;
                }
                releasedAmount = res.refundAmount || 0;
            }
            catch (cancelError) {
                console_1.logger.warn("COPY_TRADING", `teardownFollowerTrade: failed to cancel/release ecosystem order ${orderId} for ${userId}: ${cancelError.message}`);
            }
        }
        const executedAmount = Number(followerTrade.executedAmount) || 0;
        if (executedAmount > 0 && String(followerTrade.status) !== "PARTIALLY_FILLED") {
            console_1.logger.warn("COPY_TRADING", `teardownFollowerTrade: trade ${followerTrade.id} has executed ${executedAmount} ` +
                `and is a HELD POSITION, not a cancellable order. Leaving it open — it must be ` +
                `closed through closeFollowerPosition, not torn down.`);
            return false;
        }
        await followerTrade.update({ status: "CANCELLED", closedAt: new Date() });
        const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
            where: {
                followerId: followerTrade.followerId,
                symbol: followerTrade.symbol,
                marketType: "SPOT",
                isActive: true,
            },
        });
        if (allocation) {
            const a = allocation;
            const executed = Number(followerTrade.executedAmount) || 0;
            if (followerTrade.side === "BUY") {
                const fallback = executed > 0 ? 0 : Number(followerTrade.cost) || 0;
                const release = Number(releasedAmount) || fallback;
                await a.update({
                    quoteUsedAmount: (0, sequelize_1.literal)(`GREATEST(0, quoteUsedAmount - ${release})`),
                });
            }
            else {
                const fallback = executed > 0 ? 0 : Number(followerTrade.amount) || 0;
                const release = Number(releasedAmount) || fallback;
                await a.update({
                    baseUsedAmount: (0, sequelize_1.literal)(`GREATEST(0, baseUsedAmount - ${release})`),
                });
            }
        }
        return true;
    }
    catch (e) {
        console_1.logger.error("COPY_TRADING", `teardownFollowerTrade failed for trade ${followerTrade === null || followerTrade === void 0 ? void 0 : followerTrade.id}: ${e.message}`);
        return false;
    }
}
async function teardownOpenFollowerTrades(followerId, symbol) {
    const where = {
        followerId,
        isLeaderTrade: false,
        status: { [sequelize_1.Op.in]: exports.LIVE_TRADE_STATUSES },
    };
    if (symbol)
        where.symbol = symbol;
    const trades = await db_1.models.copyTradingTrade.findAll({ where });
    let count = 0;
    for (const trade of trades) {
        if (await teardownFollowerTrade(trade))
            count++;
    }
    if (count > 0) {
        console_1.logger.info("COPY_TRADING", `Tore down ${count} open follower trade(s) for follower ${followerId}${symbol ? " (" + symbol + ")" : ""}`);
    }
    return count;
}
