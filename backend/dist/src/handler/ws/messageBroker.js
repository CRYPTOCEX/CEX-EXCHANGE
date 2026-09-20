"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageBroker = exports.ClientRecord = exports.SubscriptionSet = exports.SubscriptionIndex = void 0;
exports.wsIngressLimits = wsIngressLimits;
exports.wsSubscriptionIndexEnabled = wsSubscriptionIndexEnabled;
exports.subscriptionIndexFor = subscriptionIndexFor;
exports.wsDeliveryStats = wsDeliveryStats;
exports.resetWsDeliveryStatsForTests = resetWsDeliveryStatsForTests;
const console_1 = require("@b/utils/console");
const relay_1 = require("./relay");
const UWS_DEFAULT_MAX_PAYLOAD = 16 * 1024;
const UWS_DEFAULT_IDLE_TIMEOUT_S = 120;
const UWS_DEFAULT_MAX_BACKPRESSURE = 64 * 1024;
function nonNegativeIntEnv(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === "")
        return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0)
        return fallback;
    return Math.floor(n);
}
function boolEnv(name, fallback) {
    var _a;
    const raw = ((_a = process.env[name]) !== null && _a !== void 0 ? _a : "").trim().toLowerCase();
    if (raw === "")
        return fallback;
    return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}
