import { logger } from "@b/utils/console";
import { models } from "@b/db";
import { messageBroker } from "@b/handler/Websocket";

export const metadata = {
  requiresAuth: true,
  summary: "WebSocket endpoint for support ticket real-time updates",
  description: "Allows users and admins to subscribe to ticket updates and receive real-time messages"
};

export default async (data: Handler, message: any) => {
  try {
    let parsedMessage;
    if (typeof message === "string") {
      try {
        parsedMessage = JSON.parse(message);
      } catch (error) {
        logger.error("TICKET_WS", "Invalid JSON message", error);
        return;
      }
    } else {
      parsedMessage = message;
    }

    if (!parsedMessage || !parsedMessage.payload) {
      logger.error("TICKET_WS", "Invalid message structure: payload is missing", new Error("Missing payload"));
      return;
    }

    const { action, payload } = parsedMessage;

    if (!action) {
      logger.error("TICKET_WS", "Invalid message structure: action is missing", new Error("Missing action field"));
      return;
    }

    const user = data.user;
    const userId = user?.id;
    
    logger.debug("TICKET_WS", `Received action: ${action} from user: ${userId}`);

    switch (action) {
      case "SUBSCRIBE":
        if (payload.id) {
          logger.debug("TICKET_WS", `User ${userId} subscribing to ticket: ${payload.id}`);

          // Check if user is authenticated
          if (!userId) {
            logger.warn("TICKET_WS", "No user ID provided for ticket subscription");
            return {
              type: "subscription",
              status: "error",
              message: "Authentication required"
            };
          }
          
          // First, find the ticket to check if it exists
          const ticket = await models.supportTicket.findOne({
            where: { id: payload.id }
          });
          
          if (!ticket) {
            logger.error("TICKET_WS", `Ticket ${payload.id} not found in database`);
            return {
              type: "subscription",
              status: "error",
              message: "Ticket not found"
            };
          }
          
          logger.debug("TICKET_WS", `Found ticket: ${ticket.id}, userId: ${ticket.userId}, type: ${ticket.type}`);
          
          // Check if user has access to this ticket
          let hasAccess = false;
          
          try {
            // Check if user is the ticket owner
            if (ticket.userId === userId) {
              hasAccess = true;
              logger.debug("TICKET_WS", `User ${userId} is the ticket owner`);
            } else {
              // Check if user is admin
              const dbUser = await models.user.findByPk(userId);
              const isAdmin = dbUser && (dbUser.roleId === 0 || dbUser.roleId === 1 || dbUser.roleId === 2);

              if (isAdmin) {
                hasAccess = true;
                logger.debug("TICKET_WS", `User ${userId} is admin (roleId: ${dbUser.roleId})`);
              } else {
                logger.debug("TICKET_WS", `User ${userId} is not admin and not ticket owner`);
              }
            }
          } catch (error) {
            logger.error("TICKET_WS", `Error checking user access: ${error.message}`);
            // Check if user is ticket owner as fallback
            hasAccess = (ticket.userId === userId);
          }
          
          if (hasAccess) {
            // Subscribe this connection to ticket-specific updates
            const subscriptionKey = `ticket-${payload.id}`;
            logger.debug("TICKET_WS", `Successfully granting access for ${userId} to ${subscriptionKey}`);
            
            // IMPORTANT: Return success response
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
          } else {
            logger.warn("TICKET_WS", `User ${userId} denied access to ticket ${payload.id} (owner: ${ticket.userId})`);
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
          // Unsubscribe from ticket updates
          logger.debug("TICKET_WS", `User ${userId} unsubscribing from ticket: ${payload.id}`);
          const subscriptionKey = `ticket-${payload.id}`;
          return {
            type: "subscription",
            status: "success",
            message: `Unsubscribed from ticket ${payload.id}`
          };
        }
        break;
      default:
        logger.warn("TICKET_WS", `Unknown action: ${action}`);
    }
  } catch (error) {
    logger.error("TICKET_WS", "Error handling support ticket websocket message", error);
  }
};
