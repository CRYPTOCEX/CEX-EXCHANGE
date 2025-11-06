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

export type MarketType = "spot" | "eco" | "futures";

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

  // Cache last received data to provide immediate data to late subscribers
  private lastDataCache: Map<string, OrderData[]> = new Map();

  // WebSocket connections for different market types
  private wsConnections: Map<MarketType, string> = new Map();

  constructor() {
    // Initialize WebSocket URLs for different market types
    if (typeof window !== "undefined") {
      const baseWsUrl =
        process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
        `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
      this.wsConnections.set("spot", `${baseWsUrl}/api/exchange/order`);
      this.wsConnections.set("eco", `${baseWsUrl}/api/ecosystem/order`);
      this.wsConnections.set("futures", `${baseWsUrl}/api/futures/order`);
    } else {
      this.wsConnections.set("spot", "ws://localhost:3000/api/exchange/order");
      this.wsConnections.set("eco", "ws://localhost:3000/api/ecosystem/order");
      this.wsConnections.set("futures", "ws://localhost:3000/api/futures/order");
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

      // If connection is established, process pending subscriptions
      if (status === ConnectionStatus.CONNECTED) {
        this.processPendingSubscriptions(marketType);
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

      // If no more callbacks, unsubscribe from server
      if (callbackSet.size === 0) {
        this.callbacks.delete(key);
        this.activeSubscriptions.delete(key);
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
