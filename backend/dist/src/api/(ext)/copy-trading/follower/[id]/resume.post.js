"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
exports.metadata = {
    summary: "Resume Subscription",
    description: "Resumes a paused subscription.",
    operationId: "resumeCopyTradingSubscription",
    tags: ["Copy Trading", "Followers"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Resume subscription",
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
            description: "Subscription resumed successfully",
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
    const subscription = await db_1.models.copyTradingFollower.findByPk(id, {
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
            },
        ],
    });
    if (!subscription) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Subscription not found" });
    }
    if (subscription.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Access denied" });
    }
    if (subscription.status !== "PAUSED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Only paused subscriptions can be resumed",
        });
    }
    const leader = subscription.leader;
    if (!leader || leader.status !== "ACTIVE") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot resume - leader is no longer active",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resuming subscription");
    const oldStatus = subscription.status;
    await subscription.update({ status: "ACTIVE" });
    await (0, utils_1.createAuditLog)({
        entityType: "FOLLOWER",
        entityId: id,
        action: "RESUME",
        oldValue: { status: oldStatus },
        newValue: { status: "ACTIVE" },
        userId: user.id,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
    await (0, utils_1.notifyFollowerSubscriptionEvent)(id, "RESUMED", undefined, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Subscription resumed");
    return {
        message: "Subscription resumed successfully",
        subscription: subscription.toJSON(),
    };
};
