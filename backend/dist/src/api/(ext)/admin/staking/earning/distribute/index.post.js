"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Distribute Earnings to Stakers",
    operationId: "distributeStakingEarnings",
    description: "Distributes earnings to all active stakers in a pool. The total amount is split into admin fees (based on pool's adminFeePercentage) and user earnings. Admin fees are recorded as a PLATFORM_FEE admin earning. User earnings are distributed proportionally to each active position based on their staked amount. Creates earning records for both admin and users, and logs the distribution activity.",
    tags: ["Admin", "Staking", "Earnings"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Distribute Earnings",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        poolId: {
                            type: "string",
                            format: "uuid",
                            description: "ID of the staking pool to distribute earnings for",
                        },
                        amount: {
                            type: "number",
                            minimum: 0,
                            description: "Total amount to distribute (before admin fee)",
                        },
                        distributionType: {
                            type: "string",
                            enum: ["regular", "bonus"],
                            description: "Type of distribution: 'regular' for standard earnings or 'bonus' for extra rewards",
                        },
                    },
                    required: ["poolId", "amount", "distributionType"],
                },
            },
        },
    },
    responses: {
        200: (0, errors_1.successMessageResponse)("Earnings distributed successfully to all active stakers"),
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
    const { poolId, amount, distributionType } = body;
    if (!poolId || !amount || !distributionType) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "poolId, amount, and distributionType are required",
        });
    }
    if (!["regular", "bonus"].includes(distributionType)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid distributionType",
        });
    }
    const t = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch pool");
        const pool = await db_1.models.stakingPool.findByPk(poolId, { transaction: t });
        if (!pool) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Pool not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculate admin fee and user earnings");
        const adminFee = parseFloat(((amount * pool.adminFeePercentage) / 100).toFixed(4));
        const userEarningTotal = parseFloat((amount - adminFee).toFixed(4));
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create admin earning record");
        await db_1.models.stakingAdminEarning.create({
            poolId: pool.id,
            amount: adminFee,
            type: "PLATFORM_FEE",
            currency: pool.symbol,
            isClaimed: false,
        }, { transaction: t });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Get active staking positions");
        const positions = await db_1.models.stakingPosition.findAll({
            where: { poolId: pool.id, status: "ACTIVE" },
            transaction: t,
        });
        const totalStaked = positions.reduce((sum, pos) => sum + pos.amount, 0);
        if (totalStaked === 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "No active positions found for distribution",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Distribute earnings to positions");
        const earningType = distributionType.toUpperCase();
        for (const pos of positions) {
            const positionShare = pos.amount / totalStaked;
            const positionEarning = parseFloat((userEarningTotal * positionShare).toFixed(4));
            if (positionEarning > 0) {
                await db_1.models.stakingEarningRecord.create({
                    positionId: pos.id,
                    amount: positionEarning,
                    type: earningType,
                    description: `Earnings distribution from pool ${pool.name}`,
                    isClaimed: false,
                }, { transaction: t });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Log distribution activity");
        await db_1.models.stakingAdminActivity.create({
            userId: user.id,
            action: "distribute",
            type: "earnings",
            relatedId: pool.id,
        }, { transaction: t });
        await t.commit();
        try {
            await (0, notifications_1.createNotification)({
                userId: user.id,
                relatedId: pool.id,
                type: "system",
                title: "Earnings Distributed",
                message: `Distributed ${amount} ${pool.symbol}: Admin Fee ${adminFee}, User Earnings ${userEarningTotal}`,
                details: "Earnings distribution completed successfully.",
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
            console.error("Failed to create notification", notifErr);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Earnings distributed successfully");
        return { message: "Earnings distributed successfully" };
    }
    catch (error) {
        await t.rollback();
        console.error("Error distributing earnings:", error);
        throw (0, error_1.createError)({
            statusCode: error.statusCode || 500,
            message: error.message || "Failed to distribute earnings",
        });
    }
};
