"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
const errors_1 = require("@b/utils/schema/errors");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Test Push Notification",
    description: "Send a test push notification to verify your push subscription is working",
    operationId: "testUserPushNotification",
    tags: ["User", "Push", "Testing"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Test push notification result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            delivered: { type: "boolean" },
                            deviceCount: { type: "number" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
};
function isWebPushSubscription(token) {
    try {
        const parsed = JSON.parse(token);
        return (parsed &&
            typeof parsed.endpoint === "string" &&
            parsed.endpoint.startsWith("https://") &&
            parsed.keys &&
            typeof parsed.keys.p256dh === "string" &&
            typeof parsed.keys.auth === "string");
    }
    catch (_a) {
        return false;
    }
}
function getSubscriptionDetails(settings) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    let fcmCount = 0;
    let webpushCount = 0;
    const endpoints = [];
    if (!settings) {
        return { fcm: 0, webpush: 0, total: 0, endpoints: [] };
    }
    if (settings.pushTokens) {
        if (Array.isArray(settings.pushTokens)) {
            for (const entry of settings.pushTokens) {
                if (typeof entry === "string") {
                    if (isWebPushSubscription(entry)) {
                        webpushCount++;
                        try {
                            const parsed = JSON.parse(entry);
                            endpoints.push(((_a = parsed.endpoint) === null || _a === void 0 ? void 0 : _a.substring(0, 60)) + "...");
                        }
                        catch (_k) { }
                    }
                    else {
                        fcmCount++;
                        endpoints.push("FCM: " + entry.substring(0, 20) + "...");
                    }
                }
                else if (entry && typeof entry === "object") {
                    if (entry.type === "webpush") {
                        webpushCount++;
                        try {
                            const parsed = JSON.parse(entry.token);
                            endpoints.push(((_b = parsed.endpoint) === null || _b === void 0 ? void 0 : _b.substring(0, 60)) + "...");
                        }
                        catch (_l) {
                            endpoints.push("WebPush: invalid format");
                        }
                    }
                    else if (entry.type === "fcm") {
                        fcmCount++;
                        endpoints.push("FCM: " + (((_c = entry.token) === null || _c === void 0 ? void 0 : _c.substring(0, 20)) || "unknown") + "...");
                    }
                    else if (entry.token) {
                        if (isWebPushSubscription(entry.token)) {
                            webpushCount++;
                            try {
                                const parsed = JSON.parse(entry.token);
                                endpoints.push(((_d = parsed.endpoint) === null || _d === void 0 ? void 0 : _d.substring(0, 60)) + "...");
                            }
                            catch (_m) { }
                        }
                        else {
                            fcmCount++;
                            endpoints.push("FCM: " + entry.token.substring(0, 20) + "...");
                        }
                    }
                }
            }
        }
        else if (typeof settings.pushTokens === "object") {
            for (const [deviceId, value] of Object.entries(settings.pushTokens)) {
                if (typeof value === "string") {
                    if (isWebPushSubscription(value)) {
                        webpushCount++;
                        try {
                            const parsed = JSON.parse(value);
                            endpoints.push(`[${deviceId}] ${(_e = parsed.endpoint) === null || _e === void 0 ? void 0 : _e.substring(0, 50)}...`);
                        }
                        catch (_o) { }
                    }
                    else {
                        fcmCount++;
                        endpoints.push(`[${deviceId}] FCM: ${value.substring(0, 20)}...`);
                    }
                }
                else if (value && typeof value === "object") {
                    const entry = value;
                    if (entry.type === "webpush") {
                        webpushCount++;
                        try {
                            const parsed = JSON.parse(entry.token);
                            endpoints.push(`[${deviceId}] ${(_f = parsed.endpoint) === null || _f === void 0 ? void 0 : _f.substring(0, 50)}...`);
                        }
                        catch (_p) {
                            endpoints.push(`[${deviceId}] WebPush: invalid`);
                        }
                    }
                    else if (entry.type === "fcm") {
                        fcmCount++;
                        endpoints.push(`[${deviceId}] FCM: ${(_g = entry.token) === null || _g === void 0 ? void 0 : _g.substring(0, 20)}...`);
                    }
                    else if (entry.token) {
                        if (isWebPushSubscription(entry.token)) {
                            webpushCount++;
                            try {
                                const parsed = JSON.parse(entry.token);
                                endpoints.push(`[${deviceId}] ${(_h = parsed.endpoint) === null || _h === void 0 ? void 0 : _h.substring(0, 50)}...`);
                            }
                            catch (_q) { }
                        }
                        else {
                            fcmCount++;
                            endpoints.push(`[${deviceId}] FCM: ${entry.token.substring(0, 20)}...`);
                        }
                    }
                }
            }
        }
    }
    if (settings.webPushSubscriptions && Array.isArray(settings.webPushSubscriptions)) {
        for (const sub of settings.webPushSubscriptions) {
            webpushCount++;
            const subObj = typeof sub === "string" ? JSON.parse(sub) : sub;
            endpoints.push(`[legacy] ${(_j = subObj.endpoint) === null || _j === void 0 ? void 0 : _j.substring(0, 50)}...`);
        }
    }
    return { fcm: fcmCount, webpush: webpushCount, total: fcmCount + webpushCount, endpoints };
}
exports.default = async (data) => {
    var _a;
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw new Error("User not authenticated");
    }
    try {
        const pushChannel = notification_1.notificationService.getChannel("PUSH") || new notification_1.PushChannel();
        const webPushAvailable = pushChannel.hasWebPushProvider();
        const fcmAvailable = pushChannel.hasFCMProvider();
        if (!webPushAvailable && !fcmAvailable) {
            return {
                success: false,
                message: "Push notifications are not configured on this server.",
                delivered: false,
            };
        }
        const targetUser = await db_1.models.user.findByPk(user.id, {
            attributes: ["settings"],
        });
        const userSettings = (targetUser === null || targetUser === void 0 ? void 0 : targetUser.settings) || {};
        const subscriptionDetails = getSubscriptionDetails(userSettings);
        if (subscriptionDetails.total === 0) {
            return {
                success: false,
                message: "No push subscription found. Please enable push notifications first.",
                delivered: false,
                deviceCount: 0,
            };
        }
        if (subscriptionDetails.webpush > 0 && !webPushAvailable) {
            return {
                success: false,
                message: "Web Push (VAPID) is not configured but you have web push subscriptions.",
                delivered: false,
            };
        }
        if (subscriptionDetails.fcm > 0 && !fcmAvailable) {
            return {
                success: false,
                message: "FCM is not configured but you have FCM tokens.",
                delivered: false,
            };
        }
        const result = await notification_1.notificationService.send({
            userId: user.id,
            type: "SYSTEM",
            channels: ["PUSH"],
            data: {
                title: "Test Notification",
                message: `Push notifications are working! Sent to ${subscriptionDetails.total} device(s).`,
                testMode: true,
                timestamp: new Date().toISOString(),
                badge: 1,
                link: "/user/profile?tab=notifications",
            },
            priority: "HIGH",
            idempotencyKey: `user-test-push-${user.id}-${Date.now()}`,
        });
        const pushDelivered = result.channelsDelivered.includes("PUSH");
        const pushFailed = result.channelsFailed.includes("PUSH");
        if (pushFailed) {
            const errorMessage = ((_a = result.errors) === null || _a === void 0 ? void 0 : _a.PUSH) || "Failed to deliver push notification";
            return {
                success: false,
                message: errorMessage,
                delivered: false,
                deviceCount: subscriptionDetails.total,
            };
        }
        return {
            success: true,
            message: pushDelivered
                ? `Test notification sent to ${subscriptionDetails.total} device(s)!`
                : "Notification queued for delivery.",
            delivered: pushDelivered,
            deviceCount: subscriptionDetails.total,
        };
    }
    catch (error) {
        console.error("[Push Test] Error:", error);
        throw error;
    }
};
