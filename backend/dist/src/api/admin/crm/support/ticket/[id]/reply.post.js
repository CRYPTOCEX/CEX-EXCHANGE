"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const messages_1 = require("@b/utils/support/messages");
const first_reply_1 = require("@b/utils/support/first-reply");
const broadcast_1 = require("@b/utils/support/broadcast");
const ai_hook_1 = require("@b/utils/support/ai-hook");
const notify_1 = require("@b/utils/support/notify");
exports.metadata = {
    summary: "Admin reply to a support ticket",
    description: "Admin reply to a support ticket identified by its UUID.",
    operationId: "adminReplyTicket",
    tags: ["Admin", "CRM", "Support Ticket"],
    requiresAuth: true,
    permission: "edit.support.ticket",
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
    logModule: "ADMIN_SUP",
    logTitle: "Reply to ticket",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, user, body, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching ticket");
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
                attributes: ["id", "firstName", "lastName", "email"],
            },
        ],
    });
    if (!ticket) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Ticket not found");
        throw (0, error_1.createError)(404, "Ticket not found");
    }
    if (ticket.status === "CLOSED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Cannot reply to closed ticket");
        throw (0, error_1.createError)(403, "Cannot reply to a closed ticket");
    }
    const { type, time, userId, text, attachment } = body;
    if (!type || !time || !userId || !text) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid message structure");
        throw (0, error_1.createError)(400, "Invalid message structure");
    }
    const messageType = "agent";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching admin user info");
    const adminUser = await db_1.models.user.findByPk(user.id);
    const senderName = adminUser && (adminUser.firstName || adminUser.lastName)
        ? [adminUser.firstName, adminUser.lastName].filter(Boolean).join(" ")
        : (adminUser === null || adminUser === void 0 ? void 0 : adminUser.email) || "Support Agent";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing reply message");
    const currentMessages = (0, messages_1.readMessages)(ticket.messages);
    const isFirstAgentReply = (0, first_reply_1.isFirstHumanAgentReply)(currentMessages);
    if (!ticket.agentId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Auto-assigning agent");
        ticket.agentId = user.id;
        ticket.agentName = senderName;
    }
    const agentProfile = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
    };
    const newMessage = {
        type: messageType,
        time,
        userId: user.id,
        text,
        senderName,
        agentProfile,
        ...(attachment ? { attachment } : {}),
    };
    if (ticket.responseTime == null && isFirstAgentReply) {
        const ticketCreated = new Date(ticket.createdAt);
        const replyTime = new Date(time);
        ticket.responseTime = Math.max(0, Math.round((replyTime.getTime() - ticketCreated.getTime()) / 60000));
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating ticket");
    const result = await (0, messages_1.appendSupportMessage)(id, newMessage, {
        status: "REPLIED",
        extraFields: {
            ...(ticket.agentId
                ? { agentId: ticket.agentId, agentName: ticket.agentName }
                : {}),
            ...(ticket.responseTime != null ? { responseTime: ticket.responseTime } : {}),
        },
    });
    if (!result.appended) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(result.reason === "closed" ? "Cannot reply to closed ticket" : "Ticket not found");
        throw (0, error_1.createError)(result.reason === "closed" ? 403 : 404, result.reason === "closed"
            ? "Cannot reply to a closed ticket"
            : "Ticket not found");
    }
    (0, ai_hook_1.humanTookOver)(id, user.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting to clients");
    (0, broadcast_1.broadcastSupportReply)(id, result.message, "REPLIED");
    await (0, notify_1.notifySupportMessage)({
        ticketId: String((_a = ticket.id) !== null && _a !== void 0 ? _a : id),
        recipient: (_b = ticket.user) !== null && _b !== void 0 ? _b : {},
        senderName: senderName || "Support",
        message: text,
        ctx,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Reply sent successfully");
    return {
        message: "Reply sent successfully",
        data: { ...ticket.get({ plain: true }), messages: result.messages, status: "REPLIED" },
    };
};