function wsIngressLimits() {
    return {
        maxPayloadLength: nonNegativeIntEnv("WS_MAX_PAYLOAD_BYTES", UWS_DEFAULT_MAX_PAYLOAD),
        idleTimeout: nonNegativeIntEnv("WS_IDLE_TIMEOUT_S", UWS_DEFAULT_IDLE_TIMEOUT_S),
        maxBackpressure: nonNegativeIntEnv("WS_MAX_BACKPRESSURE_BYTES", UWS_DEFAULT_MAX_BACKPRESSURE),
        closeOnBackpressureLimit: boolEnv("WS_CLOSE_ON_BACKPRESSURE", false),
        msgsPerSec: nonNegativeIntEnv("WS_MSGS_PER_SEC", 0),
        maxSubscriptions: nonNegativeIntEnv("WS_MAX_SUBSCRIPTIONS", 0),
        marketCacheMs: nonNegativeIntEnv("WS_MARKET_CACHE_MS", 0),
    };
}
function wsSubscriptionIndexEnabled() {
    return boolEnv("WS_SUBSCRIPTION_INDEX", false);
}
class SubscriptionIndex {
    constructor() {
        this.buckets = new Map();
    }
    add(route, key, ws, clientId) {
        let byKey = this.buckets.get(route);
        if (!byKey) {
            byKey = new Map();
            this.buckets.set(route, byKey);
        }
        let sockets = byKey.get(key);
        if (!sockets) {
            sockets = new Map();
            byKey.set(key, sockets);
        }
        sockets.set(ws, clientId);
    }
    remove(route, key, ws) {
        const byKey = this.buckets.get(route);
        const sockets = byKey === null || byKey === void 0 ? void 0 : byKey.get(key);
        if (!byKey || !sockets)
            return;
        sockets.delete(ws);
        if (sockets.size === 0)
            byKey.delete(key);
        if (byKey.size === 0)
            this.buckets.delete(route);
    }
    sockets(route, key) {
        var _a;
        return (_a = this.buckets.get(route)) === null || _a === void 0 ? void 0 : _a.get(key);
    }
    clear() {
        this.buckets.clear();
    }
    entries() {
        const out = [];
        for (const [route, byKey] of this.buckets) {
            for (const [key, sockets] of byKey) {
                for (const [ws, clientId] of sockets)
                    out.push({ route, key, ws, clientId });
            }
        }
        return out;
    }
}
exports.SubscriptionIndex = SubscriptionIndex;
class SubscriptionSet extends Set {
    constructor(route, clientId, ws, index) {
        super();
        this.route = route;
        this.clientId = clientId;
        this.ws = ws;
        this.index = index;
    }
    add(key) {
        super.add(key);
        this.index.add(this.route, key, this.ws, this.clientId);
        return this;
    }
    delete(key) {
        const had = super.delete(key);
        if (had)
            this.index.remove(this.route, key, this.ws);
        return had;
    }
    clear() {
        for (const key of this)
            this.index.remove(this.route, key, this.ws);
        super.clear();
    }
    detach() {
        for (const key of this)
            this.index.remove(this.route, key, this.ws);
    }
}
exports.SubscriptionSet = SubscriptionSet;
const indexes = new WeakMap();
function subscriptionIndexFor(clients) {
    let index = indexes.get(clients);
    if (!index) {
        index = new SubscriptionIndex();
        indexes.set(clients, index);
    }
    return index;
}
const deliveryStats = {
    snapshotsSkipped: 0,
    droppedByBackpressure: 0,
    queuedBehindBackpressure: 0,
};
function wsDeliveryStats() {
    return deliveryStats;
}
function resetWsDeliveryStatsForTests() {
    deliveryStats.snapshotsSkipped = 0;
    deliveryStats.droppedByBackpressure = 0;
    deliveryStats.queuedBehindBackpressure = 0;
}
class ClientRecord {
    constructor() {
        this.connections = new Map();
    }
    get ws() {
        let last;
        for (const socket of this.connections.keys())
            last = socket;
        return last;
    }
    get subscriptions() {
        const union = new Set();
        for (const keys of this.connections.values()) {
            for (const key of keys)
                union.add(key);
        }
        return union;
    }
    dropSocket(ws) {
        const keys = this.connections.get(ws);
        if (keys instanceof SubscriptionSet)
            keys.detach();
        return this.connections.delete(ws);
    }
    dropAll() {
        for (const ws of [...this.connections.keys()])
            this.dropSocket(ws);
    }
}
exports.ClientRecord = ClientRecord;
class MessageBroker {
    constructor(clients) {
        this.clients = clients;
    }
    deliver(ws, payload, isBinary = false, kind = "event") {
        try {
            if (kind === "snapshot" && typeof (ws === null || ws === void 0 ? void 0 : ws.getBufferedAmount) === "function") {
                const limit = wsIngressLimits().maxBackpressure;
                if (limit > 0 && ws.getBufferedAmount() > limit) {
                    deliveryStats.snapshotsSkipped++;
                    return true;
                }
            }
            let status = 1;
            if (typeof (ws === null || ws === void 0 ? void 0 : ws.cork) === "function") {
                ws.cork(() => {
                    status = ws.send(payload, isBinary);
                });
            }
            else {
                status = ws.send(payload, isBinary);
            }
            if (status === 2)
                deliveryStats.droppedByBackpressure++;
            else if (status === 0)
                deliveryStats.queuedBehindBackpressure++;
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    evict(route, routeClients, clientId, ws) {
        const record = routeClients.get(clientId);
        if (!record)
            return;
        record.dropSocket(ws);
        if (record.connections.size > 0)
            return;
        routeClients.delete(clientId);
        if (routeClients.size === 0)
            this.clients.delete(route);
    }
    sendToClientOnRoute(route, clientId, message, isBinary = false) {
        const routeClients = this.clients.get(route);
        if (!routeClients)
            return false;
        const clientRecord = routeClients.get(clientId);
        if (!clientRecord)
            return false;
        const payload = isBinary
            ? Buffer.from(JSON.stringify(message))
            : JSON.stringify(message);
        let sent = 0;
        for (const socket of [...clientRecord.connections.keys()]) {
            if (this.deliver(socket, payload, isBinary))
                sent++;
            else
                this.evict(route, routeClients, clientId, socket);
        }
        return sent > 0;
    }
    sendToClient(clientId, message, isBinary = false) {
        (0, relay_1.relayOutbound)({ k: "client", c: clientId, m: message });
        let found = false;
        const payload = isBinary
            ? Buffer.from(JSON.stringify(message))
            : JSON.stringify(message);
        for (const [route, routeClients] of [...this.clients.entries()]) {
            const clientRecord = routeClients.get(clientId);
            if (!clientRecord)
                continue;
            for (const socket of [...clientRecord.connections.keys()]) {
                if (this.deliver(socket, payload, isBinary)) {
                    found = true;
                }
                else {
                    console_1.logger.error("WS", `Failed to send message to client ${clientId}`);
                    this.evict(route, routeClients, clientId, socket);
                }
            }
        }
        if (!found) {
            console_1.logger.debug("WS", `Client ${clientId} not found in any route`);
        }
    }
    broadcastToRoute(route, message) {
        (0, relay_1.relayOutbound)({ k: "route", r: route, m: message });
        const routeClients = this.clients.get(route);
        if (!routeClients || routeClients.size === 0)
            return;
        const msgString = JSON.stringify(message);
        for (const [clientId, clientRecord] of [...routeClients]) {
            for (const socket of [...clientRecord.connections.keys()]) {
                if (!this.deliver(socket, msgString)) {
                    console_1.logger.error("WS", `Failed to broadcast to route ${route}`);
                    this.evict(route, routeClients, clientId, socket);
                }
            }
        }
    }
    broadcastToSubscribedClients(route, payload, message, options) {
        var _a;
        const kind = (options === null || options === void 0 ? void 0 : options.kind) === "snapshot" ? "snapshot" : "event";
        (0, relay_1.relayOutbound)({ k: "subscribed", r: route, p: payload, m: message });
        try {
            const subscriptionKey = JSON.stringify(payload);
            const routeClients = this.clients.get(route);
            if (!routeClients || routeClients.size === 0) {
                if (console_1.logger.isLevelEnabled("debug"))
                    console_1.logger.debug("WS", `No clients connected to route ${route} for broadcast`);
                return;
            }
            let matchedClients = 0;
            let msgString = "";
            let msgSerialised = false;
            const matches = [];
            if (wsSubscriptionIndexEnabled()) {
                const index = subscriptionIndexFor(this.clients);
                const held = index.sockets(route, subscriptionKey);
                if (held) {
                    for (const [socket, clientId] of [...held]) {
                        if ((_a = routeClients.get(clientId)) === null || _a === void 0 ? void 0 : _a.connections.has(socket))
                            matches.push([socket, clientId]);
                        else
                            index.remove(route, subscriptionKey, socket);
                    }
                }
            }
            else {
                for (const [clientId, clientRecord] of [...routeClients]) {
                    for (const [socket, keys] of [...clientRecord.connections]) {
                        if (keys.has(subscriptionKey))
                            matches.push([socket, clientId]);
                    }
                }
            }
            for (const [socket, clientId] of matches) {
                if (!msgSerialised) {
                    msgString = JSON.stringify(message);
                    msgSerialised = true;
                }
                if (this.deliver(socket, msgString, false, kind)) {
                    matchedClients++;
                }
                else {
                    console_1.logger.error("WS", `Failed to send to client ${clientId}`);
                    this.evict(route, routeClients, clientId, socket);
                }
            }
            if (matchedClients === 0) {
                if (console_1.logger.isLevelEnabled("debug")) {
                    const clientSubs = [];
                    for (const [clientId, clientRecord] of routeClients) {
                        const subs = Array.from(clientRecord.subscriptions).join(", ");
                        clientSubs.push(`${clientId}: [${subs}]`);
                    }
                    console_1.logger.debug("WS", `No matching subscriptions on route ${route} for key: ${subscriptionKey}. Connected clients (${routeClients.size}): ${clientSubs.join(" | ")}`);
                }
            }
            else {
                if (console_1.logger.isLevelEnabled("debug"))
                    console_1.logger.debug("WS", `Broadcast to ${matchedClients} client(s) on route ${route}`);
            }
        }
        catch (error) {
            console_1.logger.error("WS", "Error in broadcastToSubscribedClients", error);
        }
    }
}
exports.MessageBroker = MessageBroker;
