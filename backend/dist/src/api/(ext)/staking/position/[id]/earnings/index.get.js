"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Staking Position Earnings",
    description: "Retrieves all earnings records for a specific staking position.",
    operationId: "getStakingPositionEarnings",
    tags: ["Staking", "Positions", "Earnings"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Position ID",
        },
        {
            index: 1,
            name: "claimed",
            in: "query",
            required: false,
            schema: { type: "boolean" },
            description: "Filter by claimed status",
        },
    ],
    responses: {
        200: {
            description: "Earnings retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            earnings: {
                                type: "array",
                                items: {
                                    type: "object",
                                },
                            },
                            summary: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    claimed: { type: "number" },
                                    unclaimed: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Not position owner" },
        404: { description: "Position not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching earnings for position ${id}`);
    const position = await db_1.models.stakingPosition.findOne({
        where: { id },
        include: [
            {
                model: db_1.models.stakingPool,
                as: "pool",
            },
        ],
    });
    if (!position) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Position not found" });
    }
    const pool = position.pool;
    if (!pool) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Position pool not found" });
    }
    if (position.userId !== user.id) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "You don't have access to this position",
        });
    }
    const whereClause = {
        positionId: position.id,
    };
    if (query.claimed !== undefined) {
        whereClause.isClaimed = query.claimed === "true";
    }
    const earnings = await db_1.models.stakingEarningRecord.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
    });
    const total = earnings.reduce((sum, record) => sum + record.amount, 0);
    const claimed = earnings
        .filter((record) => record.isClaimed)
        .reduce((sum, record) => sum + record.amount, 0);
    const unclaimed = total - claimed;
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${earnings.length} earnings for position ${id}`);
    return {
        earnings,
        summary: {
            total,
            claimed,
            unclaimed,
            tokenSymbol: pool.symbol,
        },
    };
};
