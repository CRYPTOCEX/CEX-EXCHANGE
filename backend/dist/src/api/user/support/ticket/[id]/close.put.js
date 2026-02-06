"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const Websocket_1 = require("@b/handler/Websocket");
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
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Closing support ticket");
    await db_1.models.supportTicket.update({
        status: "CLOSED",
    }, {
        where: { id },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving updated ticket");
    const ticket = await db_1.models.supportTicket.findOne({
        where: { id },
    });
    if (!ticket) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Ticket not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Ticket not found",
        });
    }
    const payload = {
        id: ticket.id,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting ticket closure via WebSocket");
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/user/support/ticket/${id}`, payload, {
        method: "update",
        data: {
            status: "CLOSED",
            updatedAt: new Date(),
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Ticket closed successfully");
    return {
        message: "Ticket closed successfully",
    };
};
