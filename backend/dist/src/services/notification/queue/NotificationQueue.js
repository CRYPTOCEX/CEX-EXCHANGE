"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationQueue = exports.NotificationQueue = void 0;
const bull_1 = __importDefault(require("bull"));
const SendGridProvider_1 = require("../providers/email/SendGridProvider");
const NodemailerProvider_1 = require("../providers/email/NodemailerProvider");
const console_1 = require("@b/utils/console");
class NotificationQueue {
    constructor() {
        this.sendGridProvider = null;
        this.nodemailerProvider = null;
        this.queue = new bull_1.default("notification-emails", {
            redis: {
                host: process.env.REDIS_HOST || "127.0.0.1",
                port: parseInt(process.env.REDIS_PORT || "6379"),
                password: process.env.REDIS_PASSWORD || undefined,
            },
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 2000,
                },
                removeOnComplete: 100,
                removeOnFail: 500,
            },
        });
        this.queue.process(this.processEmailJob.bind(this));
        this.registerEventHandlers();
    }
    getSendGridProvider() {
        if (!this.sendGridProvider) {
            this.sendGridProvider = new SendGridProvider_1.SendGridProvider();
        }
        return this.sendGridProvider;
    }
    getNodemailerProvider() {
        if (!this.nodemailerProvider) {
            this.nodemailerProvider = new NodemailerProvider_1.NodemailerProvider();
        }
        return this.nodemailerProvider;
    }
    static getInstance() {
        if (!NotificationQueue.instance) {
            NotificationQueue.instance = new NotificationQueue();
        }
        return NotificationQueue.instance;
    }
    async addEmailJob(provider, emailData, notificationId, userId, priority) {
        try {
            const job = await this.queue.add({
                provider,
                emailData,
                notificationId,
                userId,
            }, {
                priority: priority || 0,
            });
            console_1.logger.info("Queue", `Email job added to queue: ${job.id}`, {
                jobId: job.id,
                provider,
                notificationId,
                to: emailData.to,
            });
            return job;
        }
        catch (error) {
            console_1.logger.error("Queue", `Failed to add email job to queue: provider=${provider}, notificationId=${notificationId}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async processEmailJob(job) {
        const { provider, emailData, notificationId, userId } = job.data;
        console_1.logger.info("Queue", `Processing email job: ${job.id}`, {
            jobId: job.id,
            provider,
            notificationId,
            attempt: job.attemptsMade + 1,
        });
        try {
            let result;
            if (provider === "sendgrid") {
                result = await this.getSendGridProvider().send(emailData);
            }
            else if (provider === "nodemailer") {
                result = await this.getNodemailerProvider().send(emailData);
            }
            else {
                throw new Error(`Unknown email provider: ${provider}`);
            }
            if (!result.success) {
                throw new Error(result.error || "Email send failed");
            }
            console_1.logger.info("Queue", `Email job completed successfully: ${job.id}`, {
                jobId: job.id,
                provider,
                notificationId,
                messageId: result.messageId,
            });
            return result;
        }
        catch (error) {
            console_1.logger.error("Queue", `Email job failed: jobId=${job.id}, provider=${provider}, notificationId=${notificationId}, attempt=${job.attemptsMade + 1}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    registerEventHandlers() {
        this.queue.on("completed", (job, result) => {
            console_1.logger.info("Queue", `Email job completed: ${job.id}`, {
                jobId: job.id,
                notificationId: job.data.notificationId,
                messageId: result.messageId,
            });
        });
        this.queue.on("failed", (job, error) => {
            console_1.logger.error("Queue", `Email job failed permanently: jobId=${job.id}, notificationId=${job.data.notificationId}, attempts=${job.attemptsMade}`, error instanceof Error ? error : new Error(String(error)));
        });
        this.queue.on("stalled", (jobId) => {
            console_1.logger.warn("Queue", `Email job stalled: jobId=${jobId}`);
        });
        this.queue.on("error", (error) => {
            console_1.logger.error("Queue", "Queue error occurred", error instanceof Error ? error : new Error(String(error)));
        });
    }
    async getStats() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.queue.getWaitingCount(),
            this.queue.getActiveCount(),
            this.queue.getCompletedCount(),
            this.queue.getFailedCount(),
            this.queue.getDelayedCount(),
        ]);
        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
        };
    }
    async getJob(jobId) {
        return this.queue.getJob(jobId);
    }
    async retryFailedJob(jobId) {
        const job = await this.queue.getJob(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        await job.retry();
        console_1.logger.info("Queue", `Retrying failed job: ${jobId}`);
    }
    async cleanOldJobs(grace = 24 * 60 * 60 * 1000) {
        const completedJobs = await this.queue.clean(grace, "completed");
        const failedJobs = await this.queue.clean(grace, "failed");
        console_1.logger.info("Queue", `Cleaned old jobs: ${completedJobs.length} completed, ${failedJobs.length} failed`);
        const completedIds = completedJobs.map((job) => parseInt(job.id));
        const failedIds = failedJobs.map((job) => parseInt(job.id));
        return [...completedIds, ...failedIds];
    }
    async pause() {
        await this.queue.pause();
        console_1.logger.info("Queue", "Queue paused");
    }
    async resume() {
        await this.queue.resume();
        console_1.logger.info("Queue", "Queue resumed");
    }
    async close() {
        await this.queue.close();
        console_1.logger.info("Queue", "Queue closed");
    }
}
exports.NotificationQueue = NotificationQueue;
exports.notificationQueue = NotificationQueue.getInstance();
