"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Update a Roadmap Item",
    description: "Updates a roadmap item of a specified ICO offering for the authenticated creator.",
    operationId: "updateRoadmapItem",
    tags: ["ICO", "Creator", "Roadmap"],
    requiresAuth: true,
    logModule: "ICO_ROADMAP",
    logTitle: "Update roadmap item",
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
    requestBody: {
        description: "Updated roadmap item data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        date: { type: "string" },
                        completed: { type: "boolean" },
                    },
                    required: ["title", "description", "date"],
                },
            },
        },
    },
    responses: {
        200: { description: "Roadmap item updated successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Roadmap item not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    const { id, roadmapId } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!id || !roadmapId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Offering ID and Roadmap Item ID are required",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating roadmap update request");
    const roadmapItem = await db_1.models.icoRoadmapItem.findOne({
        where: { id: roadmapId, offeringId: id },
    });
    if (!roadmapItem) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Roadmap item not found" });
    }
    const oldTitle = roadmapItem.title;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating roadmap item");
    await roadmapItem.update(body);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
    try {
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: id,
            type: "system",
            title: "Roadmap Item Updated",
            message: `Roadmap item "${body.title}" updated successfully.`,
            details: `The roadmap item has been updated.${oldTitle !== body.title
                ? ` Title changed from "${oldTitle}" to "${body.title}".`
                : ""}`,
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
        console.error("Failed to create update notification", notifErr);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated roadmap item "${body.title}"`);
    return { message: "Roadmap item updated successfully" };
};
