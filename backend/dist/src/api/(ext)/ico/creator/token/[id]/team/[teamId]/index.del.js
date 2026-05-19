"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Delete a Team Member",
    description: "Deletes a team member from the specified ICO offering for the authenticated creator.",
    operationId: "deleteTeamMember",
    tags: ["ICO", "Creator", "Team"],
    requiresAuth: true,
    logModule: "ICO",
    logTitle: "Delete ICO Team Member",
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
            name: "teamId",
            in: "path",
            description: "Team member ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Team member deleted successfully" },
        401: { description: "Unauthorized" },
        404: { description: "Team member not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f;
    const { user, params, ctx } = data;
    const { id, teamId } = params;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Validating request parameters");
    if (!id || !teamId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Offering ID and Team Member ID are required",
        });
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Fetching team member from database");
    const teamMember = await db_1.models.icoTeamMember.findOne({
        where: { id: teamId, offeringId: id },
    });
    if (!teamMember) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Team member not found" });
    }
    const deletedName = teamMember.name;
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Deleting team member");
    await teamMember.destroy();
    (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Creating deletion notification");
    try {
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: id,
            type: "system",
            title: "Team Member Removed",
            message: `Team member "${deletedName}" has been removed successfully.`,
            details: "The selected team member was removed from your ICO offering.",
            link: `/ico/creator/token/${id}?tab=team`,
            actions: [
                {
                    label: "View Team",
                    link: `/ico/creator/token/${id}?tab=team`,
                    primary: true,
                },
            ],
        });
    }
    catch (notifErr) {
        console.error("Failed to create notification for team member deletion", notifErr);
    }
    (_f = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _f === void 0 ? void 0 : _f.call(ctx, "Team member deleted successfully");
    return { message: "Team member deleted successfully" };
};
