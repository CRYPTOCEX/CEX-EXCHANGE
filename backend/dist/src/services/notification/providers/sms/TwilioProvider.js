"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioProvider = void 0;
const twilio_1 = require("twilio");
const BaseSMSProvider_1 = require("./BaseSMSProvider");
class TwilioProvider extends BaseSMSProvider_1.BaseSMSProvider {
    constructor(config) {
        super("Twilio", config);
        if (this.validateConfig()) {
            try {
                this.client = new twilio_1.Twilio(this.config.accountSid, this.config.authToken);
            }
            catch (error) {
                this.logError("Failed to initialize Twilio client", error);
            }
        }
    }
    loadConfigFromEnv() {
        return {
            accountSid: process.env.APP_TWILIO_ACCOUNT_SID,
            authToken: process.env.APP_TWILIO_AUTH_TOKEN,
            fromNumber: process.env.APP_TWILIO_PHONE_NUMBER,
            messagingServiceSid: process.env.APP_TWILIO_MESSAGING_SERVICE_SID,
        };
    }
    validateConfig() {
        if (!this.config.accountSid) {
            this.logError("Missing APP_TWILIO_ACCOUNT_SID", {});
            return false;
        }
        if (!this.config.accountSid.startsWith("AC")) {
            this.logError("Invalid APP_TWILIO_ACCOUNT_SID - must start with 'AC'", {});
            return false;
        }
        if (!this.config.authToken) {
            this.logError("Missing APP_TWILIO_AUTH_TOKEN", {});
            return false;
        }
        if (!this.config.fromNumber && !this.config.messagingServiceSid) {
            this.logError("Missing APP_TWILIO_PHONE_NUMBER or APP_TWILIO_MESSAGING_SERVICE_SID", {});
            return false;
        }
        return true;
    }
    async send(req) {
        try {
            if (!this.validateConfig() || !this.client) {
                throw new Error("Twilio configuration is invalid or client not initialized");
            }
            if (!this.validatePhoneNumber(req.to)) {
                return {
                    success: false,
                    error: `Invalid phone number format: ${req.to}`,
                };
            }
            const message = this.truncateMessage(req.fallbackText, 160);
            const parts = this.calculateSMSParts(message);
            const messageOptions = {
                to: req.to,
                body: message,
            };
            if (this.config.messagingServiceSid) {
                messageOptions.messagingServiceSid = this.config.messagingServiceSid;
            }
            else {
                messageOptions.from = this.config.fromNumber;
            }
            const twilioMessage = await this.client.messages.create(messageOptions);
            this.log("SMS sent successfully", {
                to: req.to,
                kind: req.kind,
                sid: twilioMessage.sid,
                status: twilioMessage.status,
                parts,
            });
            return {
                success: true,
                messageId: `twilio-${twilioMessage.sid}`,
                externalId: twilioMessage.sid,
                metadata: {
                    status: twilioMessage.status,
                    parts,
                    price: twilioMessage.price,
                    priceUnit: twilioMessage.priceUnit,
                },
            };
        }
        catch (error) {
            this.logError("Failed to send SMS", error);
            return {
                success: false,
                error: (error === null || error === void 0 ? void 0 : error.message) || "Failed to send SMS via Twilio",
            };
        }
    }
    async healthCheck() {
        if (!this.validateConfig() || !this.client) {
            return {
                ok: false,
                message: "Twilio is not configured: set APP_TWILIO_ACCOUNT_SID, " +
                    "APP_TWILIO_AUTH_TOKEN and APP_TWILIO_PHONE_NUMBER.",
            };
        }
        try {
            await this.client.api.accounts(this.config.accountSid).fetch();
            return { ok: true, message: "Twilio credentials accepted." };
        }
        catch (error) {
            return {
                ok: false,
                message: `Twilio rejected the credentials: ${(error === null || error === void 0 ? void 0 : error.message) || "unknown error"}`,
            };
        }
    }
}
exports.TwilioProvider = TwilioProvider;
