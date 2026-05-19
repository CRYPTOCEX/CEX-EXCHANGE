"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Staking Pool Details",
    description: "Retrieves detailed information about a specific staking pool.",
    operationId: "getStakingPoolById",
    tags: ["Staking", "Pools"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Pool ID",
        },
    ],
    responses: {
        200: {
            description: "Pool details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            pool: { type: "object" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        404: { description: "Pool not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    const pool = await db_1.models.stakingPool.findOne({
        where: { id },
    });
    if (!pool) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Pool not found" });
    }
    const analytics = (await db_1.models.stakingPosition.findOne({
        attributes: [
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalStaked"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("userId"))), "totalStakers"],
        ],
        where: {
            poolId: pool.id,
            status: { [sequelize_1.Op.in]: ["ACTIVE", "COMPLETED"] },
        },
        raw: true,
    }));
    const totalStaked = (analytics === null || analytics === void 0 ? void 0 : analytics.totalStaked)
        ? parseFloat(String(analytics.totalStaked))
        : 0;
    const totalStakers = (analytics === null || analytics === void 0 ? void 0 : analytics.totalStakers)
        ? parseInt(String(analytics.totalStakers))
        : 0;
    const userPositions = await db_1.models.stakingPosition.findAll({
        where: {
            poolId: pool.id,
            userId: user.id,
            status: { [sequelize_1.Op.in]: ["ACTIVE", "COMPLETED", "PENDING_WITHDRAWAL"] },
        },
    });
    const userTotalStaked = userPositions.reduce((sum, pos) => sum + pos.amount, 0);
    const performanceHistory = await db_1.models.stakingExternalPoolPerformance.findAll({
        where: { poolId: pool.id },
        order: [["date", "DESC"]],
        limit: 30,
    });
    const enhancedPool = {
        ...pool.toJSON(),
        totalStaked,
        analytics: {
            totalStakers,
            userTotalStaked,
            userPositionsCount: userPositions.length,
            performanceHistory,
        },
        userPositions,
    };
    return enhancedPool;
};
