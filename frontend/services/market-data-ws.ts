import { ConnectionStatus, wsManager } from "./ws-manager";
import { isExtensionAvailable } from "@/lib/extensions";
import { resolvePublicExchange } from "@/lib/public-exchange";
import { toNum } from "@/lib/precision-utils";

// Export ConnectionStatus for use in other files
export { ConnectionStatus } from "./ws-manager";

// Numeric fields on ticker/trade/orderbook payloads can arrive as strings (raw
// exchange payloads, backend DECIMAL columns). Components format them with
// `.toFixed()` directly, which throws "X.toFixed is not a function" on a string
// and crashes the panel. Coerce at this ingestion boundary so no string reaches
// a formatter. Behaviour-preserving: real numbers pass through unchanged.
const NUMERIC_TICKER_FIELDS = [
  "high", "low", "bid", "bidVolume", "ask", "askVolume", "vwap", "open",
  "close", "last", "previousClose", "change", "percentage", "average",
  "baseVolume", "quoteVolume", "fundingRate",
];

function coerceMarketData(type: string, data: any): any {
  if (!data || typeof data !== "object") return data;

  if (type === "ticker") {
    const out: any = { ...data };
    for (const f of NUMERIC_TICKER_FIELDS) {
      if (out[f] !== undefined && out[f] !== null) out[f] = toNum(out[f]);
    }
    return out;
  }

  if (type === "trades") {
    const coerceTrade = (t: any) =>
      t && typeof t === "object"
        ? { ...t, price: toNum(t.price), amount: toNum(t.amount), ...(t.cost !== undefined ? { cost: toNum(t.cost) } : {}) }
        : t;
    if (Array.isArray(data)) return data.map(coerceTrade);
    return coerceTrade(data);
  }

  if (type === "orderbook") {
    const coerceSide = (side: any) =>
      Array.isArray(side)
        ? side.map((lvl: any) =>
            Array.isArray(lvl) ? [toNum(lvl[0]), toNum(lvl[1])] : lvl
          )
        : side;
    // `ai` goes through the SAME coercion as the book it describes. It is compared
    // against the main levels by price, and a string price would match nothing — the
    // markers would silently never appear, which is the failure mode a disclosure
    // feature can least afford.
    return {
      ...data,
      bids: coerceSide(data.bids),
      asks: coerceSide(data.asks),
      ...(data.ai
        ? {
            ai: {
              bids: coerceSide(data.ai.bids),
              asks: coerceSide(data.ai.asks),
            },
          }
        : {}),
    };
  }

  return data;
}

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
  /**
   * This print came from the AI market maker rather than from two customers.
   *
   * The flag has always been on the wire — `getRecentTrades` selects it and the ecosystem
   * market socket broadcasts the row verbatim — and until now nothing in the frontend read
   * it. That mattered more than a missing field usually does, because the platform's own
   * PUBLIC market-data endpoint already EXCLUDES these rows (see `api/public/utils.ts`):
   * the aggregators were being shown a tape without them while the venue's own customers
   * were shown one with them, unlabelled and indistinguishable from real trades.
   *
   * Optional because a real fill carries `false` and older cached payloads carry nothing;
   * absent is read as "not a bot print", which is the safe direction — it under-labels a
   * stale payload rather than tagging a customer's trade as synthetic.
   */
  isAiTrade?: boolean;
}

export interface OrderbookData {
  bids: Array<[number, number]>; // [price, amount]
  asks: Array<[number, number]>; // [price, amount]
  /**
   * The subset of the levels above that the AI market maker wrote, not customer orders.
   *
   * Derived server-side from `TTL(amount)`: the maker inserts its ladder with a TTL and
   * order-backed levels are written without one, which is the same discriminator the
   * matching engine's reconciler already uses. Cut to exactly the prices this frame
   * carries, so a marker can never name a level the client was not sent.
   *
   * OPTIONAL, and absent means NOT KNOWN rather than none: the matching engine's push
   * path holds a post-write book with no provenance in it and omits the field, while the
   * Scylla poller supplies it. Under-labelling one frame is recoverable; telling somebody
   * real depth stands behind a synthetic ladder is not.
   */
  ai?: {
    bids: Array<[number, number]>;
    asks: Array<[number, number]>;
  };
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

export type MarketType = "spot" | "eco" | "futures" | "forex" | "dex";

/**
 * How stale a cached frame may be and still be replayed to a late subscriber.
 *
 * Long enough to cover a React remount and a tab switch, far short of anything
 * a trader would mistake for a live market.
 */
const MAX_REPLAY_AGE_MS = 10_000;

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

// Use a symbol key on globalThis to ensure singleton persists across HMR in Next.js
const MARKET_DATA_WS_KEY = Symbol.for("__marketDataWs__");

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

