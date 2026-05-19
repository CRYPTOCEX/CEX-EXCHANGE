"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Update Staking Pool",
    description: "Updates an existing staking pool with the provided details.",
    operationId: "updateStakingPool",
    tags: ["Staking", "Admin", "Pools"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Update Staking Pool",
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
    requestBody: {
        description: "Updated staking pool data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        token: { type: "string" },
                        symbol: { type: "string" },
                        icon: { type: "string" },
                        description: { type: "string" },
                        apr: { type: "number" },
                        lockPeriod: { type: "number" },
                        minStake: { type: "number" },
                        maxStake: { type: "number", nullable: true },
                        totalStaked: { type: "number" },
                        availableToStake: { type: "number" },
                        earlyWithdrawalFee: { type: "number" },
                        adminFeePercentage: { type: "number" },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "INACTIVE", "COMING_SOON"],
                        },
                        isPromoted: { type: "boolean" },
                        order: { type: "number" },
                        earningFrequency: {
                            type: "string",
                            enum: ["DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"],
                        },
                        autoCompound: { type: "boolean" },
                        externalPoolUrl: { type: "string" },
                        profitSource: { type: "string" },
                        fundAllocation: { type: "string" },
                        risks: { type: "string" },
                        rewards: { type: "string" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Pool updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Pool not found" },
        500: { description: "Internal Server Error" },
    },
    permission: "edit.staking.pool",
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const poolId = params.id;
    if (!poolId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Pool ID is required" });
    }
    if (!body) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Request body is required" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Find pool to update");
        const pool = await db_1.models.stakingPool.findOne({
            where: { id: poolId },
        });
        if (!pool) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Pool not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Update pool");
        await pool.update(body);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reload pool with associations");
        const updatedPool = await db_1.models.stakingPool.findOne({
            where: { id: poolId },
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
        try {
            await (0, notifications_1.createNotification)({
                userId: user.id,
                relatedId: pool.id,
                type: "system",
                title: "Staking Pool Updated",
                message: `Staking pool "${pool.name}" has been updated successfully.`,
                details: "The changes are now reflected in the admin dashboard.",
                link: `/admin/staking/pools/${pool.id}`,
                actions: [
                    {
                        label: "View Pool",
                        link: `/admin/staking/pools/${pool.id}`,
                        primary: true,
                    },
                ],
            }, ctx);
        }
        catch (notifErr) {
            console.error("Failed to create notification for pool update", notifErr);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Staking pool updated successfully");
        return updatedPool;
    }
    catch (error) {
        if (error.statusCode === 404) {
            throw error;
        }
        console.error(`Error updating staking pool ${poolId}:`, error);
        if (error.name === "SequelizeValidationError") {
            const validationErrors = {};
            error.errors.forEach((err) => {
                validationErrors[err.path] = err.message;
            });
            const validationError = (0, error_1.createError)({
                statusCode: 400,
                message: "Validation failed. Please check the required fields.",
            });
            validationError.validationErrors = validationErrors;
            throw validationError;
        }
        if (error.name === "SequelizeUniqueConstraintError") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "A pool with this name or symbol already exists",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to update staking pool",
        });
    }
};
