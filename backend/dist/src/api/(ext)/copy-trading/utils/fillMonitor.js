"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FillMonitor = void 0;
exports.closeTrade = closeTrade;
exports.closeLeaderTrade = closeLeaderTrade;
exports.handleOrderFilled = handleOrderFilled;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const profitShare_1 = require("./profitShare");
const realisedBudget_1 = require("./realisedBudget");
const dailyLimits_1 = require("./dailyLimits");
const settings_core_1 = require("./settings-core");
const core_1 = require("./core");
const exitFillAccumulator_1 = require("./exitFillAccumulator");
const transaction_1 = require("@b/utils/transaction");
class FillMonitor {
    constructor() {
        this.isProcessing = false;
        this.pollInterval = null;
        this.exitFills = new exitFillAccumulator_1.ExitFillAccumulator();
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
                    followerOrderId: event.orderId,
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
                return;
            }
            const closingTrade = await db_1.models.copyTradingTrade.findOne({
                where: {
                    closeOrderId: event.orderId,
                    isLeaderTrade: false,
                },
            });
            if (closingTrade) {
                const settlement = this.exitFills.record(event.orderId, event, Number(closingTrade.executedAmount) || 0);
                if (settlement) {
                    await closeTrade(closingTrade.id, settlement.averagePrice, settlement.totalAmount);
                }
                else if (event.status === "CANCELLED") {
                    console_1.logger.warn("COPY_TRADING", `Exit order ${event.orderId} for trade ${closingTrade.id} was cancelled; ` +
                        `the position is still open and needs a new exit.`);
                }
            }
        }
        catch (error) {
            console_1.logger.error("COPY_TRADING", "Fill monitor error on order filled", error);
        }
    }
    async handleLeaderOrderFill(trade, event) {
        const t = await db_1.sequelize.transaction();
        try {
            const priorExec = Number(trade.executedAmount) || 0;
            await trade.update({
                executedAmount: priorExec + event.filledAmount,
                executedPrice: event.filledPrice,
                fee: (priorExec > 0 ? Number(trade.fee) || 0 : 0) + event.fee,
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
            await (0, settings_core_1.createAuditLog)({
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
            await (0, transaction_1.rollbackIfActive)(t);
            console_1.logger.error("COPY_TRADING", "Failed to handle leader order fill", error);
        }
    }
    async handleFollowerOrderFill(trade, event) {
        const t = await db_1.sequelize.transaction();
        try {
            const slippage = trade.price > 0
                ? ((event.filledPrice - trade.price) / trade.price) * 100
                : 0;
            const priorExec = Number(trade.executedAmount) || 0;
            const isTerminal = trade.status === "CLOSING" ||
                trade.status === "CLOSED" ||
                trade.status === "CANCELLED";
            const nextStatus = event.status === "FILLED"
                ? "OPEN"
                : event.status === "CANCELLED"
                    ? "CANCELLED"
                    : "PARTIALLY_FILLED";
            if (isTerminal) {
                console_1.logger.warn("COPY_TRADING", `Entry fill arrived for trade ${trade.id} after it reached ${trade.status} ` +
                    `(${event.filledAmount} @ ${event.filledPrice}). Recording the amount but ` +
                    `leaving the status; this quantity needs reconciliation.`);
            }
            await trade.update({
                executedAmount: priorExec + event.filledAmount,
                executedPrice: event.filledPrice,
                slippage,
                fee: (priorExec > 0 ? Number(trade.fee) || 0 : 0) + event.fee,
                ...(isTerminal ? {} : { status: nextStatus }),
            }, { transaction: t });
            await t.commit();
            await (0, settings_core_1.createAuditLog)({
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
            await (0, transaction_1.rollbackIfActive)(t);
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
        const entryNotional = tradeData.side === "BUY" ? entryCost : entryPrice * amount;
        const profitPercent = entryNotional > 0 ? (profit / entryNotional) * 100 : 0;
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
                    marketType: "SPOT",
                },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (tradeData.side === "BUY") {
                if (allocation) {
                    await allocation.update({
                        quoteUsedAmount: (0, sequelize_1.literal)(`GREATEST(0, \`quoteUsedAmount\` - ${entryCost})`),
                    }, { transaction: t });
                }
            }
            else {
                if (allocation) {
                    await allocation.update({
                        baseUsedAmount: (0, sequelize_1.literal)(`GREATEST(0, \`baseUsedAmount\` - ${amount})`),
                    }, { transaction: t });
                }
            }
            if (profit < 0) {
                await (0, dailyLimits_1.recordLoss)(follower.id, Math.abs(profit));
            }
            let leaderShareTaken = 0;
            let platformFeeTaken = 0;
            if (profit > 0 && leader) {
                const distribution = await (0, profitShare_1.distributeProfitShare)(tradeData.id, follower, leader, profit, quoteCurrency, t);
                if (distribution.success) {
                    leaderShareTaken = distribution.leaderShare;
                    platformFeeTaken = distribution.platformFee;
                }
                else {
                    console_1.logger.error("COPY_TRADING", `Profit-share distribution failed for trade ${tradeData.id}; the realised credit is ` +
                        `being computed as if no share was taken. If the leader's transfer had already ` +
                        `landed, the follower is UNDER-credited by that amount and it must be settled by hand.`);
                }
            }
            if (allocation) {
                const realised = (0, realisedBudget_1.realisedQuoteBudgetDelta)({
                    profit,
                    leaderShare: leaderShareTaken,
                    platformFee: platformFeeTaken,
                });
                const nextClaim = (0, realisedBudget_1.nextQuoteBudgetClaim)(allocation.quoteAmount, realised);
                if (nextClaim !== null) {
                    await allocation.update({ quoteAmount: nextClaim }, { transaction: t });
                }
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
        (0, core_1.updateLeaderStats)(tradeData.leaderId).catch((e) => console_1.logger.error("COPY_TRADING", "Failed to update leader stats", e));
        if (tradeData.followerId) {
            (0, core_1.updateFollowerStats)(tradeData.followerId).catch((e) => console_1.logger.error("COPY_TRADING", "Failed to update follower stats", e));
        }
        await (0, settings_core_1.createAuditLog)({
            entityType: "copyTradingTrade",
            entityId: tradeId,
            action: "TRADE_CLOSED",
            metadata: { closePrice, profit, profitPercent },
        });
        return { success: true, profit, profitPercent };
    }
    catch (error) {
        await (0, transaction_1.rollbackIfActive)(t);
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
