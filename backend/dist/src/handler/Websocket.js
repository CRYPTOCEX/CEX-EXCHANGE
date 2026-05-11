"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasClients = exports.handleDirectClientMessage = exports.handleBroadcastMessage = exports.removeClientSubscription = exports.deregisterClient = exports.registerClient = exports.messageBroker = exports.clients = void 0;
exports.setupWebSocketEndpoint = setupWebSocketEndpoint;
const ws_1 = require("@b/utils/ws");
const Middleware_1 = require("./Middleware");
const Request_1 = require("./Request");
const Response_1 = require("./Response");
const passwords_1 = require("@b/utils/passwords");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const Routes_1 = require("./Routes");
const heartbeat_1 = require("./ws/heartbeat");
const messageBroker_1 = require("./ws/messageBroker");
exports.clients = new Map();
exports.messageBroker = new messageBroker_1.MessageBroker(exports.clients);
async function setupWebSocketEndpoint(app, routePath, entryPath) {
    let handler, metadata, onClose;
    const cached = Routes_1.routeCache.get(entryPath);
    if (cached && cached.metadata) {
        ({ handler, metadata, onClose } = cached);
    }
    else {
        const handlerModule = await Promise.resolve(`${entryPath}`).then(s => __importStar(require(s)));
        handler = handlerModule.default;
        if (!handler) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Handler not found for ${entryPath}` });
        }
        metadata = handlerModule.metadata;
        if (!metadata) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Metadata not found for ${entryPath}` });
        }
        onClose = handlerModule.onClose;
        Routes_1.routeCache.set(entryPath, { handler, metadata, onClose });
    }
    if (typeof handler !== "function") {
        throw (0, error_1.createError)({ statusCode: 500, message: `Handler is not a function for ${entryPath}` });
    }
    app.ws(routePath, {
        pong: (ws, message) => {
            ws.isAlive = true;
        },
        upgrade: async (response, request, context) => {
            const res = new Response_1.Response(response);
            const req = new Request_1.Request(response, request);
            req.params = (0, ws_1.parseParams)(routePath, req.url);
            try {
                if (!metadata) {
                    throw (0, error_1.createError)({ statusCode: 404, message: `Metadata not found for ${entryPath}` });
                }
                req.setMetadata(metadata);
            }
            catch (error) {
                console_1.logger.error("WS", `Error setting metadata for ${entryPath}`, error);
                res.cork(async () => {
                    res.handleError(500, "Internal Server Error");
                });
                return;
            }
            try {
                if (metadata.requiresAuth) {
                    await (0, Middleware_1.rateLimit)(res, req, async () => {
                        await (0, Middleware_1.authenticate)(res, req, async () => {
                            await (0, Middleware_1.rolesGate)(app, res, req, routePath, "ws", async () => {
                                res.cork(async () => {
                                    const basePath = req.url.split('?')[0];
                                    res.upgrade({
                                        user: req.user,
                                        params: req.params,
                                        query: req.query,
                                        path: basePath,
                                    }, req.headers["sec-websocket-key"], req.headers["sec-websocket-protocol"], req.headers["sec-websocket-extensions"], context);
                                });
                            });
                        });
                    });
                }
                else {
                    res.cork(async () => {
                        var _a, _b;
                        const basePath = req.url.split('?')[0];
                        res.upgrade({
                            user: {
                                id: ((_a = req.query) === null || _a === void 0 ? void 0 : _a.userId) || (0, passwords_1.makeUuid)(),
                                role: ((_b = req.query) === null || _b === void 0 ? void 0 : _b.userId) ? "user" : "guest",
                            },
                            params: req.params,
                            query: req.query,
                            path: basePath,
                        }, req.headers["sec-websocket-key"], req.headers["sec-websocket-protocol"], req.headers["sec-websocket-extensions"], context);
                    });
                }
            }
            catch (error) {
                console_1.logger.error("WS", `Error upgrading connection for ${entryPath}`, error);
                res.cork(async () => {
                    res.close();
                });
            }
        },
        open: (ws) => {
            ws.isAlive = true;
            ws.isClosed = false;
            if (!ws.user || typeof ws.user.id === "undefined") {
                console_1.logger.error("WS", "User or user ID is undefined");
                return;
            }
            const clientId = ws.user.id;
            (0, exports.registerClient)(ws.path, clientId, ws);
        },
        message: async (ws, message, isBinary) => {
            const preparedMessage = Buffer.from(message).toString("utf-8");
            try {
                const parsedMessage = JSON.parse(preparedMessage);
                if (parsedMessage.action === "SUBSCRIBE" ||
                    parsedMessage.action === "UNSUBSCRIBE") {
                    processSubscriptionChange(ws, parsedMessage);
                }
                const result = await handler(ws, parsedMessage, isBinary);
                if (result) {
                    try {
                        ws.send(JSON.stringify(result));
                    }
                    catch (sendError) {
                        console_1.logger.error("WS", "Failed to send response", sendError);
                    }
                }
            }
            catch (error) {
                console_1.logger.error("WS", `Failed to parse/handle message for ${entryPath}`, error);
            }
        },
        close: async (ws) => {
            if (typeof onClose === "function") {
                await onClose(ws, ws.path, ws.user.id);
            }
            ws.isClosed = true;
            (0, exports.deregisterClient)(ws.path, ws.user.id);
        },
    });
}
const registerClient = (route, clientId, ws, initialSubscription) => {
    if (!route || !clientId || !ws)
        return;
    if (!exports.clients.has(route)) {
        exports.clients.set(route, new Map());
    }
    const routeClients = exports.clients.get(route);
    if (!routeClients.has(clientId)) {
        routeClients.set(clientId, {
            ws,
            subscriptions: new Set(initialSubscription ? [initialSubscription] : []),
        });
    }
    else {
        const clientRecord = routeClients.get(clientId);
        clientRecord.ws = ws;
        if (initialSubscription) {
            clientRecord.subscriptions.add(initialSubscription);
        }
    }
};
exports.registerClient = registerClient;
const deregisterClient = (route, clientId) => {
    if (exports.clients.has(route)) {
        const routeClients = exports.clients.get(route);
        routeClients.delete(clientId);
        if (routeClients.size === 0) {
            exports.clients.delete(route);
        }
    }
};
exports.deregisterClient = deregisterClient;
const removeClientSubscription = (route, clientId, subscription) => {
    if (exports.clients.has(route) && exports.clients.get(route).has(clientId)) {
        const clientRecord = exports.clients.get(route).get(clientId);
        clientRecord.subscriptions.delete(subscription);
        if (clientRecord.subscriptions.size === 0) {
            exports.clients.get(route).delete(clientId);
            if (exports.clients.get(route).size === 0) {
                exports.clients.delete(route);
            }
        }
    }
};
exports.removeClientSubscription = removeClientSubscription;
function processSubscriptionChange(ws, message) {
    if (!message.payload) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid subscription payload" });
    }
    const clientId = ws.user.id;
    const route = ws.path;
    const subscriptionKey = JSON.stringify(message.payload);
    if (message.action === "SUBSCRIBE") {
        console_1.logger.info("WS", `Client ${clientId} subscribing on route ${route} with key: ${subscriptionKey}`);
        (0, exports.registerClient)(route, clientId, ws, subscriptionKey);
    }
    else if (message.action === "UNSUBSCRIBE") {
        console_1.logger.info("WS", `Client ${clientId} unsubscribing on route ${route} with key: ${subscriptionKey}`);
        (0, exports.removeClientSubscription)(route, clientId, subscriptionKey);
    }
}
async function processWebSocketMessage(params) {
    let payload;
    const { type, model, id, data, method, status, sendMessage } = params;
    if (method === "update") {
        if (!id)
            throw (0, error_1.createError)({ statusCode: 400, message: "ID is required for update method" });
        if (status === true) {
            if (!model)
                throw (0, error_1.createError)({ statusCode: 400, message: "Model is required for update method" });
            if (Array.isArray(id)) {
                const records = await (0, query_1.getRecords)(model, id);
                if (!records || records.length === 0) {
                    throw (0, error_1.createError)({ statusCode: 404, message: `Records with IDs ${id.join(", ")} not found` });
                }
                payload = records;
            }
            else {
                const record = await (0, query_1.getRecord)(model, id);
                if (!record) {
                    throw (0, error_1.createError)({ statusCode: 404, message: `Record with ID ${id} not found` });
                }
                payload = record;
            }
            sendMessage("create", payload);
        }
        else if (status === false) {
            sendMessage("delete", Array.isArray(id) ? id.map((i) => ({ id: i })) : { id });
        }
        else {
            payload = { id, data };
            sendMessage("update", payload);
        }
    }
    else if (method === "create") {
        if (data) {
            payload = data;
        }
        else {
            if (!model || !id)
                throw (0, error_1.createError)({ statusCode: 400, message: "Model and ID are required for create method when no data is provided" });
            if (Array.isArray(id)) {
                const records = await (0, query_1.getRecords)(model, id);
                if (!records || records.length === 0) {
                    throw (0, error_1.createError)({ statusCode: 404, message: `Records with IDs ${id.join(", ")} not found` });
                }
                payload = records;
            }
            else {
                const record = await (0, query_1.getRecord)(model, id);
                if (!record) {
                    throw (0, error_1.createError)({ statusCode: 404, message: `Record with ID ${id} not found` });
                }
                payload = record;
            }
        }
        sendMessage("create", payload);
    }
    else if (method === "delete") {
        if (!id)
            throw (0, error_1.createError)({ statusCode: 400, message: "ID is required for delete method" });
        sendMessage("delete", Array.isArray(id) ? id.map((i) => ({ id: i })) : { id });
    }
}
const handleBroadcastMessage = async (params) => {
    const sendMessage = (method, payload) => {
        const broadcastRoute = params.route || "/api/user";
        exports.messageBroker.broadcastToRoute(broadcastRoute, {
            type: params.type,
            method,
            payload,
        });
    };
    await processWebSocketMessage({ ...params, sendMessage });
};
exports.handleBroadcastMessage = handleBroadcastMessage;
const handleDirectClientMessage = async (params) => {
    const sendMessage = (method, payload) => {
        exports.messageBroker.sendToClient(params.clientId, {
            type: params.type,
            method,
            payload,
        });
    };
    await processWebSocketMessage({ ...params, sendMessage });
};
exports.handleDirectClientMessage = handleDirectClientMessage;
const hasClients = (route) => {
    return exports.clients.has(route) && exports.clients.get(route).size > 0;
};
exports.hasClients = hasClients;
const HEARTBEAT_INTERVAL = 30000;
(0, heartbeat_1.startHeartbeat)(exports.clients, HEARTBEAT_INTERVAL);
