"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Bulk update staking positions",
    operationId: "bulkUpdateStakingPositions",
    tags: ["Admin", "Staking", "Position", "Bulk"],
    logModule: "ADMIN_STAKE",
    logTitle: "Bulk Update Positions",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    required: ["positionIds", "action"],
                    properties: {
                        positionIds: {
                            type: "array",
                            description: "Array of position IDs to update",
                            items: { type: "string", format: "uuid" }
                        },
                        action: {
                            type: "string",
                            enum: ["PAUSE", "RESUME", "COMPLETE", "CANCEL"],
                            description: "Action to perform on positions"
                        },
                        reason: {
                            type: "string",
                            description: "Optional reason for the action"
                        }
                    }
                }
            }
        }
    },
    responses: {
        200: {
            description: "Positions updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            updated: { type: "integer" },
                            failed: { type: "integer" },
                            errors: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        positionId: { type: "string" },
                                        error: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Invalid request data" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Admin access required" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.staking.management"
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { positionIds, action, reason } = body;
    if (!Array.isArray(positionIds) || positionIds.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "positionIds must be a non-empty array"
        });
    }
    if (positionIds.length > 100) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Maximum 100 positions can be updated at once"
        });
    }
    const validActions = ["PAUSE", "RESUME", "COMPLETE", "CANCEL"];
    if (!validActions.includes(action)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Invalid action. Must be one of: ${validActions.join(", ")}`
        });
    }
    for (const id of positionIds) {
        if (!id || typeof id !== "string") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "All position IDs must be valid strings"
            });
        }
    }
    const transaction = await db_1.sequelize.transaction();
    let updated = 0;
    const errors = [];
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch all positions");
        const positions = await db_1.models.stakingPosition.findAll({
            where: {
                id: {
                    [sequelize_1.Op.in]: positionIds
                }
            },
            include: [{
                    model: db_1.models.stakingPool,
                    as: "pool",
                    attributes: ["id", "symbol", "walletType", "walletChain"]
                }],
            transaction
        });
        if (positions.length === 0) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "No positions found with the provided IDs"
            });
        }
        const typedPositions = positions;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Process each position");
        for (const position of typedPositions) {
            try {
                if (!position.pool) {
                    errors.push({
                        positionId: position.id,
                        error: "Position pool not found"
                    });
                    continue;
                }
                const currentStatus = position.status;
                let newStatus = currentStatus;
                let shouldUpdate = false;
                switch (action) {
                    case "PAUSE":
                        if (currentStatus === "ACTIVE") {
                            newStatus = "PAUSED";
                            shouldUpdate = true;
                        }
                        else {
                            errors.push({
                                positionId: position.id,
                                error: `Cannot pause position with status ${currentStatus}`
                            });
                        }
                        break;
                    case "RESUME":
                        if (currentStatus === "PAUSED") {
                            newStatus = "ACTIVE";
                            shouldUpdate = true;
                        }
                        else {
                            errors.push({
                                positionId: position.id,
                                error: `Cannot resume position with status ${currentStatus}`
                            });
                        }
                        break;
                    case "COMPLETE":
                        if (["ACTIVE", "PAUSED"].includes(currentStatus)) {
                            newStatus = "COMPLETED";
                            shouldUpdate = true;
                            const wallet = await db_1.models.wallet.findOne({
                                where: {
                                    userId: position.userId,
                                    currency: position.pool.symbol,
                                    type: position.pool.walletType || 'SPOT'
                                },
                                transaction
                            });
                            if (wallet) {
                                const idempotencyKey = `staking_complete_${position.id}`;
                                await wallet_1.walletService.credit({
                                    idempotencyKey,
                                    userId: position.userId,
                                    walletId: wallet.id,
                                    walletType: (position.pool.walletType || 'SPOT'),
                                    currency: position.pool.symbol,
                                    amount: position.amount,
                                    operationType: "STAKING_WITHDRAW",
                                    description: `Staking position ${position.id} completed - principal returned`,
                                    metadata: {
                                        source: 'STAKING_COMPLETE',
                                        positionId: position.id,
                                        reason: reason || 'Admin action'
                                    },
                                    transaction
                                });
                            }
                        }
                        else {
                            errors.push({
                                positionId: position.id,
                                error: `Cannot complete position with status ${currentStatus}`
                            });
                        }
                        break;
                    case "CANCEL":
                        if (!["COMPLETED", "CANCELLED"].includes(currentStatus)) {
                            newStatus = "CANCELLED";
                            shouldUpdate = true;
                            const wallet = await db_1.models.wallet.findOne({
                                where: {
                                    userId: position.userId,
                                    currency: position.pool.symbol,
                                    type: position.pool.walletType || 'SPOT'
                                },
                                transaction
                            });
                            if (wallet) {
                                const idempotencyKey = `staking_cancel_${position.id}`;
                                await wallet_1.walletService.credit({
                                    idempotencyKey,
                                    userId: position.userId,
                                    walletId: wallet.id,
                                    walletType: (position.pool.walletType || 'SPOT'),
                                    currency: position.pool.symbol,
                                    amount: position.amount,
                                    operationType: "STAKING_WITHDRAW",
                                    description: `Staking position ${position.id} cancelled - principal returned`,
                                    metadata: {
                                        source: 'STAKING_CANCEL',
                                        positionId: position.id,
                                        reason: reason || 'Admin action'
                                    },
                                    transaction
                                });
                            }
                        }
                        else {
                            errors.push({
                                positionId: position.id,
                                error: `Cannot cancel position with status ${currentStatus}`
                            });
                        }
                        break;
                }
                if (shouldUpdate) {
                    await position.update({
                        status: newStatus,
                        ...(["COMPLETED", "CANCELLED"].includes(newStatus) && {
                            completedAt: new Date()
                        })
                    }, { transaction });
                    updated++;
                }
            }
            catch (error) {
                errors.push({
                    positionId: position.id,
                    error: (error === null || error === void 0 ? void 0 : error.message) || "Failed to update position"
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create admin activity logs");
        const actionMap = {
            PAUSE: "update",
            RESUME: "update",
            COMPLETE: "update",
            CANCEL: "delete",
        };
        const mappedAction = actionMap[action] || "update";
        for (const positionId of positionIds) {
            try {
                await db_1.models.stakingAdminActivity.create({
                    userId: user.id,
                    action: mappedAction,
                    type: "position",
                    relatedId: positionId,
                }, { transaction });
            }
            catch (logError) {
                console.error("Failed to create admin activity log:", logError);
            }
        }
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Bulk position update completed successfully");
        return {
            message: `Bulk position update completed`,
            updated,
            failed: errors.length,
            errors: errors.length > 0 ? errors : undefined
        };
    }
    catch (error) {
        await transaction.rollback();
        if (error === null || error === void 0 ? void 0 : error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Failed to bulk update positions"
        });
    }
};
