"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSMSProvider = void 0;
const console_1 = require("@b/utils/console");
class BaseSMSProvider {
    constructor(name, config) {
        this.name = name;
        this.config = config || this.loadConfigFromEnv();
    }
    validatePhoneNumber(phone) {
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        return e164Regex.test(phone);
    }
    formatPhoneNumber(phone, defaultCountryCode = "+1") {
        let formatted = phone.replace(/[^\d+]/g, "");
        if (!formatted.startsWith("+")) {
            formatted = defaultCountryCode + formatted;
        }
        return formatted;
    }
    truncateMessage(message, maxLength = 160) {
        if (message.length <= maxLength) {
            return message;
        }
        return message.substring(0, maxLength - 3) + "...";
    }
    calculateSMSParts(message) {
        if (message.length <= 160) {
            return 1;
        }
        return Math.ceil(message.length / 153);
    }
    formatEmail(email, domain) {
        return `${email}@${domain}`;
    }
    log(message, data) {
        if (data !== undefined) {
            console_1.logger.info(`SMS:${this.name}`, message, data);
        }
        else {
            console_1.logger.info(`SMS:${this.name}`, message);
        }
    }
    logError(message, error) {
        console_1.logger.error(`SMS:${this.name}`, message, error instanceof Error ? error : new Error(JSON.stringify(error)));
    }
}
exports.BaseSMSProvider = BaseSMSProvider;
