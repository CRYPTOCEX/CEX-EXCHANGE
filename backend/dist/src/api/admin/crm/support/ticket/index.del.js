"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes support tickets by IDs",
    operationId: "bulkDeleteSupportTickets",
    tags: ["Admin", "CRM", "Support Ticket"],
    parameters: (0, query_1.commonBulkDeleteParams)("Support Tickets"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of support ticket IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Support Tickets"),
    requiresAuth: true,
    permission: "delete.support.ticket",
    logModule: "ADMIN_SUP",
    logTitle: "Bulk delete tickets",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body.ids;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting tickets");
    await (0, query_1.handleBulkDelete)({
        model: "supportTicket",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Tickets deleted successfully");
    return {
        message: "Tickets deleted successfully",
    };
};
