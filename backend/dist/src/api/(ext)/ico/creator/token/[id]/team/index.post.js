"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Add a Team Member to an ICO Offering",
    description: "Adds a new team member to the specified ICO offering for the authenticated creator.",
    operationId: "addTeamMember",
    tags: ["ICO", "Creator", "Team"],
    requiresAuth: true,
    logModule: "ICO_TEAM",
    logTitle: "Add team member",
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
        description: "Team member data",
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
        200: {
            description: "Team member added successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: { message: { type: "string" } },
                    },
                },
            },
        },
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating team member request");
    const offering = await db_1.models.icoTokenOffering.findOne({
        where: { id: offeringId, userId: user.id },
        include: [
            { model: db_1.models.icoLaunchPlan, as: "plan" },
            { model: db_1.models.icoTeamMember, as: "teamMembers" },
        ],
    });
    if (!offering) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Offering not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking team member limit");
    if (offering.plan &&
        offering.teamMembers.length >= offering.plan.features.maxTeamMembers) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Team member limit reached. Upgrade your plan to add more team members.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating team member record");
    await db_1.models.icoTeamMember.create({
        ...body,
        offeringId,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
    try {
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: offeringId,
            type: "system",
            title: "New Team Member Added",
            message: `New team member "${body.name}" added successfully.`,
            details: "A new team member has been added to your ICO offering.",
            link: `/ico/creator/token/${offeringId}?tab=team`,
            actions: [
                {
                    label: "View Team",
                    link: `/ico/creator/token/${offeringId}?tab=team`,
                    primary: true,
                },
            ],
        });
    }
    catch (notifErr) {
        console.error("Failed to create notification for team member addition", notifErr);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Added team member "${body.name}"`);
    return { message: "Team member added successfully" };
};
