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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.PushTemplateEngine = exports.pushTemplateEngine = exports.SMSTemplateEngine = exports.smsTemplateEngine = exports.TemplateEngine = exports.templateEngine = exports.NotificationQueue = exports.notificationQueue = exports.WebPushProvider = exports.FCMProvider = exports.BasePushProvider = exports.TwilioProvider = exports.BaseSMSProvider = exports.NodemailerProvider = exports.SendGridProvider = exports.BaseEmailProvider = exports.PushChannel = exports.SMSChannel = exports.EmailChannel = exports.InAppChannel = exports.BaseChannel = exports.redisCache = exports.notificationService = exports.NotificationService = void 0;
exports.initializeNotificationChannels = initializeNotificationChannels;
var NotificationService_1 = require("./NotificationService");
Object.defineProperty(exports, "NotificationService", { enumerable: true, get: function () { return NotificationService_1.NotificationService; } });
Object.defineProperty(exports, "notificationService", { enumerable: true, get: function () { return NotificationService_1.notificationService; } });
__exportStar(require("./types"), exports);
__exportStar(require("./errors"), exports);
__exportStar(require("./utils/preferences"), exports);
var RedisCache_1 = require("./cache/RedisCache");
Object.defineProperty(exports, "redisCache", { enumerable: true, get: function () { return RedisCache_1.redisCache; } });
var BaseChannel_1 = require("./channels/BaseChannel");
Object.defineProperty(exports, "BaseChannel", { enumerable: true, get: function () { return BaseChannel_1.BaseChannel; } });
var InAppChannel_1 = require("./channels/InAppChannel");
Object.defineProperty(exports, "InAppChannel", { enumerable: true, get: function () { return InAppChannel_1.InAppChannel; } });
var EmailChannel_1 = require("./channels/EmailChannel");
Object.defineProperty(exports, "EmailChannel", { enumerable: true, get: function () { return EmailChannel_1.EmailChannel; } });
var SMSChannel_1 = require("./channels/SMSChannel");
Object.defineProperty(exports, "SMSChannel", { enumerable: true, get: function () { return SMSChannel_1.SMSChannel; } });
var PushChannel_1 = require("./channels/PushChannel");
Object.defineProperty(exports, "PushChannel", { enumerable: true, get: function () { return PushChannel_1.PushChannel; } });
var BaseEmailProvider_1 = require("./providers/email/BaseEmailProvider");
Object.defineProperty(exports, "BaseEmailProvider", { enumerable: true, get: function () { return BaseEmailProvider_1.BaseEmailProvider; } });
var SendGridProvider_1 = require("./providers/email/SendGridProvider");
Object.defineProperty(exports, "SendGridProvider", { enumerable: true, get: function () { return SendGridProvider_1.SendGridProvider; } });
var NodemailerProvider_1 = require("./providers/email/NodemailerProvider");
Object.defineProperty(exports, "NodemailerProvider", { enumerable: true, get: function () { return NodemailerProvider_1.NodemailerProvider; } });
var BaseSMSProvider_1 = require("./providers/sms/BaseSMSProvider");
Object.defineProperty(exports, "BaseSMSProvider", { enumerable: true, get: function () { return BaseSMSProvider_1.BaseSMSProvider; } });
var TwilioProvider_1 = require("./providers/sms/TwilioProvider");
Object.defineProperty(exports, "TwilioProvider", { enumerable: true, get: function () { return TwilioProvider_1.TwilioProvider; } });
var BasePushProvider_1 = require("./providers/push/BasePushProvider");
Object.defineProperty(exports, "BasePushProvider", { enumerable: true, get: function () { return BasePushProvider_1.BasePushProvider; } });
var FCMProvider_1 = require("./providers/push/FCMProvider");
Object.defineProperty(exports, "FCMProvider", { enumerable: true, get: function () { return FCMProvider_1.FCMProvider; } });
var WebPushProvider_1 = require("./providers/push/WebPushProvider");
Object.defineProperty(exports, "WebPushProvider", { enumerable: true, get: function () { return WebPushProvider_1.WebPushProvider; } });
var NotificationQueue_1 = require("./queue/NotificationQueue");
Object.defineProperty(exports, "notificationQueue", { enumerable: true, get: function () { return NotificationQueue_1.notificationQueue; } });
Object.defineProperty(exports, "NotificationQueue", { enumerable: true, get: function () { return NotificationQueue_1.NotificationQueue; } });
var TemplateEngine_1 = require("./templates/TemplateEngine");
Object.defineProperty(exports, "templateEngine", { enumerable: true, get: function () { return TemplateEngine_1.templateEngine; } });
Object.defineProperty(exports, "TemplateEngine", { enumerable: true, get: function () { return TemplateEngine_1.TemplateEngine; } });
var SMSTemplateEngine_1 = require("./templates/SMSTemplateEngine");
Object.defineProperty(exports, "smsTemplateEngine", { enumerable: true, get: function () { return SMSTemplateEngine_1.smsTemplateEngine; } });
Object.defineProperty(exports, "SMSTemplateEngine", { enumerable: true, get: function () { return SMSTemplateEngine_1.SMSTemplateEngine; } });
var PushTemplateEngine_1 = require("./templates/PushTemplateEngine");
Object.defineProperty(exports, "pushTemplateEngine", { enumerable: true, get: function () { return PushTemplateEngine_1.pushTemplateEngine; } });
Object.defineProperty(exports, "PushTemplateEngine", { enumerable: true, get: function () { return PushTemplateEngine_1.PushTemplateEngine; } });
__exportStar(require("./utils/phoneValidation"), exports);
__exportStar(require("./utils/deviceToken"), exports);
const NotificationService_2 = require("./NotificationService");
const InAppChannel_2 = require("./channels/InAppChannel");
const EmailChannel_2 = require("./channels/EmailChannel");
const SMSChannel_2 = require("./channels/SMSChannel");
const PushChannel_2 = require("./channels/PushChannel");
async function initializeNotificationChannels() {
    const enabledChannels = [];
    const disabledChannels = [];
    NotificationService_2.notificationService.registerChannel("IN_APP", new InAppChannel_2.InAppChannel());
    enabledChannels.push("IN_APP");
    NotificationService_2.notificationService.registerChannel("EMAIL", new EmailChannel_2.EmailChannel());
    enabledChannels.push("EMAIL");
    const twilioSid = process.env.APP_TWILIO_ACCOUNT_SID;
    const hasTwilio = twilioSid &&
        twilioSid.startsWith("AC") &&
        process.env.APP_TWILIO_AUTH_TOKEN;
    if (hasTwilio) {
        const smsChannel = new SMSChannel_2.SMSChannel();
        if (smsChannel.validateConfig()) {
            NotificationService_2.notificationService.registerChannel("SMS", smsChannel);
            enabledChannels.push("SMS");
        }
        else {
            disabledChannels.push("SMS");
        }
    }
    else {
        disabledChannels.push("SMS");
    }
    const hasFCM = process.env.FCM_PROJECT_ID || process.env.FCM_SERVICE_ACCOUNT_PATH;
    const hasVAPID = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;
    let pushProviders = [];
    if (hasFCM || hasVAPID) {
        const pushChannel = new PushChannel_2.PushChannel();
        if (pushChannel.validateConfig()) {
            NotificationService_2.notificationService.registerChannel("PUSH", pushChannel);
            enabledChannels.push("PUSH");
            if (pushChannel.hasFCMProvider())
                pushProviders.push("FCM");
            if (pushChannel.hasWebPushProvider())
                pushProviders.push("WebPush");
        }
        else {
            disabledChannels.push("PUSH");
        }
    }
    else {
        disabledChannels.push("PUSH");
    }
    const pushInfo = pushProviders.length > 0 ? ` (${pushProviders.join(", ")})` : "";
    const enabledInfo = enabledChannels.map(c => c === "PUSH" ? `PUSH${pushInfo}` : c).join(", ");
    console.log(`[NotificationService] Channels: ${enabledInfo}`);
    try {
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        const cacheManager = CacheManager.getInstance();
        await cacheManager.updateSetting("emailChannelStatus", enabledChannels.includes("EMAIL") ? "true" : "false");
        await cacheManager.updateSetting("smsChannelStatus", enabledChannels.includes("SMS") ? "true" : "false");
        await cacheManager.updateSetting("pushChannelStatus", enabledChannels.includes("PUSH") ? "true" : "false");
    }
    catch (error) {
        console.error("[NotificationService] Failed to save channel status to settings:", error);
    }
}
