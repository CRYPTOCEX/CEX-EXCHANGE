"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { useTranslations } from "next-intl";
import { formatPrice } from "./OrderBookRow";

interface SpreadIndicatorProps {
  spread: number | null;
  percentage: number | null;
  mid: number | null;
  lastPrice: number | null;
  priceDirection?: "up" | "down" | "neutral";
  pricePrecision?: number;
  /** Best bid at or above best ask — always a defect upstream. */
  crossed?: boolean;
}

export const SpreadIndicator = memo(function SpreadIndicator({
  spread,
  percentage,
  mid,
  lastPrice,
  priceDirection = "neutral",
  pricePrecision = 2,
  crossed = false,
}: SpreadIndicatorProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("trade_pro");
  const tTrade = useTranslations("trade");

  return (
    <div
      className={cn(
        "tp-spread-indicator",
        "flex items-center justify-center gap-3",
        "py-1.5 px-2",
        "border-y",
        crossed
          ? "bg-[var(--tp-red-bg)] border-[var(--tp-red)]"
          : "bg-[var(--tp-bg-tertiary)] border-[var(--tp-border)]"
      )}
    >
      {/* Last Price */}
      {lastPrice !== null && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-sm font-mono font-semibold tabular-nums",
              priceDirection === "up" && "text-[var(--tp-green)]",
              priceDirection === "down" && "text-[var(--tp-red)]",
              priceDirection === "neutral" && "text-[var(--tp-text-primary)]"
            )}
          >
            {formatPrice(lastPrice, pricePrecision)}
          </span>
          {/* A reserved box. Rendering the arrow only when there IS a
              direction takes it out of the layout, and it comes and goes about
              once a second as prices tick — so the price beside it moved every
              time. Only the arrow's visibility changes now. */}
          <span aria-hidden className="flex h-3 w-3 shrink-0 items-center justify-center">
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
          </span>
        </div>
      )}

      {crossed ? (
        /* A crossed book is not a tight spread — it is a book that cannot
           exist. It used to print as `<0.01bp` (see `formatPercentage`), i.e.
           the tightest reading the widget had, for the one condition a trader
           most needs to be warned about. */
        <span className="ob-crossed text-[10px] font-medium text-[var(--tp-red)]">
          {tTrade("crossed_book")}
        </span>
      ) : (
        <div className="flex items-center gap-2 text-[10px] text-[var(--tp-text-muted)]">
          <span>{tCommon("spread")}:</span>
          <span className="font-mono tabular-nums">
            {spread === null ? "—" : formatSpread(spread)}
            {percentage !== null && ` (${formatPercentage(percentage)})`}
          </span>
          {mid !== null && (
            <span className="font-mono tabular-nums hidden sm:inline">
              {tTrade("mid")} {formatPrice(mid, pricePrecision)}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

/** Spread in quote units, at a precision that suits its own magnitude. */
export function formatSpread(spread: number): string {
  const magnitude = Math.abs(spread);
  if (magnitude >= 100) return spread.toFixed(0);
  if (magnitude >= 1) return spread.toFixed(2);
  if (magnitude >= 0.01) return spread.toFixed(4);
  return spread.toFixed(6);
}

/**
 * Spread as a percentage, keeping its SIGN and its magnitude.
 *
 * The version this replaces tested `percentage >= 1`, `>= 0.1`, `>= 0.01` and
 * finally `< 0.001` — every one of which a negative number fails or passes for
 * the wrong reason, so a crossed book landed in the `< 0.001` branch and
 * printed `<0.01bp`. Comparing the MAGNITUDE and formatting the signed value
 * keeps `-0.03%` looking like what it is.
 */
export function formatPercentage(percentage: number): string {
  const magnitude = Math.abs(percentage);
  if (magnitude >= 1) return `${percentage.toFixed(2)}%`;
  if (magnitude >= 0.1) return `${percentage.toFixed(3)}%`;
  if (magnitude >= 0.01) return `${percentage.toFixed(4)}%`;

  const basisPoints = percentage * 100;
  if (Math.abs(basisPoints) >= 0.01) return `${basisPoints.toFixed(2)}bp`;
  return percentage === 0 ? "0bp" : "<0.01bp";
}

export default SpreadIndicator;
