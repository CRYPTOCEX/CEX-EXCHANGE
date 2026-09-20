"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Reorder staking pools display order",
    operationId: "reorderStakingPools",
    tags: ["Admin", "Staking", "Pool", "Reorder"],
    logModule: "ADMIN_STAKE",
    logTitle: "Reorder Pools Display Order",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    required: ["poolOrders"],
                    properties: {
                        poolOrders: {
                            type: "array",
                            description: "Array of pool IDs in desired order",
                            items: {
                                type: "object",
                                required: ["poolId", "order"],
                                properties: {
                                    poolId: { type: "string", format: "uuid" },
                                    order: { type: "integer", minimum: 0 }
                                }
                            }
                        }
                    }
                }
            }
        }
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
                            updated: { type: "integer" }
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
    const { poolOrders } = body;
    if (!Array.isArray(poolOrders) || poolOrders.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "poolOrders must be a non-empty array"
        });
    }
    const poolIds = new Set();
    const orders = new Set();
    for (const entry of poolOrders) {
        if (!entry.poolId || typeof entry.poolId !== "string") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Each entry must have a valid poolId"
            });
        }
        if (typeof entry.order !== "number" || entry.order < 0 || !Number.isInteger(entry.order)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Each entry must have a valid non-negative integer order"
            });
        }
        if (poolIds.has(entry.poolId)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Duplicate poolId found: ${entry.poolId}`
            });
        }
        poolIds.add(entry.poolId);
        if (orders.has(entry.order)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Duplicate order value found: ${entry.order}`
            });
        }
        orders.add(entry.order);
    }
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verify all pools exist");
        const existingPools = await db_1.models.stakingPool.findAll({
            where: {
                id: Array.from(poolIds)
            },
            attributes: ["id"],
            transaction
        });
        if (existingPools.length !== poolIds.size) {
            const existingIds = new Set(existingPools.map(p => p.id));
            const missingIds = Array.from(poolIds).filter(id => !existingIds.has(id));
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Pool(s) not found: ${missingIds.join(", ")}`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Update pool orders");
        const updatePromises = poolOrders.map(({ poolId, order: orderValue }) => db_1.models.stakingPool.update({ order: orderValue }, {
            where: { id: poolId },
            transaction
        }));
        await Promise.all(updatePromises);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create admin activity log");
        const activityPromises = poolOrders.map(({ poolId }) => db_1.models.stakingAdminActivity.create({
            userId: user.id,
            action: "update",
            type: "pool",
            relatedId: poolId,
        }, { transaction }));
        await Promise.all(activityPromises);
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Staking pools reordered successfully");
        return {
            message: "Staking pools reordered successfully",
            updated: poolOrders.length
        };
    }
    catch (error) {
        await transaction.rollback();
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to reorder pools"
        });
    }
};
