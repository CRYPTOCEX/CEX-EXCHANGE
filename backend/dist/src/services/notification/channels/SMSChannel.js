"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSChannel = void 0;
const BaseChannel_1 = require("./BaseChannel");
const TwilioProvider_1 = require("../providers/sms/TwilioProvider");
const db_1 = require("@b/db");
class SMSChannel extends BaseChannel_1.BaseChannel {
    constructor() {
        super("SMS");
        this.twilioProvider = new TwilioProvider_1.TwilioProvider();
    }
    async send(operation, transaction) {
        try {
            this.log("Sending SMS notification", {
                userId: operation.userId,
                type: operation.type,
            });
            const user = await db_1.models.user.findByPk(operation.userId, {
                attributes: ["phone", "firstName", "lastName"],
                transaction,
            });
            if (!user || !user.phone) {
                return {
                    success: false,
                    error: "User phone number not found",
                };
            }
            let phoneNumber = user.phone.replace(/[^\d+]/g, "");
            if (!phoneNumber.startsWith("+")) {
                phoneNumber = `+${phoneNumber}`;
            }
            if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
                return {
                    success: false,
                    error: `Invalid phone number format: ${user.phone}`,
                };
            }
            const message = this.prepareSMSMessage(operation, user);
            if (!message || message.trim().length === 0) {
                return {
                    success: false,
                    error: "SMS message is empty - nothing to send",
                };
            }
            const result = await this.twilioProvider.send({
                to: phoneNumber,
                message,
                from: process.env.APP_TWILIO_PHONE_NUMBER,
            });
            if (!result.success) {
                this.logError("Failed to send SMS", {
                    error: result.error,
                    to: user.phone,
                });
                return result;
            }
            this.log("SMS sent successfully", {
                userId: operation.userId,
                to: user.phone,
                messageId: result.messageId,
            });
            return result;
        }
        catch (error) {
            this.logError("Failed to send SMS", error);
            return {
                success: false,
                error: error.message || "Failed to send SMS notification",
            };
        }
    }
    prepareSMSMessage(operation, user) {
        const data = operation.data || {};
        if (data.smsMessage) {
            return this.truncateMessage(data.smsMessage);
        }
        let sms = "";
        if (data.title) {
            sms += data.title;
        }
        if (data.message) {
            if (sms.length > 0) {
                sms += ": ";
            }
            sms += data.message;
        }
        if (data.link && sms.length < 140) {
            const baseUrl = process.env.APP_PUBLIC_URL || "https://yourapp.com";
            const fullLink = data.link.startsWith("http")
                ? data.link
                : `${baseUrl}${data.link}`;
            sms += ` ${fullLink}`;
        }
        return this.truncateMessage(sms);
    }
    truncateMessage(message, maxLength = 160) {
        if (message.length <= maxLength) {
            return message;
        }
        return message.substring(0, maxLength - 3) + "...";
    }
    validateConfig() {
        if (!process.env.APP_TWILIO_ACCOUNT_SID) {
            this.logError("APP_TWILIO_ACCOUNT_SID not configured", {});
            return false;
        }
        if (!process.env.APP_TWILIO_ACCOUNT_SID.startsWith("AC")) {
            this.logError("APP_TWILIO_ACCOUNT_SID must start with 'AC'", {});
            return false;
        }
        if (!process.env.APP_TWILIO_AUTH_TOKEN) {
            this.logError("APP_TWILIO_AUTH_TOKEN not configured", {});
            return false;
        }
        if (!process.env.APP_TWILIO_PHONE_NUMBER &&
            !process.env.APP_TWILIO_MESSAGING_SERVICE_SID) {
            this.logError("APP_TWILIO_PHONE_NUMBER or APP_TWILIO_MESSAGING_SERVICE_SID not configured", {});
            return false;
        }
        return this.twilioProvider.validateConfig();
    }
    async verifyPhoneNumber(phoneNumber) {
        return this.twilioProvider.verifyPhoneNumber(phoneNumber);
    }
    async getMessageStatus(messageSid) {
        return this.twilioProvider.getMessageStatus(messageSid);
    }
}
exports.SMSChannel = SMSChannel;
