"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Add a Roadmap Item",
    description: "Adds a new roadmap item to the specified ICO offering for the authenticated creator.",
    operationId: "addRoadmapItem",
    tags: ["ICO", "Creator", "Roadmap"],
    requiresAuth: true,
    logModule: "ICO_ROADMAP",
    logTitle: "Add roadmap item",
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
    requestBody: {
        description: "Roadmap item data",
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
        200: { description: "Roadmap item added successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    const offeringId = params.id;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!offeringId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Offering ID is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating roadmap item request");
    const offering = await db_1.models.icoTokenOffering.findOne({
        where: { id: offeringId, userId: user.id },
        include: [
            { model: db_1.models.icoLaunchPlan, as: "plan" },
            { model: db_1.models.icoRoadmapItem, as: "roadmapItems" },
        ],
    });
    if (!offering) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Offering not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking roadmap item limit");
    if (offering.plan &&
        offering.roadmapItems.length >= offering.plan.features.maxRoadmapItems) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Roadmap item limit reached. Upgrade your plan to add more roadmap items.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating roadmap item");
    const { title, description, date, completed } = body;
    await db_1.models.icoRoadmapItem.create({
        offeringId,
        title,
        description,
        date,
        completed,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
    try {
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: offeringId,
            type: "system",
            title: "New Roadmap Item Added",
            message: `New roadmap item "${title}" added successfully.`,
            details: "A new roadmap item has been added to your offering.",
            link: `/ico/creator/token/${offeringId}?tab=roadmap`,
            actions: [
                {
                    label: "View Offering",
                    link: `/ico/creator/token/${offeringId}?tab=roadmap`,
                    primary: true,
                },
            ],
        });
    }
    catch (notifErr) {
        console.error("Failed to create notification for adding roadmap item", notifErr);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Added roadmap item "${title}"`);
    return { message: "Roadmap item added successfully" };
};
