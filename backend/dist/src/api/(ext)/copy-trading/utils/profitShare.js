"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePnL = calculatePnL;
exports.calculateUnrealizedPnL = calculateUnrealizedPnL;
exports.calculateProfitShareBreakdown = calculateProfitShareBreakdown;
exports.distributeProfitShare = distributeProfitShare;
exports.processPendingProfitDistributions = processPendingProfitDistributions;
exports.getLeaderEarnings = getLeaderEarnings;
exports.getFollowerProfitSharePayments = getFollowerProfitSharePayments;
exports.previewProfitShare = previewProfitShare;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const settings_core_1 = require("./settings-core");
const currency_1 = require("./currency");
const transaction_1 = require("@b/utils/transaction");
function calculatePnL(entryPrice, exitPrice, amount, side, fees = 0) {
    let profit;
    if (side === "BUY") {
        profit = (exitPrice - entryPrice) * amount;
    }
    else {
        profit = (entryPrice - exitPrice) * amount;
    }
    profit -= fees;
    const cost = entryPrice * amount;
    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
    return { profit, profitPercent };
}
function calculateUnrealizedPnL(entryPrice, currentPrice, amount, side) {
    const { profit, profitPercent } = calculatePnL(entryPrice, currentPrice, amount, side, 0);
    return {
        unrealizedProfit: profit,
        unrealizedProfitPercent: profitPercent,
    };
}
async function calculateProfitShareBreakdown(grossProfit, leaderSharePercent, currency = "USDT") {
    var _a;
    const settings = await (0, settings_core_1.getCopyTradingSettings)();
    const platformFeePercent = (_a = settings.platformFeePercent) !== null && _a !== void 0 ? _a : 2;
    const validatedLeaderShare = Math.min(leaderSharePercent, 100);
    const effectiveLeaderSharePercent = settings.enableProfitShare ? validatedLeaderShare : 0;
    if (grossProfit <= 0) {
        return {
            grossProfit,
            platformFee: 0,
            platformFeePercent,
            leaderShare: 0,
            leaderSharePercent: effectiveLeaderSharePercent,
            followerNet: grossProfit,
            currency,
        };
    }
    const platformFee = grossProfit * (platformFeePercent / 100);
    const afterPlatformFee = grossProfit - platformFee;
    const leaderShare = afterPlatformFee * (effectiveLeaderSharePercent / 100);
    const followerNet = afterPlatformFee - leaderShare;
    return {
        grossProfit,
        platformFee,
        platformFeePercent,
        leaderShare,
        leaderSharePercent: effectiveLeaderSharePercent,
        followerNet,
        currency,
    };
}
async function distributeProfitShare(tradeId, follower, leader, grossProfit, currency, transaction) {
    var _a;
    try {
        if (grossProfit <= 0) {
            return {
                success: true,
                leaderShare: 0,
                platformFee: 0,
                followerNet: grossProfit,
                currency,
            };
        }
        const breakdown = await calculateProfitShareBreakdown(grossProfit, (_a = leader.profitSharePercent) !== null && _a !== void 0 ? _a : 20, currency);
        const t = transaction || (await db_1.sequelize.transaction());
        const useExternalTransaction = !!transaction;
        try {
            if (breakdown.leaderShare > 0) {
                const leaderWallet = await wallet_1.walletService.getWallet(leader.userId, "SPOT", currency, { transaction: t, createIfMissing: true });
                await wallet_1.walletService.transfer({
                    idempotencyKey: `ct_profit_share_${tradeId}_leader`,
                    fromUserId: follower.userId,
                    toUserId: leader.userId,
                    fromWalletType: "COPY_TRADING",
                    toWalletType: "SPOT",
                    fromCurrency: currency,
                    toCurrency: currency,
                    amount: breakdown.leaderShare,
                    description: `Copy profit share for trade ${tradeId}`,
                    metadata: { tradeId, grossProfit },
                    transaction: t,
                });
                await db_1.models.copyTradingTransaction.create({
                    userId: leader.userId,
                    leaderId: leader.id,
                    followerId: follower.id,
                    tradeId,
                    type: "PROFIT_SHARE",
                    amount: breakdown.leaderShare,
                    currency,
                    fee: 0,
                    balanceBefore: parseFloat(leaderWallet.balance.toString()),
                    balanceAfter: parseFloat(leaderWallet.balance.toString()) +
                        breakdown.leaderShare,
                    description: `Profit share from follower trade: ${(0, currency_1.formatCurrencyAmount)(breakdown.leaderShare, currency)}`,
                    metadata: JSON.stringify({
                        grossProfit,
                        sharePercent: breakdown.leaderSharePercent,
                        currency,
                    }),
                    status: "COMPLETED",
                }, { transaction: t });
            }
            await db_1.models.copyTradingTransaction.create({
                userId: follower.userId,
                leaderId: leader.id,
                followerId: follower.id,
                tradeId,
                type: "PROFIT_SHARE",
                amount: breakdown.leaderShare,
                currency,
                fee: breakdown.platformFee,
                balanceBefore: 0,
                balanceAfter: 0,
                description: `Profit share paid to leader: ${(0, currency_1.formatCurrencyAmount)(breakdown.leaderShare, currency)}`,
                metadata: JSON.stringify({
                    grossProfit,
                    leaderSharePercent: breakdown.leaderSharePercent,
                    platformFeePercent: breakdown.platformFeePercent,
                    currency,
                }),
                status: "COMPLETED",
            }, { transaction: t });
            if (breakdown.platformFee > 0) {
                await wallet_1.walletService.debit({
                    idempotencyKey: `ct_profit_share_${tradeId}_fee`,
                    userId: follower.userId,
                    walletType: "COPY_TRADING",
                    currency,
                    amount: breakdown.platformFee,
                    operationType: "TRADING_FEE",
                    description: `Platform fee on copy profit (trade ${tradeId})`,
                    metadata: { tradeId, grossProfit },
                    transaction: t,
                });
                await (0, fees_1.collectPlatformFee)({
                    userId: follower.userId,
                    currency,
                    walletType: "SPOT",
                    feeAmount: breakdown.platformFee,
                    type: "TRADE",
                    description: `Copy-trading platform fee (trade ${tradeId})`,
                    referenceId: `${tradeId}_ps_fee`,
                    metadata: { tradeId, source: "COPY_TRADING_PROFIT_SHARE" },
                    transaction: t,
                });
                await db_1.models.copyTradingTransaction.create({
                    userId: follower.userId,
                    followerId: follower.id,
                    tradeId,
                    type: "FEE",
                    amount: breakdown.platformFee,
                    currency,
                    fee: 0,
                    balanceBefore: 0,
                    balanceAfter: 0,
                    description: `Platform fee for profitable trade: ${(0, currency_1.formatCurrencyAmount)(breakdown.platformFee, currency)}`,
                    metadata: JSON.stringify({
                        grossProfit,
                        feePercent: breakdown.platformFeePercent,
                        currency,
                    }),
                    status: "COMPLETED",
                }, { transaction: t });
            }
            if (!useExternalTransaction) {
                await t.commit();
            }
            await (0, settings_core_1.createAuditLog)({
                entityType: "copyTradingTrade",
                entityId: tradeId,
                action: "PROFIT_DISTRIBUTED",
                userId: follower.userId,
                metadata: breakdown,
            });
            return {
                success: true,
                leaderShare: breakdown.leaderShare,
                platformFee: breakdown.platformFee,
                followerNet: breakdown.followerNet,
                currency,
            };
        }
        catch (error) {
            if (!useExternalTransaction) {
                await (0, transaction_1.rollbackIfActive)(t);
            }
            throw error;
        }
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Failed to distribute profit share", error);
        return {
            success: false,
            leaderShare: 0,
            platformFee: 0,
            followerNet: 0,
            currency,
            error: error.message,
        };
    }
}
async function processPendingProfitDistributions() {
    let processed = 0;
    let failed = 0;
    try {
        const closedTrades = await db_1.models.copyTradingTrade.findAll({
            where: {
                status: "CLOSED",
                followerId: { [sequelize_1.Op.ne]: null },
                profit: { [sequelize_1.Op.gt]: 0 },
            },
            include: [
                {
                    model: db_1.models.copyTradingFollower,
                    as: "follower",
                    include: [
                        {
                            model: db_1.models.copyTradingLeader,
                            as: "leader",
                        },
                    ],
                },
            ],
        });
        for (const trade of closedTrades) {
            const existingDistribution = await db_1.models.copyTradingTransaction.findOne({
                where: {
                    tradeId: trade.id,
                    type: "PROFIT_SHARE",
                },
            });
            if (existingDistribution) {
                continue;
            }
            const follower = trade.follower;
            const leader = follower === null || follower === void 0 ? void 0 : follower.leader;
            if (!follower || !leader) {
                continue;
            }
            const profitCurrency = trade.profitCurrency || (0, currency_1.getQuoteCurrency)(trade.symbol);
            const result = await distributeProfitShare(trade.id, follower, leader, trade.profit, profitCurrency);
            if (result.success) {
                processed++;
            }
            else {
                failed++;
            }
        }
        return { processed, failed };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Failed to process pending profit distributions", error);
        return { processed, failed };
    }
}
async function getLeaderEarnings(leaderId, startDate, endDate) {
    const whereClause = {
        leaderId,
        type: "PROFIT_SHARE",
        status: "COMPLETED",
    };
    if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate)
            whereClause.createdAt[sequelize_1.Op.gte] = startDate;
        if (endDate)
            whereClause.createdAt[sequelize_1.Op.lte] = endDate;
    }
    const transactions = await db_1.models.copyTradingTransaction.findAll({
        where: whereClause,
        attributes: ["amount", "currency"],
    });
    let totalEarningsUSDT = 0;
    const earningsByCurrency = {};
    let tradeCount = 0;
    for (const tx of transactions) {
        const amount = parseFloat(tx.amount) || 0;
        const currency = tx.currency || "USDT";
        earningsByCurrency[currency] = (earningsByCurrency[currency] || 0) + amount;
        tradeCount++;
        try {
            const amountInUSDT = await (0, currency_1.convertToUSDT)(amount, currency);
            totalEarningsUSDT += amountInUSDT;
        }
        catch (conversionError) {
            console_1.logger.warn("COPY_TRADING", `Currency conversion failed for ${currency}`, conversionError);
            totalEarningsUSDT += amount;
        }
    }
    return {
        totalEarnings: totalEarningsUSDT,
        totalProfitShares: totalEarningsUSDT,
        totalPlatformFees: 0,
        tradeCount,
        currency: "USDT",
        earningsByCurrency,
    };
}
async function getFollowerProfitSharePayments(followerId, startDate, endDate) {
    const whereClause = {
        followerId,
        status: "COMPLETED",
    };
    if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate)
            whereClause.createdAt[sequelize_1.Op.gte] = startDate;
        if (endDate)
            whereClause.createdAt[sequelize_1.Op.lte] = endDate;
    }
    const profitShares = await db_1.models.copyTradingTransaction.findAll({
        where: { ...whereClause, type: "PROFIT_SHARE" },
        attributes: ["amount", "currency"],
    });
    const platformFees = await db_1.models.copyTradingTransaction.findAll({
        where: { ...whereClause, type: "FEE" },
        attributes: ["amount", "currency"],
    });
    let totalPaidUSDT = 0;
    const paidByCurrency = {};
    let tradeCount = 0;
    for (const tx of profitShares) {
        const amount = parseFloat(tx.amount) || 0;
        const currency = tx.currency || "USDT";
        paidByCurrency[currency] = (paidByCurrency[currency] || 0) + amount;
        tradeCount++;
        try {
            const amountInUSDT = await (0, currency_1.convertToUSDT)(amount, currency);
            totalPaidUSDT += amountInUSDT;
        }
        catch (conversionError) {
            console_1.logger.warn("COPY_TRADING", `Currency conversion failed for ${currency}`, conversionError);
            totalPaidUSDT += amount;
        }
    }
    let totalFeesUSDT = 0;
    for (const tx of platformFees) {
        const amount = parseFloat(tx.amount) || 0;
        const currency = tx.currency || "USDT";
        try {
            const amountInUSDT = await (0, currency_1.convertToUSDT)(amount, currency);
            totalFeesUSDT += amountInUSDT;
        }
        catch (conversionError) {
            console_1.logger.warn("COPY_TRADING", `Currency conversion failed for ${currency}`, conversionError);
            totalFeesUSDT += amount;
        }
    }
    return {
        totalPaid: totalPaidUSDT,
        totalPlatformFees: totalFeesUSDT,
        tradeCount,
        currency: "USDT",
        paidByCurrency,
    };
}
async function previewProfitShare(tradeId, closePrice) {
    var _a;
    var _b;
    const trade = await db_1.models.copyTradingTrade.findByPk(tradeId, {
        include: [
            {
                model: db_1.models.copyTradingFollower,
                as: "follower",
                include: [{ model: db_1.models.copyTradingLeader, as: "leader" }],
            },
        ],
    });
    if (!trade) {
        return { grossProfit: 0, breakdown: null };
    }
    const tradeData = trade;
    const entryPrice = tradeData.executedPrice || tradeData.price;
    const amount = tradeData.executedAmount || tradeData.amount;
    const { profit } = calculatePnL(entryPrice, closePrice, amount, tradeData.side, tradeData.fee || 0);
    if (profit <= 0 || !((_a = tradeData.follower) === null || _a === void 0 ? void 0 : _a.leader)) {
        return { grossProfit: profit, breakdown: null };
    }
    const breakdown = await calculateProfitShareBreakdown(profit, (_b = tradeData.follower.leader.profitSharePercent) !== null && _b !== void 0 ? _b : 20);
    return { grossProfit: profit, breakdown };
}
