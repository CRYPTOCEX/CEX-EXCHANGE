"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { useTranslations } from "next-intl";

interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  /** Null when the platform cannot measure a P&L — see AnalyticsPanel. */
  avgWin: number | null;
  avgLoss: number | null;
  avgHoldTime: string;
  profitFactor: number | null;
  expectancy: number | null;
  pnlMeasured?: boolean;
}

interface PerformanceMetricsProps {
  stats: TradeStats;
  className?: string;
}

interface MetricItemProps {
  label: string;
  value: string | number;
  tooltip?: string;
  highlight?: "positive" | "negative" | "neutral";
}

const MetricItem = memo(function MetricItem({
  label,
  value,
  tooltip,
  highlight = "neutral",
}: MetricItemProps) {
  return (
    <div className="flex justify-between items-center py-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[var(--tp-text-muted)]">{label}</span>
        {tooltip && (
          <div className="group relative">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--tp-text-muted)] cursor-help"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] text-[var(--tp-text-secondary)] bg-[var(--tp-bg-secondary)] border border-[var(--tp-border)] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-10">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <span
        className={cn(
          "text-sm font-medium font-mono",
          highlight === "positive" && "text-[var(--tp-green)]",
          highlight === "negative" && "text-[var(--tp-red)]",
          highlight === "neutral" && "text-[var(--tp-text-primary)]"
        )}
      >
        {value}
      </span>
    </div>
  );
});

export const PerformanceMetrics = memo(function PerformanceMetrics({
  stats,
  className,
}: PerformanceMetricsProps) {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  // Calculate additional metrics
  /*
    `avgWin / avgLoss` on two zeros is NaN, and that NaN reached the screen:
    Risk/Reward rendered "1:NaN", break-even win rate "NaN%" and Edge "NaN%",
    the last of them under a red "negative edge" verdict. It happened on every
    account, because no order source carries a P&L and both inputs were `|| 0`.

    They are null now when unmeasured, and every figure below them is null too.
    A dash says "we do not know"; NaN says nothing at all.
  */
  const measurable =
    stats.avgWin !== null && stats.avgLoss !== null && (stats.avgLoss as number) !== 0;
  const riskRewardRatio = measurable
    ? (stats.avgWin as number) / (stats.avgLoss as number)
    : null;
  const breakEvenWinRate =
    riskRewardRatio !== null ? (1 / (1 + riskRewardRatio)) * 100 : null;
  const edge =
    breakEvenWinRate !== null && stats.totalTrades > 0
      ? (stats.winningTrades / stats.totalTrades) * 100 - breakEvenWinRate
      : null;

  /*
    ─────────────────────────────────────────────────────────────────────────
    SHARPE, SORTINO, MAX DRAWDOWN AND CALMAR ARE NOT COMPUTED, SO THEY ARE NOT
    SHOWN.

    These four were `1.85`, `2.67`, `-12.5` and `2.34` — literals, marked
    "// Simulated additional metrics", rendered with success/warning colour
    coding beside genuinely derived figures and IDENTICAL for every user on the
    platform. A trader reading "Sharpe 1.85" on their own analytics panel is
    reading a decoration, and there is no way to tell it from the real metrics
    it sits between.

    They cannot be computed from what this component receives: a Sharpe or
    Sortino ratio needs a RETURN SERIES, and `stats` carries aggregates
    (totalTrades, avgWin, avgLoss, winRate). Max drawdown needs the equity
    curve. Producing them means an endpoint that walks the trade history —
    `api/exchange/trading/analytics` is where it would go — and that is a
    feature, not a formatting change.

    Until then the honest rendering is no rendering. `MetricItem` is not called
    for them below, so the panel shows what it knows and says nothing about
    what it does not.
    ─────────────────────────────────────────────────────────────────────────
  */

  return (
    <div
      className={cn(
        "bg-[var(--tp-bg-tertiary)] rounded-lg p-4",
        className
      )}
    >
      <h3 className="text-sm font-medium text-[var(--tp-text-primary)] mb-3">
        {tCommon("performance_metrics")}
      </h3>

      <div className="space-y-1 divide-y divide-[var(--tp-border)]">
        <MetricItem
          label={tCommon("profit_factor")}
          value={stats.profitFactor === null ? "—" : stats.profitFactor.toFixed(2)}
          tooltip={tCommon("gross_profit_gross_loss")}
          highlight={
            stats.profitFactor === null
              ? undefined
              : stats.profitFactor >= 1.5
                ? "positive"
                : stats.profitFactor >= 1
                  ? "neutral"
                  : "negative"
          }
        />

        <MetricItem
          label="Expectancy"
          value={stats.expectancy === null ? "—" : `$${stats.expectancy.toFixed(2)}`}
          tooltip={t("average_expected_profit_per_trade")}
          highlight={
            stats.expectancy === null ? undefined : stats.expectancy > 0 ? "positive" : "negative"
          }
        />

        <MetricItem
          label={tCommon("risk_reward")}
          value={riskRewardRatio === null ? "—" : `1:${riskRewardRatio.toFixed(2)}`}
          tooltip={t("average_win_average_loss")}
          highlight={
            riskRewardRatio === null
              ? undefined
              : riskRewardRatio >= 1.5
                ? "positive"
                : riskRewardRatio >= 1
                  ? "neutral"
                  : "negative"
          }
        />

        <MetricItem
          label={t("break_even_win_rate")}
          value={breakEvenWinRate === null ? "—" : `${breakEvenWinRate.toFixed(1)}%`}
          tooltip={t("minimum_win_rate_needed_to_break_even")}
        />

        <MetricItem
          label="Edge"
          value={edge === null ? "—" : `${edge >= 0 ? "+" : ""}${edge.toFixed(1)}%`}
          tooltip={t("actual_win_rate_minus_break_even")}
          highlight={edge === null ? undefined : edge > 0 ? "positive" : "negative"}
        />





        <MetricItem
          label={t("avg_hold_time")}
          value={stats.avgHoldTime}
          tooltip={t("average_duration_of_trades")}
        />

        <MetricItem
          label={tCommon("total_trades")}
          value={stats.totalTrades}
          tooltip={t("number_of_completed_trades")}
        />
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-[var(--tp-border)]">
        {/* NO VERDICT WITHOUT AN EDGE. This strip rendered "no edge — review
            strategy" in red on every account, because `edge` was NaN and every
            comparison against it is false. A judgement about someone's trading
            is the last thing that should be produced from a figure the platform
            cannot measure. */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              edge === null
                ? "bg-[var(--tp-text-muted)]"
                : edge > 10
                ? "bg-[var(--tp-green)]"
                : edge > 0
                ? "bg-[var(--tp-yellow)]"
                : "bg-[var(--tp-red)]"
            )}
          />
          <span className="text-xs font-medium text-[var(--tp-text-primary)]">
            {edge === null
              ? tCommon("no_data_available") || "—"
              : edge > 10
              ? t("strong_edge")
              : edge > 0
              ? t("positive_edge")
              : t("no_edge_review_strategy")}
          </span>
        </div>
        <p className="text-[10px] text-[var(--tp-text-muted)]">
          {edge === null
            ? ""
            : edge > 10
            ? t("your_strategy_shows_consistent_profitability_with")
            : edge > 0
            ? t("your_strategy_is_profitable_but_could")
            : t("consider_reviewing_your_entry_exit_criteria")}
        </p>
      </div>
    </div>
  );
});

export default PerformanceMetrics;
