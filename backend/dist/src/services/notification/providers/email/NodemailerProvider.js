"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodemailerProvider = void 0;
const BaseEmailProvider_1 = require("./BaseEmailProvider");
const delivery_failure_1 = require("./delivery-failure");
const transport_mode_1 = require("./transport-mode");
const nodemailer = require("nodemailer");
function envInt(name, fallback) {
    const parsed = Number(process.env[name]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
class NodemailerProvider extends BaseEmailProvider_1.BaseEmailProvider {
    constructor(config) {
        super("Nodemailer", config);
        if (this.validateConfig()) {
            this.initializeTransporter();
        }
    }
    loadConfigFromEnv() {
        const mode = (0, transport_mode_1.resolveMailTransportMode)();
        const service = mode === "service" ? process.env.APP_NODEMAILER_SERVICE : undefined;
        const host = mode === "smtp" ? process.env.APP_NODEMAILER_SMTP_HOST : undefined;
        const port = parseInt(process.env.APP_NODEMAILER_SMTP_PORT || "587", 10);
        const secure = process.env.APP_NODEMAILER_SMTP_ENCRYPTION === "ssl" || port === 465;
        const user = mode === "service"
            ? process.env.APP_NODEMAILER_SERVICE_SENDER
            : (process.env.APP_NODEMAILER_SMTP_USERNAME || process.env.APP_NODEMAILER_SMTP_SENDER);
        const pass = mode === "service"
            ? process.env.APP_NODEMAILER_SERVICE_PASSWORD
            : process.env.APP_NODEMAILER_SMTP_PASSWORD;
        const modeSender = mode === "service"
            ? process.env.APP_NODEMAILER_SERVICE_SENDER
            : process.env.APP_NODEMAILER_SMTP_SENDER;
        return {
            mode,
            service,
            host,
            port,
            secure,
            auth: {
                user,
                pass,
            },
            from: process.env.NEXT_PUBLIC_APP_EMAIL ||
                process.env.APP_EMAIL_FROM ||
                modeSender ||
                "noreply@example.com",
            fromName: process.env.APP_EMAIL_SENDER_NAME ||
                process.env.NEXT_PUBLIC_SITE_NAME ||
                "Notification Service",
            sendmailPath: process.env.APP_SENDMAIL_PATH || "/usr/sbin/sendmail",
        };
    }
    validateConfig() {
        if (this.config.mode === "sendmail") {
            return true;
        }
        if (!this.config.service && !this.config.host) {
            this.logError(this.config.mode === "service"
                ? 'APP_EMAILER selects a mail service but APP_NODEMAILER_SERVICE is empty'
                : 'APP_EMAILER selects SMTP but APP_NODEMAILER_SMTP_HOST is empty', {});
            return false;
        }
        if (!this.config.auth || !this.config.auth.user || !this.config.auth.pass) {
            this.logError(this.config.mode === "service"
                ? "Missing APP_NODEMAILER_SERVICE_SENDER / APP_NODEMAILER_SERVICE_PASSWORD"
                : "Missing APP_NODEMAILER_SMTP_SENDER / APP_NODEMAILER_SMTP_PASSWORD", {});
            return false;
        }
        return true;
    }
    initializeTransporter() {
        try {
            if (this.config.mode === "sendmail") {
                this.transporter = nodemailer.createTransport({
                    sendmail: true,
                    newline: "unix",
                    path: this.config.sendmailPath,
                });
                this.log(`Transporter initialized successfully (${this.describeTransport()})`);
                return;
            }
            const allowInsecureTLS = process.env.APP_NODEMAILER_ALLOW_INSECURE_TLS === "true";
            const transportConfig = {
                auth: this.config.auth,
                tls: {
                    rejectUnauthorized: !allowInsecureTLS,
                    minVersion: "TLSv1.2",
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 30000,
                pool: true,
                maxConnections: envInt("APP_NODEMAILER_MAX_CONNECTIONS", 1),
                maxMessages: envInt("APP_NODEMAILER_MAX_MESSAGES", 50),
                rateDelta: envInt("APP_NODEMAILER_RATE_DELTA_MS", 1000),
                rateLimit: envInt("APP_NODEMAILER_RATE_LIMIT", 5),
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
            this.log(`Transporter initialized successfully (${this.describeTransport()})`);
        }
        catch (error) {
            this.logError("Failed to initialize transporter", error);
            throw error;
        }
    }
    describeTransport() {
        var _a, _b;
        if (this.config.mode === "sendmail") {
            return `sendmail ${this.config.sendmailPath}`;
        }
        if (this.config.service) {
            return `service=${this.config.service} as ${(_a = this.config.auth) === null || _a === void 0 ? void 0 : _a.user}`;
        }
        return `smtp ${this.config.host}:${this.config.port} (${this.config.secure ? "ssl" : "starttls"}) as ${(_b = this.config.auth) === null || _b === void 0 ? void 0 : _b.user}`;
    }
    async send(data) {
        try {
            if (!this.validateConfig()) {
                throw new Error("Nodemailer configuration is invalid");
            }
            if (!this.transporter) {
                this.initializeTransporter();
            }
            if (!this.transporter) {
                throw new Error("Nodemailer transporter could not be initialized");
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
            const failure = (0, delivery_failure_1.classifyDeliveryFailure)(error);
            const smtpErrno = (error === null || error === void 0 ? void 0 : error.code) ? ` ${error.code}` : "";
            const smtpCommand = (error === null || error === void 0 ? void 0 : error.command) ? ` (${error.command})` : "";
            this.logError(`Failed to send email (${failure.kind}${failure.code ? `, ${failure.code}` : ""})` +
                `${smtpErrno}${smtpCommand}: ${failure.message}`, failure.message ? undefined : error);
            if (failure.kind !== "permanent" && this.isConnectionFault(error)) {
                this.closeTransporter();
            }
            return {
                success: false,
                error: error.message || "Failed to send email via Nodemailer",
                failureKind: failure.kind,
                retryAfterMs: failure.retryAfterMs,
            };
        }
    }
    isConnectionFault(error) {
        const code = String((error === null || error === void 0 ? void 0 : error.code) || "");
        return (code === "ECONNECTION" ||
            code === "ECONNRESET" ||
            code === "ECONNREFUSED" ||
            code === "ETIMEDOUT" ||
            code === "ESOCKET" ||
            code === "EPIPE");
    }
    closeTransporter() {
        var _a, _b;
        try {
            (_b = (_a = this.transporter) === null || _a === void 0 ? void 0 : _a.close) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        catch (_c) {
        }
        this.transporter = null;
    }
    close() {
        this.closeTransporter();
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
            if (!this.transporter && this.validateConfig()) {
                this.initializeTransporter();
            }
            if (!this.transporter)
                return false;
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
