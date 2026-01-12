"use client";

import React, { memo, useCallback } from "react";
import { cn } from "../../utils/cn";
import { MarketRow } from "./MarketRow";

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

interface MarketListProps {
  markets: Market[];
  favorites: string[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
  isLoading?: boolean;
  sortBy?: "symbol" | "price" | "change" | "volume";
  sortDir?: "asc" | "desc";
  onSort?: (by: "symbol" | "price" | "change" | "volume") => void;
}

export const MarketList = memo(function MarketList({
  markets,
  favorites,
  selectedSymbol,
  onSelect,
  onToggleFavorite,
  isLoading = false,
  sortBy = "volume",
  sortDir = "desc",
  onSort,
}: MarketListProps) {
  const handleSort = useCallback(
    (by: "symbol" | "price" | "change" | "volume") => {
      onSort?.(by);
    },
    [onSort]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2 py-1.5 border-b border-[var(--tp-border)]"
          >
            <div className="w-3 h-3 bg-[var(--tp-bg-tertiary)] rounded animate-pulse shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="w-14 h-3 bg-[var(--tp-bg-tertiary)] rounded animate-pulse" />
            </div>
            <div className="w-14 h-3 bg-[var(--tp-bg-tertiary)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[var(--tp-text-muted)]/50 mb-3"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <p className="text-sm text-[var(--tp-text-muted)]">No markets found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide border-b border-[var(--tp-border)] bg-[var(--tp-bg-secondary)] sticky top-0 z-10 shrink-0">
        <span className="w-5" /> {/* Favorite column */}
        <SortButton
          label="Market"
          sortKey="symbol"
          currentSort={sortBy}
          sortDir={sortDir}
          onClick={() => handleSort("symbol")}
          className="flex-1"
        />
        <SortButton
          label="Price"
          sortKey="change"
          currentSort={sortBy}
          sortDir={sortDir}
          onClick={() => handleSort("change")}
          className="text-right"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {markets.map((market) => (
          <MarketRow
            key={market.symbol}
            market={market}
            isFavorite={favorites.includes(market.symbol)}
            isSelected={selectedSymbol === market.symbol}
            onSelect={() => onSelect(market.symbol)}
            onToggleFavorite={() => onToggleFavorite(market.symbol)}
          />
        ))}
      </div>
    </div>
  );
});

interface SortButtonProps {
  label: string;
  sortKey: "symbol" | "price" | "change" | "volume";
  currentSort: string;
  sortDir: "asc" | "desc";
  onClick: () => void;
  className?: string;
}

function SortButton({
  label,
  sortKey,
  currentSort,
  sortDir,
  onClick,
  className,
}: SortButtonProps) {
  const isActive = currentSort === sortKey;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-0.5",
        "hover:text-[var(--tp-text-secondary)]",
        "transition-colors",
        isActive && "text-[var(--tp-text-secondary)]",
        className
      )}
    >
      {label}
      {isActive && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={sortDir === "desc" ? "" : "rotate-180"}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      )}
    </button>
  );
}

export default MarketList;
