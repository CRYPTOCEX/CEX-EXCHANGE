"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
const RedisCache_1 = require("@b/services/notification/cache/RedisCache");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Notification Service Health Check",
    description: "Get health status and metrics for the notification service",
    tags: ["Admin", "Notification", "Monitoring"],
    requiresAuth: true,
    permission: "access.notification.settings",
    responses: {
        200: {
            description: "Health status retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: { type: "string" },
                            timestamp: { type: "string" },
                            components: { type: "object" },
                            uptime: { type: "number" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Checking notification service health");
        const health = await notification_1.notificationService.healthCheck();
        const cacheHitRate = await RedisCache_1.redisCache.getCacheHitRate();
        const queueStats = await notification_1.notificationQueue.getStats();
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Health check completed");
        return {
            status: health.status,
            timestamp: new Date().toISOString(),
            components: {
                redis: {
                    connected: health.redis,
                    cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
                },
                channels: {
                    available: health.channels,
                    total: health.channels.length,
                },
                emailQueue: {
                    waiting: queueStats.waiting,
                    active: queueStats.active,
                    completed: queueStats.completed,
                    failed: queueStats.failed,
                    delayed: queueStats.delayed,
                },
                metrics: health.metrics,
            },
            uptime: process.uptime(),
        };
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
};
