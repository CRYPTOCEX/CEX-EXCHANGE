"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import {
  TrendingUp,
  BarChart2,
  Activity,
  Settings,
  Maximize2,
  Camera,
} from "lucide-react";
import { TIMEFRAMES } from "../../utils/constants";

interface ChartToolbarProps {
  timeframe: string;
  chartType: "candles" | "line" | "area";
  onTimeframeChange: (tf: string) => void;
  onChartTypeChange: (type: "candles" | "line" | "area") => void;
  chartProvider: "tradingview" | "chart_engine";
}

export const ChartToolbar = memo(function ChartToolbar({
  timeframe,
  chartType,
  onTimeframeChange,
  onChartTypeChange,
  chartProvider,
}: ChartToolbarProps) {
  const chartTypes = [
    { id: "candles" as const, icon: BarChart2, label: "Candlestick" },
    { id: "line" as const, icon: TrendingUp, label: "Line" },
    { id: "area" as const, icon: Activity, label: "Area" },
  ];

  return (
    <div
      className={cn(
        "h-10 min-h-[40px]",
        "px-2",
        "flex items-center justify-between gap-2",
        "bg-[var(--tp-bg-secondary)]",
        "border-b border-[var(--tp-border)]"
      )}
    >
      {/* Left: Timeframes */}
      <div className="flex items-center gap-0.5">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onTimeframeChange(tf.value)}
            className={cn(
              "px-2 py-1",
              "text-xs font-medium",
              "rounded",
              "transition-colors",
              timeframe === tf.value
                ? "bg-[var(--tp-bg-elevated)] text-[var(--tp-text-primary)]"
                : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-tertiary)]"
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Center: Chart Type */}
      <div className="flex items-center gap-1">
        {chartTypes.map((ct) => {
          const Icon = ct.icon;
          return (
            <button
              key={ct.id}
              onClick={() => onChartTypeChange(ct.id)}
              className={cn(
                "p-1.5 rounded",
                "transition-colors",
                chartType === ct.id
                  ? "bg-[var(--tp-bg-elevated)] text-[var(--tp-text-primary)]"
                  : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-tertiary)]"
              )}
              title={ct.label}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Indicators */}
        <button
          className={cn(
            "px-2 py-1",
            "text-xs",
            "rounded",
            "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
            "hover:bg-[var(--tp-bg-tertiary)]",
            "transition-colors"
          )}
        >
          Indicators
        </button>

        {/* Screenshot */}
        <button
          className={cn(
            "p-1.5 rounded",
            "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
            "hover:bg-[var(--tp-bg-tertiary)]",
            "transition-colors"
          )}
          title="Screenshot"
        >
          <Camera size={14} />
        </button>

        {/* Chart Settings */}
        <button
          className={cn(
            "p-1.5 rounded",
            "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
            "hover:bg-[var(--tp-bg-tertiary)]",
            "transition-colors"
          )}
          title="Chart Settings"
        >
          <Settings size={14} />
        </button>

        {/* Fullscreen */}
        <button
          className={cn(
            "p-1.5 rounded",
            "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
            "hover:bg-[var(--tp-bg-tertiary)]",
            "transition-colors"
          )}
          title="Fullscreen"
        >
          <Maximize2 size={14} />
        </button>

        {/* Provider badge */}
        <span
          className={cn(
            "ml-2 px-1.5 py-0.5",
            "text-[10px] font-medium uppercase",
            "rounded",
            "bg-[var(--tp-bg-tertiary)]",
            "text-[var(--tp-text-muted)]"
          )}
        >
          {chartProvider === "tradingview" ? "TV" : "CE"}
        </span>
      </div>
    </div>
  );
});
