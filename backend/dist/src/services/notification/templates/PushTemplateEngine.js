"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushTemplateEngine = exports.PushTemplateEngine = void 0;
const console_1 = require("@b/utils/console");
class PushTemplateEngine {
    constructor() {
        this.MAX_TITLE_LENGTH = 65;
        this.MAX_BODY_LENGTH = 240;
    }
    static getInstance() {
        if (!PushTemplateEngine.instance) {
            PushTemplateEngine.instance = new PushTemplateEngine();
        }
        return PushTemplateEngine.instance;
    }
    render(titleTemplate, bodyTemplate, data) {
        try {
            let title = this.replaceVariables(titleTemplate, data);
            let body = this.replaceVariables(bodyTemplate, data);
            title = this.truncate(title, this.MAX_TITLE_LENGTH);
            body = this.truncate(body, this.MAX_BODY_LENGTH);
            return {
                title,
                body,
                data: this.extractStringData(data),
                imageUrl: data.imageUrl,
                icon: data.icon,
            };
        }
        catch (error) {
            console_1.logger.error("PushTemplateEngine", `Failed to render push template: title="${titleTemplate}", body="${bodyTemplate}"`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    createFromNotification(data) {
        return {
            title: this.truncate(data.title, this.MAX_TITLE_LENGTH),
            body: this.truncate(data.message, this.MAX_BODY_LENGTH),
            imageUrl: data.imageUrl,
            icon: data.icon,
            data: this.extractStringData(data.customData || {}),
        };
    }
    replaceVariables(template, data) {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const trimmedKey = key.trim();
            return data[trimmedKey] !== undefined ? String(data[trimmedKey]) : match;
        });
    }
    truncate(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 1) + "…";
    }
    extractStringData(data) {
        const stringData = {};
        for (const [key, value] of Object.entries(data)) {
            if (value !== null && value !== undefined) {
                stringData[key] = String(value);
            }
        }
        return stringData;
    }
    getCommonTemplates() {
        return {
            TRADE_COMPLETED: {
                title: "Trade Completed",
                body: "{{pair}} {{side}} order filled at {{price}}",
            },
            TRADE_FAILED: {
                title: "Trade Failed",
                body: "{{pair}} order failed: {{reason}}",
            },
            DEPOSIT_CONFIRMED: {
                title: "Deposit Confirmed",
                body: "{{amount}} {{currency}} deposited to your wallet",
            },
            WITHDRAWAL_COMPLETED: {
                title: "Withdrawal Completed",
                body: "{{amount}} {{currency}} sent successfully",
            },
            LOGIN_NEW_DEVICE: {
                title: "New Login Detected",
                body: "Login from {{device}} in {{location}}",
            },
            PASSWORD_CHANGED: {
                title: "Password Changed",
                body: "Your password was changed. Contact support if this wasn't you.",
            },
            TWO_FACTOR_ENABLED: {
                title: "2FA Enabled",
                body: "Two-factor authentication has been enabled for your account",
            },
            MAINTENANCE_ALERT: {
                title: "Maintenance Alert",
                body: "{{message}} scheduled for {{time}}",
            },
            SYSTEM_UPDATE: {
                title: "System Update",
                body: "{{message}}",
            },
            PRICE_ALERT: {
                title: "Price Alert",
                body: "{{pair}} reached {{price}} ({{change}})",
            },
            ORDER_FILLED: {
                title: "Order Filled",
                body: "{{pair}} {{side}} order filled at {{price}}",
            },
            ORDER_CANCELLED: {
                title: "Order Cancelled",
                body: "{{pair}} order cancelled",
            },
        };
    }
    renderWithFallback(titleTemplate, bodyTemplate, data, fallback) {
        try {
            return this.render(titleTemplate, bodyTemplate, data);
        }
        catch (error) {
            if (fallback) {
                console_1.logger.warn("PushTemplateEngine", "Using fallback push template", error instanceof Error ? error.message : String(error));
                return {
                    title: this.truncate(fallback.title, this.MAX_TITLE_LENGTH),
                    body: this.truncate(fallback.body, this.MAX_BODY_LENGTH),
                };
            }
            throw error;
        }
    }
    validateTemplate(titleTemplate, bodyTemplate, data) {
        const errors = [];
        const titleVariables = titleTemplate.match(/\{\{([^}]+)\}\}/g);
        if (titleVariables) {
            for (const variable of titleVariables) {
                const key = variable.replace(/\{\{|\}\}/g, "").trim();
                if (data[key] === undefined) {
                    errors.push(`Missing data for title variable: ${key}`);
                }
            }
        }
        const bodyVariables = bodyTemplate.match(/\{\{([^}]+)\}\}/g);
        if (bodyVariables) {
            for (const variable of bodyVariables) {
                const key = variable.replace(/\{\{|\}\}/g, "").trim();
                if (data[key] === undefined) {
                    errors.push(`Missing data for body variable: ${key}`);
                }
            }
        }
        if (errors.length === 0) {
            const rendered = this.render(titleTemplate, bodyTemplate, data);
            if (rendered.title.length > this.MAX_TITLE_LENGTH) {
                errors.push(`Title too long: ${rendered.title.length} chars (max ${this.MAX_TITLE_LENGTH})`);
            }
            if (rendered.body.length > this.MAX_BODY_LENGTH) {
                errors.push(`Body too long: ${rendered.body.length} chars (max ${this.MAX_BODY_LENGTH})`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    createRichNotification(data) {
        return {
            title: this.truncate(data.title, this.MAX_TITLE_LENGTH),
            body: this.truncate(data.body, this.MAX_BODY_LENGTH),
            imageUrl: data.imageUrl,
            icon: data.icon,
            data: this.extractStringData(data.customData || {}),
        };
    }
    createActionNotification(data) {
        const actionData = {
            ...this.extractStringData(data.customData || {}),
            actions: JSON.stringify(data.actions),
        };
        return {
            title: this.truncate(data.title, this.MAX_TITLE_LENGTH),
            body: this.truncate(data.body, this.MAX_BODY_LENGTH),
            data: actionData,
        };
    }
}
exports.PushTemplateEngine = PushTemplateEngine;
exports.pushTemplateEngine = PushTemplateEngine.getInstance();
