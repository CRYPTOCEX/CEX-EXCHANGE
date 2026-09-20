/**
 * Binary Trading Types
 *
 * Comprehensive type definitions for binary options trading functionality.
 * These types are used across the binary trading module for type safety.
 */

// ============================================================================
// SYMBOL TYPES
// ============================================================================

/**
 * Normalized symbol format (canonical format: "BTC/USDT")
 */
export type NormalizedSymbol = `${string}/${string}`;

/**
 * Symbol in any supported format
 */
export type AnySymbolFormat = string;

/**
 * Parsed symbol components
 */
export interface ParsedSymbol {
  base: string;
  quote: string;
  isValid: boolean;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

/**
 * Binary order type (strategy)
 */
export type BinaryOrderType =
  | "RISE_FALL"
  | "HIGHER_LOWER"
  | "TOUCH_NO_TOUCH"
  | "CALL_PUT"
  | "TURBO";

/**
 * Order direction for binary options (type-specific)
 */
export type OrderSide =
  | "RISE"
  | "FALL"
  | "HIGHER"
  | "LOWER"
  | "TOUCH"
  | "NO_TOUCH"
  | "CALL"
  | "PUT"
  | "UP"
  | "DOWN";

/**
 * Type-specific side mapping
 */
export type OrderSideMap = {
  RISE_FALL: "RISE" | "FALL";
  HIGHER_LOWER: "HIGHER" | "LOWER";
  TOUCH_NO_TOUCH: "TOUCH" | "NO_TOUCH";
  CALL_PUT: "CALL" | "PUT";
  TURBO: "UP" | "DOWN";
};

/**
 * Order status values
 */
export type OrderStatus =
  | "PENDING"      // Order is active, waiting for expiry
  | "WIN"          // Order completed with profit
  | "LOSS"         // Order completed with loss
  | "DRAW"         // Order completed at entry price
  | "CANCELLED"    // Order was cancelled by user
  | "CLOSED_EARLY" // Order was closed before expiry
  | "ERROR"        // Data fetch failed, needs manual review
  | "EXPIRED";     // Order expired without resolution (error state)

/**
 * Trading mode
 */
export type TradingMode = "demo" | "real";

/**
 * Complete binary order with all fields
 */
export interface BinaryOrder {
  /** Unique order identifier */
  id: string;

  /** Trading symbol (e.g., "BTC/USDT") */
  symbol: string;

  /** Binary order type (strategy) */
  type: BinaryOrderType;

  /** Order direction (type-specific) */
  side: OrderSide;

  /** Trade amount in quote currency */
  amount: number;

  /** Price at order entry */
  entryPrice: number;

  /** Timestamp when order was placed */
  entryTime: number;

  /** Timestamp when order expires */
  expiryTime: number;

  /** Price at order close (set after resolution) */
  closePrice?: number;

  /** Timestamp when order was closed (may differ from expiryTime for early close) */
  closedAt?: number;

  /** Current order status */
  status: OrderStatus;

  /** Profit/loss amount (set after resolution) */
  profit?: number;

  /** Profit percentage for this duration */
  profitPercentage: number;

  /** Trading mode (demo or real) */
  mode: TradingMode;

  /** Duration ID from backend */
  durationId?: string;

  /** Barrier price (for HIGHER_LOWER, TOUCH_NO_TOUCH, TURBO) */
  barrier?: number;

  /** Strike price (for CALL_PUT) */
  strikePrice?: number;

  /** Payout per point (for TURBO) */
  payoutPerPoint?: number;

  /** Duration type: TIME or TICKS */
  durationType?: "TIME" | "TICKS";

  /** Additional metadata */
  metadata?: BinaryOrderMetadata;
}

/**
 * Optional metadata for orders
 */
export interface BinaryOrderMetadata {
  /** User notes for trade journal */
  notes?: string;

  /** User-defined tags */
  tags?: string[];

  /** User rating (1-5) */
  rating?: number;

  /** Early close penalty amount */
  earlyClosePenalty?: number;

