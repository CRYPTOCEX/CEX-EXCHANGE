"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
const RedisCache_1 = require("@b/services/notification/cache/RedisCache");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get Notification Metrics",
    description: "Retrieve detailed metrics and analytics for the notification service",
    operationId: "getNotificationMetrics",
    tags: ["Admin", "Notification", "Analytics"],
    requiresAuth: true,
    permission: "access.notification.settings",
    parameters: [
        {
            name: "period",
            in: "query",
            description: "Time period for metrics (hour, day, week, month)",
            schema: {
                type: "string",
                enum: ["hour", "day", "week", "month"],
                default: "day",
            },
        },
    ],
    responses: {
        200: {
            description: "Metrics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            period: { type: "string" },
                            timestamp: { type: "string" },
                            metrics: { type: "object" },
                            channels: { type: "object" },
                            types: { type: "object" },
                            priorities: { type: "object" },
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
    var _a, _b, _c, _d;
    const { query, ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching notification metrics");
        const period = query.period || "day";
        const metrics = await notification_1.notificationService.getMetrics();
        const cacheHitRate = await RedisCache_1.redisCache.getCacheHitRate();
        const byChannel = {};
        const channels = ["IN_APP", "EMAIL", "SMS", "PUSH"];
        for (const channel of channels) {
            const channelSent = metrics.channels[channel] || 0;
            const channelFailed = ((_b = metrics.failedByChannel) === null || _b === void 0 ? void 0 : _b[channel]) || 0;
            const total = channelSent + channelFailed;
            byChannel[channel] = {
                sent: channelSent,
                failed: channelFailed,
                successRate: total > 0 ? ((channelSent / total) * 100).toFixed(2) : "100.00",
            };
        }
        const byType = {};
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Notification metrics retrieved");
        return {
            period,
            timestamp: new Date().toISOString(),
            overview: {
                totalSent: metrics.sent,
                totalFailed: metrics.failed,
                successRate: metrics.successRate,
                cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
            },
            byChannel,
            byType,
        };
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        throw error;
    }
};
