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
exports.metadata = void 0;
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get Notification Settings",
    description: "Retrieve current notification service configuration",
    operationId: "getNotificationSettings",
    tags: ["Admin", "Notification", "Settings"],
    requiresAuth: true,
    permission: "access.notification.settings",
    responses: {
        200: {
            description: "Settings retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            channels: { type: "object" },
                            providers: { type: "object" },
                            features: { type: "object" },
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
    var _a, _b, _c;
    const { ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching notification settings");
        const { notificationService } = await Promise.resolve().then(() => __importStar(require("@b/services/notification")));
        const registeredChannels = notificationService.getRegisteredChannels();
        const hasVapid = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
        const hasFcm = !!(process.env.FCM_PROJECT_ID);
        let pushProvider = "none";
        if (hasVapid) {
            pushProvider = "vapid (Web Push)";
        }
        else if (hasFcm) {
            pushProvider = "fcm (Firebase)";
        }
        const settings = {
            channels: {
                inApp: {
                    enabled: registeredChannels.includes("IN_APP"),
                    description: "In-app notifications via WebSocket",
                },
                email: {
                    enabled: registeredChannels.includes("EMAIL"),
                    provider: process.env.EMAIL_PROVIDER || "nodemailer",
                    from: process.env.EMAIL_FROM,
                },
                sms: {
                    enabled: registeredChannels.includes("SMS"),
                    provider: process.env.SMS_PROVIDER || "twilio",
                },
                push: {
                    enabled: registeredChannels.includes("PUSH"),
                    provider: pushProvider,
                    description: hasVapid
                        ? "Web Push via VAPID (no Firebase required)"
                        : hasFcm
                            ? "Push via Firebase Cloud Messaging"
                            : "Push notifications not configured",
                },
            },
            providers: {
                sendgrid: {
                    configured: !!(process.env.SENDGRID_API_KEY),
                },
                nodemailer: {
                    configured: !!((process.env.APP_NODEMAILER_SMTP_HOST || process.env.SMTP_HOST) &&
                        (process.env.APP_NODEMAILER_SMTP_PORT || process.env.SMTP_PORT)),
                },
                twilio: {
                    configured: !!(process.env.APP_TWILIO_ACCOUNT_SID && process.env.APP_TWILIO_AUTH_TOKEN),
                },
                vapid: {
                    configured: hasVapid,
                    description: "Web Push Protocol (VAPID keys)",
                },
                fcm: {
                    configured: hasFcm,
                    description: "Firebase Cloud Messaging",
                },
            },
            features: {
                idempotency: {
                    enabled: true,
                    ttl: "30 days",
                },
                userPreferences: {
                    enabled: true,
                    cacheTTL: "1 hour",
                },
                deliveryTracking: {
                    enabled: true,
                    ttl: "30 days",
                },
                priorityLevels: ["LOW", "NORMAL", "HIGH", "URGENT"],
                notificationTypes: [
                    "SYSTEM",
                    "INVESTMENT",
                    "TRADE",
                    "P2P",
                    "COPY_TRADING",
                    "ICO",
                    "STAKING",
                    "WALLET",
                    "SECURITY",
                    "MARKETING",
                    "FOREX",
                    "BINARY",
                    "FUTURES",
                    "ECOMMERCE",
                    "NFT",
                    "ALERT",
                    "MESSAGE",
                    "USER",
                ],
            },
        };
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Notification settings retrieved");
        return {
            timestamp: new Date().toISOString(),
            ...settings,
        };
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
};