  // Track which market types have status listeners registered to prevent duplicates
  private statusListenersRegistered: Set<MarketType> = new Set();

  // Debounce unsubscribe to prevent spam when components remount quickly
  private unsubscribeTimers: Map<string, NodeJS.Timeout> = new Map();

  // Cache last received data for each subscription to provide immediate data to late subscribers
  /*
    Last frame per subscription, replayed to a late subscriber so a remount
    does not blank the panel. STAMPED, because it used to be replayed with no
    age check at all: a tab left open overnight handed a new panel a book from
    the previous session as though it had just arrived. It is also deleted when
    its last subscriber goes — the map previously had no `delete` and no
    `clear` anywhere in the file, so a session that visited fifty markets kept
    fifty order books alive.
  */
  private lastDataCache: Map<string, { data: any; at: number }> = new Map();

  /*
    subscriptionKey -> the ONE wsManager handler registered for it. See the
    note at the registration site in `subscribe`.
  */
  private streamHandlers: Map<
    string,
    { streamKey: string; marketType: MarketType; handler: (data: any) => void }
  > = new Map();

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

      this.wsConnections.set("spot", `${baseWsUrl}/api/exchange/market`);
      this.wsConnections.set("eco", `${baseWsUrl}/api/ecosystem/market`);
      this.wsConnections.set("futures", `${baseWsUrl}/api/futures/market`);
      this.wsConnections.set("forex", `${baseWsUrl}/api/forex-trading/market`);
      this.wsConnections.set("dex", `${baseWsUrl}/api/dex/market`);
    } else {
      // Server-side rendering fallback
      const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
      this.wsConnections.set("spot", `ws://localhost:${backendPort}/api/exchange/market`);
      this.wsConnections.set("eco", `ws://localhost:${backendPort}/api/ecosystem/market`);
      this.wsConnections.set("futures", `ws://localhost:${backendPort}/api/futures/market`);
      this.wsConnections.set("forex", `ws://localhost:${backendPort}/api/forex-trading/market`);
      this.wsConnections.set("dex", `ws://localhost:${backendPort}/api/dex/market`);
    }

    // Initialize connection status for all market types
    this.wsConnections.forEach((_, marketType) => {
      this.connectionStatusMap.set(marketType, ConnectionStatus.DISCONNECTED);
      this.pendingSubscriptions.set(marketType, new Set());
    });
  }

  // Get singleton instance - uses globalThis to survive HMR in development
  public static getInstance(): MarketDataWebSocketService {
    // Check globalThis first (survives HMR)
    if ((globalThis as any)[MARKET_DATA_WS_KEY]) {
      return (globalThis as any)[MARKET_DATA_WS_KEY];
    }

    if (!MarketDataWebSocketService.instance) {
      MarketDataWebSocketService.instance = new MarketDataWebSocketService();
      // Store in globalThis for HMR persistence
      (globalThis as any)[MARKET_DATA_WS_KEY] = MarketDataWebSocketService.instance;
    }
    return MarketDataWebSocketService.instance;
  }

  // Get appropriate limit based on provider and tick size
  public getProviderLimit(tickSize: number): number {
    const provider = resolvePublicExchange(
      typeof window !== "undefined" ? process.env.NEXT_PUBLIC_EXCHANGE : "bin"
    );

    // Define limits based on provider and tick size
    if (provider === "xt") {
      // XT only supports 5, 10, 20, or 50
      if (tickSize <= 0.01) return 5;
      if (tickSize <= 0.1) return 10;
      if (tickSize <= 1) return 20;
      return 50;
    } else if (provider === "kucoin") {
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
    // If already connected to this market type, do nothing
    if (this.connectedMarketTypes.has(marketType)) return;

    // Get the WebSocket URL for this market type
    const url = this.wsConnections.get(marketType);
    if (!url) {
      console.error(`No WebSocket URL defined for market type: ${marketType}`);
      return;
    }

    // IMPORTANT: Add to connectedMarketTypes BEFORE calling connect
    // This prevents race conditions where multiple components call ensureConnection
    // simultaneously and both pass the check before either adds to the Set
    this.connectedMarketTypes.add(marketType);

    // Connect to the WebSocket server
    wsManager.connect(url, marketType);

    // Add a status listener to monitor connection state (only once per market type)
    if (!this.statusListenersRegistered.has(marketType)) {
      this.statusListenersRegistered.add(marketType);
      wsManager.addStatusListener((status) => {
        // Update connection status
        this.connectionStatusMap.set(marketType, status);

        // Socket dropped: the server-side subscriptions for the old connection
        // are gone (a reconnect gets a brand-new server-side guest id). Clear
        // our wire-level dedup bookkeeping so a reconnect actually RE-SENDS the
        // SUBSCRIBE frames instead of no-oping on stale "already subscribed"
        // flags. Without this the page stays blank after any reconnect until the
        // user switches markets or hard-refreshes.
        if (
          status === ConnectionStatus.DISCONNECTED ||
          status === ConnectionStatus.RECONNECTING ||
          status === ConnectionStatus.ERROR
        ) {
          this.resetWireStateForMarketType(marketType);
        }

        // Connection (re)established: drain pending AND replay every active
        // subscription. On a RECONNECT the subscriptions live in
        // activeSubscriptions (pendingSubscriptions is empty), so
        // processPendingSubscriptions alone would leave the page with no data.
        if (status === ConnectionStatus.CONNECTED) {
          this.processPendingSubscriptions(marketType);
          this.resubscribeActiveForMarketType(marketType);
        }

        // If connection fails permanently (after all reconnect attempts),
        // remove from connectedMarketTypes so a later ensureConnection() is
        // allowed to start a fresh connection.
        //
        // Deliberately NOT clearing statusListenersRegistered here: this listener
        // is an inline closure that was never handed to removeStatusListener, and
        // wsManager keeps status listeners across close()/reconnect. Clearing the
        // flag would let the next ensureConnection() register a SECOND listener on
        // the same market type, so every future status change would run the
        // resubscribe path once per accumulated listener.
        if (status === ConnectionStatus.ERROR) {
          this.connectedMarketTypes.delete(marketType);
        }
      }, marketType);
    }
  }

  // Reset the WIRE-LEVEL dedup bookkeeping for a market type after a socket drop.
  // Touches ONLY subscriptionSent — never activeSubscriptions or callbacks,
  // which are the source of truth used to replay and MUST survive the drop.
  private resetWireStateForMarketType(marketType: MarketType): void {
    for (const key of Array.from(this.subscriptionSent.keys())) {
      if (key.startsWith(`${marketType}:`)) {
        this.subscriptionSent.delete(key);
      }
    }
  }

  /**
   * Re-send a SUBSCRIBE for every active subscription after a (re)connect.
   *
   * ONE PER SUBSCRIPTION. This used to dedupe by STREAM key, which carries no
   * symbol: with a book on BTC/USDT and another on ETH/USDT both at depth 50,
   * the first won the `orderbook:50` slot and the second was never replayed —
   * so a dropped socket silently left one of the two panels dead until the
   * user navigated. `subscriptionSent` is cleared by
   * `resetWireStateForMarketType` before this runs, so the initial connect,
   * where `processPendingSubscriptions` has already sent them, no-ops.
   */
  private resubscribeActiveForMarketType(marketType: MarketType): void {
    for (const [key, subscription] of this.activeSubscriptions.entries()) {
      if (subscription.marketType !== marketType) continue;
      if (this.subscriptionSent.has(key)) continue;
      this.sendSubscriptionMessage(subscription);
    }
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
        /* Deduped on the subscription key itself. `${type}:${symbol}` threw
           away the depth AND the interval, so two OHLCV subscriptions on one
           symbol at 1m and 1h collapsed into whichever was queued last and the
           other chart never got a frame. */
        uniqueSubscriptions.set(key, subscription);
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
  /**
   * The identity of one subscription.
   *
   * The DEPTH is part of it, and leaving it out was the root of a whole family
   * of defects. `/trade` subscribes an order book at 50 levels and `/trade/pro`
   * subscribes the same symbol at 25; without the depth here those two share
   * one key, one callback Set and one `subscriptionSent` flag, while
   * `getStreamKey` puts them on two DIFFERENT wsManager streams. The second
   * one's SUBSCRIBE was then suppressed as a duplicate and its panel never
   * received a frame.
   *
   * Only the order book varies by depth; the other types ignore `limit`
   * server-side, so folding it in for them would split one subscription into
   * several for no reason.
   */
  private getSubscriptionKey(
    type: string,
    symbol: string,
    marketType: MarketType,
    interval?: string,
    limit?: number
  ): string {
    const depth = type === "orderbook" && limit ? `:${limit}` : "";
    return interval
      ? `${marketType}:${type}:${symbol}:${interval}${depth}`
      : `${marketType}:${type}:${symbol}${depth}`;
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
        // Carried through, when ws-manager stamped it from the wire envelope:
        // the bare-array shape has nowhere else to record whose bars these are,
        // and the caller's symbol filter needs it.
        symbol: (data as any).symbol,
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
      interval,
      limit
    );
    const streamKey = this.getStreamKey(type, limit, interval);

    // Ensure we have a connection for this market type
    this.ensureConnection(marketType);

    // Register the callback
    if (!this.callbacks.has(subscriptionKey)) {
      this.callbacks.set(subscriptionKey, new Set());
    }
    this.callbacks.get(subscriptionKey)!.add(callback);

    /* A remount inside a few seconds gets the last frame straight away rather
       than an empty panel. Anything older is thrown away instead: a stale book
       drawn as live is worse than a spinner, and this replay had no age check
       at all. */
    const cached = this.lastDataCache.get(subscriptionKey);
    if (cached) {
      if (Date.now() - cached.at <= MAX_REPLAY_AGE_MS) {
        try {
          callback(cached.data);
        } catch (error) {
          console.error(`Error in immediate callback for ${subscriptionKey}:`, error);
        }
      } else {
        this.lastDataCache.delete(subscriptionKey);
      }
    }

    // Store the subscription
    this.activeSubscriptions.set(subscriptionKey, formattedSubscription);

    // Check if we're connected
    const isConnected =
      this.connectionStatusMap.get(marketType) === ConnectionStatus.CONNECTED;

    // Cancel any pending unsubscribe for THIS EXACT SUBSCRIPTION (same symbol)
    // Use subscriptionKey instead of streamKey to ensure we only cancel if it's the SAME symbol
    if (this.unsubscribeTimers.has(subscriptionKey)) {
      clearTimeout(this.unsubscribeTimers.get(subscriptionKey)!);
      this.unsubscribeTimers.delete(subscriptionKey);
    }

    // If connected, send subscription immediately (if not already sent)
    // Otherwise, queue it for when connection is established
    if (isConnected) {
      /* Deduped on the SUBSCRIPTION, never on the stream.
         The stream-level guard that used to stand here is what stopped a
         second symbol on the same depth from ever reaching the server: both
         map to `orderbook:50`, the first one marked the stream taken, and the
         second one's SUBSCRIBE was silently dropped. The server keys its own
         registry by symbol, so it needs one frame per symbol. */
      if (!this.subscriptionSent.has(subscriptionKey)) {
        this.sendSubscriptionMessage(formattedSubscription);
      }
    } else {
      // Add to pending subscriptions
      if (!this.pendingSubscriptions.has(marketType)) {
        this.pendingSubscriptions.set(marketType, new Set());
      }
      this.pendingSubscriptions.get(marketType)!.add(subscriptionKey);
    }

    /*
      ONE wire handler per SUBSCRIPTION, not one per subscriber.

      This used to register a fresh closure with `wsManager.subscribe` on every
      call and never call `wsManager.unsubscribe` — the service contains no such
      call at all — so the manager's callback Set for a stream grew for the life
      of the tab. Five components watching the same ticker meant five identical
      closures doing the same decode on every frame, and a component that
      unmounted left its closure behind to keep doing it forever.

      Now the handler is owned by the subscription key, registered once, and
      removed when the last subscriber of that key goes.
    */
    if (!this.streamHandlers.has(subscriptionKey)) {
      const handler = (frame: any) =>
        this.handleStreamFrame(subscriptionKey, type, formattedSymbol, interval, frame);
      this.streamHandlers.set(subscriptionKey, { streamKey, marketType, handler });
      wsManager.subscribe(streamKey, handler, marketType);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(formattedSubscription, callback);
    };
  }


  /**
   * Decode one wire frame and hand it to the subscribers of one key.
   *
   * Lifted out of `subscribe` so that a single instance of it can serve
   * every subscriber of a key — see the note at the registration site.
   */
  private handleStreamFrame(
    subscriptionKey: string,
    type: MarketDataSubscription["type"],
    formattedSymbol: string,
    interval: string | undefined,
    data: any
  ): void {
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

        /*
          OHLCV IS SYMBOL-FILTERED TOO.

          This used to return here, before the symbol test every other type gets
          below — and the reasoning for skipping it was never stated because it
          does not exist. `getStreamKey` for ohlcv is `ohlcv:<interval>` with NO
          symbol in it, so every ohlcv callback at one interval shares a single
          wsManager Set, exactly as orderbook and ticker did before the note at
          the symbol filter below. A frame for another eco market at the same
          interval was therefore delivered to this chart and drawn under this
          symbol's header.

          The wire frame carries `symbol` now (both eco writers set it:
          utils/ws.ts handleCandleBroadcast and market/index.ws.ts's poller).
          A frame that carries none is still accepted — that is every CCXT-backed
          venue, where one socket serves one symbol — so this narrows nothing
          that used to work.
        */
        const ohlcvSymbol =
          normalizedData.symbol ?? (data && (data as any).symbol);
        if (ohlcvSymbol && ohlcvSymbol !== formattedSymbol) {
          return;
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
      const dataSymbol = data.symbol; // Keep track of symbol from wrapper
      if (data.data && typeof data.data === 'object') {
        actualData = data.data;
      }



      /*
        EVERY type is symbol-filtered, including orderbook and ticker.

        The line this replaced said symbol validation was unnecessary for
        those two because the subscription had already filtered them. It
        has not: `getStreamKey` is `<type>:<limit>` and carries NO symbol,
        so every orderbook callback on a market type sits in ONE wsManager
        Set and receives the frames of every symbol at that depth. Watch
        BTC/USDT, switch to ETH/USDT, and the tail of the BTC feed is drawn
        under the ETH header until the server stops sending it.

        The code below then made it undetectable: when a frame arrived
        without a symbol it STAMPED the subscriber's own symbol onto it,
        turning "we do not know whose this is" into "this is definitely
        yours". The stamp still happens — several consumers read
        `data.symbol` — but only AFTER the frame has been accepted, and
        only when the frame genuinely carries none.
      */
      const frameSymbol =
        dataSymbol ||
        actualData?.symbol ||
        (Array.isArray(actualData) && actualData.length > 0
          ? actualData[0]?.symbol
          : undefined);

      if (frameSymbol && frameSymbol !== formattedSymbol) {
        return;
      }

      if ((type === "orderbook" || type === "ticker") && !actualData.symbol) {
        actualData.symbol = formattedSymbol;
        actualData.timestamp = actualData.timestamp || Date.now();
      }

      // Coerce numeric fields to real numbers so downstream `.toFixed()`
      // formatters never receive a string (which would throw and crash the
      // panel). No-op for values that are already numbers.
      actualData = coerceMarketData(type, actualData);

      const callbacks = this.callbacks.get(subscriptionKey);
      if (callbacks) {
        // Cache the data for late subscribers
        this.lastDataCache.set(subscriptionKey, { data: actualData, at: Date.now() });

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
      } else {
        console.warn(`[Market Data WS] No callbacks found for ${subscriptionKey}!`);
      }
    } catch (error) {
      console.error(
        `Error processing WebSocket data for ${subscriptionKey}:`,
        error
      );
    }
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
      interval,
      subscription.limit
    );
    const streamKey = this.getStreamKey(type, subscription.limit, interval);

    // Remove the callback
    const callbacks = this.callbacks.get(subscriptionKey);
    if (callbacks) {
      callbacks.delete(callback);

      // If no more callbacks, unsubscribe from the WebSocket
      if (callbacks.size === 0) {
        /*
          A subscription now owns its stream handler outright, so leaving is a
          local decision: nothing else shares this key.

          The block this replaced walked every active subscription looking for
          another one on the same STREAM key, and treated a match as a reason
          not to unsubscribe. Since the stream key carries no symbol, a second
          symbol at the same depth counted as "still in use" — the server was
          then never told to stop the symbol being abandoned, and, worse, the
          `subscriptionSent` flag was left set so the panel could never
          re-subscribe to it either.
        */
        this.callbacks.delete(subscriptionKey);
        this.activeSubscriptions.delete(subscriptionKey);

        /* The manager's Set is where the leak was: nothing in this file ever
           called `wsManager.unsubscribe`, so every closure this service had
           ever registered stayed and kept decoding frames. */
        const registered = this.streamHandlers.get(subscriptionKey);
        if (registered) {
          wsManager.unsubscribe(
            registered.streamKey,
            registered.handler,
            registered.marketType
          );
          this.streamHandlers.delete(subscriptionKey);
        }

        if (this.subscriptionSent.has(subscriptionKey)) {
          if (this.unsubscribeTimers.has(subscriptionKey)) {
            clearTimeout(this.unsubscribeTimers.get(subscriptionKey)!);
          }

          /* Debounced, because a React remount unsubscribes and re-subscribes
             within the same tick and the round trip is not free. */
          const timer = setTimeout(() => {
            this.unsubscribeTimers.delete(subscriptionKey);
            // Re-subscribed during the window: nothing to do.
            if (this.activeSubscriptions.has(subscriptionKey)) return;

            this.sendUnsubscriptionMessage(subscription);
            this.subscriptionSent.delete(subscriptionKey);
            /* Dropped here rather than kept forever. The replay window is
               seconds; a subscription that has been gone for the debounce and
               is not coming back has no reader for its last frame. */
            this.lastDataCache.delete(subscriptionKey);
          }, 100);

          this.unsubscribeTimers.set(subscriptionKey, timer);
        } else {
          this.lastDataCache.delete(subscriptionKey);
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
    const subscriptionKey = this.getSubscriptionKey(type, formattedSymbol, marketType, interval, limit);

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

    // Mark this subscription as sent so it can be properly unsubscribed later
    this.subscriptionSent.set(subscriptionKey, true);
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
      case "forex":
        return "/api/forex-trading/market";
      case "dex":
        return "/api/dex/market";
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
            subscription.interval,
            subscription.limit
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
    for (const registered of this.streamHandlers.values()) {
      wsManager.unsubscribe(
        registered.streamKey,
        registered.handler,
        registered.marketType
      );
    }
    this.streamHandlers.clear();
    this.lastDataCache.clear();
    this.activeSubscriptions.clear();
    this.callbacks.clear();
    this.connectedMarketTypes.clear();
    this.subscriptionSent.clear();
    this.statusListenersRegistered.clear();

    // Clear pending subscriptions
    this.pendingSubscriptions.forEach((set) => set.clear());

    // Reset initialization flag
    this.isInitialized = false;
  }
}

// Export singleton instance
export const marketDataWs = MarketDataWebSocketService.getInstance();
