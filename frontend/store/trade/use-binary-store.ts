import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  getChartSynchronizedTime,
  calculateNextExpiryTime,
} from "@/utils/time-sync";
import { $fetch } from "@/lib/api";
import { useUserStore } from "@/store/user";

// Types
export type Symbol = string;
export type TimeFrame = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";
export type TradingMode = "demo" | "real";
export type OrderSide = "RISE" | "FALL";
export type OrderStatus = "PENDING" | "win" | "loss";

export interface Market {
  symbol: Symbol;
  price: number;
  change: number;
}

export interface PriceMovement {
  direction: "up" | "down" | "neutral";
  percent: number;
  strength: "strong" | "medium" | "weak";
}

export interface Order {
  id: string;
  symbol: Symbol;
  side: OrderSide;
  amount: number;
  entryPrice: number;
  expiryTime: number;
  createdAt: number;
  status: OrderStatus;
  profit?: number;
  closePrice?: number;
  mode: TradingMode;
}

export interface CompletedOrder {
  id: string;
  symbol: Symbol;
  side: OrderSide;
  amount: number;
  entryPrice: number;
  closePrice: number;
  entryTime: Date;
  expiryTime: Date;
  status: "WIN" | "LOSS";
  profit: number;
}

export interface BinaryMarket {
  id: string;
  currency: string;
  pair: string;
  symbol?: string;
  status: boolean;
  isHot?: boolean;
  metadata?: any;
  label?: string;
  isTrending?: boolean;
}

export interface BinaryDuration {
  id: string;
  duration: number;
  profitPercentage: number;
  status: boolean;
}

// Global cleanup registry for intervals and subscriptions
class CleanupRegistry {
  private intervals = new Set<NodeJS.Timeout>();
  private subscriptions = new Set<() => void>();
  private isCleaningUp = false;

  addInterval(interval: NodeJS.Timeout) {
    this.intervals.add(interval);
  }

  addSubscription(unsubscribe: () => void) {
    this.subscriptions.add(unsubscribe);
  }

  cleanup() {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    // Clear all intervals
    this.intervals.forEach((interval) => {
      try {
        clearInterval(interval);
      } catch (error) {
        console.warn("Error clearing interval:", error);
      }
    });
    this.intervals.clear();

    // Call all unsubscribe functions
    this.subscriptions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn("Error during unsubscribe:", error);
      }
    });
    this.subscriptions.clear();

    this.isCleaningUp = false;
  }

  removeInterval(interval: NodeJS.Timeout) {
    this.intervals.delete(interval);
  }

  removeSubscription(unsubscribe: () => void) {
    this.subscriptions.delete(unsubscribe);
  }
}

const cleanupRegistry = new CleanupRegistry();

// Global initialization flag to prevent duplicate initializations
let isInitializing = false;
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Utility functions that use actual market data instead of hardcoded parsing
export function getMarketFromSymbol(symbol: Symbol, markets: BinaryMarket[]): BinaryMarket | null {
  return markets.find(m => 
    m.symbol === symbol || 
    m.label === symbol ||
    `${m.currency}${m.pair}` === symbol ||
    `${m.currency}/${m.pair}` === symbol
  ) || null;
}

export function extractBaseCurrency(symbol: Symbol, markets: BinaryMarket[] = []): string {
  // First try to find the market and use its currency field
  const market = getMarketFromSymbol(symbol, markets);
  if (market?.currency) {
    return market.currency;
  }
  
  // Fallback to old parsing logic only if no market data available
  if (!symbol || typeof symbol !== 'string' || symbol.length < 2) {
    console.warn('Invalid symbol for base currency extraction:', symbol);
    return '';
  }
  
  // Simple parsing for fallback
  if (symbol.includes('/')) {
    const parts = symbol.split('/');
    return parts[0] || '';
  }
  
  // Default fallback
  return symbol.slice(0, 3);
}

