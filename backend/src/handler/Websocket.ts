/**
 * WebSocket Handler Module
 *
 * This module sets up a WebSocket endpoint and manages client connections,
 * subscriptions, message handling, and clean-up.
 *
 * It now uses:
 *  - MessageBroker (from messageBroker.ts) for message broadcasting.
 *  - A separate heartbeat module (from heartbeat.ts) for ping/pong logic.
 */

import { parseParams } from "@b/utils/ws";
import { authenticate, rateLimit, rolesGate } from "./Middleware";
import { Request } from "./Request";
import { Response } from "./Response";
import { makeUuid } from "@b/utils/passwords";
import { getRecord, getRecords } from "@b/utils/query";
import { logError } from "@b/utils/logger";
import { routeCache } from "./Routes";
import { startHeartbeat } from "./ws/heartbeat";
import { MessageBroker, ClientsMap } from "./ws/messageBroker";

// Global map to keep track of WebSocket clients by route.
// Structure: Map<route, Map<clientId, { ws, subscriptions: Set<string> }>>
export const clients: ClientsMap = new Map();

// Instantiate the MessageBroker with the clients map.
export const messageBroker = new MessageBroker(clients);

// ----------------------------------------------------------------------
// WebSocket Endpoint Setup
// ----------------------------------------------------------------------

/**
 * Sets up a WebSocket endpoint on the provided application instance.
 *
 * @param app - The server application with WebSocket support.
 * @param routePath - The URL path to mount the WebSocket endpoint.
 * @param entryPath - The module path containing the handler, metadata, and optional onClose function.
 *
 * The entry module must export:
 *  - default: the handler function.
 *  - metadata: an object (e.g., { requiresAuth: true }).
 *  - onClose (optional): a function to execute when a client disconnects.
 */
export async function setupWebSocketEndpoint(
  app: any,
  routePath: string,
  entryPath: string
) {
  let handler, metadata, onClose;
  // Attempt to retrieve from cache.
  const cached = routeCache.get(entryPath);
  if (cached && cached.metadata) {
    ({ handler, metadata, onClose } = cached);
  } else {
    const handlerModule = await import(entryPath);
    handler = handlerModule.default;
    if (!handler) {
      throw new Error(`Handler not found for ${entryPath}`);
    }
    metadata = handlerModule.metadata;
    if (!metadata) {
      throw new Error(`Metadata not found for ${entryPath}`);
    }
    onClose = handlerModule.onClose;
    routeCache.set(entryPath, { handler, metadata, onClose });
  }

  if (typeof handler !== "function") {
    throw new Error(`Handler is not a function for ${entryPath}`);
  }

  // Configure the WebSocket endpoint.
  app.ws(routePath, {
    pong: (ws, message) => {
      ws.isAlive = true;
    },
    upgrade: async (response, request, context) => {
      const res = new Response(response);
      const req = new Request(response, request);
      req.params = parseParams(routePath, req.url);

      try {
        if (!metadata) {
          throw new Error(`Metadata not found for ${entryPath}`);
        }
        req.setMetadata(metadata);
      } catch (error) {
        logError("websocket", error, entryPath);
        res.cork(async () => {
          res.handleError(500, "Internal Server Error");
        });
        return;
      }

      try {
        if (metadata.requiresAuth) {
          await rateLimit(res, req, async () => {
            await authenticate(res, req, async () => {
              await rolesGate(app, res, req, routePath, "ws", async () => {
                res.cork(async () => {
                  res.upgrade(
                    {
                      user: req.user,
                      params: req.params,
                      query: req.query,
                      path: req.url,
                    },
                    req.headers["sec-websocket-key"],
                    req.headers["sec-websocket-protocol"],
                    req.headers["sec-websocket-extensions"],
                    context
                  );
                });
              });
            });
          });
        } else {
          res.cork(async () => {
            res.upgrade(
              {
                user: {
                  id: req.query?.userId || makeUuid(),
                  role: req.query?.userId ? "user" : "guest",
                },
                params: req.params,
                query: req.query,
                path: req.url,
              },
              req.headers["sec-websocket-key"],
              req.headers["sec-websocket-protocol"],
              req.headers["sec-websocket-extensions"],
              context
            );
          });
        }
      } catch (error) {
        logError("websocket", error, entryPath);
        res.cork(async () => {
          res.close();
        });
      }
    },
    open: (ws) => {
      ws.isAlive = true;
      ws.isClosed = false;

      if (!ws.user || typeof ws.user.id === "undefined") {
        console.error("User or user ID is undefined", ws.user);
        return;
      }
      const clientId = ws.user.id;
      registerClient(ws.path, clientId, ws);
    },
    message: async (ws, message, isBinary) => {
      const preparedMessage = Buffer.from(message).toString("utf-8");
      try {
        const parsedMessage = JSON.parse(preparedMessage);
        if (
          parsedMessage.action === "SUBSCRIBE" ||
          parsedMessage.action === "UNSUBSCRIBE"
        ) {
          processSubscriptionChange(ws, parsedMessage);
        }
        const result = await handler(ws, parsedMessage, isBinary);
        if (result) {
          // Send response directly back through the WebSocket connection
          try {
            ws.send(JSON.stringify(result));
          } catch (sendError) {
            console.error(`Failed to send WebSocket response:`, sendError);
          }
        }
      } catch (error) {
        logError("websocket", error, entryPath);
        console.error(`Failed to parse or handle message: ${error}`);
      }
    },
    close: async (ws) => {
      if (typeof onClose === "function") {
        await onClose(ws, ws.path, ws.user.id);
      }
      ws.isClosed = true;
      deregisterClient(ws.path, ws.user.id);
    },
  });
}

