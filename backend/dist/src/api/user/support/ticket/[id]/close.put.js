"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const broadcast_1 = require("@b/utils/support/broadcast");
const ai_hook_1 = require("@b/utils/support/ai-hook");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Closes a support ticket",
    description: "Closes a support ticket identified by its UUID.",
    operationId: "closeTicket",
    tags: ["Support"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Close support ticket",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The UUID of the ticket to close",
            schema: { type: "string" },
        },
    ],
    responses: (0, query_1.updateRecordResponses)("Support Ticket"),
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Closing support ticket");
    const [updatedCount] = await db_1.models.supportTicket.update({
        status: "CLOSED",
    }, {
        where: { id, userId: user.id },
    });
    if (updatedCount === 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Ticket not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Ticket not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving updated ticket");
    const ticket = await db_1.models.supportTicket.findOne({
        where: { id, userId: user.id },
    });
    if (!ticket) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Ticket not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Ticket not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting ticket closure via WebSocket");
    (0, broadcast_1.broadcastSupportUpdate)(ticket.id, { status: "CLOSED" });
    (0, ai_hook_1.notifyTicketClosed)(ticket.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Ticket closed successfully");
    return {
        message: "Ticket closed successfully",
    };
};
