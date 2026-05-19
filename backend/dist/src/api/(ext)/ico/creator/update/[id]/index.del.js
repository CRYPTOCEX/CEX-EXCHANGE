"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Delete a Token Offering Update",
    description: "Deletes an update for a token offering by the authenticated creator.",
    operationId: "deleteTokenOfferingUpdate",
    tags: ["ICO", "Creator", "Updates"],
    requiresAuth: true,
    logModule: "ICO",
    logTitle: "Delete ICO Token Offering Update",
    parameters: [
        {
            index: 0,
            name: "updateId",
            in: "path",
            description: "Token offering update ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Token offering update deleted successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: { message: { type: "string" } },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        404: { description: "Not Found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const { user, params, ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Validating update ID parameter");
    const { updateId } = params;
    if (!updateId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing update ID" });
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Fetching update record from database");
    const updateRecord = await db_1.models.icoTokenOfferingUpdate.findByPk(updateId);
    if (!updateRecord) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Update not found" });
    }
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Verifying user ownership");
    if (updateRecord.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Forbidden" });
    }
    const deletedTitle = updateRecord.title;
    (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Deleting update record");
    await updateRecord.destroy();
    (_f = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _f === void 0 ? void 0 : _f.call(ctx, "Creating deletion notification");
    try {
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: updateRecord.offeringId,
            type: "system",
            title: "Update Deleted",
            message: `Token offering update "${deletedTitle}" has been deleted successfully.`,
            details: "Your update has been removed. You can always add new updates to keep your investors informed.",
            link: updateRecord.offeringId
                ? `/ico/creator/token/${updateRecord.offeringId}?tab=updates`
                : undefined,
            actions: updateRecord.offeringId
                ? [
                    {
                        label: "View Offering",
                        link: `/ico/creator/token/${updateRecord.offeringId}?tab=updates`,
                        primary: true,
                    },
                ]
                : [],
        });
    }
    catch (notifErr) {
        console.error("Failed to create notification for update deletion", notifErr);
    }
    (_g = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _g === void 0 ? void 0 : _g.call(ctx, "Update deleted successfully");
    return { message: "Update deleted successfully." };
};
