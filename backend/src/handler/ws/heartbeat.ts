/**
 * Heartbeat Module
 *
 * This module encapsulates the heartbeat (ping/pong) logic.
 * It periodically pings each WebSocket connection and cleans up those
 * that are inactive or closed.
 *
 * This abstraction improves clarity and makes the heartbeat logic easier to test.
 */

import { logError } from "@b/utils/logger";

// Types for clarity
export type ClientRecord = { ws: any; subscriptions: Set<string> };
export type ClientsMap = Map<string, Map<string, ClientRecord>>;

/**
 * Starts the heartbeat mechanism.
 *
 * @param clients - A map of clients organized by route.
 * @param interval - The interval (in milliseconds) at which to perform the heartbeat check.
 * @returns The interval ID (can be used for clearing the interval).
 */
export function startHeartbeat(clients: ClientsMap, interval: number) {
  let isFirstCheck = true;
  
  return setInterval(() => {
    for (const [route, routeClients] of clients.entries()) {
      for (const [clientId, clientRecord] of routeClients.entries()) {
        // If the connection is marked as closed, remove it
        if (clientRecord.ws.isClosed) {
          try {
            clientRecord.ws.close();
          } catch (error) {
            logError("websocket", error, route);
          }
          routeClients.delete(clientId);
        } 
        // Only check isAlive after the first interval (give clients time to connect)
        else if (!isFirstCheck && !clientRecord.ws.isAlive) {
          // Client didn't respond to last ping, but give them one more chance
          console.log(`Client ${clientId} on route ${route} missed a heartbeat, sending final ping`);
          try {
            clientRecord.ws.ping();
            // Give them one more interval to respond
            setTimeout(() => {
              if (!clientRecord.ws.isAlive) {
                console.log(`Client ${clientId} on route ${route} failed to respond, closing connection`);
                try {
                  clientRecord.ws.close();
                } catch (error) {
                  logError("websocket", error, route);
                }
                routeClients.delete(clientId);
              }
            }, interval / 2); // Wait half the interval for response
          } catch (error) {
            logError("websocket", error, route);
            routeClients.delete(clientId);
          }
        } else {
          // Mark as not alive and send a ping, expecting a pong to mark it alive.
          clientRecord.ws.isAlive = false;
          try {
            clientRecord.ws.ping();
          } catch (error) {
            logError("websocket", error, route);
            routeClients.delete(clientId);
          }
        }
      }
      if (routeClients.size === 0) {
        clients.delete(route);
      }
    }
    isFirstCheck = false;
  }, interval);
}
