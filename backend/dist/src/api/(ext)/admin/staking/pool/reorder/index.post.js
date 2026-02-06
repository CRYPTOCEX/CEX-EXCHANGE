"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Reorder Staking Pools",
    description: "Updates the order of staking pools based on the provided pool IDs array.",
    operationId: "reorderStakingPools",
    tags: ["Staking", "Admin", "Pools"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Reorder Staking Pools",
    requestBody: {
        description: "Pool IDs in the desired order",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        poolIds: {
                            type: "array",
                            items: { type: "string" },
                        },
                    },
                    required: ["poolIds"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Pools reordered successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
    permission: "edit.staking.pool",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!(body === null || body === void 0 ? void 0 : body.poolIds) ||
        !Array.isArray(body.poolIds) ||
        body.poolIds.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Pool IDs array is required and must not be empty",
        });
    }
    const { poolIds } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reorder pools");
        await db_1.sequelize.transaction(async (t) => {
            for (let i = 0; i < poolIds.length; i++) {
                await db_1.models.stakingPool.update({ order: i + 1 }, {
                    where: { id: poolIds[i] },
                    transaction: t,
                });
            }
        });
        try {
            await (0, notifications_1.createNotification)({
                userId: user.id,
                type: "system",
                title: "Staking Pools Reordered",
                message: "Staking pools have been reordered successfully.",
                details: "The new order is now reflected in the admin dashboard.",
                link: `/admin/staking/pools`,
                actions: [
                    {
                        label: "View Pools",
                        link: `/admin/staking/pools`,
                        primary: true,
                    },
                ],
            }, ctx);
        }
        catch (notifErr) {
            console.error("Failed to create notification for pool reordering", notifErr);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Pools reordered successfully");
        return { message: "Pools reordered successfully" };
    }
    catch (error) {
        console.error("Error reordering staking pools:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
};
