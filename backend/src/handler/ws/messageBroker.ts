/**
 * MessageBroker Module
 *
 * This module abstracts the logic for sending messages to WebSocket clients.
 * It provides methods to:
 *  - Send a message to a specific client (across all routes).
 *  - Broadcast a message to all clients on a given route.
 *  - Broadcast a message to only those clients that are subscribed to a specific payload.
 *
 * In a high-load scenario, this module can be updated to integrate with a scalable
 * pub/sub mechanism (e.g., Redis, NATS, etc.) without changing the rest of the code.
 */

import { logError } from "@b/utils/logger";

// Types for clarity
export type ClientRecord = { ws: any; subscriptions: Set<string> };
export type ClientsMap = Map<string, Map<string, ClientRecord>>;

export class MessageBroker {
  private clients: ClientsMap;

  constructor(clients: ClientsMap) {
    this.clients = clients;
  }

  /**
   * Sends a message to a specific client on a specific route only.
   *
   * @param route - The specific route to send the message to.
   * @param clientId - Unique identifier for the client.
   * @param message - The message object to send.
   * @param isBinary - Whether to send the message as binary data.
   */
  public sendToClientOnRoute(
    route: string,
    clientId: string,
    message: any,
    isBinary: boolean = false
  ) {
    const routeClients = this.clients.get(route);
    if (routeClients) {
      const clientRecord = routeClients.get(clientId);
      if (clientRecord) {
        clientRecord.ws.cork(() => {
          if (isBinary) {
            const bufferMessage = Buffer.from(JSON.stringify(message));
            clientRecord.ws.send(bufferMessage, true);
          } else {
            clientRecord.ws.send(JSON.stringify(message));
          }
        });
        return true;
      }
    }
    return false;
  }

  /**
   * Sends a message to a specific client across all routes.
   *
   * @param clientId - Unique identifier for the client.
   * @param message - The message object to send.
   * @param isBinary - Whether to send the message as binary data.
   */
  public sendToClient(
    clientId: string,
    message: any,
    isBinary: boolean = false
  ) {
    let found = false;
    for (const [route, routeClients] of this.clients.entries()) {
      if (routeClients.has(clientId)) {
        const clientRecord = routeClients.get(clientId)!;
        try {
          clientRecord.ws.cork(() => {
            if (isBinary) {
              const bufferMessage = Buffer.from(JSON.stringify(message));
              clientRecord.ws.send(bufferMessage, true);
            } else {
              clientRecord.ws.send(JSON.stringify(message));
            }
          });
        } catch (error) {
          logError("websocket", error, route);
          routeClients.delete(clientId);
        }
        found = true;
      }
    }
    if (!found) {
      console.error(`Client ${clientId} not found in any route`);
    }
  }

  /**
   * Broadcasts a message to all clients on a specific route.
   *
   * @param route - The route to broadcast to.
   * @param message - The message object to send.
   */
  public broadcastToRoute(route: string, message: any) {
    const msgString = JSON.stringify(message);
    if (this.clients.has(route)) {
      const routeClients = this.clients.get(route)!;
      routeClients.forEach((clientRecord) => {
        try {
          clientRecord.ws.cork(() => {
            clientRecord.ws.send(msgString);
          });
        } catch (error) {
          logError("websocket", error, route);
        }
      });
    }
  }

  /**
   * Broadcasts a message to clients on a route that are subscribed to a specific payload.
   *
   * @param route - The route to broadcast to.
   * @param payload - The subscription payload. This is stringified internally.
   * @param message - The message object to send.
   */
  public broadcastToSubscribedClients(
    route: string,
    payload: any,
    message: any
  ) {
    try {
      const subscriptionKey = JSON.stringify(payload);
      
      // Broadcast to specific route with subscription filtering
      const routeClients = this.clients.get(route);
      if (routeClients) {
        let matchedClients = 0;
        
        for (const [clientId, clientRecord] of routeClients) {
          // Check if client has matching subscription
          if (clientRecord.subscriptions.has(subscriptionKey)) {
            try {
              clientRecord.ws.send(JSON.stringify(message));
              matchedClients++;
            } catch (error) {
              console.error(`[ERROR] Failed to send message to client ${clientId}:`, error);
              logError("websocket", error, route);
              routeClients.delete(clientId);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in broadcastToSubscribedClients", error);
    }
  }
}
