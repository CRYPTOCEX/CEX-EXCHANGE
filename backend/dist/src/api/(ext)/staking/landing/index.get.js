"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Staking landing page data",
    description: "Retrieves comprehensive data for the Staking landing page including stats, featured pools, token diversity, and activity.",
    operationId: "getStakingLanding",
    tags: ["Staking", "Landing"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Staking landing page data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            stats: { type: "object" },
                            featuredPools: { type: "array" },
                            highestAprPools: { type: "array" },
                            flexiblePools: { type: "array" },
                            upcomingPools: { type: "array" },
                            tokenStats: { type: "array" },
                            recentActivity: { type: "array" },
                            performance: { type: "object" },
                            earningFrequencies: { type: "array" },
                            calculatorPreview: { type: "object" },
                        },
                    },
                },
            },
        },
    },
};
exports.default = async (data) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const [poolStats, positionStats, earningStats, featuredPools, highestAprPools, flexiblePools, upcomingPools, tokenAggregates, recentPositions, recentClaims, earningFrequencyStats,] = await Promise.all([
        db_1.models.stakingPool.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalPools"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END")),
                    "activePools",
                ],
                [
                    (0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("CASE WHEN status = 'ACTIVE' THEN apr ELSE NULL END")),
                    "avgApr",
                ],
                [
                    (0, sequelize_1.fn)("MAX", (0, sequelize_1.literal)("CASE WHEN status = 'ACTIVE' THEN apr ELSE NULL END")),
                    "highestApr",
                ],
                [
                    (0, sequelize_1.fn)("MIN", (0, sequelize_1.literal)("CASE WHEN status = 'ACTIVE' THEN apr ELSE NULL END")),
                    "lowestApr",
                ],
                [
                    (0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("CASE WHEN status = 'ACTIVE' THEN lockPeriod ELSE NULL END")),
                    "avgLockPeriod",
                ],
            ],
            raw: true,
        }),
        db_1.models.stakingPosition.findOne({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalStaked"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("DISTINCT userId")), "activeUsers"],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("amount")), "avgStakeAmount"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END")),
                    "completedPositions",
                ],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalPositions"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN amount ELSE 0 END`)),
                    "currentStaked",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN amount ELSE 0 END`)),
                    "previousStaked",
                ],
            ],
            where: { status: { [sequelize_1.Op.in]: ["ACTIVE", "COMPLETED"] } },
            raw: true,
        }),
        db_1.models.stakingEarningRecord.findOne({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalRewards"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN isClaimed = true THEN amount ELSE 0 END")),
                    "totalClaimed",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${sevenDaysAgo.toISOString()}' THEN amount ELSE 0 END`)),
                    "last7DaysRewards",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${thirtyDaysAgo.toISOString()}' THEN amount ELSE 0 END`)),
                    "last30DaysRewards",
                ],
            ],
            raw: true,
        }),
        db_1.models.stakingPool.findAll({
            where: { status: "ACTIVE", isPromoted: true },
            order: [["order", "ASC"]],
            limit: 6,
        }),
        db_1.models.stakingPool.findAll({
            where: { status: "ACTIVE" },
            order: [["apr", "DESC"]],
            limit: 4,
        }),
        db_1.models.stakingPool.findAll({
            where: { status: "ACTIVE", lockPeriod: { [sequelize_1.Op.lte]: 30 } },
            order: [["lockPeriod", "ASC"]],
            limit: 4,
        }),
        db_1.models.stakingPool.findAll({
            where: { status: "COMING_SOON" },
            order: [["order", "ASC"]],
            limit: 3,
        }),
        db_1.models.stakingPool.findAll({
            attributes: [
                "token",
                "symbol",
                "icon",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "poolCount"],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("apr")), "avgApr"],
                [(0, sequelize_1.fn)("MAX", (0, sequelize_1.col)("apr")), "highestApr"],
            ],
            where: { status: "ACTIVE" },
            group: ["token", "symbol", "icon"],
            order: [[(0, sequelize_1.literal)("poolCount"), "DESC"]],
            limit: 6,
            raw: true,
        }),
        db_1.models.stakingPosition.findAll({
            attributes: ["amount", "createdAt", "poolId"],
            where: { createdAt: { [sequelize_1.Op.gte]: thirtyDaysAgo } },
            order: [["createdAt", "DESC"]],
            limit: 5,
            include: [
                {
                    model: db_1.models.stakingPool,
                    as: "pool",
                    attributes: ["name", "symbol"],
                },
            ],
        }),
        db_1.models.stakingEarningRecord.findAll({
            attributes: ["amount", "claimedAt", "positionId"],
            where: { isClaimed: true, claimedAt: { [sequelize_1.Op.gte]: thirtyDaysAgo } },
            order: [["claimedAt", "DESC"]],
            limit: 5,
            include: [
                {
                    model: db_1.models.stakingPosition,
                    as: "position",
                    attributes: ["poolId"],
                    include: [
                        {
                            model: db_1.models.stakingPool,
                            as: "pool",
                            attributes: ["name", "symbol"],
                        },
                    ],
                },
            ],
        }),
        db_1.models.stakingPool.findAll({
            attributes: [
                "earningFrequency",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "poolCount"],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("apr")), "avgApr"],
            ],
            where: { status: "ACTIVE" },
            group: ["earningFrequency"],
            raw: true,
        }),
    ]);
    const totalStaked = parseFloat(positionStats === null || positionStats === void 0 ? void 0 : positionStats.totalStaked) || 0;
    const activeUsers = parseInt(positionStats === null || positionStats === void 0 ? void 0 : positionStats.activeUsers) || 0;
    const totalPools = parseInt(poolStats === null || poolStats === void 0 ? void 0 : poolStats.totalPools) || 0;
    const activePools = parseInt(poolStats === null || poolStats === void 0 ? void 0 : poolStats.activePools) || 0;
    const avgApr = parseFloat(poolStats === null || poolStats === void 0 ? void 0 : poolStats.avgApr) || 0;
    const highestApr = parseFloat(poolStats === null || poolStats === void 0 ? void 0 : poolStats.highestApr) || 0;
    const lowestApr = parseFloat(poolStats === null || poolStats === void 0 ? void 0 : poolStats.lowestApr) || 0;
    const avgLockPeriod = parseFloat(poolStats === null || poolStats === void 0 ? void 0 : poolStats.avgLockPeriod) || 0;
    const avgStakeAmount = parseFloat(positionStats === null || positionStats === void 0 ? void 0 : positionStats.avgStakeAmount) || 0;
    const completedPositions = parseInt(positionStats === null || positionStats === void 0 ? void 0 : positionStats.completedPositions) || 0;
    const totalPositions = parseInt(positionStats === null || positionStats === void 0 ? void 0 : positionStats.totalPositions) || 0;
    const completionRate = totalPositions > 0
        ? Math.round((completedPositions / totalPositions) * 100)
        : 0;
    const totalRewards = parseFloat(earningStats === null || earningStats === void 0 ? void 0 : earningStats.totalRewards) || 0;
    const totalClaimed = parseFloat(earningStats === null || earningStats === void 0 ? void 0 : earningStats.totalClaimed) || 0;
    const unclaimedRewards = totalRewards - totalClaimed;
    const last7DaysRewards = parseFloat(earningStats === null || earningStats === void 0 ? void 0 : earningStats.last7DaysRewards) || 0;
    const last30DaysRewards = parseFloat(earningStats === null || earningStats === void 0 ? void 0 : earningStats.last30DaysRewards) || 0;
    const avgDailyRewards = last30DaysRewards / 30;
    const currentStaked = parseFloat(positionStats === null || positionStats === void 0 ? void 0 : positionStats.currentStaked) || 0;
    const previousStaked = parseFloat(positionStats === null || positionStats === void 0 ? void 0 : positionStats.previousStaked) || 0;
    const stakedGrowth = previousStaked > 0
        ? Math.round(((currentStaked - previousStaked) / previousStaked) * 100)
        : 0;
    const featuredPoolIds = featuredPools.map((p) => p.id);
    const poolAnalytics = featuredPoolIds.length > 0
        ? await db_1.models.stakingPosition.findAll({
            attributes: [
                "poolId",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalStaked"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("DISTINCT userId")), "totalStakers"],
            ],
            where: {
                poolId: { [sequelize_1.Op.in]: featuredPoolIds },
                status: { [sequelize_1.Op.in]: ["ACTIVE", "COMPLETED"] },
            },
            group: ["poolId"],
            raw: true,
        })
        : [];
    const analyticsMap = {};
    poolAnalytics.forEach((a) => {
        analyticsMap[a.poolId] = a;
    });
    const transformedFeatured = featuredPools.map((pool) => {
        const analytics = analyticsMap[pool.id] || {};
        const poolTotalStaked = parseFloat(analytics.totalStaked) || 0;
        const totalCapacity = poolTotalStaked + pool.availableToStake;
        const capacity = totalCapacity > 0
            ? Math.round((poolTotalStaked / totalCapacity) * 100)
            : 0;
        return {
            id: pool.id,
            name: pool.name,
            symbol: pool.symbol,
            icon: pool.icon,
            description: pool.description,
            apr: pool.apr,
            lockPeriod: pool.lockPeriod,
            minStake: pool.minStake,
            maxStake: pool.maxStake,
            availableToStake: pool.availableToStake,
            totalStaked: poolTotalStaked,
            capacity,
            earningFrequency: pool.earningFrequency,
            autoCompound: pool.autoCompound,
            totalStakers: parseInt(analytics.totalStakers) || 0,
            walletType: pool.walletType,
        };
    });
    const transformedHighApr = highestAprPools.map((pool) => ({
        id: pool.id,
        name: pool.name,
        symbol: pool.symbol,
        icon: pool.icon,
        apr: pool.apr,
        lockPeriod: pool.lockPeriod,
        earningFrequency: pool.earningFrequency,
    }));
    const transformedFlexible = flexiblePools.map((pool) => ({
        id: pool.id,
        name: pool.name,
        symbol: pool.symbol,
        icon: pool.icon,
        apr: pool.apr,
        lockPeriod: pool.lockPeriod,
        earlyWithdrawalFee: pool.earlyWithdrawalFee,
    }));
    const transformedUpcoming = upcomingPools.map((pool) => ({
        id: pool.id,
        name: pool.name,
        symbol: pool.symbol,
        icon: pool.icon,
        description: pool.description,
        apr: pool.apr,
        lockPeriod: pool.lockPeriod,
    }));
    const tokenStats = tokenAggregates.map((t) => ({
        token: t.token,
        symbol: t.symbol,
        icon: t.icon,
        poolCount: parseInt(t.poolCount) || 0,
        avgApr: parseFloat(t.avgApr) || 0,
        highestApr: parseFloat(t.highestApr) || 0,
    }));
    const recentActivity = [
        ...recentPositions.map((pos) => {
            var _a, _b;
            return ({
                type: "STAKE",
                amount: pos.amount,
                symbol: ((_a = pos.pool) === null || _a === void 0 ? void 0 : _a.symbol) || "TOKEN",
                poolName: ((_b = pos.pool) === null || _b === void 0 ? void 0 : _b.name) || "Pool",
                timeAgo: getTimeAgo(new Date(pos.createdAt)),
            });
        }),
        ...recentClaims.map((claim) => {
            var _a, _b, _c, _d;
            return ({
                type: "CLAIM",
                amount: claim.amount,
                symbol: ((_b = (_a = claim.position) === null || _a === void 0 ? void 0 : _a.pool) === null || _b === void 0 ? void 0 : _b.symbol) || "TOKEN",
                poolName: ((_d = (_c = claim.position) === null || _c === void 0 ? void 0 : _c.pool) === null || _d === void 0 ? void 0 : _d.name) || "Pool",
                timeAgo: getTimeAgo(new Date(claim.claimedAt)),
            });
        }),
    ]
        .sort((a, b) => a.timeAgo.localeCompare(b.timeAgo))
        .slice(0, 8);
    const earningFrequencies = earningFrequencyStats.map((f) => ({
        frequency: f.earningFrequency,
        poolCount: parseInt(f.poolCount) || 0,
        avgApr: parseFloat(f.avgApr) || 0,
    }));
    const samplePool = highestAprPools[0];
    const calculatorPreview = samplePool
        ? {
            samplePool: {
                name: samplePool.name,
                symbol: samplePool.symbol,
                apr: samplePool.apr,
            },
            examples: [
                {
                    amount: 100,
                    dailyReward: ((100 * samplePool.apr) / 100 / 365),
                    monthlyReward: ((100 * samplePool.apr) / 100 / 12),
                    yearlyReward: (100 * samplePool.apr) / 100,
                },
                {
                    amount: 1000,
                    dailyReward: ((1000 * samplePool.apr) / 100 / 365),
                    monthlyReward: ((1000 * samplePool.apr) / 100 / 12),
                    yearlyReward: (1000 * samplePool.apr) / 100,
                },
                {
                    amount: 10000,
                    dailyReward: ((10000 * samplePool.apr) / 100 / 365),
                    monthlyReward: ((10000 * samplePool.apr) / 100 / 12),
                    yearlyReward: (10000 * samplePool.apr) / 100,
                },
            ],
        }
        : null;
    return {
        stats: {
            totalStaked,
            activeUsers,
            totalPools,
            activePools,
            avgApr: Math.round(avgApr * 100) / 100,
            highestApr,
            lowestApr,
            totalRewards,
            totalClaimed,
            unclaimedRewards,
            stakedGrowth,
            usersGrowth: 0,
            rewardsGrowth: 0,
            avgLockPeriod: Math.round(avgLockPeriod),
            avgStakeAmount: Math.round(avgStakeAmount * 100) / 100,
            completionRate,
        },
        featuredPools: transformedFeatured,
        highestAprPools: transformedHighApr,
        flexiblePools: transformedFlexible,
        upcomingPools: transformedUpcoming,
        tokenStats,
        recentActivity,
        performance: {
            last7DaysRewards,
            last30DaysRewards,
            avgDailyRewards: Math.round(avgDailyRewards * 100) / 100,
            peakApr: highestApr,
            peakAprDate: null,
        },
        earningFrequencies,
        calculatorPreview,
    };
};
function getTimeAgo(date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60)
        return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
