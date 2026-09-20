"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const db_1 = require("@b/db");
const RedisCache_1 = require("./cache/RedisCache");
const preferences_1 = require("./utils/preferences");
const system_accounts_1 = require("@b/utils/system-accounts");
class NotificationService {
    constructor() {
        this.permissionCache = new Map();
        this.channels = new Map();
        this.initializeChannels();
    }
    static getInstance() {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }
    initializeChannels() {
    }
    registerChannel(channelName, channel) {
        this.channels.set(channelName, channel);
    }
    getRegisteredChannels() {
        return Array.from(this.channels.keys());
    }
    getChannel(channelName) {
        return this.channels.get(channelName) || null;
    }
    async send(operation) {
        if ((0, system_accounts_1.isSystemAccountId)(operation.userId)) {
            return {
                success: true,
                channelsDelivered: [],
                channelsFailed: [],
                timestamp: new Date(),
            };
        }
        const claim = await RedisCache_1.redisCache.claimIdempotency(operation.idempotencyKey);
        if (!claim.claimed) {
            console.log(`[NotificationService] Duplicate notification ${claim.inFlight ? "in flight" : "detected"}: ${operation.idempotencyKey}`);
            return {
                success: true,
                notificationId: claim.existingId,
                channelsDelivered: [],
                channelsFailed: [],
                timestamp: new Date(),
            };
        }
        let allowedChannels;
        try {
            allowedChannels = await (0, preferences_1.filterChannelsByPreferencesAndType)(operation.userId, operation.channels, operation.type);
        }
        catch (error) {
            await RedisCache_1.redisCache.releaseIdempotency(operation.idempotencyKey);
            throw error;
        }
        if (allowedChannels.length === 0) {
            await RedisCache_1.redisCache.releaseIdempotency(operation.idempotencyKey);
            console.log(`[NotificationService] All channels blocked by user preferences for user ${operation.userId}`);
            return {
                success: false,
                channelsDelivered: [],
                channelsFailed: operation.channels,
                errors: { ALL: "All channels blocked by user preferences" },
                timestamp: new Date(),
            };
        }
        const executeInTransaction = async (t) => {
            try {
                const results = await Promise.allSettled(allowedChannels.map((channel) => this.sendToChannel(channel, operation, t)));
                const delivered = [];
                const failed = [];
                const errors = {};
                let notificationId;
                results.forEach((result, index) => {
                    var _a;
                    const channel = allowedChannels[index];
                    if (result.status === "fulfilled" && result.value.success) {
                        delivered.push(channel);
                        notificationId = notificationId || result.value.externalId;
                    }
                    else {
                        failed.push(channel);
                        const error = result.status === "rejected"
                            ? result.reason.message
                            : ((_a = result.value) === null || _a === void 0 ? void 0 : _a.error) || "Unknown error";
                        errors[channel] = error;
                        if (notificationId) {
                            void RedisCache_1.redisCache.trackDelivery(notificationId, channel, {
                                status: "FAILED",
                                error,
                            });
                        }
                    }
                });
                if (notificationId) {
                    await RedisCache_1.redisCache.setIdempotency(operation.idempotencyKey, notificationId);
                }
                else {
                    await RedisCache_1.redisCache.releaseIdempotency(operation.idempotencyKey);
                }
                const stats = {
                    sent: delivered.length,
                    failed: failed.length,
                };
                for (const channel of delivered) {
                    stats[`channels:${channel}`] = (stats[`channels:${channel}`] || 0) + 1;
                }
                for (const channel of failed) {
                    stats[`channels_failed:${channel}`] =
                        (stats[`channels_failed:${channel}`] || 0) + 1;
                }
                await RedisCache_1.redisCache.incrementStats(stats);
                console.log(`[NotificationService] Notification sent - ID: ${notificationId}, Delivered: ${delivered.join(", ")}, Failed: ${failed.join(", ")}`);
                return {
                    success: delivered.length > 0,
                    notificationId,
                    channelsDelivered: delivered,
                    channelsFailed: failed,
                    errors: Object.keys(errors).length > 0 ? errors : undefined,
                    timestamp: new Date(),
                };
            }
            catch (error) {
                await RedisCache_1.redisCache.releaseIdempotency(operation.idempotencyKey);
                console.error("[NotificationService] Error sending notification:", error);
                throw error;
            }
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        const needsTransaction = allowedChannels.includes("IN_APP");
        if (needsTransaction) {
            return await db_1.sequelize.transaction(executeInTransaction);
        }
        return executeInTransaction(null);
    }
    async sendToChannel(channel, operation, transaction) {
        const channelHandler = this.channels.get(channel);
        if (!channelHandler) {
            console.warn(`[NotificationService] Channel ${channel} not implemented yet`);
            throw new Error(`Channel ${channel} not implemented`);
        }
        return await channelHandler.send(operation, transaction || undefined);
    }
    async sendBatch(operation) {
        const batchId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const results = new Array(operation.userIds.length);
        for (let start = 0; start < operation.userIds.length; start += NotificationService.BATCH_CONCURRENCY) {
            const slice = operation.userIds.slice(start, start + NotificationService.BATCH_CONCURRENCY);
            const settled = await Promise.allSettled(slice.map((userId) => this.send({
                userId,
                type: operation.type,
                channels: operation.channels,
                template: operation.template,
                data: operation.data,
                priority: operation.priority,
                idempotencyKey: `batch-${batchId}-${userId}`,
                metadata: operation.metadata,
            })));
            settled.forEach((result, offset) => {
                results[start + offset] = result;
            });
        }
        const successful = [];
        const failed = [];
        const errors = {};
        results.forEach((result, index) => {
            const userId = operation.userIds[index];
            if (result.status === "fulfilled" && result.value.success) {
                successful.push(userId);
            }
            else {
                failed.push(userId);
                errors[userId] =
                    result.status === "rejected"
                        ? result.reason.message
                        : "Unknown error";
            }
        });
        return {
            total: operation.userIds.length,
            successful,
            failed,
            errors: Object.keys(errors).length > 0 ? errors : undefined,
            timestamp: new Date(),
        };
    }
    async recipientsForPermission(permissionName) {
        const cached = this.permissionCache.get(permissionName);
        if (cached &&
            Date.now() - cached.at < NotificationService.PERMISSION_CACHE_MS) {
            return cached.userIds;
        }
        const users = await db_1.models.user.findAll({
            include: [
                {
                    model: db_1.models.role,
                    as: "role",
                    include: [
                        {
                            model: db_1.models.permission,
                            as: "permissions",
                            through: { attributes: [] },
                            where: { name: permissionName },
                        },
                    ],
                    required: true,
                },
            ],
            attributes: ["id"],
            raw: true,
        });
        const userIds = users.map((user) => user.id);
        this.permissionCache.set(permissionName, { at: Date.now(), userIds });
        return userIds;
    }
    invalidatePermissionRecipients(permissionName) {
        if (permissionName)
            this.permissionCache.delete(permissionName);
        else
            this.permissionCache.clear();
    }
    async sendToPermission(operation) {
        try {
            const userIds = await this.recipientsForPermission(operation.permissionName);
            return await this.sendBatch({
                userIds,
                type: operation.type,
                channels: operation.channels,
                template: operation.template,
                data: operation.data,
                priority: operation.priority,
                metadata: operation.metadata,
            });
        }
        catch (error) {
            console.error(`[NotificationService] Failed to send to permission ${operation.permissionName}:`, error);
            throw error;
        }
    }
    async getDeliveryStatus(notificationId) {
        return await RedisCache_1.redisCache.getDeliveryStatus(notificationId);
    }
    async getMetrics() {
        return await RedisCache_1.redisCache.getFormattedMetrics();
    }
    async healthCheck() {
        const redisConnected = await RedisCache_1.redisCache.isConnected();
        const metrics = await this.getMetrics();
        return {
            status: redisConnected ? "healthy" : "degraded",
            redis: redisConnected,
            channels: Array.from(this.channels.keys()),
            metrics,
        };
    }
}
exports.NotificationService = NotificationService;
NotificationService.BATCH_CONCURRENCY = Math.max(1, Number(process.env.NOTIFICATION_BATCH_CONCURRENCY) || 5);
NotificationService.PERMISSION_CACHE_MS = 60000;
exports.notificationService = NotificationService.getInstance();
