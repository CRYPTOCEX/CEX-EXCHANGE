"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDailyLimits = checkDailyLimits;
exports.getDailyStats = getDailyStats;
exports.recordTrade = recordTrade;
exports.recordLoss = recordLoss;
exports.resetDailyLimits = resetDailyLimits;
exports.updateFollowerLimits = updateFollowerLimits;
exports.getFollowerLimitStatus = getFollowerLimitStatus;
exports.checkAutoActions = checkAutoActions;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const index_1 = require("./index");
const currency_1 = require("./currency");
const notification_1 = require("@b/services/notification");
const dailyLimitsCache = new Map();
async function checkDailyLimits(followerId) {
    try {
        const follower = await db_1.models.copyTradingFollower.findByPk(followerId);
        if (!follower) {
            return { canTrade: false, reason: "Follower not found" };
        }
        const followerData = follower;
        if (followerData.status !== "ACTIVE") {
            return { canTrade: false, reason: "Subscription is not active" };
        }
        const todayStats = await getDailyStats(followerId);
        const settings = await (0, index_1.getCopyTradingSettings)();
        const maxDailyTrades = settings.maxDailyLossDefault || 50;
        const maxDailyLoss = followerData.maxDailyLoss;
        if (todayStats.tradesCount >= maxDailyTrades) {
            return {
                canTrade: false,
                reason: "Daily trade limit reached",
                currentTrades: todayStats.tradesCount,
                maxTrades: maxDailyTrades,
            };
        }
        if (maxDailyLoss && maxDailyLoss > 0) {
            if (todayStats.totalLoss >= maxDailyLoss) {
                return {
                    canTrade: false,
                    reason: "Daily loss limit reached",
                    currentLoss: todayStats.totalLoss,
                    maxLoss: maxDailyLoss,
                };
            }
        }
        return { canTrade: true };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Failed to check daily limits", error);
        return { canTrade: true };
    }
}
async function getDailyStats(followerId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    try {
        const trades = await db_1.models.copyTradingTrade.findAll({
            where: {
                followerId,
                createdAt: { [sequelize_1.Op.gte]: today },
            },
            attributes: ["profit", "cost", "status", "symbol", "profitCurrency"],
        });
        const tradesData = trades;
        const tradesCount = tradesData.length;
        let totalProfitUSDT = 0;
        let totalLossUSDT = 0;
        let totalVolumeUSDT = 0;
        const profitByCurrency = {};
        const lossByCurrency = {};
        for (const trade of tradesData) {
            const profit = trade.profit || 0;
            const cost = trade.cost || 0;
            let profitCurrency = trade.profitCurrency;
            if (!profitCurrency && trade.symbol) {
                profitCurrency = (0, currency_1.getQuoteCurrency)(trade.symbol);
            }
            if (!profitCurrency) {
                profitCurrency = "USDT";
            }
            try {
                const profitInUSDT = await (0, currency_1.convertToUSDT)(profit, profitCurrency);
                const costInUSDT = await (0, currency_1.convertToUSDT)(cost, profitCurrency);
                if (profitInUSDT > 0) {
                    totalProfitUSDT += profitInUSDT;
                    profitByCurrency[profitCurrency] =
                        (profitByCurrency[profitCurrency] || 0) + profit;
                }
                else if (profitInUSDT < 0) {
                    totalLossUSDT += Math.abs(profitInUSDT);
                    lossByCurrency[profitCurrency] =
                        (lossByCurrency[profitCurrency] || 0) + Math.abs(profit);
                }
                totalVolumeUSDT += costInUSDT;
            }
            catch (conversionError) {
                console_1.logger.warn("COPY_TRADING", `Currency conversion failed for ${profitCurrency}, using raw value`, conversionError);
                if (profit > 0) {
                    totalProfitUSDT += profit;
                    profitByCurrency[profitCurrency] =
                        (profitByCurrency[profitCurrency] || 0) + profit;
                }
                else {
                    totalLossUSDT += Math.abs(profit);
                    lossByCurrency[profitCurrency] =
                        (lossByCurrency[profitCurrency] || 0) + Math.abs(profit);
                }
                totalVolumeUSDT += cost;
            }
        }
        return {
            tradesCount,
            totalProfit: totalProfitUSDT,
            totalLoss: totalLossUSDT,
            netPnL: totalProfitUSDT - totalLossUSDT,
            totalVolume: totalVolumeUSDT,
            profitByCurrency,
            lossByCurrency,
        };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Failed to get daily stats", error);
        return {
            tradesCount: 0,
            totalProfit: 0,
            totalLoss: 0,
            netPnL: 0,
            totalVolume: 0,
            profitByCurrency: {},
            lossByCurrency: {},
        };
    }
}
async function recordTrade(followerId, tradeAmount) {
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `${followerId}:${today}`;
    const existing = dailyLimitsCache.get(cacheKey) || {
        trades: 0,
        loss: 0,
        date: today,
    };
    existing.trades += 1;
    dailyLimitsCache.set(cacheKey, existing);
}
async function recordLoss(followerId, lossAmount, lossCurrency = "USDT") {
    if (lossAmount <= 0)
        return;
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `${followerId}:${today}`;
    let lossInUSDT;
    try {
        lossInUSDT = await (0, currency_1.convertToUSDT)(lossAmount, lossCurrency);
    }
    catch (error) {
        console_1.logger.warn("COPY_TRADING", `Failed to convert loss from ${lossCurrency} to USDT, using raw value`, error);
        lossInUSDT = lossAmount;
    }
    const existing = dailyLimitsCache.get(cacheKey) || {
        trades: 0,
        loss: 0,
        date: today,
    };
    existing.loss += lossInUSDT;
    dailyLimitsCache.set(cacheKey, existing);
    const follower = await db_1.models.copyTradingFollower.findByPk(followerId);
    if (follower) {
        const followerData = follower;
        const maxDailyLoss = followerData.maxDailyLoss;
        if (maxDailyLoss && existing.loss >= maxDailyLoss) {
            await pauseFollowerDueToDailyLimit(followerId, existing.loss, maxDailyLoss);
        }
    }
}
async function pauseFollowerDueToDailyLimit(followerId, currentLoss, maxLoss) {
    try {
        await db_1.models.copyTradingFollower.update({ status: "PAUSED" }, { where: { id: followerId } });
        const follower = await db_1.models.copyTradingFollower.findByPk(followerId, {
            include: [{ model: db_1.models.user, as: "user" }],
        });
        if (follower) {
            const followerData = follower;
            const today = new Date().toISOString().split("T")[0];
            await notification_1.notificationService.send({
                userId: followerData.userId,
                type: "SYSTEM",
                channels: ["IN_APP"],
                idempotencyKey: `copy_trading_paused_${followerId}_${today}`,
                data: {
                    title: "Copy Trading Paused",
                    message: `Your copy trading subscription has been paused because your daily loss limit (${(0, currency_1.formatCurrencyAmount)(maxLoss, "USDT")}) was reached. Current loss: ${(0, currency_1.formatCurrencyAmount)(currentLoss, "USDT")}. You can resume trading tomorrow.`,
                    link: "/copy-trading/subscription",
                },
                priority: "HIGH"
            });
            await (0, index_1.createAuditLog)({
                entityType: "copyTradingFollower",
                entityId: followerId,
                action: "DAILY_LOSS_LIMIT_REACHED",
                userId: followerData.userId,
                metadata: { currentLoss, maxLoss, currency: "USDT" },
            });
        }
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Failed to pause follower due to daily limit", error);
    }
}
async function resetDailyLimits() {
    let reset = 0;
    let reactivated = 0;
    try {
        dailyLimitsCache.clear();
        reset++;
        const pausedFollowers = await db_1.models.copyTradingFollower.findAll({
            where: { status: "PAUSED" },
            include: [
                {
                    model: db_1.models.copyTradingAuditLog,
                    as: "auditLogs",
                    where: {
                        action: "DAILY_LOSS_LIMIT_REACHED",
                        createdAt: {
                            [sequelize_1.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
                        },
                    },
                    required: true,
                    limit: 1,
                },
            ],
        });
        for (const follower of pausedFollowers) {
            await follower.update({ status: "ACTIVE" });
            reactivated++;
            await notification_1.notificationService.send({
                userId: follower.userId,
                type: "SYSTEM",
                channels: ["IN_APP"],
                idempotencyKey: `copy_trading_resumed_${follower.id}_${new Date().toISOString().split("T")[0]}`,
                data: {
                    title: "Copy Trading Resumed",
                    message: "Your copy trading subscription has been automatically reactivated for the new trading day.",
                    link: "/copy-trading/subscription",
                },
                priority: "NORMAL"
            });
            await (0, index_1.createAuditLog)({
                entityType: "copyTradingFollower",
                entityId: follower.id,
                action: "DAILY_LIMITS_RESET",
                userId: follower.userId,
            });
        }
        console_1.logger.info("COPY_TRADING", `Daily limits reset complete: ${reset} caches cleared, ${reactivated} followers reactivated`);
        return { reset, reactivated };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Failed to reset daily limits", error);
        return { reset, reactivated };
    }
}
async function updateFollowerLimits(followerId, limits) {
    try {
        const follower = await db_1.models.copyTradingFollower.findByPk(followerId);
        if (!follower) {
            return { success: false, error: "Follower not found" };
        }
        await follower.update(limits);
        await (0, index_1.createAuditLog)({
            entityType: "copyTradingFollower",
            entityId: followerId,
            action: "LIMITS_UPDATED",
            userId: follower.userId,
            newValue: limits,
        });
        return { success: true };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Failed to update follower limits", error);
        return { success: false, error: error.message };
    }
}
async function getFollowerLimitStatus(followerId) {
    const follower = await db_1.models.copyTradingFollower.findByPk(followerId);
    if (!follower) {
        return {
            limits: {
                maxDailyLoss: null,
                maxPositionSize: null,
                stopLossPercent: null,
                takeProfitPercent: null,
            },
            currentUsage: {
                tradesCount: 0,
                totalProfit: 0,
                totalLoss: 0,
                netPnL: 0,
                totalVolume: 0,
                profitByCurrency: {},
                lossByCurrency: {},
            },
            canTrade: false,
            reason: "Follower not found",
            currency: "USDT",
        };
    }
    const followerData = follower;
    const currentUsage = await getDailyStats(followerId);
    const limitCheck = await checkDailyLimits(followerId);
    return {
        limits: {
            maxDailyLoss: followerData.maxDailyLoss,
            maxPositionSize: followerData.maxPositionSize,
            stopLossPercent: followerData.stopLossPercent,
            takeProfitPercent: followerData.takeProfitPercent,
        },
        currentUsage,
        canTrade: limitCheck.canTrade,
        reason: limitCheck.reason,
        currency: "USDT",
    };
}
async function checkAutoActions() {
    let checked = 0;
    let paused = 0;
    try {
        const followers = await db_1.models.copyTradingFollower.findAll({
            where: {
                status: "ACTIVE",
                maxDailyLoss: { [sequelize_1.Op.gt]: 0 },
            },
        });
        for (const follower of followers) {
            checked++;
            const stats = await getDailyStats(follower.id);
            if (stats.totalLoss >= follower.maxDailyLoss) {
                await pauseFollowerDueToDailyLimit(follower.id, stats.totalLoss, follower.maxDailyLoss);
                paused++;
            }
        }
        return { checked, paused };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Failed to check auto actions", error);
        return { checked, paused };
    }
}
