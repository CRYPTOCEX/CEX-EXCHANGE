"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Create External Pool Performance Record",
    operationId: "createExternalPoolPerformance",
    description: "Creates a new performance record for an external staking pool. Records daily or periodic performance metrics including APR achieved, total amount staked, profit generated, and operational notes. Used for tracking and analyzing external pool performance over time.",
    tags: ["Admin", "Staking", "Performance"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Add Pool Performance",
    requestBody: {
        description: "External pool performance data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        poolId: {
                            type: "string",
                            format: "uuid",
                            description: "ID of the staking pool",
                        },
                        date: {
                            type: "string",
                            format: "date-time",
                            description: "Date of the performance record",
                        },
                        apr: {
                            type: "number",
                            minimum: 0,
                            description: "Annual Percentage Rate achieved",
                        },
                        totalStaked: {
                            type: "number",
                            minimum: 0,
                            description: "Total amount staked in the pool",
                        },
                        profit: {
                            type: "number",
                            description: "Profit generated (can be negative)",
                        },
                        notes: {
                            type: "string",
                            description: "Additional notes or observations",
                        },
                    },
                    required: ["poolId", "date", "apr", "totalStaked", "profit"],
                },
            },
        },
    },
    responses: {
        201: {
            description: "Performance record created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...errors_1.commonFields,
                            poolId: { type: "string", format: "uuid" },
                            date: { type: "string", format: "date-time" },
                            apr: { type: "number" },
                            totalStaked: { type: "number" },
                            profit: { type: "number" },
                            notes: { type: "string" },
                            pool: {
                                type: "object",
                                description: "Associated staking pool details",
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Staking Pool"),
        500: errors_1.serverErrorResponse,
    },
    permission: "create.staking.performance",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!body) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Request body is required" });
    }
    const { poolId, date, apr, totalStaked, profit, notes = "" } = body;
    if (!poolId ||
        !date ||
        apr === undefined ||
        totalStaked === undefined ||
        profit === undefined) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "poolId, date, apr, totalStaked, and profit are required",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Check if pool exists");
        const pool = await db_1.models.stakingPool.findByPk(poolId);
        if (!pool) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Pool not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create performance record");
        const performance = await db_1.models.stakingExternalPoolPerformance.create({
            poolId,
            date,
            apr,
            totalStaked,
            profit,
            notes,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch created performance with pool");
        const createdPerformance = await db_1.models.stakingExternalPoolPerformance.findOne({
            where: { id: performance.id },
            include: [
                {
                    model: db_1.models.stakingPool,
                    as: "pool",
                },
            ],
        });
        try {
            await (0, notifications_1.createNotification)({
                userId: user.id,
                relatedId: performance.id,
                type: "system",
                title: "Pool Performance Added",
                message: `New performance record added for ${pool.name} with ${apr}% APR.`,
                details: "The performance record has been created successfully.",
                link: `/admin/staking/performance`,
                actions: [
                    {
                        label: "View Performance",
                        link: `/admin/staking/performance`,
                        primary: true,
                    },
                ],
            }, ctx);
        }
        catch (notifErr) {
            console.error("Failed to create notification for performance record", notifErr);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Pool performance record created successfully");
        return createdPerformance;
    }
    catch (error) {
        if (error.statusCode === 404) {
            throw error;
        }
        console.error("Error creating external pool performance:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
};
