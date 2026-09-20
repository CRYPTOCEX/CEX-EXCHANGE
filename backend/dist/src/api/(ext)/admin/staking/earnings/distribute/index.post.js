"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Distribute Earnings to Positions",
    operationId: "distributeStakingEarningsToPositions",
    description: "Manually distributes earnings to active staking positions based on APR and days active. Calculates daily earnings for each position, deducts platform fees, and creates earning records for both users and platform. Supports dry-run mode for testing and can process specific positions or all active positions in a pool. Includes safeguards against recent distributions unless forced.",
    tags: ["Admin", "Staking", "Earnings"],
    logModule: "ADMIN_STAKE",
    logTitle: "Distribute Staking Earnings",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    required: ["poolId"],
                    properties: {
                        poolId: {
                            type: "string",
                            format: "uuid",
                            description: "Pool ID to distribute earnings for"
                        },
                        positionIds: {
                            type: "array",
                            description: "Specific position IDs to process (optional, processes all active if not provided)",
                            items: { type: "string", format: "uuid" }
                        },
                        dryRun: {
                            type: "boolean",
                            description: "If true, simulates the distribution without making changes",
                            default: false
                        },
                        forceProcess: {
                            type: "boolean",
                            description: "If true, processes even if recently processed",
                            default: false
                        }
                    }
                }
            }
        }
    },
    responses: {
        200: {
            description: "Earnings distributed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            processed: {
                                type: "integer",
                                description: "Number of positions processed",
                            },
                            totalEarnings: {
                                type: "number",
                                description: "Total gross earnings calculated",
                            },
                            platformFees: {
                                type: "number",
                                description: "Total platform fees collected",
                            },
                            netEarnings: {
                                type: "number",
                                description: "Net earnings distributed to users",
                            },
                            dryRun: {
                                type: "boolean",
                                description: "Whether this was a simulation",
                            },
                            details: {
                                type: "array",
                                description: "Detailed breakdown (only included in dry-run mode)",
                                items: {
                                    type: "object",
                                    properties: {
                                        positionId: { type: "string" },
                                        userId: { type: "string" },
                                        amount: { type: "number" },
                                        earnings: { type: "number" },
                                        platformFee: { type: "number" },
                                        netEarning: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        403: errors_1.forbiddenResponse,
        404: (0, errors_1.notFoundResponse)("Staking Pool"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.staking.management"
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { poolId, positionIds, dryRun = false, forceProcess = false } = body;
    if (!poolId || typeof poolId !== "string") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Valid pool ID is required"
        });
    }
    if (positionIds && (!Array.isArray(positionIds) || positionIds.length === 0)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "positionIds must be a non-empty array if provided"
        });
    }
    if (positionIds && positionIds.length > 100) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Maximum 100 positions can be processed at once"
        });
    }
    const transaction = dryRun ? null : await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch staking pool");
        const pool = await db_1.models.stakingPool.findByPk(poolId, { transaction });
        if (!pool) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Staking pool not found" });
        }
        if (pool.status !== "ACTIVE" && !forceProcess) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Pool is not active. Use forceProcess=true to override."
            });
        }
        const positionQuery = {
            poolId,
            status: "ACTIVE"
        };
        if (positionIds) {
            positionQuery.id = { [sequelize_1.Op.in]: positionIds };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Check if recently processed");
        if (!forceProcess) {
            const recentCutoff = new Date();
            recentCutoff.setHours(recentCutoff.getHours() - 1);
            const recentEarnings = await db_1.models.stakingEarningRecord.findOne({
                include: [{
                        model: db_1.models.stakingPosition,
                        as: "position",
                        where: positionQuery,
                        attributes: []
                    }],
                where: {
                    createdAt: { [sequelize_1.Op.gte]: recentCutoff }
                },
                transaction
            });
            if (recentEarnings) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Earnings were recently distributed for this pool. Use forceProcess=true to override."
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch positions to process");
        const positions = await db_1.models.stakingPosition.findAll({
            where: positionQuery,
            include: [{
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"]
                }],
            transaction
        });
        if (positions.length === 0) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "No active positions found to process"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculate and distribute earnings");
        const now = new Date();
        let totalEarnings = 0;
        let totalPlatformFees = 0;
        const details = [];
        for (const position of positions) {
            const startDate = new Date(position.startDate);
            const daysActive = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysActive <= 0) {
                continue;
            }
            const dailyRate = pool.apr / 365 / 100;
            const earnings = position.amount * dailyRate * daysActive;
            const platformFeeRate = pool.adminFeePercentage || 10;
            const platformFee = (earnings * platformFeeRate) / 100;
            const netEarning = earnings - platformFee;
            totalEarnings += earnings;
            totalPlatformFees += platformFee;
            details.push({
                positionId: position.id,
                userId: position.userId,
                amount: position.amount,
                earnings: Math.round(earnings * 100) / 100,
                platformFee: Math.round(platformFee * 100) / 100,
                netEarning: Math.round(netEarning * 100) / 100
            });
            if (!dryRun && netEarning > 0) {
                await db_1.models.stakingEarningRecord.create({
                    positionId: position.id,
                    amount: netEarning,
                    type: "REGULAR",
                    description: `Earnings distribution for ${daysActive} days at ${pool.apr}% APR`,
                    isClaimed: false,
                }, { transaction });
                if (platformFee > 0) {
                    await db_1.models.stakingAdminEarning.create({
                        poolId: pool.id,
                        amount: platformFee,
                        type: "PLATFORM_FEE",
                        currency: pool.symbol,
                    }, { transaction });
                }
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create admin activity log");
        if (!dryRun) {
            await db_1.models.stakingAdminActivity.create({
                userId: user.id,
                action: "distribute",
                type: "earnings",
                relatedId: poolId,
            }, { transaction });
        }
        if (transaction) {
            await transaction.commit();
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(dryRun ? "Dry run completed successfully" : "Earnings distributed successfully");
        return {
            message: dryRun ? "Dry run completed - no changes made" : "Earnings distributed successfully",
            processed: details.length,
            totalEarnings: Math.round(totalEarnings * 100) / 100,
            platformFees: Math.round(totalPlatformFees * 100) / 100,
            netEarnings: Math.round((totalEarnings - totalPlatformFees) * 100) / 100,
            dryRun,
            details: dryRun ? details : undefined
        };
    }
    catch (error) {
        if (transaction) {
            await transaction.rollback();
        }
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to distribute earnings"
        });
    }
};
