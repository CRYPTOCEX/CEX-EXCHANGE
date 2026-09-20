"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get VAPID public key",
    description: "Returns the VAPID public key needed for Web Push subscription on the frontend",
    operationId: "getVapidPublicKey",
    tags: ["User", "Push Notifications"],
    requiresAuth: true,
    responses: {
        200: {
            description: "VAPID public key retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            publicKey: {
                                type: "string",
                                description: "VAPID public key for subscribing to push notifications",
                            },
                            fcmAvailable: {
                                type: "boolean",
                                description: "Whether FCM is configured (for mobile apps)",
                            },
                            webPushAvailable: {
                                type: "boolean",
                                description: "Whether Web Push (VAPID) is configured",
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
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "User not authenticated",
        });
    }
    const publicKey = process.env.VAPID_PUBLIC_KEY || null;
    const fcmAvailable = !!(process.env.FCM_PROJECT_ID || process.env.FCM_SERVICE_ACCOUNT_PATH);
    const webPushAvailable = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    if (!publicKey && !fcmAvailable) {
        return {
            publicKey: null,
            fcmAvailable: false,
            webPushAvailable: false,
            message: "Push notifications are not configured on this server",
        };
    }
    return {
        publicKey,
        fcmAvailable,
        webPushAvailable,
    };
};
