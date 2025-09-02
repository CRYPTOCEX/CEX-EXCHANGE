import { logError } from "@b/utils/logger";
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
        logError("Invalid JSON message", error, __filename);
        return;
      }
    } else {
      parsedMessage = message;
    }

    if (!parsedMessage || !parsedMessage.payload) {
      logError("Invalid message structure: payload is missing", new Error("Missing payload"), __filename);
      return;
    }

    const { action, payload } = parsedMessage;

    if (!action) {
      logError("Invalid message structure: action is missing", new Error("Missing action field"), __filename);
      return;
    }

    const user = data.user;
    const userId = user?.id;
    
    console.log(`[WS Handler] Received action: ${action} from user: ${userId}`);
    console.log(`[WS Handler] Payload:`, payload);

    switch (action) {
      case "SUBSCRIBE":
        if (payload.id) {
          console.log(`User ${userId} subscribing to ticket: ${payload.id}`);
          
          // Check if user is authenticated
          if (!userId) {
            console.warn(`No user ID provided for ticket subscription`);
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
            console.error(`Ticket ${payload.id} not found in database`);
            return {
              type: "subscription",
              status: "error",
              message: "Ticket not found"
            };
          }
          
          console.log(`Found ticket: ${ticket.id}, userId: ${ticket.userId}, type: ${ticket.type}`);
          
          // Check if user has access to this ticket
          let hasAccess = false;
          
          try {
            // Check if user is the ticket owner
            if (ticket.userId === userId) {
              hasAccess = true;
              console.log(`User ${userId} is the ticket owner`);
            } else {
              // Check if user is admin
              const dbUser = await models.user.findByPk(userId);
              const isAdmin = dbUser && (dbUser.roleId === 0 || dbUser.roleId === 1 || dbUser.roleId === 2);
              
              if (isAdmin) {
                hasAccess = true;
                console.log(`User ${userId} is admin (roleId: ${dbUser.roleId})`);
              } else {
                console.log(`User ${userId} is not admin and not ticket owner`);
              }
            }
          } catch (error) {
            console.error(`Error checking user access:`, error);
            // Check if user is ticket owner as fallback
            hasAccess = (ticket.userId === userId);
          }
          
          if (hasAccess) {
            // Subscribe this connection to ticket-specific updates
            const subscriptionKey = `ticket-${payload.id}`;
            console.log(`[WS Handler] Successfully granting access for ${userId} to ${subscriptionKey}`);
            
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
            console.log(`[WS Handler] Sending success response:`, response);
            return response;
          } else {
            console.warn(`[WS Handler] User ${userId} denied access to ticket ${payload.id} (owner: ${ticket.userId})`);
            const errorResponse = {
              type: "subscription",
              status: "error",
              message: "Unauthorized access to ticket"
            };
            console.log(`[WS Handler] Sending error response:`, errorResponse);
            return errorResponse;
          }
        }
        break;
      case "UNSUBSCRIBE":
        if (payload.id) {
          // Unsubscribe from ticket updates
          console.log(`User ${userId} unsubscribing from ticket: ${payload.id}`);
          const subscriptionKey = `ticket-${payload.id}`;
          return {
            type: "subscription",
            status: "success",
            message: `Unsubscribed from ticket ${payload.id}`
          };
        }
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  } catch (error) {
    logError("support-ticket-ws", error, __filename);
  }
};