// ----------------------------------------------------------------------
// Client and Subscription Management
// ----------------------------------------------------------------------

/**
 * Registers a new client connection.
 *
 * @param route - The route the client connected to.
 * @param clientId - The unique client identifier.
 * @param ws - The WebSocket connection instance.
 * @param initialSubscription (optional) - A subscription to add initially.
 */
export const registerClient = (
  route: string,
  clientId: string,
  ws: any,
  initialSubscription?: string
) => {
  if (!route || !clientId || !ws) return;
  if (!clients.has(route)) {
    clients.set(route, new Map());
  }
  const routeClients = clients.get(route)!;
  if (!routeClients.has(clientId)) {
    routeClients.set(clientId, {
      ws,
      subscriptions: new Set(initialSubscription ? [initialSubscription] : []),
    });
  } else if (initialSubscription) {
    routeClients.get(clientId)!.subscriptions.add(initialSubscription);
  }
};

/**
 * Deregisters a client connection.
 *
 * @param route - The route from which to remove the client.
 * @param clientId - The unique client identifier.
 */
export const deregisterClient = (route: string, clientId: string) => {
  if (clients.has(route)) {
    const routeClients = clients.get(route)!;
    routeClients.delete(clientId);
    if (routeClients.size === 0) {
      clients.delete(route);
    }
  }
};

/**
 * Removes a subscription for a given client.
 *
 * @param route - The route the client is connected to.
 * @param clientId - The unique client identifier.
 * @param subscription - The subscription to remove.
 */
export const removeClientSubscription = (
  route: string,
  clientId: string,
  subscription: string
) => {
  if (clients.has(route) && clients.get(route)!.has(clientId)) {
    const clientRecord = clients.get(route)!.get(clientId)!;
    clientRecord.subscriptions.delete(subscription);
    if (clientRecord.subscriptions.size === 0) {
      clients.get(route)!.delete(clientId);
      if (clients.get(route)!.size === 0) {
        clients.delete(route);
      }
    }
  }
};

/**
 * Processes subscription change requests from clients.
 *
 * Expects the message payload to be valid.
 *
 * @param ws - The WebSocket connection instance.
 * @param message - Parsed JSON message from the client.
 */
function processSubscriptionChange(ws: any, message: any) {
  if (!message.payload) {
    throw new Error("Invalid subscription payload");
  }
  const clientId = ws.user.id;
  const route = ws.path;
  const subscriptionKey = JSON.stringify(message.payload);
  
  if (message.action === "SUBSCRIBE") {
    registerClient(route, clientId, ws, subscriptionKey);
  } else if (message.action === "UNSUBSCRIBE") {
    removeClientSubscription(route, clientId, subscriptionKey);
  }
}

// ----------------------------------------------------------------------
// Common Message Processing
// ----------------------------------------------------------------------

