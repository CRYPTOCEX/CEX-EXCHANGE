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
function tradeCurrency(trade) {
    return (trade.profitCurrency ||
        String(trade.symbol || "").split("/")[1] ||
        "UNKNOWN");
}
async function fetchLeaderTradeAggregates(leaderIds) {
    const rows = await db_1.models.copyTradingTrade.findAll({
        where: {
            leaderId: { [sequelize_1.Op.in]: leaderIds },
            isLeaderTrade: true,
            status: "CLOSED",
        },
        attributes: [
            "leaderId",
            "profitCurrency",
            "symbol",
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "tradeCount"],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN `profit` > 0 THEN 1 ELSE 0 END")),
                "winningCount",
            ],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "profitSum"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("cost")), "costSum"],
        ],
        group: ["leaderId", "profitCurrency", "symbol"],
        raw: true,
    });
    return rows;
}
function bucketLeaderAggregates(rows) {
    const profitByCurrency = {};
    const volumeByCurrency = {};
    let totalTrades = 0;
    let winningTrades = 0;
    for (const row of rows) {
        const currency = tradeCurrency(row);
        const profit = Number(row.profitSum) || 0;
        if (profit) {
            profitByCurrency[currency] = (profitByCurrency[currency] || 0) + profit;
        }
        const cost = Number(row.costSum) || 0;
        if (cost) {
            volumeByCurrency[currency] = (volumeByCurrency[currency] || 0) + cost;
        }
        totalTrades += Number(row.tradeCount) || 0;
        winningTrades += Number(row.winningCount) || 0;
    }
    return { profitByCurrency, volumeByCurrency, totalTrades, winningTrades };
}
function leaderUnits(profitByCurrency, volumeByCurrency) {
    return [
        ...new Set([
            ...Object.keys(profitByCurrency),
            ...Object.keys(volumeByCurrency),
        ]),
    ];
}
function collapseLeaderTotals(units, profitByCurrency, volumeByCurrency, rates) {
    if (units.length <= 1) {
        const currency = units[0] || "USD";
        return {
            totalProfit: profitByCurrency[currency] || 0,
            totalVolume: volumeByCurrency[currency] || 0,
            currency,
            unpriced: [],
        };
    }
    let totalProfit = 0;
    let totalVolume = 0;
    const unpriced = [];
    for (const currency of units) {
        const rate = rates === null || rates === void 0 ? void 0 : rates.get(currency);
        if (rate === undefined) {
            unpriced.push(currency);
            continue;
        }
        totalProfit += (profitByCurrency[currency] || 0) * rate;
        totalVolume += (volumeByCurrency[currency] || 0) * rate;
    }
    return { totalProfit, totalVolume, currency: "USD", unpriced };
}
async function calculateLeaderStats(leaderId) {
    try {
        const [totalFollowers, aggregates] = await Promise.all([
            db_1.models.copyTradingFollower.count({
                where: {
                    leaderId,
                    status: { [sequelize_1.Op.ne]: "STOPPED" },
                },
            }),
            fetchLeaderTradeAggregates([leaderId]),
        ]);
        const { profitByCurrency, volumeByCurrency, totalTrades, winningTrades } = bucketLeaderAggregates(aggregates);
        const units = leaderUnits(profitByCurrency, volumeByCurrency);
        const rates = units.length > 1 ? await (0, utils_1.getUsdRates)(units) : null;
        const totals = collapseLeaderTotals(units, profitByCurrency, volumeByCurrency, rates);
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const roi = totals.totalVolume > 0
            ? (totals.totalProfit / totals.totalVolume) * 100
            : 0;
        return {
            totalFollowers,
            totalTrades,
            winRate: Math.round(winRate * 100) / 100,
            totalProfit: Math.round(totals.totalProfit * 1e8) / 1e8,
            totalVolume: Math.round(totals.totalVolume * 1e8) / 1e8,
            profitCurrency: totals.currency,
            volumeCurrency: totals.currency,
            unpricedCurrencies: totals.unpriced,
            roi: Math.round(roi * 100) / 100,
        };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Failed to calculate leader stats for ${leaderId}`, error);
        throw error;
    }
}
async function getLeaderStats(leaderId) {
    const cacheKey = `copy:leader:stats:v2:${leaderId}`;
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
    const cacheKey = `copy:leader:stats:v2:${leaderId}`;
    try {
        await redis.del(cacheKey);
    }
    catch (error) {
        console_1.logger.warn("COPY_TRADING", `Failed to invalidate cache for ${cacheKey}`, error);
    }
}
async function calculateFollowerStats(followerId) {
    try {
        const aggregates = await db_1.models.copyTradingTrade.findAll({
            where: {
                followerId,
                status: "CLOSED",
            },
            attributes: [
                "profitCurrency",
                "symbol",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "tradeCount"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN `profit` > 0 THEN 1 ELSE 0 END")),
                    "winningCount",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN `profit` <> 0 THEN 1 ELSE 0 END")),
                    "nonzeroCount",
                ],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "profitSum"],
            ],
            group: ["profitCurrency", "symbol"],
            raw: true,
        });
        const profitByCurrency = {};
        let totalTrades = 0;
        let winningTrades = 0;
        for (const row of aggregates) {
            totalTrades += Number(row.tradeCount) || 0;
            winningTrades += Number(row.winningCount) || 0;
            if (!(Number(row.nonzeroCount) || 0))
                continue;
            const currency = tradeCurrency(row);
            profitByCurrency[currency] =
                (profitByCurrency[currency] || 0) + (Number(row.profitSum) || 0);
        }
        const profitCurrencies = Object.keys(profitByCurrency);
        let totalProfit = 0;
        let profitCurrency = "USD";
        let unpricedProfitCurrencies = [];
        if (profitCurrencies.length === 1) {
            profitCurrency = profitCurrencies[0];
            totalProfit = profitByCurrency[profitCurrency];
        }
        else if (profitCurrencies.length > 1) {
            const summed = await (0, utils_1.sumInUSD)(profitByCurrency);
            totalProfit = summed.total;
            unpricedProfitCurrencies = summed.unpriced;
        }
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
        let totalProfitUSD = totalProfit;
        let roiAvailable = unpricedProfitCurrencies.length === 0;
        if (roiAvailable && totalProfit !== 0 && profitCurrency !== "USD") {
            try {
                totalProfitUSD = totalProfit * (await (0, utils_1.getEcoPriceInUSD)(profitCurrency));
            }
            catch (error) {
                console_1.logger.warn("COPY_TRADING", `Failed to price ${profitCurrency} for ROI on follower ${followerId}`, error);
                totalProfitUSD = 0;
                roiAvailable = false;
            }
        }
        const roi = roiAvailable && totalAllocated > 0
            ? (totalProfitUSD / totalAllocated) * 100
            : 0;
        return {
            totalTrades,
            winRate: Math.round(winRate * 100) / 100,
            totalProfit: Math.round(totalProfit * 1e8) / 1e8,
            profitCurrency,
            unpricedProfitCurrencies,
            roi: Math.round(roi * 100) / 100,
            roiAvailable,
        };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Failed to calculate follower stats for ${followerId}`, error);
        throw error;
    }
}
async function getFollowerStats(followerId) {
    const cacheKey = `copy:follower:stats:v3:${followerId}`;
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
    const cacheKey = `copy:follower:stats:v3:${followerId}`;
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
        if (!leaderIds.length)
            return statsMap;
        const [followerRows, tradeAggregates] = await Promise.all([
            db_1.models.copyTradingFollower.findAll({
                where: {
                    leaderId: { [sequelize_1.Op.in]: leaderIds },
                    status: { [sequelize_1.Op.ne]: "STOPPED" },
                },
                attributes: ["leaderId", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "followerCount"]],
                group: ["leaderId"],
                raw: true,
            }),
            fetchLeaderTradeAggregates(leaderIds),
        ]);
        const followerCounts = new Map();
        for (const row of followerRows) {
            followerCounts.set(row.leaderId, Number(row.followerCount) || 0);
        }
        const aggregatesByLeader = new Map();
        for (const row of tradeAggregates) {
            const rows = aggregatesByLeader.get(row.leaderId) || [];
            rows.push(row);
            aggregatesByLeader.set(row.leaderId, rows);
        }
        const bucketsByLeader = new Map();
        const currenciesNeedingRates = new Set();
        for (const leaderId of leaderIds) {
            const buckets = bucketLeaderAggregates(aggregatesByLeader.get(leaderId) || []);
            const units = leaderUnits(buckets.profitByCurrency, buckets.volumeByCurrency);
            if (units.length > 1) {
                for (const unit of units)
                    currenciesNeedingRates.add(unit);
            }
            bucketsByLeader.set(leaderId, { ...buckets, units });
        }
        const rates = currenciesNeedingRates.size
            ? await (0, utils_1.getUsdRates)([...currenciesNeedingRates])
            : null;
        for (const leaderId of leaderIds) {
            const buckets = bucketsByLeader.get(leaderId);
            const { totalTrades, winningTrades } = buckets;
            const totals = collapseLeaderTotals(buckets.units, buckets.profitByCurrency, buckets.volumeByCurrency, rates);
            const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
            const roi = totals.totalVolume > 0
                ? (totals.totalProfit / totals.totalVolume) * 100
                : 0;
            statsMap.set(leaderId, {
                totalFollowers: followerCounts.get(leaderId) || 0,
                totalTrades,
                winRate: Math.round(winRate * 100) / 100,
                totalProfit: Math.round(totals.totalProfit * 1e8) / 1e8,
                totalVolume: Math.round(totals.totalVolume * 1e8) / 1e8,
                profitCurrency: totals.currency,
                volumeCurrency: totals.currency,
                unpricedCurrencies: totals.unpriced,
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
const PREWARM_CONCURRENCY = 3;
async function prewarmLeaderStatsCache(leaderIds) {
    console_1.logger.info("COPY_TRADING", `Pre-warming stats cache for ${leaderIds.length} leaders`);
    let index = 0;
    const workers = Array.from({ length: Math.min(PREWARM_CONCURRENCY, leaderIds.length) }, async () => {
        while (index < leaderIds.length) {
            const leaderId = leaderIds[index++];
            try {
                await getLeaderStats(leaderId);
            }
            catch (error) {
                console_1.logger.warn("COPY_TRADING", `Failed to pre-warm cache for leader ${leaderId}`, error);
            }
        }
    });
    await Promise.all(workers);
}
