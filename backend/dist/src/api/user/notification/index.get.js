"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Notifications for Creator",
    description: "Retrieves notifications for the authenticated creator along with aggregated statistics.",
    operationId: "getCreatorNotifications",
    tags: ["ICO", "Creator", "Notifications"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Notifications retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            notifications: { type: "array", items: { type: "object" } },
                            stats: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    unread: { type: "number" },
                                    types: {
                                        type: "object",
                                        properties: {
                                            investment: { type: "number" },
                                            message: { type: "number" },
                                            alert: { type: "number" },
                                            system: { type: "number" },
                                            user: { type: "number" },
                                        },
                                    },
                                    trend: {
                                        type: "object",
                                        properties: {
                                            percentage: { type: "number" },
                                            increasing: { type: "boolean" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching notifications");
    const notifications = await db_1.models.notification.findAll({
        where: { userId: user.id },
        order: [["createdAt", "DESC"]],
        raw: true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating statistics");
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.read).length;
    const typeCounts = notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
    }, {});
    const stats = {
        total,
        unread,
        types: {
            investment: typeCounts.investment || 0,
            message: typeCounts.message || 0,
            alert: typeCounts.alert || 0,
            system: typeCounts.system || 0,
            user: typeCounts.user || 0,
        },
        trend: {
            percentage: 0,
            increasing: true,
        },
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${total} notifications (${unread} unread)`);
    return { notifications, stats };
};
