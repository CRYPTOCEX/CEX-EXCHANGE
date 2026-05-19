"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Update a Team Member",
    description: "Updates a team member of a specified ICO offering for the authenticated creator.",
    operationId: "updateTeamMember",
    tags: ["ICO", "Creator", "Team"],
    requiresAuth: true,
    logModule: "ICO_TEAM",
    logTitle: "Update team member",
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
    requestBody: {
        description: "Updated team member data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        role: { type: "string" },
                        bio: { type: "string" },
                        avatar: { type: "string" },
                        linkedin: { type: "string" },
                        twitter: { type: "string" },
                        website: { type: "string" },
                        github: { type: "string" },
                    },
                    required: ["name", "role", "bio"],
                },
            },
        },
    },
    responses: {
        200: { description: "Team member updated successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Team member not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    const { id, teamId } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!id || !teamId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Offering ID and Team Member ID are required",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating team member update request");
    const teamMember = await db_1.models.icoTeamMember.findOne({
        where: { id: teamId, offeringId: id },
    });
    if (!teamMember) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Team member not found" });
    }
    const oldName = teamMember.name;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating team member record");
    await teamMember.update(body);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
    try {
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: id,
            type: "system",
            title: "Team Member Updated",
            message: `Team member "${body.name}" updated successfully.`,
            details: `The team member details have been updated.${oldName !== body.name ? ` Name changed from "${oldName}" to "${body.name}".` : ""}`,
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
        console.error("Failed to create update notification for team member", notifErr);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated team member "${body.name}"`);
    return { message: "Team member updated successfully" };
};
