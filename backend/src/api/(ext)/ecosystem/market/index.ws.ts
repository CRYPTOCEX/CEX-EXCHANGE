import { messageBroker } from "@b/handler/Websocket";
import { MatchingEngine } from "@b/api/(ext)/ecosystem/utils/matchingEngine";
import { getOrderBook } from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import { models } from "@b/db";

export const metadata = {};

class UnifiedEcosystemMarketDataHandler {
  private static instance: UnifiedEcosystemMarketDataHandler;
  private activeSubscriptions: Map<string, Set<string>> = new Map(); // symbol -> Set<dataTypes>
  private intervalMap: Map<string, NodeJS.Timeout> = new Map(); // symbol -> interval
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

  private async fetchAndBroadcastData(symbol: string, dataTypes: Set<string>) {
    try {
      await this.initializeEngine();

      const fetchPromises = Array.from(dataTypes).map(async (type) => {
        try {
          switch (type) {
            case "orderbook":
              const orderbook = await getOrderBook(symbol);
              messageBroker.broadcastToSubscribedClients(
                `/api/ecosystem/market`,
                { type: "orderbook", symbol },
                { stream: "orderbook", data: orderbook }
              );
              break;
            case "trades":
              messageBroker.broadcastToSubscribedClients(
                `/api/ecosystem/market`,
                { type: "trades", symbol },
                { stream: "trades", data: [] }
              );
              break;
            case "ticker":
              const ticker = await this.engine.getTicker(symbol);
              messageBroker.broadcastToSubscribedClients(
                `/api/ecosystem/market`,
                { type: "ticker", symbol },
                { stream: "ticker", data: ticker }
              );
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
      const dataTypes = this.activeSubscriptions.get(symbol);
      if (dataTypes && dataTypes.size > 0) {
        await this.fetchAndBroadcastData(symbol, dataTypes);
      }
    }, 500); // Fetch every 500ms

    this.intervalMap.set(symbol, interval);
  }

  public async addSubscription(symbol: string, type: string) {
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

    // Add this data type to the symbol's subscription set
    if (!this.activeSubscriptions.has(symbol)) {
      this.activeSubscriptions.set(symbol, new Set([type]));
      // Start data fetching for this symbol
      this.startDataFetching(symbol);
    } else {
      // Add the data type to the existing symbol's subscription set
      this.activeSubscriptions.get(symbol)!.add(type);
    }

    console.log(`Added ${type} subscription for ${symbol}. Active types:`, Array.from(this.activeSubscriptions.get(symbol)!));

    // Immediately fetch data for the new subscription
    await this.fetchAndBroadcastData(symbol, new Set([type]));
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
        
        console.log(`Removed all subscriptions for ${symbol}`);
      } else {
        console.log(`Removed ${type} subscription for ${symbol}. Remaining types:`, Array.from(this.activeSubscriptions.get(symbol)!));
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

  const { type, symbol } = message.payload;

  if (!type || !symbol) {
    console.error("Invalid message structure: type or symbol is missing");
    return;
  }

  const handler = UnifiedEcosystemMarketDataHandler.getInstance();
  await handler.addSubscription(symbol, type);
};
