"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

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
  const time = new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2",
        "px-2 py-0.5",
        "text-xs font-mono",
        "transition-colors",
        isNew && "tp-flash",
        isNew && (isBuy ? "tp-flash-green" : "tp-flash-red")
      )}
    >
      <span className={cn(isBuy ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]")}>
        {formatPrice(price, pricePrecision)}
      </span>
      <span className="text-right text-[var(--tp-text-secondary)]">
        {formatAmount(amount, amountPrecision)}
      </span>
      <span className="text-right text-[var(--tp-text-muted)]">{time}</span>
    </div>
  );
});

function formatPrice(price: number, precision: number): string {
  if (price >= 1000) return price.toFixed(Math.min(precision, 2));
  if (price >= 1) return price.toFixed(precision);
  return price.toFixed(8);
}

function formatAmount(amount: number, precision: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;
  return amount.toFixed(precision);
}

export default TradeRow;
