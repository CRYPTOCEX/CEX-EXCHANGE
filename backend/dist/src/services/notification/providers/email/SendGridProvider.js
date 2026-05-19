"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendGridProvider = void 0;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const BaseEmailProvider_1 = require("./BaseEmailProvider");
class SendGridProvider extends BaseEmailProvider_1.BaseEmailProvider {
    constructor(config) {
        super("SendGrid", config);
        if (this.validateConfig()) {
            mail_1.default.setApiKey(this.config.apiKey);
        }
    }
    loadConfigFromEnv() {
        return {
            apiKey: process.env.APP_SENDGRID_API_KEY || "",
            from: process.env.APP_EMAIL_FROM || "noreply@example.com",
            fromName: process.env.APP_EMAIL_FROM_NAME || "Notification Service",
        };
    }
    validateConfig() {
        if (!this.config.apiKey) {
            this.logError("Missing SendGrid API key", {});
            return false;
        }
        return true;
    }
    async send(data) {
        try {
            if (!this.validateConfig()) {
                throw new Error("SendGrid configuration is invalid");
            }
            const msg = {
                to: Array.isArray(data.to) ? data.to : [data.to],
                from: data.from || this.formatEmail(this.config.from, this.config.fromName),
                subject: data.subject,
                html: data.html,
                text: data.text || this.stripHtml(data.html),
            };
            if (data.replyTo) {
                msg.replyTo = data.replyTo;
            }
            if (data.cc && data.cc.length > 0) {
                msg.cc = data.cc;
            }
            if (data.bcc && data.bcc.length > 0) {
                msg.bcc = data.bcc;
            }
            if (data.attachments && data.attachments.length > 0) {
                msg.attachments = data.attachments.map((att) => ({
                    filename: att.filename,
                    content: att.content,
                    type: att.contentType,
                }));
            }
            const response = await mail_1.default.send(msg);
            this.log("Email sent successfully", {
                to: data.to,
                subject: data.subject,
                messageId: response[0].headers["x-message-id"],
            });
            return {
                success: true,
                externalId: response[0].headers["x-message-id"],
                messageId: `sendgrid-${response[0].headers["x-message-id"]}`,
            };
        }
        catch (error) {
            this.logError("Failed to send email", error);
            return {
                success: false,
                error: error.message || "Failed to send email via SendGrid",
            };
        }
    }
    stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .trim();
    }
}
exports.SendGridProvider = SendGridProvider;
