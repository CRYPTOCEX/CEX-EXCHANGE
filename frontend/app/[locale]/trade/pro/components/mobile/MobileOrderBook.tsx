"use client";

import React, { memo, useState, useMemo } from "react";
import { cn } from "../../utils/cn";

interface PriceLevel {
  price: number;
  amount: number;
  total: number;
}

interface MobileOrderBookProps {
  bids: PriceLevel[];
  asks: PriceLevel[];
  lastPrice?: number;
  onPriceSelect?: (price: number) => void;
  className?: string;
}

type ViewMode = "both" | "bids" | "asks";

export const MobileOrderBook = memo(function MobileOrderBook({
  bids = [],
  asks = [],
  lastPrice,
  onPriceSelect,
  className,
}: MobileOrderBookProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [precision, setPrecision] = useState(2);

  // Mock data for demo
  const mockBids: PriceLevel[] = useMemo(() => {
    if (bids.length > 0) return bids;
    const basePrice = lastPrice ?? 42500;
    return Array.from({ length: 15 }, (_, i) => ({
      price: basePrice - (i + 1) * 5,
      amount: Math.random() * 2 + 0.1,
      total: 0,
    })).map((level, i, arr) => ({
      ...level,
      total: arr.slice(0, i + 1).reduce((sum, l) => sum + l.amount, 0),
    }));
  }, [bids, lastPrice]);

  const mockAsks: PriceLevel[] = useMemo(() => {
    if (asks.length > 0) return asks;
    const basePrice = lastPrice ?? 42500;
    return Array.from({ length: 15 }, (_, i) => ({
      price: basePrice + (i + 1) * 5,
      amount: Math.random() * 2 + 0.1,
      total: 0,
    })).map((level, i, arr) => ({
      ...level,
      total: arr.slice(0, i + 1).reduce((sum, l) => sum + l.amount, 0),
    }));
  }, [asks, lastPrice]);

  const maxTotal = useMemo(() => {
    const allTotals = [...mockBids, ...mockAsks].map((l) => l.total);
    return Math.max(...allTotals);
  }, [mockBids, mockAsks]);

  const displayBids = viewMode !== "asks" ? mockBids.slice(0, viewMode === "both" ? 8 : 15) : [];
  const displayAsks = viewMode !== "bids" ? mockAsks.slice(0, viewMode === "both" ? 8 : 15) : [];

  return (
    <div className={cn("flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--tp-border)]">
        {/* View Mode Toggle */}
        <div className="flex gap-1">
          {[
            { id: "both", icon: "⊞" },
            { id: "bids", icon: "▼" },
            { id: "asks", icon: "▲" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as ViewMode)}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded",
                "text-sm",
                viewMode === mode.id
                  ? "bg-[var(--tp-bg-elevated)] text-[var(--tp-text-primary)]"
                  : "text-[var(--tp-text-muted)]"
              )}
            >
              {mode.icon}
            </button>
          ))}
        </div>

        {/* Precision */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--tp-text-muted)]">Precision</span>
          <select
            value={precision}
            onChange={(e) => setPrecision(Number(e.target.value))}
            className="bg-[var(--tp-bg-tertiary)] border border-[var(--tp-border)] rounded px-2 py-1 text-xs text-[var(--tp-text-primary)]"
          >
            <option value={0}>0</option>
            <option value={1}>0.0</option>
            <option value={2}>0.00</option>
          </select>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-3 py-1.5 text-[10px] text-[var(--tp-text-muted)] border-b border-[var(--tp-border)]">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      {/* Order Book Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Asks (reversed so lowest ask is at bottom) */}
        {displayAsks.length > 0 && (
          <div className={cn("flex flex-col-reverse", viewMode === "both" ? "flex-1" : "flex-1 overflow-y-auto")}>
            {displayAsks.map((level) => (
              <MobileOrderBookRow
                key={`ask-${level.price}`}
                level={level}
                side="ask"
                maxTotal={maxTotal}
                precision={precision}
                onPress={() => onPriceSelect?.(level.price)}
              />
            ))}
          </div>
        )}

        {/* Spread / Last Price */}
        {viewMode === "both" && (
          <div className="flex items-center justify-center py-2 border-y border-[var(--tp-border)] bg-[var(--tp-bg-tertiary)]">
            <span className="text-sm font-mono font-medium text-[var(--tp-text-primary)]">
              {lastPrice?.toFixed(precision) ?? "---"}
            </span>
            {displayAsks[0] && mockBids[0] && (
              <span className="ml-2 text-[10px] text-[var(--tp-text-muted)]">
                Spread: {((displayAsks[0].price - mockBids[0].price) / displayAsks[0].price * 100).toFixed(3)}%
              </span>
            )}
          </div>
        )}

        {/* Bids */}
        {displayBids.length > 0 && (
          <div className={cn("flex flex-col", viewMode === "both" ? "flex-1" : "flex-1 overflow-y-auto")}>
            {displayBids.map((level) => (
              <MobileOrderBookRow
                key={`bid-${level.price}`}
                level={level}
                side="bid"
                maxTotal={maxTotal}
                precision={precision}
                onPress={() => onPriceSelect?.(level.price)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

interface MobileOrderBookRowProps {
  level: PriceLevel;
  side: "bid" | "ask";
  maxTotal: number;
  precision: number;
  onPress: () => void;
}

const MobileOrderBookRow = memo(function MobileOrderBookRow({
  level,
  side,
  maxTotal,
  precision,
  onPress,
}: MobileOrderBookRowProps) {
  const depthPercent = (level.total / maxTotal) * 100;

  return (
    <button
      onClick={onPress}
      className="relative grid grid-cols-3 gap-2 px-3 py-1.5 text-xs active:bg-[var(--tp-bg-elevated)]"
    >
      {/* Depth Bar */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 opacity-20",
          side === "bid" ? "bg-[var(--tp-green)]" : "bg-[var(--tp-red)]"
        )}
        style={{ width: `${depthPercent}%` }}
      />

      {/* Content */}
      <span
        className={cn(
          "font-mono relative z-10",
          side === "bid" ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
        )}
      >
        {level.price.toFixed(precision)}
      </span>
      <span className="font-mono text-right text-[var(--tp-text-primary)] relative z-10">
        {level.amount.toFixed(4)}
      </span>
      <span className="font-mono text-right text-[var(--tp-text-muted)] relative z-10">
        {level.total.toFixed(4)}
      </span>
    </button>
  );
});

export default MobileOrderBook;
