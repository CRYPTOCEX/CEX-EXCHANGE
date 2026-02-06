"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushChannel = void 0;
const BaseChannel_1 = require("./BaseChannel");
const FCMProvider_1 = require("../providers/push/FCMProvider");
const WebPushProvider_1 = require("../providers/push/WebPushProvider");
const db_1 = require("@b/db");
class PushChannel extends BaseChannel_1.BaseChannel {
    constructor() {
        super("PUSH");
        this.fcmProvider = null;
        this.webPushProvider = null;
        this.hasFCM = false;
        this.hasWebPush = false;
        this.initializeProviders();
    }
    initializeProviders() {
        const hasFCMConfig = !!(process.env.FCM_PROJECT_ID ||
            process.env.FCM_SERVICE_ACCOUNT_PATH);
        if (hasFCMConfig) {
            try {
                this.fcmProvider = new FCMProvider_1.FCMProvider();
                if (this.fcmProvider.validateConfig()) {
                    this.hasFCM = true;
                }
            }
            catch (error) {
                this.logError("Failed to initialize FCM provider", error);
            }
        }
        const hasVAPIDConfig = !!(process.env.VAPID_PUBLIC_KEY &&
            process.env.VAPID_PRIVATE_KEY);
        if (hasVAPIDConfig) {
            try {
                this.webPushProvider = new WebPushProvider_1.WebPushProvider();
                if (this.webPushProvider.validateConfig()) {
                    this.hasWebPush = true;
                }
            }
            catch (error) {
                this.logError("Failed to initialize WebPush provider", error);
            }
        }
    }
    async send(operation, transaction) {
        var _a, _b, _c, _d;
        try {
            const user = await db_1.models.user.findByPk(operation.userId, {
                attributes: ["settings"],
                transaction,
            });
            if (!user || !user.settings) {
                return {
                    success: false,
                    error: "User not found",
                };
            }
            const { fcmTokens, webPushTokens } = this.categorizeTokens(user.settings);
            if (fcmTokens.length === 0 && webPushTokens.length === 0) {
                return {
                    success: false,
                    error: "No push notification tokens found for user",
                };
            }
            const pushData = this.preparePushData(operation);
            const platformOptions = this.preparePlatformOptions(operation);
            const results = [];
            const invalidTokens = [];
            if (this.hasFCM && this.fcmProvider && fcmTokens.length > 0) {
                pushData.tokens = fcmTokens;
                const fcmResult = await this.fcmProvider.send(pushData, platformOptions);
                results.push(fcmResult);
                if (((_b = (_a = fcmResult.metadata) === null || _a === void 0 ? void 0 : _a.invalidTokens) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                    invalidTokens.push(...fcmResult.metadata.invalidTokens);
                }
            }
            if (this.hasWebPush && this.webPushProvider && webPushTokens.length > 0) {
                pushData.tokens = webPushTokens;
                const webPushResult = await this.webPushProvider.send(pushData, platformOptions);
                results.push(webPushResult);
                if (((_d = (_c = webPushResult.metadata) === null || _c === void 0 ? void 0 : _c.invalidSubscriptions) === null || _d === void 0 ? void 0 : _d.length) > 0) {
                    invalidTokens.push(...webPushResult.metadata.invalidSubscriptions);
                }
            }
            if (invalidTokens.length > 0) {
                await this.removeInvalidTokens(operation.userId, invalidTokens, transaction);
            }
            const successCount = results.filter((r) => r.success).length;
            const totalSuccess = results.reduce((sum, r) => { var _a; return sum + (((_a = r.metadata) === null || _a === void 0 ? void 0 : _a.successCount) || (r.success ? 1 : 0)); }, 0);
            if (successCount === 0) {
                return {
                    success: false,
                    error: results.map((r) => r.error).filter(Boolean).join("; "),
                };
            }
            return {
                success: true,
                messageId: `push-${Date.now()}`,
                metadata: {
                    fcmTokens: fcmTokens.length,
                    webPushTokens: webPushTokens.length,
                    totalSuccess,
                    results,
                },
            };
        }
        catch (error) {
            this.logError("Failed to send push notification", error);
            return {
                success: false,
                error: error.message || "Failed to send push notification",
            };
        }
    }
    categorizeTokens(settings) {
        const fcmTokens = [];
        const webPushTokens = [];
        if (!settings) {
            return { fcmTokens, webPushTokens };
        }
        if (settings.pushTokens) {
            if (Array.isArray(settings.pushTokens)) {
                for (const entry of settings.pushTokens) {
                    if (typeof entry === "string") {
                        if (this.isWebPushSubscription(entry)) {
                            webPushTokens.push(entry);
                        }
                        else {
                            fcmTokens.push(entry);
                        }
                    }
                    else if (entry && typeof entry === "object") {
                        if (entry.type === "webpush" && entry.token) {
                            webPushTokens.push(entry.token);
                        }
                        else if (entry.type === "fcm" && entry.token) {
                            fcmTokens.push(entry.token);
                        }
                        else if (entry.token) {
                            if (this.isWebPushSubscription(entry.token)) {
                                webPushTokens.push(entry.token);
                            }
                            else {
                                fcmTokens.push(entry.token);
                            }
                        }
                    }
                }
            }
            else if (typeof settings.pushTokens === "object") {
                for (const [deviceId, value] of Object.entries(settings.pushTokens)) {
                    if (typeof value === "string") {
                        if (this.isWebPushSubscription(value)) {
                            webPushTokens.push(value);
                        }
                        else {
                            fcmTokens.push(value);
                        }
                    }
                    else if (value && typeof value === "object") {
                        const entry = value;
                        if (entry.type === "webpush" && entry.token) {
                            webPushTokens.push(entry.token);
                        }
                        else if (entry.type === "fcm" && entry.token) {
                            fcmTokens.push(entry.token);
                        }
                        else if (entry.token) {
                            if (this.isWebPushSubscription(entry.token)) {
                                webPushTokens.push(entry.token);
                            }
                            else {
                                fcmTokens.push(entry.token);
                            }
                        }
                    }
                }
            }
        }
        if (settings.webPushSubscriptions) {
            if (Array.isArray(settings.webPushSubscriptions)) {
                for (const sub of settings.webPushSubscriptions) {
                    const subStr = typeof sub === "string" ? sub : JSON.stringify(sub);
                    if (!webPushTokens.includes(subStr)) {
                        webPushTokens.push(subStr);
                    }
                }
            }
        }
        return { fcmTokens, webPushTokens };
    }
    isWebPushSubscription(token) {
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
    preparePushData(operation) {
        const data = operation.data || {};
        return {
            tokens: [],
            title: data.title || "Notification",
            body: data.pushMessage || data.message || "You have a new notification",
            data: {
                type: operation.type,
                notificationId: data.relatedId || "",
                link: data.link || "",
                ...data.pushData,
            },
            imageUrl: data.imageUrl || data.pushImageUrl,
            icon: data.icon || data.pushIcon,
            badge: data.badge,
            sound: data.sound || "default",
            clickAction: data.link || data.clickAction,
            tag: data.tag || operation.type,
            priority: this.mapPriority(operation.priority),
        };
    }
    preparePlatformOptions(operation) {
        const data = operation.data || {};
        return {
            android: {
                channelId: data.androidChannelId || "default-channel",
                color: data.androidColor || "#1976D2",
                vibrate: data.vibrate !== false,
                lights: data.lights !== false,
            },
            ios: {
                badge: data.badge,
                sound: data.sound || "default",
                contentAvailable: data.contentAvailable || false,
                mutableContent: data.mutableContent || false,
            },
            web: {
                icon: data.icon || "/img/logo/android-chrome-192x192.png",
                badge: data.webBadge || "/img/logo/android-icon-96x96.png",
                vibrate: data.vibrate !== false ? [200, 100, 200] : undefined,
            },
        };
    }
    mapPriority(priority) {
        return priority === "HIGH" || priority === "URGENT" ? "high" : "normal";
    }
    async removeInvalidTokens(userId, invalidTokens, transaction) {
        try {
            const user = await db_1.models.user.findByPk(userId, { transaction });
            if (!user || !user.settings) {
                return;
            }
            let updated = false;
            const settings = { ...user.settings };
            if (settings.pushTokens) {
                if (Array.isArray(settings.pushTokens)) {
                    const originalLength = settings.pushTokens.length;
                    settings.pushTokens = settings.pushTokens.filter((entry) => {
                        const token = typeof entry === "string" ? entry : entry === null || entry === void 0 ? void 0 : entry.token;
                        return !invalidTokens.some((invalid) => (token === null || token === void 0 ? void 0 : token.includes(invalid)) || (invalid === null || invalid === void 0 ? void 0 : invalid.includes(token)));
                    });
                    if (settings.pushTokens.length !== originalLength) {
                        updated = true;
                    }
                }
                else if (typeof settings.pushTokens === "object") {
                    for (const [key, value] of Object.entries(settings.pushTokens)) {
                        const token = typeof value === "string" ? value : value === null || value === void 0 ? void 0 : value.token;
                        if (invalidTokens.some((invalid) => (token === null || token === void 0 ? void 0 : token.includes(invalid)) || (invalid === null || invalid === void 0 ? void 0 : invalid.includes(token)))) {
                            delete settings.pushTokens[key];
                            updated = true;
                        }
                    }
                }
            }
            if (settings.webPushSubscriptions && Array.isArray(settings.webPushSubscriptions)) {
                const originalLength = settings.webPushSubscriptions.length;
                settings.webPushSubscriptions = settings.webPushSubscriptions.filter((sub) => {
                    const subStr = typeof sub === "string" ? sub : JSON.stringify(sub);
                    return !invalidTokens.some((invalid) => subStr.includes(invalid));
                });
                if (settings.webPushSubscriptions.length !== originalLength) {
                    updated = true;
                }
            }
            if (updated) {
                await user.update({ settings }, { transaction });
                this.log("Removed invalid push tokens", {
                    userId,
                    removedCount: invalidTokens.length,
                });
            }
        }
        catch (error) {
            this.logError("Failed to remove invalid tokens", error);
        }
    }
    validateConfig() {
        return this.hasFCM || this.hasWebPush;
    }
    hasFCMProvider() {
        return this.hasFCM;
    }
    hasWebPushProvider() {
        return this.hasWebPush;
    }
    getVapidPublicKey() {
        var _a;
        return ((_a = this.webPushProvider) === null || _a === void 0 ? void 0 : _a.getPublicKey()) || null;
    }
    async addDeviceToken(userId, token, type = "fcm", deviceId, platform) {
        try {
            const user = await db_1.models.user.findByPk(userId);
            if (!user) {
                return false;
            }
            const settings = { ...(user.settings || {}) };
            if (!settings.pushTokens) {
                settings.pushTokens = {};
            }
            const id = deviceId || `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const entry = {
                type,
                token,
                deviceId: id,
                platform,
                createdAt: new Date(),
            };
            if (typeof settings.pushTokens === "object" && !Array.isArray(settings.pushTokens)) {
                for (const [key, value] of Object.entries(settings.pushTokens)) {
                    const existingToken = typeof value === "string" ? value : value === null || value === void 0 ? void 0 : value.token;
                    if (existingToken === token) {
                        return true;
                    }
                }
                settings.pushTokens[id] = entry;
            }
            else {
                const newTokens = {};
                if (Array.isArray(settings.pushTokens)) {
                    settings.pushTokens.forEach((t, i) => {
                        if (typeof t === "string") {
                            newTokens[`legacy-${i}`] = {
                                type: this.isWebPushSubscription(t) ? "webpush" : "fcm",
                                token: t,
                            };
                        }
                        else {
                            newTokens[t.deviceId || `legacy-${i}`] = t;
                        }
                    });
                }
                newTokens[id] = entry;
                settings.pushTokens = newTokens;
            }
            await user.update({ settings });
            return true;
        }
        catch (error) {
            this.logError("Failed to add device token", error);
            return false;
        }
    }
    async addWebPushSubscription(userId, subscription, deviceId) {
        return this.addDeviceToken(userId, JSON.stringify(subscription), "webpush", deviceId, "web");
    }
    async removeDeviceToken(userId, tokenOrDeviceId) {
        try {
            const user = await db_1.models.user.findByPk(userId);
            if (!user || !user.settings || !user.settings.pushTokens) {
                return false;
            }
            const settings = { ...user.settings };
            let updated = false;
            if (typeof settings.pushTokens === "object" && !Array.isArray(settings.pushTokens)) {
                if (settings.pushTokens[tokenOrDeviceId]) {
                    delete settings.pushTokens[tokenOrDeviceId];
                    updated = true;
                }
                else {
                    for (const [key, value] of Object.entries(settings.pushTokens)) {
                        const token = typeof value === "string" ? value : value === null || value === void 0 ? void 0 : value.token;
                        if (token === tokenOrDeviceId || (token === null || token === void 0 ? void 0 : token.includes(tokenOrDeviceId))) {
                            delete settings.pushTokens[key];
                            updated = true;
                            break;
                        }
                    }
                }
            }
            else if (Array.isArray(settings.pushTokens)) {
                const originalLength = settings.pushTokens.length;
                settings.pushTokens = settings.pushTokens.filter((entry) => {
                    const token = typeof entry === "string" ? entry : entry === null || entry === void 0 ? void 0 : entry.token;
                    return token !== tokenOrDeviceId && !(token === null || token === void 0 ? void 0 : token.includes(tokenOrDeviceId));
                });
                updated = settings.pushTokens.length !== originalLength;
            }
            if (updated) {
                await user.update({ settings });
                this.log("Removed device token", { userId, tokenOrDeviceId });
                return true;
            }
            return false;
        }
        catch (error) {
            this.logError("Failed to remove device token", error);
            return false;
        }
    }
}
exports.PushChannel = PushChannel;
