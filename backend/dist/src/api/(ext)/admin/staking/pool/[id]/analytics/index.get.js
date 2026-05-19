"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Pool Analytics",
    description: "Retrieves analytics data for a specific staking pool.",
    operationId: "getPoolAnalytics",
    tags: ["Staking", "Admin", "Pools", "Analytics"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Get Pool Analytics",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Pool ID",
        },
        {
            name: "timeRange",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["7d", "30d", "90d", "1y"] },
            description: "Time range for analytics data",
        },
    ],
    responses: {
        200: {
            description: "Pool analytics retrieved successfully",
            content: {
                "application/json": {
                    schema: { type: "object" },
                },
            },
        },
        401: { description: "Unauthorized" },
        404: { description: "Pool not found" },
        500: { description: "Internal Server Error" },
    },
    permission: "view.staking.pool",
};
exports.default = async (data) => {
    const { user, params, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const poolId = params.id;
    if (!poolId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Pool ID is required" });
    }
    const timeRange = (query === null || query === void 0 ? void 0 : query.timeRange) || "30d";
    const { startDate, endDate } = getTimeRangeDates(timeRange);
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
        const pool = await db_1.models.stakingPool.findByPk(poolId);
        if (!pool) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Pool not found" });
        }
        const timeSeriesData = await getTimeSeriesData(poolId, startDate, endDate, timeRange);
        const metrics = await getMetrics(poolId);
        const distributions = await getDistributions(poolId, startDate, endDate);
        const performance = await getPerformance(poolId, startDate, endDate, timeRange);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Pool analytics retrieved successfully");
        return {
            timeSeriesData,
            metrics,
            distributions,
            performance,
        };
    }
    catch (error) {
        if (error.statusCode === 404) {
            throw error;
        }
        console.error(`Error fetching analytics for pool ${poolId}:`, error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to fetch pool analytics",
        });
    }
};
function getTimeRangeDates(timeRange) {
    const now = new Date();
    let startDate, endDate;
    switch (timeRange) {
        case "7d": {
            const day = now.getDay();
            const offset = (day + 6) % 7;
            startDate = new Date(now);
            startDate.setDate(now.getDate() - offset);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
        }
        case "30d": {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        }
        case "90d": {
            let startMonth = now.getMonth() - 2;
            let startYear = now.getFullYear();
            if (startMonth < 0) {
                startMonth += 12;
                startYear -= 1;
            }
            startDate = new Date(startYear, startMonth, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        }
        case "1y": {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        }
        default: {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        }
    }
    return { startDate, endDate };
}
async function getTimeSeriesData(poolId, startDate, endDate, timeRange) {
    const stakingData = (await db_1.models.stakingPosition.findAll({
        attributes: [
            [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "date"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "staked"],
        ],
        where: {
            poolId,
            createdAt: { [sequelize_1.Op.gte]: startDate, [sequelize_1.Op.lte]: endDate },
        },
        group: [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt"))],
        raw: true,
    }));
    const earningsData = (await db_1.models.stakingEarningRecord.findAll({
        attributes: [
            [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("stakingEarningRecord.createdAt")), "date"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("stakingEarningRecord.amount")), "earnings"],
        ],
        include: [
            {
                model: db_1.models.stakingPosition,
                as: "position",
                attributes: [],
                where: { poolId },
            },
        ],
        where: {
            createdAt: { [sequelize_1.Op.gte]: startDate, [sequelize_1.Op.lte]: endDate },
        },
        group: [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("stakingEarningRecord.createdAt"))],
        raw: true,
    }));
    const usersData = (await db_1.models.stakingPosition.findAll({
        attributes: [
            [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "date"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("userId"))), "users"],
        ],
        where: {
            poolId,
            createdAt: { [sequelize_1.Op.gte]: startDate, [sequelize_1.Op.lte]: endDate },
        },
        group: [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt"))],
        raw: true,
    }));
    const dailyBucketsMap = new Map();
    const current = new Date(startDate);
    while (current <= endDate) {
        const dateStr = current.toISOString().split("T")[0];
        dailyBucketsMap.set(dateStr, {
            date: dateStr,
            staked: 0,
            earnings: 0,
            users: 0,
        });
        current.setDate(current.getDate() + 1);
    }
    stakingData.forEach((item) => {
        const date = item.date;
        const bucket = dailyBucketsMap.get(date);
        if (bucket) {
            bucket.staked = Number.parseFloat(item.staked) || 0;
        }
    });
    earningsData.forEach((item) => {
        const date = item.date;
        const bucket = dailyBucketsMap.get(date);
        if (bucket) {
            bucket.earnings = Number.parseFloat(item.earnings) || 0;
        }
    });
    usersData.forEach((item) => {
        const date = item.date;
        const bucket = dailyBucketsMap.get(date);
        if (bucket) {
            bucket.users = Number.parseInt(item.users) || 0;
        }
    });
    const dailyBuckets = Array.from(dailyBucketsMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (timeRange === "7d" || timeRange === "30d") {
        return dailyBuckets;
    }
    else if (timeRange === "90d") {
        const weeklyBuckets = [];
        for (let i = 0; i < dailyBuckets.length; i += 7) {
            const weekSlice = dailyBuckets.slice(i, i + 7);
            const weekDate = weekSlice[0].date;
            const staked = weekSlice.reduce((sum, d) => sum + d.staked, 0);
            const earnings = weekSlice.reduce((sum, d) => sum + d.earnings, 0);
            const users = weekSlice.reduce((sum, d) => sum + d.users, 0);
            weeklyBuckets.push({ date: weekDate, staked, earnings, users });
        }
        return weeklyBuckets;
    }
    else if (timeRange === "1y") {
        const monthlyBuckets = {};
        dailyBuckets.forEach((item) => {
            const month = item.date.slice(0, 7);
            if (!monthlyBuckets[month]) {
                monthlyBuckets[month] = {
                    date: month,
                    staked: 0,
                    earnings: 0,
                    users: 0,
                };
            }
            monthlyBuckets[month].staked += item.staked;
            monthlyBuckets[month].earnings += item.earnings;
            monthlyBuckets[month].users += item.users;
        });
        return Object.values(monthlyBuckets).sort((a, b) => a.date.localeCompare(b.date));
    }
}
async function getMetrics(poolId) {
    const activePositionsCount = await db_1.models.stakingPosition.count({
        where: { poolId, status: "ACTIVE" },
    });
    const totalEarningsResult = (await db_1.models.stakingEarningRecord.findOne({
        attributes: [
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("stakingEarningRecord.amount")), "totalEarnings"],
        ],
        include: [
            {
                model: db_1.models.stakingPosition,
                as: "position",
                attributes: [],
                where: { poolId },
            },
        ],
        raw: true,
    }));
    const totalEarnings = Number.parseFloat(totalEarningsResult === null || totalEarningsResult === void 0 ? void 0 : totalEarningsResult.totalEarnings) || 0;
    const avgStakeAmountResult = (await db_1.models.stakingPosition.findOne({
        attributes: [[(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("amount")), "avgStakeAmount"]],
        where: { poolId },
        raw: true,
    }));
    const avgStakeAmount = Number.parseFloat(avgStakeAmountResult === null || avgStakeAmountResult === void 0 ? void 0 : avgStakeAmountResult.avgStakeAmount) || 0;
    const poolData = await db_1.models.stakingPool.findByPk(poolId, {
        attributes: ["apr"],
        raw: true,
    });
    const expectedAPR = (poolData === null || poolData === void 0 ? void 0 : poolData.apr) || 0;
    const performanceData = (await db_1.models.stakingExternalPoolPerformance.findAll({
        attributes: ["apr", "profit", "totalStaked"],
        where: { poolId },
        order: [["date", "DESC"]],
        limit: 10,
        raw: true,
    }));
    let actualAPR = 0;
    let efficiency = 0;
    if (performanceData.length > 0) {
        actualAPR =
            performanceData.reduce((sum, item) => sum + Number.parseFloat(item.apr), 0) / performanceData.length;
        efficiency = expectedAPR > 0 ? actualAPR / expectedAPR : 0;
    }
    return {
        activePositions: activePositionsCount,
        totalEarnings,
        avgStakeAmount,
        expectedAPR,
        actualAPR,
        efficiency,
    };
}
async function getDistributions(poolId, startDate, endDate) {
    const earningsDistribution = [
        { name: "0-10", value: 0 },
        { name: "10-50", value: 0 },
        { name: "50-100", value: 0 },
        { name: "100-500", value: 0 },
        { name: "500+", value: 0 },
    ];
    const earningsData = (await db_1.models.stakingEarningRecord.findAll({
        attributes: ["amount"],
        include: [
            {
                model: db_1.models.stakingPosition,
                as: "position",
                attributes: [],
                where: { poolId },
            },
        ],
        where: {
            createdAt: { [sequelize_1.Op.gte]: startDate, [sequelize_1.Op.lte]: endDate },
        },
        raw: true,
    }));
    earningsData.forEach((item) => {
        const amount = Number.parseFloat(item.amount);
        if (amount <= 10) {
            earningsDistribution[0].value += 1;
        }
        else if (amount <= 50) {
            earningsDistribution[1].value += 1;
        }
        else if (amount <= 100) {
            earningsDistribution[2].value += 1;
        }
        else if (amount <= 500) {
            earningsDistribution[3].value += 1;
        }
        else {
            earningsDistribution[4].value += 1;
        }
    });
    const earningsByTypeData = (await db_1.models.stakingEarningRecord.findAll({
        attributes: [
            "type",
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("stakingEarningRecord.amount")), "value"],
        ],
        include: [
            {
                model: db_1.models.stakingPosition,
                as: "position",
                attributes: [],
                where: { poolId },
            },
        ],
        where: {
            createdAt: { [sequelize_1.Op.gte]: startDate, [sequelize_1.Op.lte]: endDate },
        },
        group: ["type"],
        raw: true,
    }));
    const earningsByType = earningsByTypeData.map((item) => ({
        name: item.type,
        value: Number.parseFloat(item.value) || 0,
    }));
    const userPositionCounts = (await db_1.models.stakingPosition.findAll({
        attributes: ["userId", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "positionCount"]],
        where: { poolId },
        group: ["userId"],
        raw: true,
    }));
    const userRetention = [
        { name: "1 Position", value: 0 },
        { name: "2 Positions", value: 0 },
        { name: "3+ Positions", value: 0 },
    ];
    userPositionCounts.forEach((item) => {
        const count = Number.parseInt(item.positionCount);
        if (count === 1) {
            userRetention[0].value += 1;
        }
        else if (count === 2) {
            userRetention[1].value += 1;
        }
        else {
            userRetention[2].value += 1;
        }
    });
    return {
        earningsDistribution,
        earningsByType,
        userRetention,
    };
}
async function getPerformance(poolId, startDate, endDate, timeRange) {
    const performanceData = (await db_1.models.stakingExternalPoolPerformance.findAll({
        attributes: ["date", "apr"],
        where: {
            poolId,
            date: { [sequelize_1.Op.gte]: startDate, [sequelize_1.Op.lte]: endDate },
        },
        order: [["date", "ASC"]],
        raw: true,
    }));
    const dailyPerformanceMap = new Map();
    performanceData.forEach((item) => {
        const dateStr = new Date(item.date).toISOString().split("T")[0];
        dailyPerformanceMap.set(dateStr, Number.parseFloat(item.apr) || 0);
    });
    const dailyBuckets = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        const dateStr = current.toISOString().split("T")[0];
        dailyBuckets.push({
            date: dateStr,
            apr: dailyPerformanceMap.get(dateStr) || 0,
        });
        current.setDate(current.getDate() + 1);
    }
    const poolData = await db_1.models.stakingPool.findByPk(poolId, {
        attributes: ["apr"],
        raw: true,
    });
    const expectedAPR = (poolData === null || poolData === void 0 ? void 0 : poolData.apr) || 0;
    const formatOutput = (buckets) => {
        const aprOverTime = buckets.map((item) => ({
            date: item.date,
            expectedAPR,
            actualAPR: item.apr,
        }));
        const efficiencyTrend = buckets.map((item) => ({
            date: item.date,
            efficiency: expectedAPR > 0 ? item.apr / expectedAPR : 0,
        }));
        return { aprOverTime, efficiencyTrend };
    };
    if (timeRange === "7d" || timeRange === "30d") {
        return formatOutput(dailyBuckets);
    }
    else if (timeRange === "90d") {
        const weeklyBuckets = [];
        for (let i = 0; i < dailyBuckets.length; i += 7) {
            const weekSlice = dailyBuckets.slice(i, i + 7);
            const weekDate = weekSlice[0].date;
            const avgApr = weekSlice.reduce((sum, d) => sum + d.apr, 0) / weekSlice.length;
            weeklyBuckets.push({ date: weekDate, apr: avgApr });
        }
        return formatOutput(weeklyBuckets);
    }
    else if (timeRange === "1y") {
        const monthlyBuckets = {};
        dailyBuckets.forEach((item) => {
            const month = item.date.slice(0, 7);
            if (!monthlyBuckets[month]) {
                monthlyBuckets[month] = { date: month, sumApr: 0, count: 0 };
            }
            monthlyBuckets[month].sumApr += item.apr;
            monthlyBuckets[month].count += 1;
        });
        const monthlyAggregates = Object.values(monthlyBuckets)
            .map((bucket) => ({
            date: bucket.date,
            apr: bucket.count > 0 ? bucket.sumApr / bucket.count : 0,
        }))
            .sort((a, b) => a.date.localeCompare(b.date));
        return formatOutput(monthlyAggregates);
    }
    return formatOutput(dailyBuckets);
}
