"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const Websocket_1 = require("@b/handler/Websocket");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
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
    const newMessage = {
        type: sender === "user" ? "client" : "agent",
        text: content,
        time: new Date().toISOString(),
        userId: user.id,
    };
    await ticket.reload();
    let currentMessages = [];
    if (ticket.messages) {
        if (Array.isArray(ticket.messages)) {
            currentMessages = [...ticket.messages];
        }
        else if (typeof ticket.messages === 'string') {
            try {
                const parsed = JSON.parse(ticket.messages);
                currentMessages = Array.isArray(parsed) ? parsed : [];
            }
            catch (e) {
                console_1.logger.error("SUPPORT", "Live Chat - Failed to parse messages JSON", e);
                currentMessages = [];
            }
        }
    }
    currentMessages.push(newMessage);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating ticket with new message");
    await db_1.sequelize.query('UPDATE support_ticket SET messages = :messages, updatedAt = :updatedAt WHERE id = :id', {
        replacements: {
            messages: JSON.stringify(currentMessages),
            updatedAt: new Date(),
            id: sessionId
        }
    });
    if (ticket.status === "PENDING") {
        await ticket.update({ status: "OPEN" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting message via WebSocket");
    try {
        await ticket.reload();
        const ticketData = ticket.get({ plain: true });
        ticketData.messages = currentMessages;
        Websocket_1.messageBroker.broadcastToSubscribedClients("/api/user/support/ticket", { id: sessionId }, {
            method: "reply",
            payload: {
                id: sessionId,
                message: newMessage,
                status: ticket.status,
                updatedAt: new Date(),
            }
        });
    }
    catch (error) {
        console_1.logger.error("SUPPORT", "Failed to broadcast message", error);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Message sent successfully");
    return { success: true, message: "Message sent successfully" };
};
