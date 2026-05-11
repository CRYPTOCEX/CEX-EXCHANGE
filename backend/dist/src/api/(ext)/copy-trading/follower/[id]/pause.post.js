"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
exports.metadata = {
    summary: "Pause Subscription",
    description: "Pauses a subscription, stopping new trades from being copied.",
    operationId: "pauseCopyTradingSubscription",
    tags: ["Copy Trading", "Followers"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Pause subscription",
    middleware: ["copyTradingFollowerAction"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Subscription ID",
        },
    ],
    responses: {
        200: {
            description: "Subscription paused successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            subscription: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Subscription not found" },
        429: { description: "Too Many Requests" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!(0, security_1.isValidUUID)(id)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid subscription ID" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching subscription");
    const subscription = await db_1.models.copyTradingFollower.findByPk(id);
    if (!subscription) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Subscription not found" });
    }
    if (subscription.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Access denied" });
    }
    if (subscription.status !== "ACTIVE") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Only active subscriptions can be paused",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Pausing subscription");
    const oldStatus = subscription.status;
    await subscription.update({ status: "PAUSED" });
    await (0, utils_1.createAuditLog)({
        entityType: "FOLLOWER",
        entityId: id,
        action: "PAUSE",
        oldValue: { status: oldStatus },
        newValue: { status: "PAUSED" },
        userId: user.id,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
    await (0, utils_1.notifyFollowerSubscriptionEvent)(id, "PAUSED", undefined, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Subscription paused");
    return {
        message: "Subscription paused successfully",
        subscription: subscription.toJSON(),
    };
};
