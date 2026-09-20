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
    summary: "Bulk updates the status of support tickets",
    operationId: "bulkUpdateSupportTicketsStatusImportance",
    tags: ["Admin", "CRM", "Support Ticket"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of support ticket IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            description: "New status to apply to support tickets",
                            enum: ["PENDING", "OPEN", "REPLIED", "CLOSED"],
                        },
                        reason: {
                            type: "string",
                            description: "Why the status changed. Appended to each ticket's conversation as an agent message so the customer sees it, and picked up by the audit trail.",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("SupportTicket"),
    requiresAuth: true,
    permission: "edit.support.ticket",
    logModule: "ADMIN_SUP",
    logTitle: "Bulk update ticket status",
};
exports.default = async (data) => {
    var _a;
    const { body, user, ctx } = data;
    const { ids, status, reason } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No tickets selected" });
    }
    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating ${ids.length} tickets to ${status}`);
    const tickets = await db_1.models.supportTicket.findAll({ where: { id: ids } });
    if (tickets.length === 0) {
        throw (0, error_1.createError)({ statusCode: 404, message: "No tickets found" });
    }
    const senderName = [user === null || user === void 0 ? void 0 : user.firstName, user === null || user === void 0 ? void 0 : user.lastName].filter(Boolean).join(" ") || "Support";
    const now = new Date().toISOString();
    let updated = 0;
    for (const ticket of tickets) {
        if (trimmedReason) {
            const result = await (0, messages_1.appendSupportMessage)(ticket.id, {
                type: "agent",
                time: now,
                userId: (_a = user === null || user === void 0 ? void 0 : user.id) !== null && _a !== void 0 ? _a : undefined,
                senderName,
                text: trimmedReason,
                system: true,
            }, {
                status,
                rejectIfClosed: false,
            });
            if (!result.appended)
                continue;
            updated++;
            (0, broadcast_1.broadcastSupportReply)(ticket.id, result.message, status);
        }
        else {
            await ticket.update({ status });
            updated++;
            (0, broadcast_1.broadcastSupportUpdate)(ticket.id, { status });
        }
        if (status === "CLOSED")
            (0, ai_hook_1.notifyTicketClosed)(ticket.id);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${updated} tickets updated`);
    return {
        message: `${updated} ticket${updated === 1 ? "" : "s"} updated to ${status}.`,
        updated,
    };
};
