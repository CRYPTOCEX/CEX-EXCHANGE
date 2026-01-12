import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  getChartSynchronizedTime,
  calculateNextExpiryTime,
} from "@/utils/time-sync";
import { $fetch } from "@/lib/api";
import { useUserStore } from "@/store/user";
import type { BinaryOrderType, OrderSide as BinaryOrderSide } from "@/types/binary-trading";
import { ORDER_TYPE_CONFIGS, getProfitPercentageForType } from "@/types/binary-trading";

// Race condition prevention for symbol switching
let currentFetchId = 0;

// Track fetch failures to prevent infinite retry loops
let marketsFetchFailed = false;
let durationsFetchFailed = false;

// Types
export type Symbol = string;
export type TimeFrame = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";
export type TradingMode = "demo" | "real";
export type OrderSide = BinaryOrderSide;
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
  profitPercentage?: number; // Profit percentage for this order's duration
  type?: BinaryOrderType; // Order type (RISE_FALL, HIGHER_LOWER, etc.)
  barrier?: number; // For HIGHER_LOWER, TOUCH_NO_TOUCH, TURBO
  strikePrice?: number; // For CALL_PUT
  payoutPerPoint?: number; // For TURBO
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
  profitPercentage?: number;
  // Type-specific fields for proper chart rendering
  type?: BinaryOrderType;
  barrier?: number;
  strikePrice?: number;
  payoutPerPoint?: number;
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

  // Type-specific profit percentages
  profitPercentageRiseFall: number;
  profitPercentageHigherLower: number;
  profitPercentageTouchNoTouch: number;
  profitPercentageCallPut: number;
  profitPercentageTurbo: number;

  // Deprecated - kept for backward compatibility
  profitPercentage?: number;
  /** @deprecated Use profitPercentage instead */
  percentage?: number;

  status: boolean;
}

// New settings-based types
export interface BarrierLevel {
  id: string;
  label: string;
  distancePercent: number;
  profitPercent: number;
  enabled: boolean;
}

export interface StrikeLevel {
  id: string;
  label: string;
  distancePercent: number;
  profitPercent: number;
  enabled: boolean;
}

export interface BinarySettingsState {
  global: {
    enabled: boolean;
    maxConcurrentOrders: number;
    maxDailyOrders: number;
    minOrderAmount: number;
    maxOrderAmount: number;
    cooldownSeconds: number;
  };
  orderTypes: {
    RISE_FALL: {
      enabled: boolean;
      minAmount: number;
      maxAmount: number;
      profitPercentage: number;
    };
    HIGHER_LOWER: {
      enabled: boolean;
      minAmount: number;
      maxAmount: number;
      profitPercentage: number;
      barrierLevels: BarrierLevel[];
    };
    TOUCH_NO_TOUCH: {
      enabled: boolean;
      minAmount: number;
      maxAmount: number;
      profitPercentage: number;
      barrierLevels: BarrierLevel[];
      touchProfitMultiplier: number;
      noTouchProfitMultiplier: number;
    };
    CALL_PUT: {
      enabled: boolean;
      minAmount: number;
      maxAmount: number;
      profitPercentage: number;
      strikeLevels: StrikeLevel[];
    };
    TURBO: {
      enabled: boolean;
      minAmount: number;
      maxAmount: number;
      profitPercentage: number;
      barrierLevels: BarrierLevel[];
      payoutPerPointRange: { min: number; max: number };
      maxDuration: number;
      allowTicksBased: boolean;
    };
  };
  durations: Array<{
    id: string;
    minutes: number;
    enabled: boolean;
    orderTypeOverrides?: {
      [orderType: string]: {
        enabled?: boolean;
        profitAdjustment?: number;
      };
    };
  }>;
  display: {
    showProfitPercentage: boolean;
    showBarrierOnChart: boolean;
    showCountdown: boolean;
    defaultOrderType: BinaryOrderType;
    chartType?: "CHART_ENGINE" | "TRADINGVIEW"; // Which chart engine to use
  };
}

// Simple in-memory cache for market data
const marketDataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache for markets/durations
// Settings use same TTL - they're loaded once at startup and stay stable for the session

function getCachedData(key: string): any | null {
  const cached = marketDataCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any): void {
  marketDataCache.set(key, { data, timestamp: Date.now() });
}

