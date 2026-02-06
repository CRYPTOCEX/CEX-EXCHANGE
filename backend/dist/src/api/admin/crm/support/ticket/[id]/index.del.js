"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a support ticket",
    operationId: "deleteSupportTicket",
    tags: ["Admin", "CRM", "Support Ticket"],
    parameters: (0, query_1.deleteRecordParams)("support ticket"),
    responses: (0, query_1.deleteRecordResponses)("Support Ticket"),
    permission: "delete.support.ticket",
    requiresAuth: true,
    logModule: "ADMIN_SUP",
    logTitle: "Delete ticket",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting ticket");
    await (0, query_1.handleSingleDelete)({
        model: "supportTicket",
        id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Ticket deleted successfully");
    return {
        message: "Ticket restored successfully",
    };
};
