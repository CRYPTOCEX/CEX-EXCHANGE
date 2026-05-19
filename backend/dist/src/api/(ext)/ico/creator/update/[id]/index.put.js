"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
exports.metadata = {
    summary: "Edit a Token Offering Update",
    description: "Edits an existing update for a token offering by the authenticated creator.",
    operationId: "editTokenOfferingUpdate",
    tags: ["ICO", "Creator", "Updates"],
    requiresAuth: true,
    logModule: "ICO_UPDATE",
    logTitle: "Edit offering update",
    parameters: [
        {
            index: 0,
            name: "updateId",
            in: "path",
            description: "Token offering update ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Updated token offering update data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
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
                    required: ["title", "content"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Token offering update updated successfully.",
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
        404: { description: "Update not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating update edit request");
    const { updateId } = params;
    if (!updateId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing update ID" });
    }
    const { title, content, attachments } = body;
    if (!title || !content) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required fields" });
    }
    const updateRecord = await db_1.models.icoTokenOfferingUpdate.findByPk(updateId);
    if (!updateRecord) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Update not found" });
    }
    if (updateRecord.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Forbidden" });
    }
    const oldTitle = updateRecord.title;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating offering update record");
    await updateRecord.update({
        title,
        content,
        attachments: attachments || [],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
    try {
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: updateRecord.offeringId,
            type: "system",
            title: "Update Updated",
            message: `Token offering update "${title}" updated successfully.`,
            details: `Your update has been modified.${oldTitle !== title ? ` Title changed from "${oldTitle}" to "${title}".` : ""}`,
            link: updateRecord.offeringId
                ? `/ico/creator/token/${updateRecord.offeringId}?tab=updates`
                : undefined,
            actions: updateRecord.offeringId
                ? [
                    {
                        label: "View Update",
                        link: `/ico/creator/token/${updateRecord.offeringId}?tab=updates`,
                        primary: true,
                    },
                ]
                : [],
        });
    }
    catch (notifErr) {
        console.error("Failed to create notification for update edit", notifErr);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Edited update "${title}"`);
    return { message: "Update updated successfully.", update: updateRecord };
};
