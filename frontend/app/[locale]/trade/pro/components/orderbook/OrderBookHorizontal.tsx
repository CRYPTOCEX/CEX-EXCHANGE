"use client";

import React, { memo, useMemo } from "react";
import { cn } from "../../utils/cn";

interface OrderBookHorizontalProps {
  bids: [number, number][]; // [price, amount]
  asks: [number, number][];
  showCumulative: boolean;
  onPriceClick: (price: number) => void;
  maxVolume: number;
  pricePrecision?: number;
  amountPrecision?: number;
  lastPrice: number | null;
  spread: { value: number; percentage: number } | null;
  priceDirection: "up" | "down" | "neutral";
}

const MAX_ROWS_HORIZONTAL = 8;

export const OrderBookHorizontal = memo(function OrderBookHorizontal({
  bids,
  asks,
  showCumulative,
  onPriceClick,
  maxVolume,
  pricePrecision = 2,
  amountPrecision = 4,
  lastPrice,
  spread,
  priceDirection,
}: OrderBookHorizontalProps) {
  // Process asks data (keep order so best ask is at top, matching bids which have best at top)
  const processedAsks = useMemo(() => {
    let cumulative = 0;
    // Take the first MAX_ROWS asks (closest to spread) - already sorted with lowest (best) first
    const slicedAsks = asks.slice(0, MAX_ROWS_HORIZONTAL);
    return slicedAsks.map(([price, amount]) => {
      cumulative += amount;
      return {
        price,
        amount,
        cumulative,
        percentage: maxVolume > 0 ? (amount / maxVolume) * 100 : 0,
      };
    }); // Don't reverse - best ask (lowest price) should be at top to meet best bid
  }, [asks, maxVolume]);

  // Process bids data
  const processedBids = useMemo(() => {
    let cumulative = 0;
    return bids.slice(0, MAX_ROWS_HORIZONTAL).map(([price, amount]) => {
      cumulative += amount;
      return {
        price,
        amount,
        cumulative,
        percentage: maxVolume > 0 ? (amount / maxVolume) * 100 : 0,
      };
    });
  }, [bids, maxVolume]);

  return (
    <div className="h-full flex flex-col">
      {/* Column Headers - two columns with prices meeting in the middle */}
      <div className="grid grid-cols-2 shrink-0 border-b border-[var(--tp-border-subtle)]">
        {/* Bids header (Buy side) - Amount on left edge, Price toward center */}
        <div className="grid grid-cols-2 gap-1 px-1.5 py-1 text-[9px] text-[var(--tp-text-muted)] uppercase tracking-wide border-r border-[var(--tp-border-subtle)]">
          <span className="text-left">Amount</span>
          <span className="text-right">Price</span>
        </div>
        {/* Asks header (Sell side) - Price toward center, Amount on right edge */}
        <div className="grid grid-cols-2 gap-1 px-1.5 py-1 text-[9px] text-[var(--tp-text-muted)] uppercase tracking-wide">
          <span className="text-left">Price</span>
          <span className="text-right">Amount</span>
        </div>
      </div>

      {/* Side-by-side order book */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-2 h-full">
          {/* Bids (Buy side) - Amount on left edge, Price toward center */}
          <div className="flex flex-col overflow-y-auto scrollbar-none border-r border-[var(--tp-border-subtle)]">
            {processedBids.map((row) => (
              <HorizontalRow
                key={`bid-${row.price}`}
                price={row.price}
                amount={row.amount}
                cumulative={row.cumulative}
                percentage={row.percentage}
                side="bid"
                showCumulative={showCumulative}
                onClick={() => onPriceClick(row.price)}
                pricePrecision={pricePrecision}
                amountPrecision={amountPrecision}
              />
            ))}
          </div>

          {/* Asks (Sell side) - Price toward center, Amount on right edge */}
          <div className="flex flex-col overflow-y-auto scrollbar-none">
            {processedAsks.map((row) => (
              <HorizontalRow
                key={`ask-${row.price}`}
                price={row.price}
                amount={row.amount}
                cumulative={row.cumulative}
                percentage={row.percentage}
                side="ask"
                showCumulative={showCumulative}
                onClick={() => onPriceClick(row.price)}
                pricePrecision={pricePrecision}
                amountPrecision={amountPrecision}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Spread and Last Price indicator at bottom */}
      <div className="shrink-0 px-2 py-1.5 border-t border-[var(--tp-border-subtle)] flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--tp-text-muted)]">Spread:</span>
          <span className="font-mono text-[var(--tp-text-secondary)]">
            {spread ? `${formatPrice(spread.value, pricePrecision)} (${spread.percentage.toFixed(2)}%)` : "-"}
          </span>
        </div>
        {lastPrice && (
          <div className="flex items-center gap-1">
            <span className="text-[var(--tp-text-muted)]">Last:</span>
            <span
              className={cn(
                "font-mono font-medium",
                priceDirection === "up" && "text-[var(--tp-green)]",
                priceDirection === "down" && "text-[var(--tp-red)]",
                priceDirection === "neutral" && "text-[var(--tp-text-primary)]"
              )}
            >
              {formatPrice(lastPrice, pricePrecision)}
            </span>
            {priceDirection !== "neutral" && (
              <span className={cn(
                "text-[8px]",
                priceDirection === "up" ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
              )}>
                {priceDirection === "up" ? "▲" : "▼"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// Horizontal row component optimized for side-by-side display
interface HorizontalRowProps {
  price: number;
  amount: number;
  cumulative: number;
  percentage: number;
  side: "bid" | "ask";
  showCumulative: boolean;
  onClick: () => void;
  pricePrecision: number;
  amountPrecision: number;
}

const HorizontalRow = memo(
  function HorizontalRow({
    price,
    amount,
    percentage,
    side,
    onClick,
    pricePrecision,
    amountPrecision,
  }: HorizontalRowProps) {
    const isBid = side === "bid";

    return (
      <div
        onClick={onClick}
        className={cn(
          "tp-orderbook-row",
          "relative",
          "grid grid-cols-2 gap-1 px-1.5 py-0.5",
          "text-[10px] font-mono",
          "cursor-pointer",
          "hover:bg-[var(--tp-bg-tertiary)]",
          "transition-colors"
        )}
      >
        {/* Depth bar background */}
        <div
          className={cn(
            "absolute inset-y-0",
            isBid ? "right-0 bg-[var(--tp-green)]/10" : "left-0 bg-[var(--tp-red)]/10"
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />

        {isBid ? (
          // Bid row: Amount (left) | Price (right, toward center)
          <>
            <span className="relative z-10 text-left text-[var(--tp-text-secondary)]">
              {formatAmount(amount, amountPrecision)}
            </span>
            <span className="relative z-10 text-right text-[var(--tp-green)]">
              {formatPrice(price, pricePrecision)}
            </span>
          </>
        ) : (
          // Ask row: Price (left, toward center) | Amount (right)
          <>
            <span className="relative z-10 text-left text-[var(--tp-red)]">
              {formatPrice(price, pricePrecision)}
            </span>
            <span className="relative z-10 text-right text-[var(--tp-text-secondary)]">
              {formatAmount(amount, amountPrecision)}
            </span>
          </>
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.price === next.price &&
      prev.amount === next.amount &&
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

export default OrderBookHorizontal;
