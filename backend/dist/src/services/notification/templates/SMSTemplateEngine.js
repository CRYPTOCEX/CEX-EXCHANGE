"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsTemplateEngine = exports.SMSTemplateEngine = void 0;
const console_1 = require("@b/utils/console");
class SMSTemplateEngine {
    constructor() {
        this.SINGLE_SMS_LENGTH = 160;
        this.MULTIPART_SMS_LENGTH = 153;
    }
    static getInstance() {
        if (!SMSTemplateEngine.instance) {
            SMSTemplateEngine.instance = new SMSTemplateEngine();
        }
        return SMSTemplateEngine.instance;
    }
    render(template, data) {
        try {
            let message = template;
            message = message.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                const trimmedKey = key.trim();
                return data[trimmedKey] !== undefined
                    ? String(data[trimmedKey])
                    : match;
            });
            const length = message.length;
            const parts = this.calculateParts(message);
            if (length > this.SINGLE_SMS_LENGTH) {
                console_1.logger.warn("SMSTemplateEngine", `SMS message exceeds single SMS length: ${length} chars, ${parts} parts`, template);
                message = this.truncate(message, this.SINGLE_SMS_LENGTH);
            }
            return {
                message,
                length: message.length,
                parts: this.calculateParts(message),
            };
        }
        catch (error) {
            console_1.logger.error("SMSTemplateEngine", `Failed to render SMS template: ${template}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    createFromNotification(data) {
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
            const shortLink = this.shortenLink(fullLink);
            if (sms.length + shortLink.length + 1 <= this.SINGLE_SMS_LENGTH) {
                sms += ` ${shortLink}`;
            }
        }
        if (sms.length > this.SINGLE_SMS_LENGTH) {
            sms = this.truncate(sms, this.SINGLE_SMS_LENGTH);
        }
        return {
            message: sms,
            length: sms.length,
            parts: this.calculateParts(sms),
        };
    }
    calculateParts(message) {
        if (message.length <= this.SINGLE_SMS_LENGTH) {
            return 1;
        }
        return Math.ceil(message.length / this.MULTIPART_SMS_LENGTH);
    }
    truncate(message, maxLength) {
        if (message.length <= maxLength) {
            return message;
        }
        return message.substring(0, maxLength - 3) + "...";
    }
    shortenLink(url) {
        let short = url.replace(/^https?:\/\//, "");
        short = short.replace(/^www\./, "");
        short = short.replace(/\/$/, "");
        if (short.length > 30) {
            short = short.substring(0, 27) + "...";
        }
        return short;
    }
    validateTemplate(template, data) {
        const errors = [];
        const variables = template.match(/\{\{([^}]+)\}\}/g);
        if (variables) {
            for (const variable of variables) {
                const key = variable.replace(/\{\{|\}\}/g, "").trim();
                if (data[key] === undefined) {
                    errors.push(`Missing data for variable: ${key}`);
                }
            }
        }
        if (errors.length === 0) {
            const rendered = this.render(template, data);
            if (rendered.parts > 1) {
                errors.push(`Template renders to ${rendered.parts} SMS parts (${rendered.length} chars)`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    getCommonTemplates() {
        return {
            TRADE_COMPLETED: "Trade completed: {{pair}} {{side}} {{amount}} at {{price}}",
            TRADE_FAILED: "Trade failed: {{pair}} - {{reason}}",
            DEPOSIT_CONFIRMED: "Deposit confirmed: {{amount}} {{currency}} to your wallet",
            WITHDRAWAL_APPROVED: "Withdrawal approved: {{amount}} {{currency}} is being sent",
            WITHDRAWAL_COMPLETED: "Withdrawal completed: {{amount}} {{currency}}",
            LOGIN_NEW_DEVICE: "New login: {{device}} from {{location}}",
            PASSWORD_CHANGED: "Your password was changed. Contact support if not you.",
            TWO_FACTOR_ENABLED: "2FA enabled for your account",
            MAINTENANCE_ALERT: "Maintenance: {{message}} at {{time}}",
            SYSTEM_ALERT: "Alert: {{message}}",
            VERIFY_PHONE: "Your verification code: {{code}}",
            OTP_CODE: "Your OTP code: {{code}} - Valid for {{minutes}} minutes",
        };
    }
}
exports.SMSTemplateEngine = SMSTemplateEngine;
exports.smsTemplateEngine = SMSTemplateEngine.getInstance();
