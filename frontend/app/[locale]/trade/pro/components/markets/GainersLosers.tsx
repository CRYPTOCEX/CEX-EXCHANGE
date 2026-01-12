"use client";

import React, { memo, useState } from "react";
import { cn } from "../../utils/cn";

interface Market {
  symbol: string;
  currency: string;
  pair: string;
  price: number;
  change24h: number;
}

interface GainersLosersProps {
  gainers: Market[];
  losers: Market[];
  onSelect: (symbol: string) => void;
}

export const GainersLosers = memo(function GainersLosers({
  gainers,
  losers,
  onSelect,
}: GainersLosersProps) {
  const [view, setView] = useState<"gainers" | "losers">("gainers");

  const markets = view === "gainers" ? gainers : losers;
  const isGainers = view === "gainers";

  return (
    <div className="border-b border-[var(--tp-border)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => setView("gainers")}
            className={cn(
              "text-xs font-medium transition-colors",
              view === "gainers"
                ? "text-[var(--tp-green)]"
                : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
            )}
          >
            Top Gainers
          </button>
          <span className="text-[var(--tp-text-muted)]">/</span>
          <button
            onClick={() => setView("losers")}
            className={cn(
              "text-xs font-medium transition-colors",
              view === "losers"
                ? "text-[var(--tp-red)]"
                : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
            )}
          >
            Top Losers
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex gap-2 px-3 pb-2 overflow-x-auto scrollbar-none">
        {markets.slice(0, 5).map((market) => (
          <button
            key={market.symbol}
            onClick={() => onSelect(market.symbol)}
            className={cn(
              "flex-shrink-0",
              "px-3 py-2",
              "bg-[var(--tp-bg-tertiary)]",
              "border border-[var(--tp-border)]",
              "rounded-lg",
              "hover:border-[var(--tp-text-muted)]",
              "transition-colors"
            )}
          >
            <div className="text-xs font-medium text-[var(--tp-text-primary)]">
              {market.currency}
            </div>
            <div
              className={cn(
                "text-sm font-mono font-semibold",
                isGainers ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
              )}
            >
              {isGainers ? "+" : ""}
              {market.change24h.toFixed(2)}%
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

export default GainersLosers;
