"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const notification_1 = require("@b/services/notification");
const WebPushProvider_1 = require("@b/services/notification/providers/push/WebPushProvider");
const mobileDevice_1 = require("@b/services/notification/utils/mobileDevice");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Subscribe to push notifications",
    description: "Register a Web Push subscription or FCM token for the current user",
    operationId: "subscribeToPush",
    tags: ["User", "Push Notifications"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    required: ["type"],
                    properties: {
                        type: {
                            type: "string",
                            enum: ["webpush", "fcm"],
                            description: "Type of push subscription",
                        },
                        subscription: {
                            type: "object",
                            description: "Web Push subscription object (for type=webpush)",
                            properties: {
                                endpoint: {
                                    type: "string",
                                    description: "Push service endpoint URL",
                                },
                                keys: {
                                    type: "object",
                                    properties: {
                                        p256dh: {
                                            type: "string",
                                            description: "P-256 public key",
                                        },
                                        auth: {
                                            type: "string",
                                            description: "Authentication secret",
                                        },
                                    },
                                },
                            },
                        },
                        token: {
                            type: "string",
                            description: "FCM token (for type=fcm)",
                        },
                        deviceId: {
                            type: "string",
                            description: "Optional device identifier",
                        },
                        platform: {
                            type: "string",
                            enum: ["web", "android", "ios"],
                            description: "Platform type",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Subscription registered successfully",
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
                            deviceId: {
                                type: "string",
                                description: "Generated or provided device ID",
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
    var _a;
    const { user, body } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "User not authenticated",
        });
    }
    const { type, subscription, token, deviceId, platform } = body;
    if (!type) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Subscription type is required",
        });
    }
    const pushChannel = notification_1.notificationService.getChannel("PUSH") || new notification_1.PushChannel();
    if (type === "webpush") {
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid Web Push subscription object",
            });
        }
        if (!subscription.keys.p256dh || !subscription.keys.auth) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Missing subscription keys (p256dh and auth required)",
            });
        }
        if (!(0, WebPushProvider_1.isAllowedPushEndpoint)(subscription.endpoint)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Unsupported push service endpoint",
            });
        }
        if (!pushChannel.hasWebPushProvider()) {
            throw (0, error_1.createError)({
                statusCode: 503,
                message: "Web Push notifications are not configured on this server",
            });
        }
        const success = await pushChannel.addWebPushSubscription(user.id, subscription, deviceId);
        if (!success) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to save subscription",
            });
        }
        return {
            success: true,
            message: "Web Push subscription registered successfully",
            deviceId: deviceId || "auto-generated",
        };
    }
    else if (type === "fcm") {
        if (!token) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "FCM token is required",
            });
        }
        if (!pushChannel.hasFCMProvider()) {
            throw (0, error_1.createError)({
                statusCode: 503,
                message: "FCM notifications are not configured on this server",
            });
        }
        const success = await pushChannel.addDeviceToken(user.id, token, "fcm", deviceId, platform || "web");
        if (!success) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to save FCM token",
            });
        }
        if ((0, mobileDevice_1.isMobilePlatform)(platform) && deviceId) {
            try {
                await (0, mobileDevice_1.registerMobileDevice)({
                    userId: user.id,
                    deviceId,
                    platform,
                    pushToken: token,
                    appVersion: ((_a = data.headers) === null || _a === void 0 ? void 0 : _a["app-version"]) || null,
                    locale: body.locale || null,
                });
            }
            catch (error) {
                console_1.logger.error("PUSH", `Device registry write failed for user ${user.id}: ${error === null || error === void 0 ? void 0 : error.message}`);
            }
        }
        return {
            success: true,
            message: "FCM token registered successfully",
            deviceId: deviceId || null,
            registered: Boolean((0, mobileDevice_1.isMobilePlatform)(platform) && deviceId),
        };
    }
    else {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid subscription type. Use 'webpush' or 'fcm'",
        });
    }
};
