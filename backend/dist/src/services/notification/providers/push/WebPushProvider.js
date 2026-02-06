"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebPushProvider = void 0;
const web_push_1 = __importDefault(require("web-push"));
const BasePushProvider_1 = require("./BasePushProvider");
class WebPushProvider extends BasePushProvider_1.BasePushProvider {
    constructor(config) {
        super("WebPush", config);
        this.isInitialized = false;
        if (this.validateConfig()) {
            this.initializeVapid();
        }
    }
    loadConfigFromEnv() {
        return {
            publicKey: process.env.VAPID_PUBLIC_KEY,
            privateKey: process.env.VAPID_PRIVATE_KEY,
            subject: process.env.VAPID_SUBJECT || `mailto:${process.env.APP_NODEMAILER_SMTP_SENDER || "admin@example.com"}`,
        };
    }
    validateConfig() {
        if (!this.config.publicKey) {
            this.logError("Missing VAPID_PUBLIC_KEY", {});
            return false;
        }
        if (!this.config.privateKey) {
            this.logError("Missing VAPID_PRIVATE_KEY", {});
            return false;
        }
        if (!this.config.subject) {
            this.logError("Missing VAPID_SUBJECT", {});
            return false;
        }
        return true;
    }
    initializeVapid() {
        try {
            web_push_1.default.setVapidDetails(this.config.subject, this.config.publicKey, this.config.privateKey);
            this.isInitialized = true;
        }
        catch (error) {
            this.logError("Failed to initialize VAPID", error);
            throw error;
        }
    }
    async send(data, platformOptions) {
        try {
            if (!this.validateConfig() || !this.isInitialized) {
                throw new Error("WebPush VAPID configuration is invalid or not initialized");
            }
            const validSubscriptions = this.parseSubscriptions(data.tokens);
            if (validSubscriptions.length === 0) {
                return {
                    success: false,
                    error: "No valid web push subscriptions provided",
                };
            }
            const payload = this.buildWebPushPayload(data, platformOptions);
            return await this.sendMulticastInternal(validSubscriptions, payload, data);
        }
        catch (error) {
            this.logError("Failed to send web push notification", error);
            return {
                success: false,
                error: error.message || "Failed to send web push notification",
            };
        }
    }
    async sendToSubscription(subscription, payload, data) {
        try {
            const options = {
                TTL: data.ttl || (data.priority === "high" ? 300 : 86400),
                urgency: "high",
                headers: {},
            };
            const result = await web_push_1.default.sendNotification(subscription, payload, options);
            return {
                success: true,
                messageId: `webpush-${Date.now()}`,
                metadata: {
                    statusCode: result.statusCode,
                },
            };
        }
        catch (error) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                return {
                    success: false,
                    error: "Subscription expired",
                    metadata: {
                        invalidSubscription: subscription.endpoint,
                        shouldRemove: true,
                        statusCode: error.statusCode,
                    },
                };
            }
            throw error;
        }
    }
    async sendMulticast(tokens, data, platformOptions) {
        const validSubscriptions = this.parseSubscriptions(tokens);
        const payload = this.buildWebPushPayload(data, platformOptions);
        return this.sendMulticastInternal(validSubscriptions, payload, data);
    }
    async sendMulticastInternal(subscriptions, payload, data) {
        const results = await Promise.allSettled(subscriptions.map((sub) => this.sendToSubscription(sub, payload, data)));
        let successCount = 0;
        let failureCount = 0;
        const invalidSubscriptions = [];
        results.forEach((result, index) => {
            var _a;
            if (result.status === "fulfilled" && result.value.success) {
                successCount++;
            }
            else {
                failureCount++;
                if (result.status === "fulfilled" &&
                    ((_a = result.value.metadata) === null || _a === void 0 ? void 0 : _a.shouldRemove)) {
                    invalidSubscriptions.push(subscriptions[index].endpoint);
                }
            }
        });
        return {
            success: successCount > 0,
            messageId: `webpush-multicast-${Date.now()}`,
            metadata: {
                totalSent: subscriptions.length,
                successCount,
                failureCount,
                invalidSubscriptions,
            },
        };
    }
    buildWebPushPayload(data, platformOptions) {
        var _a, _b, _c;
        const notification = {
            title: this.truncateText(data.title, 65),
            body: this.truncateText(data.body, 240),
            icon: ((_a = platformOptions === null || platformOptions === void 0 ? void 0 : platformOptions.web) === null || _a === void 0 ? void 0 : _a.icon) || data.icon || "/img/logo/android-chrome-192x192.png",
            badge: ((_b = platformOptions === null || platformOptions === void 0 ? void 0 : platformOptions.web) === null || _b === void 0 ? void 0 : _b.badge) || "/img/logo/android-icon-96x96.png",
            tag: data.tag,
            data: {
                ...data.data,
                url: data.clickAction,
            },
            requireInteraction: data.priority === "high",
            silent: false,
        };
        if (data.imageUrl) {
            notification.image = data.imageUrl;
        }
        if ((_c = platformOptions === null || platformOptions === void 0 ? void 0 : platformOptions.web) === null || _c === void 0 ? void 0 : _c.vibrate) {
            notification.vibrate = platformOptions.web.vibrate;
        }
        notification.actions = [
            {
                action: "open",
                title: "Open",
            },
            {
                action: "dismiss",
                title: "Dismiss",
            },
        ];
        return JSON.stringify(notification);
    }
    parseSubscriptions(tokens) {
        const subscriptions = [];
        for (const token of tokens) {
            try {
                const parsed = JSON.parse(token);
                if (this.isValidSubscription(parsed)) {
                    subscriptions.push(parsed);
                }
            }
            catch (_a) {
            }
        }
        return subscriptions;
    }
    isValidSubscription(obj) {
        return (obj &&
            typeof obj.endpoint === "string" &&
            obj.endpoint.startsWith("https://") &&
            obj.keys &&
            typeof obj.keys.p256dh === "string" &&
            typeof obj.keys.auth === "string");
    }
    validateToken(token) {
        try {
            const parsed = JSON.parse(token);
            return this.isValidSubscription(parsed);
        }
        catch (_a) {
            return false;
        }
    }
    static generateVapidKeys() {
        const keys = web_push_1.default.generateVAPIDKeys();
        return {
            publicKey: keys.publicKey,
            privateKey: keys.privateKey,
        };
    }
    getPublicKey() {
        return this.config.publicKey || null;
    }
}
exports.WebPushProvider = WebPushProvider;
