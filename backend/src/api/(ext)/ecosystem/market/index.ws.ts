import { messageBroker } from "@b/handler/Websocket";
import { MatchingEngine } from "@b/api/(ext)/ecosystem/utils/matchingEngine";
import { getOrderBook } from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import { models } from "@b/db";

export const metadata = {};

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
              // TODO: Implement trades fetching from database
              // For now, don't broadcast empty trades data to reduce noise
              // Only broadcast when there are actual trades to send
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
              // TODO: Implement OHLCV fetching
              break;
          }
        } catch (error) {
          console.error(`Error fetching ${type} data for ${symbol}:`, error);
        }
      });

      await Promise.allSettled(fetchPromises);
    } catch (error) {
      console.error(`Error in fetchAndBroadcastData for ${symbol}:`, error);
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
      console.warn("No symbol provided in ecosystem subscription request");
      return;
    }

    const [currency, pair] = symbol.split("/");
    if (!currency || !pair) {
      console.warn(`Invalid symbol format: ${symbol}. Expected format: CURRENCY/PAIR`);
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
      console.warn(`Ecosystem market ${symbol} not found in database or is disabled. Skipping subscription.`);
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
}

export default async (data: Handler, message: any) => {
  // Parse the incoming message if it's a string.
  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  const { action, payload } = message;
  const { type, symbol } = payload || {};

  if (!type || !symbol) {
    console.error("Invalid message structure: type or symbol is missing");
    return;
  }

  const handler = UnifiedEcosystemMarketDataHandler.getInstance();

  if (action === "SUBSCRIBE") {
    await handler.addSubscription(symbol, payload);
  } else if (action === "UNSUBSCRIBE") {
    handler.removeSubscription(symbol, type);
  }
};
