const WebSocket = require('ws');

class WebSocketManager {
    constructor() {
        this.wsClients = new Set();
        this.wss = null;
    }

    initialize(server) {
        this.wss = new WebSocket.Server({ server });
        this.setupConnectionHandler();
    }

    setupConnectionHandler() {
        this.wss.on('connection', (ws) => {
            this.wsClients.add(ws);
            console.log('WebSocket client connected');
            
            ws.on('close', () => {
                this.wsClients.delete(ws);
                console.log('WebSocket client disconnected');
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.wsClients.delete(ws);
            });
            
            // Send initial connection confirmation
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'Connected to translation server'
            }));
        });
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        this.wsClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}

module.exports = WebSocketManager;