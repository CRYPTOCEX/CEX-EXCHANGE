"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
const RedisCache_1 = require("@b/services/notification/cache/RedisCache");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Notification Service Dashboard",
    description: "Get comprehensive overview of notification service status and metrics",
    operationId: "getNotificationDashboard",
    tags: ["Admin", "Notification", "Dashboard"],
    requiresAuth: true,
    permission: "access.notification.settings",
    responses: {
        200: {
            description: "Dashboard data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: { type: "string" },
                            timestamp: { type: "string" },
                            health: { type: "object" },
                            metrics: { type: "object" },
                            queue: { type: "object" },
                            channels: { type: "object" },
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
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching notification service dashboard");
        const health = await notification_1.notificationService.healthCheck();
        const metrics = await notification_1.notificationService.getMetrics();
        const cacheHitRate = await RedisCache_1.redisCache.getCacheHitRate();
        const queueStats = await notification_1.notificationQueue.getStats();
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Dashboard data retrieved");
        return {
            status: health.status,
            timestamp: new Date().toISOString(),
            health: {
                overall: health.status,
                redis: health.redis,
                channels: health.channels,
            },
            metrics: {
                totalSent: metrics.sent,
                totalFailed: metrics.failed,
                successRate: metrics.successRate,
                cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
            },
            queue: {
                waiting: queueStats.waiting,
                active: queueStats.active,
                completed: queueStats.completed,
                failed: queueStats.failed,
                delayed: queueStats.delayed,
                health: queueStats.failed > queueStats.completed * 0.1 ? "degraded" : "healthy",
            },
            channels: {
                available: health.channels,
                total: health.channels.length,
                breakdown: {
                    IN_APP: metrics.channels.IN_APP || 0,
                    EMAIL: metrics.channels.EMAIL || 0,
                    SMS: metrics.channels.SMS || 0,
                    PUSH: metrics.channels.PUSH || 0,
                },
            },
            uptime: process.uptime(),
        };
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
};
