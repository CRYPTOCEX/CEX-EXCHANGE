"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status and importance of support tickets",
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
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating ticket status");
    const result = await (0, query_1.updateStatus)("supportTicket", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Ticket status updated");
    return result;
};
