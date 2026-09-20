// WebSocketManager.ts
export interface WebSocketManagerConfig {
  pingIntervalMs?: number; // default 30000ms
  pongTimeoutMs?: number; // default 10000ms
  reconnectInterval?: number; // default 5000ms
  maxReconnectAttempts?: number; // default 10
  /**
   * Client-side keepalive. OFF by default, and that default is load-bearing.
   *
   * `startPing()` existed for a long time without a single caller, so the
   * pong-timeout path below has never actually run in production and a
   * half-open socket — one the OS still reports as OPEN while nothing can
   * traverse it — was never detected: the page simply went quiet and kept
   * claiming to be live.
   *
   * It cannot just be switched on globally, because the timeout is cleared
   * ONLY by a frame with `type === "PONG"`. A route that does not answer
   * `{type:"PING"}` would be torn down and reconnected every ping interval,
   * turning a working socket into a reconnect loop. So this is opt-in per
   * socket: enable it only where the server route is known to reply.
   */
  enablePing?: boolean;
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
  private enablePing: boolean;
  /** Timestamp of the last error event; kept for callers inspecting health. */
  private lastErrorAt: number | null = null;

  constructor(wsPath: string, config?: WebSocketManagerConfig) {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isDev = process.env.NODE_ENV === "development";
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
    // In development, connect directly to backend (Next.js rewrites don't support WebSocket upgrades)
    const wsHost = isDev ? `${window.location.hostname}:${backendPort}` : window.location.host;
    this.url = `${wsProtocol}//${wsHost}${wsPath}`;

    // Set configurable parameters with defaults.
    this.pingIntervalMs = config?.pingIntervalMs || 30000;
    this.pongTimeoutMs = config?.pongTimeoutMs || 10000;
    this.reconnectInterval = config?.reconnectInterval || 5000;
    this.maxReconnectAttempts = config?.maxReconnectAttempts || 10;
    this.enablePing = config?.enablePing === true;
  }

  connect() {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        // A socket opening is the expected case and says nothing; a socket
        // recovering after failures is the part worth seeing.
        if (this.reconnectAttempts > 0) {
          console.info(
            `${this.describe()} reconnected after ${this.reconnectAttempts} attempt(s).`
          );
        }
        this.manualDisconnect = false;
        this.listeners["open"]?.forEach((cb) => cb());
        this.reconnectAttempts = 0;
        this.lastErrorAt = null;
        // Arm the keepalive only where the route answers PING — see the
        // `enablePing` note on the config type.
        if (this.enablePing) this.startPing();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          // The payload is the diagnosis here, not the SyntaxError.
          const preview =
            typeof event.data === "string"
              ? event.data.slice(0, 200)
              : `<${typeof event.data}>`;
          console.warn(
            `${this.describe()} received a non-JSON frame, ignoring: ${preview}`
          );
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

      this.ws.onclose = (event: CloseEvent) => {
        // The close event is where the diagnosis actually lives — the error
        // event carries none. 1000/1001 are ordinary; anything else is worth a
        // line, and `code` + `reason` name the cause.
        const clean = event.code === 1000 || event.code === 1001;
        if (!this.manualDisconnect && !clean) {
          console.info(
            `${this.describe()} closed (code ${event.code}${
              event.reason ? `: ${event.reason}` : ""
            })`
          );
        }
        this.listeners["close"]?.forEach((cb) => cb(event));
        this.stopPing();
        if (!this.manualDisconnect) {
          this.reconnect();
        }
      };

      this.ws.onerror = () => {
        // A WebSocket error event is deliberately opaque — the spec forbids
        // exposing why, so the handler argument is an empty Event and logging
        // it prints "[object Event]". What is diagnosable is our own state, and
        // the close event that always follows carries the code. So: report the
        // connection, not the event, and only when it is worth reporting.
        this.lastErrorAt = Date.now();

        // Navigating away tears sockets down mid-flight, and a background tab
        // that lost the network will fire this on every retry. Neither is
        // something the operator can act on.
        if (this.manualDisconnect || !this.isPageVisible()) return;

        // One line per outage, not one per retry: after the first failure the
        // reconnect log already says what is happening.
        if (this.reconnectAttempts > 0) return;

        console.warn(
          `${this.describe()} could not connect. Retrying every ${
            this.reconnectInterval / 1000
          }s (up to ${this.maxReconnectAttempts} times).`
        );

        this.listeners["error"]?.forEach((cb) =>
          cb({ url: this.url, readyState: this.ws?.readyState ?? null })
        );
      };
    }
  }

  disconnect() {
    if (this.ws) {
      this.manualDisconnect = true;
      // Only close if not already closing/closed
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        try {
          this.ws.close();
        } catch (e) {
          // Ignore close errors during cleanup
        }
      }
      this.ws = null;
      this.stopPing();
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return;
    }
    // Dropping a frame while the socket is down is expected during a reconnect,
    // so this is a warning, and it names the message that was lost rather than
    // repeating that the connection is closed.
    if (!this.manualDisconnect && this.isPageVisible()) {
      console.warn(
        `${this.describe()} is not open; dropped "${message?.type ?? "message"}".`
      );
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

  /** When the socket last failed, or null if it never has. */
  getLastErrorAt(): number | null {
    return this.lastErrorAt;
  }

  /**
   * Short identity for logs. The path is what tells one socket from another;
   * the host is the same for all of them and only adds noise.
   */
  private describe(): string {
    try {
      return `WebSocket ${new URL(this.url).pathname}`;
    } catch {
      return "WebSocket";
    }
  }

  /**
   * A hidden or unloading page is not a fault worth reporting: the browser
   * suspends or kills sockets there and the user cannot do anything about it.
   */
  private isPageVisible(): boolean {
    return (
      typeof document === "undefined" || document.visibilityState === "visible"
    );
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => this.connect(), this.reconnectInterval);
      this.reconnectAttempts++;
      // Only the first and last attempts are informative; the ones in between
      // are the same message repeated once every reconnectInterval.
      if (this.reconnectAttempts === 1 && this.isPageVisible()) {
        console.info(`${this.describe()} reconnecting…`);
      }
    } else if (this.isPageVisible()) {
      console.warn(
        `${this.describe()} gave up after ${this.maxReconnectAttempts} attempts. Live updates on this page have stopped; reload to retry.`
      );
      this.listeners["exhausted"]?.forEach((cb) => cb({ url: this.url }));
    }
  }

  // --- Ping-Pong Methods ---
  private startPing() {
    this.pingIntervalId = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: "PING" });
        // Start a timeout waiting for pong response.
        this.pongTimeoutId = setTimeout(() => {
          // Recoverable: closing here is what triggers the reconnect.
          if (this.isPageVisible()) {
            console.warn(
              `${this.describe()} did not answer a ping within ${this.pongTimeoutMs}ms; reconnecting.`
            );
          }
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
