/**
 * Risk Management Types
 *
 * Type definitions for all risk management features in binary trading.
 */

// ============================================================================
// LIMIT ORDER TYPES
// ============================================================================

export interface LimitOrder {
  id: string;
  symbol: string;
  side: "RISE" | "FALL";
  amount: number;
  limitPrice: number;
  expiryMinutes: number;
  condition: "above" | "below" | "cross_above" | "cross_below";
  createdAt: number;
  expiresAt: number; // Limit order expires if not triggered
  status: "WAITING" | "TRIGGERED" | "EXPIRED" | "CANCELLED";
  profitPercentage: number;
}

export interface LimitOrderFormData {
  side: "RISE" | "FALL";
  amount: number;
  limitPrice: number;
  expiryMinutes: number;
  condition: "above" | "below" | "cross_above" | "cross_below";
  limitOrderExpiry: number; // How long the limit order itself lasts (in minutes)
}

// ============================================================================
// STOP-LOSS / TAKE-PROFIT TYPES
// ============================================================================

export interface StopLossSettings {
  enabled: boolean;
  type: "per_trade" | "session" | "daily";
  // Per-trade: cash out at this loss percentage
  perTradeLossPercent: number;
  // Session: stop trading after this total loss
  sessionLossLimit: number;
  // Daily: stop trading after this daily loss
  dailyLossLimit: number;
  // Current session loss tracking
  currentSessionLoss: number;
  // Current daily loss tracking
  currentDailyLoss: number;
  // Last reset date for daily limit
  lastDailyReset: string;
}

export interface TakeProfitSettings {
  enabled: boolean;
  type: "per_trade" | "session" | "daily";
  // Per-trade: cash out at this profit percentage
  perTradeProfitPercent: number;
  // Session: stop trading after this total profit
  sessionProfitTarget: number;
  // Daily: stop trading after this daily profit
  dailyProfitTarget: number;
  // Current session profit tracking
  currentSessionProfit: number;
  // Current daily profit tracking
  currentDailyProfit: number;
  // Last reset date for daily limit
  lastDailyReset: string;
}

// ============================================================================
// OCO (ONE-CANCELS-OTHER) TYPES
// ============================================================================

export interface OCOOrder {
  id: string;
  stopLossPercent: number;
  takeProfitPercent: number;
  linkedOrderId: string; // The active binary order this OCO is attached to
  status: "ACTIVE" | "STOP_TRIGGERED" | "PROFIT_TRIGGERED" | "CANCELLED";
}

export interface OCOSettings {
  enabled: boolean;
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;
  autoApplyToNewOrders: boolean;
}

// ============================================================================
// DAILY LOSS LIMIT TYPES
// ============================================================================

export interface DailyLimitSettings {
  enabled: boolean;
  maxDailyLoss: number; // Amount or percentage
  maxDailyLossType: "amount" | "percentage";
  currentDailyPL: number;
  resetTime: string; // Time of day to reset (e.g., "00:00")
  lastResetDate: string;
  warningThreshold: number; // Percentage of limit to show warning (e.g., 80%)
  isLimitReached: boolean;
  overrideUntil?: number; // Timestamp if user overrides the limit
}

// ============================================================================
// POSITION SIZING TYPES
// ============================================================================

export type PositionSizingMethod = "fixed" | "percentage" | "kelly" | "anti_martingale";

export interface PositionSizingSettings {
  method: PositionSizingMethod;
  // Fixed amount
  fixedAmount: number;
  // Percentage of balance
  riskPercentage: number;
  // Kelly criterion inputs
  kellyWinRate: number; // Historical win rate
  kellyProfitRatio: number; // Average profit / Average loss
  kellyFraction: number; // Fraction of Kelly (0.25, 0.5, 1.0)
  // Anti-martingale settings
  antiMartingaleMultiplier: number;
  antiMartingaleMaxIncreases: number;
  antiMartingaleResetOnLoss: boolean;
}

export interface PositionSizeResult {
  suggestedAmount: number;
  method: PositionSizingMethod;
  explanation: string;
  riskAmount: number;
  riskPercentage: number;
}

