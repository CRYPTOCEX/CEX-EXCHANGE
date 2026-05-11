"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailChannel = void 0;
const BaseChannel_1 = require("./BaseChannel");
const NotificationQueue_1 = require("../queue/NotificationQueue");
const TemplateEngine_1 = require("../templates/TemplateEngine");
const db_1 = require("@b/db");
class EmailChannel extends BaseChannel_1.BaseChannel {
    constructor() {
        super("EMAIL");
    }
    async send(operation, transaction) {
        try {
            this.log("Sending email notification", {
                userId: operation.userId,
                type: operation.type,
            });
            const user = await db_1.models.user.findByPk(operation.userId, {
                attributes: ["email", "firstName", "lastName"],
                transaction,
            });
            if (!user || !user.email) {
                return {
                    success: false,
                    error: "User email not found",
                };
            }
            const emailer = process.env.APP_EMAILER || "nodemailer";
            const provider = this.getProviderFromEmailer(emailer);
            const data = operation.data || {};
            const templateData = {
                user: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                },
                notification: {
                    title: data.title,
                    message: data.message,
                    link: data.link,
                    type: operation.type,
                    priority: operation.priority || "NORMAL",
                },
                ...data.templateData,
            };
            let emailContent;
            if (data.templateName) {
                try {
                    emailContent = await TemplateEngine_1.templateEngine.render(data.templateName, templateData);
                }
                catch (templateError) {
                    this.logError("Template rendering failed, using simple email", {
                        templateName: data.templateName,
                        error: templateError,
                    });
                    emailContent = TemplateEngine_1.templateEngine.createSimpleEmail(data.title, data.message, data.templateData);
                }
            }
            else {
                emailContent = TemplateEngine_1.templateEngine.createSimpleEmail(data.title, data.message, data.templateData);
            }
            const recipientEmail = data.overrideEmail || user.email;
            const emailData = {
                to: recipientEmail,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
                from: data.from || undefined,
                replyTo: data.replyTo || undefined,
                attachments: data.attachments || undefined,
            };
            const queuePriority = this.getQueuePriority(operation.priority);
            const job = await NotificationQueue_1.notificationQueue.addEmailJob(provider, emailData, data.relatedId || `notif-${Date.now()}`, operation.userId, queuePriority);
            this.log("Email queued successfully", {
                userId: operation.userId,
                jobId: job.id,
                provider,
                to: recipientEmail,
            });
            return {
                success: true,
                messageId: `email-job-${job.id}`,
                externalId: String(job.id),
            };
        }
        catch (error) {
            this.logError("Failed to queue email", error);
            return {
                success: false,
                error: error.message || "Failed to queue email notification",
            };
        }
    }
    getProviderFromEmailer(emailer) {
        if (emailer.includes("sendgrid")) {
            return "sendgrid";
        }
        return "nodemailer";
    }
    getQueuePriority(priority) {
        switch (priority) {
            case "URGENT":
                return 10;
            case "HIGH":
                return 5;
            case "NORMAL":
                return 0;
            case "LOW":
                return -5;
            default:
                return 0;
        }
    }
    validateConfig() {
        const emailer = process.env.APP_EMAILER;
        if (!emailer) {
            this.logError("APP_EMAILER not configured", {});
            return false;
        }
        if (emailer.includes("sendgrid")) {
            if (!process.env.APP_SENDGRID_API_KEY) {
                this.logError("SendGrid API key not configured", {});
                return false;
            }
        }
        else if (emailer === "local") {
            return true;
        }
        else {
            if (!process.env.APP_NODEMAILER_SERVICE &&
                !process.env.APP_NODEMAILER_SMTP_HOST) {
                this.logError("Nodemailer service/host not configured", {});
                return false;
            }
            if (process.env.APP_NODEMAILER_SERVICE) {
                if (!process.env.APP_NODEMAILER_SERVICE_SENDER ||
                    !process.env.APP_NODEMAILER_SERVICE_PASSWORD) {
                    this.logError("Nodemailer service credentials not configured", {});
                    return false;
                }
            }
            else {
                const hasSmtpUser = process.env.APP_NODEMAILER_SMTP_SENDER ||
                    process.env.APP_NODEMAILER_SMTP_USERNAME;
                if (!hasSmtpUser || !process.env.APP_NODEMAILER_SMTP_PASSWORD) {
                    this.logError("Nodemailer SMTP credentials not configured", {});
                    return false;
                }
            }
        }
        return true;
    }
}
exports.EmailChannel = EmailChannel;
