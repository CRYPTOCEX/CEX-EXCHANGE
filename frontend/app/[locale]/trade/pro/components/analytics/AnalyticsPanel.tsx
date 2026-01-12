"use client";

import React, { memo, useState, useMemo } from "react";
import { cn } from "../../utils/cn";
import { PnLChart } from "./PnLChart";
import { WinRateCard } from "./WinRateCard";
import { PerformanceMetrics } from "./PerformanceMetrics";
import { TradeDistribution } from "./TradeDistribution";
import { VolumeStats } from "./VolumeStats";

interface AnalyticsPanelProps {
  className?: string;
}

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

// Mock analytics data
const generateMockData = (range: TimeRange) => {
  const now = Date.now();
  const points: { timestamp: number; pnl: number; cumulative: number }[] = [];

  const rangeMs: Record<TimeRange, number> = {
    "1D": 24 * 60 * 60 * 1000,
    "1W": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
    "3M": 90 * 24 * 60 * 60 * 1000,
    "1Y": 365 * 24 * 60 * 60 * 1000,
    "ALL": 730 * 24 * 60 * 60 * 1000,
  };

  const intervals: Record<TimeRange, number> = {
    "1D": 24,
    "1W": 7 * 4,
    "1M": 30,
    "3M": 90,
    "1Y": 52,
    "ALL": 104,
  };

  const ms = rangeMs[range];
  const count = intervals[range];
  const step = ms / count;

  let cumulative = 0;
  for (let i = 0; i < count; i++) {
    const pnl = (Math.random() - 0.45) * 500; // Slight positive bias
    cumulative += pnl;
    points.push({
      timestamp: now - ms + i * step,
      pnl,
      cumulative,
    });
  }

  return points;
};

const generateTradeStats = () => ({
  totalTrades: 247,
  winningTrades: 156,
  losingTrades: 91,
  avgWin: 234.56,
  avgLoss: 123.45,
  largestWin: 1250.00,
  largestLoss: 567.89,
  avgHoldTime: "4h 23m",
  profitFactor: 2.34,
  expectancy: 89.45,
});

const generateVolumeByPair = () => [
  { pair: "BTC/USDT", volume: 125000, trades: 89, pnl: 2340 },
  { pair: "ETH/USDT", volume: 89000, trades: 67, pnl: 1230 },
  { pair: "SOL/USDT", volume: 45000, trades: 45, pnl: -340 },
  { pair: "DOGE/USDT", volume: 23000, trades: 28, pnl: 890 },
  { pair: "XRP/USDT", volume: 18000, trades: 18, pnl: 120 },
];

const generateTradesByHour = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    trades: Math.floor(Math.random() * 20) + 2,
    pnl: (Math.random() - 0.45) * 200,
  }));
};

export const AnalyticsPanel = memo(function AnalyticsPanel({
  className,
}: AnalyticsPanelProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");

  const pnlData = useMemo(() => generateMockData(timeRange), [timeRange]);
  const tradeStats = useMemo(() => generateTradeStats(), []);
  const volumeByPair = useMemo(() => generateVolumeByPair(), []);
  const tradesByHour = useMemo(() => generateTradesByHour(), []);

  const totalPnL = pnlData[pnlData.length - 1]?.cumulative ?? 0;
  const todayPnL = pnlData.slice(-1)[0]?.pnl ?? 0;

  return (
    <div className={cn("tp-analytics-panel flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--tp-border)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--tp-text-primary)]">
            Trading Analytics
          </h2>
          <p className="text-xs text-[var(--tp-text-muted)] mt-0.5">
            Performance overview and statistics
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 bg-[var(--tp-bg-tertiary)] rounded-lg p-1">
          {(["1D", "1W", "1M", "3M", "1Y", "ALL"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded transition-colors",
                timeRange === range
                  ? "bg-[var(--tp-bg-elevated)] text-[var(--tp-text-primary)]"
                  : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-[var(--tp-border)]">
        <SummaryCard
          label="Total P&L"
          value={totalPnL}
          format="currency"
        />
        <SummaryCard
          label="Today's P&L"
          value={todayPnL}
          format="currency"
        />
        <SummaryCard
          label="Win Rate"
          value={(tradeStats.winningTrades / tradeStats.totalTrades) * 100}
          format="percent"
        />
        <SummaryCard
          label="Profit Factor"
          value={tradeStats.profitFactor}
          format="number"
        />
      </div>

      {/* Charts Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* P&L Chart - Full width */}
          <div className="col-span-2">
            <PnLChart data={pnlData} timeRange={timeRange} />
          </div>

          {/* Win Rate */}
          <WinRateCard stats={tradeStats} />

          {/* Performance Metrics */}
          <PerformanceMetrics stats={tradeStats} />

          {/* Trade Distribution by Pair */}
          <TradeDistribution data={volumeByPair} />

          {/* Volume Stats */}
          <VolumeStats hourlyData={tradesByHour} />
        </div>
      </div>
    </div>
  );
});

// Summary Card Component
interface SummaryCardProps {
  label: string;
  value: number;
  format: "currency" | "percent" | "number";
}

const SummaryCard = memo(function SummaryCard({
  label,
  value,
  format,
}: SummaryCardProps) {
  const formatValue = () => {
    switch (format) {
      case "currency":
        return `${value >= 0 ? "+" : ""}$${Math.abs(value).toFixed(2)}`;
      case "percent":
        return `${value.toFixed(1)}%`;
      case "number":
        return value.toFixed(2);
    }
  };

  const isPositive = value >= 0;

  return (
    <div className="bg-[var(--tp-bg-tertiary)] rounded-lg p-3">
      <div className="text-xs text-[var(--tp-text-muted)] mb-1">{label}</div>
      <div
        className={cn(
          "text-lg font-semibold font-mono",
          format === "currency" || format === "percent"
            ? isPositive
              ? "text-[var(--tp-green)]"
              : "text-[var(--tp-red)]"
            : "text-[var(--tp-text-primary)]"
        )}
      >
        {formatValue()}
      </div>
    </div>
  );
});

export default AnalyticsPanel;