function clearMarketDataCache(): void {
  marketDataCache.clear();
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

    // Clear market data cache on cleanup (logout/unmount)
    clearMarketDataCache();

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

  // Pagination for completed orders
  completedOrdersPagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };

  // Trading settings
  tradingMode: TradingMode;
  selectedExpiryMinutes: number;
  selectedAmount: number;
  isInSafeZone: boolean;
  binaryDurations: BinaryDuration[];
  isLoadingDurations: boolean;

  // New settings-based configuration
  binarySettings: BinarySettingsState | null;
  isLoadingSettings: boolean;
  selectedBarrierLevel: BarrierLevel | null;
  selectedStrikeLevel: StrikeLevel | null;

  // Order type settings
  selectedOrderType: BinaryOrderType;
  barrier: number | null;
  strikePrice: number | null;
  payoutPerPoint: number | null;
  durationType: "TIME" | "TICKS";

  // UI state
  isMarketSwitching: boolean;

  // Actions
  setCurrentSymbol: (symbol: Symbol) => void;
  setTimeFrame: (timeFrame: TimeFrame) => void;
  setTradingMode: (mode: TradingMode) => void;
  setSelectedExpiryMinutes: (minutes: number) => void;
  setSelectedAmount: (amount: number) => void;
  setOrderType: (type: BinaryOrderType) => void;
  setBarrier: (barrier: number | null) => void;
  setStrikePrice: (price: number | null) => void;
  setPayoutPerPoint: (payout: number | null) => void;
  setDurationType: (type: "TIME" | "TICKS") => void;
  addMarket: (symbol: Symbol) => void;
  removeMarket: (symbol: Symbol) => void;
  placeOrder: (
    side: BinaryOrderSide,
    amount: number,
    expiryMinutes: number
  ) => Promise<boolean>;
  fetchWalletData: (currency?: string) => Promise<void>;
  fetchBinarySettings: () => Promise<void>;
  forceRefreshSettings: () => Promise<void>;
  fetchBinaryDurations: () => Promise<void>;
  forceRefreshDurations: () => Promise<void>;
  fetchBinaryMarkets: () => Promise<void>;
  setSelectedBarrierLevel: (level: BarrierLevel | null) => void;
  setSelectedStrikeLevel: (level: StrikeLevel | null) => void;
  getEnabledOrderTypes: () => BinaryOrderType[];
  getEnabledBarrierLevels: (orderType: BinaryOrderType) => BarrierLevel[];
  getEnabledStrikeLevels: () => StrikeLevel[];
  getProfitForSelectedLevel: () => number;
  fetchCompletedOrders: (loadMore?: boolean) => Promise<void>;
  loadMoreCompletedOrders: () => Promise<void>;
  resetCompletedOrdersPagination: () => void;
  fetchActiveOrders: () => Promise<void>;
  updateOrders: () => void;
  cancelOrder: (orderId: string) => Promise<{ success: boolean; refundAmount?: number; error?: string }>;
  closeOrderEarly: (orderId: string) => Promise<{ success: boolean; cashoutAmount?: number; penalty?: number; error?: string }>;
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

        // Pagination for completed orders
        completedOrdersPagination: {
          total: 0,
          limit: 50,
          offset: 0,
          hasMore: false,
        },

        // Trading settings
        tradingMode: "demo",
        selectedExpiryMinutes: 1,
        selectedAmount: 1000,
        isInSafeZone: false,
        binaryDurations: [],
        isLoadingDurations: false,

        // New settings-based configuration
        binarySettings: null,
        isLoadingSettings: false,
        selectedBarrierLevel: null,
        selectedStrikeLevel: null,

        // Order type settings
        selectedOrderType: "RISE_FALL",
        barrier: null,
        strikePrice: null,
        payoutPerPoint: null,
        durationType: "TIME",

        // UI state
        isMarketSwitching: false,

        // Actions
        setCurrentSymbol: (symbol) => {
          const { currentSymbol: prevSymbol, activeMarkets } = get();

          // Only update if symbol actually changed
          if (prevSymbol === symbol) return;

          // Clear market data cache on symbol change to prevent stale data
          clearMarketDataCache();

          // Increment fetch ID to invalidate any in-flight requests
          const fetchId = ++currentFetchId;

          // Check if market already exists in activeMarkets
          const marketExists = activeMarkets.some(m => m.symbol === symbol);

          set({
            currentSymbol: symbol,
            // Preserve existing markets, only add new one if not present
            activeMarkets: marketExists
              ? activeMarkets
              : [...activeMarkets, { symbol, price: 0, change: 0 }],
            isMarketSwitching: true,
            // Clear orders immediately to prevent showing stale data
            orders: [],
            completedOrders: [],
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
              // Only fetch if this is still the current symbol (prevent race condition)
              if (fetchId === currentFetchId && get().currentSymbol === symbol) {
                Promise.all([
                  get().fetchCompletedOrders(),
                  get().fetchActiveOrders(),
                ]).catch(error => {
                  console.warn('Failed to fetch orders:', error);
                });
              }
            }, 100);
          }

          // Reset market switching flag after a short delay
          setTimeout(() => {
            // Only reset if this is still the current symbol
            if (fetchId === currentFetchId) {
              set({ isMarketSwitching: false });
            }
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

        setSelectedAmount: (amount) =>
          set({ selectedAmount: amount }),

        setOrderType: (type) => {
          const prevType = get().selectedOrderType;
          // Reset barrier/strike levels when switching order types to prevent stale data
          if (prevType !== type) {
            set({
              selectedOrderType: type,
              selectedBarrierLevel: null,
              selectedStrikeLevel: null,
              barrier: null,
              strikePrice: null,
            });
          } else {
            set({ selectedOrderType: type });
          }
        },

        setBarrier: (barrier) => set({ barrier }),

        setStrikePrice: (price) => set({ strikePrice: price }),

        setPayoutPerPoint: (payout) => set({ payoutPerPoint: payout }),

        setDurationType: (type) => set({ durationType: type }),

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
          const {
            currentSymbol,
            currentPrice,
            balance,
            tradingMode,
            binaryMarkets,
            binaryDurations,
            selectedOrderType,
            barrier,
            selectedBarrierLevel,
            strikePrice,
            selectedStrikeLevel,
            payoutPerPoint,
            durationType,
          } = get();

          // Check if we have enough balance
          if (amount <= 0 || amount > balance) {
            console.error("Insufficient balance or invalid amount");
            return false;
          }

          // Check if we're in the safe zone
          if (get().isInSafeZone) {
            console.error("Cannot place orders in safe zone");
            return false;
          }

          // Type-specific validation
          const orderTypeConfig = ORDER_TYPE_CONFIGS[selectedOrderType];

          // Validate barrier for HIGHER_LOWER, TOUCH_NO_TOUCH, TURBO
          if (orderTypeConfig.requiresBarrier) {
            if (!barrier || barrier <= 0) {
              console.error(`${selectedOrderType} requires a valid barrier price`);
              return false;
            }
            if (barrier === currentPrice) {
              console.error(`${selectedOrderType} barrier price must be different from current price`);
              return false;
            }
          }

          // Validate strike price for CALL_PUT
          if (orderTypeConfig.requiresStrikePrice) {
            if (!strikePrice || strikePrice <= 0) {
              console.error(`${selectedOrderType} requires a valid strike price`);
              return false;
            }
            if (strikePrice === currentPrice) {
              console.error(`${selectedOrderType} strike price must be different from current price`);
              return false;
            }
          }

          // Validate payout per point for TURBO
          if (orderTypeConfig.requiresPayoutPerPoint) {
            if (!payoutPerPoint || payoutPerPoint <= 0) {
              console.error(`${selectedOrderType} requires a valid payout per point (must be positive)`);
              return false;
            }
          }

          // Validate side is allowed for this order type
          if (!orderTypeConfig.allowedSides.includes(side as any)) {
            console.error(`Side ${side} is not valid for ${selectedOrderType}`);
            return false;
          }

          try {
            // Extract currency and pair from symbol using actual market data
            const currency = extractBaseCurrency(currentSymbol, binaryMarkets);
            const pair = extractQuoteCurrency(currentSymbol, binaryMarkets);

            // Find the duration for this expiry time
            const duration = binaryDurations.find(d => d.duration === expiryMinutes);

            if (!duration) {
              const availableDurations = binaryDurations
                .filter(d => d.status === true)
                .map(d => `${d.duration}m`)
                .join(', ');
              console.error(
                `Invalid expiry duration: ${expiryMinutes} minutes is not available. ` +
                `Available durations: ${availableDurations || 'none'}. ` +
                `Please select a valid duration from the dropdown.`
              );
              return false;
            }

            // Additional validation: ensure the duration is active
            if (duration.status !== true) {
              const activeDurations = binaryDurations
                .filter(d => d.status === true)
                .map(d => `${d.duration}m`)
                .join(', ');
              console.error(
                `Duration ${expiryMinutes} minutes is currently inactive. ` +
                `Available active durations: ${activeDurations || 'none'}`
              );
              return false;
            }

            // Get type-specific profit percentage
            const profitPercentage = getProfitPercentageForType(duration, selectedOrderType);

            // Calculate closedAt timestamp from expiryMinutes - aligned to next expiry boundary
            const closedAt = calculateNextExpiryTime(expiryMinutes).toISOString();

            // Build request body with type-specific fields
            const requestBody: any = {
              currency,
              pair,
              amount,
              side,
              closedAt,
              durationId: duration.id,
              type: selectedOrderType,
              durationType,
              isDemo: tradingMode === "demo",
            };

            // Add type-specific fields only if required
            if (orderTypeConfig.requiresBarrier) {
              requestBody.barrier = barrier;
              // Include barrier level ID for profit calculation on backend
              if (selectedBarrierLevel) {
                requestBody.barrierLevelId = selectedBarrierLevel.id;
              }
            }

            if (orderTypeConfig.requiresStrikePrice) {
              requestBody.strikePrice = strikePrice;
              // Include strike level ID for profit calculation on backend
              if (selectedStrikeLevel) {
                requestBody.strikeLevelId = selectedStrikeLevel.id;
              }
            }

            if (orderTypeConfig.requiresPayoutPerPoint) {
              requestBody.payoutPerPoint = payoutPerPoint;
            }

            // Generate idempotency key to prevent duplicate orders
            // Format: timestamp-symbol-side-amount-random
            const idempotencyKey = `${Date.now()}-${currentSymbol.replace('/', '-')}-${side}-${amount}-${Math.random().toString(36).substring(2, 9)}`;

            // Call the API to place the order
            const { data, error } = await $fetch({
              url: "/api/exchange/binary/order",
              method: "POST",
              body: requestBody,
              headers: {
                'idempotency-key': idempotencyKey,
              },
              silentSuccess: true, // Don't show success toast - order panel handles its own success feedback
            });

            if (!error && data) {
              // Create order from API response
              // IMPORTANT: Use data from API response when available to ensure consistency
              const newOrder: Order = {
                id:
                  data.order?.id || Math.random().toString(36).substring(2, 15),
                symbol: data.order?.symbol || currentSymbol, // Use API symbol format if available
                side: data.order?.side || side, // Use API side when available (preserves HIGHER/LOWER etc.)
                amount: data.order?.amount || amount,
                entryPrice: data.order?.price || currentPrice, // Use API price if available
                expiryTime: data.order?.closedAt
                  ? new Date(data.order.closedAt).getTime()
                  : calculateNextExpiryTime(expiryMinutes).getTime(),
                createdAt: data.order?.createdAt
                  ? new Date(data.order.createdAt).getTime()
                  : Date.now(),
                status: "PENDING",
                mode: tradingMode,
                profitPercentage, // Store the profit percentage with the order
                type: data.order?.type || selectedOrderType, // Store order type for rendering
                // Add type-specific fields from API response or local values
                barrier: data.order?.barrier ?? (orderTypeConfig.requiresBarrier ? barrier : undefined),
                strikePrice: data.order?.strikePrice ?? (orderTypeConfig.requiresStrikePrice ? strikePrice : undefined),
                payoutPerPoint: data.order?.payoutPerPoint ?? (orderTypeConfig.requiresPayoutPerPoint ? payoutPerPoint : undefined),
              };

              // Update state only if API call was successful
              set((state) => ({
                orders: [...state.orders, newOrder],
              }));

              // Refresh wallet balance from backend after successful order placement
              // This ensures balance is accurate and prevents desync
              await get().fetchWalletData(pair);

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
              set({ isLoadingWallet: false });
              return;
            }

            const { binaryMarkets } = get();
            const currencyToFetch = currency || extractQuoteCurrency(currentSymbol, binaryMarkets);

            // Validate currency
            if (!currencyToFetch || currencyToFetch.length < 2) {
              set({ isLoadingWallet: false });
              return;
            }

            // Prevent duplicate calls - check if we're already loading this currency
            const currentState = get();
            if (currentState.isLoadingWallet) {
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
                    set({
                      realBalance: cachedData.balance,
                      isLoadingWallet: false,
                      ...(get().tradingMode === "real"
                        ? { balance: cachedData.balance }
                        : {}),
                    });
                    return;
                  }
                } catch {
                  sessionStorage.removeItem(cacheKey);
                }
              }
            }

            set({ isLoadingWallet: true });

            const { data, error } = await $fetch({
              url: `/api/finance/wallet/SPOT/${currencyToFetch}`,
              silent: true, // Don't show loading toast for background wallet refresh
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

        // Fetch binary settings from the global config store (no separate API call needed)
        // The binarySettings are already included in the main /api/settings response
        fetchBinarySettings: async () => {
          try {
            // Prevent duplicate calls if already loading
            if (get().isLoadingSettings) {
              return;
            }

            // Check cache first - respects TTL so settings refresh periodically
            const cached = getCachedData('binary_settings');
            if (cached) {
              // Only update state if the cached value is actually different
              // This prevents unnecessary re-renders when the same cached data is returned
              const currentSettings = get().binarySettings;
              if (currentSettings !== cached) {
                set({
                  binarySettings: cached,
                  selectedOrderType: cached.display?.defaultOrderType || "RISE_FALL",
                });
              }
              return;
            }

            set({ isLoadingSettings: true });

            // Get binary settings from the global config store instead of making a separate API call
            // The main /api/settings endpoint includes binarySettings as a JSON string
            const { useConfigStore } = await import('@/store/config');

            // Wait for the config store settings to be fetched
            // Poll for settings with a timeout to avoid infinite waiting
            let mainSettings = useConfigStore.getState().settings;
            let settingsFetched = useConfigStore.getState().settingsFetched;
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait (50 * 100ms)

            // Wait until settings are fetched OR we have binarySettings available
            while ((!settingsFetched || !mainSettings?.binarySettings) && attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 100));
              const state = useConfigStore.getState();
              mainSettings = state.settings;
              settingsFetched = state.settingsFetched;
              attempts++;
            }

            if (mainSettings?.binarySettings) {
              let settings: any;

              // Parse the binarySettings if it's a JSON string
              if (typeof mainSettings.binarySettings === 'string') {
                try {
                  settings = JSON.parse(mainSettings.binarySettings);
                } catch (e) {
                  console.warn("Failed to parse binarySettings from config store:", e);
                  set({ isLoadingSettings: false });
                  return;
                }
              } else {
                settings = mainSettings.binarySettings;
              }

              // Cache the result
              setCachedData('binary_settings', settings);

              // Only update state if settings actually changed
              // This prevents unnecessary re-renders when polling returns identical settings
              const currentSettings = get().binarySettings;
              const settingsChanged = !currentSettings ||
                JSON.stringify(currentSettings) !== JSON.stringify(settings);

              if (settingsChanged) {
                set({
                  binarySettings: settings,
                  isLoadingSettings: false,
                  selectedOrderType: settings.display?.defaultOrderType || "RISE_FALL",
                });
              } else {
                // Settings unchanged, just update loading state
                set({ isLoadingSettings: false });
              }

              // Note: Do NOT set binaryDurations here from settings.
              // The durations with correctly calculated cumulative profit adjustments
              // come from the /api/exchange/binary/duration endpoint.
              // fetchBinaryDurations() should be called separately to get accurate profits.
            } else {
              console.warn("binarySettings not found in config store after waiting", { settingsFetched, hasSettings: !!mainSettings, attempts });
              set({ isLoadingSettings: false });
            }
          } catch (error) {
            console.warn("Error fetching binary settings:", error);
            set({ isLoadingSettings: false });
          }
        },

        // Force refresh settings (clears cache and refetches)
        forceRefreshSettings: async () => {
          // Clear the cache
          marketDataCache.delete('binary_settings');
          // Reset the settings to allow refetch
          set({ binarySettings: null, isLoadingSettings: false });
          // Fetch fresh data
          await get().fetchBinarySettings();
        },

        // Set selected barrier level
        setSelectedBarrierLevel: (level) => {
          set({ selectedBarrierLevel: level });
          // Also update the barrier price if we have current price
          if (level && get().currentPrice > 0) {
            const { selectedOrderType, currentPrice } = get();
            // Calculate barrier based on distance from current price
            // For HIGHER side, barrier is above current price
            // For LOWER side, barrier is below current price
            const isHigherSide = ["HIGHER", "TOUCH", "UP"].includes(get().orders[0]?.side || "HIGHER");
            const distance = currentPrice * (level.distancePercent / 100);
            const barrierPrice = isHigherSide ? currentPrice + distance : currentPrice - distance;
            set({ barrier: barrierPrice });
          }
        },

        // Set selected strike level
        setSelectedStrikeLevel: (level) => {
          set({ selectedStrikeLevel: level });
          if (level && get().currentPrice > 0) {
            const { currentPrice } = get();
            // For CALL, strike is typically above current price
            // For PUT, strike is typically below current price
            const distance = currentPrice * (level.distancePercent / 100);
            set({ strikePrice: currentPrice + distance }); // Default to CALL direction
          }
        },

        // Get enabled order types from settings
        getEnabledOrderTypes: () => {
          const { binarySettings } = get();
          if (!binarySettings || !binarySettings.global.enabled) return [];

          return (Object.entries(binarySettings.orderTypes) as [BinaryOrderType, any][])
            .filter(([_, config]) => config.enabled)
            .map(([type]) => type);
        },

        // Get enabled barrier levels for an order type
        getEnabledBarrierLevels: (orderType: BinaryOrderType) => {
          const { binarySettings } = get();
          if (!binarySettings) return [];

          const config = binarySettings.orderTypes[orderType];
          if (!config || !('barrierLevels' in config)) return [];

          return (config as any).barrierLevels.filter((l: BarrierLevel) => l.enabled);
        },

        // Get enabled strike levels for CALL_PUT
        getEnabledStrikeLevels: () => {
          const { binarySettings } = get();
          if (!binarySettings) return [];

          const config = binarySettings.orderTypes.CALL_PUT;
          if (!config.strikeLevels) return [];

          return config.strikeLevels.filter((l: StrikeLevel) => l.enabled);
        },

        // Get profit percentage for currently selected level
        getProfitForSelectedLevel: () => {
          const { binarySettings, selectedOrderType, selectedBarrierLevel, selectedStrikeLevel } = get();
          if (!binarySettings) return 85; // Default

          const orderConfig = binarySettings.orderTypes[selectedOrderType];
          if (!orderConfig) return 85;

          // For barrier-based types, use selected barrier level profit
          if (selectedBarrierLevel && ['HIGHER_LOWER', 'TOUCH_NO_TOUCH', 'TURBO'].includes(selectedOrderType)) {
            return selectedBarrierLevel.profitPercent;
          }

          // For CALL_PUT, use selected strike level profit
          if (selectedStrikeLevel && selectedOrderType === 'CALL_PUT') {
            return selectedStrikeLevel.profitPercent;
          }

          // Default to base profit percentage
          return orderConfig.profitPercentage;
        },

        // Fetch binary durations with caching
        fetchBinaryDurations: async () => {
          try {
            // Prevent duplicate calls if already loading or if previous fetch failed
            if (get().isLoadingDurations || durationsFetchFailed) {
              return;
            }

            // Check if we already have durations data
            if (get().binaryDurations.length > 0) {
              return;
            }

            // Check cache first
            const cached = getCachedData('binary_durations');
            if (cached) {
              // Only set selectedExpiryMinutes if not already persisted from localStorage
              const currentExpiry = get().selectedExpiryMinutes;
              const hasValidPersistedExpiry = currentExpiry > 0 && cached.some((d: BinaryDuration) => d.duration === currentExpiry);
              set({
                binaryDurations: cached,
                // Keep persisted expiry if it's valid, otherwise use first active duration
                ...(hasValidPersistedExpiry ? {} : {
                  selectedExpiryMinutes: cached.find((d: BinaryDuration) => d.status)?.duration || cached[0].duration,
                }),
              });
              return;
            }

            set({ isLoadingDurations: true });

            const { data, error } = await $fetch({
              url: "/api/exchange/binary/duration",
              silent: true, // Don't show loading toast for background data fetch
            });

            if (!error && Array.isArray(data)) {
              // Cache the result
              setCachedData('binary_durations', data);

              // Reset failure flag on success
              durationsFetchFailed = false;

              // Only set selectedExpiryMinutes if not already persisted from localStorage
              const currentExpiry = get().selectedExpiryMinutes;
              const hasValidPersistedExpiry = currentExpiry > 0 && data.some((d: BinaryDuration) => d.duration === currentExpiry);

              set({
                binaryDurations: data,
                isLoadingDurations: false,
                // Keep persisted expiry if it's valid, otherwise use first active duration
                ...(data.length > 0 && !hasValidPersistedExpiry
                  ? {
                      selectedExpiryMinutes:
                        data.find((d: BinaryDuration) => d.status)?.duration ||
                        data[0].duration,
                    }
                  : {}),
              });
            } else {
              // Mark as failed to prevent infinite retry loops (e.g., license validation errors)
              durationsFetchFailed = true;
              set({ isLoadingDurations: false });
            }
          } catch (error) {
            // Mark as failed to prevent infinite retry loops
            durationsFetchFailed = true;
            set({ isLoadingDurations: false });
          }
        },

        // Force refresh durations (clears cache and refetches)
        forceRefreshDurations: async () => {
          // Clear the cache
          marketDataCache.delete('binary_durations');
          // Reset the durations array to allow refetch
          set({ binaryDurations: [], isLoadingDurations: false });
          // Reset failure flag
          durationsFetchFailed = false;
          // Fetch fresh data
          await get().fetchBinaryDurations();
        },

        // Fetch binary markets with caching
        fetchBinaryMarkets: async () => {
          try {
            // Prevent duplicate calls if already loading or if previous fetch failed
            if (get().isLoadingMarkets || marketsFetchFailed) {
              return;
            }

            // Check if we already have markets data
            if (get().binaryMarkets.length > 0) {
              return;
            }

            // Check cache first
            const cached = getCachedData('binary_markets');
            if (cached) {
              set({ binaryMarkets: cached });

              // Still set current symbol if needed
              requestAnimationFrame(() => {
                const { activeMarkets, currentSymbol } = get();
                if (cached.length > 0 && (activeMarkets.length === 0 || !currentSymbol)) {
                  const bestMarket = selectBestMarket(cached);
                  if (bestMarket) {
                    const symbol = bestMarket.symbol || `${bestMarket.currency}/${bestMarket.pair}`;
                    get().setCurrentSymbol(symbol);
                  }
                }
              });
              return;
            }

            set({ isLoadingMarkets: true });

            const { data, error } = await $fetch({
              url: "/api/exchange/binary/market",
              silent: true, // Don't show loading toast for background data fetch
            });

            if (!error && Array.isArray(data)) {
              const markets = data;

              // Cache the result
              setCachedData('binary_markets', markets);

              // Reset failure flag on success
              marketsFetchFailed = false;

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
              // Mark as failed to prevent infinite retry loops (e.g., license validation errors)
              marketsFetchFailed = true;
              set({ isLoadingMarkets: false });
            }
          } catch (error) {
            console.error("Failed to fetch binary markets:", error);
            // Mark as failed to prevent infinite retry loops
            marketsFetchFailed = true;
            set({ isLoadingMarkets: false });
          }
        },

        fetchCompletedOrders: async (loadMore = false) => {
          try {
            const { currentSymbol, tradingMode, binaryMarkets, completedOrdersPagination } = get();
            if (!currentSymbol) {
              return;
            }

            // Extract currency and pair from symbol using actual market data
            const currency = extractBaseCurrency(currentSymbol, binaryMarkets);
            const pair = extractQuoteCurrency(currentSymbol, binaryMarkets);

            // Determine offset based on loadMore flag
            const offset = loadMore ? completedOrdersPagination.offset + completedOrdersPagination.limit : 0;
            const limit = completedOrdersPagination.limit;

            const { data, error } = await $fetch({
              url: `/api/exchange/binary/order?currency=${currency}&pair=${pair}&type=CLOSED&limit=${limit}&offset=${offset}`,
              method: "GET",
              silent: true, // Don't show loading toast for background data fetch
            });

            if (!error && data) {
              const { orders, pagination } = data;

              // Filter completed orders and match trading mode
              const filteredOrders = orders.filter((order: any) =>
                order.status !== "PENDING" &&
                order.isDemo === (tradingMode === "demo")
              );

              // Transform the API response to match our CompletedOrder interface
              const newCompletedOrders: CompletedOrder[] = filteredOrders.map((order: any) => ({
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
                profitPercentage: order.profitPercentage,
                // Include type-specific fields for proper chart rendering
                type: order.type,
                barrier: order.barrier,
                strikePrice: order.strikePrice,
                payoutPerPoint: order.payoutPerPoint,
              }));

              // If loading more, append to existing orders; otherwise replace
              const updatedOrders = loadMore
                ? [...get().completedOrders, ...newCompletedOrders]
                : newCompletedOrders;

              set({
                completedOrders: updatedOrders,
                completedOrdersPagination: pagination,
              });

              // Fetch wallet data to sync balance after orders complete (only on initial load)
              if (!loadMore) {
                get().fetchWalletData();
              }
            } else {
              console.error("Failed to fetch completed orders:", error);
            }
          } catch (error) {
            console.error("Error fetching completed orders:", error);
          }
        },

        loadMoreCompletedOrders: async () => {
          const { completedOrdersPagination } = get();
          if (completedOrdersPagination.hasMore) {
            await get().fetchCompletedOrders(true);
          }
        },

        resetCompletedOrdersPagination: () => {
          set({
            completedOrdersPagination: {
              total: 0,
              limit: 50,
              offset: 0,
              hasMore: false,
            },
          });
        },

        fetchActiveOrders: async () => {
          try {
            const { currentSymbol, tradingMode, binaryMarkets, binaryDurations } = get();
            if (!currentSymbol) {
              return;
            }

            // Extract currency and pair from symbol using actual market data
            const currency = extractBaseCurrency(currentSymbol, binaryMarkets);
            const pair = extractQuoteCurrency(currentSymbol, binaryMarkets);

            const { data, error } = await $fetch({
              url: `/api/exchange/binary/order?currency=${currency}&pair=${pair}&type=OPEN`,
              method: "GET",
              silent: true, // Don't show loading toast for background data fetch
            });

            if (!error && data) {
              // API returns { orders: [...], pagination: {...} } format
              const ordersArray = Array.isArray(data) ? data : (data.orders || []);

              // Transform the API response to match our Order interface
              const activeOrders: Order[] = ordersArray.map((order: any) => {
                // Calculate duration in minutes
                const expiryTime = new Date(order.closedAt).getTime();
                const createdTime = new Date(order.createdAt).getTime();
                const durationMinutes = Math.round((expiryTime - createdTime) / (60 * 1000));

                // Find matching duration and get type-specific profit percentage
                const orderType: BinaryOrderType = order.type || 'RISE_FALL';
                const duration = binaryDurations.find(d => d.duration === durationMinutes);
                const profitPercentage = duration
                  ? getProfitPercentageForType(duration, orderType)
                  : 85; // Default to 85% if not found

                return {
                  id: order.id,
                  symbol: order.symbol,
                  side: order.side,
                  amount: order.amount,
                  entryPrice: order.price,
                  expiryTime,
                  createdAt: createdTime,
                  status: "PENDING", // All fetched orders should be pending
                  mode: order.isDemo ? "demo" : "real",
                  profitPercentage, // Include profit percentage
                  // Include type-specific fields for proper chart rendering
                  type: orderType,
                  barrier: order.barrier,
                  strikePrice: order.strikePrice,
                  payoutPerPoint: order.payoutPerPoint,
                };
              });

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

              // Fetch wallet data to sync balance after fetching orders
              get().fetchWalletData();
            } else {
              console.error("Failed to fetch active orders:", error);
            }
          } catch (error) {
            console.error("Error fetching active orders:", error);
          }
        },

        updateOrders: () => {
          const { orders, currentPrice } = get();

          // Skip if no orders
          if (orders.length === 0) return;

          // Get current time
          const now = Date.now();

          // Check if we're in the safe zone (15 seconds before expiry)
          const nextExpiry = calculateNextExpiryTime(
            get().selectedExpiryMinutes
          );
          const timeToExpiry =
            nextExpiry.getTime() - getChartSynchronizedTime().getTime();

          // Remove expired orders from active list - backend will handle resolution via WebSocket
          const activeOrders = orders.filter(
            order => order.status === "PENDING" && order.expiryTime > now
          );

          // Check if any orders expired since last update
          const hadExpiredOrders = activeOrders.length < orders.length;

          // Update profit for active (not expired) orders
          const updatedOrders = activeOrders.map((order) => {
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

          set({
            orders: updatedOrders,
            isInSafeZone: timeToExpiry <= 15000, // 15 seconds in milliseconds
          });

          // If orders expired, fetch completed orders from backend to get actual results
          if (hadExpiredOrders) {
            get().fetchCompletedOrders();
          }
        },

        // Cancel an active order and refund the amount
        cancelOrder: async (orderId: string) => {
          const { orders, tradingMode } = get();

          // Find the order
          const order = orders.find(o => o.id === orderId);
          if (!order) {
            return { success: false, error: "Order not found" };
          }

          // Validate order is pending
          if (order.status !== "PENDING") {
            return { success: false, error: "Order is not pending" };
          }

          // Validate not too close to expiry (10 seconds minimum)
          const timeUntilExpiry = order.expiryTime - Date.now();
          if (timeUntilExpiry < 10000) {
            return { success: false, error: "Too close to expiry to cancel" };
          }

          try {
            // Call the API to cancel the order
            const { data, error } = await $fetch({
              url: `/api/exchange/binary/order/${orderId}/cancel`,
              method: "POST",
              body: {
                isDemo: tradingMode === "demo",
              },
            });

            if (error) {
              return { success: false, error: typeof error === 'string' ? error : (error as Error).message || "Failed to cancel order" };
            }

            // Calculate refund (full amount for now, can add cancellation fee later)
            const refundAmount = data?.refundAmount ?? order.amount;
            const cancellationFee = data?.cancellationFee ?? 0;

            // Update local state
            set((state) => ({
              // Remove from active orders
              orders: state.orders.filter(o => o.id !== orderId),
              // Refund to balance
              balance: state.balance + refundAmount,
              ...(tradingMode === "demo"
                ? { demoBalance: state.demoBalance + refundAmount }
                : { realBalance: (state.realBalance ?? 0) + refundAmount }),
              // Add to completed orders as CANCELLED
              completedOrders: [
                {
                  id: order.id,
                  symbol: order.symbol,
                  side: order.side,
                  amount: order.amount,
                  entryPrice: order.entryPrice,
                  closePrice: order.entryPrice, // No price change for cancelled
                  entryTime: new Date(order.createdAt),
                  expiryTime: new Date(order.expiryTime),
                  status: "CANCELLED" as any, // Cast to any since type expects WIN/LOSS
                  profit: -cancellationFee, // Fee as negative profit
                },
                ...state.completedOrders,
              ],
            }));

            return { success: true, refundAmount };
          } catch (error: any) {
            console.error("Error cancelling order:", error);
            return { success: false, error: error.message || "Failed to cancel order" };
          }
        },

        // Close an order early at current market value
        closeOrderEarly: async (orderId: string) => {
          const { orders, currentPrice, tradingMode } = get();

          // Find the order
          const order = orders.find(o => o.id === orderId);
          if (!order) {
            return { success: false, error: "Order not found" };
          }

          // Validate order is pending
          if (order.status !== "PENDING") {
            return { success: false, error: "Order is not pending" };
          }

          // Validate minimum time from entry (30 seconds)
          const timeFromEntry = Date.now() - order.createdAt;
          if (timeFromEntry < 30000) {
            return { success: false, error: "Must wait 30 seconds after entry" };
          }

          // Validate not too close to expiry (10 seconds minimum)
          const timeUntilExpiry = order.expiryTime - Date.now();
          if (timeUntilExpiry < 10000) {
            return { success: false, error: "Too close to expiry" };
          }

          try {
            // Call the API to close the order early
            const { data, error } = await $fetch({
              url: `/api/exchange/binary/order/${orderId}/close`,
              method: "POST",
              body: {
                isDemo: tradingMode === "demo",
                currentPrice,
              },
            });

            if (error) {
              return { success: false, error: typeof error === 'string' ? error : (error as Error).message || "Failed to close order" };
            }

            // Calculate cash out value from response or locally
            const profitPercentage = order.profitPercentage || 85;
            const isProfitable = order.side === "RISE"
              ? currentPrice > order.entryPrice
              : currentPrice < order.entryPrice;

            // Calculate potential profit/loss
            let rawProfit: number;
            if (isProfitable) {
              rawProfit = (order.amount * profitPercentage) / 100;
            } else {
              rawProfit = -order.amount;
            }

            // Calculate early close penalty (only on profits)
            const totalDuration = order.expiryTime - order.createdAt;
            const timeProgress = Math.min(1, timeFromEntry / totalDuration);
            const penaltyRate = 10 * (1 - timeProgress); // 10% max penalty, decreases over time
            const penalty = isProfitable && rawProfit > 0 ? (rawProfit * penaltyRate) / 100 : 0;

            // Use API values if available, otherwise use calculated values
            const cashoutAmount = data?.cashoutAmount ?? (isProfitable
              ? order.amount + rawProfit - penalty
              : Math.max(0, order.amount + rawProfit));
            const actualPenalty = data?.penalty ?? penalty;

            // Calculate actual profit (cashout - original amount)
            const actualProfit = cashoutAmount - order.amount;

            // Update local state
            set((state) => ({
              // Remove from active orders
              orders: state.orders.filter(o => o.id !== orderId),
              // Update balance with cashout amount
              balance: state.balance + cashoutAmount,
              // Update net P/L
              netPL: state.netPL + actualProfit,
              ...(tradingMode === "demo"
                ? { demoBalance: state.demoBalance + cashoutAmount }
                : { realBalance: (state.realBalance ?? 0) + cashoutAmount }),
              // Add to completed orders as CLOSED_EARLY
              completedOrders: [
                {
                  id: order.id,
                  symbol: order.symbol,
                  side: order.side,
                  amount: order.amount,
                  entryPrice: order.entryPrice,
                  closePrice: currentPrice,
                  entryTime: new Date(order.createdAt),
                  expiryTime: new Date(order.expiryTime),
                  status: "CLOSED_EARLY" as any, // Cast to any since type expects WIN/LOSS
                  profit: actualProfit,
                },
                ...state.completedOrders,
              ],
            }));

            return {
              success: true,
              cashoutAmount,
              penalty: actualPenalty,
            };
          } catch (error: any) {
            console.error("Error closing order early:", error);
            return { success: false, error: error.message || "Failed to close order" };
          }
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
          const { user } = useUserStore.getState();
          if (!user?.id) return;

          const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:4000` : 'ws://localhost:4000')}/api/exchange/binary/order`;

          // Import WebSocket store dynamically to avoid circular dependencies
          import('@/store/websocket-store').then(({ useWebSocketStore }) => {
            const wsStore = useWebSocketStore.getState();
            const connectionKey = 'binary-orders';

            // Create WebSocket connection
            wsStore.createConnection(connectionKey, wsUrl, {
              onOpen: () => {
                console.log('Binary orders WebSocket connected');
              },
              onClose: () => {
                console.log('Binary orders WebSocket disconnected');
              },
              onError: (error) => {
                console.error('Binary orders WebSocket error:', error);
              },
            });

            // Add message handler for ORDER_COMPLETED events
            wsStore.addMessageHandler(
              connectionKey,
              (message: any) => {
                const { type, order } = message;

                if (type === 'ORDER_COMPLETED' && order) {
                  const { binaryDurations, currentSymbol } = get();

                  // Only process orders for the current symbol
                  if (order.symbol !== currentSymbol) return;

                  // Remove from active orders
                  set((state) => ({
                    orders: state.orders.filter((o) => o.id !== order.id),
                  }));

                  // Calculate duration for profit percentage lookup
                  const expiryTime = new Date(order.closedAt).getTime();
                  const createdTime = new Date(order.createdAt).getTime();
                  const durationMinutes = Math.round((expiryTime - createdTime) / (60 * 1000));

                  // Find matching duration and get type-specific profit percentage
                  const duration = binaryDurations.find(d => d.duration === durationMinutes);
                  const profitPercentage = duration
                    ? (() => {
                        switch (order.type) {
                          case 'RISE_FALL': return duration.profitPercentageRiseFall;
                          case 'HIGHER_LOWER': return duration.profitPercentageHigherLower;
                          case 'TOUCH_NO_TOUCH': return duration.profitPercentageTouchNoTouch;
                          case 'CALL_PUT': return duration.profitPercentageCallPut;
                          case 'TURBO': return duration.profitPercentageTurbo;
                          default: return duration.profitPercentage || 85;
                        }
                      })()
                    : 85;

                  // Add to completed orders
                  const completedOrder: CompletedOrder = {
                    id: order.id,
                    symbol: order.symbol,
                    side: order.side,
                    amount: order.amount,
                    entryPrice: order.price,
                    closePrice: order.closePrice,
                    entryTime: new Date(order.createdAt),
                    expiryTime: new Date(order.closedAt),
                    status: order.status,
                    profit: order.profit,
                    profitPercentage,
                    // Include type-specific fields for proper chart rendering
                    type: order.type,
                    barrier: order.barrier,
                    strikePrice: order.strikePrice,
                    payoutPerPoint: order.payoutPerPoint,
                  };

                  set((state) => ({
                    completedOrders: [completedOrder, ...state.completedOrders],
                  }));

                  // Refresh wallet balance if real mode
                  if (!order.isDemo) {
                    const { binaryMarkets, currentSymbol } = get();
                    const quoteCurrency = extractQuoteCurrency(currentSymbol, binaryMarkets);
                    get().fetchWalletData(quoteCurrency);
                  }
                }
              },
              // Filter to only process ORDER_COMPLETED messages
              (message: any) => message.type === 'ORDER_COMPLETED'
            );

            // Subscribe to order updates for this user
            wsStore.subscribe(connectionKey, 'order', {
              symbol: get().currentSymbol,
              userId: user.id,
            });
          });
        },

        // Cleanup method to prevent memory leaks
        cleanup: () => {
          cleanupRegistry.cleanup();
        },
        setIsLoading: (loading) => set({ isLoading: loading }), // Add setIsLoading
        user: useUserStore.getState().user, // Add user property
      }),
      {
        name: "binary-trading-store",
        partialize: (state) => ({
          // Only persist UI preferences, not trading parameters
          activeMarkets: state.activeMarkets,
          currentSymbol: state.currentSymbol,
          timeFrame: state.timeFrame,
          demoBalance: state.demoBalance,
          tradingMode: state.tradingMode,
          selectedExpiryMinutes: state.selectedExpiryMinutes,
          selectedOrderType: state.selectedOrderType,
          // Removed sensitive trading parameters for privacy:
          // - selectedAmount: Could profile user trading behavior
          // - barrier: Trading parameter, should not persist
          // - strikePrice: Trading parameter, should not persist
          // - payoutPerPoint: Trading parameter, should not persist
          // - durationType: Trading parameter, should not persist
        }),
      }
    )
  )
);

