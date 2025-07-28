import { ConnectionStatus, wsManager } from "./ws-manager";
import { isExtensionAvailable } from "@/lib/extensions";

// Export ConnectionStatus for use in other files
export { ConnectionStatus } from "./ws-manager";

// Define data types
export interface TradeData {
  id: string | number;
  price: number;
  amount: number;
  timestamp: number;
  side: "buy" | "sell";
  symbol: string;
  cost?: number;
  datetime?: string;
  info?: any;
}

export interface OrderbookData {
  bids: Array<[number, number]>; // [price, amount]
  asks: Array<[number, number]>; // [price, amount]
  timestamp: number;
  symbol: string;
  nonce?: number;
  datetime?: string;
}

export interface TickerData {
  symbol: string;
  timestamp: number;
  datetime: string;
  high: number;
  low: number;
  bid: number;
  bidVolume: number;
  ask: number;
  askVolume: number;
  vwap: number;
  open: number;
  close: number;
  last: number;
  previousClose: number;
  change: number;
  percentage: number;
  average: number;
  baseVolume: number;
  quoteVolume: number;
  info?: any;
}

export interface OHLCVData {
  stream: string;
  data: Array<[number, number, number, number, number, number]>; // [timestamp, open, high, low, close, volume]
}

export type MarketType = "spot" | "eco" | "futures";

export interface MarketDataSubscription {
  symbol: string;
  type: "orderbook" | "trades" | "ticker" | "ohlcv";
  marketType: MarketType;
  limit?: number;
  interval?: string; // For OHLCV data
}

// Helper function to get current candle timestamp
function getCurrentCandleTimestamp(interval: string): number {
  const now = Date.now();
  let intervalMs = 0;

  switch (interval) {
    case "1m":
      intervalMs = 60 * 1000;
      break;
    case "5m":
      intervalMs = 5 * 60 * 1000;
      break;
    case "15m":
      intervalMs = 15 * 60 * 1000;
      break;
    case "30m":
      intervalMs = 30 * 60 * 1000;
      break;
    case "1h":
      intervalMs = 60 * 60 * 1000;
      break;
    case "4h":
      intervalMs = 4 * 60 * 60 * 1000;
      break;
    case "1d":
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    default:
      intervalMs = 60 * 60 * 1000; // Default to 1 hour
  }

  return Math.floor(now / intervalMs) * intervalMs;
}

// Define the market data WebSocket service
export class MarketDataWebSocketService {
  private static instance: MarketDataWebSocketService;
  private isInitialized = false;
  private activeSubscriptions: Map<string, MarketDataSubscription> = new Map();
  private callbacks: Map<string, Set<(data: any) => void>> = new Map();
  private connectedMarketTypes: Set<MarketType> = new Set();
  private subscriptionSent: Map<string, boolean> = new Map();
  private pendingSubscriptions: Map<MarketType, Set<string>> = new Map();
  private connectionStatusMap: Map<MarketType, ConnectionStatus> = new Map();
  private debug = process.env.NODE_ENV !== "production" && true;

  // Track active stream subscriptions to prevent duplicates
  private activeStreamSubscriptions: Map<string, Set<string>> = new Map();

  // WebSocket connections for different market types
  private wsConnections: Map<MarketType, string> = new Map();

