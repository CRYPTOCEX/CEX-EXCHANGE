import { logError } from "@b/utils/logger";
import ExchangeManager from "@b/utils/exchange";
import { messageBroker, hasClients } from "@b/handler/Websocket";
import { saveBanStatus, loadBanStatus, handleExchangeError } from "@b/api/exchange/utils";
import { models } from "@b/db";

export const metadata = {};

class UnifiedMarketDataHandler {
  private static instance: UnifiedMarketDataHandler;
  private accumulatedBuffer: { [key: string]: any } = {};
  private bufferInterval: NodeJS.Timeout | null = null;
  private unblockTime = 0;
  private activeSubscriptions: Map<string, Set<string>> = new Map(); // symbol -> Set<dataTypes>
  private subscriptionParams: Map<string, { interval?: string, limit?: number }> = new Map(); // symbol:type -> params
  private exchange: any = null;
  private symbolToStreamKeys: { [key: string]: Set<string> } = {};

  private constructor() {}

  public static getInstance(): UnifiedMarketDataHandler {
    if (!UnifiedMarketDataHandler.instance) {
      UnifiedMarketDataHandler.instance = new UnifiedMarketDataHandler();
    }
    return UnifiedMarketDataHandler.instance;
  }

  private flushBuffer() {
    Object.entries(this.accumulatedBuffer).forEach(([streamKey, data]) => {
      if (Object.keys(data).length > 0) {
        const route = `/api/exchange/market`;
        const payload = { ...data.payload, symbol: data.symbol };
        
        messageBroker.broadcastToSubscribedClients(route, payload, {
          stream: streamKey,
          data: data.msg,
        });
        delete this.accumulatedBuffer[streamKey];
      }
    });
  }

  private ensureCurrentCandleData(ohlcvData: any[], interval: string): any[] {
    if (!Array.isArray(ohlcvData) || ohlcvData.length === 0) {
      return ohlcvData;
    }

    const currentCandleTimestamp = this.getCurrentCandleTimestamp(interval);
    
    const hasCurrentCandle = ohlcvData.some(candle => {
      if (Array.isArray(candle) && candle.length >= 6) {
        const timestamp = Number(candle[0]);
        return Math.abs(timestamp - currentCandleTimestamp) < 5000;
      }
      return false;
    });

    if (!hasCurrentCandle && ohlcvData.length > 0) {
      const lastCandle = ohlcvData[ohlcvData.length - 1];
      if (Array.isArray(lastCandle) && lastCandle.length >= 6) {
        const currentCandle = [
          currentCandleTimestamp,
          lastCandle[4],
          lastCandle[4],
          lastCandle[4],
          lastCandle[4],
          0
        ];
        
        const updatedData = [...ohlcvData, currentCandle];
        updatedData.sort((a, b) => a[0] - b[0]);
        return updatedData;
      }
    }

    return ohlcvData;
  }

  private getCurrentCandleTimestamp(interval: string): number {
    const now = Date.now();
    const intervalMs = this.getIntervalInMs(interval);
    return Math.floor(now / intervalMs) * intervalMs;
  }

