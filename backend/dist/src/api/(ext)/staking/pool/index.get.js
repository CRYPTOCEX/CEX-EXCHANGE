"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Available Staking Pools",
    description: "Retrieves all active staking pools available for users to stake in.",
    operationId: "getStakingPools",
    tags: ["Staking", "Pools"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "token",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter pools by token name",
        },
        {
            index: 1,
            name: "minApr",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Minimum APR filter",
        },
        {
            index: 2,
            name: "maxApr",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Maximum APR filter",
        },
        {
            index: 3,
            name: "minLockPeriod",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Minimum staking duration in days",
        },
    ],
    responses: {
        200: {
            description: "Staking pools retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            pools: {
                                type: "array",
                                items: { type: "object" },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Building query filters");
    const whereClause = { status: "ACTIVE" };
    if (query.token) {
        whereClause.token = query.token;
    }
    if (query.minApr) {
        whereClause.apr = {
            ...(whereClause.apr || {}),
            [sequelize_1.Op.gte]: Number.parseFloat(query.minApr),
        };
    }
    if (query.maxApr) {
        whereClause.apr = {
            ...(whereClause.apr || {}),
            [sequelize_1.Op.lte]: Number.parseFloat(query.maxApr),
        };
    }
    if (query.minLockPeriod) {
        whereClause.lockPeriod = { [sequelize_1.Op.gte]: Number.parseInt(query.minLockPeriod) };
    }
    const pools = await db_1.models.stakingPool.findAll({
        where: whereClause,
        order: [["order", "ASC"]],
    });
    const poolIds = pools.map((pool) => pool.id);
    if (poolIds.length === 0) {
        return [];
    }
    const overallAnalytics = await db_1.models.stakingPosition.findAll({
        attributes: [
            "poolId",
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalStaked"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("userId"))), "totalStakers"],
        ],
        where: {
            poolId: poolIds,
            status: { [sequelize_1.Op.in]: ["ACTIVE", "COMPLETED"] },
        },
        group: ["poolId"],
        raw: true,
    });
    const analyticsMap = overallAnalytics.reduce((acc, item) => {
        acc[item.poolId] = {
            totalStaked: parseFloat(item.totalStaked) || 0,
            totalStakers: parseInt(item.totalStakers) || 0,
        };
        return acc;
    }, {});
    const userAnalytics = await db_1.models.stakingPosition.findAll({
        attributes: [
            "poolId",
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "userTotalStaked"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "userPositionsCount"],
        ],
        where: {
            poolId: poolIds,
            userId: user.id,
            status: { [sequelize_1.Op.in]: ["ACTIVE", "COMPLETED"] },
        },
        group: ["poolId"],
        raw: true,
    });
    const userAnalyticsMap = userAnalytics.reduce((acc, item) => {
        acc[item.poolId] = {
            userTotalStaked: parseFloat(item.userTotalStaked) || 0,
            userPositionsCount: parseInt(item.userPositionsCount) || 0,
        };
        return acc;
    }, {});
    const enhancedPools = pools.map((pool) => {
        const poolAnalytics = analyticsMap[pool.id] || {
            totalStaked: 0,
            totalStakers: 0,
        };
        const userPoolAnalytics = userAnalyticsMap[pool.id] || {
            userTotalStaked: 0,
            userPositionsCount: 0,
        };
        return {
            ...pool.toJSON(),
            totalStaked: poolAnalytics.totalStaked,
            analytics: {
                totalStakers: poolAnalytics.totalStakers,
                userTotalStaked: userPoolAnalytics.userTotalStaked,
                userPositionsCount: userPoolAnalytics.userPositionsCount,
            },
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${enhancedPools.length} staking pools`);
    return enhancedPools;
};
