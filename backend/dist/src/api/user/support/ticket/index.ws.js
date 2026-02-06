"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const console_1 = require("@b/utils/console");
const db_1 = require("@b/db");
exports.metadata = {
    requiresAuth: true,
    summary: "WebSocket endpoint for support ticket real-time updates",
    description: "Allows users and admins to subscribe to ticket updates and receive real-time messages"
};
exports.default = async (data, message) => {
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
        if (!parsedMessage || !parsedMessage.payload) {
            console_1.logger.error("TICKET_WS", "Invalid message structure: payload is missing", new Error("Missing payload"));
            return;
        }
        const { action, payload } = parsedMessage;
        if (!action) {
            console_1.logger.error("TICKET_WS", "Invalid message structure: action is missing", new Error("Missing action field"));
            return;
        }
        const user = data.user;
        const userId = user === null || user === void 0 ? void 0 : user.id;
        console_1.logger.debug("TICKET_WS", `Received action: ${action} from user: ${userId}`);
        switch (action) {
            case "SUBSCRIBE":
                if (payload.id) {
                    console_1.logger.debug("TICKET_WS", `User ${userId} subscribing to ticket: ${payload.id}`);
                    if (!userId) {
                        console_1.logger.warn("TICKET_WS", "No user ID provided for ticket subscription");
                        return {
                            type: "subscription",
                            status: "error",
                            message: "Authentication required"
                        };
                    }
                    const ticket = await db_1.models.supportTicket.findOne({
                        where: { id: payload.id }
                    });
                    if (!ticket) {
                        console_1.logger.error("TICKET_WS", `Ticket ${payload.id} not found in database`);
                        return {
                            type: "subscription",
                            status: "error",
                            message: "Ticket not found"
                        };
                    }
                    console_1.logger.debug("TICKET_WS", `Found ticket: ${ticket.id}, userId: ${ticket.userId}, type: ${ticket.type}`);
                    let hasAccess = false;
                    try {
                        if (ticket.userId === userId) {
                            hasAccess = true;
                            console_1.logger.debug("TICKET_WS", `User ${userId} is the ticket owner`);
                        }
                        else {
                            const dbUser = await db_1.models.user.findByPk(userId);
                            const isAdmin = dbUser && (dbUser.roleId === 0 || dbUser.roleId === 1 || dbUser.roleId === 2);
                            if (isAdmin) {
                                hasAccess = true;
                                console_1.logger.debug("TICKET_WS", `User ${userId} is admin (roleId: ${dbUser.roleId})`);
                            }
                            else {
                                console_1.logger.debug("TICKET_WS", `User ${userId} is not admin and not ticket owner`);
                            }
                        }
                    }
                    catch (error) {
                        console_1.logger.error("TICKET_WS", `Error checking user access: ${error.message}`);
                        hasAccess = (ticket.userId === userId);
                    }
                    if (hasAccess) {
                        const subscriptionKey = `ticket-${payload.id}`;
                        console_1.logger.debug("TICKET_WS", `Successfully granting access for ${userId} to ${subscriptionKey}`);
                        const response = {
                            type: "subscription",
                            status: "success",
                            message: `Subscribed to ticket ${payload.id}`,
                            data: {
                                ticketId: ticket.id,
                                type: ticket.type,
                                status: ticket.status
                            }
                        };
                        return response;
                    }
                    else {
                        console_1.logger.warn("TICKET_WS", `User ${userId} denied access to ticket ${payload.id} (owner: ${ticket.userId})`);
                        const errorResponse = {
                            type: "subscription",
                            status: "error",
                            message: "Unauthorized access to ticket"
                        };
                        return errorResponse;
                    }
                }
                break;
            case "UNSUBSCRIBE":
                if (payload.id) {
                    console_1.logger.debug("TICKET_WS", `User ${userId} unsubscribing from ticket: ${payload.id}`);
                    const subscriptionKey = `ticket-${payload.id}`;
                    return {
                        type: "subscription",
                        status: "success",
                        message: `Unsubscribed from ticket ${payload.id}`
                    };
                }
                break;
            default:
                console_1.logger.warn("TICKET_WS", `Unknown action: ${action}`);
        }
    }
    catch (error) {
        console_1.logger.error("TICKET_WS", "Error handling support ticket websocket message", error);
    }
};
