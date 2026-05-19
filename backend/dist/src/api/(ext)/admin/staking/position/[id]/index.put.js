"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Update Staking Position",
    description: "Updates an existing staking position with the provided details.",
    operationId: "updateStakingPosition",
    tags: ["Staking", "Admin", "Positions"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Update Staking Position",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Position ID",
        },
    ],
    requestBody: {
        description: "Updated staking position data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: { type: "number" },
                        startDate: { type: "string", format: "date-time" },
                        endDate: { type: "string", format: "date-time" },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "COMPLETED", "CANCELLED", "PENDING_WITHDRAWAL"],
                        },
                        withdrawalRequested: { type: "boolean" },
                        withdrawalRequestDate: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                        },
                        adminNotes: {
                            type: "string",
                            nullable: true,
                        },
                        completedAt: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Position updated successfully",
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
        404: { description: "Position not found" },
        500: { description: "Internal Server Error" },
    },
    permission: "edit.staking.position",
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f;
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const positionId = params.id;
    if (!positionId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Position ID is required" });
    }
    if (!body) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Request body is required" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Find position to update");
        const position = await db_1.models.stakingPosition.findOne({
            where: { id: positionId },
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
        const typedPosition = position;
        if (!typedPosition.pool) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Position pool not found" });
        }
        const isCompletingPosition = typedPosition.status !== "COMPLETED" && body.status === "COMPLETED";
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Update position");
        await typedPosition.update({
            ...body,
            completedAt: isCompletingPosition && !body.completedAt
                ? new Date()
                : body.completedAt,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reload position with associations");
        const updatedPosition = await db_1.models.stakingPosition.findOne({
            where: { id: positionId },
            include: [
                {
                    model: db_1.models.stakingPool,
                    as: "pool",
                },
                {
                    model: db_1.models.stakingEarningRecord,
                    as: "earningHistory",
                    required: false,
                },
            ],
        });
        if (!updatedPosition) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Position not found after update" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculate additional properties");
        const pendingRewardsResult = await db_1.models.stakingEarningRecord.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "pendingRewards"]],
            where: {
                positionId: typedPosition.id,
                isClaimed: false,
            },
            raw: true,
        });
        const pendingRewards = Number(pendingRewardsResult === null || pendingRewardsResult === void 0 ? void 0 : pendingRewardsResult.pendingRewards) || 0;
        const earningsToDateResult = await db_1.models.stakingEarningRecord.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "earningsToDate"]],
            where: {
                positionId: typedPosition.id,
            },
            raw: true,
        });
        const earningsToDate = Number(earningsToDateResult === null || earningsToDateResult === void 0 ? void 0 : earningsToDateResult.earningsToDate) || 0;
        const lastEarningRecord = await db_1.models.stakingEarningRecord.findOne({
            attributes: ["createdAt"],
            where: {
                positionId: typedPosition.id,
            },
            order: [["createdAt", "DESC"]],
            raw: true,
        });
        const lastEarningDate = (lastEarningRecord === null || lastEarningRecord === void 0 ? void 0 : lastEarningRecord.createdAt) || null;
        try {
            const userId = typedPosition.userId;
            const poolName = (_b = (_a = typedPosition.pool) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "Unknown Pool";
            let title, message, details;
            if (isCompletingPosition) {
                title = "Staking Position Completed";
                message = `Your staking position in ${poolName} has been completed.`;
                details =
                    "Your staked amount and earnings are now available for withdrawal.";
            }
            else if (body.status === "CANCELLED") {
                title = "Staking Position Cancelled";
                message = `Your staking position in ${poolName} has been cancelled.`;
                details = "Please contact support if you have any questions.";
            }
            else if (body.withdrawalRequested && !typedPosition.withdrawalRequested) {
                title = "Withdrawal Request Received";
                message = `Your withdrawal request for ${poolName} has been received.`;
                details = "We are processing your request and will update you soon.";
            }
            else {
                title = "Staking Position Updated";
                message = `Your staking position in ${poolName} has been updated.`;
                details = "Check your dashboard for the latest information.";
            }
            await (0, notifications_1.createNotification)({
                userId,
                relatedId: typedPosition.id,
                type: "system",
                title,
                message,
                details,
                link: `/staking/positions/${typedPosition.id}`,
                actions: [
                    {
                        label: "View Position",
                        link: `/staking/positions/${typedPosition.id}`,
                        primary: true,
                    },
                ],
            }, ctx);
        }
        catch (notifErr) {
            console.error("Failed to create notification for position update", notifErr);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Staking position updated successfully");
        return {
            ...updatedPosition.toJSON(),
            pendingRewards,
            earningsToDate,
            lastEarningDate,
            rewardTokenSymbol: (_c = updatedPosition.pool) === null || _c === void 0 ? void 0 : _c.symbol,
            tokenSymbol: (_d = updatedPosition.pool) === null || _d === void 0 ? void 0 : _d.symbol,
            poolName: (_e = updatedPosition.pool) === null || _e === void 0 ? void 0 : _e.name,
            lockPeriodEnd: updatedPosition.endDate,
            apr: (_f = updatedPosition.pool) === null || _f === void 0 ? void 0 : _f.apr,
        };
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.statusCode) === 404) {
            throw error;
        }
        console.error(`Error updating staking position ${positionId}:`, error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Failed to update staking position",
        });
    }
};
