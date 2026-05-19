"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHeartbeat = startHeartbeat;
const console_1 = require("@b/utils/console");
function startHeartbeat(clients, interval) {
    let isFirstCheck = true;
    return setInterval(() => {
        for (const [route, routeClients] of clients.entries()) {
            for (const [clientId, clientRecord] of routeClients.entries()) {
                if (clientRecord.ws.isClosed) {
                    try {
                        clientRecord.ws.close();
                    }
                    catch (error) {
                        console_1.logger.error("WS", `Failed to close connection for client ${clientId}`, error);
                    }
                    routeClients.delete(clientId);
                }
                else if (!isFirstCheck && !clientRecord.ws.isAlive) {
                    console_1.logger.debug("WS", `Client ${clientId} missed heartbeat, sending final ping`);
                    try {
                        clientRecord.ws.ping();
                        setTimeout(() => {
                            if (!clientRecord.ws.isAlive) {
                                console_1.logger.debug("WS", `Client ${clientId} failed to respond, closing`);
                                try {
                                    clientRecord.ws.close();
                                }
                                catch (error) {
                                    console_1.logger.error("WS", `Failed to close unresponsive client ${clientId}`, error);
                                }
                                routeClients.delete(clientId);
                            }
                        }, interval / 2);
                    }
                    catch (error) {
                        console_1.logger.error("WS", `Failed to send final ping to client ${clientId}`, error);
                        routeClients.delete(clientId);
                    }
                }
                else {
                    clientRecord.ws.isAlive = false;
                    try {
                        clientRecord.ws.ping();
                    }
                    catch (error) {
                        console_1.logger.error("WS", `Failed to ping client ${clientId} during heartbeat`, error);
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
