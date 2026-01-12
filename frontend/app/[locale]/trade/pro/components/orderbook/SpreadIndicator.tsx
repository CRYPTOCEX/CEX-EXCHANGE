"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

interface SpreadIndicatorProps {
  spread: number;
  percentage: number;
  lastPrice: number | null;
  priceDirection?: "up" | "down" | "neutral";
  pricePrecision?: number;
}

export const SpreadIndicator = memo(function SpreadIndicator({
  spread,
  percentage,
  lastPrice,
  priceDirection = "neutral",
  pricePrecision = 2,
}: SpreadIndicatorProps) {
  return (
    <div
      className={cn(
        "tp-spread-indicator",
        "flex items-center justify-center gap-3",
        "py-1.5 px-2",
        "bg-[var(--tp-bg-tertiary)]",
        "border-y border-[var(--tp-border)]"
      )}
    >
      {/* Last Price */}
      {lastPrice !== null && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-sm font-mono font-semibold",
              priceDirection === "up" && "text-[var(--tp-green)]",
              priceDirection === "down" && "text-[var(--tp-red)]",
              priceDirection === "neutral" && "text-[var(--tp-text-primary)]"
            )}
          >
            {formatPrice(lastPrice, pricePrecision)}
          </span>
          {priceDirection !== "neutral" && (
            <svg
              className={cn(
                "w-3 h-3",
                priceDirection === "up" && "text-[var(--tp-green)]",
                priceDirection === "down" && "text-[var(--tp-red)] rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          )}
        </div>
      )}

      {/* Spread Info */}
      <div className="flex items-center gap-2 text-[10px] text-[var(--tp-text-muted)]">
        <span>Spread:</span>
        <span className="font-mono">
          {formatSpread(spread)} ({formatPercentage(percentage)})
        </span>
      </div>
    </div>
  );
});

function formatPrice(price: number, precision: number): string {
  if (price >= 1000) return price.toFixed(Math.min(precision, 2));
  if (price >= 1) return price.toFixed(precision);
  return price.toFixed(8);
}

// Format spread value with appropriate precision
function formatSpread(spread: number): string {
  if (spread >= 100) return spread.toFixed(0);
  if (spread >= 1) return spread.toFixed(2);
  if (spread >= 0.01) return spread.toFixed(4);
  return spread.toFixed(6);
}

// Format percentage with appropriate precision - show more decimals for very small percentages
function formatPercentage(percentage: number): string {
  if (percentage >= 1) return percentage.toFixed(2) + "%";
  if (percentage >= 0.1) return percentage.toFixed(3) + "%";
  if (percentage >= 0.01) return percentage.toFixed(4) + "%";
  // For very small percentages, show in scientific notation or basis points
  if (percentage < 0.001) {
    const bps = percentage * 100; // Convert to basis points (1bp = 0.01%)
    if (bps >= 0.01) return bps.toFixed(2) + "bp";
    return "<0.01bp";
  }
  return percentage.toFixed(4) + "%";
}

export default SpreadIndicator;
