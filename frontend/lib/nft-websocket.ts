/**
 * NFT WebSocket Service
 * Handles real-time NFT marketplace updates
 */

type ActivityType = "MINT" | "SALE" | "TRANSFER" | "LIST" | "BID" | "OFFER";

interface NFTActivity {
  id: string;
  type: ActivityType;
  user: string;
  nftName: string;
  price?: number;
  currency?: string;
  timestamp: Date;
  tokenId?: string;
  collectionId?: string;
}

type ActivityCallback = (activity: NFTActivity) => void;
type StatsCallback = (stats: any) => void;

class NFTWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private activityCallbacks: Set<ActivityCallback> = new Set();
  private statsCallbacks: Set<StatsCallback> = new Set();
  private isConnecting = false;

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      // Get WebSocket URL from environment or construct it
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/api/nft/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[NFT WebSocket] Connected");
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Subscribe to NFT activity channel
        this.send({
          type: "subscribe",
          channel: "nft:activity",
        });

        // Subscribe to stats channel
        this.send({
          type: "subscribe",
          channel: "nft:stats",
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("[NFT WebSocket] Failed to parse message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("[NFT WebSocket] Error:", error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log("[NFT WebSocket] Disconnected");
        this.isConnecting = false;
        this.ws = null;
        this.attemptReconnect();
      };
    } catch (error) {
      console.error("[NFT WebSocket] Connection failed:", error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[NFT WebSocket] Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `[NFT WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Send message to WebSocket server
   */
  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any) {
    switch (data.type) {
      case "nft:activity":
        this.handleActivity(data.payload);
        break;
      case "nft:stats":
        this.handleStats(data.payload);
        break;
      default:
        console.log("[NFT WebSocket] Unknown message type:", data.type);
    }
  }

  /**
   * Handle activity update
   */
  private handleActivity(activity: any) {
    const formattedActivity: NFTActivity = {
      id: activity.id || Date.now().toString(),
      type: activity.type,
      user: activity.user || activity.fromUser?.username || "Anonymous",
      nftName: activity.nftName || activity.token?.name || "Unknown NFT",
      price: activity.price,
      currency: activity.currency || "ETH",
      timestamp: new Date(activity.timestamp || activity.createdAt),
      tokenId: activity.tokenId,
      collectionId: activity.collectionId,
    };

    // Notify all activity callbacks
    this.activityCallbacks.forEach((callback) => {
      try {
        callback(formattedActivity);
      } catch (error) {
        console.error("[NFT WebSocket] Activity callback error:", error);
      }
    });
  }

  /**
   * Handle stats update
   */
  private handleStats(stats: any) {
    // Notify all stats callbacks
    this.statsCallbacks.forEach((callback) => {
      try {
        callback(stats);
      } catch (error) {
        console.error("[NFT WebSocket] Stats callback error:", error);
      }
    });
  }

  /**
   * Subscribe to activity updates
   */
  onActivity(callback: ActivityCallback): () => void {
    this.activityCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.activityCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to stats updates
   */
  onStats(callback: StatsCallback): () => void {
    this.statsCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.statsCallbacks.delete(callback);
    };
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const nftWebSocket = new NFTWebSocketService();

// Auto-connect on client side
if (typeof window !== "undefined") {
  // Connect after a short delay to ensure page is loaded
  setTimeout(() => {
    nftWebSocket.connect();
  }, 1000);

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    nftWebSocket.disconnect();
  });
}

export default nftWebSocket;
