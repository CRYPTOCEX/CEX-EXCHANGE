"use client";

import React, { memo, useCallback } from "react";
import { cn } from "../../utils/cn";
import type { BookLevel } from "@/lib/orderbook";

export interface OrderBookRowProps {
  level: BookLevel;
  /** Distance from the touch of the book. Stable while the ladder is this deep. */
  slot: number;
  /** 0..100, already measured against whatever the row prints. */
  percentage: number;
  side: "bid" | "ask";
  showCumulative: boolean;
  /** Between the touch of the book and the pointer. */
  inSweep?: boolean;
  /** The hovered row itself. */
  sweepEdge?: boolean;
  pricePrecision: number;
  amountPrecision: number;
  onSelect: (side: "bid" | "ask", level: BookLevel, withSize: boolean) => void;
  onHover: (side: "bid" | "ask", slot: number, rect: DOMRect) => void;
  onHoverEnd: () => void;
}

/**
 * One level of the vertical ladder.
 *
 * ---------------------------------------------------------------------------
 * THE CUSTOM COMPARATOR THAT USED TO BE HERE WAS A BUG, NOT AN OPTIMISATION
 * ---------------------------------------------------------------------------
 *
 * It compared `price`, `amount`, `showCumulative` and `percentage`, and left
 * out `cumulative` and `pricePrecision`. Both omissions are visible:
 *
 *  - The third column prints the RUNNING total, which changes whenever any
 *    level ABOVE this one changes while this one holds still. The comparator
 *    said "nothing I care about moved", React skipped the row, and the ladder
 *    showed a running sum that no longer added up.
 *  - `pricePrecision` arrives late, with the market metadata. Rows that had
 *    already rendered kept the fallback precision for the rest of the session.
 *
 * There is no comparator now. Every prop is a primitive, a stable callback, or
 * the level object itself — which `buildBook` rebuilds only for levels that
 * actually changed — so the DEFAULT shallow comparison is both correct and as
 * selective as the hand-written one was trying to be.
 */
export const OrderBookRow = memo(function OrderBookRow({
  level,
  slot,
  percentage,
  side,
  showCumulative,
  inSweep,
  sweepEdge,
  pricePrecision,
  amountPrecision,
  onSelect,
  onHover,
  onHoverEnd,
}: OrderBookRowProps) {
  const isBid = side === "bid";

  const handleClick = useCallback(
    (event: React.MouseEvent) =>
      onSelect(side, level, event.shiftKey || event.altKey),
    [onSelect, side, level]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect(side, level, event.shiftKey || event.altKey);
    },
    [onSelect, side, level]
  );

  /* Reports the row's box as well as its price: the sweep summary is anchored
     to the row the pointer is on, and measuring it here is the only place that
     knows where the row ended up after the ladder's reverse and its scroll. */
  /* Reports the SLOT, not the price. The price under this row changes as the
     book breathes; the slot is the row's distance from the touch of the book
     and is stable for as long as the ladder is this deep — which is what keeps
     the tint and the summary agreeing when a level is consumed. */
  const handleEnter = useCallback(
    (event: React.SyntheticEvent<HTMLDivElement>) =>
      onHover(side, slot, event.currentTarget.getBoundingClientRect()),
    [onHover, side, slot]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${side} ${formatPrice(level.price, pricePrecision)}, ${formatAmount(level.amount, amountPrecision)}`}
      /* The sweep-edge rule needs the side, because the two ladders grow in
         opposite directions — and it saves every test from parsing the label. */
      data-side={side}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleEnter}
      onMouseLeave={onHoverEnd}
      onFocus={handleEnter}
      onBlur={onHoverEnd}
      style={{ "--ob-depth": `${percentage}%` } as React.CSSProperties}
      className={cn(
        "tp-orderbook-row ob-row",
        /* `shrink-0`: these are direct flex items of the ask ladder's
           `flex-col-reverse` scroller now, and a flex item's default
           `flex-shrink: 1` would compress the rows to fit instead of letting
           the scroller scroll. */
        "shrink-0",
        "grid grid-cols-3 gap-2",
        "px-2 py-0.5",
        "text-xs font-mono",
        "cursor-pointer",
        "hover:bg-[var(--tp-bg-tertiary)]",
        "transition-colors",
        inSweep && "ob-in-sweep",
        sweepEdge && "ob-sweep-edge"
      )}
    >
      {/* Depth bar. Grows from the right in the vertical ladder so the bars
          form a silhouette down the price column. */}
      <div
        aria-hidden
        className={cn(
          "ob-depth ob-depth-right",
          isBid ? "ob-depth-bid" : "ob-depth-ask"
        )}
      />

      <span
        className={cn(
          "relative z-10 tabular-nums",
          isBid ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
        )}
      >
        {formatPrice(level.price, pricePrecision)}
      </span>

      <span className="relative z-10 text-right text-[var(--tp-text-secondary)] tabular-nums">
        {formatAmount(level.amount, amountPrecision)}
      </span>

      <span className="relative z-10 text-right text-[var(--tp-text-muted)] tabular-nums">
        {showCumulative
          ? formatAmount(level.cumulative, amountPrecision)
          : formatCompact(level.total)}
      </span>
    </div>
  );
});

/**
 * The market's declared precision, honoured.
 *
 * This used to override it from the price magnitude — `toFixed(min(precision,2))`
 * above 1000 and a flat `toFixed(8)` below 1 — so a market quoted to four
 * decimals around $2,000 had two of them thrown away, and adjacent ladder rows
 * one tick apart printed the SAME string. A precision the exchange declared is
 * not a suggestion.
 */
export function formatPrice(price: number, precision: number): string {
  if (!Number.isFinite(price)) return "—";
  return price.toFixed(Math.max(0, Math.min(12, precision)));
}

export function formatAmount(amount: number, precision: number): string {
  if (!Number.isFinite(amount)) return "—";
  return amount.toFixed(Math.max(0, Math.min(12, precision)));
}

/** Quote-currency value, abbreviated — this column is scanned, not read. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const magnitude = Math.abs(value);
  if (magnitude >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (magnitude >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

export default OrderBookRow;
