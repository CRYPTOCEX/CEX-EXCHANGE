"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List External Pool Performance Records",
    operationId: "listExternalPoolPerformance",
    description: "Retrieves historical performance data for external staking pools. Performance records track daily metrics including APR, total staked amounts, profit, and notes. Can be filtered by specific pool and date range to analyze pool performance over time.",
    tags: ["Admin", "Staking", "Performance"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Get Staking Performance",
    parameters: [
        {
            index: 0,
            name: "poolId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
            description: "Filter performance records by pool ID",
        },
        {
            index: 1,
            name: "startDate",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Filter performance records from this date onwards",
        },
        {
            index: 2,
            name: "endDate",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Filter performance records up to this date",
        },
    ],
    responses: {
        200: {
            description: "Performance data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                ...errors_1.commonFields,
                                poolId: { type: "string", format: "uuid" },
                                date: { type: "string", format: "date-time" },
                                apr: {
                                    type: "number",
                                    description: "Annual Percentage Rate on this date",
                                },
                                totalStaked: {
                                    type: "number",
                                    description: "Total amount staked in the pool",
                                },
                                profit: {
                                    type: "number",
                                    description: "Profit generated on this date",
                                },
                                notes: {
                                    type: "string",
                                    description: "Additional notes about performance",
                                },
                                pool: {
                                    type: "object",
                                    description: "Associated staking pool details",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "view.staking.performance",
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
        const where = {};
        if (query === null || query === void 0 ? void 0 : query.poolId) {
            where.poolId = query.poolId;
        }
        if (query === null || query === void 0 ? void 0 : query.startDate) {
            where.date = {
                ...where.date,
                [sequelize_1.Op.gte]: new Date(query.startDate),
            };
        }
        if (query === null || query === void 0 ? void 0 : query.endDate) {
            where.date = {
                ...where.date,
                [sequelize_1.Op.lte]: new Date(query.endDate),
            };
        }
        const performances = await db_1.models.stakingExternalPoolPerformance.findAll({
            where,
            include: [
                {
                    model: db_1.models.stakingPool,
                    as: "pool",
                },
            ],
            order: [["date", "DESC"]],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Operation completed successfully");
        return performances;
    }
    catch (error) {
        console.error("Error fetching external pool performance:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch external pool performance",
        });
    }
};
