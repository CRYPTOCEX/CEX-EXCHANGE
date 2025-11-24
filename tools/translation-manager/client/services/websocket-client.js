class WebSocketClient {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.messageHandlers = new Map();
        this.eventTarget = new EventTarget();
    }

    connect() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.hostname}:5000`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.emit('connected');
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.emit('disconnected');
            // Try to reconnect after delay
            setTimeout(() => this.connect(), this.reconnectInterval);
        };
    }

    handleMessage(data) {
        // Emit specific event for message type
        this.emit(data.type, data);
        
        // Also emit generic message event
        this.emit('message', data);
    }

    on(eventType, handler) {
        this.eventTarget.addEventListener(eventType, handler);
    }

    off(eventType, handler) {
        this.eventTarget.removeEventListener(eventType, handler);
    }

    emit(eventType, data = null) {
        const event = new CustomEvent(eventType, { detail: data });
        this.eventTarget.dispatchEvent(event);
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected, cannot send message');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Export singleton instance
window.wsClient = new WebSocketClient();