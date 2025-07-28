import { logError } from "@b/utils/logger";
import { messageBroker, hasClients } from "@b/handler/Websocket";

export const metadata = {};

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

    switch (action) {
      case "SUBSCRIBE":
        if (payload.id) {
          // Subscribe to ticket updates
          console.log(`User subscribing to ticket: ${payload.id}`);
        }
        break;
      case "UNSUBSCRIBE":
        if (payload.id) {
          // Unsubscribe from ticket updates
          console.log(`User unsubscribing from ticket: ${payload.id}`);
        }
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  } catch (error) {
    logError("support-ticket-ws", error, __filename);
  }
};
