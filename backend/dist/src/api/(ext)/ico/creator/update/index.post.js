"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Create a Token Offering Update",
    description: "Creates a new update for a token offering by the authenticated creator.",
    operationId: "createTokenOfferingUpdate",
    tags: ["ICO", "Creator", "Updates"],
    requiresAuth: true,
    logModule: "ICO_UPDATE",
    logTitle: "Create offering update",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        tokenId: { type: "string", description: "Token offering ID" },
                        title: { type: "string" },
                        content: { type: "string" },
                        attachments: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    type: { type: "string", enum: ["image", "document", "link"] },
                                    url: { type: "string" },
                                    name: { type: "string" },
                                },
                            },
                        },
                    },
                    required: ["tokenId", "title", "content"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Token offering update created successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            update: { type: "object" },
                        },
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
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating update request");
    const { tokenId, title, content, attachments } = body;
    if (!tokenId || !title || !content) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required fields" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating offering update");
    const update = await db_1.models.icoTokenOfferingUpdate.create({
        offeringId: tokenId,
        userId: user.id,
        title,
        content,
        attachments: attachments || [],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
    try {
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: tokenId,
            type: "system",
            title: "New Update Created",
            message: `New update "${title}" created successfully.`,
            details: "Your token offering update has been posted and is now visible to your investors.",
            link: `/ico/creator/token/${tokenId}?tab=updates`,
            actions: [
                {
                    label: "View Update",
                    link: `/ico/creator/token/${tokenId}?tab=updates`,
                    primary: true,
                },
            ],
        });
    }
    catch (notifErr) {
        console.error("Failed to create notification for update creation", notifErr);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Created update "${title}"`);
    return { message: "Update created successfully.", update };
};
