"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
const errors_1 = require("@b/utils/schema/errors");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Test Push Notification",
    description: "Send a test push notification to verify the push channel is configured correctly",
    operationId: "testPushNotification",
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
            description: "Test push notification sent successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            notificationId: { type: "string" },
                            delivered: { type: "boolean" },
                            providerInfo: {
                                type: "object",
                                properties: {
                                    fcmAvailable: { type: "boolean" },
                                    webPushAvailable: { type: "boolean" },
                                    userHasTokens: { type: "boolean" },
                                },
                            },
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
    var _a, _b, _c, _d, _e;
    const { body, user, ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Checking push configuration");
        const targetUserId = body.userId || (user === null || user === void 0 ? void 0 : user.id);
        if (!targetUserId) {
            throw new Error("User ID is required");
        }
        const pushChannel = notification_1.notificationService.getChannel("PUSH") || new notification_1.PushChannel();
        const fcmAvailable = pushChannel.hasFCMProvider();
        const webPushAvailable = pushChannel.hasWebPushProvider();
        const targetUser = await db_1.models.user.findByPk(targetUserId, {
            attributes: ["settings"],
        });
        const userSettings = (targetUser === null || targetUser === void 0 ? void 0 : targetUser.settings) || {};
        const hasPushTokens = !!((userSettings.pushTokens && Object.keys(userSettings.pushTokens).length > 0) ||
            (userSettings.webPushSubscriptions && userSettings.webPushSubscriptions.length > 0));
        if (!fcmAvailable && !webPushAvailable) {
            return {
                success: false,
                message: "No push providers configured. Set VAPID_* or FCM_* environment variables.",
                delivered: false,
                providerInfo: {
                    fcmAvailable,
                    webPushAvailable,
                    userHasTokens: hasPushTokens,
                },
            };
        }
        if (!hasPushTokens) {
            return {
                success: false,
                message: "User has no push notification subscriptions. Enable push notifications in your browser first.",
                delivered: false,
                providerInfo: {
                    fcmAvailable,
                    webPushAvailable,
                    userHasTokens: false,
                },
            };
        }
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Sending test push notification");
        const result = await notification_1.notificationService.send({
            userId: targetUserId,
            type: "SYSTEM",
            channels: ["PUSH"],
            data: {
                title: "Test Push Notification",
                message: "This is a test push notification from the notification service. If you received this, your push channel is working correctly!",
                testMode: true,
                timestamp: new Date().toISOString(),
                badge: 1,
                link: "/user/profile?tab=notifications",
            },
            priority: "NORMAL",
            idempotencyKey: `test-push-${targetUserId}-${Date.now()}`,
        });
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Test push notification sent");
        const pushFailed = result.channelsFailed.includes("PUSH");
        const errorMessage = pushFailed && ((_d = result.errors) === null || _d === void 0 ? void 0 : _d.PUSH)
            ? result.errors.PUSH
            : pushFailed
                ? "Failed to deliver push notification"
                : undefined;
        return {
            success: result.success && !pushFailed,
            message: pushFailed
                ? errorMessage || "Failed to send test push notification"
                : "Test push notification sent successfully",
            notificationId: result.notificationId,
            delivered: result.channelsDelivered.includes("PUSH"),
            channels: {
                delivered: result.channelsDelivered,
                failed: result.channelsFailed,
            },
            providerInfo: {
                fcmAvailable,
                webPushAvailable,
                userHasTokens: hasPushTokens,
            },
            errors: result.errors,
        };
    }
    catch (error) {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, error.message);
        throw error;
    }
};
