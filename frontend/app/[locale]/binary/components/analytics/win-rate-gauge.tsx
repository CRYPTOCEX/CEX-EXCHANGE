"use client";

/**
 * Win Rate Gauge Component
 *
 * Visual gauge showing win rate with color coding.
 */

import { memo, useMemo } from "react";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface WinRateGaugeProps {
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  targetRate?: number;
  theme?: "dark" | "light";
  size?: "sm" | "md" | "lg";
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const WinRateGauge = memo(function WinRateGauge({
  winRate,
  totalTrades,
  wins,
  losses,
  targetRate = 55,
  theme = "dark",
  size = "md",
}: WinRateGaugeProps) {
  const t = useTranslations("common");
  // Size configurations
  const sizeConfig = useMemo(() => {
    switch (size) {
      case "sm":
        return { radius: 60, stroke: 8, fontSize: "text-xl" };
      case "lg":
        return { radius: 100, stroke: 14, fontSize: "text-4xl" };
      default:
        return { radius: 80, stroke: 12, fontSize: "text-3xl" };
    }
  }, [size]);

  // Calculate gauge values
  const circumference = 2 * Math.PI * sizeConfig.radius;
  const strokeDashoffset = circumference - (winRate / 100) * circumference;
  const targetOffset = circumference - (targetRate / 100) * circumference;

  // Get color based on win rate
  const getColor = (rate: number) => {
    if (rate >= 60) return "#22c55e"; // Green
    if (rate >= 50) return "#eab308"; // Yellow
    if (rate >= 40) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const gaugeColor = getColor(winRate);

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const trackColor = theme === "dark" ? "#27272a" : "#e4e4e7";

  const svgSize = sizeConfig.radius * 2 + sizeConfig.stroke * 2;
  const center = svgSize / 2;

  return (
    <div
      className={`${bgClass} border ${borderClass} rounded-lg p-6 flex flex-col items-center`}
    >
      <h3 className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide mb-4`}>
        {t("win_rate")}
      </h3>

      {/* Gauge */}
      <div className="relative">
        <svg
          width={svgSize}
          height={svgSize}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={sizeConfig.stroke}
          />

          {/* Target indicator */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.radius}
            fill="none"
            stroke={theme === "dark" ? "#3f3f46" : "#d4d4d8"}
            strokeWidth={sizeConfig.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={targetOffset}
            strokeLinecap="round"
            opacity={0.5}
          />

          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={sizeConfig.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.5s ease-in-out",
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`${sizeConfig.fontSize} font-bold`}
            style={{ color: gaugeColor }}
          >
            {winRate.toFixed(1)}%
          </span>
          <span className={`text-xs ${subtitleClass}`}>
            {totalTrades} trades
          </span>
        </div>
      </div>

      {/* Win/Loss breakdown */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className={`text-sm ${textClass}`}>
            <span className="font-semibold">{wins}</span>
            <span className={subtitleClass}> wins</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className={`text-sm ${textClass}`}>
            <span className="font-semibold">{losses}</span>
            <span className={subtitleClass}> losses</span>
          </span>
        </div>
      </div>

      {/* Target comparison */}
      <div className={`mt-4 text-center text-xs ${subtitleClass}`}>
        {winRate >= targetRate ? (
          <span className="text-green-500">
            ↑ {(winRate - targetRate).toFixed(1)}% above target ({targetRate}%)
          </span>
        ) : (
          <span className="text-orange-500">
            ↓ {(targetRate - winRate).toFixed(1)}% below target ({targetRate}%)
          </span>
        )}
      </div>
    </div>
  );
});

export default WinRateGauge;
