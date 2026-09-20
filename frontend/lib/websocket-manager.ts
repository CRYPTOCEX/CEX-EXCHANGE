export default class WebSocketManager {
  private url: string;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000;
  private eventHandlers: Record<string, Array<(data: any) => void>> = {
    open: [],
    close: [],
    error: [],
    message: [],
  };

  constructor(url: string) {
    this.url = url;
  }

  public connect(): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = (event) => {
        this.reconnectAttempts = 0;
        this.eventHandlers.open.forEach((handler) => handler(event));
      };

      this.socket.onclose = (event) => {
        this.eventHandlers.close.forEach((handler) => handler(event));
        this.attemptReconnect();
      };

      // The browser's error event is deliberately empty (the spec forbids
      // exposing the cause), so forwarding it makes every consumer log
      // "[object Event]". Hand on the state that is actually diagnosable
      // instead; the close event that follows carries the code.
      this.socket.onerror = () => {
        const detail = {
          url: this.url,
          readyState: this.socket?.readyState ?? null,
          attempt: this.reconnectAttempts,
          willRetry: this.reconnectAttempts < this.maxReconnectAttempts,
        };
        this.eventHandlers.error.forEach((handler) => handler(detail));
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.eventHandlers.message.forEach((handler) => handler(data));
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, this.reconnectTimeout * this.reconnectAttempts);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  public send(data: any): void {
    if (this.isConnected() && this.socket) {
      this.socket.send(typeof data === "string" ? data : JSON.stringify(data));
    } else {
      console.warn("Cannot send message, WebSocket is not connected");
    }
  }

  public on(event: string, handler: (data: any) => void): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    } else {
      this.eventHandlers[event] = [handler];
    }
  }

  public off(event: string, handler: (data: any) => void): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(
        (h) => h !== handler
      );
    }
  }
}
