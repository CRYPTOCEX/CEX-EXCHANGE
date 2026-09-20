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
const emails_1 = require("@b/utils/emails");
const redis_1 = require("@b/utils/redis");
const delivery_failure_1 = require("../providers/email/delivery-failure");
const UNDELIVERABLE_TLDS = [".invalid", ".test", ".example", ".localhost"];
function envInt(name, fallback) {
    const parsed = Number(process.env[name]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
const RATE_MAX = envInt("MAIL_QUEUE_RATE_MAX", 10);
const RATE_WINDOW_MS = envInt("MAIL_QUEUE_RATE_WINDOW_MS", 60000);
const COOLDOWN_KEY = "notification:email:cooldown-until";
const MAX_ATTEMPTS = envInt("MAIL_QUEUE_MAX_ATTEMPTS", 5);
function isUndeliverableRecipient(to) {
    const list = Array.isArray(to) ? to : to ? [to] : [];
    if (!list.length)
        return false;
    return list.every((address) => {
        const normalized = String(address || "").trim().toLowerCase();
        return (!!normalized && UNDELIVERABLE_TLDS.some((tld) => normalized.endsWith(tld)));
    });
}
class NotificationQueue {
    constructor() {
        this.queue = null;
        this.sendGridProvider = null;
        this.nodemailerProvider = null;
        this.queueErrorLogged = false;
        redis_1.RedisSingleton.onAvailabilityChange((up) => {
            if (up) {
                this.queueErrorLogged = false;
                this.ensureQueue();
            }
        });
        redis_1.RedisSingleton.waitForProbe().then((up) => {
            if (up)
                this.ensureQueue();
        });
    }
    ensureQueue() {
        if (!redis_1.RedisSingleton.isRedisUp())
            return null;
        if (this.queue)
            return this.queue;
        const queue = new bull_1.default("notification-emails", {
            redis: {
                host: process.env.REDIS_HOST || "127.0.0.1",
                port: parseInt(process.env.REDIS_PORT || "6379"),
                password: process.env.REDIS_PASSWORD || undefined,
                retryStrategy: (times) => Math.min(500 * 2 ** Math.min(times, 6), 30000),
            },
            limiter: {
                max: RATE_MAX,
                duration: RATE_WINDOW_MS,
            },
            defaultJobOptions: {
                attempts: MAX_ATTEMPTS,
                backoff: {
                    type: "smtp",
                },
                removeOnComplete: 100,
                removeOnFail: 500,
            },
            settings: {
                backoffStrategies: {
                    smtp: (attemptsMade, err) => {
                        const requested = Number(err === null || err === void 0 ? void 0 : err.retryAfterMs);
                        const base = Number.isFinite(requested) && requested > 0
                            ? requested
                            : Math.min(2000 * 2 ** Math.max(0, attemptsMade - 1), 60000);
                        return Math.round(base * (1 + Math.random() * 0.2));
                    },
                },
            },
        });
        queue.process(this.processEmailJob.bind(this));
        this.registerEventHandlers(queue);
        this.queue = queue;
        return queue;
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
    async addEmailJob(provider, emailData, notificationId, userId, priority, meta) {
        var _a;
        const jobData = {
            provider,
            emailData,
            notificationId,
            userId,
            notificationType: meta === null || meta === void 0 ? void 0 : meta.notificationType,
            template: (_a = meta === null || meta === void 0 ? void 0 : meta.template) !== null && _a !== void 0 ? _a : null,
        };
        if ((0, emails_1.mailDisabled)()) {
            console_1.logger.debug("Queue", `MAIL_DISABLED: dropping notification email to ${emailData === null || emailData === void 0 ? void 0 : emailData.to}`);
            return {
                id: `skipped-mail-disabled-${notificationId}`,
                data: jobData,
            };
        }
        if (isUndeliverableRecipient(emailData === null || emailData === void 0 ? void 0 : emailData.to)) {
            console_1.logger.debug("Queue", `Skipping notification email to ${emailData === null || emailData === void 0 ? void 0 : emailData.to}: reserved undeliverable domain`);
            return {
                id: `skipped-undeliverable-${notificationId}`,
                data: jobData,
            };
        }
        const queue = this.ensureQueue();
        if (!queue) {
            try {
                await this.sendViaProvider(jobData);
            }
            catch (error) {
                console_1.logger.error("Queue", `Inline email send failed (Redis down): provider=${provider}, notificationId=${notificationId}`, error instanceof Error ? error : new Error(String(error)));
                throw error;
            }
            return {
                id: `inline-${Date.now()}`,
                data: jobData,
            };
        }
        try {
            const job = await queue.add(jobData, {
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
    async sendViaProvider(data) {
        const { provider, emailData } = data;
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
            const error = new Error(result.error || "Email send failed");
            error.failureKind = result.failureKind;
            error.retryAfterMs = result.retryAfterMs;
            throw error;
        }
        return result;
    }
    async cooldownRemainingMs() {
        if (!redis_1.RedisSingleton.isRedisUp())
            return 0;
        try {
            const raw = await redis_1.RedisSingleton.getInstance().get(COOLDOWN_KEY);
            if (!raw)
                return 0;
            const until = Number(raw);
            if (!Number.isFinite(until))
                return 0;
            return Math.max(0, until - Date.now());
        }
        catch (_a) {
            return 0;
        }
    }
    async startCooldown(ms, reason) {
        if (!redis_1.RedisSingleton.isRedisUp())
            return;
        const window = Math.max(1000, Math.floor(ms));
        try {
            await redis_1.RedisSingleton.getInstance().set(COOLDOWN_KEY, String(Date.now() + window), "PX", window);
            console_1.logger.warn("Queue", `Email sending paused for ${Math.round(window / 1000)}s across all workers — ` +
                `the provider is rate-limiting us: ${reason}. Queued mail is held, not dropped.`);
        }
        catch (_a) {
        }
    }
    async processEmailJob(job) {
        const { provider, notificationId } = job.data;
        if ((0, emails_1.mailDisabled)()) {
            console_1.logger.debug("Queue", `MAIL_DISABLED: discarding queued email job ${job.id} (${notificationId})`);
            return { success: true, messageId: `suppressed-${job.id}` };
        }
        const cooling = await this.cooldownRemainingMs();
        if (cooling > 0) {
            const error = new Error(`Email sending is in cooldown for another ${Math.round(cooling / 1000)}s ` +
                `(the provider is rate-limiting this account)`);
            error.retryAfterMs = cooling;
            error.failureKind = "throttled";
            throw error;
        }
        console_1.logger.info("Queue", `Processing email job: ${job.id}`, {
            jobId: job.id,
            provider,
            notificationId,
            attempt: job.attemptsMade + 1,
        });
        try {
            const result = await this.sendViaProvider(job.data);
            console_1.logger.info("Queue", `Email job completed successfully: ${job.id}`, {
                jobId: job.id,
                provider,
                notificationId,
                messageId: result.messageId,
            });
            return result;
        }
        catch (error) {
            const err = error;
            if (err.failureKind === "throttled") {
                await this.startCooldown(err.retryAfterMs || (0, delivery_failure_1.throttleCooldownMs)(), err.message);
            }
            if (err.failureKind === "permanent") {
                try {
                    await job.discard();
                }
                catch (_a) {
                }
                console_1.logger.error("Queue", `Email job not retryable: jobId=${job.id}, provider=${provider}, ` +
                    `notificationId=${notificationId} — ${err.message}`);
                throw err;
            }
            const willRetry = job.attemptsMade + 1 < MAX_ATTEMPTS;
            console_1.logger.warn("Queue", `Email job failed: jobId=${job.id}, provider=${provider}, ` +
                `notificationId=${notificationId}, attempt=${job.attemptsMade + 1}/${MAX_ATTEMPTS}` +
                `${err.failureKind ? `, ${err.failureKind}` : ""}` +
                `${willRetry ? ` — will retry` : " — no attempts left"}: ${err.message}`);
            throw err;
        }
    }
    registerEventHandlers(queue) {
        queue.on("completed", (job, result) => {
            this.queueErrorLogged = false;
            console_1.logger.info("Queue", `Email job completed: ${job.id}`, {
                jobId: job.id,
                notificationId: job.data.notificationId,
                messageId: result.messageId,
            });
        });
        queue.on("failed", (job, error) => {
            var _a;
            var _b;
            const attempts = (_b = (_a = job.opts) === null || _a === void 0 ? void 0 : _a.attempts) !== null && _b !== void 0 ? _b : MAX_ATTEMPTS;
            if (job.attemptsMade < attempts)
                return;
            console_1.logger.error("Queue", `Email undelivered after ${job.attemptsMade} attempt(s): jobId=${job.id}, ` +
                `notificationId=${job.data.notificationId}. It stays in the failed set and can ` +
                `be retried from the admin queue view.`, error instanceof Error ? error : new Error(String(error)));
        });
        queue.on("stalled", (jobId) => {
            console_1.logger.warn("Queue", `Email job stalled: jobId=${jobId}`);
        });
        queue.on("error", (error) => {
            if (this.queueErrorLogged)
                return;
            this.queueErrorLogged = true;
            console_1.logger.error("Queue", "Queue error occurred", error instanceof Error ? error : new Error(String(error)));
        });
    }
    async getStats() {
        const queue = this.ensureQueue();
        if (!queue) {
            return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
        }
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
        ]);
        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
        };
    }
    async getPendingJobs(limit = 50) {
        const queue = this.ensureQueue();
        if (!queue) {
            return [];
        }
        const capped = Math.max(1, Math.min(Math.floor(limit) || 50, 200));
        const end = capped - 1;
        const [active, waiting, delayed] = await Promise.all([
            queue.getActive(0, end),
            queue.getWaiting(0, end),
            queue.getDelayed(0, end),
        ]);
        return [
            ...active.map((job) => this.toPendingJob(job, "processing")),
            ...waiting.map((job) => this.toPendingJob(job, "pending")),
            ...delayed.map((job) => this.toPendingJob(job, "pending")),
        ]
            .filter((job) => job !== null)
            .slice(0, capped);
    }
    toPendingJob(job, status) {
        var _a;
        if (!job)
            return null;
        const data = job.data || {};
        return {
            id: String(job.id),
            userId: data.userId || "unknown",
            notificationId: data.notificationId || "",
            title: ((_a = data.emailData) === null || _a === void 0 ? void 0 : _a.subject) || "(no subject)",
            type: data.notificationType || "EMAIL",
            channels: ["Email"],
            template: data.template || null,
            provider: data.provider || "unknown",
            attemptsMade: job.attemptsMade || 0,
            queuedAt: new Date(job.timestamp).toISOString(),
            status,
        };
    }
    async getJob(jobId) {
        const queue = this.ensureQueue();
        if (!queue)
            return null;
        return queue.getJob(jobId);
    }
    async retryFailedJob(jobId) {
        const queue = this.ensureQueue();
        if (!queue) {
            throw new Error("Queue unavailable (Redis is down)");
        }
        const job = await queue.getJob(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        await job.retry();
        console_1.logger.info("Queue", `Retrying failed job: ${jobId}`);
    }
    async cleanOldJobs(grace = 24 * 60 * 60 * 1000) {
        const queue = this.ensureQueue();
        if (!queue)
            return [];
        const completedJobs = await queue.clean(grace, "completed");
        const failedJobs = await queue.clean(grace, "failed");
        console_1.logger.info("Queue", `Cleaned old jobs: ${completedJobs.length} completed, ${failedJobs.length} failed`);
        const completedIds = completedJobs.map((job) => parseInt(job.id));
        const failedIds = failedJobs.map((job) => parseInt(job.id));
        return [...completedIds, ...failedIds];
    }
    async pause() {
        const queue = this.ensureQueue();
        if (!queue)
            return;
        await queue.pause();
        console_1.logger.info("Queue", "Queue paused");
    }
    async resume() {
        const queue = this.ensureQueue();
        if (!queue)
            return;
        await queue.resume();
        console_1.logger.info("Queue", "Queue resumed");
    }
    async close() {
        var _a, _b;
        (_b = (_a = this.nodemailerProvider) === null || _a === void 0 ? void 0 : _a.close) === null || _b === void 0 ? void 0 : _b.call(_a);
        if (!this.queue)
            return;
        await this.queue.close();
        this.queue = null;
        console_1.logger.info("Queue", "Queue closed");
    }
}
exports.NotificationQueue = NotificationQueue;
exports.notificationQueue = NotificationQueue.getInstance();
