"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSMSProvider = void 0;
const console_1 = require("@b/utils/console");
class BaseSMSProvider {
    constructor(name, config) {
        this.name = name;
        this.config = { ...this.loadConfigFromEnv(), ...(config || {}) };
    }
    validatePhoneNumber(phone) {
        return /^\+[1-9]\d{1,14}$/.test(phone);
    }
    truncateMessage(message, maxLength = 160) {
        if (message.length <= maxLength)
            return message;
        return message.substring(0, maxLength - 3) + "...";
    }
    calculateSMSParts(message) {
        if (message.length <= 160)
            return 1;
        return Math.ceil(message.length / 153);
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
