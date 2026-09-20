"use client";

/**
 * Advanced Metrics Component
 *
 * Displays risk-adjusted performance metrics like Sharpe ratio, Sortino ratio, etc.
 */

import { memo } from "react";
import {
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
import { StatsCard } from "@/components/ui/card/stats-card";
import { MoneyFigure } from "@/components/ui/money-figure";
import {
  Panel,
  PanelTitle,
  statusTone,
  toneText,
  toneTint,
  type MetricStatus,
} from "./analytics-ui";

// ============================================================================
// TYPES
// ============================================================================

interface AdvancedMetricsProps {
  metrics: AdvancedMetricsType;
  currency?: string;
  /** @deprecated Tokens are theme-aware; kept so existing call sites compile. */
  theme?: "dark" | "light";
}

// ============================================================================
// STATUS -> ICON TILE
// ============================================================================

// The figure is neutral ink on the shared card, so the good/neutral/bad hue
// moves onto the icon tile. Same three-tone vocabulary the quick guide at the
// bottom of this panel describes, so the legend still reads true.
const statusTile = (status: MetricStatus) => ({
  color: toneText[statusTone[status]],
  bgColor: toneTint[statusTone[status]],
});

// WHY THE CAPTION IS PASSED AS `changeLabel` AND NOT AS `description`
//
// Every one of these eight captions ends in the threshold that makes the figure
// readable — "Good: >= 1", "Good: <= 10%", "Good: >= 1.5". They run 66-95
// characters. StatsCard renders `description` inside a `truncate` span, and at
// this grid's `md:grid-cols-4` a card is ~138px of inner width at 11px type,
// so roughly 26 characters survive: the guidance is exactly the half that gets
// clipped. `changeLabel` is the same row, the same 11px subtle ink, and is NOT
// truncated, so the caption wraps and stays whole. It replaces the old
// hover-only Info popover, which held the same string in full.

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdvancedMetrics = memo(function AdvancedMetrics({
  metrics,
  currency = "USDT",
}: AdvancedMetricsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");

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
  const getSharpeStatus = (value: number): MetricStatus => {
    if (value >= 1) return "good";
    if (value >= 0) return "neutral";
    return "bad";
  };

  const getSortinoStatus = (value: number): MetricStatus => {
    if (value >= 1.5) return "good";
    if (value >= 0) return "neutral";
    return "bad";
  };

  const getDrawdownStatus = (value: number): MetricStatus => {
    if (value <= 10) return "good";
    if (value <= 25) return "neutral";
    return "bad";
  };

  const getProfitFactorStatus = (value: number): MetricStatus => {
    if (value >= 1.5) return "good";
    if (value >= 1) return "neutral";
    return "bad";
  };

  const getExpectancyStatus = (value: number): MetricStatus => {
    if (value > 0) return "good";
    if (value === 0) return "neutral";
    return "bad";
  };

  const getRecoveryStatus = (value: number): MetricStatus => {
    if (value >= 2) return "good";
    if (value >= 1) return "neutral";
    return "bad";
  };

  const getRiskRewardStatus = (value: number): MetricStatus => {
    if (value >= 1.5) return "good";
    if (value >= 1) return "neutral";
    return "bad";
  };

  return (
    <Panel className="p-6">
      <PanelTitle className="mb-4">{t("advanced_risk_metrics")}</PanelTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Sharpe Ratio */}
        <StatsCard
          label={tCommon("sharpe_ratio")}
          value={formatRatio(metrics.sharpeRatio)}
          changeLabel={t("risk_adjusted_return")}
          icon={Scale}
          index={0}
          {...statusTile(getSharpeStatus(metrics.sharpeRatio))}
        />

        {/* Sortino Ratio */}
        <StatsCard
          label={tCommon("sortino_ratio")}
          value={formatRatio(metrics.sortinoRatio)}
          changeLabel={t("like_sharpe_but_only_considers_downside")}
          icon={TrendingUp}
          index={1}
          {...statusTile(getSortinoStatus(metrics.sortinoRatio))}
        />

        {/* Max Drawdown */}
        <StatsCard
          label={tCommon("max_drawdown")}
          value={formatPercent(metrics.maxDrawdownPercent)}
          changeLabel="Largest peak-to-trough decline. Measures worst-case loss. Lower is better. Good: ≤10%"
          icon={TrendingDown}
          index={2}
          {...statusTile(getDrawdownStatus(metrics.maxDrawdownPercent))}
        />

        {/* Profit Factor */}
        <StatsCard
          label={tCommon("profit_factor")}
          value={formatRatio(metrics.profitFactor)}
          changeLabel={t("gross_profit_gross_loss_shows_overall")}
          icon={Target}
          index={3}
          {...statusTile(getProfitFactorStatus(metrics.profitFactor))}
        />

        {/* Expectancy */}
        <StatsCard
          label="Expectancy"
          // `formatCurrencyValue` returns the WORD "N/A" when there is no
          // expectancy yet, and MoneyFigure monospaces whatever it is handed.
          // That is the half of the rule `isFigureValue` exists to enforce:
          // prose set in a 24px monospace face reads as a bug. Mono only once a
          // figure has actually been computed — same guard the max-drawdown
          // "N/A" gets on the copy-trading leader page.
          value={
            isNaN(metrics.expectancy) ? (
              formatCurrencyValue(metrics.expectancy)
            ) : (
              <MoneyFigure value={formatCurrencyValue(metrics.expectancy)} />
            )
          }
          changeLabel={t("average_expected_profit_per_trade_positive")}
          icon={Zap}
          index={4}
          {...statusTile(getExpectancyStatus(metrics.expectancy))}
        />

        {/* Recovery Factor */}
        <StatsCard
          label={t("recovery_factor")}
          value={formatRatio(metrics.recoveryFactor)}
          changeLabel={t("net_profit_max_drawdown_measures_how")}
          icon={Activity}
          index={5}
          {...statusTile(getRecoveryStatus(metrics.recoveryFactor))}
        />

        {/* Risk/Reward Ratio */}
        <StatsCard
          label={tCommon("risk_reward")}
          value={formatRatio(metrics.riskRewardRatio)}
          changeLabel={t("average_win_average_loss_higher_means")}
          icon={AlertTriangle}
          index={6}
          {...statusTile(getRiskRewardStatus(metrics.riskRewardRatio))}
        />

        {/* Max Drawdown Amount */}
        <StatsCard
          label={t("max_dd_amount")}
          value={<MoneyFigure value={`${metrics.maxDrawdown.toFixed(2)} ${currency}`} />}
          changeLabel={t("maximum_drawdown_in_currency_terms_the")}
          icon={TrendingDown}
          index={7}
          {...statusTile(getDrawdownStatus(metrics.maxDrawdownPercent))}
        />
      </div>

      {/* Interpretation guide */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">{t("quick_guide")}:</span>{" "}
          <span className={toneText.up}>Green</span> = Good performance |{" "}
          <span className={toneText.neutral}>Gray</span> = Neutral |{" "}
          <span className={toneText.down}>Red</span> {t("needs_improvement")}
        </div>
      </div>
    </Panel>
  );
});

export default AdvancedMetrics;
