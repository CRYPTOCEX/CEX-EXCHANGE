"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  avgHoldTime: string;
  profitFactor: number;
  expectancy: number;
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
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] text-[var(--tp-text-secondary)] bg-[var(--tp-bg-elevated)] border border-[var(--tp-border)] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-10">
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
  // Calculate additional metrics
  const riskRewardRatio = stats.avgWin / stats.avgLoss;
  const breakEvenWinRate = (1 / (1 + riskRewardRatio)) * 100;
  const edge = ((stats.winningTrades / stats.totalTrades) * 100) - breakEvenWinRate;

  // Simulated additional metrics
  const sharpeRatio = 1.85;
  const maxDrawdown = -12.5;
  const calmarRatio = 2.34;
  const sortino = 2.67;

  return (
    <div
      className={cn(
        "bg-[var(--tp-bg-tertiary)] rounded-lg p-4",
        className
      )}
    >
      <h3 className="text-sm font-medium text-[var(--tp-text-primary)] mb-3">
        Performance Metrics
      </h3>

      <div className="space-y-1 divide-y divide-[var(--tp-border)]">
        <MetricItem
          label="Profit Factor"
          value={stats.profitFactor.toFixed(2)}
          tooltip="Gross profit / Gross loss"
          highlight={stats.profitFactor >= 1.5 ? "positive" : stats.profitFactor >= 1 ? "neutral" : "negative"}
        />

        <MetricItem
          label="Expectancy"
          value={`$${stats.expectancy.toFixed(2)}`}
          tooltip="Average expected profit per trade"
          highlight={stats.expectancy > 0 ? "positive" : "negative"}
        />

        <MetricItem
          label="Risk/Reward"
          value={`1:${riskRewardRatio.toFixed(2)}`}
          tooltip="Average win / Average loss"
          highlight={riskRewardRatio >= 1.5 ? "positive" : riskRewardRatio >= 1 ? "neutral" : "negative"}
        />

        <MetricItem
          label="Break-even Win Rate"
          value={`${breakEvenWinRate.toFixed(1)}%`}
          tooltip="Minimum win rate needed to break even"
        />

        <MetricItem
          label="Edge"
          value={`${edge >= 0 ? "+" : ""}${edge.toFixed(1)}%`}
          tooltip="Actual win rate minus break-even"
          highlight={edge > 0 ? "positive" : "negative"}
        />

        <MetricItem
          label="Sharpe Ratio"
          value={sharpeRatio.toFixed(2)}
          tooltip="Risk-adjusted return"
          highlight={sharpeRatio >= 1.5 ? "positive" : sharpeRatio >= 1 ? "neutral" : "negative"}
        />

        <MetricItem
          label="Sortino Ratio"
          value={sortino.toFixed(2)}
          tooltip="Return relative to downside risk"
          highlight={sortino >= 2 ? "positive" : sortino >= 1 ? "neutral" : "negative"}
        />

        <MetricItem
          label="Max Drawdown"
          value={`${maxDrawdown.toFixed(1)}%`}
          tooltip="Largest peak-to-trough decline"
          highlight={maxDrawdown > -10 ? "positive" : maxDrawdown > -20 ? "neutral" : "negative"}
        />

        <MetricItem
          label="Calmar Ratio"
          value={calmarRatio.toFixed(2)}
          tooltip="Annual return / Max drawdown"
          highlight={calmarRatio >= 2 ? "positive" : calmarRatio >= 1 ? "neutral" : "negative"}
        />

        <MetricItem
          label="Avg Hold Time"
          value={stats.avgHoldTime}
          tooltip="Average duration of trades"
        />

        <MetricItem
          label="Total Trades"
          value={stats.totalTrades}
          tooltip="Number of completed trades"
        />
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-[var(--tp-border)]">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              edge > 10
                ? "bg-[var(--tp-green)]"
                : edge > 0
                ? "bg-[var(--tp-yellow)]"
                : "bg-[var(--tp-red)]"
            )}
          />
          <span className="text-xs font-medium text-[var(--tp-text-primary)]">
            {edge > 10
              ? "Strong Edge"
              : edge > 0
              ? "Positive Edge"
              : "No Edge - Review Strategy"}
          </span>
        </div>
        <p className="text-[10px] text-[var(--tp-text-muted)]">
          {edge > 10
            ? "Your strategy shows consistent profitability with a significant edge over break-even requirements."
            : edge > 0
            ? "Your strategy is profitable but could be optimized for better risk-adjusted returns."
            : "Consider reviewing your entry/exit criteria and risk management approach."}
        </p>
      </div>
    </div>
  );
});

export default PerformanceMetrics;
