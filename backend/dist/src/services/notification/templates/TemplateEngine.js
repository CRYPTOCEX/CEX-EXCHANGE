"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateEngine = exports.TemplateEngine = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const ejs_1 = __importDefault(require("ejs"));
class TemplateEngine {
    constructor() {
        this.templateCache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000;
    }
    static getInstance() {
        if (!TemplateEngine.instance) {
            TemplateEngine.instance = new TemplateEngine();
        }
        return TemplateEngine.instance;
    }
    async render(templateName, data) {
        try {
            const template = await this.getTemplate(templateName);
            if (!template) {
                throw new Error(`Template '${templateName}' not found`);
            }
            const subject = this.renderString(template.subject || "", data);
            const bodyContent = template.emailBody || template.body;
            if (!bodyContent) {
                throw new Error(`Template '${templateName}' has no email body content`);
            }
            const html = this.renderString(bodyContent, data);
            const text = this.stripHtml(html);
            console_1.logger.info("TemplateEngine", `Template rendered successfully: ${templateName}`, JSON.stringify({ templateName, subject }));
            return { subject, html, text };
        }
        catch (error) {
            console_1.logger.error("TemplateEngine", `Failed to render template: ${templateName}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getTemplate(templateName) {
        const cached = this.templateCache.get(templateName);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.template;
        }
        try {
            const template = await db_1.models.notificationTemplate.findOne({
                where: {
                    name: templateName,
                    email: true,
                },
            });
            if (template) {
                this.templateCache.set(templateName, {
                    template,
                    timestamp: Date.now(),
                });
            }
            return template;
        }
        catch (error) {
            console_1.logger.error("TemplateEngine", `Failed to load template from database: ${templateName}`, error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    }
    renderString(template, data) {
        try {
            return ejs_1.default.render(template, data, {
                escape: (str) => this.escapeHtml(str),
            });
        }
        catch (error) {
            console_1.logger.error("TemplateEngine", "Failed to render template string", error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    escapeHtml(str) {
        const map = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;",
            "/": "&#x2F;",
        };
        return str.replace(/[&<>"'/]/g, (char) => map[char]);
    }
    stripHtml(html) {
        return html
            .replace(/<style[^>]*>.*<\/style>/gims, "")
            .replace(/<script[^>]*>.*<\/script>/gims, "")
            .replace(/<[^>]+>/gm, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, "/")
            .replace(/\n\s*\n/g, "\n\n")
            .trim();
    }
    clearCache(templateName) {
        if (templateName) {
            this.templateCache.delete(templateName);
            console_1.logger.info("TemplateEngine", `Template cache cleared: ${templateName}`);
        }
        else {
            this.templateCache.clear();
            console_1.logger.info("TemplateEngine", "All template cache cleared");
        }
    }
    async preloadTemplates(templateNames) {
        console_1.logger.info("TemplateEngine", `Preloading templates: ${templateNames.length}`);
        await Promise.all(templateNames.map((name) => this.getTemplate(name).catch((error) => {
            console_1.logger.warn("TemplateEngine", `Failed to preload template: ${name}`, error instanceof Error ? error.message : String(error));
        })));
        console_1.logger.info("TemplateEngine", "Templates preloaded successfully");
    }
    async renderWithFallback(templateName, data, fallbackTemplate) {
        try {
            return await this.render(templateName, data);
        }
        catch (error) {
            if (fallbackTemplate) {
                console_1.logger.warn("TemplateEngine", `Using fallback template: ${templateName}`, error instanceof Error ? error.message : String(error));
                return {
                    subject: this.renderString(fallbackTemplate.subject, data),
                    html: this.renderString(fallbackTemplate.body, data),
                    text: this.stripHtml(this.renderString(fallbackTemplate.body, data)),
                };
            }
            throw error;
        }
    }
    createSimpleEmail(subject, message, data) {
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(subject)}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
    <h2 style="color: #333; margin-top: 0;">${this.escapeHtml(subject)}</h2>
    <div style="background-color: white; padding: 20px; border-radius: 5px;">
      <p>${this.escapeHtml(message)}</p>
      ${data
            ? `
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
        ${Object.entries(data)
                .map(([key, value]) => `<p><strong>${this.escapeHtml(key)}:</strong> ${this.escapeHtml(String(value))}</p>`)
                .join("")}
      </div>
      `
            : ""}
    </div>
    <div style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
        return {
            subject,
            html,
            text: this.stripHtml(html),
        };
    }
}
exports.TemplateEngine = TemplateEngine;
exports.templateEngine = TemplateEngine.getInstance();
