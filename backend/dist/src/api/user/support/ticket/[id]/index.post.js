"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const messages_1 = require("@b/utils/support/messages");
const broadcast_1 = require("@b/utils/support/broadcast");
const ai_hook_1 = require("@b/utils/support/ai-hook");
exports.metadata = {
    summary: "Reply to a support ticket",
    description: "Reply to a support ticket identified by its UUID.",
    operationId: "replyTicket",
    tags: ["Support"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Reply to support ticket",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The UUID of the ticket to reply to",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "The message to send",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        type: { type: "string", enum: ["client", "agent"] },
                        time: { type: "string", format: "date-time" },
                        userId: { type: "string" },
                        text: { type: "string" },
                        attachment: { type: "string" },
                        locale: { type: "string" },
                    },
                    required: ["type", "time", "userId", "text"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Support Ticket"),
};
exports.default = async (data) => {
    const { params, user, body, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)(401, "Unauthorized");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding support ticket");
    const ticket = await db_1.models.supportTicket.findOne({
        where: { id, userId: user.id },
        include: [
            {
                model: db_1.models.user,
                as: "agent",
                attributes: ["avatar", "firstName", "lastName", "lastLogin"],
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["firstName", "lastName", "email"],
            },
        ],
    });
    if (!ticket) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Ticket not found");
        throw (0, error_1.createError)(404, "Ticket not found");
    }
    if (ticket.status === "CLOSED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Ticket is closed");
        throw (0, error_1.createError)(403, "Cannot reply to a closed ticket");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating message");
    const { type, time, userId, text, attachment } = body;
    if (!type || !time || !userId || !text) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid message structure");
        throw (0, error_1.createError)(400, "Invalid message structure");
    }
    if (type !== "client" && type !== "agent") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid message type");
        throw (0, error_1.createError)(400, "Invalid message type");
    }
    if (type === "agent") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Only staff may post as agent");
        throw (0, error_1.createError)(403, "Only staff may post as agent");
    }
    if (userId !== user.id) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized to send message");
        throw (0, error_1.createError)(403, "You are not authorized to send this message");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating ticket with new message");
    const result = await (0, messages_1.appendSupportMessage)(id, {
        type,
        time,
        userId,
        text,
        ...(attachment ? { attachment } : {}),
    }, { status: "OPEN" });
    if (!result.appended) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(result.reason === "closed" ? "Ticket is closed" : "Ticket not found");
        throw (0, error_1.createError)(result.reason === "closed" ? 403 : 404, result.reason === "closed"
            ? "Cannot reply to a closed ticket"
            : "Ticket not found");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting reply via WebSocket");
    (0, broadcast_1.broadcastSupportReply)(id, result.message, "OPEN");
    (0, ai_hook_1.triggerAiSupport)({
        ticketId: id,
        userId: user.id,
        messageKey: result.message.key,
        channel: ticket.type || "TICKET",
        locale: typeof body.locale === "string" ? body.locale : undefined,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Reply sent successfully");
    return {
        message: "Reply sent",
        data: { ...ticket.get({ plain: true }), messages: result.messages, status: "OPEN" },
    };
};
