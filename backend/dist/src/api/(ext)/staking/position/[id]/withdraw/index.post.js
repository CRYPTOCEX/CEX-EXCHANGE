"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notifications_1 = require("@b/utils/notifications");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Request Withdrawal from Staking Position",
    description: "Initiates a withdrawal request for a specific staking position.",
    operationId: "withdrawStakingPosition",
    tags: ["Staking", "Positions", "Withdrawal"],
    requiresAuth: true,
    logModule: "STAKING",
    logTitle: "Request withdrawal",
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
    responses: {
        200: {
            description: "Withdrawal request submitted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            position: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Not position owner" },
        404: { description: "Position not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving staking position");
    const transaction = await db_1.sequelize.transaction();
    try {
        const position = await db_1.models.stakingPosition.findOne({
            where: { id },
            include: [
                {
                    model: db_1.models.stakingPool,
                    as: "pool",
                },
            ],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!position) {
            await transaction.rollback();
            throw (0, error_1.createError)({ statusCode: 404, message: "Position not found" });
        }
        const pool = position.pool;
        if (!pool) {
            await transaction.rollback();
            throw (0, error_1.createError)({ statusCode: 404, message: "Position pool not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying position ownership");
        if (position.userId !== user.id) {
            await transaction.rollback();
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "You don't have access to this position",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating position status");
        if (position.status === "PENDING_WITHDRAWAL") {
            await transaction.rollback();
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Withdrawal already in progress",
            });
        }
        if (position.status === "COMPLETED") {
            await transaction.rollback();
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Position is already withdrawn",
            });
        }
        const withdrawalAmount = position.amount;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating position status to pending withdrawal");
        await db_1.models.stakingPosition.update({
            status: "PENDING_WITHDRAWAL",
            withdrawalRequested: true,
            withdrawalRequestDate: new Date(),
        }, {
            where: { id: position.id },
            transaction,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating withdrawal notification");
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: position.id,
            type: "system",
            title: "Staking Withdrawal Requested",
            message: `Your withdrawal request for ${withdrawalAmount} ${pool.symbol} has been submitted and is pending approval.`,
            link: `/staking/positions/${position.id}`,
            actions: [
                {
                    label: "View Position",
                    link: `/staking/positions/${position.id}`,
                    primary: true,
                },
            ],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving updated position details");
        const updatedPosition = await db_1.models.stakingPosition.findOne({
            where: { id },
            include: [
                {
                    model: db_1.models.stakingPool,
                    as: "pool",
                },
            ],
            transaction,
        });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Withdrawal request submitted for ${withdrawalAmount} ${pool.symbol}`);
        return {
            success: true,
            message: "Withdrawal request submitted successfully",
            position: updatedPosition,
        };
    }
    catch (error) {
        await transaction.rollback();
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to process withdrawal request");
        throw error;
    }
};