// Enhanced initialization function with proper error handling and deduplication
export const initializeBinaryStore = async (): Promise<void> => {
  // If already initialized, return immediately
  if (isInitialized) {
    return;
  }

  // If currently initializing, return the existing promise
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  // Set initializing flag and create promise
  isInitializing = true;

  initializationPromise = (async () => {
    try {
      const store = useBinaryStore.getState();
      // Get user from useUserStore instead of binary store
      const { user } = await import('@/store/user').then(m => m.useUserStore.getState());
      const isAuthenticated = !!user?.id;

      // Set loading state
      store.setIsLoading(true);

      // Parallel fetch of essential data
      // Fetch markets, settings, AND durations (durations have calculated profit adjustments)
      await Promise.all([
        store.fetchBinaryMarkets(),
        store.fetchBinarySettings().catch(() => {
          // Settings API failed, but continue - durations will still work
          console.warn("Binary settings API not available");
        }),
        store.fetchBinaryDurations(), // Always fetch durations for accurate profit calculations
      ]);

      // NOTE: Settings are loaded once at startup and used consistently.
      // No periodic refresh needed - settings are stable during the session.
      // Admin changes will be picked up on next page load/refresh.

      // Only fetch user-specific data if authenticated
      if (isAuthenticated) {
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
      }

      // Mark as initialized
      isInitialized = true;
      store.setIsLoading(false);

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
  cleanupRegistry.cleanup();

  // Reset store state if needed
  const store = useBinaryStore.getState();
  store.cleanup();

  // CRITICAL: Reset initialization flags AND promise to allow re-initialization
  isInitializing = false;
  isInitialized = false;
  initializationPromise = null;

  // Reset fetch failure flags to allow retry on next visit
  marketsFetchFailed = false;
  durationsFetchFailed = false;

  // Clear cache on cleanup to ensure fresh data on next visit
  marketDataCache.clear();
};

// Export cleanup registry for external cleanup management
export { cleanupRegistry };
