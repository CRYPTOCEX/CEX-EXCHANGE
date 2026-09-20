"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const notification_1 = require("@b/services/notification");
exports.metadata = {
    summary: "Unsubscribe from push notifications",
    description: "Remove a push notification subscription or token for the current user",
    operationId: "unsubscribeFromPush",
    tags: ["User", "Push Notifications"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        deviceId: {
                            type: "string",
                            description: "Device ID to unsubscribe",
                        },
                        endpoint: {
                            type: "string",
                            description: "Web Push endpoint to unsubscribe (alternative to deviceId)",
                        },
                        token: {
                            type: "string",
                            description: "FCM token to unsubscribe (alternative to deviceId)",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Unsubscribed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: {
                                type: "boolean",
                            },
                            message: {
                                type: "string",
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: "Unauthorized",
        },
    },
};
exports.default = async (data) => {
    const { user, body } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "User not authenticated",
        });
    }
    const { deviceId, endpoint, token } = body;
    const identifier = deviceId || endpoint || token;
    if (!identifier) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Please provide deviceId, endpoint, or token to unsubscribe",
        });
    }
    const pushChannel = notification_1.notificationService.getChannel("PUSH") || new notification_1.PushChannel();
    const success = await pushChannel.removeDeviceToken(user.id, identifier);
    if (!success) {
        return {
            success: false,
            message: "Subscription not found or already removed",
        };
    }
    return {
        success: true,
        message: "Unsubscribed from push notifications successfully",
    };
};
