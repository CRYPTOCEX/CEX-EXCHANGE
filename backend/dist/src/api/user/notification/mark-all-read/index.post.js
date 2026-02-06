"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Mark All Notifications as Read",
    description: "Marks all notifications as read for the authenticated creator.",
    operationId: "markAllNotificationsRead",
    tags: ["ICO", "Creator", "Notifications"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Mark all notifications as read",
    responses: {
        200: { description: "All notifications marked as read successfully." },
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Marking all notifications as read");
    await db_1.models.notification.update({ read: true }, { where: { userId: user.id } });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("All notifications marked as read");
    return { message: "All notifications marked as read successfully." };
};