export function extractQuoteCurrency(symbol: Symbol, markets: BinaryMarket[] = []): string {
  // First try to find the market and use its pair field
  const market = getMarketFromSymbol(symbol, markets);
  if (market?.pair) {
    return market.pair;
  }
  
  // Fallback to old parsing logic only if no market data available
  if (!symbol || typeof symbol !== 'string' || symbol.length < 2) {
    console.warn('Invalid symbol for quote currency extraction:', symbol);
    return '';
  }
  
  // Simple parsing for fallback
  if (symbol.includes('/')) {
    const parts = symbol.split('/');
    return parts[1] || '';
  }
  
  // Default fallback
  return 'USDT';
}

export function formatPairFromSymbol(symbol: Symbol, markets: BinaryMarket[] = []): string {
  const base = extractBaseCurrency(symbol, markets);
  const quote = extractQuoteCurrency(symbol, markets);
  return `${base}/${quote}`;
}

export function getSymbolFromPair(currency: string, pair: string): string {
  // Convert currency/pair format back to symbol format
  return `${currency}${pair}`;
}

// Smart market selection with performance optimization
function selectBestMarket(markets: BinaryMarket[]): BinaryMarket | null {
  if (markets.length === 0) return null;

  // First, find any active market (status: true)
  const activeMarket = markets.find(m => m.status);
  if (activeMarket) return activeMarket;

  // If no active markets, return the first available market
  return markets[0];
}

interface BinaryState {
  // Market data
  activeMarkets: Market[];
  currentSymbol: Symbol;
  currentPrice: number;
  priceMovements: Record<Symbol, PriceMovement>;
  timeFrame: TimeFrame;
  candleData: any[];

  // Binary markets data
  binaryMarkets: BinaryMarket[];
  isLoadingMarkets: boolean;
  isLoading: boolean;

  // Wallet data
  balance: number;
  realBalance: number | null;
  demoBalance: number;
  netPL: number;
  isLoadingWallet: boolean;

  // Orders
  orders: Order[];
  completedOrders: CompletedOrder[];
  isLoadingOrders: boolean;
  positionMarkers: any[];

  // Trading settings
  tradingMode: TradingMode;
  selectedExpiryMinutes: number;
  isInSafeZone: boolean;
  binaryDurations: BinaryDuration[];
  isLoadingDurations: boolean;

  // UI state
  isMarketSwitching: boolean;

  // Actions
  setCurrentSymbol: (symbol: Symbol) => void;
  setTimeFrame: (timeFrame: TimeFrame) => void;
  setTradingMode: (mode: TradingMode) => void;
  setSelectedExpiryMinutes: (minutes: number) => void;
  addMarket: (symbol: Symbol) => void;
  removeMarket: (symbol: Symbol) => void;
  placeOrder: (
    side: OrderSide,
    amount: number,
    expiryMinutes: number
  ) => Promise<boolean>;
  fetchWalletData: (currency?: string) => Promise<void>;
  fetchBinaryDurations: () => Promise<void>;
  fetchBinaryMarkets: () => Promise<void>;
  fetchCompletedOrders: () => Promise<void>;
  fetchActiveOrders: () => Promise<void>;
  updateOrders: () => void;
  setCurrentPrice: (price: number) => void;
  setCandleData: (data: any[]) => void;
  initOrderWebSocket: () => void;
      cleanup: () => void; // Add cleanup method
    setIsLoading: (loading: boolean) => void; // Add setIsLoading
    // user property removed - use useUserStore instead
    updateMarketData: (symbol: Symbol, price: number, change: number) => void;
    updateActiveMarketsFromTicker: (tickerData: Record<string, any>) => void;
}

