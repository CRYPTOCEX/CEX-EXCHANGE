"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FillMonitor = void 0;
exports.closeTrade = closeTrade;
exports.closeLeaderTrade = closeLeaderTrade;
exports.handleOrderFilled = handleOrderFilled;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const profitShare_1 = require("./profitShare");
const dailyLimits_1 = require("./dailyLimits");
const index_1 = require("./index");
class FillMonitor {
    constructor() {
        this.isProcessing = false;
        this.pollInterval = null;
    }
    static getInstance() {
        if (!FillMonitor.instance) {
            FillMonitor.instance = new FillMonitor();
        }
        return FillMonitor.instance;
    }
    start(intervalMs = 5000) {
        if (this.pollInterval) {
            return;
        }
        this.pollInterval = setInterval(async () => {
            await this.checkPendingOrders();
        }, intervalMs);
        console_1.logger.info("COPY_TRADING", "FillMonitor started");
    }
    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        console_1.logger.info("COPY_TRADING", "FillMonitor stopped");
    }
    async onOrderFilled(event) {
        try {
            const leaderTrade = await db_1.models.copyTradingTrade.findOne({
                where: {
                    leaderOrderId: event.orderId,
                    isLeaderTrade: true,
                },
            });
            if (leaderTrade) {
                await this.handleLeaderOrderFill(leaderTrade, event);
                return;
            }
            const followerTrade = await db_1.models.copyTradingTrade.findOne({
                where: {
                    leaderOrderId: event.orderId,
                    isLeaderTrade: false,
                },
                include: [
                    {
                        model: db_1.models.copyTradingFollower,
                        as: "follower",
                        include: [{ model: db_1.models.copyTradingLeader, as: "leader" }],
                    },
                ],
            });
            if (followerTrade) {
                await this.handleFollowerOrderFill(followerTrade, event);
            }
        }
        catch (error) {
            console_1.logger.error("COPY_TRADING", "Fill monitor error on order filled", error);
        }
    }
    async handleLeaderOrderFill(trade, event) {
        const t = await db_1.sequelize.transaction();
        try {
            await trade.update({
                executedAmount: event.filledAmount,
                executedPrice: event.filledPrice,
                fee: event.fee,
                status: event.status === "FILLED"
                    ? "OPEN"
                    : event.status === "CANCELLED"
                        ? "CANCELLED"
                        : "PARTIALLY_FILLED",
            }, { transaction: t });
            if (event.status === "CANCELLED") {
                await db_1.models.copyTradingTrade.update({ status: "CANCELLED" }, {
                    where: {
                        leaderOrderId: trade.leaderOrderId,
                        isLeaderTrade: false,
                        status: "PENDING",
                    },
                    transaction: t,
                });
            }
            await t.commit();
            await (0, index_1.createAuditLog)({
                entityType: "copyTradingTrade",
                entityId: trade.id,
                action: "ORDER_FILLED",
                metadata: {
                    filledAmount: event.filledAmount,
                    filledPrice: event.filledPrice,
                    status: event.status,
                },
            });
        }
        catch (error) {
            await t.rollback();
            console_1.logger.error("COPY_TRADING", "Failed to handle leader order fill", error);
        }
    }
    async handleFollowerOrderFill(trade, event) {
        const t = await db_1.sequelize.transaction();
        try {
            const slippage = trade.price > 0
                ? ((event.filledPrice - trade.price) / trade.price) * 100
                : 0;
            await trade.update({
                executedAmount: event.filledAmount,
                executedPrice: event.filledPrice,
                slippage,
                fee: event.fee,
                status: event.status === "FILLED"
                    ? "OPEN"
                    : event.status === "CANCELLED"
                        ? "CANCELLED"
                        : "PARTIALLY_FILLED",
            }, { transaction: t });
            await t.commit();
            await (0, index_1.createAuditLog)({
                entityType: "copyTradingTrade",
                entityId: trade.id,
                action: "ORDER_FILLED",
                metadata: {
                    filledAmount: event.filledAmount,
                    filledPrice: event.filledPrice,
                    slippage,
                    status: event.status,
                },
            });
        }
        catch (error) {
            await t.rollback();
            console_1.logger.error("COPY_TRADING", "Failed to handle follower order fill", error);
        }
    }
    async checkPendingOrders() {
        if (this.isProcessing) {
            return;
        }
        this.isProcessing = true;
        try {
            const cutoff = new Date(Date.now() - 30000);
            const pendingTrades = await db_1.models.copyTradingTrade.findAll({
                where: {
                    status: "PENDING",
                    createdAt: { [sequelize_1.Op.lt]: cutoff },
                },
                limit: 100,
            });
            for (const trade of pendingTrades) {
                await trade.update({
                    status: "FAILED",
                    errorMessage: "Order timeout - no fill received",
                });
            }
        }
        catch (error) {
            console_1.logger.error("COPY_TRADING", "Failed to check pending orders", error);
        }
        finally {
            this.isProcessing = false;
        }
    }
}
exports.FillMonitor = FillMonitor;
FillMonitor.instance = null;
async function closeTrade(tradeId, closePrice, closeAmount) {
    const t = await db_1.sequelize.transaction();
    try {
        const trade = await db_1.models.copyTradingTrade.findByPk(tradeId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
            include: [
                {
                    model: db_1.models.copyTradingFollower,
                    as: "follower",
                    include: [{ model: db_1.models.copyTradingLeader, as: "leader" }],
                },
            ],
        });
        if (!trade) {
            await t.rollback();
            return { success: false, error: "Trade not found" };
        }
        const tradeData = trade;
        if (tradeData.status === "CLOSED") {
            await t.rollback();
            return { success: false, error: "Trade already closed" };
        }
        const amount = closeAmount || tradeData.executedAmount || tradeData.amount;
        const entryPrice = tradeData.executedPrice || tradeData.price;
        const entryCost = tradeData.cost;
        let profit;
        if (tradeData.side === "BUY") {
            profit = (closePrice - entryPrice) * amount;
        }
        else {
            profit = (entryPrice - closePrice) * amount;
        }
        profit -= tradeData.fee || 0;
        const profitPercent = entryCost > 0 ? (profit / entryCost) * 100 : 0;
        await tradeData.update({
            profit,
            profitPercent,
            status: "CLOSED",
            closedAt: new Date(),
        }, { transaction: t });
        if (tradeData.followerId && tradeData.follower) {
            const follower = tradeData.follower;
            const leader = follower.leader;
            const [baseCurrency, quoteCurrency] = tradeData.symbol.split("/");
            const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                where: {
                    followerId: follower.id,
                    symbol: tradeData.symbol,
                },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (tradeData.side === "BUY") {
                const receiveAmount = amount;
                if (receiveAmount > 0) {
                    const baseWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(follower.userId, baseCurrency);
                    if (baseWallet) {
                        await (0, wallet_1.updateWalletBalance)(baseWallet, receiveAmount, "add", `ct_fill_base_${tradeData.id}`, t);
                    }
                }
                if (allocation) {
                    await allocation.update({
                        quoteUsedAmount: (0, sequelize_1.literal)(`GREATEST(0, "quoteUsedAmount" - ${entryCost})`),
                    }, { transaction: t });
                }
            }
            else {
                const receiveAmount = entryCost + profit;
                if (receiveAmount > 0) {
                    const quoteWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(follower.userId, quoteCurrency);
                    if (quoteWallet) {
                        await (0, wallet_1.updateWalletBalance)(quoteWallet, receiveAmount, "add", `ct_fill_quote_${tradeData.id}`, t);
                    }
                }
                if (allocation) {
                    await allocation.update({
                        baseUsedAmount: (0, sequelize_1.literal)(`GREATEST(0, "baseUsedAmount" - ${amount})`),
                    }, { transaction: t });
                }
            }
            if (profit < 0) {
                await (0, dailyLimits_1.recordLoss)(follower.id, Math.abs(profit));
            }
            if (profit > 0 && leader) {
                await (0, profitShare_1.distributeProfitShare)(tradeData.id, follower, leader, profit, quoteCurrency, t);
            }
            await db_1.models.copyTradingTransaction.create({
                userId: follower.userId,
                followerId: follower.id,
                leaderId: tradeData.leaderId,
                tradeId: tradeData.id,
                type: profit >= 0 ? "TRADE_PROFIT" : "TRADE_LOSS",
                amount: Math.abs(profit),
                currency: quoteCurrency,
                fee: 0,
                balanceBefore: 0,
                balanceAfter: 0,
                description: `Trade closed: ${profit >= 0 ? "+" : ""}${profit.toFixed(2)} ${quoteCurrency}`,
                metadata: JSON.stringify({
                    closePrice,
                    profitPercent,
                }),
                status: "COMPLETED",
            }, { transaction: t });
        }
        await t.commit();
        (0, index_1.updateLeaderStats)(tradeData.leaderId).catch((e) => console_1.logger.error("COPY_TRADING", "Failed to update leader stats", e));
        if (tradeData.followerId) {
            (0, index_1.updateFollowerStats)(tradeData.followerId).catch((e) => console_1.logger.error("COPY_TRADING", "Failed to update follower stats", e));
        }
        await (0, index_1.createAuditLog)({
            entityType: "copyTradingTrade",
            entityId: tradeId,
            action: "TRADE_CLOSED",
            metadata: { closePrice, profit, profitPercent },
        });
        return { success: true, profit, profitPercent };
    }
    catch (error) {
        await t.rollback();
        console_1.logger.error("COPY_TRADING", "Failed to close trade", error);
        return { success: false, error: error.message };
    }
}
async function closeLeaderTrade(leaderTradeId, closePrice) {
    var _a;
    const errors = [];
    let closedCount = 0;
    try {
        const leaderResult = await closeTrade(leaderTradeId, closePrice);
        if (!leaderResult.success) {
            return { closedCount: 0, errors: [leaderResult.error || "Failed to close leader trade"] };
        }
        const followerTrades = await db_1.models.copyTradingTrade.findAll({
            where: {
                leaderOrderId: (_a = (await db_1.models.copyTradingTrade.findByPk(leaderTradeId))) === null || _a === void 0 ? void 0 : _a.get("leaderOrderId"),
                isLeaderTrade: false,
                status: { [sequelize_1.Op.in]: ["OPEN", "PARTIALLY_FILLED"] },
            },
        });
        for (const trade of followerTrades) {
            const result = await closeTrade(trade.id, closePrice);
            if (result.success) {
                closedCount++;
            }
            else {
                errors.push(`Trade ${trade.id}: ${result.error}`);
            }
        }
        return { closedCount, errors };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Failed to close leader trade", error);
        return { closedCount, errors: [error.message] };
    }
}
async function handleOrderFilled(orderId, userId, symbol, side, filledAmount, filledPrice, fee, status) {
    const monitor = FillMonitor.getInstance();
    await monitor.onOrderFilled({
        orderId,
        userId,
        symbol,
        side,
        filledAmount,
        filledPrice,
        fee,
        status,
        timestamp: new Date(),
    });
}
