"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const Websocket_1 = require("@b/handler/Websocket");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a support ticket",
    operationId: "updateSupportTicketStatus",
    tags: ["Admin", "CRM", "Support Ticket"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the support ticket to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            description: "New status to apply",
                            enum: ["PENDING", "OPEN", "REPLIED", "CLOSED"],
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Support Ticket"),
    requiresAuth: true,
    permission: "edit.support.ticket",
    logModule: "ADMIN_SUP",
    logTitle: "Update ticket status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting status update to clients");
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/user/support/ticket/${id}`, { id }, {
        method: "update",
        data: {
            status,
            updatedAt: new Date(),
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating ticket status");
    const result = await (0, query_1.updateStatus)("supportTicket", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Ticket status updated");
    return result;
};