export const useBinaryStore = create<BinaryState>()(
  devtools(
    persist(
      (set, get) => ({
        // Market data - initialized with empty values
        activeMarkets: [],
        currentSymbol: "",
        currentPrice: 0,
        priceMovements: {},
        timeFrame: "1m",
        candleData: [],

              // Binary markets data
      binaryMarkets: [],
      isLoadingMarkets: false,
      isLoading: false,

        // Wallet data
        balance: 10000, // Default demo balance
        realBalance: null, // Will be fetched from API
        demoBalance: 10000, // Default demo balance
        netPL: 0,
        isLoadingWallet: false,

        // Orders
        orders: [],
        completedOrders: [],
        isLoadingOrders: false,
        positionMarkers: [],

        // Trading settings
        tradingMode: "demo",
        selectedExpiryMinutes: 1,
        isInSafeZone: false,
        binaryDurations: [],
        isLoadingDurations: false,

        // UI state
        isMarketSwitching: false,

        // Actions
        setCurrentSymbol: (symbol) => {
          const { currentSymbol: prevSymbol } = get();
          
          // Only update if symbol actually changed
          if (prevSymbol === symbol) return;
          
          set({ 
            currentSymbol: symbol,
            activeMarkets: [{ symbol, price: 0, change: 0 }],
            isMarketSwitching: true 
          });

          // Fetch wallet data for the new symbol
          const { binaryMarkets } = get();
          const quoteCurrency = extractQuoteCurrency(symbol, binaryMarkets);
          get().fetchWalletData(quoteCurrency);
          
          // Fetch orders for the new symbol if user is authenticated
          const { user } = useUserStore.getState();
          if (user?.id) {
            // Use setTimeout to ensure state is updated first
            setTimeout(() => {
              Promise.all([
                get().fetchCompletedOrders(),
                get().fetchActiveOrders(),
              ]).catch(error => {
                console.warn('Failed to fetch orders:', error);
              });
            }, 100);
          }

          // Reset market switching flag after a short delay
          setTimeout(() => {
            set({ isMarketSwitching: false });
          }, 500);
        },

        setTimeFrame: (timeFrame) => set({ timeFrame }),

        setTradingMode: (mode) => {
          set({
            tradingMode: mode,
            balance:
              mode === "demo" ? get().demoBalance : (get().realBalance ?? 0),
          });

          // Use requestAnimationFrame to defer wallet data fetch
          requestAnimationFrame(() => {
            // Always refresh wallet data when switching modes (to ensure we have latest balance)
            if (get().currentSymbol) {
              const { binaryMarkets } = get();
              const quoteCurrency = extractQuoteCurrency(get().currentSymbol, binaryMarkets);
              get().fetchWalletData(quoteCurrency);
            }
          });
        },

        setSelectedExpiryMinutes: (minutes) =>
          set({ selectedExpiryMinutes: minutes }),

        addMarket: (symbol) => {
          const { activeMarkets } = get();
          if (!activeMarkets.find((m) => m.symbol === symbol)) {
            set({
              activeMarkets: [
                ...activeMarkets,
                { symbol, price: 0, change: 0 },
              ],
            });
          }
        },

        // Add method to update market data with real-time prices
        updateMarketData: (symbol: Symbol, price: number, change: number) => {
          const { activeMarkets } = get();
          const updatedMarkets = activeMarkets.map((market) =>
            market.symbol === symbol
              ? { ...market, price, change }
              : market
          );
          set({ activeMarkets: updatedMarkets });
        },

        // Update all active markets with ticker data
        updateActiveMarketsFromTicker: (tickerData: Record<string, any>) => {
          const { activeMarkets, binaryMarkets } = get();
          const updatedMarkets = activeMarkets.map((market) => {
            // Find the corresponding binary market to get currency and pair
            const binaryMarket = binaryMarkets.find(m => 
              m.symbol === market.symbol || 
              `${m.currency}${m.pair}` === market.symbol ||
              `${m.currency}/${m.pair}` === market.symbol
            );
            
            if (!binaryMarket) {
              return market; // No matching binary market found
            }
            
            // Try different ticker data key formats using the actual market data
            let marketData: any = null;
            
            // Format 1: Use the label from binary market (e.g., "TRX/USDT")
            if (binaryMarket.label) {
              marketData = tickerData[binaryMarket.label];
            }
            
            // Format 2: Use symbol from binary market
            if (!marketData && binaryMarket.symbol) {
              marketData = tickerData[binaryMarket.symbol];
            }
            
            // Format 3: Construct from currency/pair (e.g., "TRX/USDT")
            if (!marketData) {
              const symbolKey = `${binaryMarket.currency}/${binaryMarket.pair}`;
              marketData = tickerData[symbolKey];
            }
            
            // Format 4: Try without slash (e.g., "TRXUSDT")
            if (!marketData) {
              const noSlashSymbol = `${binaryMarket.currency}${binaryMarket.pair}`;
              marketData = tickerData[noSlashSymbol];
            }
            
            // Update market with new data if found
            if (marketData) {
              return {
                ...market,
                price: marketData.last || market.price,
                change: marketData.percentage || marketData.change || market.change,
              };
            }
            
            return market;
          });
          
          set({ activeMarkets: updatedMarkets });
        },

        removeMarket: (symbol) => {
          const { activeMarkets, currentSymbol } = get();
          if (activeMarkets.length > 1) {
            set({
              activeMarkets: activeMarkets.filter((m) => m.symbol !== symbol),
            });

            // If removing the current symbol, switch to another one
            if (symbol === currentSymbol) {
              const newSymbol =
                activeMarkets.find((m) => m.symbol !== symbol)?.symbol || "";
              if (newSymbol) {
                get().setCurrentSymbol(newSymbol);
              }
            }
          }
        },

        placeOrder: async (side, amount, expiryMinutes) => {
          const { currentSymbol, currentPrice, balance, tradingMode, binaryMarkets } = get();

          // Check if we have enough balance
          if (amount <= 0 || amount > balance) {
            return false;
          }

          // Check if we're in the safe zone
          if (get().isInSafeZone) {
            return false;
          }

          try {
            // Extract currency and pair from symbol using actual market data
            const currency = extractBaseCurrency(currentSymbol, binaryMarkets);
            const pair = extractQuoteCurrency(currentSymbol, binaryMarkets);

            // Calculate closedAt timestamp from expiryMinutes
            const closedAt = new Date(
              Date.now() + expiryMinutes * 60 * 1000
            ).toISOString();

            // Call the API to place the order
            const { data, error } = await $fetch({
              url: "/api/exchange/binary/order",
              method: "POST",
              body: {
                currency,
                pair,
                amount,
                side,
                closedAt,
                type: "RISE_FALL",
                isDemo: tradingMode === "demo",
              },
            });

            if (!error && data) {
              // Create order from API response
              const newOrder: Order = {
                id:
                  data.order?.id || Math.random().toString(36).substring(2, 15),
                symbol: data.order?.symbol || currentSymbol, // Use API symbol format if available
                side,
                amount,
                entryPrice: data.order?.price || currentPrice, // Use API price if available
                expiryTime: data.order?.closedAt
                  ? new Date(data.order.closedAt).getTime()
                  : Date.now() + expiryMinutes * 60 * 1000,
                createdAt: data.order?.createdAt
                  ? new Date(data.order.createdAt).getTime()
                  : Date.now(),
                status: "PENDING",
                mode: tradingMode,
              };

              // Update state only if API call was successful
              set((state) => ({
                orders: [...state.orders, newOrder],
                balance: balance - amount,
                ...(tradingMode === "demo"
                  ? { demoBalance: state.demoBalance - amount }
                  : { realBalance: (state.realBalance ?? 0) - amount }),
              }));

              return true;
            } else {
              console.error("Failed to place order:", error);
              return false;
            }
          } catch (error) {
            console.error("Error placing order:", error);
            return false;
          }
        },

        fetchWalletData: async (currency) => {
          try {
            // Check if user is authenticated
            const { user } = useUserStore.getState();
            if (!user) {
              set({ isLoadingWallet: false });
              return;
            }

            // Extract the currency from the symbol if not provided
            const currentSymbol = get().currentSymbol;
            if (!currentSymbol) {
              console.log(`[Binary Store] No current symbol available, skipping wallet fetch`);
              set({ isLoadingWallet: false });
              return;
            }

            const { binaryMarkets } = get();
            const currencyToFetch = currency || extractQuoteCurrency(currentSymbol, binaryMarkets);
            
            // Validate currency
            if (!currencyToFetch || currencyToFetch.length < 2) {
              console.log(`[Binary Store] Invalid currency "${currencyToFetch}", skipping wallet fetch`);
              set({ isLoadingWallet: false });
              return;
            }

            // Prevent duplicate calls - check if we're already loading this currency
            const currentState = get();
            if (currentState.isLoadingWallet) {
              console.log(`[Binary Store] Wallet fetch already in progress for ${currencyToFetch}, skipping duplicate call`);
              return;
            }

            // Create cache key for this currency
            const cacheKey = `wallet_${currencyToFetch}`;
            const now = Date.now();
            
            // Check if we have recent cached data (within 30 seconds)
            if (typeof window !== 'undefined') {
              const cached = sessionStorage.getItem(cacheKey);
              if (cached) {
                try {
                  const { data: cachedData, timestamp } = JSON.parse(cached);
                  if (now - timestamp < 30000 && cachedData?.balance !== undefined) { // 30 seconds cache
                    console.log(`[Binary Store] Using cached wallet data for ${currencyToFetch}`);
                    set({
                      realBalance: cachedData.balance,
                      isLoadingWallet: false,
                      ...(get().tradingMode === "real"
                        ? { balance: cachedData.balance }
                        : {}),
                    });
                    return;
                  }
                } catch (cacheError) {
                  console.warn("Error parsing cached wallet data:", cacheError);
                  sessionStorage.removeItem(cacheKey);
                }
              }
            }

            console.log(`[Binary Store] Fetching wallet data for ${currencyToFetch}`);
            set({ isLoadingWallet: true });

            const { data, error } = await $fetch({
              url: `/api/finance/wallet/SPOT/${currencyToFetch}`,
              silentSuccess: true,
            });

            if (!error && data?.balance !== undefined) {
              // Cache the successful response
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                  data,
                  timestamp: now
                }));
              }

              // Update real balance
              set({
                realBalance: data.balance,
                isLoadingWallet: false,
                // If in real mode, update the displayed balance
                ...(get().tradingMode === "real"
                  ? { balance: data.balance }
                  : {}),
              });
            } else {
              console.warn(`Wallet not found for ${currencyToFetch}, using default balance`);
              set({ 
                isLoadingWallet: false,
                // Don't update balance if wallet not found - keep existing balance
              });
            }
          } catch (error) {
            console.warn("Error fetching wallet data:", error);
            set({ isLoadingWallet: false });
          }
        },

        // Fetch binary durations with caching
        fetchBinaryDurations: async () => {
          try {
            // Prevent duplicate calls if already loading
            if (get().isLoadingDurations) {
              console.log("Binary durations already loading, skipping duplicate call");
              return;
            }

            // Check if we already have durations data
            if (get().binaryDurations.length > 0) {
              console.log("Binary durations already loaded, skipping fetch");
              return;
            }

            set({ isLoadingDurations: true });

            const { data, error } = await $fetch({
              url: "/api/exchange/binary/duration",
              silentSuccess: true,
            });

            if (!error && Array.isArray(data)) {
              set({
                binaryDurations: data,
                isLoadingDurations: false,
                // Set default expiry to the first active duration
                ...(data.length > 0
                  ? {
                      selectedExpiryMinutes:
                        data.find((d: BinaryDuration) => d.status)?.duration ||
                        data[0].duration,
                    }
                  : {}),
              });
            } else {
              console.error("Failed to fetch binary durations:", error);
              set({ isLoadingDurations: false });
            }
          } catch (error) {
            console.error("Failed to fetch binary durations:", error);
            set({ isLoadingDurations: false });
          }
        },

        // Fetch binary markets with caching
        fetchBinaryMarkets: async () => {
          try {
            // Prevent duplicate calls if already loading
            if (get().isLoadingMarkets) {
              console.log("Binary markets already loading, skipping duplicate call");
              return;
            }

            // Check if we already have markets data
            if (get().binaryMarkets.length > 0) {
              console.log("Binary markets already loaded, skipping fetch");
              return;
            }

            set({ isLoadingMarkets: true });

            const { data, error } = await $fetch({
              url: "/api/exchange/binary/market",
              silentSuccess: true,
            });

            if (!error && Array.isArray(data)) {
              const markets = data;
              set({ binaryMarkets: markets, isLoadingMarkets: false });

              // Use requestAnimationFrame to defer additional state updates
              requestAnimationFrame(() => {
                // Smart market selection based on priority
                const { activeMarkets, currentSymbol } = get();

                // Only auto-select if no symbol is currently set
                if (
                  markets.length > 0 &&
                  (activeMarkets.length === 0 || !currentSymbol)
                ) {
                  // Use smart selection to pick the best market
                  const bestMarket = selectBestMarket(markets);

                  if (bestMarket) {
                    const symbol =
                      bestMarket.symbol ||
                      `${bestMarket.currency}/${bestMarket.pair}`;

                    // Use setCurrentSymbol to trigger order fetching
                    get().setCurrentSymbol(symbol);
                  }
                } else {
                  // Even if we don't auto-select a market, we should fetch wallet data if we have a current symbol
                  if (currentSymbol) {
                    const quoteCurrency = extractQuoteCurrency(currentSymbol, data);
                    get().fetchWalletData(quoteCurrency);
                  }
                }
              });
            } else {
              console.error("Failed to fetch binary markets:", error);
              set({ isLoadingMarkets: false });
            }
          } catch (error) {
            console.error("Failed to fetch binary markets:", error);
            set({ isLoadingMarkets: false });
          }
        },

        fetchCompletedOrders: async () => {
          try {
            const { currentSymbol, tradingMode, binaryMarkets } = get();
            if (!currentSymbol) {
              return;
            }

            // Extract currency and pair from symbol using actual market data
            const currency = extractBaseCurrency(currentSymbol, binaryMarkets);
            const pair = extractQuoteCurrency(currentSymbol, binaryMarkets);

            const { data, error } = await $fetch({
              url: `/api/exchange/binary/order?currency=${currency}&pair=${pair}&type=CLOSED`,
              method: "GET",
              silentSuccess: true,
            });

            if (!error && Array.isArray(data)) {
              // Filter completed orders and match trading mode
              const filteredOrders = data.filter((order: any) => 
                order.status !== "PENDING" && 
                order.isDemo === (tradingMode === "demo")
              );

              // Transform the API response to match our CompletedOrder interface
              const completedOrders: CompletedOrder[] = filteredOrders.map((order: any) => ({
                id: order.id,
                symbol: order.symbol,
                side: order.side,
                amount: order.amount,
                entryPrice: order.price,
                closePrice: order.closePrice || order.price,
                entryTime: new Date(order.createdAt),
                expiryTime: new Date(order.closedAt),
                status: order.status === "WIN" ? "WIN" : "LOSS",
                profit: order.profit || 0,
              }));

              set({ completedOrders });
            } else {
              console.error("Failed to fetch completed orders:", error);
            }
          } catch (error) {
            console.error("Error fetching completed orders:", error);
          }
        },

        fetchActiveOrders: async () => {
          try {
            const { currentSymbol, tradingMode, binaryMarkets } = get();
            if (!currentSymbol) {
              return;
            }

            // Extract currency and pair from symbol using actual market data
            const currency = extractBaseCurrency(currentSymbol, binaryMarkets);
            const pair = extractQuoteCurrency(currentSymbol, binaryMarkets);

            const { data, error } = await $fetch({
              url: `/api/exchange/binary/order?currency=${currency}&pair=${pair}&type=OPEN`,
              method: "GET",
              silentSuccess: true,
            });

            if (!error && Array.isArray(data)) {
              // Transform the API response to match our Order interface
              const activeOrders: Order[] = data.map((order: any) => ({
                id: order.id,
                symbol: order.symbol,
                side: order.side,
                amount: order.amount,
                entryPrice: order.price,
                expiryTime: new Date(order.closedAt).getTime(),
                createdAt: new Date(order.createdAt).getTime(),
                status: "PENDING", // All fetched orders should be pending
                mode: order.isDemo ? "demo" : "real",
              }));

              // Update the orders in state (replace existing ones to avoid duplicates)
              set((state) => ({
                orders: [
                  // Keep orders that are not from this symbol or not pending
                  ...state.orders.filter(
                    (order) =>
                      order.symbol !== currentSymbol ||
                      order.status !== "PENDING"
                  ),
                  // Add the fetched active orders
                  ...activeOrders,
                ],
              }));
            } else {
              console.error("Failed to fetch active orders:", error);
            }
          } catch (error) {
            console.error("Error fetching active orders:", error);
          }
        },

        updateOrders: () => {
          const { orders, currentPrice, tradingMode } = get();

          // Skip if no orders
          if (orders.length === 0) return;

          // Get current time
          const now = Date.now();

          // Update orders with optimized processing
          const updatedOrders = orders.map((order) => {
            // Skip if already processed
            if (order.status !== "PENDING") return order;

            // Check if expired
            if (now >= order.expiryTime) {
              const won =
                (order.side === "RISE" && currentPrice > order.entryPrice) ||
                (order.side === "FALL" && currentPrice < order.entryPrice);

              const profitAmount = won ? order.amount * 0.88 : -order.amount;

              // Update balance and P/L only if it matches current trading mode
              if (order.mode === tradingMode) {
                set({
                  balance: get().balance + (won ? order.amount * 0.88 : 0),
                  netPL: get().netPL + profitAmount,
                  ...(tradingMode === "demo"
                    ? {
                        demoBalance:
                          get().demoBalance + (won ? order.amount * 0.88 : 0),
                      }
                    : {
                        realBalance:
                          (get().realBalance ?? 0) +
                          (won ? order.amount * 0.88 : 0),
                      }),
                });
              }

              // Add to completed orders
              const completedOrder: CompletedOrder = {
                id: order.id,
                symbol: order.symbol,
                side: order.side,
                amount: order.amount,
                entryPrice: order.entryPrice,
                closePrice: currentPrice,
                entryTime: new Date(order.createdAt),
                expiryTime: new Date(order.expiryTime),
                status: won ? "WIN" : "LOSS",
                profit: profitAmount,
              };

              set({
                completedOrders: [completedOrder, ...get().completedOrders],
              });

              return {
                ...order,
                status: won ? ("win" as OrderStatus) : ("loss" as OrderStatus),
                profit: profitAmount,
                closePrice: currentPrice,
              };
            }

            // Calculate current profit/loss for active orders
            const currentProfit =
              order.side === "RISE"
                ? currentPrice > order.entryPrice
                  ? ((currentPrice - order.entryPrice) / order.entryPrice) *
                    order.amount
                  : -(
                      ((order.entryPrice - currentPrice) / order.entryPrice) *
                      order.amount
                    )
                : currentPrice < order.entryPrice
                  ? ((order.entryPrice - currentPrice) / order.entryPrice) *
                    order.amount
                  : -(
                      ((currentPrice - order.entryPrice) / order.entryPrice) *
                      order.amount
                    );

            return {
              ...order,
              profit: currentProfit,
            };
          });

          // Filter out completed orders (they've been moved to completedOrders)
          const activeOrders = updatedOrders.filter(
            order => order.status === "PENDING"
          );

          // Check if we're in the safe zone (15 seconds before expiry)
          const nextExpiry = calculateNextExpiryTime(
            get().selectedExpiryMinutes
          );
          const timeToExpiry =
            nextExpiry.getTime() - getChartSynchronizedTime().getTime();

          set({
            orders: activeOrders, // Only keep active orders
            isInSafeZone: timeToExpiry <= 15000, // 15 seconds in milliseconds
          });
        },

        // Set current price (used by components that read from WebSocket)
        setCurrentPrice: (price) => {
          set({ currentPrice: price });
        },

        // Set candle data (used by components that read from WebSocket)
        setCandleData: (data) => {
          set({ candleData: data });
        },

        // Initialize order WebSocket subscription
        initOrderWebSocket: () => {
          // This will be implemented when the WebSocket service is properly set up
          console.log("Order WebSocket initialization - to be implemented");
        },

        // Cleanup method to prevent memory leaks
        cleanup: () => {
          console.log("Cleaning up binary store...");
          cleanupRegistry.cleanup();
        },
        setIsLoading: (loading) => set({ isLoading: loading }), // Add setIsLoading
        user: useUserStore.getState().user, // Add user property
      }),
      {
        name: "binary-trading-store",
        partialize: (state) => ({
          activeMarkets: state.activeMarkets,
          currentSymbol: state.currentSymbol,
          timeFrame: state.timeFrame,
          demoBalance: state.demoBalance,
          tradingMode: state.tradingMode,
          selectedExpiryMinutes: state.selectedExpiryMinutes,
        }),
      }
    )
  )
);

