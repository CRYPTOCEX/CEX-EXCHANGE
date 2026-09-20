"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Staking Pool by ID",
    description: "Retrieves a specific staking pool by its ID with related data.",
    operationId: "getStakingPoolById",
    tags: ["Staking", "Admin", "Pools"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Get Staking Pool",
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
            description: "Pool retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                    },
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
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const poolId = params.id;
    if (!poolId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Pool ID is required" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
        const pool = await db_1.models.stakingPool.findOne({
            where: { id: poolId },
            attributes: {
                include: [
                    [
                        (0, sequelize_1.literal)(`(
              SELECT COALESCE(SUM(sp.amount), 0)
              FROM staking_positions AS sp
              WHERE sp.poolId = stakingPool.id
            )`),
                        "totalStaked",
                    ],
                ],
            },
            include: [
                {
                    model: db_1.models.stakingPosition,
                    as: "positions",
                    required: false,
                },
                {
                    model: db_1.models.stakingAdminEarning,
                    as: "adminEarnings",
                    required: false,
                },
                {
                    model: db_1.models.stakingExternalPoolPerformance,
                    as: "performances",
                    required: false,
                },
            ],
        });
        if (!pool) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Pool not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Operation completed successfully");
        return pool;
    }
    catch (error) {
        if (error.statusCode === 404) {
            throw error;
        }
        console.error(`Error fetching staking pool ${poolId}:`, error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch staking pool ${poolId}`,
        });
    }
};
