"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Delete All Notifications",
    description: "Deletes all notifications for the authenticated creator.",
    operationId: "deleteAllNotifications",
    tags: ["ICO", "Creator", "Notifications"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Delete all notifications",
    responses: {
        200: { description: "All notifications deleted successfully." },
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting all notifications");
    await db_1.models.notification.destroy({
        where: { userId: user.id },
        force: true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("All notifications deleted successfully");
    return { message: "All notifications deleted successfully." };
};
