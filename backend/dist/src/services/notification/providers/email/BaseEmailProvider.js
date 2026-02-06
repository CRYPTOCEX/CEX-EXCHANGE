"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEmailProvider = void 0;
class BaseEmailProvider {
    constructor(name, config) {
        this.name = name;
        this.config = config || this.loadConfigFromEnv();
    }
    formatEmail(email, name) {
        if (name) {
            return `"${name}" <${email}>`;
        }
        return email;
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    log(message, data) {
        if (data !== undefined) {
            console.log(`[${this.name}] ${message}`, data);
        }
        else {
            console.log(`[${this.name}] ${message}`);
        }
    }
    logError(message, error) {
        console.error(`[${this.name}] ERROR: ${message}`, error);
    }
}
exports.BaseEmailProvider = BaseEmailProvider;
