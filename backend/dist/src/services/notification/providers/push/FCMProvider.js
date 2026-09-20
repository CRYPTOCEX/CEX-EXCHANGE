"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FCMProvider = void 0;
exports.normalizePrivateKey = normalizePrivateKey;
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
const BasePushProvider_1 = require("./BasePushProvider");
function normalizePrivateKey(raw) {
    if (!raw)
        return undefined;
    let key = raw.trim();
    if ((key.startsWith('"') && key.endsWith('"')) ||
        (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1).trim();
    }
    key = key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r/g, "");
    if (!key.includes("-----BEGIN")) {
        try {
            const decoded = Buffer.from(key, "base64").toString("utf8");
            if (decoded.includes("-----BEGIN")) {
                key = decoded.replace(/\r/g, "").trim();
            }
        }
        catch (_a) {
        }
    }
    return key.endsWith("\n") ? key : `${key}\n`;
}
class FCMProvider extends BasePushProvider_1.BasePushProvider {
    constructor(config) {
        super("FCM", config);
        this.app = null;
        if (this.validateConfig()) {
            this.initializeApp();
        }
    }
    loadConfigFromEnv() {
        return {
            projectId: process.env.FCM_PROJECT_ID,
            clientEmail: process.env.FCM_CLIENT_EMAIL,
            privateKey: normalizePrivateKey(process.env.FCM_PRIVATE_KEY),
            serviceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH,
        };
    }
    validateConfig() {
        if (this.config.serviceAccountPath) {
            return true;
        }
        if (!this.config.projectId) {
            this.logError("Missing FCM_PROJECT_ID", {});
            return false;
        }
        if (!this.config.clientEmail) {
            this.logError("Missing FCM_CLIENT_EMAIL", {});
            return false;
        }
        if (!this.config.privateKey) {
            this.logError("Missing FCM_PRIVATE_KEY", {});
            return false;
        }
        const placeholder = this.placeholderField();
        if (placeholder) {
            this.logError(`${placeholder} still holds the example value shipped in .env.example — FCM disabled. ` +
                `Fill in real Firebase service-account credentials, or clear FCM_PROJECT_ID to turn FCM off.`, {});
            return false;
        }
        return true;
    }
    placeholderField() {
        const PLACEHOLDER = /your[-_ ]?(project|private|client|key)|changeme|placeholder|^<.*>$/i;
        if (PLACEHOLDER.test(this.config.projectId || ""))
            return "FCM_PROJECT_ID";
        if (PLACEHOLDER.test(this.config.clientEmail || ""))
            return "FCM_CLIENT_EMAIL";
        const body = String(this.config.privateKey || "")
            .replace(/-----(BEGIN|END)[^-]*-----/g, "")
            .replace(/\s+/g, "");
        if (body.length < 200 || !/^[A-Za-z0-9+/=]+$/.test(body))
            return "FCM_PRIVATE_KEY";
        return null;
    }
    isReady() {
        return this.app !== null;
    }
    initializeApp() {
        try {
            const existing = (0, app_1.getApps)();
            if (existing.length > 0) {
                this.app = existing[0];
                this.log("Using existing Firebase app");
                return;
            }
            if (this.config.serviceAccountPath) {
                const serviceAccount = require(this.config.serviceAccountPath);
                this.app = (0, app_1.initializeApp)({
                    credential: (0, app_1.cert)({
                        ...serviceAccount,
                        private_key: normalizePrivateKey(serviceAccount.private_key),
                    }),
                });
            }
            else {
                this.app = (0, app_1.initializeApp)({
                    credential: (0, app_1.cert)({
                        projectId: this.config.projectId,
                        clientEmail: this.config.clientEmail,
                        privateKey: this.config.privateKey,
                    }),
                });
            }
            this.log("Firebase Admin SDK initialized successfully");
        }
        catch (error) {
            if (String(error === null || error === void 0 ? void 0 : error.message).includes("DECODER routines")) {
                this.logError("Failed to initialize Firebase Admin SDK: FCM_PRIVATE_KEY is not a readable PEM. " +
                    "Expected the full service-account key including the -----BEGIN PRIVATE KEY----- armour " +
                    "(newlines may be written as \\n).", error);
            }
            else {
                this.logError("Failed to initialize Firebase Admin SDK", error);
            }
            this.app = null;
        }
    }
    async send(data, platformOptions) {
        try {
            if (!this.validateConfig() || !this.app) {
                throw new Error("FCM configuration is invalid or app not initialized");
            }
            const validTokens = this.filterValidTokens(data.tokens);
            if (validTokens.length === 0) {
                return {
                    success: false,
                    error: "No valid device tokens provided",
                };
            }
            const message = this.buildFCMMessage(data, platformOptions);
            if (validTokens.length === 1) {
                return await this.sendToDevice(validTokens[0], message);
            }
            else {
                return await this.sendMulticast(validTokens, data, platformOptions);
            }
        }
        catch (error) {
            this.logError("Failed to send push notification", error);
            return {
                success: false,
                error: error.message || "Failed to send push notification via FCM",
            };
        }
    }
    async sendToDevice(token, message) {
        try {
            if (!this.app) {
                throw new Error("Firebase app not initialized");
            }
            const response = await (0, messaging_1.getMessaging)(this.app).send({
                token,
                ...message,
            });
            this.log("Push notification sent successfully", {
                token: token.substring(0, 20) + "...",
                messageId: response,
            });
            return {
                success: true,
                messageId: `fcm-${response}`,
                externalId: response,
            };
        }
        catch (error) {
            if (error.code === "messaging/invalid-registration-token" ||
                error.code === "messaging/registration-token-not-registered") {
                this.log("Invalid or unregistered token", { token });
                return {
                    success: false,
                    error: "Invalid device token",
                    metadata: {
                        invalidToken: token,
                        invalidTokens: [token],
                        shouldRemove: true,
                    },
                };
            }
            throw error;
        }
    }
    async sendMulticast(tokens, data, platformOptions) {
        try {
            if (!this.app) {
                throw new Error("Firebase app not initialized");
            }
            const message = this.buildFCMMessage(data, platformOptions);
            const response = await (0, messaging_1.getMessaging)(this.app).sendEachForMulticast({
                tokens,
                ...message,
            });
            this.log("Multicast push notification sent", {
                totalTokens: tokens.length,
                successCount: response.successCount,
                failureCount: response.failureCount,
            });
            const invalidTokens = [];
            response.responses.forEach((resp, index) => {
                var _a, _b;
                if (!resp.success &&
                    (((_a = resp.error) === null || _a === void 0 ? void 0 : _a.code) === "messaging/invalid-registration-token" ||
                        ((_b = resp.error) === null || _b === void 0 ? void 0 : _b.code) === "messaging/registration-token-not-registered")) {
                    invalidTokens.push(tokens[index]);
                }
            });
            return {
                success: response.successCount > 0,
                messageId: `fcm-multicast-${Date.now()}`,
                metadata: {
                    totalSent: tokens.length,
                    successCount: response.successCount,
                    failureCount: response.failureCount,
                    invalidTokens,
                },
            };
        }
        catch (error) {
            this.logError("Failed to send multicast push notification", error);
            throw error;
        }
    }
    buildFCMMessage(data, platformOptions) {
        const message = {
            notification: {
                title: this.truncateText(data.title, 65),
                body: this.truncateText(data.body, 240),
            },
        };
        if (data.imageUrl) {
            message.notification.imageUrl = data.imageUrl;
        }
        if (data.data) {
            message.data = data.data;
        }
        if (platformOptions === null || platformOptions === void 0 ? void 0 : platformOptions.android) {
            message.android = {
                priority: data.priority === "high" ? "high" : "normal",
                notification: {
                    channelId: platformOptions.android.channelId || "default-channel",
                    color: platformOptions.android.color,
                    icon: data.icon,
                    imageUrl: data.imageUrl,
                    sound: data.sound || "default",
                    tag: data.tag,
                },
                ttl: data.ttl ? data.ttl * 1000 : undefined,
            };
        }
        if (platformOptions === null || platformOptions === void 0 ? void 0 : platformOptions.ios) {
            message.apns = {
                headers: {
                    "apns-priority": data.priority === "high" ? "10" : "5",
                },
                payload: {
                    aps: {
                        alert: {
                            title: message.notification.title,
                            body: message.notification.body,
                        },
                        badge: platformOptions.ios.badge,
                        sound: platformOptions.ios.sound || "default",
                        contentAvailable: platformOptions.ios.contentAvailable ? 1 : 0,
                        mutableContent: platformOptions.ios.mutableContent ? 1 : 0,
                    },
                },
            };
            if (data.imageUrl) {
                message.apns.fcmOptions = {
                    imageUrl: data.imageUrl,
                };
            }
        }
        if (platformOptions === null || platformOptions === void 0 ? void 0 : platformOptions.web) {
            message.webpush = {
                notification: {
                    title: message.notification.title,
                    body: message.notification.body,
                    icon: platformOptions.web.icon || data.icon,
                    badge: platformOptions.web.badge,
                    vibrate: platformOptions.web.vibrate,
                    requireInteraction: data.priority === "high",
                },
                fcmOptions: {
                    link: data.clickAction,
                },
            };
        }
        return message;
    }
    validateToken(token) {
        if (!token || token.length < 100 || token.length > 200) {
            return false;
        }
        const tokenRegex = /^[a-zA-Z0-9_-]+$/;
        return tokenRegex.test(token);
    }
    async subscribeToTopic(tokens, topic) {
        try {
            if (!this.app) {
                throw new Error("Firebase app not initialized");
            }
            const response = await (0, messaging_1.getMessaging)(this.app)
                .subscribeToTopic(tokens, topic);
            this.log("Tokens subscribed to topic", {
                topic,
                successCount: response.successCount,
                failureCount: response.failureCount,
            });
            return {
                success: response.successCount > 0,
                metadata: {
                    topic,
                    successCount: response.successCount,
                    failureCount: response.failureCount,
                },
            };
        }
        catch (error) {
            this.logError("Failed to subscribe to topic", error);
            throw error;
        }
    }
    async unsubscribeFromTopic(tokens, topic) {
        try {
            if (!this.app) {
                throw new Error("Firebase app not initialized");
            }
            const response = await (0, messaging_1.getMessaging)(this.app)
                .unsubscribeFromTopic(tokens, topic);
            this.log("Tokens unsubscribed from topic", {
                topic,
                successCount: response.successCount,
                failureCount: response.failureCount,
            });
            return {
                success: response.successCount > 0,
                metadata: {
                    topic,
                    successCount: response.successCount,
                    failureCount: response.failureCount,
                },
            };
        }
        catch (error) {
            this.logError("Failed to unsubscribe from topic", error);
            throw error;
        }
    }
}
exports.FCMProvider = FCMProvider;
