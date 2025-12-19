import { messageBroker } from "@b/handler/Websocket";
import { MatchingEngine } from "@b/api/(ext)/ecosystem/utils/matchingEngine";
import { getOrderBook, getRecentTrades, getOHLCV } from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import { models } from "@b/db";
import { logger } from "@b/utils/console";

export const metadata = {
  logModule: "ECOSYSTEM",
  logTitle: "Market WebSocket connection"
};

class UnifiedEcosystemMarketDataHandler {
  private static instance: UnifiedEcosystemMarketDataHandler;
  private activeSubscriptions: Map<string, Map<string, any>> = new Map(); // symbol -> Map<type, subscriptionPayload>
  private intervalMap: Map<string, NodeJS.Timeout> = new Map(); // symbol -> interval
  private lastTickerData: Map<string, any> = new Map(); // symbol -> last ticker data
  private lastOrderbookData: Map<string, string> = new Map(); // symbol -> last orderbook hash
  private engine: any = null;

  private constructor() {}

  public static getInstance(): UnifiedEcosystemMarketDataHandler {
    if (!UnifiedEcosystemMarketDataHandler.instance) {
      UnifiedEcosystemMarketDataHandler.instance = new UnifiedEcosystemMarketDataHandler();
    }
    return UnifiedEcosystemMarketDataHandler.instance;
  }

  private async initializeEngine() {
    if (!this.engine) {
      this.engine = await MatchingEngine.getInstance();
    }
  }

  private async fetchAndBroadcastData(symbol: string, subscriptionMap: Map<string, any>, isInitialFetch: boolean = false) {
    try {
      await this.initializeEngine();

      const fetchPromises = Array.from(subscriptionMap.entries()).map(async ([type, payload]) => {
        try {
          switch (type) {
            case "orderbook":
              const orderbook = await getOrderBook(symbol);

              // On initial fetch, always broadcast. Otherwise, only if data changed
              const orderbookHash = JSON.stringify(orderbook);
              const lastOrderbookHash = this.lastOrderbookData.get(symbol);

              if (isInitialFetch || lastOrderbookHash !== orderbookHash) {
                this.lastOrderbookData.set(symbol, orderbookHash);

                // Build stream key matching frontend subscription (includes limit if present)
                const streamKey = payload.limit ? `orderbook:${payload.limit}` : 'orderbook';

                messageBroker.broadcastToSubscribedClients(
                  `/api/ecosystem/market`,
                  payload,
                  { stream: streamKey, data: orderbook }
                );
              }
              break;
            case "trades":
              try {
                const limit = payload.limit || 50;
                const trades = await getRecentTrades(symbol, limit);

                // Only broadcast if there are actual trades
                if (trades && trades.length > 0) {
                  messageBroker.broadcastToSubscribedClients(
                    `/api/ecosystem/market`,
                    payload,
                    { stream: "trades", data: trades }
                  );
                }
              } catch (tradesError) {
                logger.error("ECO_WS", `Error fetching trades for ${symbol}`, tradesError);
              }
              break;
            case "ticker":
              const ticker = await this.engine.getTicker(symbol);

              // On initial fetch, always broadcast. Otherwise, only if data changed
              const lastTicker = this.lastTickerData.get(symbol);
              const tickerChanged = !lastTicker ||
                lastTicker.last !== ticker.last ||
                lastTicker.baseVolume !== ticker.baseVolume ||
                lastTicker.quoteVolume !== ticker.quoteVolume ||
                lastTicker.change !== ticker.change;

              if (isInitialFetch || tickerChanged) {
                this.lastTickerData.set(symbol, ticker);
                messageBroker.broadcastToSubscribedClients(
                  `/api/ecosystem/market`,
                  payload,
                  { stream: "ticker", data: ticker }
                );
              }
              break;
            case "ohlcv":
              try {
                const interval = payload.interval || "1m";
                const limit = payload.limit || 100;
                const ohlcv = await getOHLCV(symbol, interval, limit);

                // Only broadcast if there's OHLCV data
                if (ohlcv && ohlcv.length > 0) {
                  messageBroker.broadcastToSubscribedClients(
                    `/api/ecosystem/market`,
                    payload,
                    { stream: "ohlcv", data: ohlcv }
                  );
                }
              } catch (ohlcvError) {
                logger.error("ECO_WS", `Error fetching OHLCV for ${symbol}`, ohlcvError);
              }
              break;
          }
        } catch (error) {
          logger.error("ECO_WS", `Error fetching ${type} data for ${symbol}`, error);
        }
      });

      await Promise.allSettled(fetchPromises);
    } catch (error) {
      logger.error("ECO_WS", `Error in fetchAndBroadcastData for ${symbol}`, error);
    }
  }

  private startDataFetching(symbol: string) {
    // Clear existing interval if any
    if (this.intervalMap.has(symbol)) {
      clearInterval(this.intervalMap.get(symbol)!);
    }

    // Start new interval for this symbol
    const interval = setInterval(async () => {
      const subscriptionMap = this.activeSubscriptions.get(symbol);
      if (subscriptionMap && subscriptionMap.size > 0) {
        await this.fetchAndBroadcastData(symbol, subscriptionMap);
      }
    }, 2000); // Fetch every 2 seconds

    this.intervalMap.set(symbol, interval);
  }

