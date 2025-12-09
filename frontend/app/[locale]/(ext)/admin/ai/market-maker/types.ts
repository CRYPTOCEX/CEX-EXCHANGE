/**
 * AI Market Maker Types
 * Centralized type definitions for the AI Market Maker frontend
 */

// ============================================
// Bot Types
// ============================================

export type BotPersonality =
  | "SCALPER"
  | "SWING"
  | "ACCUMULATOR"
  | "DISTRIBUTOR"
  | "MARKET_MAKER";

export type BotTradeFrequency = "HIGH" | "MEDIUM" | "LOW";

export type BotStatus = "ACTIVE" | "PAUSED" | "COOLDOWN";

export interface Bot {
  id: string;
  marketMakerId: string;
  name: string;
  personality: BotPersonality;
  riskTolerance: number;
  tradeFrequency: BotTradeFrequency;
  avgOrderSize: number;
  orderSizeVariance: number;
  preferredSpread: number;
  status: BotStatus;
  lastTradeAt?: string;
  dailyTradeCount: number;
  maxDailyTrades: number;
  // Performance tracking
  realTradesExecuted: number;
  profitableTrades: number;
  totalRealizedPnL: number;
  totalVolume: number;
  currentPosition: number;
  avgEntryPrice: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Pool Types
// ============================================

export interface Pool {
  id: string;
  marketMakerId: string;
  baseCurrencyBalance: number;
  quoteCurrencyBalance: number;
  initialBaseBalance: number;
  initialQuoteBalance: number;
  totalValueLocked: number;
  unrealizedPnL: number;
  realizedPnL: number;
  lastRebalanceAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Market Types
// ============================================

export interface EcosystemMarket {
  id: string;
  symbol: string;
  currency: string;
  pair: string;
}

// ============================================
// Market Maker Types
// ============================================

export type MarketMakerStatus =
  | "ACTIVE"
  | "PAUSED"
  | "STOPPED"
  | "INITIALIZING"
  | "ERROR";

export type AggressionLevel = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";

export interface MarketMaker {
  id: string;
  ecosystemMarketId: string;
  status: MarketMakerStatus;
  targetPrice: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  aggressionLevel: AggressionLevel;
  realLiquidityPercent: number;
  maxDailyVolume: number;
  currentDailyVolume: number;
  volatilityPauseEnabled: boolean;
  volatilityThreshold: number;
  market?: EcosystemMarket;
  pool?: Pool;
  bots?: Bot[];
  recentTrades?: RecentTrade[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Trade Types
// ============================================

export interface RecentTrade {
  id: string;
  price: string;
  amount: string;
  buyBotId: string;
  sellBotId: string;
  createdAt: string;
}

// ============================================
// History Types
// ============================================

export type HistoryAction =
  | "TRADE"
  | "PAUSE"
  | "RESUME"
  | "REBALANCE"
  | "TARGET_CHANGE"
  | "DEPOSIT"
  | "WITHDRAW"
  | "START"
  | "STOP"
  | "CONFIG_CHANGE"
  | "EMERGENCY_STOP"
  | "AUTO_PAUSE";

export interface HistoryDetails {
  // For TRADE actions
  botId?: string;
  botName?: string;
  side?: "BUY" | "SELL";
  amount?: number;
  size?: number;
  volume?: number;
  price?: number;
  orderId?: string;
  // For DEPOSIT/WITHDRAW actions
  currency?: string;
  depositAmount?: number;
  withdrawAmount?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  // For TARGET_CHANGE actions
  previousTarget?: number;
  newTarget?: number;
  // For CONFIG_CHANGE actions
  field?: string;
  previousValue?: unknown;
  newValue?: unknown;
  // For PAUSE/AUTO_PAUSE actions
  reason?: string;
  volatility?: number;
  // General
  triggeredBy?: "ADMIN" | "SYSTEM" | "BOT";
  adminId?: string;
  note?: string;
}

export interface HistoryEntry {
  id: string;
  marketMakerId: string;
  action: HistoryAction;
  details?: HistoryDetails;
  priceAtAction: number;
  poolValueAtAction: number;
  createdAt: string;
}

// ============================================
// WebSocket Event Types
// ============================================

export type LiveEventType =
  | "TRADE"
  | "ORDER"
  | "STATUS_CHANGE"
  | "BOT_UPDATE"
  | "POOL_UPDATE"
  | "BOT_ACTIVITY"
  | "ERROR";

export interface LiveEvent {
  type: LiveEventType;
  data: LiveEventData;
  timestamp: string;
  marketMakerId: string;
}

export interface LiveEventData {
  // Trade events
  tradeId?: string;
  side?: "BUY" | "SELL";
  price?: number;
  amount?: number;
  buyBotId?: string;
  buyBotName?: string;
  sellBotId?: string;
  sellBotName?: string;
  // Order events
  orderId?: string;
  orderType?: string;
  // Status change events
  previousStatus?: MarketMakerStatus;
  newStatus?: MarketMakerStatus;
  // Bot activity events
  botId?: string;
  botName?: string;
  action?: BotActivityAction;
  details?: BotActivityDetails;
  // Generic
  id?: string;
  symbol?: string;
  [key: string]: unknown;
}

export type BotActivityAction =
  | "AI_TRADE"
  | "REAL_ORDER_PLACED"
  | "ORDER_CANCELLED"
  | "ANALYZING"
  | "WAITING"
  | "COOLDOWN";

export interface BotActivityDetails {
  side?: "BUY" | "SELL";
  price?: number;
  amount?: number;
  counterpartyBotId?: string;
  counterpartyBotName?: string;
  reason?: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface WalletBalances {
  base: {
    currency: string;
    balance: number;
  };
  quote: {
    currency: string;
    balance: number;
  };
}

// ============================================
// Config Types
// ============================================

export interface MarketMakerConfigUpdate {
  aggressionLevel?: AggressionLevel;
  realLiquidityPercent?: number;
  priceRangeLow?: number;
  priceRangeHigh?: number;
  maxDailyVolume?: number;
  volatilityPauseEnabled?: boolean;
  volatilityThreshold?: number;
}

export interface BotConfigUpdate {
  name?: string;
  personality?: BotPersonality;
  riskTolerance?: number;
  tradeFrequency?: BotTradeFrequency;
  avgOrderSize?: number;
  orderSizeVariance?: number;
  preferredSpread?: number;
  maxDailyTrades?: number;
}