  /** Reason for early close */
  earlyCloseReason?: string;

  /** Cancellation fee (if any) */
  cancellationFee?: number;

  /** IP address of order placement */
  ipAddress?: string;

  /** Device/browser info */
  userAgent?: string;
}

/**
 * Order for creation (before ID is assigned)
 */
export type CreateBinaryOrder = Omit<
  BinaryOrder,
  "id" | "status" | "profit" | "closePrice" | "closedAt"
>;

/**
 * Order update payload
 */
export type UpdateBinaryOrder = Partial<
  Pick<BinaryOrder, "status" | "profit" | "closePrice" | "closedAt" | "metadata">
>;

// ============================================================================
// MARKET TYPES
// ============================================================================

/**
 * Binary trading market configuration
 */
export interface BinaryMarket {
  /** Unique market identifier */
  id: string;

  /** Base currency (e.g., "BTC") */
  currency: string;

  /** Quote currency (e.g., "USDT") */
  pair: string;

  /** Combined symbol (e.g., "BTCUSDT") */
  symbol?: string;

  /** Display label (e.g., "BTC/USDT") */
  label?: string;

  /** Market status */
  status: boolean;

  /** Is this a featured/hot market */
  isHot?: boolean;

  /** Is this market trending */
  isTrending?: boolean;

  /** Minimum trade amount */
  minAmount?: number;

  /** Maximum trade amount */
  maxAmount?: number;

  /** Number of decimal places for price */
  decimals?: number;

  /** Additional market metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Market duration configuration (expiry times)
 */
export interface BinaryDuration {
  /** Unique duration identifier */
  id: string;

  /** Duration in minutes */
  duration: number;

  /** Display label (e.g., "5 minutes") */
  label: string;

  /** Profit percentage for RISE_FALL orders */
  profitPercentageRiseFall: number;

  /** Profit percentage for HIGHER_LOWER orders */
  profitPercentageHigherLower: number;

  /** Profit percentage for TOUCH_NO_TOUCH orders */
  profitPercentageTouchNoTouch: number;

  /** Profit percentage for CALL_PUT orders */
  profitPercentageCallPut: number;

  /** Profit percentage for TURBO orders */
  profitPercentageTurbo: number;

  /** DEPRECATED: Use type-specific profit percentages */
  percentage?: number;

  /** Is this duration currently available */
  isActive: boolean;

  /** Minimum amount for this duration */
  minAmount?: number;

  /** Maximum amount for this duration */
  maxAmount?: number;
}

// ============================================================================
// WALLET TYPES
// ============================================================================

/**
 * Wallet balance information
 */
export interface WalletBalance {
  /** Currency code */
  currency: string;

  /** Available balance */
  available: number;

  /** Frozen/locked balance */
  frozen: number;

  /** Total balance (available + frozen) */
  total: number;

  /** Pending deposits */
  pendingDeposits?: number;

  /** Pending withdrawals */
  pendingWithdrawals?: number;
}

/**
 * Demo wallet information
 */
export interface DemoWallet {
  /** Demo balance amount */
  balance: number;

  /** Currency for demo wallet */
  currency: string;

  /** Last reset timestamp */
  lastReset?: number;

  /** Can reset demo balance */
  canReset?: boolean;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Trading statistics summary
 */
export interface TradingStats {
  /** Total number of trades */
  totalTrades: number;

  /** Number of winning trades */
  wins: number;

  /** Number of losing trades */
  losses: number;

  /** Number of draw/cancelled trades */
  draws: number;

  /** Win rate percentage (0-100) */
  winRate: number;

  /** Total profit/loss amount */
  totalPnL: number;

  /** Average profit per winning trade */
  avgWinAmount: number;

  /** Average loss per losing trade */
  avgLossAmount: number;

  /** Best single trade profit */
  bestTrade: number;

  /** Worst single trade loss */
  worstTrade: number;

  /** Current win streak */
  currentStreak: number;

  /** Is current streak winning */
  isWinningStreak: boolean;

  /** Longest win streak */
  longestWinStreak: number;

