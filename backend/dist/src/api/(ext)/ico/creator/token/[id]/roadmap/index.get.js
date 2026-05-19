"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Roadmap Items for ICO Offering",
    description: "Retrieves roadmap items for the ICO offering for the authenticated creator.",
    operationId: "getCreatorTokenRoadmap",
    tags: ["ICO", "Creator", "Roadmap"],
    logModule: "ICO",
    logTitle: "Get Token Roadmap",
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
        200: { description: "Roadmap items retrieved successfully." },
        401: { description: "Unauthorized" },
        404: { description: "Roadmap items not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching token roadmap");
    const { id } = params;
    if (!id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No offering ID provided" });
    }
    const roadmapItems = await db_1.models.icoRoadmapItem.findAll({
        where: { offeringId: id },
    });
    if (!roadmapItems) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Roadmap items not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Token roadmap retrieved successfully");
    return roadmapItems.map((rm) => rm.toJSON());
};
