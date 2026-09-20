import { ConnectionStatus, wsManager } from "./ws-manager";

// Export ConnectionStatus for use in other files
export { ConnectionStatus } from "./ws-manager";

// Define order types
export interface OrderData {
  id: string;
  userId: string;
  symbol: string;
  type: string;
  timeInForce?: string;
  side: string;
  price: number;
  amount: number;
  filled: number;
  remaining: number;
  cost: number;
  fee: number;
  feeCurrency: string;
  average: number;
  trades: string | any[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type MarketType = "spot" | "eco" | "futures" | "forex";

export interface OrdersSubscription {
  userId: string;
  marketType: MarketType;
}

// Define the orders WebSocket service
export class OrdersWebSocketService {
  private static instance: OrdersWebSocketService;
  private isInitialized = false;
  private activeSubscriptions: Map<string, OrdersSubscription> = new Map();
  private callbacks: Map<string, Set<(data: OrderData[]) => void>> = new Map();
  private connectedMarketTypes: Set<MarketType> = new Set();
  private subscriptionSent: Map<string, boolean> = new Map();
  private pendingSubscriptions: Map<MarketType, Set<string>> = new Map();
  private connectionStatusMap: Map<MarketType, ConnectionStatus> = new Map();
  private unsubscribeTimers: Map<string, NodeJS.Timeout> = new Map();

  // Cache last received data to provide immediate data to late subscribers
  private lastDataCache: Map<string, OrderData[]> = new Map();

  // WebSocket connections for different market types
  private wsConnections: Map<MarketType, string> = new Map();

  constructor() {
    // All backends now use /api/ prefix
    // Initialize WebSocket URLs for different market types
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const isDev = process.env.NODE_ENV === "development";
      const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";

      // In development, connect directly to backend (Next.js rewrites don't support WebSocket upgrades)
      // In production, use same host (frontend and backend are served from same domain)
      let baseWsUrl: string;
      if (process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
        baseWsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
      } else if (isDev) {
        // Development: connect directly to backend port
        baseWsUrl = `${protocol}//${window.location.hostname}:${backendPort}`;
      } else {
        // Production: use same host
        baseWsUrl = `${protocol}//${window.location.host}`;
      }

      this.wsConnections.set("spot", `${baseWsUrl}/api/exchange/order`);
      this.wsConnections.set("eco", `${baseWsUrl}/api/ecosystem/order`);
      this.wsConnections.set("futures", `${baseWsUrl}/api/futures/order`);
      this.wsConnections.set("forex", `${baseWsUrl}/api/forex-trading/order`);
    } else {
      // Server-side rendering fallback
      const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
      this.wsConnections.set("spot", `ws://localhost:${backendPort}/api/exchange/order`);
      this.wsConnections.set("eco", `ws://localhost:${backendPort}/api/ecosystem/order`);
      this.wsConnections.set("futures", `ws://localhost:${backendPort}/api/futures/order`);
      this.wsConnections.set("forex", `ws://localhost:${backendPort}/api/forex-trading/order`);
    }

    // Initialize connection status for all market types
    this.wsConnections.forEach((_, marketType) => {
      this.connectionStatusMap.set(marketType, ConnectionStatus.DISCONNECTED);
      this.pendingSubscriptions.set(marketType, new Set());
    });
  }

  // Get singleton instance
  public static getInstance(): OrdersWebSocketService {
    if (!OrdersWebSocketService.instance) {
      OrdersWebSocketService.instance = new OrdersWebSocketService();
    }
    return OrdersWebSocketService.instance;
  }

  // Initialize the WebSocket service
  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  // Ensure connection for a specific market type
  private ensureConnection(marketType: MarketType, userId: string): void {
    // Use a unique connection ID for orders (not the same as market data)
    const connectionId = `orders-${marketType}`;

    // If already connected to this market type, do nothing
    if (this.connectedMarketTypes.has(marketType)) {
      return;
    }

    // Get the WebSocket URL for this market type
    const baseUrl = this.wsConnections.get(marketType);
    if (!baseUrl) {
      console.error(`[Orders WS] No WebSocket URL defined for market type: ${marketType}`);
      return;
    }

    // Add userId as query parameter
    const url = `${baseUrl}?userId=${userId}`;

    // Connect to the WebSocket server with unique connection ID
    wsManager.connect(url, connectionId);
    this.connectedMarketTypes.add(marketType);

    // Add a status listener to monitor connection state
    wsManager.addStatusListener((status) => {
      // Update connection status
      this.connectionStatusMap.set(marketType, status);

      // Socket dropped: the server forgets this connection's subscriptions (a
      // reconnect gets a fresh server-side guest id). Clear the "already sent"
      // flags so the reconnect actually RE-SENDS the SUBSCRIBE frame — otherwise
      // live order/fill updates stop arriving until a hard refresh.
      if (
        status === ConnectionStatus.DISCONNECTED ||
        status === ConnectionStatus.RECONNECTING ||
        status === ConnectionStatus.ERROR
      ) {
        this.resetWireStateForMarketType(marketType);
      }

      // Connection (re)established: drain pending AND replay active subscriptions.
      // On a reconnect the subs live in activeSubscriptions (pending is empty),
      // so processPendingSubscriptions alone would never re-subscribe.
      if (status === ConnectionStatus.CONNECTED) {
        this.processPendingSubscriptions(marketType);
        this.resubscribeActiveForMarketType(marketType);
      }
    }, connectionId);

    // Subscribe to orders stream messages
    wsManager.subscribe(
      "orders",
      (data: any) => {
        // Find all subscriptions for this market type and notify them
        this.activeSubscriptions.forEach((subscription, key) => {
          if (subscription.marketType === marketType) {
            // Update cache
            this.lastDataCache.set(key, data);

            // Notify all callbacks
            const callbackSet = this.callbacks.get(key);
            if (callbackSet && callbackSet.size > 0) {
              callbackSet.forEach((callback) => {
                try {
                  callback(data);
                } catch (error) {
                  console.error("Error in orders callback:", error);
                }
              });
            }
          }
        });
      },
      connectionId
    );
  }

  // Process pending subscriptions for a market type
  private processPendingSubscriptions(marketType: MarketType): void {
    if (!this.pendingSubscriptions.has(marketType)) return;

    const pendingKeys = this.pendingSubscriptions.get(marketType)!;
    if (pendingKeys.size === 0) return;

    // Process each pending subscription
    for (const key of pendingKeys) {
      const subscription = this.activeSubscriptions.get(key);
      if (subscription) {
        this.sendSubscriptionMessage(subscription);
      }
    }

    // Clear pending subscriptions
    this.pendingSubscriptions.get(marketType)!.clear();
  }

  // Reset the "already sent" wire flags for a market type after a socket drop, so
  // a reconnect actually re-sends SUBSCRIBE. Touches ONLY subscriptionSent —
  // activeSubscriptions/callbacks are the replay source of truth and must survive.
  private resetWireStateForMarketType(marketType: MarketType): void {
    for (const key of Array.from(this.subscriptionSent.keys())) {
      if (key.startsWith(`${marketType}:`)) {
        this.subscriptionSent.delete(key);
      }
    }
  }

  // Re-send SUBSCRIBE for every active subscription of a market type on
  // (re)connect. sendSubscriptionMessage self-dedups via subscriptionSent, so on
  // the initial connect (already sent by processPendingSubscriptions) this
  // no-ops; on a reconnect (flags just reset) it performs the actual replay.
  private resubscribeActiveForMarketType(marketType: MarketType): void {
    this.activeSubscriptions.forEach((subscription) => {
      if (subscription.marketType === marketType) {
        this.sendSubscriptionMessage(subscription);
      }
    });
  }

  // Get the subscription key
  private getSubscriptionKey(userId: string, marketType: MarketType): string {
    return `${marketType}:${userId}`;
  }

  // Send subscription message to the server
  private sendSubscriptionMessage(subscription: OrdersSubscription): void {
    const key = this.getSubscriptionKey(
      subscription.userId,
      subscription.marketType
    );

    // Check if already sent
    if (this.subscriptionSent.get(key)) return;

    // Use unique connection ID for orders
    const connectionId = `orders-${subscription.marketType}`;

    // Send subscription message
    wsManager.sendMessage(
      {
        action: "SUBSCRIBE",
        payload: {
          type: "orders",
          userId: subscription.userId,
        },
      },
      connectionId
    );

    this.subscriptionSent.set(key, true);
  }

  // Subscribe to orders for a user
  public subscribe<T = OrderData[]>(
    subscription: OrdersSubscription,
    callback: (data: T) => void
  ): () => void {
    const key = this.getSubscriptionKey(
      subscription.userId,
      subscription.marketType
    );

    // Cancel any pending unsubscribe for this key (handles React StrictMode double-mount)
    const pendingUnsub = this.unsubscribeTimers.get(key);
    if (pendingUnsub) {
      clearTimeout(pendingUnsub);
      this.unsubscribeTimers.delete(key);
    }

    // Ensure connection exists
    this.ensureConnection(subscription.marketType, subscription.userId);

    // Add to active subscriptions
    this.activeSubscriptions.set(key, subscription);

    // Add callback
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, new Set());
    }
    this.callbacks.get(key)!.add(callback as any);