  private getIntervalInMs(interval: string): number {
    const intervalMap: { [key: string]: number } = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };
    return intervalMap[interval] || 60 * 60 * 1000;
  }

  private async fetchDataWithRetries(fetchFunction: () => Promise<any>) {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetchFunction();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async handleUnifiedSubscription(symbol: string) {
    const subscriptionKey = `${symbol}:unified`;

    const createFetchDataMap = () => ({
      ticker: async () => ({
        msg: await this.exchange.watchTicker(symbol),
        payload: { type: 'ticker', symbol },
        streamKey: 'ticker'
      }),
      ohlcv: async () => {
        const params = this.subscriptionParams.get(`${symbol}:ohlcv`) || {};
        const interval = params.interval || '1h';
        const limit = params.limit || 1000;
        return {
          msg: await this.exchange.watchOHLCV(
            symbol,
            interval,
            undefined,
            Number(limit)
          ),
          payload: { 
            type: 'ohlcv', 
            interval,
            symbol 
          },
          streamKey: `ohlcv${interval ? `:${interval}` : ""}`
        };
      },
      trades: async () => {
        const params = this.subscriptionParams.get(`${symbol}:trades`) || {};
        const limit = params.limit || 20;
        return {
          msg: await this.exchange.watchTrades(
            symbol,
            undefined,
            Number(limit)
          ),
          payload: { 
            type: 'trades', 
            symbol 
          },
          streamKey: 'trades'
        };
      },
      orderbook: async () => {
        const params = this.subscriptionParams.get(`${symbol}:orderbook`) || {};
        const originalLimit = params.limit || 50; // Increase default limit
        let exchangeLimit = originalLimit; // This will be used for the actual exchange call
        
        // Handle Kucoin-specific limit requirements for the exchange call
        const provider = await ExchangeManager.getProvider();
        
        if (provider === 'kucoin') {
          // Kucoin only accepts undefined, 5, 20, 50, or 100
          const allowedLimits = [5, 20, 50, 100];
          if (exchangeLimit && !allowedLimits.includes(exchangeLimit)) {
            // Find the closest allowed limit for the exchange call
            exchangeLimit = allowedLimits.reduce((prev, curr) => 
              Math.abs(curr - exchangeLimit) < Math.abs(prev - exchangeLimit) ? curr : prev
            );
          }
        }
        
        try {
          const orderbookResult = await this.exchange.watchOrderBook(
            symbol,
            exchangeLimit ? Number(exchangeLimit) : undefined
          );
          
          // Ensure we have proper orderbook data structure
          if (orderbookResult && orderbookResult.asks && orderbookResult.bids) {
            // Limit the results to the requested amount if we got more than requested
            const limitedOrderbook = {
              ...orderbookResult,
              asks: orderbookResult.asks.slice(0, originalLimit),
              bids: orderbookResult.bids.slice(0, originalLimit)
            };
            
            // Always return the original payload that the frontend subscribed with
            return {
              msg: limitedOrderbook,
              payload: { 
                type: 'orderbook', 
                ...(originalLimit ? { limit: originalLimit } : {}), // Use original limit in payload
                symbol 
              },
              streamKey: originalLimit ? `orderbook:${originalLimit}` : 'orderbook' // Use original limit in stream key
            };
          } else {
            console.warn(`[WARN] Invalid orderbook data structure for ${symbol}:`, orderbookResult);
            return {
              msg: { asks: [], bids: [], timestamp: Date.now(), symbol },
              payload: { 
                type: 'orderbook', 
                ...(originalLimit ? { limit: originalLimit } : {}),
                symbol 
              },
              streamKey: originalLimit ? `orderbook:${originalLimit}` : 'orderbook'
            };
          }
        } catch (error) {
          console.error(`[ERROR] watchOrderBook failed for ${symbol} (provider: ${provider}):`, error.message);
          console.error(`[ERROR] Full error:`, error);
          throw error;
        }
      },
    });

    while (
      this.activeSubscriptions.has(symbol) &&
      hasClients(`/api/exchange/market`)
    ) {
      try {
        if (Date.now() < this.unblockTime) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        // Get current data types for this symbol (dynamic lookup)
        const currentDataTypes = this.activeSubscriptions.get(symbol);
        if (!currentDataTypes || currentDataTypes.size === 0) {
          break; // No more subscriptions for this symbol
        }

        // Create fetch data map with current parameters
        const fetchDataMap = createFetchDataMap();

        // Fetch data for all requested types in parallel
        const fetchPromises = Array.from(currentDataTypes).map(async (type) => {
          if (fetchDataMap[type]) {
            try {
              return await this.fetchDataWithRetries(() => fetchDataMap[type]());
            } catch (error) {
              console.error(`Error fetching ${type} data for ${symbol}:`, error);
              return null;
            }
          }
          return null;
        });

        const results = await Promise.allSettled(fetchPromises);
        
        // Process successful results
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const { msg, payload, streamKey } = result.value;
            this.accumulatedBuffer[streamKey] = { symbol, msg, payload };
          } else if (result.status === 'rejected') {
            console.error(`[ERROR] Failed to fetch data for ${symbol}:`, result.reason);
          }
        });

        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (error) {
        logError("exchange", error, __filename);
        const result = await handleExchangeError(error, ExchangeManager);
        if (typeof result === "number") {
          this.unblockTime = result;
          await saveBanStatus(this.unblockTime);
        } else {
          this.exchange = result;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    console.log(`[INFO] Subscription loop ended for ${symbol}`);
    this.activeSubscriptions.delete(symbol);
  }

  public async addSubscription(message: any) {
    try {
      this.unblockTime = await loadBanStatus();

      if (typeof message === "string") {
        message = JSON.parse(message);
      }

      const { symbol, type, interval, limit } = message.payload;

      // Validate that the symbol exists in the database and is enabled
      if (!symbol) {
        console.warn("No symbol provided in subscription request");
        return;
      }

      const [currency, pair] = symbol.split("/");
      if (!currency || !pair) {
        console.warn(`Invalid symbol format: ${symbol}. Expected format: CURRENCY/PAIR`);
        return;
      }

      const market = await models.exchangeMarket.findOne({
        where: { 
          currency, 
          pair,
          status: true // Only allow enabled markets
        }
      });

      if (!market) {
        console.warn(`Market ${symbol} not found in database or is disabled. Skipping subscription.`);
        return;
      }

      // Initialize buffer interval if not exists
      if (!this.bufferInterval) {
        this.bufferInterval = setInterval(() => this.flushBuffer(), 300);
      }

      // Initialize exchange if not exists
      if (!this.exchange) {
        this.exchange = await ExchangeManager.startExchange();
        if (!this.exchange) {
          throw new Error("Failed to start exchange");
        }
      }

      const provider = await ExchangeManager.getProvider();

      const typeMap = {
        ticker: "watchTicker",
        ohlcv: "watchOHLCV",
        trades: "watchTrades",
        orderbook: "watchOrderBook",
      };

      if (!this.exchange.has[typeMap[type]]) {
        console.info(`Endpoint ${type} is not available`);
        return;
      }

      // Special handling for KuCoin orderbook
      if (type === 'orderbook' && provider === 'kucoin') {
        if (!this.exchange.has['watchOrderBook']) {
          console.warn(`KuCoin watchOrderBook not supported, skipping orderbook subscription for ${symbol}`);
          return;
        }
      }

      // Store subscription parameters
      this.subscriptionParams.set(`${symbol}:${type}`, { interval, limit });

      // Add this data type to the symbol's subscription set
      if (!this.activeSubscriptions.has(symbol)) {
        this.activeSubscriptions.set(symbol, new Set([type]));
        // Start data fetching for this symbol
        this.handleUnifiedSubscription(symbol);
      } else {
        // Add the data type to the existing symbol's subscription set
        this.activeSubscriptions.get(symbol)!.add(type);
      }
    } catch (error) {
      logError("exchange", error, __filename);
    }
  }

  public async removeSubscription(symbol: string, type: string) {
    if (this.activeSubscriptions.has(symbol)) {
      this.activeSubscriptions.get(symbol)!.delete(type);
      // Remove subscription parameters
      this.subscriptionParams.delete(`${symbol}:${type}`);
      
      // If no more data types for this symbol, remove the symbol entirely
      if (this.activeSubscriptions.get(symbol)!.size === 0) {
        this.activeSubscriptions.delete(symbol);
        console.log(`Removed all subscriptions for ${symbol}`);
      } else {
        console.log(`Removed ${type} subscription for ${symbol}. Remaining types:`, Array.from(this.activeSubscriptions.get(symbol)!));
      }
    }
  }

  public async stop() {
    this.activeSubscriptions.clear();
    this.subscriptionParams.clear();
    if (this.bufferInterval) {
      clearInterval(this.bufferInterval);
      this.bufferInterval = null;
    }
    if (this.exchange) {
      await ExchangeManager.stopExchange();
      this.exchange = null;
    }
  }
}

export default async (data: Handler, message: any) => {
  let parsedMessage;
  if (typeof message === "string") {
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      logError("Invalid JSON message", error, __filename);
      return;
    }
  } else {
    parsedMessage = message;
  }

  // Validate payload exists before destructuring
  if (!parsedMessage || !parsedMessage.payload) {
    logError("Invalid message structure: payload is missing", new Error("Missing payload"), __filename);
    return;
  }

  const { action } = parsedMessage;
  const { type, symbol } = parsedMessage.payload;

  // Validate type exists
  if (!type) {
    logError("Invalid message structure: type is missing", new Error("Missing type field"), __filename);
    return;
  }

  const handler = UnifiedMarketDataHandler.getInstance();
  
  // Handle different actions
  if (action === "UNSUBSCRIBE") {
    if (!symbol) {
      logError("Invalid unsubscribe message: symbol is missing", new Error("Missing symbol"), __filename);
      return;
    }
    await handler.removeSubscription(symbol, type);
  } else {
    // Default to SUBSCRIBE action
    await handler.addSubscription(parsedMessage);
  }
};
