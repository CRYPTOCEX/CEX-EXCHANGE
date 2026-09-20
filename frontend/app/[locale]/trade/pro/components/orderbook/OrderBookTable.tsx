"use client";

import React, { memo } from "react";
import { OrderBookRow } from "./OrderBookRow";
import { depthPercent, type BookLevel, type BookSnapshot } from "@/lib/orderbook";

interface OrderBookTableProps {
  /** Best-first. Visual order is a layout concern — see the note below. */
  levels: BookLevel[];
  /** The whole book, for the depth denominators. */
  snapshot: BookSnapshot;
  side: "bid" | "ask";
  showCumulative: boolean;
  /** Hovered slot — distance from the touch of the book. `null` when not hovered. */
  hoverSlot: number | null;
  pricePrecision: number;
  amountPrecision: number;
  onSelect: (side: "bid" | "ask", level: BookLevel, withSize: boolean) => void;
  onHover: (side: "bid" | "ask", slot: number, rect: DOMRect) => void;
  onHoverEnd: () => void;
}

/**
 * One ladder.
 *
 * ---------------------------------------------------------------------------
 * IT NO LONGER SLICES, AND THAT IS THE POINT
 * ---------------------------------------------------------------------------
 *
 * This component used to take a raw `[price, amount][]`, apply its OWN
 * `maxRows` (defaulting to 15) and run its OWN cumulative. The panel handed it
 * `[...asks.slice(0, 25)].reverse()` — worst-first, because the container
 * reverses visually — and the internal `slice(0, 15)` then kept the first 15 of
 * THAT array. The fifteen worst asks were rendered and **the ten nearest the
 * spread, including the best ask, never appeared at all**. The running total
 * was accumulated over the same reversed array, so the depth column counted
 * outward from the worst displayed level instead of from the touch of the book.
 *
 * Both bugs come from the same mistake: reversing the DATA to get a visual
 * order. The array stays best-first from `buildBook` — which is where the depth
 * cut and the cumulative belong — and the ask ladder is flipped with
 * `flex-col-reverse` in the panel, which reorders pixels and cannot reorder
 * arithmetic.
 *
 * ---------------------------------------------------------------------------
 * AND IT RENDERS NO WRAPPER, WHICH IS WHAT MAKES THAT FLIP REAL
 * ---------------------------------------------------------------------------
 *
 * The flip above did not happen for the life of this component. The rows were
 * wrapped in a `<div className="tp-orderbook-table">` — a class with no rule
 * anywhere in the stylesheet — so the panel's `flex-col-reverse` scroller had
 * exactly ONE flex item to reverse, and reversing one item is a no-op. The ask
 * ladder therefore rendered best-first top-down: the BEST ask at the top, far
 * from the spread, and the WORST ask sitting against it. Every other book on
 * every other venue puts the best ask against the spread, and the sweep
 * highlight — which is correct, and counts from the touch of the book — then
 * ran downward from the top and read as though it were the one that was wrong.
 *
 * A fragment makes the rows the scroller's own children, so the reverse
 * applies to them. Nothing is lost with the wrapper: the class was styled by
 * nothing and no caller passed `className`.
 */
export const OrderBookTable = memo(function OrderBookTable({
  levels,
  snapshot,
  side,
  showCumulative,
  hoverSlot,
  pricePrecision,
  amountPrecision,
  onSelect,
  onHover,
  onHoverEnd,
}: OrderBookTableProps) {
  const basis = showCumulative ? "cumulative" : "amount";

  return (
    <>
      {levels.map((level, slot) => (
        <OrderBookRow
          /* KEYED BY SLOT, NOT BY PRICE.
             A ladder is a fixed set of rows whose CONTENTS change, not a list
             of things that come and go. Keying by price told React the
             opposite: on an active book the prices at the far end shift every
             tick, so those rows were unmounted and remounted continuously —
             measured at 20% of the row nodes replaced within six seconds on
             BTC/USDT. Remounting resets the depth bar to zero width and
             restarts its transition, drops any hover the pointer was holding,
             and is what makes an updating book look like it is flickering
             rather than ticking.
             The row is `memo`'d, purely presentational and holds no per-row
             state, so reusing a node across prices is safe: only the numbers
             and the depth width change. */
          key={`${side}-${slot}`}
          level={level}
          slot={slot}
          percentage={depthPercent(level, snapshot, basis, side)}
          side={side}
          showCumulative={showCumulative}
          /* A PREFIX, and the same one for both sides.

             Both arrays are best-first, so "everything between the touch of
             the book and the pointer" is always slots 0..hovered — there is no
             side to branch on. The comparison this replaces was a price RANGE,
             which is what let the tint run away: once the hovered price had
             been consumed and fell outside the book's span, every level still
             satisfied it and the whole ladder lit up. An index cannot leave the
             array it indexes. */
          inSweep={hoverSlot !== null && slot <= hoverSlot}
          sweepEdge={hoverSlot === slot}
          pricePrecision={pricePrecision}
          amountPrecision={amountPrecision}
          onSelect={onSelect}
          onHover={onHover}
          onHoverEnd={onHoverEnd}
        />
      ))}
    </>
  );
});

export default OrderBookTable;
