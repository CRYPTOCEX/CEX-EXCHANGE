"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Test In-App Notification",
    description: "Send a test in-app notification to verify the in-app channel is configured correctly",
    operationId: "testInAppNotification",
    tags: ["Admin", "Notification", "Testing"],
    requiresAuth: true,
    permission: "access.notification.settings",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        userId: {
                            type: "string",
                            description: "User ID to send test notification to (defaults to current user)",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Test in-app notification sent successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            notificationId: { type: "string" },
                            delivered: { type: "boolean" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { body, user, ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Sending test in-app notification");
        const targetUserId = body.userId || (user === null || user === void 0 ? void 0 : user.id);
        if (!targetUserId) {
            throw new Error("User ID is required");
        }
        const result = await notification_1.notificationService.send({
            userId: targetUserId,
            type: "SYSTEM",
            channels: ["IN_APP"],
            data: {
                title: "Test In-App Notification",
                message: "This is a test in-app notification from the notification service. If you see this, your in-app channel is working correctly!",
                link: "/admin/notifications",
                testMode: true,
                timestamp: new Date().toISOString(),
            },
            priority: "NORMAL",
            idempotencyKey: `test-in-app-${targetUserId}-${Date.now()}`,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Test in-app notification sent");
        return {
            success: result.success,
            message: result.success
                ? "Test in-app notification sent successfully"
                : "Failed to send test in-app notification",
            notificationId: result.notificationId,
            delivered: result.channelsDelivered.includes("IN_APP"),
            channels: {
                delivered: result.channelsDelivered,
                failed: result.channelsFailed,
            },
        };
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
};
