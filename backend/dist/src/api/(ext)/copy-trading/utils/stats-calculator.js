"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLeaderStats = calculateLeaderStats;
exports.getLeaderStats = getLeaderStats;
exports.invalidateLeaderStatsCache = invalidateLeaderStatsCache;
exports.calculateFollowerStats = calculateFollowerStats;
exports.getFollowerStats = getFollowerStats;
exports.invalidateFollowerStatsCache = invalidateFollowerStatsCache;
exports.calculateAllocationStats = calculateAllocationStats;
exports.getAllocationStats = getAllocationStats;
exports.invalidateAllocationStatsCache = invalidateAllocationStatsCache;
exports.calculateLeaderDailyStats = calculateLeaderDailyStats;
exports.getLeaderDailyStats = getLeaderDailyStats;
exports.calculateBatchLeaderStats = calculateBatchLeaderStats;
exports.invalidateTradeRelatedCaches = invalidateTradeRelatedCaches;
exports.prewarmLeaderStatsCache = prewarmLeaderStatsCache;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const redis = redis_1.RedisSingleton.getInstance();
const CACHE_TTL = {
    LEADER_STATS: 300,
    FOLLOWER_STATS: 300,
    ALLOCATION_STATS: 180,
    DAILY_STATS: 3600,
};
async function calculateLeaderStats(leaderId) {
    try {
        const totalFollowers = await db_1.models.copyTradingFollower.count({
            where: {
                leaderId,
                status: { [sequelize_1.Op.ne]: "STOPPED" },
            },
        });
        const trades = await db_1.models.copyTradingTrade.findAll({
            where: {
                leaderId,
                isLeaderTrade: true,
                status: "CLOSED",
            },
            attributes: ["profit", "cost", "fee"],
            raw: true,
        });
        const totalTrades = trades.length;
        const winningTrades = trades.filter((t) => (t.profit || 0) > 0).length;
        const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
        const totalVolume = trades.reduce((sum, t) => sum + (t.cost || 0), 0);
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const roi = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;
        return {
            totalFollowers,
            totalTrades,
            winRate: Math.round(winRate * 100) / 100,
            totalProfit: Math.round(totalProfit * 100) / 100,
            totalVolume: Math.round(totalVolume * 100) / 100,
            roi: Math.round(roi * 100) / 100,
        };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Failed to calculate leader stats for ${leaderId}`, error);
        throw error;
    }
}
async function getLeaderStats(leaderId) {
    const cacheKey = `copy:leader:stats:${leaderId}`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
    }
    catch (cacheError) {
        console_1.logger.warn("COPY_TRADING", `Cache read failed for ${cacheKey}`, cacheError);
    }
    const stats = await calculateLeaderStats(leaderId);
    try {
        await redis.set(cacheKey, JSON.stringify(stats), "EX", CACHE_TTL.LEADER_STATS);
    }
    catch (cacheError) {
        console_1.logger.warn("COPY_TRADING", `Cache write failed for ${cacheKey}`, cacheError);
    }
    return stats;
}
async function invalidateLeaderStatsCache(leaderId) {
    const cacheKey = `copy:leader:stats:${leaderId}`;
    try {
        await redis.del(cacheKey);
    }
    catch (error) {
        console_1.logger.warn("COPY_TRADING", `Failed to invalidate cache for ${cacheKey}`, error);
    }
}
async function calculateFollowerStats(followerId) {
    try {
        const trades = await db_1.models.copyTradingTrade.findAll({
            where: {
                followerId,
                status: "CLOSED",
            },
            attributes: ["profit", "cost"],
            raw: true,
        });
        const totalTrades = trades.length;
        const winningTrades = trades.filter((t) => (t.profit || 0) > 0).length;
        const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const allocations = await db_1.models.copyTradingFollowerAllocation.findAll({
            where: { followerId, isActive: true },
            attributes: ["symbol", "baseAmount", "quoteAmount"],
            raw: true,
        });
        let totalAllocated = 0;
        for (const alloc of allocations) {
            try {
                const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");
                const basePrice = await (0, utils_1.getEcoPriceInUSD)(baseCurrency);
                const quotePrice = await (0, utils_1.getEcoPriceInUSD)(quoteCurrency);
                totalAllocated +=
                    parseFloat(alloc.baseAmount || 0) * basePrice +
                        parseFloat(alloc.quoteAmount || 0) * quotePrice;
            }
            catch (error) {
                console_1.logger.warn("COPY_TRADING", `Failed to get price for ${alloc.symbol}`, error);
            }
        }
        const roi = totalAllocated > 0 ? (totalProfit / totalAllocated) * 100 : 0;
        return {
            totalTrades,
            winRate: Math.round(winRate * 100) / 100,
            totalProfit: Math.round(totalProfit * 100) / 100,
            roi: Math.round(roi * 100) / 100,
        };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Failed to calculate follower stats for ${followerId}`, error);
        throw error;
    }
}
async function getFollowerStats(followerId) {
    const cacheKey = `copy:follower:stats:${followerId}`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
    }
    catch (cacheError) {
        console_1.logger.warn("COPY_TRADING", `Cache read failed for ${cacheKey}`, cacheError);
    }
    const stats = await calculateFollowerStats(followerId);
    try {
        await redis.set(cacheKey, JSON.stringify(stats), "EX", CACHE_TTL.FOLLOWER_STATS);
    }
    catch (cacheError) {
        console_1.logger.warn("COPY_TRADING", `Cache write failed for ${cacheKey}`, cacheError);
    }
    return stats;
}
async function invalidateFollowerStatsCache(followerId) {
    const cacheKey = `copy:follower:stats:${followerId}`;
    try {
        await redis.del(cacheKey);
    }
    catch (error) {
        console_1.logger.warn("COPY_TRADING", `Failed to invalidate cache for ${cacheKey}`, error);
    }
}
async function calculateAllocationStats(followerId, symbol) {
    try {
        const trades = await db_1.models.copyTradingTrade.findAll({
            where: {
                followerId,
                symbol,
                status: "CLOSED",
            },
            attributes: ["profit"],
            raw: true,
        });
        const totalTrades = trades.length;
        const winningTrades = trades.filter((t) => (t.profit || 0) > 0).length;
        const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        return {
            totalTrades,
            winRate: Math.round(winRate * 100) / 100,
            totalProfit: Math.round(totalProfit * 100) / 100,
        };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Failed to calculate allocation stats for ${followerId}/${symbol}`, error);
        throw error;
    }
}
async function getAllocationStats(followerId, symbol) {
    const cacheKey = `copy:allocation:stats:${followerId}:${symbol}`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
    }
    catch (cacheError) {
        console_1.logger.warn("COPY_TRADING", `Cache read failed for ${cacheKey}`, cacheError);
    }
    const stats = await calculateAllocationStats(followerId, symbol);
    try {
        await redis.set(cacheKey, JSON.stringify(stats), "EX", CACHE_TTL.ALLOCATION_STATS);
    }
    catch (cacheError) {
        console_1.logger.warn("COPY_TRADING", `Cache write failed for ${cacheKey}`, cacheError);
    }
    return stats;
}
async function invalidateAllocationStatsCache(followerId, symbol) {
    const cacheKey = `copy:allocation:stats:${followerId}:${symbol}`;
    try {
        await redis.del(cacheKey);
    }
    catch (error) {
        console_1.logger.warn("COPY_TRADING", `Failed to invalidate cache for ${cacheKey}`, error);
    }
}
async function calculateLeaderDailyStats(leaderId, date) {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const trades = await db_1.models.copyTradingTrade.findAll({
            where: {
                leaderId,
                isLeaderTrade: true,
                createdAt: { [sequelize_1.Op.between]: [startOfDay, endOfDay] },
            },
            attributes: ["profit", "cost", "fee", "status"],
            raw: true,
        });
        const closedTrades = trades.filter((t) => t.status === "CLOSED");
        const totalTrades = closedTrades.length;
        const winningTrades = closedTrades.filter((t) => (t.profit || 0) > 0).length;
        const losingTrades = totalTrades - winningTrades;
        const profit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
        const volume = closedTrades.reduce((sum, t) => sum + (t.cost || 0), 0);
        const fees = closedTrades.reduce((sum, t) => sum + (t.fee || 0), 0);
        return {
            trades: totalTrades,
            winningTrades,
            losingTrades,
            profit: Math.round(profit * 100) / 100,
            volume: Math.round(volume * 100) / 100,
            fees: Math.round(fees * 100) / 100,
        };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Failed to calculate daily stats for leader ${leaderId}`, error);
        throw error;
    }
}
async function getLeaderDailyStats(leaderId, date) {
    const dateStr = date.toISOString().split("T")[0];
    const cacheKey = `copy:leader:daily:${leaderId}:${dateStr}`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
    }
    catch (cacheError) {
        console_1.logger.warn("COPY_TRADING", `Cache read failed for ${cacheKey}`, cacheError);
    }
    const stats = await calculateLeaderDailyStats(leaderId, date);
    try {
        await redis.set(cacheKey, JSON.stringify(stats), "EX", CACHE_TTL.DAILY_STATS);
    }
    catch (cacheError) {
        console_1.logger.warn("COPY_TRADING", `Cache write failed for ${cacheKey}`, cacheError);
    }
    return stats;
}
async function calculateBatchLeaderStats(leaderIds) {
    try {
        const statsMap = new Map();
        const followers = await db_1.models.copyTradingFollower.findAll({
            where: {
                leaderId: { [sequelize_1.Op.in]: leaderIds },
                status: { [sequelize_1.Op.ne]: "STOPPED" },
            },
            attributes: ["leaderId"],
            raw: true,
        });
        const followerCounts = new Map();
        for (const follower of followers) {
            const count = followerCounts.get(follower.leaderId) || 0;
            followerCounts.set(follower.leaderId, count + 1);
        }
        const trades = await db_1.models.copyTradingTrade.findAll({
            where: {
                leaderId: { [sequelize_1.Op.in]: leaderIds },
                isLeaderTrade: true,
                status: "CLOSED",
            },
            attributes: ["leaderId", "profit", "cost"],
            raw: true,
        });
        const tradesByLeader = new Map();
        for (const trade of trades) {
            const leaderTrades = tradesByLeader.get(trade.leaderId) || [];
            leaderTrades.push(trade);
            tradesByLeader.set(trade.leaderId, leaderTrades);
        }
        for (const leaderId of leaderIds) {
            const leaderTrades = tradesByLeader.get(leaderId) || [];
            const totalTrades = leaderTrades.length;
            const winningTrades = leaderTrades.filter((t) => (t.profit || 0) > 0).length;
            const totalProfit = leaderTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
            const totalVolume = leaderTrades.reduce((sum, t) => sum + (t.cost || 0), 0);
            const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
            const roi = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;
            statsMap.set(leaderId, {
                totalFollowers: followerCounts.get(leaderId) || 0,
                totalTrades,
                winRate: Math.round(winRate * 100) / 100,
                totalProfit: Math.round(totalProfit * 100) / 100,
                totalVolume: Math.round(totalVolume * 100) / 100,
                roi: Math.round(roi * 100) / 100,
            });
        }
        return statsMap;
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Failed to calculate batch leader stats", error);
        throw error;
    }
}
async function invalidateTradeRelatedCaches(leaderId, followerId, symbol) {
    const promises = [];
    promises.push(invalidateLeaderStatsCache(leaderId));
    if (followerId) {
        promises.push(invalidateFollowerStatsCache(followerId));
        if (symbol) {
            promises.push(invalidateAllocationStatsCache(followerId, symbol));
        }
    }
    await Promise.all(promises);
}
async function prewarmLeaderStatsCache(leaderIds) {
    console_1.logger.info("COPY_TRADING", `Pre-warming stats cache for ${leaderIds.length} leaders`);
    for (const leaderId of leaderIds) {
        try {
            await getLeaderStats(leaderId);
        }
        catch (error) {
            console_1.logger.warn("COPY_TRADING", `Failed to pre-warm cache for leader ${leaderId}`, error);
        }
    }
}
