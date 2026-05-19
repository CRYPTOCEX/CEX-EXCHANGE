"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const Websocket_1 = require("@b/handler/Websocket");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
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
    const ticket = await db_1.models.supportTicket.findByPk(id, {
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
    if (userId !== user.id) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized to send message");
        throw (0, error_1.createError)(403, "You are not authorized to send this message");
    }
    let isFirstAgentReply = false;
    if (type === "agent" && !ticket.agentId) {
        ticket.agentId = user.id;
        const agentUser = await db_1.models.user.findByPk(user.id);
        ticket.agentName =
            agentUser && (agentUser.firstName || agentUser.lastName)
                ? [agentUser.firstName, agentUser.lastName].filter(Boolean).join(" ")
                : (agentUser === null || agentUser === void 0 ? void 0 : agentUser.email) || "";
        isFirstAgentReply = true;
    }
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
                console_1.logger.error("SUPPORT", "Failed to parse messages JSON", e);
                currentMessages = [];
            }
        }
    }
    const newMessage = {
        type,
        time,
        userId,
        text,
        ...(attachment ? { attachment } : {}),
    };
    currentMessages.push(newMessage);
    if (type === "agent" && !ticket.responseTime && isFirstAgentReply) {
        const ticketCreated = new Date(ticket.createdAt);
        const replyTime = new Date(time);
        ticket.responseTime = Math.round((replyTime.getTime() - ticketCreated.getTime()) / 60000);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating ticket with new message");
    await ticket.update({
        messages: currentMessages,
        status: type === "client" ? "REPLIED" : "OPEN",
        ...(isFirstAgentReply && { agentId: ticket.agentId, agentName: ticket.agentName }),
        ...(ticket.responseTime && { responseTime: ticket.responseTime }),
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting reply via WebSocket");
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/user/support/ticket`, { id }, {
        method: "reply",
        data: {
            message: { type, time, userId, text, attachment },
            status: ticket.status,
            updatedAt: new Date(),
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Reply sent successfully");
    return { message: "Reply sent", data: ticket.get({ plain: true }) };
};