// ============================================================================
// TRADE COOLDOWN TYPES
// ============================================================================

export interface CooldownSettings {
  enabled: boolean;
  // Trigger conditions
  triggerAfterLosses: number; // Number of consecutive losses
  triggerAfterLossAmount: number; // Total loss amount
  // Cooldown duration
  cooldownMinutes: number;
  // Current state
  isInCooldown: boolean;
  cooldownEndsAt?: number;
  consecutiveLosses: number;
  // Allow override with warning
  allowOverride: boolean;
  overrideWarningShown: boolean;
}

// ============================================================================
// RISK MANAGEMENT STATE (Combined)
// ============================================================================

export interface RiskManagementState {
  // Limit orders
  limitOrders: LimitOrder[];
  // Stop-loss settings
  stopLoss: StopLossSettings;
  // Take-profit settings
  takeProfit: TakeProfitSettings;
  // OCO settings
  oco: OCOSettings;
  ocoOrders: OCOOrder[];
  // Daily limit
  dailyLimit: DailyLimitSettings;
  // Position sizing
  positionSizing: PositionSizingSettings;
  // Cooldown
  cooldown: CooldownSettings;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_STOP_LOSS_SETTINGS: StopLossSettings = {
  enabled: false,
  type: "per_trade",
  perTradeLossPercent: 50,
  sessionLossLimit: 500,
  dailyLossLimit: 1000,
  currentSessionLoss: 0,
  currentDailyLoss: 0,
  lastDailyReset: new Date().toISOString().split("T")[0],
};

export const DEFAULT_TAKE_PROFIT_SETTINGS: TakeProfitSettings = {
  enabled: false,
  type: "per_trade",
  perTradeProfitPercent: 50,
  sessionProfitTarget: 500,
  dailyProfitTarget: 1000,
  currentSessionProfit: 0,
  currentDailyProfit: 0,
  lastDailyReset: new Date().toISOString().split("T")[0],
};

export const DEFAULT_OCO_SETTINGS: OCOSettings = {
  enabled: false,
  defaultStopLossPercent: 30,
  defaultTakeProfitPercent: 70,
  autoApplyToNewOrders: false,
};

export const DEFAULT_DAILY_LIMIT_SETTINGS: DailyLimitSettings = {
  enabled: false,
  maxDailyLoss: 500,
  maxDailyLossType: "amount",
  currentDailyPL: 0,
  resetTime: "00:00",
  lastResetDate: new Date().toISOString().split("T")[0],
  warningThreshold: 80,
  isLimitReached: false,
};

export const DEFAULT_POSITION_SIZING_SETTINGS: PositionSizingSettings = {
  method: "percentage",
  fixedAmount: 100,
  riskPercentage: 2,
  kellyWinRate: 55,
  kellyProfitRatio: 0.85,
  kellyFraction: 0.5,
  antiMartingaleMultiplier: 1.5,
  antiMartingaleMaxIncreases: 3,
  antiMartingaleResetOnLoss: true,
};

export const DEFAULT_COOLDOWN_SETTINGS: CooldownSettings = {
  enabled: false,
  triggerAfterLosses: 3,
  triggerAfterLossAmount: 300,
  cooldownMinutes: 15,
  isInCooldown: false,
  consecutiveLosses: 0,
  allowOverride: true,
  overrideWarningShown: false,
};

export const DEFAULT_RISK_MANAGEMENT_STATE: RiskManagementState = {
  limitOrders: [],
  stopLoss: DEFAULT_STOP_LOSS_SETTINGS,
  takeProfit: DEFAULT_TAKE_PROFIT_SETTINGS,
  oco: DEFAULT_OCO_SETTINGS,
  ocoOrders: [],
  dailyLimit: DEFAULT_DAILY_LIMIT_SETTINGS,
  positionSizing: DEFAULT_POSITION_SIZING_SETTINGS,
  cooldown: DEFAULT_COOLDOWN_SETTINGS,
};
