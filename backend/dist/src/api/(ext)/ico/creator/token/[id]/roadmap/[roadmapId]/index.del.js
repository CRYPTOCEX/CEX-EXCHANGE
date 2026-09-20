"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Delete a Roadmap Item",
    description: "Deletes a roadmap item from the specified ICO offering for the authenticated creator.",
    operationId: "deleteRoadmapItem",
    tags: ["ICO", "Creator", "Roadmap"],
    requiresAuth: true,
    logModule: "ICO",
    logTitle: "Delete ICO Roadmap Item",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ICO offering ID",
            required: true,
            schema: { type: "string" },
        },
        {
            index: 1,
            name: "roadmapId",
            in: "path",
            description: "Roadmap item ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Roadmap item deleted successfully" },
        401: { description: "Unauthorized" },
        404: { description: "Roadmap item not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f;
    const { user, params, ctx } = data;
    const { id, roadmapId } = params;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Validating request parameters");
    if (!id || !roadmapId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Offering ID and Roadmap Item ID are required",
        });
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Fetching roadmap item from database");
    const roadmapItem = await db_1.models.icoRoadmapItem.findOne({
        where: { id: roadmapId, offeringId: id },
    });
    if (!roadmapItem) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Roadmap item not found" });
    }
    const deletedTitle = roadmapItem.title;
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Deleting roadmap item");
    await roadmapItem.destroy();
    (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Creating deletion notification");
    try {
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: id,
            type: "system",
            title: "Roadmap Item Deleted",
            message: `Roadmap item "${deletedTitle}" deleted successfully.`,
            details: "The selected roadmap item has been removed from your offering.",
            link: `/ico/creator/token/${id}?tab=roadmap`,
            actions: [
                {
                    label: "View Offering",
                    link: `/ico/creator/token/${id}?tab=roadmap`,
                    primary: true,
                },
            ],
        });
    }
    catch (notifErr) {
        console.error("Failed to create deletion notification", notifErr);
    }
    (_f = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _f === void 0 ? void 0 : _f.call(ctx, "Roadmap item deleted successfully");
    return { message: "Roadmap item deleted successfully" };
};
