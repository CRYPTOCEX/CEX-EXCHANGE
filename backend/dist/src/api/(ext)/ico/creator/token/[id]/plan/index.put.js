"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Upgrade ICO Offering Plan",
    description: "Updates the launch plan for the specified ICO offering for the authenticated creator.",
    operationId: "upgradeOfferingPlan",
    tags: ["ICO", "Creator", "Plan"],
    requiresAuth: true,
    logModule: "ICO_PLAN",
    logTitle: "Upgrade offering plan",
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
        description: "New plan ID",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        planId: { type: "string" },
                    },
                    required: ["planId"],
                },
            },
        },
    },
    responses: {
        200: { description: "Plan upgraded successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Offering not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    const offeringId = params.id;
    const { planId } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!offeringId || !planId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Offering ID and planId are required",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating plan upgrade request");
    const offering = await db_1.models.icoTokenOffering.findOne({
        where: { id: offeringId, userId: user.id },
    });
    if (!offering) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Offering not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating offering plan");
    await offering.update({ planId });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
    try {
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: offering.id,
            type: "system",
            title: "ICO Offering Plan Upgraded",
            message: `Your ICO offering "${offering.name}" has been upgraded successfully.`,
            details: "Your offering plan has been updated to the new plan. Please check your dashboard to review the updated features and benefits.",
            link: `/ico/creator/token/${offering.id}`,
            actions: [
                {
                    label: "View Offering",
                    link: `/ico/creator/token/${offering.id}`,
                    primary: true,
                },
            ],
        });
    }
    catch (notifErr) {
        console.error("Failed to create notification for plan upgrade", notifErr);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Upgraded plan for offering "${offering.name}"`);
    return { message: "Plan upgraded successfully" };
};
