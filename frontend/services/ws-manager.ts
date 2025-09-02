export enum ConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

type MessageCallback = (data: any) => void;
type StatusCallback = (status: ConnectionStatus) => void;

export type MarketType = "spot" | "eco" | "futures";

class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocket> = new Map();
  private connectionStatus: Map<string, ConnectionStatus> = new Map();
  private subscriptions: Map<string, Map<string, Set<MessageCallback>>> =
    new Map();
  private statusListeners: Map<string, Set<StatusCallback>> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private messageQueues: Map<string, any[]> = new Map(); // Queue messages until connection is ready
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second delay
  private debug = process.env.NODE_ENV !== "production"; // Enable debug in development

  // Get singleton instance
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  // Connect to a WebSocket server
  public connect(url: string, connectionId = "default"): void {
    // If already connected or connecting, do nothing
    if (
      this.connections.has(connectionId) &&
      (this.connectionStatus.get(connectionId) === ConnectionStatus.CONNECTED ||
        this.connectionStatus.get(connectionId) === ConnectionStatus.CONNECTING)
    ) {
      return;
    }

    // Initialize message queue for this connection if it doesn't exist
    if (!this.messageQueues.has(connectionId)) {
      this.messageQueues.set(connectionId, []);
    }

    // Update connection status
    this.connectionStatus.set(connectionId, ConnectionStatus.CONNECTING);
    this.notifyStatusListeners(connectionId);

    // Create a new WebSocket connection
    // Note: WebSocket in browser automatically includes cookies for same-origin requests
    try {
      // Get access token from cookies if available
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };
      
      const accessToken = getCookie('accessToken');
      
      // Add token to URL if available (for authentication)
      let authUrl = url;
      if (accessToken) {
        const separator = url.includes('?') ? '&' : '?';
        authUrl = `${url}${separator}token=${accessToken}`;
      }
      
      const ws = new WebSocket(authUrl);

      // Set up event handlers
      ws.onopen = () => this.handleOpen(connectionId);
      ws.onmessage = (event) => this.handleMessage(event, connectionId);
      ws.onclose = () => this.handleClose(connectionId, url);
      ws.onerror = (error) => this.handleError(error, connectionId);

      // Store the connection
      this.connections.set(connectionId, ws);
    } catch (error) {
      console.error(
        `Error creating WebSocket connection for ${connectionId}:`,
        error
      );
      this.handleError(new Event("error"), connectionId);
    }
  }

  // Handle WebSocket open event
  private handleOpen(connectionId: string): void {
    this.connectionStatus.set(connectionId, ConnectionStatus.CONNECTED);
    this.reconnectAttempts.set(connectionId, 0); // Reset reconnect attempts
    this.notifyStatusListeners(connectionId);

    // Process any queued messages
    this.processMessageQueue(connectionId);
  }

  // Process queued messages
  private processMessageQueue(connectionId: string): void {
    if (!this.messageQueues.has(connectionId)) return;

    const queue = this.messageQueues.get(connectionId)!;
    if (queue.length === 0) return;

    // Send all queued messages
    while (queue.length > 0) {
      const message = queue.shift()!;
      this.sendMessageImmediate(message, connectionId);
    }
  }

  // Handle WebSocket message event
  private handleMessage(event: MessageEvent, connectionId: string): void {
    try {
      const data = JSON.parse(event.data);
      // Handle different message formats
      let streamKey = data.stream || "default";
      
      // Special handling for support ticket messages
      if (data.method === "reply" && data.payload?.id) {
        streamKey = `ticket-${data.payload.id}`;
      } else if (data.method === "update" && data.payload?.id) {
        streamKey = `ticket-${data.payload.id}`;
      }

      // Notify subscribers
      if (this.subscriptions.has(connectionId)) {
        const connectionSubscriptions = this.subscriptions.get(connectionId)!;
        if (connectionSubscriptions.has(streamKey)) {
          const callbacks = connectionSubscriptions.get(streamKey)!;
          callbacks.forEach((callback) => {
            try {
              callback(data.data || data);
            } catch (error) {
              console.error(`Error in callback for ${streamKey}:`, error);
            }
          });
        }
      }
    } catch (error) {
      console.error(
        `Error parsing WebSocket message for ${connectionId}:`,
        error
      );
    }
  }

  // Handle WebSocket close event
  private handleClose(connectionId: string, url: string): void {
    this.connections.delete(connectionId);
    this.connectionStatus.set(connectionId, ConnectionStatus.DISCONNECTED);
    this.notifyStatusListeners(connectionId);

    // Attempt to reconnect
    this.reconnect(connectionId, url);
  }

  // Handle WebSocket error event
  private handleError(error: Event, connectionId: string): void {
    console.error(`WebSocket error for ${connectionId}:`, error);
  }

  // Attempt to reconnect to the WebSocket server
  private reconnect(connectionId: string, url: string): void {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeouts.has(connectionId)) {
      clearTimeout(this.reconnectTimeouts.get(connectionId)!);
    }

    // Get current reconnect attempts
    const attempts = this.reconnectAttempts.get(connectionId) || 0;

    // Check if we've exceeded the maximum number of reconnect attempts
    if (attempts >= this.maxReconnectAttempts) {
      console.error(
        `Maximum reconnect attempts (${this.maxReconnectAttempts}) reached for ${connectionId}`
      );
      return;
    }

    // Update connection status
    this.connectionStatus.set(connectionId, ConnectionStatus.RECONNECTING);
    this.notifyStatusListeners(connectionId);

    // Calculate exponential backoff delay
    const delay = Math.min(this.reconnectDelay * Math.pow(2, attempts), 30000); // Max 30 seconds

    // Set a timeout to reconnect
    const timeout = setTimeout(() => {
      this.reconnectAttempts.set(connectionId, attempts + 1);
      this.connect(url, connectionId);
    }, delay);

    // Store the timeout
    this.reconnectTimeouts.set(connectionId, timeout);
  }

  // Subscribe to a WebSocket stream
  public subscribe(
    streamKey: string,
    callback: MessageCallback,
    connectionId = "default"
  ): void {
    // Initialize subscriptions map for this connection if it doesn't exist
    if (!this.subscriptions.has(connectionId)) {
      this.subscriptions.set(connectionId, new Map());
    }

    // Initialize callbacks set for this stream if it doesn't exist
    const connectionSubscriptions = this.subscriptions.get(connectionId)!;
    if (!connectionSubscriptions.has(streamKey)) {
      connectionSubscriptions.set(streamKey, new Set());
    }

    // Add the callback to the set
    connectionSubscriptions.get(streamKey)!.add(callback);
  }

  // Unsubscribe from a WebSocket stream
  public unsubscribe(
    streamKey: string,
    callback: MessageCallback,
    connectionId = "default"
  ): void {
    if (this.subscriptions.has(connectionId)) {
      const connectionSubscriptions = this.subscriptions.get(connectionId)!;
      if (connectionSubscriptions.has(streamKey)) {
        const callbacks = connectionSubscriptions.get(streamKey)!;
        callbacks.delete(callback);

        // If no more callbacks, remove the stream
        if (callbacks.size === 0) {
          connectionSubscriptions.delete(streamKey);
        }
      }
    }
  }

  // Send a message to the WebSocket server (queues if not connected)
  public sendMessage(message: any, connectionId = "default"): void {
    // Check if the connection is ready
    if (
      this.connections.has(connectionId) &&
      this.connectionStatus.get(connectionId) === ConnectionStatus.CONNECTED
    ) {
      // Connection is ready, send immediately
      this.sendMessageImmediate(message, connectionId);
    } else {
      // Connection is not ready, queue the message
      if (!this.messageQueues.has(connectionId)) {
        this.messageQueues.set(connectionId, []);
      }

      this.messageQueues.get(connectionId)!.push(message);
    }
  }

  // Send a message immediately without queueing
  private sendMessageImmediate(message: any, connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      connection.send(messageStr);
    } else {
      console.error(
        `Cannot send message: WebSocket for ${connectionId} is not open`
      );
    }
  }

  // Add a status listener
  public addStatusListener(
    callback: StatusCallback,
    connectionId = "default"
  ): void {
    // Initialize status listeners set for this connection if it doesn't exist
    if (!this.statusListeners.has(connectionId)) {
      this.statusListeners.set(connectionId, new Set());
    }

    // Add the callback to the set
    this.statusListeners.get(connectionId)!.add(callback);

    // Notify the listener of the current status
    const status =
      this.connectionStatus.get(connectionId) || ConnectionStatus.DISCONNECTED;
    callback(status);
  }

  // Remove a status listener
  public removeStatusListener(
    callback: StatusCallback,
    connectionId = "default"
  ): void {
    if (this.statusListeners.has(connectionId)) {
      this.statusListeners.get(connectionId)!.delete(callback);
    }
  }

  // Notify all status listeners of a status change
  private notifyStatusListeners(connectionId: string): void {
    const status =
      this.connectionStatus.get(connectionId) || ConnectionStatus.DISCONNECTED;
    if (this.statusListeners.has(connectionId)) {
      this.statusListeners.get(connectionId)!.forEach((callback) => {
        try {
          callback(status);
        } catch (error) {
          console.error(`Error in status listener for ${connectionId}:`, error);
        }
      });
    }
  }

  // Get the current connection status
  public getStatus(connectionId = "default"): ConnectionStatus {
    return (
      this.connectionStatus.get(connectionId) || ConnectionStatus.DISCONNECTED
    );
  }

  // Close a WebSocket connection
  public close(connectionId = "default"): void {
    // Clear any reconnect timeouts for this connection
    const timeout = this.reconnectTimeouts.get(connectionId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(connectionId);
    }
    
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.close();
      this.connections.delete(connectionId);
      this.connectionStatus.set(connectionId, ConnectionStatus.DISCONNECTED);
      this.notifyStatusListeners(connectionId);
      
      // Clear associated data
      this.subscriptions.delete(connectionId);
      this.messageQueues.delete(connectionId);
      this.reconnectAttempts.delete(connectionId);
    }
  }

  // Close all WebSocket connections
  public closeAll(): void {
    this.connections.forEach((connection, connectionId) => {
      this.close(connectionId);
    });
  }
}

// Export singleton instance
export const wsManager = WebSocketManager.getInstance();
