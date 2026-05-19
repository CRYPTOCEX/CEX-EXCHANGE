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
exports.LeaderTradeListener = void 0;
exports.handleOrderCreated = handleOrderCreated;
exports.isActiveLeader = isActiveLeader;
exports.getLeaderInfo = getLeaderInfo;
exports.handleOrderCancelled = handleOrderCancelled;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const index_1 = require("./index");
class LeaderTradeListener {
    constructor() {
        this.isProcessing = false;
        this.pendingEvents = [];
        this.processInterval = null;
    }
    static getInstance() {
        if (!LeaderTradeListener.instance) {
            LeaderTradeListener.instance = new LeaderTradeListener();
        }
        return LeaderTradeListener.instance;
    }
    start(intervalMs = 1000) {
        if (this.processInterval) {
            return;
        }
        this.processInterval = setInterval(async () => {
            await this.processPendingEvents();
        }, intervalMs);
        console_1.logger.info("COPY_TRADING", "LeaderTradeListener started");
    }
    stop() {
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = null;
        }
        console_1.logger.info("COPY_TRADING", "LeaderTradeListener stopped");
    }
    async onOrderCreated(event) {
        try {
            const leader = await db_1.models.copyTradingLeader.findOne({
                where: {
                    userId: event.userId,
                    status: "ACTIVE",
                },
            });
            if (!leader) {
                return { success: true };
            }
            const leaderData = leader;
            const activeFollowers = await db_1.models.copyTradingFollower.count({
                where: {
                    leaderId: leaderData.id,
                    status: "ACTIVE",
                },
            });
            if (activeFollowers === 0) {
                return { success: true };
            }
            const leaderTrade = await db_1.models.copyTradingTrade.create({
                leaderId: leaderData.id,
                symbol: event.symbol,
                side: event.side,
                type: event.type,
                amount: event.amount,
                price: event.price,
                cost: event.side === "BUY" ? event.amount * event.price : event.amount,
                fee: 0,
                feeCurrency: event.symbol.split("/")[1] || "USDT",
                status: "PENDING",
                isLeaderTrade: true,
                leaderOrderId: event.orderId,
                executedAmount: 0,
                executedPrice: 0,
            });
            const tradeData = leaderTrade;
            const [, quoteCurrency] = event.symbol.split("/");
            const leaderWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(event.userId, quoteCurrency);
            const leaderBalance = leaderWallet
                ? parseFloat(leaderWallet.balance.toString())
                : 0;
            const result = await this.processLeaderTrade(tradeData, leaderData, leaderBalance);
            await (0, index_1.createAuditLog)({
                entityType: "copyTradingTrade",
                entityId: tradeData.id,
                action: "TRADE_CREATED",
                userId: event.userId,
                metadata: {
                    symbol: event.symbol,
                    side: event.side,
                    amount: event.amount,
                    price: event.price,
                    followers: activeFollowers,
                    processed: result.followersProcessed,
                },
            });
            return {
                success: true,
                tradeId: tradeData.id,
                followersProcessed: result.followersProcessed,
            };
        }
        catch (error) {
            console_1.logger.error("COPY_TRADING", "Error in LeaderTradeListener.onOrderCreated", error);
            return { success: false, error: error.message };
        }
    }
    async processLeaderTrade(trade, leader, leaderBalance) {
        try {
            const { queueLeaderTrade } = await Promise.resolve().then(() => __importStar(require("./copyQueue")));
            await queueLeaderTrade(trade.id, leader.id, trade.symbol, 0);
            console_1.logger.info("COPY_TRADING", `Queued leader trade ${trade.id} for processing`);
            return { followersProcessed: 0, errors: [] };
        }
        catch (error) {
            console_1.logger.error("COPY_TRADING", "Failed to queue leader trade", error);
            return { followersProcessed: 0, errors: [error.message] };
        }
    }
    async processPendingEvents() {
        if (this.isProcessing || this.pendingEvents.length === 0) {
            return;
        }
        this.isProcessing = true;
        try {
            while (this.pendingEvents.length > 0) {
                const event = this.pendingEvents.shift();
                if (event) {
                    await this.onOrderCreated(event);
                }
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    queueEvent(event) {
        this.pendingEvents.push(event);
    }
}
exports.LeaderTradeListener = LeaderTradeListener;
LeaderTradeListener.instance = null;
async function handleOrderCreated(orderId, userId, symbol, side, type, amount, price) {
    const listener = LeaderTradeListener.getInstance();
    return listener.onOrderCreated({
        orderId,
        userId,
        symbol,
        side,
        type,
        amount,
        price,
        status: "NEW",
        createdAt: new Date(),
    });
}
async function isActiveLeader(userId) {
    const leader = await db_1.models.copyTradingLeader.findOne({
        where: {
            userId,
            status: "ACTIVE",
        },
    });
    return !!leader;
}
async function getLeaderInfo(userId) {
    const leader = await db_1.models.copyTradingLeader.findOne({
        where: { userId, status: "ACTIVE" },
    });
    if (!leader)
        return null;
    const leaderData = leader;
    const followerCount = await db_1.models.copyTradingFollower.count({
        where: { leaderId: leaderData.id, status: "ACTIVE" },
    });
    return {
        id: leaderData.id,
        displayName: leaderData.displayName,
        followerCount,
    };
}
async function handleOrderCancelled(orderId, userId, symbol) {
    var _a, _b;
    try {
        const leader = await db_1.models.copyTradingLeader.findOne({
            where: {
                userId,
                status: "ACTIVE",
            },
        });
        if (!leader) {
            return { success: true };
        }
        const leaderData = leader;
        const leaderTrade = await db_1.models.copyTradingTrade.findOne({
            where: {
                leaderId: leaderData.id,
                leaderOrderId: orderId,
                isLeaderTrade: true,
                status: { [sequelize_1.Op.in]: ["PENDING", "OPEN", "PARTIALLY_FILLED"] },
            },
        });
        if (!leaderTrade) {
            return { success: true };
        }
        const tradeData = leaderTrade;
        console_1.logger.info("COPY_TRADING", `Leader cancelled order ${orderId}, cancelling copy trades for trade ${tradeData.id}`);
        await leaderTrade.update({
            status: "CANCELLED",
            closedAt: new Date(),
        });
        const followerTrades = await db_1.models.copyTradingTrade.findAll({
            where: {
                leaderOrderId: tradeData.leaderOrderId,
                isLeaderTrade: false,
                status: { [sequelize_1.Op.in]: ["PENDING", "OPEN", "PARTIALLY_FILLED"] },
            },
            include: [
                {
                    model: db_1.models.copyTradingFollower,
                    as: "follower",
                    include: [{ model: db_1.models.user, as: "user" }],
                },
            ],
        });
        let cancelledCount = 0;
        for (const followerTrade of followerTrades) {
            try {
                await followerTrade.update({
                    status: "CANCELLED",
                    closedAt: new Date(),
                });
                if (followerTrade.leaderOrderId && ((_a = followerTrade.follower) === null || _a === void 0 ? void 0 : _a.userId)) {
                    try {
                        const { cancelOrderByUuid } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/queries")));
                        const { getOrderByUuid } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/queries")));
                        const order = await getOrderByUuid(followerTrade.follower.userId, followerTrade.leaderOrderId, new Date(followerTrade.createdAt).toISOString());
                        if (order && order.status === "OPEN") {
                            await cancelOrderByUuid(followerTrade.follower.userId, followerTrade.leaderOrderId, new Date(followerTrade.createdAt).toISOString(), symbol, BigInt(order.price), order.side, BigInt(order.amount));
                        }
                    }
                    catch (cancelError) {
                        console_1.logger.warn("COPY_TRADING", `Failed to cancel ecosystem order for follower ${(_b = followerTrade.follower) === null || _b === void 0 ? void 0 : _b.userId}: ${cancelError.message}`);
                    }
                }
                const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                    where: {
                        followerId: followerTrade.followerId,
                        symbol,
                        isActive: true,
                    },
                });
                if (allocation) {
                    const allocData = allocation;
                    if (followerTrade.side === "BUY") {
                        await allocation.update({
                            quoteUsedAmount: Math.max(0, allocData.quoteUsedAmount - (followerTrade.cost || 0)),
                        });
                    }
                    else {
                        await allocation.update({
                            baseUsedAmount: Math.max(0, allocData.baseUsedAmount - (followerTrade.amount || 0)),
                        });
                    }
                }
                cancelledCount++;
            }
            catch (followerError) {
                console_1.logger.error("COPY_TRADING", `Failed to cancel follower trade ${followerTrade.id}: ${followerError.message}`);
            }
        }
        await (0, index_1.createAuditLog)({
            entityType: "copyTradingTrade",
            entityId: tradeData.id,
            action: "TRADE_CANCELLED",
            userId,
            metadata: {
                symbol,
                orderId,
                cancelledFollowers: cancelledCount,
            },
        });
        console_1.logger.info("COPY_TRADING", `Cancelled ${cancelledCount} follower trades for leader trade ${tradeData.id}`);
        return { success: true, cancelledCount };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Error in handleOrderCancelled", error);
        return { success: false, error: error.message };
    }
}
