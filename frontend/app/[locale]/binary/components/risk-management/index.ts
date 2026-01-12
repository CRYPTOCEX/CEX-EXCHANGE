/**
 * Risk Management Components
 *
 * Advanced order types and risk management features for binary trading.
 */

// Main panel
export { RiskManagementPanel } from "./risk-management-panel";

// Individual components
export { LimitOrderForm } from "./limit-order-form";
export { PendingLimitsPanel } from "./pending-limits-panel";
export { DailyLimitSettingsComponent } from "./daily-limit-settings";
export { PositionSizingCalculator } from "./position-sizing-calculator";
export { TradeCooldown } from "./trade-cooldown";
export { StopTakeProfitSettings } from "./stop-take-profit-settings";

// Hook
export {
  useRiskManagement,
  type UseRiskManagementOptions,
  type UseRiskManagementReturn,
} from "./use-risk-management";

// Types
export type {
  LimitOrder,
  LimitOrderFormData,
  StopLossSettings,
  TakeProfitSettings,
  OCOSettings,
  OCOOrder,
  DailyLimitSettings,
  PositionSizingSettings,
  PositionSizingMethod,
  PositionSizeResult,
  CooldownSettings,
  RiskManagementState,
} from "./risk-management-types";

// Default values
export {
  DEFAULT_STOP_LOSS_SETTINGS,
  DEFAULT_TAKE_PROFIT_SETTINGS,
  DEFAULT_OCO_SETTINGS,
  DEFAULT_DAILY_LIMIT_SETTINGS,
  DEFAULT_POSITION_SIZING_SETTINGS,
  DEFAULT_COOLDOWN_SETTINGS,
  DEFAULT_RISK_MANAGEMENT_STATE,
} from "./risk-management-types";
