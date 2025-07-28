"use client";

import type React from "react";

import type { Market } from "./types";
import { MarketItem } from "./market-item";
import { EmptyStateRows } from "./empty-state-rows";
import { EmptySearchState } from "./empty-search-state";
import { SkeletonMarkets } from "./skeleton-markets";
import type { Symbol } from "@/store/trade/use-binary-store";

interface MarketListProps {
  markets: Market[];
  isLoading: boolean;
  selectedMarket: Symbol;
  onMarketSelect: (symbol: Symbol) => void;
  onToggleWatchlist: (
    symbol: string,
    marketType: "spot" | "futures",
    e: React.MouseEvent
  ) => void;
  marketType: "spot" | "futures";
  onSortVolume?: (e: React.MouseEvent) => void;
  onSortPrice?: (e: React.MouseEvent) => void;
}

export function MarketList({
  markets,
  isLoading,
  selectedMarket,
  onMarketSelect,
  onToggleWatchlist,
  marketType,
  onSortVolume,
  onSortPrice,
}: MarketListProps) {
  if (isLoading) {
    return <SkeletonMarkets />;
  }

  if (markets.length === 0) {
    return <EmptySearchState />;
  }

  return (
    <div className="flex flex-col">
      {markets.map((market, index) => (
        <MarketItem
          key={index}
          market={market}
          isSelected={market.symbol === selectedMarket}
          onSelect={onMarketSelect}
          onToggleWatchlist={onToggleWatchlist}
          marketType={marketType}
          onSortVolume={onSortVolume}
          onSortPrice={onSortPrice}
        />
      ))}
      {/* Add empty rows to fill space if needed */}
      {markets.length < 10 && <EmptyStateRows count={10 - markets.length} />}
    </div>
  );
}
