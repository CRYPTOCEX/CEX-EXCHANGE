"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORT_TICKET_CHANNEL = void 0;
exports.broadcastSupportFrame = broadcastSupportFrame;
exports.broadcastSupportReply = broadcastSupportReply;
exports.broadcastSupportUpdate = broadcastSupportUpdate;
const Websocket_1 = require("@b/handler/Websocket");
const console_1 = require("@b/utils/console");
exports.SUPPORT_TICKET_CHANNEL = "/api/user/support/ticket";
function broadcastSupportFrame(ticketId, method, payload = {}) {
    try {
        Websocket_1.messageBroker.broadcastToSubscribedClients(exports.SUPPORT_TICKET_CHANNEL, { id: ticketId }, {
            method,
            payload: {
                id: ticketId,
                updatedAt: new Date().toISOString(),
                ...payload,
            },
        });
    }
    catch (error) {
        console_1.logger.error("SUPPORT", `Failed to broadcast ${method} for ${ticketId}`, error);
    }
}
function broadcastSupportReply(ticketId, message, status) {
    broadcastSupportFrame(ticketId, "reply", { message, status });
}
function broadcastSupportUpdate(ticketId, fields) {
    broadcastSupportFrame(ticketId, "update", fields);
}
