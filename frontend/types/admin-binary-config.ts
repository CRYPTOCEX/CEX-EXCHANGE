/**
 * Admin Binary Trading Configuration Types
 *
 * Types and utilities for admin controls over binary trading system
 */

import type { BinaryOrderType } from "./binary-trading";

// ============================================================================
// ORDER TYPE CONFIGURATION
// ============================================================================

/**
 * Admin-configurable settings for each order type
 */
export interface OrderTypeAdminConfig {
  /** Order type identifier */
  type: BinaryOrderType;

  /** Whether this order type is enabled for users */
  enabled: boolean;

  /** Minimum trade amount (in base currency) */
  minAmount: number;

  /** Maximum trade amount (in base currency) */
  maxAmount: number;

  /** Default payout percentage */
  defaultPayoutPercentage: number;

  /** Minimum payout percentage */
  minPayoutPercentage: number;

  /** Maximum payout percentage */
  maxPayoutPercentage: number;

  /** Minimum duration in minutes */
  minDuration: number;

  /** Maximum duration in minutes */
  maxDuration: number;

  /** Maximum concurrent orders per user */
  maxConcurrentOrders: number;

  /** Maximum total exposure per user */
  maxExposurePerUser: number;

  /** Type-specific settings */
  typeSettings?: OrderTypeSpecificSettings;
}

/**
 * Type-specific admin settings
 */
export interface OrderTypeSpecificSettings {
  /** For HIGHER_LOWER, TOUCH_NO_TOUCH, TURBO */
  barrier?: {
    minDistancePercent: number; // e.g., 0.1
    maxDistancePercent: number; // e.g., 10
    suggestedDistances: number[]; // e.g., [0.5, 1, 1.5, 2, 3]
  };

  /** For CALL_PUT */
  strike?: {
    minDistancePercent: number;
    maxDistancePercent: number;
    suggestedDistances: number[];
  };

  /** For TURBO */
  payoutPerPoint?: {
    min: number;
    max: number;
    default: number;
    suggestedValues: number[];
  };
}

// ============================================================================
// PAYOUT CONFIGURATION
// ============================================================================

/**
 * Payout configuration per duration
 */
export interface PayoutConfig {
  /** Duration in minutes */
  durationMinutes: number;

  /** Order type */
  orderType: BinaryOrderType;

  /** Base payout percentage */
  basePayoutPercentage: number;

  /** Payout adjustments based on conditions */
  adjustments?: PayoutAdjustment[];
}

/**
 * Conditional payout adjustment
 */
export interface PayoutAdjustment {
  /** Condition type */
  condition: "BARRIER_DISTANCE" | "MARKET_VOLATILITY" | "TIME_OF_DAY";

  /** Condition value (e.g., barrier distance percentage) */
  value: number | { min: number; max: number };

  /** Adjustment to payout (e.g., +5 for 5% increase) */
  adjustment: number;

  /** Description for admin */
  description: string;
}

// ============================================================================
// RISK MANAGEMENT
// ============================================================================

/**
 * Risk management configuration
 */
export interface RiskManagementConfig {
  /** Global settings */
  global: {
    /** Maximum total exposure across all users */
    maxTotalExposure: number;

    /** Maximum exposure per symbol */
    maxExposurePerSymbol: number;

    /** Auto-pause trading if loss exceeds threshold */
    autoPauseLossThreshold: number;

    /** Alert threshold for high-risk patterns */
    alertThreshold: number;
  };

  /** Per-user limits */
  perUser: {
    /** Maximum orders per minute */
    maxOrdersPerMinute: number;

    /** Maximum orders per hour */
    maxOrdersPerHour: number;

    /** Maximum loss per day (auto-disable) */
    maxLossPerDay: number;

    /** Cooling period after max loss (minutes) */
    coolingPeriodMinutes: number;
  };

  /** Per-order-type limits */
  perOrderType: {
    [K in BinaryOrderType]?: {
      maxExposure: number;
      maxConcurrentOrders: number;
      dailyLimit: number;
    };
  };
}

/**
 * Risk alert
 */
export interface RiskAlert {
  id: string;
  type: "HIGH_EXPOSURE" | "RAPID_LOSSES" | "UNUSUAL_PATTERN" | "SYSTEM_LOAD";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  details: Record<string, any>;
  timestamp: string;
  resolved: boolean;
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Performance metrics per order type
 */
export interface OrderTypeMetrics {
  orderType: BinaryOrderType;

