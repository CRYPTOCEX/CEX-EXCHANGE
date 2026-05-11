"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodemailerProvider = void 0;
const BaseEmailProvider_1 = require("./BaseEmailProvider");
const nodemailer = require("nodemailer");
class NodemailerProvider extends BaseEmailProvider_1.BaseEmailProvider {
    constructor(config) {
        super("Nodemailer", config);
        if (this.validateConfig()) {
            this.initializeTransporter();
        }
    }
    loadConfigFromEnv() {
        const service = process.env.APP_NODEMAILER_SERVICE;
        const host = process.env.APP_NODEMAILER_SMTP_HOST;
        const port = parseInt(process.env.APP_NODEMAILER_SMTP_PORT || "587");
        const secure = process.env.APP_NODEMAILER_SMTP_ENCRYPTION === "ssl";
        const user = service
            ? process.env.APP_NODEMAILER_SERVICE_SENDER
            : (process.env.APP_NODEMAILER_SMTP_USERNAME || process.env.APP_NODEMAILER_SMTP_SENDER);
        const pass = service
            ? process.env.APP_NODEMAILER_SERVICE_PASSWORD
            : process.env.APP_NODEMAILER_SMTP_PASSWORD;
        return {
            service,
            host,
            port,
            secure,
            auth: {
                user,
                pass,
            },
            from: process.env.NEXT_PUBLIC_APP_EMAIL || process.env.APP_EMAIL_FROM || "noreply@example.com",
            fromName: process.env.APP_EMAIL_SENDER_NAME || "Notification Service",
        };
    }
    validateConfig() {
        if (!this.config.service && !this.config.host) {
            this.logError("Missing SMTP service or host configuration", {});
            return false;
        }
        if (!this.config.auth || !this.config.auth.user || !this.config.auth.pass) {
            this.logError("Missing SMTP authentication credentials", {});
            return false;
        }
        return true;
    }
    initializeTransporter() {
        try {
            const transportConfig = {
                auth: this.config.auth,
                tls: {
                    rejectUnauthorized: false,
                    minVersion: "TLSv1.2",
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 30000,
            };
            if (this.config.service) {
                transportConfig.service = this.config.service;
            }
            else if (this.config.host) {
                transportConfig.host = this.config.host;
                transportConfig.port = this.config.port;
                transportConfig.secure = this.config.secure;
                if (this.config.port === 587 && !this.config.secure) {
                    transportConfig.requireTLS = true;
                }
            }
            this.transporter = nodemailer.createTransport(transportConfig);
            this.log("Transporter initialized successfully");
        }
        catch (error) {
            this.logError("Failed to initialize transporter", error);
            throw error;
        }
    }
    async send(data) {
        try {
            if (!this.validateConfig() || !this.transporter) {
                throw new Error("Nodemailer configuration is invalid or transporter not initialized");
            }
            const mailOptions = {
                from: data.from || this.formatEmail(this.config.from, this.config.fromName),
                to: Array.isArray(data.to) ? data.to.join(", ") : data.to,
                subject: data.subject,
                html: data.html,
                text: data.text || this.stripHtml(data.html),
            };
            if (data.replyTo) {
                mailOptions.replyTo = data.replyTo;
            }
            if (data.cc && data.cc.length > 0) {
                mailOptions.cc = data.cc.join(", ");
            }
            if (data.bcc && data.bcc.length > 0) {
                mailOptions.bcc = data.bcc.join(", ");
            }
            if (data.attachments && data.attachments.length > 0) {
                mailOptions.attachments = data.attachments;
            }
            const info = await this.transporter.sendMail(mailOptions);
            this.log("Email sent successfully", {
                to: data.to,
                subject: data.subject,
                messageId: info.messageId,
            });
            return {
                success: true,
                externalId: info.messageId,
                messageId: `nodemailer-${info.messageId}`,
            };
        }
        catch (error) {
            this.logError("Failed to send email", error);
            this.transporter = null;
            try {
                if (this.validateConfig()) {
                    this.initializeTransporter();
                }
            }
            catch (_a) {
            }
            return {
                success: false,
                error: error.message || "Failed to send email via Nodemailer",
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
    async verifyConnection() {
        try {
            await this.transporter.verify();
            this.log("Connection verified successfully");
            return true;
        }
        catch (error) {
            this.logError("Connection verification failed", error);
            return false;
        }
    }
}
exports.NodemailerProvider = NodemailerProvider;
