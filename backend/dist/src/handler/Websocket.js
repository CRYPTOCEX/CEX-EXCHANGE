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
exports.hasRouteSubscriber = exports.routeSubscriptionPayloads = exports.hasClients = exports.handleDirectClientMessage = exports.handleBroadcastMessage = exports.removeClientSubscription = exports.deregisterClient = exports.subscriptionsForSocket = exports.socketCountOnRoute = exports.hasClientOnRoute = exports.isLastSocketForClient = exports.isRegisteredSocket = exports.registerClient = exports.messageBroker = exports.clients = exports.wsDeliveryStats = exports.wsIngressLimits = void 0;
exports.uwsBehaviourLimits = uwsBehaviourLimits;
exports.wsIngressStats = wsIngressStats;
exports.overMessageBudget = overMessageBudget;
exports.setupWebSocketEndpoint = setupWebSocketEndpoint;
const ws_1 = require("@b/utils/ws");
const keepalive_1 = require("./ws/keepalive");
const Middleware_1 = require("./Middleware");
const Request_1 = require("./Request");
const Response_1 = require("./Response");
const passwords_1 = require("@b/utils/passwords");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const Routes_1 = require("./Routes");
const load_handler_module_1 = require("./utils/load-handler-module");
const heartbeat_1 = require("./ws/heartbeat");
const messageBroker_1 = require("./ws/messageBroker");
const relay_1 = require("./ws/relay");
const header_parser_1 = require("./utils/header-parser");
var messageBroker_2 = require("./ws/messageBroker");
Object.defineProperty(exports, "wsIngressLimits", { enumerable: true, get: function () { return messageBroker_2.wsIngressLimits; } });
Object.defineProperty(exports, "wsDeliveryStats", { enumerable: true, get: function () { return messageBroker_2.wsDeliveryStats; } });
function uwsBehaviourLimits() {
    const limits = (0, messageBroker_1.wsIngressLimits)();
    return {
        maxPayloadLength: limits.maxPayloadLength,
        idleTimeout: limits.idleTimeout,
        maxBackpressure: limits.maxBackpressure,
        closeOnBackpressureLimit: limits.closeOnBackpressureLimit,
    };
}
const ingressStats = { budgetCloses: 0, subscriptionRefusals: 0 };
function wsIngressStats() {
    return ingressStats;
}
function overMessageBudget(ws, now = Date.now()) {
    const budget = (0, messageBroker_1.wsIngressLimits)().msgsPerSec;
    if (budget <= 0)
        return false;
    if (!ws.wsMsgWindow || now - ws.wsMsgWindow >= 1000) {
        ws.wsMsgWindow = now;
        ws.wsMsgCount = 0;
    }
    ws.wsMsgCount += 1;
    return ws.wsMsgCount > budget;
}
function closeOverBudget(ws, entryPath) {
    var _a;
    var _b;
    ingressStats.budgetCloses++;
    console_1.logger.warn("WS", `Closing socket ${(_b = (_a = ws === null || ws === void 0 ? void 0 : ws.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : "?"} on ${entryPath}: over ${(0, messageBroker_1.wsIngressLimits)().msgsPerSec} messages/second`);
    try {
        if (typeof ws.end === "function")
            ws.end(1008, "message budget exceeded");
        else
            ws.close();
    }
    catch (_c) {
    }
}
exports.clients = new Map();
exports.messageBroker = new messageBroker_1.MessageBroker(exports.clients);
(0, relay_1.startWsRelay)({
    broadcastToRoute: (route, message) => exports.messageBroker.broadcastToRoute(route, message),
    broadcastToSubscribedClients: (route, payload, message) => exports.messageBroker.broadcastToSubscribedClients(route, payload, message),
    sendToClient: (clientId, message) => exports.messageBroker.sendToClient(clientId, message),
    hasLocalClients: (route) => (0, exports.hasClients)(route),
});
async function setupWebSocketEndpoint(app, routePath, entryPath) {
    let handler, metadata, onClose, authorizeSubscription;
    const cached = Routes_1.routeCache.get(entryPath);
    if (cached && cached.metadata) {
        ({ handler, metadata, onClose, authorizeSubscription } = cached);
    }
    else {
        const handlerModule = (0, load_handler_module_1.loadHandlerModule)(entryPath);
        handler = handlerModule.default;
        if (!handler) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Handler not found for ${entryPath}` });
        }
        metadata = handlerModule.metadata;
        if (!metadata) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Metadata not found for ${entryPath}` });
        }
        onClose = handlerModule.onClose;
        authorizeSubscription = handlerModule.authorizeSubscription;
        Routes_1.routeCache.set(entryPath, {
            handler,
            metadata,
            onClose,
            authorizeSubscription,
        });
    }
    if (typeof handler !== "function") {
        throw (0, error_1.createError)({ statusCode: 500, message: `Handler is not a function for ${entryPath}` });
    }
    app.ws(routePath, {
        ...uwsBehaviourLimits(),
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
                const { contextFromRequest, evaluateRequest, recordDecision, getPolicy } = await Promise.resolve().then(() => __importStar(require("@b/utils/geo")));
                const policy = getPolicy();
                if (policy.enabled) {
                    const geoCtx = contextFromRequest(req);
                    const decision = await evaluateRequest(geoCtx, policy);
                    recordDecision(geoCtx, decision, policy);
                    if (!decision.allowed) {
                        res.cork(() => {
                            res.handleError(403, decision.message);
                        });
                        return;
                    }
                }
            }
            catch (error) {
                console_1.logger.debug("WS", `Geo check skipped for ${routePath}: ${error === null || error === void 0 ? void 0 : error.message}`);
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
                                        remoteAddress: req.remoteAddress,
                                        isNativeApp: (0, header_parser_1.isAppPlatform)(req.headers),
                                    }, req.headers["sec-websocket-key"], req.headers["sec-websocket-protocol"], req.headers["sec-websocket-extensions"], context);
                                });
                            });
                        });
                    });
                }
                else {
                    res.cork(async () => {
                        const basePath = req.url.split('?')[0];
                        res.upgrade({
                            user: {
                                id: (0, passwords_1.makeUuid)(),
                                role: "guest",
                            },
                            params: req.params,
                            query: req.query,
                            path: basePath,
                            remoteAddress: req.remoteAddress,
                            isNativeApp: (0, header_parser_1.isAppPlatform)(req.headers),
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
            if (overMessageBudget(ws)) {
                closeOverBudget(ws, entryPath);
                return;
            }
            const preparedMessage = Buffer.from(message).toString("utf-8");
            try {
                const parsedMessage = JSON.parse(preparedMessage);
                const keepaliveKind = (0, keepalive_1.classifyKeepaliveFrame)(parsedMessage);
                if (keepaliveKind) {
                    ws.isAlive = true;
                    if (keepaliveKind === "PING") {
                        try {
                            ws.send(JSON.stringify((0, keepalive_1.keepaliveReply)()));
                        }
                        catch (_a) {
                        }
                    }
                    return;
                }
                if (parsedMessage.action === "SUBSCRIBE" ||
                    parsedMessage.action === "UNSUBSCRIBE") {
                    if (parsedMessage.action === "SUBSCRIBE" &&
                        typeof authorizeSubscription === "function") {
                        let verdict;
                        try {
                            verdict = await authorizeSubscription(ws, parsedMessage);
                        }
                        catch (guardError) {
                            console_1.logger.error("WS", `Subscription guard threw for ${entryPath}; denying`, guardError);
                            verdict = { allowed: false, message: "Subscription check failed" };
                        }
                        if (!verdict || verdict.allowed !== true) {
                            try {
                                ws.send(JSON.stringify({
                                    type: "subscription",
                                    status: "error",
                                    message: (verdict === null || verdict === void 0 ? void 0 : verdict.message) || "Unauthorized subscription",
                                }));
                            }
                            catch (_b) {
                            }
                            return;
                        }
                    }
                    if (processSubscriptionChange(ws, parsedMessage) === "over-cap") {
                        try {
                            ws.send(JSON.stringify({
                                type: "subscription",
                                status: "error",
                                message: `Subscription limit reached (${(0, messageBroker_1.wsIngressLimits)().maxSubscriptions} per connection)`,
                            }));
                        }
                        catch (_c) {
                        }
                        return;
                    }
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
            (0, exports.deregisterClient)(ws.path, ws.user.id, ws);
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
    let clientRecord = routeClients.get(clientId);
    if (!clientRecord) {
        clientRecord = new messageBroker_1.ClientRecord();
        routeClients.set(clientId, clientRecord);
    }
    let subscriptions = clientRecord.connections.get(ws);
    if (!subscriptions) {
        subscriptions = new messageBroker_1.SubscriptionSet(route, clientId, ws, (0, messageBroker_1.subscriptionIndexFor)(exports.clients));
        clientRecord.connections.set(ws, subscriptions);
    }
    if (initialSubscription) {
        subscriptions.add(initialSubscription);
    }
    (0, relay_1.announceRelayAudience)(route);
};
exports.registerClient = registerClient;
const isRegisteredSocket = (route, clientId, ws) => { var _a, _b; return Boolean((_b = (_a = exports.clients.get(route)) === null || _a === void 0 ? void 0 : _a.get(clientId)) === null || _b === void 0 ? void 0 : _b.connections.has(ws)); };
exports.isRegisteredSocket = isRegisteredSocket;
const isLastSocketForClient = (route, clientId, ws) => {
    var _a;
    const record = (_a = exports.clients.get(route)) === null || _a === void 0 ? void 0 : _a.get(clientId);
    return Boolean(record && record.connections.has(ws) && record.connections.size === 1);
};
exports.isLastSocketForClient = isLastSocketForClient;
const hasClientOnRoute = (route, clientId) => { var _a; return Boolean((_a = exports.clients.get(route)) === null || _a === void 0 ? void 0 : _a.has(clientId)); };
exports.hasClientOnRoute = hasClientOnRoute;
const socketCountOnRoute = (route) => {
    const routeClients = exports.clients.get(route);
    if (!routeClients)
        return 0;
    let total = 0;
    for (const record of routeClients.values())
        total += record.connections.size;
    return total;
};
exports.socketCountOnRoute = socketCountOnRoute;
const subscriptionsForSocket = (route, clientId, ws) => { var _a, _b; return (_b = (_a = exports.clients.get(route)) === null || _a === void 0 ? void 0 : _a.get(clientId)) === null || _b === void 0 ? void 0 : _b.connections.get(ws); };
exports.subscriptionsForSocket = subscriptionsForSocket;
const deregisterClient = (route, clientId, ws) => {
    var _a;
    if (exports.clients.has(route)) {
        const routeClients = exports.clients.get(route);
        if (ws !== undefined) {
            const record = routeClients.get(clientId);
            if (!record)
                return;
            record.dropSocket(ws);
            if (record.connections.size > 0)
                return;
        }
        (_a = routeClients.get(clientId)) === null || _a === void 0 ? void 0 : _a.dropAll();
        routeClients.delete(clientId);
        if (routeClients.size === 0) {
            exports.clients.delete(route);
        }
        (0, relay_1.announceRelayAudience)(route);
    }
};
exports.deregisterClient = deregisterClient;
const removeClientSubscription = (route, clientId, subscription, ws) => {
    const routeClients = exports.clients.get(route);
    const clientRecord = routeClients === null || routeClients === void 0 ? void 0 : routeClients.get(clientId);
    if (!routeClients || !clientRecord)
        return;
    const targets = ws ? [ws] : [...clientRecord.connections.keys()];
    for (const socket of targets) {
        const keys = clientRecord.connections.get(socket);
        if (!keys)
            continue;
        keys.delete(subscription);
        if (keys.size === 0)
            clientRecord.dropSocket(socket);
    }
    if (clientRecord.connections.size === 0) {
        routeClients.delete(clientId);
        if (routeClients.size === 0) {
            exports.clients.delete(route);
        }
        (0, relay_1.announceRelayAudience)(route);
    }
};
exports.removeClientSubscription = removeClientSubscription;
function processSubscriptionChange(ws, message) {
    var _a, _b, _c;
    if (!message.payload) {
        return;
    }
    const clientId = ws.user.id;
    const route = ws.path;
    if (((_a = ws.user) === null || _a === void 0 ? void 0 : _a.role) !== "guest" &&
        message.payload.userId != null &&
        String(message.payload.userId) !== String(clientId)) {
        console_1.logger.warn("WS", `Rejected cross-user subscription on ${route}: payload.userId=${message.payload.userId} != session ${clientId}`);
        return;
    }
    const subscriptionKey = JSON.stringify(message.payload);
    if (message.action === "SUBSCRIBE") {
        const cap = (0, messageBroker_1.wsIngressLimits)().maxSubscriptions;
        if (cap > 0) {
            const held = (_c = (_b = exports.clients.get(route)) === null || _b === void 0 ? void 0 : _b.get(clientId)) === null || _c === void 0 ? void 0 : _c.connections.get(ws);
            if (held && held.size >= cap && !held.has(subscriptionKey)) {
                ingressStats.subscriptionRefusals++;
                console_1.logger.warn("WS", `Refused subscription for client ${clientId} on route ${route}: ${held.size} held, cap ${cap}`);
                return "over-cap";
            }
        }
        console_1.logger.info("WS", `Client ${clientId} subscribing on route ${route} with key: ${subscriptionKey}`);
        (0, exports.registerClient)(route, clientId, ws, subscriptionKey);
    }
    else if (message.action === "UNSUBSCRIBE") {
        console_1.logger.info("WS", `Client ${clientId} unsubscribing on route ${route} with key: ${subscriptionKey}`);
        (0, exports.removeClientSubscription)(route, clientId, subscriptionKey, ws);
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
const routeSubscriptionPayloads = (route, match) => {
    const routeClients = exports.clients.get(route);
    if (!routeClients || routeClients.size === 0)
        return [];
    const seen = new Set();
    const payloads = [];
    for (const record of routeClients.values()) {
        for (const keys of record.connections.values()) {
            for (const key of keys) {
                if (seen.has(key))
                    continue;
                let payload;
                try {
                    payload = JSON.parse(key);
                }
                catch (_a) {
                    seen.add(key);
                    continue;
                }
                seen.add(key);
                try {
                    if (match(payload))
                        payloads.push(payload);
                }
                catch (_b) {
                    continue;
                }
            }
        }
    }
    return payloads;
};
exports.routeSubscriptionPayloads = routeSubscriptionPayloads;
const hasRouteSubscriber = (route, match) => {
    const routeClients = exports.clients.get(route);
    if (!routeClients || routeClients.size === 0)
        return false;
    for (const record of routeClients.values()) {
        for (const keys of record.connections.values()) {
            for (const key of keys) {
                let payload;
                try {
                    payload = JSON.parse(key);
                }
                catch (_a) {
                    continue;
                }
                try {
                    if (match(payload))
                        return true;
                }
                catch (_b) {
                    continue;
                }
            }
        }
    }
    return false;
};
exports.hasRouteSubscriber = hasRouteSubscriber;
const HEARTBEAT_INTERVAL = 30000;
(0, heartbeat_1.startHeartbeat)(exports.clients, HEARTBEAT_INTERVAL);