  /** Total number of orders */
  totalOrders: number;

  /** Number of winning orders */
  winningOrders: number;

  /** Number of losing orders */
  losingOrders: number;

  /** Win rate percentage */
  winRate: number;

  /** Total volume traded */
  totalVolume: number;

  /** Total profit/loss */
  totalProfitLoss: number;

  /** Average trade size */
  averageTradeSize: number;

  /** Average duration (minutes) */
  averageDuration: number;

  /** Most popular duration */
  popularDuration: number;

  /** User adoption rate */
  adoptionRate: number;
}

/**
 * Daily summary report
 */
export interface DailySummaryReport {
  date: string;

  /** Overall metrics */
  overall: {
    totalOrders: number;
    totalVolume: number;
    totalProfitLoss: number;
    uniqueUsers: number;
  };

  /** Per order type breakdown */
  byOrderType: OrderTypeMetrics[];

  /** Top symbols */
  topSymbols: Array<{
    symbol: string;
    orders: number;
    volume: number;
    profitLoss: number;
  }>;

  /** Risk metrics */
  riskMetrics: {
    currentExposure: number;
    peakExposure: number;
    alertsTriggered: number;
    pausedUsers: number;
  };
}

// ============================================================================
// ADMIN ACTIONS
// ============================================================================

/**
 * Admin action log entry
 */
export interface AdminActionLog {
  id: string;
  adminId: string;
  adminName: string;
  action: AdminActionType;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
}

/**
 * Types of admin actions
 */
export type AdminActionType =
  | "ENABLE_ORDER_TYPE"
  | "DISABLE_ORDER_TYPE"
  | "UPDATE_PAYOUT"
  | "UPDATE_LIMITS"
  | "UPDATE_RISK_SETTINGS"
  | "PAUSE_TRADING"
  | "RESUME_TRADING"
  | "MANUAL_SETTLEMENT"
  | "CANCEL_ORDER"
  | "REFUND_ORDER";

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate order type config
 */
export function validateOrderTypeConfig(
  config: OrderTypeAdminConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.minAmount <= 0) {
    errors.push("Minimum amount must be greater than 0");
  }

  if (config.maxAmount <= config.minAmount) {
    errors.push("Maximum amount must be greater than minimum amount");
  }

  if (
    config.minPayoutPercentage < 0 ||
    config.minPayoutPercentage > 100
  ) {
    errors.push("Minimum payout percentage must be between 0 and 100");
  }

  if (
    config.maxPayoutPercentage < config.minPayoutPercentage ||
    config.maxPayoutPercentage > 100
  ) {
    errors.push("Maximum payout percentage must be between minimum and 100");
  }

  if (
    config.defaultPayoutPercentage < config.minPayoutPercentage ||
    config.defaultPayoutPercentage > config.maxPayoutPercentage
  ) {
    errors.push("Default payout must be between min and max payout");
  }

  if (config.minDuration <= 0) {
    errors.push("Minimum duration must be greater than 0");
  }

  if (config.maxDuration <= config.minDuration) {
    errors.push("Maximum duration must be greater than minimum duration");
  }

  if (config.maxConcurrentOrders <= 0) {
    errors.push("Maximum concurrent orders must be greater than 0");
  }

