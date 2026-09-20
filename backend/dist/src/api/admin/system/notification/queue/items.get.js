"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get Queue Items",
    description: "Retrieve the notification jobs currently waiting in, or being processed by, the queue",
    operationId: "getQueueItems",
    tags: ["Admin", "Notification", "Queue"],
    requiresAuth: true,
    permission: "access.notification.settings",
    parameters: [
        {
            name: "limit",
            in: "query",
            description: "Maximum number of queue items to return (1-200)",
            schema: {
                type: "number",
                default: 50,
                minimum: 1,
                maximum: 200,
            },
        },
    ],
    responses: {
        200: {
            description: "Queue items retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            timestamp: { type: "string" },
                            total: { type: "number" },
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        userId: { type: "string" },
                                        notificationId: { type: "string" },
                                        title: { type: "string" },
                                        type: { type: "string" },
                                        channels: { type: "array", items: { type: "string" } },
                                        template: { type: "string", nullable: true },
                                        provider: { type: "string" },
                                        attemptsMade: { type: "number" },
                                        queuedAt: { type: "string" },
                                        age: { type: "string" },
                                        status: { type: "string", enum: ["pending", "processing"] },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
};
function formatAge(queuedAt) {
    const queuedMs = new Date(queuedAt).getTime();
    if (!Number.isFinite(queuedMs))
        return "unknown";
    const elapsed = Math.max(0, Date.now() - queuedMs);
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 60)
        return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
}
exports.default = async (data) => {
    var _a, _b, _c;
    const { query, ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching queue items");
        const requested = Number(query === null || query === void 0 ? void 0 : query.limit);
        const limit = Number.isFinite(requested) && requested > 0 ? requested : 50;
        const jobs = await notification_1.notificationQueue.getPendingJobs(limit);
        const items = jobs.map((job) => ({
            ...job,
            age: formatAge(job.queuedAt),
        }));
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Retrieved ${items.length} queue items`);
        return {
            timestamp: new Date().toISOString(),
            total: items.length,
            items,
        };
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
};