  constructor() {
    // Initialize WebSocket URLs for different market types
    if (typeof window !== "undefined") {
      const baseWsUrl =
        process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
        `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
      this.wsConnections.set("spot", `${baseWsUrl}/api/exchange/market`);
      this.wsConnections.set("eco", `${baseWsUrl}/api/ecosystem/market`);
      this.wsConnections.set("futures", `${baseWsUrl}/api/futures/market`);
    } else {
      this.wsConnections.set("spot", "ws://localhost:3000/api/exchange/market");
      this.wsConnections.set("eco", "ws://localhost:3000/api/ecosystem/market");
      this.wsConnections.set(
        "futures",
        "ws://localhost:3000/api/futures/market"
      );
    }

    // Initialize connection status for all market types
    this.wsConnections.forEach((_, marketType) => {
      this.connectionStatusMap.set(marketType, ConnectionStatus.DISCONNECTED);
      this.pendingSubscriptions.set(marketType, new Set());
      this.activeStreamSubscriptions.set(marketType, new Set());
    });
  }

  // Get singleton instance
  public static getInstance(): MarketDataWebSocketService {
    if (!MarketDataWebSocketService.instance) {
      MarketDataWebSocketService.instance = new MarketDataWebSocketService();
    }
    return MarketDataWebSocketService.instance;
  }

  // Get appropriate limit based on provider and tick size
  public getProviderLimit(tickSize: number): number {
    const provider =
      typeof window !== "undefined" ? process.env.NEXT_PUBLIC_EXCHANGE : "bin"; // Default to binance if not specified

    // Define limits based on provider and tick size
    if (provider === "xt") {
      // XT only supports 5, 10, 20, or 50
      if (tickSize <= 0.01) return 5;
      if (tickSize <= 0.1) return 10;
      if (tickSize <= 1) return 20;
      return 50;
    } else if (provider === "kuc") {
      // Kucoin limits
      if (tickSize <= 0.01) return 50;
      if (tickSize <= 0.1) return 50;
      if (tickSize <= 1) return 100;
      return 100;
    } else {
      // Binance and others
      if (tickSize <= 0.01) return 40;
      if (tickSize <= 0.1) return 80;
      if (tickSize <= 1) return 160;
      return 320;
    }
  }

  // Initialize the WebSocket service
  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (this.debug) {
      console.log("Market data WebSocket service initialized");
    }
  }

  // Format symbol for WebSocket (ensure it has a / between currency and pair)
  private formatSymbol(symbol: string): string {
    // If the symbol already contains a /, return it as is
    if (symbol.includes("/")) {
      return symbol;
    }

    // Convert other delimiters to slash format
    if (symbol.includes("-")) {
      return symbol.replace("-", "/");
    }
    if (symbol.includes("_")) {
      return symbol.replace("_", "/");
    }

    // For symbols without delimiters (like BTCUSDT), try to split intelligently
    const midPoint = Math.floor(symbol.length / 2);
    
    // Try different split points around the middle to find a reasonable split
    for (let i = Math.max(2, midPoint - 2); i <= Math.min(symbol.length - 2, midPoint + 2); i++) {
      const base = symbol.substring(0, i);
      const quote = symbol.substring(i);
      
      // Prefer splits where quote is 3-4 characters (common for crypto quotes)
      if (quote.length >= 3 && quote.length <= 4) {
        return `${base}/${quote}`;
      }
    }

    // Fallback: split at midpoint
    const currency = symbol.substring(0, midPoint);
    const pair = symbol.substring(midPoint);
    return `${currency}/${pair}`;
  }

  // Ensure connection for a specific market type
  private ensureConnection(marketType: MarketType): void {
    // Check if the extension is available for this market type
    if (marketType === "eco" && !isExtensionAvailable("ecosystem")) {
      console.warn("Ecosystem extension not available, skipping eco market connection");
      return;
    }
    
    if (marketType === "futures" && !isExtensionAvailable("futures")) {
      console.warn("Futures extension not available, skipping futures market connection");
      return;
    }

    // If already connected to this market type, do nothing
    if (this.connectedMarketTypes.has(marketType)) return;

    // Get the WebSocket URL for this market type
    const url = this.wsConnections.get(marketType);
    if (!url) {
      console.error(`No WebSocket URL defined for market type: ${marketType}`);
      return;
    }

    // Connect to the WebSocket server
    wsManager.connect(url, marketType);
    this.connectedMarketTypes.add(marketType);

    if (this.debug) {
      console.log(`Connected to ${marketType} market WebSocket at ${url}`);
    }

    // Add a status listener to monitor connection state
    wsManager.addStatusListener((status) => {
      if (this.debug) {
        console.log(`WebSocket status for ${marketType}: ${status}`);
      }

      // Update connection status
      this.connectionStatusMap.set(marketType, status);

      // If connection is established, process pending subscriptions
      if (status === ConnectionStatus.CONNECTED) {
        this.processPendingSubscriptions(marketType);
      }
    }, marketType);
  }

  // Process pending subscriptions for a market type
  private processPendingSubscriptions(marketType: MarketType): void {
    if (!this.pendingSubscriptions.has(marketType)) return;

    const pendingKeys = this.pendingSubscriptions.get(marketType)!;
    if (pendingKeys.size === 0) return;

    // Create a set of unique subscriptions to send
    const uniqueSubscriptions = new Map<string, MarketDataSubscription>();

    // Process each pending subscription
    for (const key of pendingKeys) {
      const subscription = this.activeSubscriptions.get(key);
      if (subscription) {
        // Use type and symbol as deduplication key
        const dedupeKey = `${subscription.type}:${subscription.symbol}`;
        uniqueSubscriptions.set(dedupeKey, subscription);
      }
    }

    // Send subscription messages for each unique subscription
    for (const subscription of uniqueSubscriptions.values()) {
      this.sendSubscriptionMessage(subscription);
    }

    // Clear pending subscriptions
    this.pendingSubscriptions.get(marketType)!.clear();
  }

  // Get the subscription key
  private getSubscriptionKey(
    type: string,
    symbol: string,
    marketType: MarketType,
    interval?: string
  ): string {
    return interval
      ? `${marketType}:${type}:${symbol}:${interval}`
      : `${marketType}:${type}:${symbol}`;
  }

  // Get the stream key
  private getStreamKey(
    type: string,
    limit?: number,
    interval?: string
  ): string {
    if (type === "ohlcv" && interval) {
      return `${type}:${interval}`;
    }
    return limit ? `${type}:${limit}` : type;
  }

  // Check if a stream is already subscribed
  private isStreamSubscribed(
    streamKey: string,
    marketType: MarketType
  ): boolean {
    return (
      this.activeStreamSubscriptions.get(marketType)?.has(streamKey) || false
    );
  }

  // Normalize OHLCV data to a consistent format
  private normalizeOHLCVData(data: any, interval: string): any {
    // If data is already an array of candles, wrap it in the expected format
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      Array.isArray(data[0]) &&
      data[0].length >= 6
    ) {
      return {
        stream: `ohlcv:${interval}`,
        data: data,
      };
    }

    // If data has stream and data properties, return it as is (backend enhanced format)
    if (
      data &&
      data.stream &&
      data.stream.startsWith("ohlcv:") &&
      Array.isArray(data.data)
    ) {
      return data;
    }

    // Try to parse if it's a string
    if (typeof data === "string") {
      try {
        const parsedData = JSON.parse(data);

        if (
          parsedData &&
          parsedData.stream &&
          parsedData.stream.startsWith("ohlcv:") &&
          Array.isArray(parsedData.data)
        ) {
          return parsedData;
        }

        // Handle case where the data might be a single candle update
        if (parsedData && Array.isArray(parsedData) && parsedData.length >= 6) {
          return {
            stream: `ohlcv:${interval}`,
            data: [parsedData],
          };
        }
      } catch (e) {
        console.error("[Market Data WS] Failed to parse string data:", e);
      }
    }

    // Try to return it in the expected format anyway
    if (data && data.stream && data.data) {
      return data;
    }

    return null;
  }

  // Enhance the WebSocket service to better handle current candle updates

  // Add this function to the MarketDataWebSocketService class
  private ensureCurrentCandleInMessage(message: any, interval: string): any {
    // Skip if not an OHLCV message or no data
    if (
      !message?.stream?.startsWith("ohlcv") ||
      !Array.isArray(message.data) ||
      message.data.length === 0
    ) {
      return message;
    }

    // Get the current candle timestamp
    const currentCandleTimestamp = getCurrentCandleTimestamp(interval);

    // Check if the current candle is in the message
    let hasCurrentCandle = false;
    for (const candleData of message.data) {
      if (Array.isArray(candleData) && candleData.length >= 6) {
        const timestamp = Number(candleData[0]);
        // Use a 5-second tolerance to account for potential timing differences
        if (Math.abs(timestamp - currentCandleTimestamp) < 5000) {
          hasCurrentCandle = true;
          break;
        }
      }
    }

    // If the current candle is not in the message, add it
    if (!hasCurrentCandle && message.data.length > 0) {
      // Get the last candle in the message
      const lastCandle = message.data[message.data.length - 1];
      if (Array.isArray(lastCandle) && lastCandle.length >= 6) {
        // Create a new candle with the current timestamp
        const newCandle = [
          currentCandleTimestamp,
          lastCandle[4], // Use the close of the last candle as the open
          lastCandle[4], // Use the close of the last candle as the high
          lastCandle[4], // Use the close of the last candle as the low
          lastCandle[4], // Use the close of the last candle as the close
          0, // Start with zero volume
        ];

        // Add the new candle to the message
        const newData = [...message.data, newCandle];

        // Sort by timestamp
        newData.sort((a, b) => a[0] - b[0]);

        // Create a new message with the updated data
        const newMessage = {
          ...message,
          data: newData,
        };

        return newMessage;
      }
    }

    return message;
  }

  // Modify the processOHLCVMessage method to use the new function
  private processCurrentCandleUpdate(message: any, interval: string): boolean {
    // First ensure the current candle is in the message
    const enhancedMessage = this.ensureCurrentCandleInMessage(
      message,
      interval
    );

    // Skip if not an OHLCV message or no data
    if (
      !enhancedMessage?.stream?.startsWith("ohlcv") ||
      !Array.isArray(enhancedMessage.data) ||
      enhancedMessage.data.length === 0
    ) {
      return false;
    }

    // Get the current candle timestamp
    const currentCandleTimestamp = getCurrentCandleTimestamp(interval);

    // Check if any of the candles in the message is the current candle
    for (const candleData of enhancedMessage.data) {
      if (Array.isArray(candleData) && candleData.length >= 6) {
        const timestamp = Number(candleData[0]);

        // Check if this is the current candle (with some tolerance for timestamp differences)
        // Use a 5-second tolerance to account for potential timing differences
        const isCurrentCandle =
          Math.abs(timestamp - currentCandleTimestamp) < 5000;

        if (isCurrentCandle) {
          return true;
        }
      }
    }

    return false;
  }

  // Subscribe to market data
  public subscribe<T>(
    subscription: MarketDataSubscription,
    callback: (data: T) => void
  ): () => void {
    if (!this.isInitialized) {
      this.initialize();
    }

    // Format the symbol to ensure it has a / between currency and pair
    const formattedSymbol = this.formatSymbol(subscription.symbol);
    const { type, marketType, interval } = subscription;

    // Determine appropriate limit based on provider if it's an orderbook subscription
    let limit = subscription.limit;
    if (type === "orderbook" && !limit) {
      // Default tick size if not specified
      const tickSize = 0.01;
      limit = this.getProviderLimit(tickSize);
    }

    // Create a new subscription object with the formatted symbol and adjusted limit
    const formattedSubscription = {
      ...subscription,
      symbol: formattedSymbol,
      limit,
    };

    const subscriptionKey = this.getSubscriptionKey(
      type,
      formattedSymbol,
      marketType,
      interval
    );
    const streamKey = this.getStreamKey(type, limit, interval);

    if (this.debug) {
      console.log(
        `Subscribing to ${type} for ${formattedSymbol} on ${marketType} market with limit ${limit || "N/A"}${interval ? ` and interval ${interval}` : ""}`
      );
    }

    // Ensure we have a connection for this market type
    this.ensureConnection(marketType);

    // Register the callback
    if (!this.callbacks.has(subscriptionKey)) {
      this.callbacks.set(subscriptionKey, new Set());
    }
    this.callbacks.get(subscriptionKey)!.add(callback);

    // Store the subscription
    this.activeSubscriptions.set(subscriptionKey, formattedSubscription);

    // Check if we're connected
    const isConnected =
      this.connectionStatusMap.get(marketType) === ConnectionStatus.CONNECTED;

    // If connected, send subscription immediately (if not already sent)
    // Otherwise, queue it for when connection is established
    if (isConnected) {
      if (
        !this.subscriptionSent.has(subscriptionKey) &&
        !this.isStreamSubscribed(streamKey, marketType)
      ) {
        this.sendSubscriptionMessage(formattedSubscription);
        this.subscriptionSent.set(subscriptionKey, true);

        // Mark this stream as subscribed
        this.activeStreamSubscriptions.get(marketType)!.add(streamKey);
      }
    } else {
      // Add to pending subscriptions
      if (!this.pendingSubscriptions.has(marketType)) {
        this.pendingSubscriptions.set(marketType, new Set());
      }
      this.pendingSubscriptions.get(marketType)!.add(subscriptionKey);

      if (this.debug) {
        console.log(
          `Queued subscription for ${formattedSymbol} on ${marketType} market`
        );
      }
    }

    // Subscribe to the WebSocket stream for the specific market type
    wsManager.subscribe(
      streamKey,
      (data) => {
        try {
          // Handle different OHLCV data formats
          if (type === "ohlcv") {
            // Normalize the data format
            const normalizedData = this.normalizeOHLCVData(
              data,
              interval || "1h"
            );

            if (!normalizedData) {
              console.error("[Market Data WS] Failed to normalize data:", data);
              return;
            }

            // Check if the interval matches - handle both formats: ohlcv:interval and ohlcv:interval:symbol
            if (interval && normalizedData.stream) {
              const streamParts = normalizedData.stream.split(":");
              const dataInterval = streamParts[1]; // Should be the interval part
              
              if (dataInterval !== interval) {
                return;
              }
            }

            // Get callbacks for this subscription and call them
            const callbacks = this.callbacks.get(subscriptionKey);

            if (callbacks && callbacks.size > 0) {
              callbacks.forEach((cb) => {
                try {
                  cb(normalizedData as any);
                } catch (error) {
                  console.error(
                    `[Market Data WS] Error in callback for ${subscriptionKey}:`,
                    error
                  );
                }
              });
            }
            return;
          }

          // Handle data structure - check if data is wrapped in a data property
          let actualData = data;
          if (data.data && typeof data.data === 'object') {
            actualData = data.data;
          }



          // For orderbook and ticker data, we don't need to validate symbol since it's already filtered by subscription
          // For trades data, check if the data is for this symbol
          if (type === "trades") {
            if (
              actualData.symbol !== formattedSymbol &&
              !(
                Array.isArray(actualData) &&
                actualData.length > 0 &&
                actualData[0].symbol === formattedSymbol
              )
            ) {
              if (this.debug) {
                console.log(`[Market Data WS] Skipping trades data - symbol mismatch. Expected: ${formattedSymbol}, Got: ${actualData.symbol}`);
              }
              return; // Skip if the symbol doesn't match
            }
          }

          // Ensure orderbook and ticker data have symbol property
          if ((type === "orderbook" || type === "ticker") && !actualData.symbol) {
            actualData.symbol = formattedSymbol;
            actualData.timestamp = actualData.timestamp || Date.now();
          }

          const callbacks = this.callbacks.get(subscriptionKey);
          if (callbacks) {
            callbacks.forEach((cb) => {
              try {
                cb(actualData);
              } catch (error) {
                console.error(
                  `Error in callback for ${subscriptionKey}:`,
                  error
                );
              }
            });
          }
        } catch (error) {
          console.error(
            `Error processing WebSocket data for ${subscriptionKey}:`,
            error
          );
        }
      },
      marketType
    );

    // Return unsubscribe function
    return () => {
      this.unsubscribe(formattedSubscription, callback);
    };
  }

  // Unsubscribe from market data
  public unsubscribe<T>(
    subscription: MarketDataSubscription,
    callback: (data: T) => void
  ): void {
    const { type, symbol, marketType, interval } = subscription;
    const formattedSymbol = this.formatSymbol(symbol);
    const subscriptionKey = this.getSubscriptionKey(
      type,
      formattedSymbol,
      marketType,
      interval
    );
    const streamKey = this.getStreamKey(type, subscription.limit, interval);

    // Remove the callback
    const callbacks = this.callbacks.get(subscriptionKey);
    if (callbacks) {
      callbacks.delete(callback);

      // If no more callbacks, unsubscribe from the WebSocket
      if (callbacks.size === 0) {
        // Check if any other subscriptions are using this stream BEFORE removing the current one
        let shouldUnsubscribe = true;
        for (const [key, sub] of this.activeSubscriptions.entries()) {
          if (
            key !== subscriptionKey && // Don't count the current subscription we're removing
            sub.marketType === marketType &&
            sub.type === type &&
            this.getStreamKey(sub.type, sub.limit, sub.interval) === streamKey
          ) {
            shouldUnsubscribe = false;
            break;
          }
        }

        // Clean up the subscription data
        this.callbacks.delete(subscriptionKey);
        this.activeSubscriptions.delete(subscriptionKey);

        // Only send unsubscribe if we previously sent a subscribe and no other subscriptions are using this stream
        if (this.subscriptionSent.has(subscriptionKey) && shouldUnsubscribe) {
          this.sendUnsubscriptionMessage(subscription);
          this.subscriptionSent.delete(subscriptionKey);

          // Remove this stream from active subscriptions
          this.activeStreamSubscriptions.get(marketType)?.delete(streamKey);
        }

        // Remove from pending subscriptions if it's there
        if (this.pendingSubscriptions.has(marketType)) {
          this.pendingSubscriptions.get(marketType)!.delete(subscriptionKey);
        }
      }
    }
  }

  // Send a subscription message
  private sendSubscriptionMessage(subscription: MarketDataSubscription): void {
    const { symbol, type, marketType, limit, interval } = subscription;
    const formattedSymbol = this.formatSymbol(symbol);
    const streamKey = this.getStreamKey(type, limit, interval);
    const subscriptionKey = this.getSubscriptionKey(type, formattedSymbol, marketType, interval);

    // Check if this stream is already subscribed
    if (this.isStreamSubscribed(streamKey, marketType)) {
      if (this.debug) {
        console.log(
          `Stream ${streamKey} for ${marketType} is already subscribed, skipping subscription message`
        );
      }
      return;
    }

    // Create the subscription message
    const message = {
      action: "SUBSCRIBE",
      payload: {
        type,
        ...(limit ? { limit } : {}),
        ...(interval ? { interval } : {}),
        symbol: formattedSymbol,
      },
    };

    // Send subscription message to the appropriate WebSocket connection
    wsManager.sendMessage(message, marketType);

    // Mark this stream as subscribed
    this.activeStreamSubscriptions.get(marketType)!.add(streamKey);

    // Mark this subscription as sent so it can be properly unsubscribed later
    this.subscriptionSent.set(subscriptionKey, true);

    if (this.debug) {
      console.log(
        `Sent subscription message for ${type} for ${formattedSymbol} on ${marketType} market:`,
        message
      );
    }
  }

  // Send an unsubscription message
  private sendUnsubscriptionMessage(
    subscription: MarketDataSubscription
  ): void {
    const { symbol, type, marketType, limit, interval } = subscription;
    const formattedSymbol = this.formatSymbol(symbol);
    const streamKey = this.getStreamKey(type, limit, interval);

    // Create the unsubscription message
    const message = {
      action: "UNSUBSCRIBE",
      payload: {
        type,
        ...(limit ? { limit } : {}),
        ...(interval ? { interval } : {}),
        symbol: formattedSymbol,
      },
    };

    // Send unsubscription message to the appropriate WebSocket connection
    wsManager.sendMessage(message, marketType);

    // Remove this stream from active subscriptions
    this.activeStreamSubscriptions.get(marketType)?.delete(streamKey);
  }

  // Get the API endpoint for a market type
  public getMarketEndpoint(marketType: MarketType): string {
    switch (marketType) {
      case "spot":
        return "/api/exchange/market";
      case "eco":
        return "/api/ecosystem/market";
      case "futures":
        return "/api/futures/market";
      default:
        return "/api/exchange/market";
    }
  }

  // Subscribe to connection status updates for a specific market type
  public subscribeToConnectionStatus(
    callback: (status: ConnectionStatus) => void,
    marketType: MarketType
  ): () => void {
    wsManager.addStatusListener(callback, marketType);
    return () => wsManager.removeStatusListener(callback, marketType);
  }

  // Get the current connection status for a specific market type
  public getConnectionStatus(marketType: MarketType): ConnectionStatus {
    return (
      this.connectionStatusMap.get(marketType) || ConnectionStatus.DISCONNECTED
    );
  }

  // Check if we have any active subscriptions for a market type
  private hasActiveSubscriptionsForMarketType(marketType: MarketType): boolean {
    for (const subscription of this.activeSubscriptions.values()) {
      if (subscription.marketType === marketType) {
        return true;
      }
    }
    return false;
  }

  // Close connection for a market type if no active subscriptions
  private closeUnusedConnections(): void {
    for (const marketType of this.connectedMarketTypes) {
      if (!this.hasActiveSubscriptionsForMarketType(marketType)) {
        wsManager.close(marketType);
        this.connectedMarketTypes.delete(marketType);
        this.connectionStatusMap.set(marketType, ConnectionStatus.DISCONNECTED);

        if (this.debug) {
          console.log(`Closed unused connection for ${marketType} market`);
        }
      }
    }
  }

  // Clean up all subscriptions
  public cleanup(): void {
    // Unsubscribe from all streams
    this.activeSubscriptions.forEach((subscription) => {
      if (
        this.subscriptionSent.has(
          this.getSubscriptionKey(
            subscription.type,
            subscription.symbol,
            subscription.marketType,
            subscription.interval
          )
        )
      ) {
        this.sendUnsubscriptionMessage(subscription);
      }
    });

    // Close all connections
    this.connectedMarketTypes.forEach((marketType) => {
      wsManager.close(marketType);
      this.connectionStatusMap.set(marketType, ConnectionStatus.DISCONNECTED);
    });

    // Clear all maps and sets
    this.activeSubscriptions.clear();
    this.callbacks.clear();
    this.connectedMarketTypes.clear();
    this.subscriptionSent.clear();
    this.activeStreamSubscriptions.forEach((set) => set.clear());

    // Clear pending subscriptions
    this.pendingSubscriptions.forEach((set) => set.clear());

    // Reset initialization flag
    this.isInitialized = false;

    if (this.debug) {
      console.log("Market data WebSocket service cleaned up");
    }
  }
}

// Export singleton instance
export const marketDataWs = MarketDataWebSocketService.getInstance();
