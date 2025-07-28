// WebSocketManager.ts
export interface WebSocketManagerConfig {
  pingIntervalMs?: number; // default 30000ms
  pongTimeoutMs?: number; // default 10000ms
  reconnectInterval?: number; // default 5000ms
  maxReconnectAttempts?: number; // default 10
}

class WebSocketManager {
  public url: string;
  public ws: WebSocket | null = null;
  public manualDisconnect: boolean = false;
  private listeners: Record<string, ((...args: any[]) => void)[]> = {};
  private reconnectInterval: number;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number;
  // Ping/pong settings
  private pingIntervalId: ReturnType<typeof setInterval> | null = null;
  private pongTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private pingIntervalMs: number;
  private pongTimeoutMs: number;

  constructor(wsPath: string, config?: WebSocketManagerConfig) {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.host.replace("3000", "4000");
    this.url = `${wsProtocol}//${wsHost}${wsPath}`;

    // Set configurable parameters with defaults.
    this.pingIntervalMs = config?.pingIntervalMs || 30000;
    this.pongTimeoutMs = config?.pongTimeoutMs || 10000;
    this.reconnectInterval = config?.reconnectInterval || 5000;
    this.maxReconnectAttempts = config?.maxReconnectAttempts || 10;
  }

  connect() {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("WebSocket connection opened.");
        this.manualDisconnect = false;
        this.listeners["open"]?.forEach((cb) => cb());
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event: MessageEvent) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (e) {
          console.error("Error parsing message:", e);
          return;
        }
        // If the server sends a PONG (in response to our PING), clear our pong timeout.
        if (message.type === "PONG") {
          this.clearPongTimeout();
          return;
        }
        // **NEW:** If the server sends a PING, reply with a PONG.
        if (message.type === "PING") {
          this.send({ type: "PONG" });
          return;
        }
        // Process other messages.
        this.listeners["message"]?.forEach((cb) => cb(message));
      };

      this.ws.onclose = () => {
        console.log("WebSocket connection closed");
        this.listeners["close"]?.forEach((cb) => cb());
        this.stopPing();
        if (!this.manualDisconnect) {
          this.reconnect();
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error("WebSocket error:", error);
      };
    }
  }

  disconnect() {
    if (this.ws) {
      this.manualDisconnect = true;
      this.ws.close();
      this.ws = null;
      this.stopPing();
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else if (!this.manualDisconnect) {
      console.error("WebSocket connection not open.");
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: (...args: any[]) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback
      );
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => this.connect(), this.reconnectInterval);
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
    } else {
      console.log("Max reconnection attempts reached, giving up.");
    }
  }

  // --- Ping-Pong Methods ---
  private startPing() {
    this.pingIntervalId = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: "PING" });
        // Start a timeout waiting for pong response.
        this.pongTimeoutId = setTimeout(() => {
          console.error("Pong not received in time, closing connection.");
          this.ws?.close();
        }, this.pongTimeoutMs);
      }
    }, this.pingIntervalMs);
  }

  private stopPing() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    this.clearPongTimeout();
  }

  private clearPongTimeout() {
    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }
  }
}

export default WebSocketManager;
