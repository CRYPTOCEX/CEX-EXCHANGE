"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageBroker = void 0;
const console_1 = require("@b/utils/console");
class MessageBroker {
    constructor(clients) {
        this.clients = clients;
    }
    sendToClientOnRoute(route, clientId, message, isBinary = false) {
        const routeClients = this.clients.get(route);
        if (routeClients) {
            const clientRecord = routeClients.get(clientId);
            if (clientRecord) {
                clientRecord.ws.cork(() => {
                    if (isBinary) {
                        const bufferMessage = Buffer.from(JSON.stringify(message));
                        clientRecord.ws.send(bufferMessage, true);
                    }
                    else {
                        clientRecord.ws.send(JSON.stringify(message));
                    }
                });
                return true;
            }
        }
        return false;
    }
    sendToClient(clientId, message, isBinary = false) {
        let found = false;
        for (const [route, routeClients] of this.clients.entries()) {
            if (routeClients.has(clientId)) {
                const clientRecord = routeClients.get(clientId);
                try {
                    clientRecord.ws.cork(() => {
                        if (isBinary) {
                            const bufferMessage = Buffer.from(JSON.stringify(message));
                            clientRecord.ws.send(bufferMessage, true);
                        }
                        else {
                            clientRecord.ws.send(JSON.stringify(message));
                        }
                    });
                }
                catch (error) {
                    console_1.logger.error("WS", `Failed to send message to client ${clientId}`, error);
                    routeClients.delete(clientId);
                }
                found = true;
            }
        }
        if (!found) {
            console_1.logger.debug("WS", `Client ${clientId} not found in any route`);
        }
    }
    broadcastToRoute(route, message) {
        const msgString = JSON.stringify(message);
        if (this.clients.has(route)) {
            const routeClients = this.clients.get(route);
            routeClients.forEach((clientRecord) => {
                try {
                    clientRecord.ws.cork(() => {
                        clientRecord.ws.send(msgString);
                    });
                }
                catch (error) {
                    console_1.logger.error("WS", `Failed to broadcast to route ${route}`, error);
                }
            });
        }
    }
    broadcastToSubscribedClients(route, payload, message) {
        try {
            const subscriptionKey = JSON.stringify(payload);
            const routeClients = this.clients.get(route);
            if (!routeClients || routeClients.size === 0) {
                console_1.logger.warn("WS", `No clients connected to route ${route} for broadcast`);
                return;
            }
            let matchedClients = 0;
            const msgString = JSON.stringify(message);
            for (const [clientId, clientRecord] of routeClients) {
                if (clientRecord.subscriptions.has(subscriptionKey)) {
                    try {
                        if (typeof clientRecord.ws.cork === "function") {
                            clientRecord.ws.cork(() => {
                                clientRecord.ws.send(msgString);
                            });
                        }
                        else {
                            clientRecord.ws.send(msgString);
                        }
                        matchedClients++;
                    }
                    catch (error) {
                        console_1.logger.error("WS", `Failed to send to client ${clientId}`, error);
                        routeClients.delete(clientId);
                    }
                }
            }
            if (matchedClients === 0) {
                const clientSubs = [];
                for (const [clientId, clientRecord] of routeClients) {
                    const subs = Array.from(clientRecord.subscriptions).join(", ");
                    clientSubs.push(`${clientId}: [${subs}]`);
                }
                console_1.logger.warn("WS", `No matching subscriptions on route ${route} for key: ${subscriptionKey}. Connected clients (${routeClients.size}): ${clientSubs.join(" | ")}`);
            }
            else {
                console_1.logger.debug("WS", `Broadcast to ${matchedClients} client(s) on route ${route}`);
            }
        }
        catch (error) {
            console_1.logger.error("WS", "Error in broadcastToSubscribedClients", error);
        }
    }
}
exports.MessageBroker = MessageBroker;