  if (config.maxExposurePerUser <= 0) {
    errors.push("Maximum exposure must be greater than 0");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate payout config
 */
export function validatePayoutConfig(
  config: PayoutConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.durationMinutes <= 0) {
    errors.push("Duration must be greater than 0");
  }

  if (config.basePayoutPercentage < 0 || config.basePayoutPercentage > 100) {
    errors.push("Base payout percentage must be between 0 and 100");
  }

  if (config.adjustments) {
    for (const adj of config.adjustments) {
      if (Math.abs(adj.adjustment) > 50) {
        errors.push(
          `Adjustment ${adj.description} is too large (max ±50%)`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate risk config
 */
export function validateRiskConfig(
  config: RiskManagementConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.global.maxTotalExposure <= 0) {
    errors.push("Maximum total exposure must be greater than 0");
  }

  if (config.global.maxExposurePerSymbol > config.global.maxTotalExposure) {
    errors.push("Per-symbol exposure cannot exceed total exposure");
  }

  if (config.perUser.maxOrdersPerMinute <= 0) {
    errors.push("Orders per minute limit must be greater than 0");
  }

  if (config.perUser.maxOrdersPerHour < config.perUser.maxOrdersPerMinute) {
    errors.push("Hourly limit must be >= per-minute limit");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default order type configuration
 */
export const DEFAULT_ORDER_TYPE_CONFIGS: Record<
  BinaryOrderType,
  OrderTypeAdminConfig
> = {
  RISE_FALL: {
    type: "RISE_FALL",
    enabled: true,
    minAmount: 10,
    maxAmount: 10000,
    defaultPayoutPercentage: 80,
    minPayoutPercentage: 70,
    maxPayoutPercentage: 95,
    minDuration: 1,
    maxDuration: 1440,
    maxConcurrentOrders: 10,
    maxExposurePerUser: 50000,
  },
  HIGHER_LOWER: {
    type: "HIGHER_LOWER",
    enabled: true,
    minAmount: 10,
    maxAmount: 10000,
    defaultPayoutPercentage: 85,
    minPayoutPercentage: 75,
    maxPayoutPercentage: 98,
    minDuration: 1,
    maxDuration: 1440,
    maxConcurrentOrders: 10,
    maxExposurePerUser: 50000,
    typeSettings: {
      barrier: {
        minDistancePercent: 0.1,
        maxDistancePercent: 10,
        suggestedDistances: [0.5, 1, 1.5, 2, 3],
      },
    },
  },
  TOUCH_NO_TOUCH: {
    type: "TOUCH_NO_TOUCH",
    enabled: true,
    minAmount: 10,
    maxAmount: 10000,
    defaultPayoutPercentage: 90,
    minPayoutPercentage: 80,
    maxPayoutPercentage: 100,
    minDuration: 5,
    maxDuration: 1440,
    maxConcurrentOrders: 5,
    maxExposurePerUser: 30000,
    typeSettings: {
      barrier: {
        minDistancePercent: 0.5,
        maxDistancePercent: 5,
        suggestedDistances: [0.5, 1, 1.5, 2],
      },
    },
  },
  CALL_PUT: {
    type: "CALL_PUT",
    enabled: true,
    minAmount: 10,
    maxAmount: 10000,
    defaultPayoutPercentage: 85,
    minPayoutPercentage: 75,
    maxPayoutPercentage: 95,
    minDuration: 15,
    maxDuration: 10080,
    maxConcurrentOrders: 10,
    maxExposurePerUser: 50000,
    typeSettings: {
      strike: {
        minDistancePercent: 0,
        maxDistancePercent: 10,
        suggestedDistances: [0.5, 1, 1.5, 2, 3],
      },
    },
  },
  TURBO: {
    type: "TURBO",
    enabled: true,
    minAmount: 10,
    maxAmount: 5000,
    defaultPayoutPercentage: 0, // Turbo uses payout per point
    minPayoutPercentage: 0,
    maxPayoutPercentage: 0,
    minDuration: 1,
    maxDuration: 5,
    maxConcurrentOrders: 5,
    maxExposurePerUser: 20000,
    typeSettings: {
      barrier: {
        minDistancePercent: 0.05,
        maxDistancePercent: 1,
        suggestedDistances: [0.1, 0.2, 0.3, 0.5],
      },
      payoutPerPoint: {
        min: 0.01,
        max: 100,
        default: 1.0,
        suggestedValues: [0.1, 0.5, 1.0, 5.0, 10.0],
      },
    },
  },
};

/**
 * Default risk management configuration
 */
export const DEFAULT_RISK_CONFIG: RiskManagementConfig = {
  global: {
    maxTotalExposure: 1000000,
    maxExposurePerSymbol: 100000,
    autoPauseLossThreshold: 50000,
    alertThreshold: 30000,
  },
  perUser: {
    maxOrdersPerMinute: 10,
    maxOrdersPerHour: 100,
    maxLossPerDay: 5000,
    coolingPeriodMinutes: 60,
  },
  perOrderType: {
    RISE_FALL: {
      maxExposure: 50000,
      maxConcurrentOrders: 10,
      dailyLimit: 100,
    },
    HIGHER_LOWER: {
      maxExposure: 50000,
      maxConcurrentOrders: 10,
      dailyLimit: 100,
    },
    TOUCH_NO_TOUCH: {
      maxExposure: 30000,
      maxConcurrentOrders: 5,
      dailyLimit: 50,
    },
    CALL_PUT: {
      maxExposure: 50000,
      maxConcurrentOrders: 10,
      dailyLimit: 100,
    },
    TURBO: {
      maxExposure: 20000,
      maxConcurrentOrders: 5,
      dailyLimit: 50,
    },
  },
};