  public async addSubscription(symbol: string, payload: any) {
    // Validate that the symbol exists in the database and is enabled
    if (!symbol) {
      logger.warn("ECO_WS", "No symbol provided in ecosystem subscription request");
      return;
    }

    const [currency, pair] = symbol.split("/");
    if (!currency || !pair) {
      logger.warn("ECO_WS", `Invalid symbol format: ${symbol}. Expected format: CURRENCY/PAIR`);
      return;
    }

    const market = await models.ecosystemMarket.findOne({
      where: {
        currency,
        pair,
        status: true // Only allow enabled markets
      }
    });

    if (!market) {
      logger.warn("ECO_WS", `Ecosystem market ${symbol} not found in database or is disabled. Skipping subscription.`);
      return;
    }

    const type = payload.type;

    // Add this subscription to the symbol's subscription map
    if (!this.activeSubscriptions.has(symbol)) {
      const newMap = new Map();
      newMap.set(type, payload);
      this.activeSubscriptions.set(symbol, newMap);
      // Start data fetching for this symbol
      this.startDataFetching(symbol);
    } else {
      // Add/update the subscription with the full payload
      this.activeSubscriptions.get(symbol)!.set(type, payload);
    }

    // Immediately fetch and send initial data for the new subscription
    const singleSubscriptionMap = new Map();
    singleSubscriptionMap.set(type, payload);
    await this.fetchAndBroadcastData(symbol, singleSubscriptionMap, true); // true = isInitialFetch
  }

  public removeSubscription(symbol: string, type: string) {
    if (this.activeSubscriptions.has(symbol)) {
      this.activeSubscriptions.get(symbol)!.delete(type);

      // If no more data types for this symbol, remove the symbol entirely
      if (this.activeSubscriptions.get(symbol)!.size === 0) {
        this.activeSubscriptions.delete(symbol);

        // Clear the interval
        if (this.intervalMap.has(symbol)) {
          clearInterval(this.intervalMap.get(symbol)!);
          this.intervalMap.delete(symbol);
        }
      }
    }
  }

  public stop() {
    // Clear all intervals
    this.intervalMap.forEach((interval) => clearInterval(interval));
    this.intervalMap.clear();
    this.activeSubscriptions.clear();
  }

  /**
   * Clear the cached orderbook data for a symbol
   * This forces the next fetch to broadcast fresh data
   */
  public clearOrderbookCache(symbol: string): void {
    this.lastOrderbookData.delete(symbol);
    logger.debug("ECO_WS", `Cleared orderbook cache for ${symbol}`);
  }

  /**
   * Force an immediate orderbook broadcast for a symbol
   * Bypasses the hash comparison cache
   */
  public async forceOrderbookBroadcast(symbol: string): Promise<void> {
    try {
      // Clear the cache first
      this.clearOrderbookCache(symbol);

      // Get the subscription map for this symbol
      const subscriptionMap = this.activeSubscriptions.get(symbol);
      if (!subscriptionMap) {
        logger.debug("ECO_WS", `No active subscriptions for ${symbol}, skipping forced broadcast`);
        return;
      }

      // Create a minimal subscription map with just orderbook
      const orderbookPayload = subscriptionMap.get("orderbook");
      if (orderbookPayload) {
        const orderbook = await getOrderBook(symbol);
        const orderbookHash = JSON.stringify(orderbook);
        this.lastOrderbookData.set(symbol, orderbookHash);

        const streamKey = orderbookPayload.limit ? `orderbook:${orderbookPayload.limit}` : 'orderbook';

        messageBroker.broadcastToSubscribedClients(
          `/api/ecosystem/market`,
          orderbookPayload,
          { stream: streamKey, data: orderbook }
        );

        logger.debug("ECO_WS", `Forced orderbook broadcast for ${symbol}`);
      }
    } catch (error) {
      logger.error("ECO_WS", `Failed to force orderbook broadcast for ${symbol}`, error);
    }
  }
}

// Export helper functions for external use
export function clearOrderbookCache(symbol: string): void {
  UnifiedEcosystemMarketDataHandler.getInstance().clearOrderbookCache(symbol);
}

export async function forceOrderbookBroadcast(symbol: string): Promise<void> {
  await UnifiedEcosystemMarketDataHandler.getInstance().forceOrderbookBroadcast(symbol);
}

export default async (data: Handler, message: any) => {
  const { ctx } = data;

  ctx?.step("Processing market WebSocket message");
  // Parse the incoming message if it's a string.
  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  const { action, payload } = message;
  const { type, symbol } = payload || {};

  if (!type || !symbol) {
    logger.error("ECO_WS", "Invalid message structure: type or symbol is missing");
    ctx?.fail("Invalid message structure: missing type or symbol");
    return;
  }

  const handler = UnifiedEcosystemMarketDataHandler.getInstance();

  if (action === "SUBSCRIBE") {
    ctx?.step(`Subscribing to ${type} for ${symbol}`);
    await handler.addSubscription(symbol, payload);
    ctx?.success(`Subscribed to ${type} for ${symbol}`);
  } else if (action === "UNSUBSCRIBE") {
    ctx?.step(`Unsubscribing from ${type} for ${symbol}`);
    handler.removeSubscription(symbol, type);
    ctx?.success(`Unsubscribed from ${type} for ${symbol}`);
  }
};
