"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk assigns or unassigns an agent across support tickets",
    operationId: "bulkAssignSupportTicketAgent",
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
                            description: "Support ticket ids to (un)assign",
                            items: { type: "string" },
                        },
                        agentId: {
                            type: "string",
                            nullable: true,
                            description: "Agent to assign, or null to unassign",
                        },
                        reason: {
                            type: "string",
                            description: "Optional note explaining the reassignment. Recorded in the audit trail.",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("SupportTicket"),
    requiresAuth: true,
    permission: "edit.support.ticket",
    logModule: "ADMIN_SUP",
    logTitle: "Bulk assign ticket agent",
};
exports.default = async (data) => {
    var _a, _b;
    const { body, ctx } = data;
    const { ids, agentId } = body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No tickets selected" });
    }
    let agentName = null;
    if (agentId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying agent");
        const agent = await db_1.models.user.findOne({
            where: { id: agentId },
            attributes: ["id", "firstName", "lastName"],
        });
        if (!agent) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Agent not found" });
        }
        agentName = `${(_a = agent.firstName) !== null && _a !== void 0 ? _a : ""} ${(_b = agent.lastName) !== null && _b !== void 0 ? _b : ""}`.trim() || null;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Assigning ${ids.length} tickets`);
    const [updated] = await db_1.models.supportTicket.update({
        agentId: agentId || null,
        agentName,
        status: agentId ? "OPEN" : "PENDING",
    }, { where: { id: ids, status: ["PENDING", "OPEN", "REPLIED"] } });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${updated} tickets assigned`);
    return {
        message: agentId
            ? `${updated} ticket${updated === 1 ? "" : "s"} assigned to ${agentName !== null && agentName !== void 0 ? agentName : "agent"}.`
            : `${updated} ticket${updated === 1 ? "" : "s"} unassigned.`,
        updated,
    };
};