/**
 * Helper function for processing WebSocket messages (create, update, delete).
 *
 * This function fetches or validates payload data based on the method,
 * then calls the provided sendMessage callback with the proper data.
 */
async function processWebSocketMessage(params: {
  type: string;
  model?: string;
  id?: string | string[];
  data?: object;
  method: "create" | "update" | "delete";
  status?: boolean;
  sendMessage: (method: "create" | "update" | "delete", payload: any) => void;
}) {
  let payload: any;
  const { type, model, id, data, method, status, sendMessage } = params;

  if (method === "update") {
    if (!id) throw new Error("ID is required for update method");
    if (status === true) {
      if (!model) throw new Error("Model is required for update method");
      if (Array.isArray(id)) {
        const records = await getRecords(model, id);
        if (!records || records.length === 0) {
          throw new Error(`Records with IDs ${id.join(", ")} not found`);
        }
        payload = records;
      } else {
        const record = await getRecord(model, id);
        if (!record) {
          throw new Error(`Record with ID ${id} not found`);
        }
        payload = record;
      }
      sendMessage("create", payload);
    } else if (status === false) {
      sendMessage(
        "delete",
        Array.isArray(id) ? id.map((i) => ({ id: i })) : { id }
      );
    } else {
      payload = { id, data };
      sendMessage("update", payload);
    }
  } else if (method === "create") {
    if (data) {
      payload = data;
    } else {
      if (!model || !id)
        throw new Error(
          "Model and ID are required for create method when no data is provided"
        );
      if (Array.isArray(id)) {
        const records = await getRecords(model, id);
        if (!records || records.length === 0) {
          throw new Error(`Records with IDs ${id.join(", ")} not found`);
        }
        payload = records;
      } else {
        const record = await getRecord(model, id);
        if (!record) {
          throw new Error(`Record with ID ${id} not found`);
        }
        payload = record;
      }
    }
    sendMessage("create", payload);
  } else if (method === "delete") {
    if (!id) throw new Error("ID is required for delete method");
    sendMessage(
      "delete",
      Array.isArray(id) ? id.map((i) => ({ id: i })) : { id }
    );
  }
}

/**
 * Processes a broadcast message for all clients on a route.
 *
 * Wraps processWebSocketMessage with a sendMessage callback that uses
 * MessageBroker to broadcast the message.
 */
export const handleBroadcastMessage = async (params: {
  type: string;
  model?: string;
  id?: string | string[];
  data?: object;
  method: "create" | "update" | "delete";
  status?: boolean;
  route?: string;
}) => {
  const sendMessage = (
    method: "create" | "update" | "delete",
    payload: any
  ) => {
    // Use the provided route or default to /api/user
    const broadcastRoute = params.route || "/api/user";
    messageBroker.broadcastToRoute(broadcastRoute, {
      type: params.type,
      method,
      payload,
    });
  };

  await processWebSocketMessage({ ...params, sendMessage });
};

/**
 * Processes a direct message for a specific client.
 *
 * Wraps processWebSocketMessage with a sendMessage callback that uses
 * MessageBroker to send the message directly to the specified client.
 */
export const handleDirectClientMessage = async (params: {
  type: string;
  clientId: string;
  model?: string;
  id?: string | string[];
  data?: object;
  method: "create" | "update" | "delete";
  status?: boolean;
}) => {
  const sendMessage = (
    method: "create" | "update" | "delete",
    payload: any
  ) => {
    messageBroker.sendToClient(params.clientId, {
      type: params.type,
      method,
      payload,
    });
  };

  await processWebSocketMessage({ ...params, sendMessage });
};

/**
 * Checks if there are any active clients connected to a given route.
 *
 * @param route - The route to check.
 * @returns True if at least one client is connected; false otherwise.
 */
export const hasClients = (route: string): boolean => {
  return clients.has(route) && clients.get(route)!.size > 0;
};

// ----------------------------------------------------------------------
// Start Heartbeat
// ----------------------------------------------------------------------

// Start the heartbeat mechanism using the imported module (interval in ms).
// Increased to 30 seconds for better stability with client connections
const HEARTBEAT_INTERVAL = 30000;
startHeartbeat(clients, HEARTBEAT_INTERVAL);
