"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onOrderCreated = onOrderCreated;
exports.onOrderClosed = onOrderClosed;
exports.onFollowerOrderClosed = onFollowerOrderClosed;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const cron_1 = require("./cron");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const index_1 = require("./index");
const console_1 = require("@b/utils/console");
const stats_calculator_1 = require("./stats-calculator");
async function onOrderCreated(order) {
    try {
        const leader = await db_1.models.copyTradingLeader.findOne({
            where: {
                userId: order.userId,
                status: "ACTIVE",
            },
        });
        if (!leader) {
            return;
        }
        const leaderData = leader;
        const leaderMarket = await db_1.models.copyTradingLeaderMarket.findOne({
            where: {
                leaderId: leaderData.id,
                symbol: order.symbol,
                isActive: true,
            },
        });
        if (!leaderMarket) {
            console_1.logger.warn("COPY_TRADING", `Leader ${leaderData.id} trading on undeclared market ${order.symbol} - skipping copy`);
            return;
        }
        const activeFollowers = await db_1.models.copyTradingFollower.count({
            where: {
                leaderId: leaderData.id,
                status: "ACTIVE",
            },
        });
        if (activeFollowers === 0) {
            return;
        }
        const leaderTrade = await db_1.models.copyTradingTrade.create({
            leaderId: leaderData.id,
            symbol: order.symbol,
            side: order.side,
            type: order.type,
            amount: order.amount,
            price: order.price,
            cost: order.side === "BUY" ? order.amount * order.price : order.amount,
            fee: 0,
            feeCurrency: order.symbol.split("/")[1] || "USDT",
            status: "PENDING_REPLICATION",
            isLeaderTrade: true,
            leaderOrderId: order.id,
        });
        const [, pair] = order.symbol.split("/");
        const leaderWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(order.userId, pair);
        const leaderBalance = leaderWallet ? parseFloat(leaderWallet.balance.toString()) : 0;
        (0, cron_1.replicateLeaderTrade)({
            id: leaderTrade.id,
            leaderId: leaderData.id,
            symbol: order.symbol,
            side: order.side,
            type: order.type,
            amount: order.amount,
            price: order.price,
            status: "PENDING_REPLICATION",
            createdAt: new Date(),
        }, leaderBalance).catch((error) => {
            console_1.logger.error("COPY_TRADING", "Failed to replicate leader trade", error);
        });
        await (0, index_1.createAuditLog)({
            userId: order.userId,
            action: "TRADE_OPEN",
            entityType: "copyTradingTrade",
            entityId: leaderTrade.id,
            metadata: {
                symbol: order.symbol,
                side: order.side,
                amount: order.amount,
                price: order.price,
                followers: activeFollowers,
            },
        });
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Error in onOrderCreated hook", error);
    }
}
async function onOrderClosed(orderId, profit, closedAt) {
    try {
        const leaderTrade = await db_1.models.copyTradingTrade.findOne({
            where: {
                leaderOrderId: orderId,
                isLeaderTrade: true,
            },
        });
        if (!leaderTrade) {
            return;
        }
        const trade = leaderTrade;
        await trade.update({
            profit,
            profitPercent: trade.cost > 0 ? (profit / trade.cost) * 100 : 0,
            status: "CLOSED",
            closedAt,
        });
        const followerTrades = await db_1.models.copyTradingTrade.findAll({
            where: {
                leaderOrderId: trade.leaderOrderId,
                isLeaderTrade: false,
                status: { [sequelize_1.Op.notIn]: ["CLOSED", "CANCELLED", "FAILED"] },
            },
        });
        console_1.logger.info("COPY_TRADING", `Leader trade ${trade.id} closed with profit ${profit}, ${followerTrades.length} follower trades pending`);
        await (0, stats_calculator_1.invalidateLeaderStatsCache)(trade.leaderId);
        await (0, index_1.createAuditLog)({
            userId: trade.leaderId,
            action: "TRADE_CLOSE",
            entityType: "copyTradingTrade",
            entityId: trade.id,
            metadata: {
                profit,
                followerTrades: followerTrades.length,
            },
        });
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Error in onOrderClosed hook", error);
    }
}
async function onFollowerOrderClosed(orderId, profit, closedAt) {
    try {
        const followerTrade = await db_1.models.copyTradingTrade.findOne({
            where: {
                leaderOrderId: orderId,
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
        if (!followerTrade) {
            return;
        }
        const trade = followerTrade;
        const follower = trade.follower;
        const leader = follower === null || follower === void 0 ? void 0 : follower.leader;
        await trade.update({
            profit,
            profitPercent: trade.cost > 0 ? (profit / trade.cost) * 100 : 0,
            status: "CLOSED",
            closedAt,
        });
        if (profit > 0 && leader) {
            const platformFeePercent = 2;
            const leaderSharePercent = leader.profitSharePercent || 20;
            const platformFee = profit * (platformFeePercent / 100);
            const leaderProfit = (profit - platformFee) * (leaderSharePercent / 100);
            await db_1.sequelize.transaction(async (t) => {
                const profitCurrency = trade.profitCurrency || "USDT";
                await db_1.models.copyTradingTransaction.create({
                    userId: follower.userId,
                    followerId: follower.id,
                    leaderId: leader.id,
                    tradeId: trade.id,
                    type: "PROFIT_SHARE",
                    amount: leaderProfit,
                    currency: profitCurrency,
                    fee: 0,
                    balanceBefore: 0,
                    balanceAfter: 0,
                    status: "COMPLETED",
                    description: `Leader profit share for trade ${trade.id}`,
                    metadata: JSON.stringify({ tradeId: trade.id, leaderId: leader.id }),
                }, { transaction: t });
                await db_1.models.copyTradingTransaction.create({
                    userId: follower.userId,
                    followerId: follower.id,
                    tradeId: trade.id,
                    type: "FEE",
                    amount: platformFee,
                    currency: profitCurrency,
                    fee: 0,
                    balanceBefore: 0,
                    balanceAfter: 0,
                    status: "COMPLETED",
                    description: `Platform fee for trade ${trade.id}`,
                    metadata: JSON.stringify({ tradeId: trade.id }),
                }, { transaction: t });
                const leaderWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(leader.userId, profitCurrency);
                if (leaderWallet) {
                    await (0, wallet_1.updateWalletBalance)(leaderWallet, leaderProfit, "add", `ct_leader_profit_${trade.id}`, t);
                }
            });
        }
        const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
            where: {
                followerId: follower.id,
                symbol: trade.symbol,
                isActive: true,
            },
        });
        if (allocation) {
            const allocData = allocation;
            if (trade.side === "BUY") {
                await allocation.update({
                    quoteUsedAmount: Math.max(0, allocData.quoteUsedAmount - trade.cost),
                });
            }
            else {
                await allocation.update({
                    baseUsedAmount: Math.max(0, allocData.baseUsedAmount - trade.amount),
                });
            }
            await (0, stats_calculator_1.invalidateAllocationStatsCache)(follower.id, trade.symbol);
        }
        await (0, stats_calculator_1.invalidateFollowerStatsCache)(follower.id);
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Error in onFollowerOrderClosed hook", error);
    }
}
