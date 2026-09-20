"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHeartbeat = startHeartbeat;
const console_1 = require("@b/utils/console");
function isClosedSocketError(error) {
    return typeof (error === null || error === void 0 ? void 0 : error.message) === "string" &&
        error.message.includes("Invalid access of closed");
}
function callSocket(ws, method, clientId) {
    if (!ws || ws.isClosed)
        return false;
    try {
        ws[method]();
        return true;
    }
    catch (error) {
        if (isClosedSocketError(error)) {
            ws.isClosed = true;
            console_1.logger.debug("WS", `Skipped ${method} for client ${clientId}: connection already closed`);
        }
        else {
            console_1.logger.error("WS", `Failed to ${method} client ${clientId}`, error);
        }
        return false;
    }
}
function dropSocket(clients, route, routeClients, clientId, ws) {
    const record = routeClients.get(clientId);
    if (!record)
        return;
    record.connections.delete(ws);
    if (record.connections.size > 0)
        return;
    routeClients.delete(clientId);
    if (routeClients.size === 0)
        clients.delete(route);
}
function startHeartbeat(clients, interval) {
    var _a;
    let isFirstCheck = true;
    const timer = setInterval(() => {
        for (const [route, routeClients] of [...clients.entries()]) {
            for (const [clientId, clientRecord] of [...routeClients.entries()]) {
                for (const ws of [...clientRecord.connections.keys()]) {
                    if (!ws || ws.isClosed) {
                        callSocket(ws, "close", clientId);
                        dropSocket(clients, route, routeClients, clientId, ws);
                    }
                    else if (!isFirstCheck && !ws.isAlive) {
                        console_1.logger.debug("WS", `Client ${clientId} missed heartbeat, sending final ping`);
                        if (!callSocket(ws, "ping", clientId)) {
                            dropSocket(clients, route, routeClients, clientId, ws);
                            continue;
                        }
                        setTimeout(() => {
                            var _a;
                            if (!((_a = routeClients.get(clientId)) === null || _a === void 0 ? void 0 : _a.connections.has(ws)) || ws.isAlive)
                                return;
                            console_1.logger.debug("WS", `Client ${clientId} failed to respond, closing`);
                            callSocket(ws, "close", clientId);
                            dropSocket(clients, route, routeClients, clientId, ws);
                        }, interval / 2);
                    }
                    else {
                        ws.isAlive = false;
                        if (!callSocket(ws, "ping", clientId)) {
                            dropSocket(clients, route, routeClients, clientId, ws);
                        }
                    }
                }
            }
            if (routeClients.size === 0) {
                clients.delete(route);
            }
        }
        isFirstCheck = false;
    }, interval);
    (_a = timer.unref) === null || _a === void 0 ? void 0 : _a.call(timer);
    return timer;
}
