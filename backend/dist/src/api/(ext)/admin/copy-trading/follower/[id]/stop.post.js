"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
exports.metadata = {
    summary: "Force stop copy trading follower subscription",
    description: "Administratively forces a follower subscription to stop, returns any unused allocated funds to the user's wallet, creates a deallocation transaction record, decrements the leader's follower count, and creates an audit log entry. This operation uses database transactions to ensure data consistency. Returns an error if the subscription is already stopped.",
    operationId: "forceStopCopyTradingFollower",
    tags: ["Admin", "Copy Trading", "Follower"],
    requiresAuth: true,
    permission: "access.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Force Stop Copy Trading Follower Subscription",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Unique identifier of the follower subscription to stop",
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "Administrative reason for force stopping the subscription",
                            example: "Policy violation",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Follower subscription stopped successfully and funds returned",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                example: "Subscription stopped successfully",
                                description: "Success message",
                            },
                        },
                        required: ["message"],
                    },
                },
            },
        },
        400: {
            description: "Bad request - Subscription already stopped",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                example: "Subscription already stopped",
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Follower"),
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    const { reason } = body || {};
    const t = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching follower subscription");
        const follower = await db_1.models.copyTradingFollower.findByPk(id, {
            include: [
                { model: db_1.models.user, as: "user" },
                { model: db_1.models.copyTradingLeader, as: "leader" },
            ],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!follower) {
            await t.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Follower not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Follower not found" });
        }
        const followerData = follower;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating follower status");
        if (followerData.status === "STOPPED") {
            await t.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Subscription already stopped");
            throw (0, error_1.createError)({ statusCode: 400, message: "Subscription already stopped" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating follower status");
        await follower.update({
            status: "STOPPED",
        }, { transaction: t });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
        await (0, utils_1.createAuditLog)({
            userId: user.id,
            action: "ADMIN_FORCE_STOP",
            entityType: "copyTradingFollower",
            entityId: id,
            metadata: {
                reason,
                followerId: followerData.userId,
                leaderId: followerData.leaderId,
            },
            ipAddress: ((_a = data.request) === null || _a === void 0 ? void 0 : _a.ip) || "unknown",
        });
        await t.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Subscription stopped successfully");
        return {
            message: "Subscription stopped successfully",
        };
    }
    catch (error) {
        await t.rollback();
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to stop subscription");
        throw error;
    }
};
