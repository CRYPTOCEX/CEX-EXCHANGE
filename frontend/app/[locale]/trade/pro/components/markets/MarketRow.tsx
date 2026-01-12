"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { MarketSparkline } from "./MarketSparkline";

interface Market {
  symbol: string;
  currency: string;
  pair: string;
  price: number;
  change24h: number;
  volume24h: number;
  sparklineData?: number[];
  category?: string;
  isNew?: boolean;
  metadata?: {
    precision?: {
      price?: number;
      amount?: number;
    };
  };
}

interface MarketRowProps {
  market: Market;
  isFavorite: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

export const MarketRow = memo(function MarketRow({
  market,
  isFavorite,
  isSelected,
  onSelect,
  onToggleFavorite,
}: MarketRowProps) {
  const isPositive = market.change24h >= 0;

  const formatPrice = (price: number): string => {
    // Use metadata precision if available
    const precision = market.metadata?.precision?.price;
    if (precision !== undefined) {
      return price.toLocaleString("en-US", { minimumFractionDigits: precision, maximumFractionDigits: precision });
    }
    // Fallback to smart formatting
    if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(6);
    return price.toFixed(8);
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toFixed(2);
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2",
        "px-2 py-1.5",
        "cursor-pointer",
        "border-b border-[var(--tp-border)]",
        "transition-colors",
        isSelected
          ? "bg-[var(--tp-blue)]/10"
          : "hover:bg-[var(--tp-bg-tertiary)]"
      )}
    >
      {/* Favorite */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={cn(
          "p-0.5 rounded shrink-0",
          "transition-colors",
          isFavorite
            ? "text-[var(--tp-yellow)]"
            : "text-[var(--tp-text-muted)] hover:text-[var(--tp-yellow)]"
        )}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={isFavorite ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>

      {/* Symbol */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-[var(--tp-text-primary)] truncate">
            {market.currency}
          </span>
          <span className="text-[10px] text-[var(--tp-text-muted)]">
            /{market.pair}
          </span>
        </div>
      </div>

      {/* Price & Change */}
      <div className="text-right shrink-0">
        <div className="text-xs font-mono text-[var(--tp-text-primary)]">
          {formatPrice(market.price)}
        </div>
        <div
          className={cn(
            "text-[10px] font-mono",
            isPositive ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
          )}
        >
          {isPositive ? "+" : ""}
          {market.change24h.toFixed(2)}%
        </div>
      </div>
    </div>
  );
});

export default MarketRow;
