"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get Queue Statistics",
    description: "Retrieve statistics about the notification email queue",
    operationId: "getQueueStatistics",
    tags: ["Admin", "Notification", "Queue"],
    requiresAuth: true,
    permission: "access.notification.settings",
    responses: {
        200: {
            description: "Queue statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            waiting: { type: "number" },
                            active: { type: "number" },
                            completed: { type: "number" },
                            failed: { type: "number" },
                            delayed: { type: "number" },
                            paused: { type: "boolean" },
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
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching queue statistics");
        const stats = await notification_1.notificationQueue.getStats();
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Queue statistics retrieved");
        return {
            timestamp: new Date().toISOString(),
            queue: {
                waiting: stats.waiting,
                active: stats.active,
                completed: stats.completed,
                failed: stats.failed,
                delayed: stats.delayed,
            },
            health: {
                status: stats.failed > stats.completed * 0.1 ? "degraded" : "healthy",
                totalJobs: stats.waiting + stats.active + stats.completed + stats.failed,
                failureRate: stats.completed > 0
                    ? ((stats.failed / (stats.completed + stats.failed)) * 100).toFixed(2)
                    : "0.00",
            },
        };
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
};