// Enhanced initialization function with proper error handling and deduplication
export const initializeBinaryStore = async (): Promise<void> => {
  // If already initialized, return immediately
  if (isInitialized) {
    console.log('Binary store already initialized, skipping...');
    return;
  }

  // If currently initializing, return the existing promise
  if (isInitializing && initializationPromise) {
    console.log('Binary store initialization in progress, waiting...');
    return initializationPromise;
  }

  // Set initializing flag and create promise
  isInitializing = true;
  
  initializationPromise = (async () => {
    try {
      console.log('Starting binary store initialization...');
      
      const store = useBinaryStore.getState();
      // Get user from useUserStore instead of binary store
      const { user } = await import('@/store/user').then(m => m.useUserStore.getState());
      const isAuthenticated = !!user?.id;

      // Set loading state
      store.setIsLoading(true);

      // Parallel fetch of essential data
      console.log('Fetching binary markets and durations...');
      await Promise.all([
        store.fetchBinaryMarkets(),
        store.fetchBinaryDurations(),
      ]);

      // Only fetch user-specific data if authenticated
      if (isAuthenticated) {
        console.log('User authenticated, fetching user-specific data...');
        
        // Don't fetch orders here as currentSymbol is not set yet
        // Orders will be fetched when symbol is set

        // Set up interval to update orders with proper cleanup management
        const updateInterval = setInterval(() => {
          try {
            const currentStore = useBinaryStore.getState();
            // Only update if we have active orders and a symbol
            if (isInitialized && currentStore.currentSymbol && currentStore.orders.length > 0) {
              currentStore.updateOrders();
            }
          } catch (error) {
            console.error("Error updating orders:", error);
          }
        }, 2000); // Increased interval to reduce load

        // Register interval for cleanup
        cleanupRegistry.addInterval(updateInterval);
      } else {
        console.log("User not authenticated, skipping user-specific data fetch");
      }

      // Mark as initialized
      isInitialized = true;
      store.setIsLoading(false);
      console.log("Binary store initialized successfully");
      
    } catch (error) {
      console.error("Error initializing binary store:", error);
      const store = useBinaryStore.getState();
      store.setIsLoading(false);
      throw error; // Re-throw to allow caller to handle
    } finally {
      isInitializing = false;
    }
  })();

  return initializationPromise;
};

// Global cleanup function for page navigation
export const cleanupBinaryStore = () => {
  console.log("Cleaning up binary store on page navigation...");
  cleanupRegistry.cleanup();
  
  // Reset store state if needed
  const store = useBinaryStore.getState();
  store.cleanup();

  // Reset initialization flags
  isInitializing = false;
  isInitialized = false;
};

// Export cleanup registry for external cleanup management
export { cleanupRegistry };
