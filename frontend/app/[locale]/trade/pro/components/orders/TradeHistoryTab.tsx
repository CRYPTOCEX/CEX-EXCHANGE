"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { MoneyFigure } from "@/components/ui/money-figure";
import { EmptyState } from "./EmptyState";
import { SkeletonText } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("trade_pro");
  /**
   * Same fix as the two sibling tabs: the six column headers (Time, Symbol,
   * Side, Price, Amount, Fee) are literals and used to be withheld, so the
   * sticky 27px header band appeared on arrival and pushed the first rows down
   * inside a docked panel. The pending rows now use the real `px-3 py-2`
   * geometry instead of `py-3`, with placeholders inside the cells so they
   * follow the workspace font-scale.
   *
   * `trades.length === 0` is gated on `!isLoading` so "no trades" is never
   * asserted about an account that simply has not answered yet.
   */
  if (!isLoading && trades.length === 0) {
    return <EmptyState type="trades" />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - hidden on mobile where rows render as stacked cards */}
      <div className="hidden sm:grid grid-cols-6 gap-2 px-3 py-2 text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide border-b border-[var(--tp-border)] bg-[var(--tp-bg-secondary)] sticky top-0 z-10">
        <span>Time</span>
        <span>Symbol</span>
        <span>Side</span>
        <span className="text-right">Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Fee</span>
      </div>

      {/* Trades list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading
          ? [0, 1, 2].map((i) => (
              <div
                key={`pending-trade-${i}`}
                className="border-b border-[var(--tp-border)]"
              >
                <div className="hidden sm:grid grid-cols-6 gap-2 px-3 py-2 text-xs">
                  <span>
                    <SkeletonText placeholder="00:00:00" />
                  </span>
                  <span>
                    <SkeletonText placeholder="BTC/USDT" />
                  </span>
                  <span>
                    <SkeletonText placeholder="BUY" />
                  </span>
                  <span className="flex justify-end">
                    <SkeletonText placeholder="00000.00" />
                  </span>
                  <span className="flex justify-end">
                    <SkeletonText placeholder="0.0000" />
                  </span>
                  <span className="flex justify-end">
                    <SkeletonText placeholder="0.0000" />
                  </span>
                </div>
                <div className="sm:hidden px-3 py-2 space-y-1 text-xs">
                  <p>
                    <SkeletonText placeholder={t("btc_usdt_buy")} />
                  </p>
                  <p>
                    <SkeletonText placeholder="0.0000 @ 00000.00" />
                  </p>
                  <p>
                    <SkeletonText placeholder="Fee 0.0000  00:00:00" />
                  </p>
                </div>
              </div>
            ))
          : trades.map((trade) => (
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
    <>
      {/* Mobile card layout (< sm) */}
      <div className="sm:hidden px-3 py-3 border-b border-[var(--tp-border)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn("text-sm font-semibold", isBuy ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]")}>
              {trade.side}
            </span>
            <span className="text-xs text-[var(--tp-text-secondary)] truncate">{trade.symbol}</span>
          </div>
          <span className="shrink-0 text-[10px] font-mono text-[var(--tp-text-muted)]">
            {formatTime(trade.timestamp)}
          </span>
        </div>

        <div className="mt-2 space-y-1 text-xs font-mono">
          <div className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">Price</span>
            <span className="min-w-0 flex-1 text-right break-all text-[var(--tp-text-primary)]">
              {formatPrice(trade.price, pricePrecision)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">Amount</span>
            <span className="min-w-0 flex-1 text-right break-all text-[var(--tp-text-secondary)]">
              {formatAmount(trade.amount, amountPrecision)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">Fee</span>
            <span className="min-w-0 flex-1 text-right break-all text-[var(--tp-text-muted)]">
              {/* The row is mono; the fee CURRENCY is a word, so it steps out
                  of the mono run while the digits keep it. */}
              <MoneyFigure
                value={`${trade.fee.toFixed(6)} ${trade.feeCurrency}`}
                unitClassName="font-sans"
              />
            </span>
          </div>
        </div>
      </div>

      {/* Table row layout (>= sm): unchanged */}
      <div
        className={cn(
          "hidden sm:grid grid-cols-6 gap-2 items-center",
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
          <MoneyFigure
            value={`${trade.fee.toFixed(6)} ${trade.feeCurrency}`}
            unitClassName="font-sans"
          />
        </span>
      </div>
    </>
  );
});

export default TradeHistoryTab;
