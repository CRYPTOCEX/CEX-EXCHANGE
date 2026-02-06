"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Mark Notification as Unread",
    description: "Marks the specified notification as unread for the authenticated creator.",
    operationId: "markNotificationUnread",
    tags: ["ICO", "Creator", "Notifications"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Mark notification as unread",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Notification ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Notification marked as unread successfully." },
        401: { description: "Unauthorized" },
        404: { description: "Notification not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const notificationId = params.id;
    if (!notificationId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Notification ID missing");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Notification ID is required",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding notification");
    const notification = await db_1.models.notification.findOne({
        where: { id: notificationId, userId: user.id },
    });
    if (!notification) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Notification not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Notification not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Marking notification as unread");
    await notification.update({ read: false });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Notification marked as unread");
    return { message: "Notification marked as unread successfully." };
};
