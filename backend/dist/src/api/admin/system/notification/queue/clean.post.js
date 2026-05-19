"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Clean Queue Jobs",
    description: "Remove old completed and failed jobs from the notification queue",
    operationId: "cleanQueueJobs",
    tags: ["Admin", "Notification", "Queue"],
    requiresAuth: true,
    permission: "access.notification.settings",
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        olderThan: {
                            type: "number",
                            description: "Remove jobs older than this many milliseconds (default: 24 hours)",
                            default: 86400000,
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Queue cleaned successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            removed: { type: "object" },
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
    const { body, ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Cleaning old queue jobs");
        const olderThan = (body === null || body === void 0 ? void 0 : body.olderThan) || 86400000;
        const removedJobIds = await notification_1.notificationQueue.cleanOldJobs(olderThan);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Cleaned ${removedJobIds.length} jobs from queue`);
        return {
            success: true,
            message: "Queue cleaned successfully",
            removed: {
                total: removedJobIds.length,
                jobIds: removedJobIds.slice(0, 10),
            },
            olderThan: `${(olderThan / 3600000).toFixed(1)} hours`,
        };
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
};
