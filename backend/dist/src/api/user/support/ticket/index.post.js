"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Creates a new support ticket",
    description: "Creates a new support ticket for the currently authenticated user",
    operationId: "createTicket",
    tags: ["Support"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Create support ticket",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        subject: { type: "string", description: "Subject of the ticket" },
                        message: { type: "string", description: "Content of the ticket" },
                        importance: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
                        tags: {
                            type: "array",
                            items: { type: "string" },
                            description: "Ticket tags (optional)",
                        },
                    },
                    required: ["subject", "message", "importance"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("Support Ticket"),
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { subject, message, importance, tags } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating support ticket");
    const ticket = await db_1.models.supportTicket.create({
        userId: user.id,
        subject,
        messages: [
            {
                type: "client",
                text: message,
                time: new Date().toISOString(),
                userId: user.id,
            },
        ],
        importance,
        status: "PENDING",
        type: "TICKET",
        tags: Array.isArray(tags)
            ? tags
            : typeof tags === "string"
                ? tags.split(",").map((t) => t.trim())
                : [],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Support ticket created successfully");
    return ticket.get({ plain: true });
};