  /** Longest loss streak */
  longestLossStreak: number;

  /** Profit factor (gross profit / gross loss) */
  profitFactor: number;

  /** Average trade duration in seconds */
  avgTradeDuration: number;
}

/**
 * Statistics by symbol
 */
export interface SymbolStats extends TradingStats {
  symbol: string;
}

/**
 * Statistics by timeframe/duration
 */
export interface DurationStats extends TradingStats {
  duration: number;
  durationLabel: string;
}

/**
 * Statistics by time of day
 */
export interface TimeOfDayStats {
  hour: number; // 0-23
  trades: number;
  wins: number;
  winRate: number;
  avgPnL: number;
}

/**
 * Statistics by day of week
 */
export interface DayOfWeekStats {
  day: number; // 0-6 (Sunday-Saturday)
  dayName: string;
  trades: number;
  wins: number;
  winRate: number;
  avgPnL: number;
}

// ============================================================================
// STORE TYPES
// ============================================================================

/**
 * Binary trading store state
 */
export interface BinaryStoreState {
  // Markets
  markets: BinaryMarket[];
  selectedMarket: BinaryMarket | null;
  symbol: string;

  // Durations
  durations: BinaryDuration[];
  selectedDuration: BinaryDuration | null;

  // Orders
  activeOrders: BinaryOrder[];
  completedOrders: BinaryOrder[];
  isLoadingOrders: boolean;

  // Wallet
  realWallet: WalletBalance | null;
  demoWallet: DemoWallet | null;
  tradingMode: TradingMode;

  // Price data
  currentPrice: number;
  lastPriceUpdate: number;

  // UI state
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

/**
 * Binary trading store actions
 */
export interface BinaryStoreActions {
  // Market actions
  fetchMarkets: () => Promise<void>;
  selectMarket: (market: BinaryMarket) => void;
  setSymbol: (symbol: string) => void;

  // Duration actions
  fetchDurations: () => Promise<void>;
  selectDuration: (duration: BinaryDuration) => void;

  // Order actions
  placeOrder: (
    side: OrderSide,
    amount: number,
    expiryMinutes: number
  ) => Promise<BinaryOrder>;
  cancelOrder: (orderId: string) => Promise<void>;
  closeOrderEarly: (orderId: string) => Promise<BinaryOrder>;
  fetchActiveOrders: () => Promise<void>;
  fetchCompletedOrders: () => Promise<void>;

  // Wallet actions
  fetchWallet: () => Promise<void>;
  setTradingMode: (mode: TradingMode) => void;
  resetDemoBalance: () => Promise<void>;

  // Price actions
  setCurrentPrice: (price: number) => void;

