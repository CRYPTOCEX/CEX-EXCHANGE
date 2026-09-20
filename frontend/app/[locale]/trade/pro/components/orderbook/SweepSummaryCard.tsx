"use client";

import React, { memo } from "react";
import { useTranslations } from "next-intl";
import type { SweepSummary } from "@/lib/orderbook";

/**
 * WHAT THE SWEEP WOULD COST.
 *
 * The tint on the ladder says WHICH levels the pointer would cross. On its own
 * that is half an answer: a trader still has to add up a column of numbers the
 * book has already added up. Every other venue puts the total on hover, and
 * this is that — volume-weighted average price, base size and quote value for
 * everything between the touch of the book and the row under the pointer.
 *
 * The numbers come from `sweepSummary`, which READS the cumulatives `buildBook`
 * already carries rather than re-summing the visible rows. That matters on a
 * grouped book, where one displayed row is several raw levels folded together
 * and re-summing what is on screen would quietly disagree with the depth bars
 * beside it.
 *
 * Positioned `fixed` beside the hovered row and clamped to the viewport: the
 * ladder scrolls and the ask side is reversed, so the only reliable anchor is
 * the row's measured box, which the row itself reports on enter.
 */
export interface SweepSummaryCardProps {
  summary: SweepSummary;
  side: "bid" | "ask";
  /** The hovered row's viewport box. */
  anchor: { top: number; bottom: number; left: number };
  pricePrecision: number;
  amountPrecision: number;
}

const CARD_WIDTH = 168;
const GAP = 8;

const format = (value: number, decimals: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const SweepSummaryCard = memo(function SweepSummaryCard({
  summary,
  side,
  anchor,
  pricePrecision,
  amountPrecision,
}: SweepSummaryCardProps) {
  const t = useTranslations("common");

  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;

  /* Left of the ladder by preference — that is where the book is not — and
     flipped to the right only when there is no room, which happens on a narrow
     window where the panel is already against the edge. */
  const preferredLeft = anchor.left - CARD_WIDTH - GAP;
  const left =
    preferredLeft >= GAP ? preferredLeft : Math.min(anchor.left + GAP, viewportWidth - CARD_WIDTH - GAP);

  const height = 74;
  const top = Math.max(
    GAP,
    Math.min((anchor.top + anchor.bottom) / 2 - height / 2, viewportHeight - height - GAP)
  );

  const row = (label: string, value: string) => (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[var(--tp-text-muted)]">{label}</span>
      <span className="tabular-nums text-[var(--tp-text-primary)]">{value}</span>
    </div>
  );

  return (
    <div
      role="tooltip"
      aria-live="off"
      className="fixed z-50 pointer-events-none rounded-md border px-2.5 py-2 text-[10px] font-mono leading-relaxed shadow-lg"
      style={{
        left,
        top,
        width: CARD_WIDTH,
        background: "var(--tp-bg-secondary)",
        borderColor: side === "bid" ? "var(--tp-green)" : "var(--tp-red)",
      }}
    >
      {row(t("average_price"), format(summary.avgPrice, pricePrecision))}
      {row(t("amount"), format(summary.amount, amountPrecision))}
      {row(t("value"), format(summary.value, pricePrecision))}
    </div>
  );
});

export default SweepSummaryCard;
