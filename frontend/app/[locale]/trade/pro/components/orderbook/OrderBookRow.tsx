"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

interface OrderBookRowProps {
  price: number;
  amount: number;
  cumulative: number;
  percentage: number;
  side: "bid" | "ask";
  showCumulative: boolean;
  onClick: () => void;
  pricePrecision?: number;
  amountPrecision?: number;
}

export const OrderBookRow = memo(
  function OrderBookRow({
    price,
    amount,
    cumulative,
    percentage,
    side,
    showCumulative,
    onClick,
    pricePrecision = 2,
    amountPrecision = 4,
  }: OrderBookRowProps) {
    const isBid = side === "bid";

    return (
      <div
        onClick={onClick}
        className={cn(
          "tp-orderbook-row",
          "relative",
          "grid grid-cols-3 gap-2",
          "px-2 py-0.5",
          "text-xs font-mono",
          "cursor-pointer",
          "hover:bg-[var(--tp-bg-tertiary)]",
          "transition-colors"
        )}
      >
        {/* Depth bar background - always on right side for vertical orderbook */}
        <div
          className={cn(
            "absolute inset-y-0 right-0",
            isBid ? "bg-[var(--tp-green)]/10" : "bg-[var(--tp-red)]/10"
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />

        {/* Price */}
        <span
          className={cn(
            "relative z-10",
            isBid ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
          )}
        >
          {formatPrice(price, pricePrecision)}
        </span>

        {/* Amount */}
        <span className="relative z-10 text-right text-[var(--tp-text-secondary)]">
          {formatAmount(amount, amountPrecision)}
        </span>

        {/* Cumulative or Total */}
        <span className="relative z-10 text-right text-[var(--tp-text-muted)]">
          {showCumulative ? formatAmount(cumulative, amountPrecision) : formatTotal(price * amount)}
        </span>
      </div>
    );
  },
  (prev, next) => {
    // Custom comparison for performance
    return (
      prev.price === next.price &&
      prev.amount === next.amount &&
      prev.showCumulative === next.showCumulative &&
      prev.percentage === next.percentage
    );
  }
);

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

function formatTotal(total: number): string {
  if (total >= 1000000) return `${(total / 1000000).toFixed(2)}M`;
  if (total >= 1000) return `${(total / 1000).toFixed(2)}K`;
  return total.toFixed(2);
}

export default OrderBookRow;
