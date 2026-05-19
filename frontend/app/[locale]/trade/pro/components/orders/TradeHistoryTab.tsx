"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { EmptyState } from "./EmptyState";

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  amount: number;
  fee: number;
  feeCurrency: string;
  timestamp: string;
}

interface TradeHistoryTabProps {
  trades: Trade[];
  isLoading: boolean;
  pricePrecision?: number;
  amountPrecision?: number;
}

export const TradeHistoryTab = memo(function TradeHistoryTab({
  trades,
  isLoading,
  pricePrecision,
  amountPrecision,
}: TradeHistoryTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="grid grid-cols-6 gap-2 px-3 py-3 border-b border-[var(--tp-border)]"
          >
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="h-4 bg-[var(--tp-bg-tertiary)] rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return <EmptyState type="trades" />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="grid grid-cols-6 gap-2 px-3 py-2 text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide border-b border-[var(--tp-border)] bg-[var(--tp-bg-secondary)] sticky top-0 z-10">
        <span>Time</span>
        <span>Symbol</span>
        <span>Side</span>
        <span className="text-right">Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Fee</span>
      </div>

      {/* Trades list */}
      <div className="flex-1 overflow-y-auto">
        {trades.map((trade) => (
          <TradeRow
            key={trade.id}
            trade={trade}
            pricePrecision={pricePrecision}
            amountPrecision={amountPrecision}
          />
        ))}
      </div>
    </div>
  );
});

interface TradeRowProps {
  trade: Trade;
  pricePrecision?: number;
  amountPrecision?: number;
}

// Format price with precision or smart fallback
const formatPrice = (price: number, precision?: number): string => {
  if (precision !== undefined) return price.toFixed(precision);
  // Fallback to smart formatting
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(6);
  return price.toFixed(8);
};

// Format amount with precision or smart fallback
const formatAmount = (amount: number, precision?: number): string => {
  if (precision !== undefined) return amount.toFixed(precision);
  // Fallback to smart formatting
  if (amount >= 1000) return amount.toFixed(2);
  if (amount >= 1) return amount.toFixed(4);
  return amount.toFixed(6);
};

const TradeRow = memo(function TradeRow({
  trade,
  pricePrecision,
  amountPrecision,
}: TradeRowProps) {
  const isBuy = trade.side === "BUY";

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })}`;
  };

  return (
    <div
      className={cn(
        "grid grid-cols-6 gap-2 items-center",
        "px-3 py-2",
        "text-xs font-mono",
        "border-b border-[var(--tp-border)]",
        "hover:bg-[var(--tp-bg-tertiary)]/50"
      )}
    >
      <span className="text-[var(--tp-text-muted)]">{formatTime(trade.timestamp)}</span>
      <span className="text-[var(--tp-text-secondary)]">{trade.symbol}</span>
      <span className={cn("font-medium", isBuy ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]")}>
        {trade.side}
      </span>
      <span className="text-[var(--tp-text-primary)] text-right">{formatPrice(trade.price, pricePrecision)}</span>
      <span className="text-[var(--tp-text-secondary)] text-right">{formatAmount(trade.amount, amountPrecision)}</span>
      <span className="text-[var(--tp-text-muted)] text-right">
        {trade.fee.toFixed(6)} {trade.feeCurrency}
      </span>
    </div>
  );
});

export default TradeHistoryTab;
