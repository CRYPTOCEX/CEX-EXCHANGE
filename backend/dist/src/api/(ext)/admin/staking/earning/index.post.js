"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Create Admin Earning Record",
    operationId: "createAdminEarning",
    description: "Creates a new admin earning record for a staking pool. Admin earnings represent platform fees, early withdrawal fees, performance fees, or other earnings collected by the platform from the staking pool operations.",
    tags: ["Admin", "Staking", "Earnings"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Add Admin Earning",
    requestBody: {
        description: "Admin earning data",
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
                            description: "Date when the earning was generated",
                        },
                        amount: {
                            type: "number",
                            minimum: 0,
                            description: "Amount of the earning",
                        },
                        isClaimed: {
                            type: "boolean",
                            description: "Whether the earning has been claimed",
                            default: false,
                        },
                        type: {
                            type: "string",
                            enum: [
                                "PLATFORM_FEE",
                                "EARLY_WITHDRAWAL_FEE",
                                "PERFORMANCE_FEE",
                                "OTHER",
                            ],
                            description: "Type of admin earning",
                        },
                        status: {
                            type: "string",
                            description: "Status of the earning record",
                        },
                        currency: {
                            type: "string",
                            description: "Currency/token symbol of the earning",
                        },
                    },
                    required: ["poolId", "date", "amount", "type", "status", "currency"],
                },
            },
        },
    },
    responses: {
        201: {
            description: "Admin earning record created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...errors_1.commonFields,
                            poolId: { type: "string", format: "uuid" },
                            amount: { type: "number" },
                            isClaimed: { type: "boolean" },
                            type: {
                                type: "string",
                                enum: [
                                    "PLATFORM_FEE",
                                    "EARLY_WITHDRAWAL_FEE",
                                    "PERFORMANCE_FEE",
                                    "OTHER",
                                ],
                            },
                            currency: { type: "string" },
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
    permission: "create.staking.earning",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!body) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Request body is required" });
    }
    const { poolId, date, amount, type, status, currency, isClaimed = false, } = body;
    if (!poolId ||
        !date ||
        amount === undefined ||
        !type ||
        !status ||
        !currency) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "poolId, date, amount, type, status, and currency are required",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Check if pool exists");
        const pool = await db_1.models.stakingPool.findByPk(poolId);
        if (!pool) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Pool not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create admin earning record");
        const adminEarning = await db_1.models.stakingAdminEarning.create({
            poolId,
            amount,
            isClaimed,
            type,
            currency,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch created earning with pool");
        const createdEarning = await db_1.models.stakingAdminEarning.findOne({
            where: { id: adminEarning.id },
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
                relatedId: adminEarning.id,
                type: "system",
                title: "Admin Earning Added",
                message: `New admin earning of ${amount} ${currency} has been added for ${pool.name}.`,
                details: "The earning record has been created successfully.",
                link: `/admin/staking/earnings`,
                actions: [
                    {
                        label: "View Earnings",
                        link: `/admin/staking/earnings`,
                        primary: true,
                    },
                ],
            }, ctx);
        }
        catch (notifErr) {
            console.error("Failed to create notification for admin earning", notifErr);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Admin earning created successfully");
        return createdEarning;
    }
    catch (error) {
        if (error.statusCode === 404) {
            throw error;
        }
        console.error("Error creating admin earning:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
};
