"use client";

/**
 * Win Rate Gauge Component
 *
 * Visual gauge showing win rate on the shared three-tone scale.
 *
 * Win rate is one continuous measure, so it gets one banding rule
 * (`winRateTone`) rather than the four unrelated hues it used to carry —
 * four hues on a single axis reads as four unrelated categories.
 */

import { memo, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Panel,
  PanelTitle,
  ToneDot,
  toneStroke,
  toneText,
  winRateTone,
} from "./analytics-ui";

// ============================================================================
// TYPES
// ============================================================================

interface WinRateGaugeProps {
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  targetRate?: number;
  /** @deprecated Tokens are theme-aware; kept so existing call sites compile. */
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

  const tone = winRateTone(winRate);

  const svgSize = sizeConfig.radius * 2 + sizeConfig.stroke * 2;
  const center = svgSize / 2;

  return (
    <Panel className="flex flex-col items-center p-6">
      <PanelTitle className="mb-4">{t("win_rate")}</PanelTitle>

      {/* Gauge. Strokes are utility classes rather than JS colour values so the
          arc re-themes with the stylesheet and never caches a stale colour. */}
      <div className="relative">
        <svg
          width={svgSize}
          height={svgSize}
          fill="none"
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.radius}
            fill="none"
            className="stroke-border"
            strokeWidth={sizeConfig.stroke}
          />

          {/* Target indicator */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.radius}
            fill="none"
            className="stroke-border-strong"
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
            className={toneStroke[tone]}
            strokeWidth={sizeConfig.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              // Routed through `--motion-scale` / `--motion-ease` so the admin
              // design panel's speed and curve reach it. A literal `0.5s
              // ease-in-out` here also ignored `prefers-reduced-motion`, which
              // is implemented by collapsing the scale.
              transition:
                "stroke-dashoffset calc(500ms * var(--motion-scale, 1)) var(--motion-ease, ease-in-out)",
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${sizeConfig.fontSize} font-bold ${toneText[tone]}`}>
            {winRate.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">
            {totalTrades} trades
          </span>
        </div>
      </div>

      {/* Legend / win-loss breakdown. The dot shape differs by tone because
          up and down are a red/green pair and do not separate under
          deuteranopia; the written label is the other fallback. */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <ToneDot tone="up" size={12} />
          <span className="text-sm text-foreground">
            <span className="font-semibold">{wins}</span>
            <span className="text-muted-foreground"> wins</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ToneDot tone="down" size={12} />
          <span className="text-sm text-foreground">
            <span className="font-semibold">{losses}</span>
            <span className="text-muted-foreground"> losses</span>
          </span>
        </div>
      </div>

      {/* Target comparison */}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        {winRate >= targetRate ? (
          <span className="text-up">
            ↑ {(winRate - targetRate).toFixed(1)}% above target ({targetRate}%)
          </span>
        ) : (
          <span className="text-down">
            ↓ {(targetRate - winRate).toFixed(1)}% below target ({targetRate}%)
          </span>
        )}
      </div>
    </Panel>
  );
});

export default WinRateGauge;
