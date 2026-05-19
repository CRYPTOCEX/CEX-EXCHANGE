"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const web_push_1 = __importDefault(require("web-push"));
const errors_1 = require("@b/utils/schema/errors");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Direct Push Test",
    description: "Send a push notification directly (for debugging)",
    operationId: "testDirectPush",
    tags: ["User", "Push", "Testing"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Direct push test result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            details: { type: "object" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
};
function parseSubscription(token) {
    try {
        const parsed = JSON.parse(token);
        if (parsed &&
            typeof parsed.endpoint === "string" &&
            parsed.endpoint.startsWith("https://") &&
            parsed.keys &&
            typeof parsed.keys.p256dh === "string" &&
            typeof parsed.keys.auth === "string") {
            return parsed;
        }
    }
    catch (_a) { }
    return null;
}
function getFirstSubscription(settings) {
    if (!settings)
        return null;
    if (settings.pushTokens) {
        if (typeof settings.pushTokens === "object" && !Array.isArray(settings.pushTokens)) {
            for (const [deviceId, value] of Object.entries(settings.pushTokens)) {
                if (typeof value === "string") {
                    const sub = parseSubscription(value);
                    if (sub)
                        return { ...sub, deviceId };
                }
                else if (value && typeof value === "object") {
                    const entry = value;
                    if (entry.token) {
                        const sub = parseSubscription(entry.token);
                        if (sub)
                            return { ...sub, deviceId };
                    }
                }
            }
        }
        else if (Array.isArray(settings.pushTokens)) {
            for (const entry of settings.pushTokens) {
                if (typeof entry === "string") {
                    const sub = parseSubscription(entry);
                    if (sub)
                        return sub;
                }
                else if (entry && typeof entry === "object" && entry.token) {
                    const sub = parseSubscription(entry.token);
                    if (sub)
                        return sub;
                }
            }
        }
    }
    return null;
}
exports.default = async (data) => {
    var _a;
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw new Error("User not authenticated");
    }
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || `mailto:${process.env.APP_NODEMAILER_SMTP_SENDER || "admin@example.com"}`;
    if (!vapidPublicKey || !vapidPrivateKey) {
        return {
            success: false,
            message: "VAPID keys not configured",
            details: {
                hasPublicKey: !!vapidPublicKey,
                hasPrivateKey: !!vapidPrivateKey,
            },
        };
    }
    const targetUser = await db_1.models.user.findByPk(user.id, {
        attributes: ["settings"],
    });
    const subscription = getFirstSubscription(targetUser === null || targetUser === void 0 ? void 0 : targetUser.settings);
    if (!subscription) {
        return {
            success: false,
            message: "No WebPush subscription found",
            details: {
                settingsKeys: Object.keys((targetUser === null || targetUser === void 0 ? void 0 : targetUser.settings) || {}),
            },
        };
    }
    console.log("[Direct Push] Subscription found:", {
        endpoint: (_a = subscription.endpoint) === null || _a === void 0 ? void 0 : _a.substring(0, 80),
        deviceId: subscription.deviceId,
        hasKeys: !!subscription.keys,
    });
    web_push_1.default.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const payload = JSON.stringify({
        title: "🔔 Direct Push Test",
        body: `Test at ${new Date().toLocaleTimeString()} - If you see this, push is working!`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        tag: "direct-test-" + Date.now(),
        renotify: true,
        data: {
            url: "/user/profile?tab=notifications",
            testMode: true,
            timestamp: Date.now(),
        },
    });
    const isFCM = subscription.endpoint.includes("fcm.googleapis.com");
    console.log("[Direct Push] Sending with:", {
        isFCM,
        payloadSize: payload.length,
        endpoint: subscription.endpoint.substring(0, 80),
    });
    try {
        const result = await web_push_1.default.sendNotification({
            endpoint: subscription.endpoint,
            keys: subscription.keys,
        }, payload, {
            TTL: 60,
            urgency: "high",
        });
        console.log("[Direct Push] Success:", {
            statusCode: result.statusCode,
            headers: result.headers,
        });
        return {
            success: true,
            message: "Push sent successfully! Check your device.",
            details: {
                statusCode: result.statusCode,
                isFCM,
                endpoint: subscription.endpoint.substring(0, 50) + "...",
                payloadSize: payload.length,
            },
        };
    }
    catch (error) {
        console.error("[Direct Push] Error:", error);
        if (error.statusCode === 410 || error.statusCode === 404) {
            return {
                success: false,
                message: "Subscription is expired or invalid. Please re-enable push notifications.",
                details: {
                    statusCode: error.statusCode,
                    shouldResubscribe: true,
                },
            };
        }
        return {
            success: false,
            message: error.message || "Failed to send push",
            details: {
                statusCode: error.statusCode,
                body: error.body,
                endpoint: subscription.endpoint.substring(0, 50) + "...",
            },
        };
    }
};
