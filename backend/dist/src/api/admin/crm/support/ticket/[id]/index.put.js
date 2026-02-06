"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const Websocket_1 = require("@b/handler/Websocket");
exports.metadata = {
    summary: "Updates an existing support ticket",
    operationId: "updateSupportTicket",
    tags: ["Admin", "CRM", "Support Ticket"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the support ticket to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the support ticket",
        content: {
            "application/json": {
                schema: utils_1.supportTicketUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Support Ticket"),
    requiresAuth: true,
    permission: "edit.support.ticket",
    logModule: "ADMIN_SUP",
    logTitle: "Update ticket",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { subject, importance, status, type } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting update to clients");
    const payload = {
        id,
    };
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/user/support/ticket/${id}`, payload, {
        method: "update",
        data: {
            status,
            updatedAt: new Date(),
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating ticket");
    const result = await (0, query_1.updateRecord)("supportTicket", id, {
        subject,
        importance,
        status,
        type,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Ticket updated successfully");
    return result;
};
