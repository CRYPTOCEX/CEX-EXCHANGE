/**
 * Binary Trading Analytics Components
 *
 * Phase 4: Analytics & Statistics Dashboard
 */

// Main dashboard component
export { AnalyticsDashboard, default } from "./analytics-dashboard";

// Sub-components
export { SummaryCards } from "./summary-cards";
export { WinRateGauge } from "./win-rate-gauge";
export { StreakIndicator } from "./streak-indicator";
export { RecentTradesTable } from "./recent-trades-table";
export { EquityCurve } from "./equity-curve";
export { SymbolStatistics } from "./symbol-stats";
export { AdvancedMetrics } from "./advanced-metrics";
export { ExportTrades } from "./export-trades";
export { TradeJournal } from "./trade-journal";

// Hook
export { useTradingAnalytics, type AdvancedMetrics as AdvancedMetricsType, type TradingAnalytics } from "./use-trading-analytics";

// Utility functions
export {
  calculateTradingStats,
  calculateStatsBySymbol,
  calculateStatsByHour,
  calculateStatsByDay,
  calculateStreaks,
  calculateEquityCurve,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateRecoveryFactor,
  formatDuration,
  formatPercent,
  formatCurrency,
  getPerformanceColor,
  getWinRateColor,
  type EquityPoint,
} from "./trading-analytics";
