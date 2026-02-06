"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FCMProvider = void 0;
const admin = __importStar(require("firebase-admin"));
const BasePushProvider_1 = require("./BasePushProvider");
class FCMProvider extends BasePushProvider_1.BasePushProvider {
    constructor(config) {
        super("FCM", config);
        this.app = null;
        if (this.validateConfig()) {
            this.initializeApp();
        }
    }
    loadConfigFromEnv() {
        var _a;
        return {
            projectId: process.env.FCM_PROJECT_ID,
            clientEmail: process.env.FCM_CLIENT_EMAIL,
            privateKey: (_a = process.env.FCM_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, "\n"),
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
        return true;
    }
    initializeApp() {
        try {
            if (admin.apps.length > 0) {
                this.app = admin.apps[0];
                this.log("Using existing Firebase app");
                return;
            }
            if (this.config.serviceAccountPath) {
                const serviceAccount = require(this.config.serviceAccountPath);
                this.app = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
            }
            else {
                this.app = admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: this.config.projectId,
                        clientEmail: this.config.clientEmail,
                        privateKey: this.config.privateKey,
                    }),
                });
            }
            this.log("Firebase Admin SDK initialized successfully");
        }
        catch (error) {
            this.logError("Failed to initialize Firebase Admin SDK", error);
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
            const response = await admin.messaging().send({
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
            const response = await admin.messaging().sendEachForMulticast({
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
            const response = await admin
                .messaging()
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
            const response = await admin
                .messaging()
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
