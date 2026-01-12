/**
 * Binary Trading Settings Types
 *
 * TypeScript interfaces for binary trading settings configuration.
 * These mirror the backend types for type safety across the application.
 */

// ============================================================================
// ORDER TYPES
// ============================================================================

export type BinaryOrderType =
  | "RISE_FALL"
  | "HIGHER_LOWER"
  | "TOUCH_NO_TOUCH"
  | "CALL_PUT"
  | "TURBO";

export const ORDER_TYPE_LABELS: Record<BinaryOrderType, string> = {
  RISE_FALL: "Rise/Fall",
  HIGHER_LOWER: "Higher/Lower",
  TOUCH_NO_TOUCH: "Touch/No Touch",
  CALL_PUT: "Call/Put",
  TURBO: "Turbo",
};

export const ORDER_TYPE_DESCRIPTIONS: Record<BinaryOrderType, string> = {
  RISE_FALL: "Predict if the price will rise or fall from entry price",
  HIGHER_LOWER: "Predict if the price will be higher or lower than a barrier",
  TOUCH_NO_TOUCH: "Predict if the price will touch or not touch a barrier",
  CALL_PUT: "Similar to traditional options with strike price",
  TURBO: "High-risk, high-reward short-term trades with barrier knockout",
};

// ============================================================================
// BARRIER & STRIKE LEVELS
// ============================================================================

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

// ============================================================================
// TRADING MODE CONFIGURATION
// ============================================================================

export interface TradingModeConfig {
  demo: boolean;
  live: boolean;
}

// ============================================================================
// ORDER TYPE CONFIGURATIONS
// ============================================================================

export interface OrderTypeConfig {
  enabled: boolean;
  profitPercentage: number;
  tradingModes?: TradingModeConfig;
}

export interface RiseFallConfig extends OrderTypeConfig {}

export interface HigherLowerConfig extends OrderTypeConfig {
  barrierLevels: BarrierLevel[];
}

export interface TouchNoTouchConfig extends OrderTypeConfig {
  barrierLevels: BarrierLevel[];
  touchProfitMultiplier: number;
  noTouchProfitMultiplier: number;
}

export interface CallPutConfig extends OrderTypeConfig {
  strikeLevels: StrikeLevel[];
}

export interface TurboConfig extends OrderTypeConfig {
  barrierLevels: BarrierLevel[];
  payoutPerPointRange: { min: number; max: number };
  maxDuration: number;
  allowTicksBased: boolean;
}

// ============================================================================
// DURATION CONFIGURATION
// ============================================================================

export interface DurationConfig {
  id: string;
  minutes: number;
  enabled: boolean;
  orderTypeOverrides?: {
    [orderType: string]: {
      enabled?: boolean;
      profitAdjustment?: number;
    };
  };
}

// ============================================================================
// CANCELLATION SETTINGS
// ============================================================================

export interface CancellationRule {
  enabled: boolean;
  minTimeBeforeExpirySeconds: number;
  penaltyPercentage: number;
  penaltyByTimeRemaining?: {
    above60Seconds: number;
    above30Seconds: number;
    below30Seconds: number;
  };
}

export interface CancellationSettings {
  enabled: boolean;
  rules: {
    RISE_FALL: CancellationRule;
    HIGHER_LOWER: CancellationRule;
    TOUCH_NO_TOUCH: CancellationRule;
    CALL_PUT: CancellationRule;
    TURBO: CancellationRule;
  };
}

// ============================================================================
// CHART TYPE
// ============================================================================

export type ChartType = "CHART_ENGINE" | "TRADINGVIEW";

// ============================================================================
// MAIN SETTINGS INTERFACE
// ============================================================================

export interface BinarySettings {
  global: {
    enabled: boolean;
    practiceEnabled: boolean;
    maxConcurrentOrders: number;
    maxDailyOrders: number;
    cooldownSeconds: number;
    orderExpirationBuffer: number;
    cancelExpirationBuffer: number;
  };

  display: {
    chartType: ChartType;
  };

  cancellation: CancellationSettings;

  orderTypes: {
    RISE_FALL: RiseFallConfig;
    HIGHER_LOWER: HigherLowerConfig;
    TOUCH_NO_TOUCH: TouchNoTouchConfig;
    CALL_PUT: CallPutConfig;
    TURBO: TurboConfig;
  };

  durations: DurationConfig[];

  riskManagement: {
    dailyLossLimit: number;
    winRateAlert: number;
  };

  _preset?: string;
  _lastModified?: string;
}

// ============================================================================
// WARNING TYPES
// ============================================================================

export type WarningLevel = "info" | "warning" | "danger";

export interface Warning {
  level: WarningLevel;
  category: string;
  message: string;
  suggestion: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: Warning[];
}

// ============================================================================
// PRESET TYPES
// ============================================================================

export type PresetName = "conservative" | "balanced" | "aggressive";

export interface PresetInfo {
  id: PresetName;
  name: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  features: string[];
  settings: BinarySettings;
  validation: ValidationResult;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface BinarySettingsResponse {
  settings: BinarySettings;
  validation: ValidationResult;
  isDefault: boolean;
}

export interface PresetsResponse {
  presets: PresetInfo[];
}

export interface UpdateSettingsResponse {
  success: boolean;
  message: string;
  settings: BinarySettings;
  validation: ValidationResult;
}
