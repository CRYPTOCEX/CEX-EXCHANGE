"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { formatPrice, formatAmount } from "./OrderBookRow";

interface TradeRowProps {
  price: number;
  amount: number;
  side: "buy" | "sell";
  timestamp: number;
  isNew?: boolean;
  pricePrecision?: number;
  amountPrecision?: number;
}

export const TradeRow = memo(function TradeRow({
  price,
  amount,
  side,
  timestamp,
  isNew,
  pricePrecision = 2,
  amountPrecision = 4,
}: TradeRowProps) {
  const isBuy = side === "buy";

  /*
    The VIEWER's clock, not `en-US`.

    A tape whose every other string is translated and whose timestamps are
    pinned to one locale is the sort of half-localised surface that reads as a
    bug to everyone outside that locale. `undefined` asks the runtime for the
    document's own locale; the explicit 24-hour, zero-padded options are kept
    because a tape is scanned in a column and has to stay the same width.
  */
  const time = Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleTimeString(undefined, {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2",
        "px-2 py-0.5",
        "text-xs font-mono tabular-nums",
        "transition-colors",
        /* `tp-flash` was applied here alongside the colour class and no
           stylesheet has ever defined it — only `tp-flash-green` and
           `tp-flash-red` exist. Dropped rather than left as a class that looks
           load-bearing and is not. */
        isNew && (isBuy ? "tp-flash-green" : "tp-flash-red")
      )}
    >
      <span
        className={cn(isBuy ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]")}
      >
        {formatPrice(price, pricePrecision)}
      </span>
      <span className="text-right text-[var(--tp-text-secondary)]">
        {formatAmount(amount, amountPrecision)}
      </span>
      <span className="text-right text-[var(--tp-text-muted)]">{time}</span>
    </div>
  );
});

export default TradeRow;
