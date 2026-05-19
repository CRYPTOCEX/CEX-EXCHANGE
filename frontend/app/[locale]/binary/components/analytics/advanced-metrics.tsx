"use client";

/**
 * Advanced Metrics Component
 *
 * Displays risk-adjusted performance metrics like Sharpe ratio, Sortino ratio, etc.
 */

import { memo } from "react";
import {
  Info,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Activity,
  Scale,
  Zap,
} from "lucide-react";
import type { AdvancedMetrics as AdvancedMetricsType } from "./use-trading-analytics";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface AdvancedMetricsProps {
  metrics: AdvancedMetricsType;
  currency?: string;
  theme?: "dark" | "light";
}

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  status: "good" | "neutral" | "bad";
  theme?: "dark" | "light";
}

// ============================================================================
// METRIC CARD
// ============================================================================

const MetricCard = memo(function MetricCard({
  title,
  value,
  description,
  icon,
  status,
  theme = "dark",
}: MetricCardProps) {
  const bgClass = theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-100";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";

  const statusColors = {
    good: "text-green-500",
    neutral: theme === "dark" ? "text-zinc-300" : "text-zinc-700",
    bad: "text-red-500",
  };

  return (
    <div className={`${bgClass} rounded-lg p-4`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`${subtitleClass}`}>{icon}</div>
        <div className="group relative">
          <Info size={14} className={`${subtitleClass} cursor-help`} />
          <div className={`
            absolute right-0 top-6 w-48 p-2 rounded text-xs
            ${theme === "dark" ? "bg-zinc-700" : "bg-white border border-zinc-200"}
            shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible
            transition-all z-10
          `}>
            {description}
          </div>
        </div>
      </div>
      <div className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide mb-1`}>
        {title}
      </div>
      <div className={`text-xl font-bold ${statusColors[status]}`}>
        {value}
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdvancedMetrics = memo(function AdvancedMetrics({
  metrics,
  currency = "USDT",
  theme = "dark",
}: AdvancedMetricsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";

  // Helper functions
  const formatRatio = (value: number): string => {
    if (value === Infinity) return "∞";
    if (value === -Infinity) return "-∞";
    if (isNaN(value)) return "N/A";
    return value.toFixed(2);
  };

  const formatPercent = (value: number): string => {
    if (isNaN(value)) return "N/A";
    return `${value.toFixed(1)}%`;
  };

  const formatCurrencyValue = (value: number): string => {
    if (isNaN(value)) return "N/A";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)} ${currency}`;
  };

  // Determine status for each metric
  const getSharpeStatus = (value: number): "good" | "neutral" | "bad" => {
    if (value >= 1) return "good";
    if (value >= 0) return "neutral";
    return "bad";
  };

  const getSortinoStatus = (value: number): "good" | "neutral" | "bad" => {
    if (value >= 1.5) return "good";
    if (value >= 0) return "neutral";
    return "bad";
  };

  const getDrawdownStatus = (value: number): "good" | "neutral" | "bad" => {
    if (value <= 10) return "good";
    if (value <= 25) return "neutral";
    return "bad";
  };

  const getProfitFactorStatus = (value: number): "good" | "neutral" | "bad" => {
    if (value >= 1.5) return "good";
    if (value >= 1) return "neutral";
    return "bad";
  };

  const getExpectancyStatus = (value: number): "good" | "neutral" | "bad" => {
    if (value > 0) return "good";
    if (value === 0) return "neutral";
    return "bad";
  };

  const getRecoveryStatus = (value: number): "good" | "neutral" | "bad" => {
    if (value >= 2) return "good";
    if (value >= 1) return "neutral";
    return "bad";
  };

  const getRiskRewardStatus = (value: number): "good" | "neutral" | "bad" => {
    if (value >= 1.5) return "good";
    if (value >= 1) return "neutral";
    return "bad";
  };

  return (
    <div className={`${bgClass} border ${borderClass} rounded-lg p-6`}>
      <h3 className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide mb-4`}>
        {t("advanced_risk_metrics")}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Sharpe Ratio */}
        <MetricCard
          title={tCommon("sharpe_ratio")}
          value={formatRatio(metrics.sharpeRatio)}
          description={t("risk_adjusted_return")}
          icon={<Scale size={18} />}
          status={getSharpeStatus(metrics.sharpeRatio)}
          theme={theme}
        />

        {/* Sortino Ratio */}
        <MetricCard
          title={t("sortino_ratio")}
          value={formatRatio(metrics.sortinoRatio)}
          description={t("like_sharpe_but_only_considers_downside")}
          icon={<TrendingUp size={18} />}
          status={getSortinoStatus(metrics.sortinoRatio)}
          theme={theme}
        />

        {/* Max Drawdown */}
        <MetricCard
          title={tCommon("max_drawdown")}
          value={formatPercent(metrics.maxDrawdownPercent)}
          description={t("largest_peak_to_trough_decline")}
          icon={<TrendingDown size={18} />}
          status={getDrawdownStatus(metrics.maxDrawdownPercent)}
          theme={theme}
        />

        {/* Profit Factor */}
        <MetricCard
          title={t("profit_factor")}
          value={formatRatio(metrics.profitFactor)}
          description={t("gross_profit_gross_loss_shows_overall")}
          icon={<Target size={18} />}
          status={getProfitFactorStatus(metrics.profitFactor)}
          theme={theme}
        />

        {/* Expectancy */}
        <MetricCard
          title="Expectancy"
          value={formatCurrencyValue(metrics.expectancy)}
          description={t("average_expected_profit_per_trade_positive")}
          icon={<Zap size={18} />}
          status={getExpectancyStatus(metrics.expectancy)}
          theme={theme}
        />

        {/* Recovery Factor */}
        <MetricCard
          title={t("recovery_factor")}
          value={formatRatio(metrics.recoveryFactor)}
          description={t("net_profit_max_drawdown_measures_how")}
          icon={<Activity size={18} />}
          status={getRecoveryStatus(metrics.recoveryFactor)}
          theme={theme}
        />

        {/* Risk/Reward Ratio */}
        <MetricCard
          title={t("risk_reward")}
          value={formatRatio(metrics.riskRewardRatio)}
          description={t("average_win_average_loss_higher_means")}
          icon={<AlertTriangle size={18} />}
          status={getRiskRewardStatus(metrics.riskRewardRatio)}
          theme={theme}
        />

        {/* Max Drawdown Amount */}
        <MetricCard
          title={t("max_dd_amount")}
          value={`${metrics.maxDrawdown.toFixed(2)} ${currency}`}
          description={t("maximum_drawdown_in_currency_terms_the")}
          icon={<TrendingDown size={18} />}
          status={getDrawdownStatus(metrics.maxDrawdownPercent)}
          theme={theme}
        />
      </div>

      {/* Interpretation guide */}
      <div className={`mt-6 pt-4 border-t ${borderClass}`}>
        <div className={`text-xs ${subtitleClass}`}>
          <span className="font-medium">{t("quick_guide")}</span>{" "}
          <span className="text-green-500">Green</span> = Good performance |{" "}
          <span className={theme === "dark" ? "text-zinc-300" : "text-zinc-700"}>Gray</span> = Neutral |{" "}
          <span className="text-red-500">Red</span> {t("needs_improvement")}
        </div>
      </div>
    </div>
  );
});

export default AdvancedMetrics;