    // If connection is ready, send subscription
    const status = this.connectionStatusMap.get(subscription.marketType);
    if (status === ConnectionStatus.CONNECTED) {
      this.sendSubscriptionMessage(subscription);
    } else {
      // Add to pending subscriptions
      this.pendingSubscriptions.get(subscription.marketType)!.add(key);
    }

    // If we have cached data, provide it immediately
    const cachedData = this.lastDataCache.get(key);
    if (cachedData) {
      setTimeout(() => callback(cachedData as any), 0);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscription, callback);
    };
  }

  // Unsubscribe from orders
  private unsubscribe(
    subscription: OrdersSubscription,
    callback: (data: any) => void
  ): void {
    const key = this.getSubscriptionKey(
      subscription.userId,
      subscription.marketType
    );

    // Remove callback
    const callbackSet = this.callbacks.get(key);
    if (callbackSet) {
      callbackSet.delete(callback);

      // If no more callbacks, debounce the unsubscribe to handle
      // React StrictMode double-mount (mount → cleanup → mount)
      if (callbackSet.size === 0) {
        this.callbacks.delete(key);
        this.activeSubscriptions.delete(key);

        // Debounce: wait before sending UNSUBSCRIBE to the server
        // If a new subscribe comes in within 200ms, the timer is canceled
        const timer = setTimeout(() => {
          this.unsubscribeTimers.delete(key);
          this.subscriptionSent.delete(key);

          // Use unique connection ID for orders
          const connectionId = `orders-${subscription.marketType}`;

          // Send unsubscribe message
          wsManager.sendMessage(
            {
              action: "UNSUBSCRIBE",
              payload: {
                type: "orders",
                userId: subscription.userId,
              },
            },
            connectionId
          );
        }, 200);

        this.unsubscribeTimers.set(key, timer);
      }
    }
  }

  // Subscribe to connection status changes
  public subscribeToConnectionStatus(
    callback: (status: ConnectionStatus) => void,
    marketType: MarketType
  ): () => void {
    // Use unique connection ID for orders
    const connectionId = `orders-${marketType}`;

    wsManager.addStatusListener(callback, connectionId);

    // Return unsubscribe function
    return () => {
      wsManager.removeStatusListener(callback, connectionId);
    };
  }

  // Get current connection status
  public getConnectionStatus(marketType: MarketType): ConnectionStatus {
    return (
      this.connectionStatusMap.get(marketType) ||
      ConnectionStatus.DISCONNECTED
    );
  }
}

// Export singleton instance
export const ordersWs = OrdersWebSocketService.getInstance();
