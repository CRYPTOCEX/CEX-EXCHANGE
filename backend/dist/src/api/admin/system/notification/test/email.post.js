"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Test Email Notification",
    description: "Send a test email notification to verify the email channel is configured correctly",
    operationId: "testEmailNotification",
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
                        email: {
                            type: "string",
                            format: "email",
                            description: "Override email address for testing",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Test email sent successfully",
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
    var _a, _b, _c, _d;
    const { body, user, ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Sending test email notification");
        const targetUserId = body.userId || (user === null || user === void 0 ? void 0 : user.id);
        if (!targetUserId) {
            throw new Error("User ID is required");
        }
        const result = await notification_1.notificationService.send({
            userId: targetUserId,
            type: "SYSTEM",
            channels: ["EMAIL"],
            data: {
                title: "Test Email Notification",
                message: "This is a test email from the notification service. If you received this, your email channel is working correctly!",
                testMode: true,
                timestamp: new Date().toISOString(),
                ...(body.email && { overrideEmail: body.email }),
            },
            priority: "NORMAL",
            idempotencyKey: `test-email-${targetUserId}-${Date.now()}`,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Test email notification sent");
        const emailFailed = result.channelsFailed.includes("EMAIL");
        const errorMessage = emailFailed && ((_c = result.errors) === null || _c === void 0 ? void 0 : _c.EMAIL)
            ? result.errors.EMAIL
            : emailFailed
                ? "EMAIL channel not configured or not registered"
                : undefined;
        return {
            success: result.success && !emailFailed,
            message: emailFailed
                ? errorMessage || "Failed to send test email"
                : "Test email sent successfully",
            notificationId: result.notificationId,
            delivered: result.channelsDelivered.includes("EMAIL"),
            channels: {
                delivered: result.channelsDelivered,
                failed: result.channelsFailed,
            },
        };
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        throw error;
    }
};
