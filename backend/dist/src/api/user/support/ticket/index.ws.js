"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.authorizeSubscription = authorizeSubscription;
const console_1 = require("@b/utils/console");
const db_1 = require("@b/db");
exports.metadata = {
    requiresAuth: true,
    summary: "WebSocket endpoint for support ticket real-time updates",
    description: "Allows users and admins to subscribe to ticket updates and receive real-time messages",
};
const STAFF_ROLE_IDS = new Set([0, 1, 2]);
async function authorizeSubscription(ws, message) {
    var _a, _b;
    const action = message === null || message === void 0 ? void 0 : message.action;
    const payload = message === null || message === void 0 ? void 0 : message.payload;
    if (action !== "SUBSCRIBE" || !payload || !payload.id) {
        return { allowed: true };
    }
    const userId = (_a = ws === null || ws === void 0 ? void 0 : ws.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId || ((_b = ws === null || ws === void 0 ? void 0 : ws.user) === null || _b === void 0 ? void 0 : _b.role) === "guest") {
        return { allowed: false, message: "Authentication required" };
    }
    const ticketId = String(payload.id);
    try {
        const ticket = await db_1.models.supportTicket.findByPk(ticketId, {
            attributes: ["id", "userId"],
        });
        if (!ticket) {
            return { allowed: false, message: "Unauthorized access to ticket" };
        }
        if (String(ticket.userId) === String(userId)) {
            return { allowed: true };
        }
        const dbUser = await db_1.models.user.findByPk(userId, {
            attributes: ["id", "roleId"],
        });
        if (dbUser && STAFF_ROLE_IDS.has(Number(dbUser.roleId))) {
            return { allowed: true };
        }
        console_1.logger.warn("TICKET_WS", `Denied subscription: user ${userId} is neither owner nor staff for ticket ${ticketId}`);
        return { allowed: false, message: "Unauthorized access to ticket" };
    }
    catch (error) {
        console_1.logger.error("TICKET_WS", `Subscription authorization failed for ticket ${ticketId}: ${error === null || error === void 0 ? void 0 : error.message}`, error);
        return { allowed: false, message: "Subscription check failed" };
    }
}
exports.default = async (data, message) => {
    var _a;
    try {
        let parsedMessage;
        if (typeof message === "string") {
            try {
                parsedMessage = JSON.parse(message);
            }
            catch (error) {
                console_1.logger.error("TICKET_WS", "Invalid JSON message", error);
                return;
            }
        }
        else {
            parsedMessage = message;
        }
        if (!(parsedMessage === null || parsedMessage === void 0 ? void 0 : parsedMessage.payload))
            return;
        const { action, payload } = parsedMessage;
        if (!action || !(payload === null || payload === void 0 ? void 0 : payload.id))
            return;
        const userId = (_a = data.user) === null || _a === void 0 ? void 0 : _a.id;
        switch (action) {
            case "SUBSCRIBE": {
                const ticket = await db_1.models.supportTicket.findByPk(String(payload.id), {
                    attributes: ["id", "type", "status"],
                });
                if (!ticket)
                    return;
                console_1.logger.debug("TICKET_WS", `User ${userId} subscribed to ticket ${payload.id}`);
                return {
                    type: "subscription",
                    status: "success",
                    message: `Subscribed to ticket ${payload.id}`,
                    data: {
                        ticketId: ticket.id,
                        type: ticket.type,
                        status: ticket.status,
                    },
                };
            }
            case "UNSUBSCRIBE":
                console_1.logger.debug("TICKET_WS", `User ${userId} unsubscribing from ticket: ${payload.id}`);
                return {
                    type: "subscription",
                    status: "success",
                    message: `Unsubscribed from ticket ${payload.id}`,
                };
            default:
                console_1.logger.warn("TICKET_WS", `Unknown action: ${action}`);
        }
    }
    catch (error) {
        console_1.logger.error("TICKET_WS", "Error handling support ticket websocket message", error);
    }
};
