"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Team Members for ICO Offering",
    description: "Retrieves team members for the ICO offering for the authenticated creator.",
    operationId: "getCreatorTokenTeam",
    tags: ["ICO", "Creator", "Team"],
    logModule: "ICO",
    logTitle: "Get Token Team",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ICO offering ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Team members retrieved successfully." },
        401: { description: "Unauthorized" },
        404: { description: "Team members not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching token team");
    const { id } = params;
    if (!id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No offering ID provided" });
    }
    const teamMembers = await db_1.models.icoTeamMember.findAll({
        where: { offeringId: id },
    });
    if (!teamMembers) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Team members not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Token team retrieved successfully");
    return teamMembers.map((tm) => tm.toJSON());
};
