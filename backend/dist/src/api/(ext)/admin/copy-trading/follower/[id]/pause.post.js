"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const notifications_1 = require("@b/api/(ext)/copy-trading/utils/notifications");
const settings_core_1 = require("@b/api/(ext)/copy-trading/utils/settings-core");
const transaction_1 = require("@b/utils/transaction");
exports.metadata = {
    summary: "Pause copy trading follower subscription",
    description: "Administratively pauses an ACTIVE follower subscription so no further leader trades are copied to it. Funds and allocations are left untouched — use the stop endpoint for the terminal action. Creates an audit log entry and notifies the follower.",
    operationId: "pauseCopyTradingFollowerAsAdmin",
    tags: ["Admin", "Copy Trading", "Follower"],
    requiresAuth: true,
    permission: "edit.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Pause Copy Trading Follower Subscription",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Unique identifier of the follower subscription to pause",
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
                            description: "Administrative reason for pausing the subscription",
                            example: "Awaiting risk review",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Follower subscription paused successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                example: "Subscription paused successfully",
                            },
                        },
                        required: ["message"],
                    },
                },
            },
        },
        400: {
            description: "Bad request - only active subscriptions can be paused",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                example: "Only active subscriptions can be paused",
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
    let committed = false;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching follower subscription");
        const follower = await db_1.models.copyTradingFollower.findByPk(id, {
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
        if (followerData.status !== "ACTIVE") {
            await t.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Only active subscriptions can be paused");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Only active subscriptions can be paused",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating follower status");
        await follower.update({ status: "PAUSED" }, { transaction: t });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
        await (0, settings_core_1.createAuditLog)({
            userId: user.id,
            action: "ADMIN_PAUSE",
            entityType: "copyTradingFollower",
            entityId: id,
            oldValue: { status: "ACTIVE" },
            newValue: { status: "PAUSED" },
            metadata: {
                reason,
                followerId: followerData.userId,
                leaderId: followerData.leaderId,
            },
            ipAddress: ((_a = data.request) === null || _a === void 0 ? void 0 : _a.ip) || "unknown",
        }, t);
        await t.commit();
        committed = true;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
        await (0, notifications_1.notifyFollowerSubscriptionEvent)(id, "PAUSED", undefined, ctx);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Subscription paused successfully");
        return {
            message: "Subscription paused successfully",
        };
    }
    catch (error) {
        if (!committed) {
            await (0, transaction_1.rollbackIfActive)(t);
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to pause subscription");
            throw error;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Subscription paused (notification failed)");
        return {
            message: "Subscription paused successfully",
        };
    }
};