  // Cleanup
  cleanup: () => void;
  reset: () => void;
}

/**
 * Complete binary trading store
 */
export type BinaryStore = BinaryStoreState & BinaryStoreActions;

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Order placement request payload
 */
export interface PlaceOrderRequest {
  currency: string;
  pair: string;
  amount: number;
  side: OrderSide;
  orderType: BinaryOrderType;
  closedAt: number; // Expiry timestamp
  durationId: string;
  type: "LIVE" | "DEMO";
  isDemo?: boolean;
  barrier?: number; // For HIGHER_LOWER, TOUCH_NO_TOUCH, TURBO
  strikePrice?: number; // For CALL_PUT
  payoutPerPoint?: number; // For TURBO
  durationType?: "TIME" | "TICKS";
}

/**
 * Order placement response
 */
export interface PlaceOrderResponse {
  id: string;
  status: "success" | "error";
  message?: string;
  order?: BinaryOrder;
}

/**
 * Cancel order request
 */
export interface CancelOrderRequest {
  orderId: string;
}

/**
 * Cancel order response
 */
export interface CancelOrderResponse {
  status: "success" | "error";
  message?: string;
  refundAmount?: number;
  cancellationFee?: number;
}

/**
 * Early close request
 */
export interface EarlyCloseRequest {
  orderId: string;
}

/**
 * Early close response
 */
export interface EarlyCloseResponse {
  status: "success" | "error";
  message?: string;
  order?: BinaryOrder;
  cashoutAmount?: number;
  penalty?: number;
}

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

/**
 * Price update message from WebSocket
 */
export interface PriceUpdateMessage {
  type: "price_update";
  symbol: string;
  price: number;
  timestamp: number;
  change24h?: number;
  changePercent24h?: number;
}

/**
 * Order update message from WebSocket
 */
export interface OrderUpdateMessage {
  type: "order_update";
  orderId: string;
  status: OrderStatus;
  closePrice?: number;
  profit?: number;
  closedAt?: number;
}

/**
 * All possible WebSocket messages
 */
export type BinaryWebSocketMessage =
  | PriceUpdateMessage
  | OrderUpdateMessage;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if order is active (pending)
 */
export function isActiveOrder(order: BinaryOrder): boolean {
  return order.status === "PENDING";
}

/**
 * Check if order is completed
 */
export function isCompletedOrder(order: BinaryOrder): boolean {
  return ["WIN", "LOSS", "DRAW", "CANCELLED", "CLOSED_EARLY", "EXPIRED"].includes(
    order.status
  );
}

/**
 * Check if order was profitable
 */
export function isProfitableOrder(order: BinaryOrder): boolean {
  return order.status === "WIN" || (order.profit !== undefined && order.profit > 0);
}

/**
 * Check if status indicates a win
 */
export function isWinStatus(status: OrderStatus): boolean {
  return status === "WIN";
}

/**
 * Check if status indicates a loss
 */
export function isLossStatus(status: OrderStatus): boolean {
  return status === "LOSS";
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(order: BinaryOrder): boolean {
  if (order.status !== "PENDING") return false;
  const now = Date.now();
  const timeUntilExpiry = order.expiryTime - now;
  // Allow cancellation if more than 10 seconds until expiry
  return timeUntilExpiry > 10000;
}

/**
 * Check if order can be closed early
 */
export function canCloseEarly(order: BinaryOrder): boolean {
  if (order.status !== "PENDING") return false;
  const now = Date.now();
  const timeFromEntry = now - order.entryTime;
  const timeUntilExpiry = order.expiryTime - now;
  // Allow early close if:
  // - At least 30 seconds after entry
  // - At least 10 seconds before expiry
  return timeFromEntry >= 30000 && timeUntilExpiry >= 10000;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Makes specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Makes specific properties required
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Extract order properties that can be updated
 */
export type UpdatableOrderFields = Pick<
  BinaryOrder,
  "metadata" | "status" | "profit" | "closePrice" | "closedAt"
>;

// ============================================================================
// ORDER TYPE CONFIGURATION
// ============================================================================

/**
 * Configuration for each order type
 */
export interface OrderTypeConfig {
  /** Order type identifier */
  type: BinaryOrderType;

  /** Display name */
  label: string;

  /** Short description */
  description: string;

  /** Icon name (for UI) */
  icon?: string;

  /** Requires barrier input */
  requiresBarrier: boolean;

  /** Requires strike price input */
  requiresStrikePrice: boolean;

  /** Requires payout per point input */
  requiresPayoutPerPoint: boolean;

  /** Allowed sides for this type */
  allowedSides: readonly OrderSide[];

  /** Minimum duration in minutes */
  minDuration: number;

  /** Maximum duration in minutes */
  maxDuration: number;

  /** Can use tick-based duration */
  supportsTicks: boolean;

  /** Is currently available */
  isAvailable: boolean;
}

/**
 * Order type configurations
 */
export const ORDER_TYPE_CONFIGS: Record<BinaryOrderType, OrderTypeConfig> = {
  RISE_FALL: {
    type: "RISE_FALL",
    label: "Rise/Fall",
    description: "Predict if price will rise or fall",
    requiresBarrier: false,
    requiresStrikePrice: false,
    requiresPayoutPerPoint: false,
    allowedSides: ["RISE", "FALL"] as const,
    minDuration: 1,
    maxDuration: 1440,
    supportsTicks: true,
    isAvailable: true,
  },
  HIGHER_LOWER: {
    type: "HIGHER_LOWER",
    label: "Higher/Lower",
    description: "Predict if price will close higher or lower than barrier",
    requiresBarrier: true,
    requiresStrikePrice: false,
    requiresPayoutPerPoint: false,
    allowedSides: ["HIGHER", "LOWER"] as const,
    minDuration: 1,
    maxDuration: 1440,
    supportsTicks: false,
    isAvailable: true, // ✅ Phase 2 Complete
  },
  TOUCH_NO_TOUCH: {
    type: "TOUCH_NO_TOUCH",
    label: "Touch/No Touch",
    description: "Predict if price will touch barrier or not",
    requiresBarrier: true,
    requiresStrikePrice: false,
    requiresPayoutPerPoint: false,
    allowedSides: ["TOUCH", "NO_TOUCH"] as const,
    minDuration: 5,
    maxDuration: 1440,
    supportsTicks: false,
    isAvailable: true, // ✅ Phase 3 Complete
  },
  CALL_PUT: {
    type: "CALL_PUT",
    label: "Call/Put",
    description: "Options-style with strike price",
    requiresBarrier: false,
    requiresStrikePrice: true,
    requiresPayoutPerPoint: false,
    allowedSides: ["CALL", "PUT"] as const,
    minDuration: 15,
    maxDuration: 10080,
    supportsTicks: false,
    isAvailable: true, // ✅ Phase 4 Complete
  },
  TURBO: {
    type: "TURBO",
    label: "Turbo",
    description: "Fast-paced with barrier breach detection",
    requiresBarrier: true,
    requiresStrikePrice: false,
    requiresPayoutPerPoint: true,
    allowedSides: ["UP", "DOWN"] as const,
    minDuration: 1,
    maxDuration: 5,
    supportsTicks: false,
    isAvailable: true, // ✅ Phase 5 Complete
  },
};

/**
 * Get valid sides for a given order type
 */
export function getValidSidesForType(type: BinaryOrderType): readonly OrderSide[] {
  return getOrderTypeConfig(type).allowedSides;
}

/**
 * Check if a side is valid for a given type
 */
export function isValidSideForType(type: BinaryOrderType, side: OrderSide): boolean {
  return getOrderTypeConfig(type).allowedSides.includes(side);
}

/**
 * Get order type config — THE safe way to read `ORDER_TYPE_CONFIGS`.
 * ============================================================================
 *
 * The map is typed `Record<BinaryOrderType, …>`, so TypeScript treats every
 * lookup as total and a direct index reads as safe. At runtime it is not: the
 * key usually comes from `selectedOrderType` in the PERSISTED
 * `binary-trading-store`, i.e. from the user's localStorage. A value that was
 * once valid and no longer is — a renamed type, a removed product, a
 * hand-edited entry — indexes to `undefined`, and the next property read
 * throws.
 *
 * Not theoretical: seeding a stale `selectedOrderType` took `order-panel.tsx`
 * down with `Cannot read properties of undefined (reading 'requiresBarrier')`,
 * dropping the whole trading panel into its error boundary — on the page where
 * someone is placing money. This function returned the raw index, so it
 * offered no protection to the callers that did use it.
 *
 * `RISE_FALL` is the fallback because it is the baseline product every install
 * has and the only one needing no extra inputs (no barrier, no strike, no
 * payout per point), so a corrupt key degrades to the simplest working panel
 * rather than a broken one.
 *
 * Index this map through here, never directly.
 */
export function getOrderTypeConfig(type: BinaryOrderType): OrderTypeConfig {
  return ORDER_TYPE_CONFIGS[type] ?? ORDER_TYPE_CONFIGS.RISE_FALL;
}

/**
 * Get available order types
 */
export function getAvailableOrderTypes(): BinaryOrderType[] {
  return Object.values(ORDER_TYPE_CONFIGS)
    .filter((config) => config.isAvailable)
    .map((config) => config.type);
}

/**
 * Duration fields used for profit calculation
 * Compatible with both BinaryDuration and BinaryDurationAttributes
 */
export interface ProfitDurationFields {
  profitPercentageRiseFall: number;
  profitPercentageHigherLower: number;
  profitPercentageTouchNoTouch: number;
  profitPercentageCallPut: number;
  profitPercentageTurbo: number;
  percentage?: number;
  profitPercentage?: number;
}

/**
 * Get profit percentage for specific order type from duration
 */
export function getProfitPercentageForType(
  duration: ProfitDurationFields,
  orderType: BinaryOrderType
): number {
  // Use profitPercentage (model naming) or percentage (legacy) as fallback
  const fallback = duration.profitPercentage ?? duration.percentage ?? 85;

  switch (orderType) {
    case 'RISE_FALL':
      return duration.profitPercentageRiseFall || fallback;
    case 'HIGHER_LOWER':
      return duration.profitPercentageHigherLower || (duration.profitPercentage ?? duration.percentage ?? 80);
    case 'TOUCH_NO_TOUCH':
      return duration.profitPercentageTouchNoTouch || (duration.profitPercentage ?? duration.percentage ?? 200);
    case 'CALL_PUT':
      return duration.profitPercentageCallPut || fallback;
    case 'TURBO':
      return duration.profitPercentageTurbo || (duration.profitPercentage ?? duration.percentage ?? 70);
    default:
      return fallback;
  }
}

/**
 * THE PAYOUT A SPECIFIC SIDE WILL ACTUALLY BE PAID.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS: THE TWO SIDES OF A TOUCH/NO-TOUCH CONTRACT ARE NOT PRICED
 * THE SAME, AND THE TICKET QUOTED ONE FIGURE FOR BOTH.
 *
 * `BinaryOrderService.ts:494-502` scales the barrier level's rate by the side:
 *
 *     if (side === "TOUCH")    profitPercentage *= touchProfitMultiplier   // 1.2 default
 *     if (side === "NO_TOUCH") profitPercentage *= noTouchProfitMultiplier // 0.7 default
 *
 * That is the whole point of the product — TOUCH is harder to win and pays more,
 * NO_TOUCH is easier and pays less. The trading panel applied NEITHER multiplier
 * and printed the same `+{profitPercentage}%` on both buttons, so on a 95%
 * barrier with a 1,000 stake the NO_TOUCH button promised **+950.00** and the
 * contract froze 66.5% and credited **665.00**. Forty-three percent of the
 * quoted profit, on the figure the trader used to decide.
 *
 * The multipliers were not missing from the client: `use-binary-store.ts`
 * DECLARES both fields on `TOUCH_NO_TOUCH` and the settings endpoint sends them.
 * They were received and never read.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SCOPE. This applies the SIDE multiplier only. The cumulative duration
 * adjustment (`BinaryOrderService.ts:574-586`) is applied by the caller's
 * existing `durationAdjustmentRatio` and is deliberately not duplicated here —
 * one function, one correction, so a future divergence in either is visible.
 *
 * `|| 1` matches the backend's own default exactly: an unconfigured multiplier
 * means "no adjustment", NOT "no payout". Reading a missing multiplier as 0
 * would quote every side at zero, which is a louder bug but still a wrong
 * number.
 */
export function applySideProfitMultiplier(
  basePercent: number,
  orderType: BinaryOrderType,
  side: OrderSide,
  orderTypeConfig?: { touchProfitMultiplier?: number; noTouchProfitMultiplier?: number } | null
): number {
  if (!Number.isFinite(basePercent)) return basePercent;
  if (orderType !== "TOUCH_NO_TOUCH") return basePercent;

  if (side === "TOUCH") {
    return basePercent * (Number(orderTypeConfig?.touchProfitMultiplier) || 1);
  }
  if (side === "NO_TOUCH") {
    return basePercent * (Number(orderTypeConfig?.noTouchProfitMultiplier) || 1);
  }
  return basePercent;
}
