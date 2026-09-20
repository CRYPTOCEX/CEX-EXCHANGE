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
    summary: "Send a message in live chat session",
    description: "Sends a message to the live chat session",
    operationId: "sendLiveChatMessage",
    tags: ["Support"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Send live chat message",
    requestBody: {
        description: "The message to send",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        sessionId: { type: "string" },
                        content: { type: "string" },
                        sender: { type: "string", enum: ["user", "agent"] },
                        locale: { type: "string" },
                        attachment: { type: "string" },
                        imageUrl: { type: "string" },
                    },
                    required: ["sessionId", "content", "sender"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Live Chat Message"),
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { sessionId, content, sender } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding live chat session");
    const ticket = await db_1.models.supportTicket.findOne({
        where: {
            id: sessionId,
            userId: user.id,
            type: "LIVE",
        },
    });
    if (!ticket) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Live chat session not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Live chat session not found" });
    }
    if (ticket.status === "CLOSED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Session is closed");
        throw (0, error_1.createError)({ statusCode: 403, message: "Cannot send message to closed session" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating ticket with new message");
    const attachment = typeof body.attachment === "string" && body.attachment
        ? body.attachment
        : typeof body.imageUrl === "string" && body.imageUrl
            ? body.imageUrl
            : undefined;
    const result = await (0, messages_1.appendSupportMessage)(sessionId, {
        type: "client",
        text: content,
        time: new Date().toISOString(),
        userId: user.id,
        ...(attachment ? { attachment } : {}),
    }, { status: "OPEN" });
    if (!result.appended) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(result.reason === "closed" ? "Session is closed" : "Session not found");
        throw (0, error_1.createError)({
            statusCode: result.reason === "closed" ? 403 : 404,
            message: result.reason === "closed"
                ? "Cannot send message to closed session"
                : "Live chat session not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting message via WebSocket");
    (0, broadcast_1.broadcastSupportReply)(sessionId, result.message, "OPEN");
    (0, ai_hook_1.triggerAiSupport)({
        ticketId: sessionId,
        userId: user.id,
        messageKey: result.message.key,
        channel: "LIVE",
        locale: typeof body.locale === "string" ? body.locale : undefined,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Message sent successfully");
    return { success: true, message: "Message sent successfully" };
};
