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
    marketType: "spot" | "eco" | "futures",
    e: React.MouseEvent
  ) => void;
  marketType: "spot" | "eco" | "futures";
  isInWatchlist?: (symbol: string) => boolean;
}

export function MarketList({
  markets,
  isLoading,
  selectedMarket,
  onMarketSelect,
  onToggleWatchlist,
  marketType,
  isInWatchlist,
}: MarketListProps) {
  /**
   * The list container renders in both states.
   * ==========================================================================
   *
   * `if (isLoading) return <SkeletonMarkets />` returned the rows WITHOUT the
   * `flex flex-col` wrapper the real list has, so the pending rows were laid
   * out by whatever the parent happened to be and the real ones by a column
   * flex box. `SkeletonMarkets` now also matches `MarketItem`'s row geometry
   * and takes `marketType`, so a futures rail reserves three-line rows — see
   * the note in that file.
   *
   * `markets.length === 0` is gated on `!isLoading`: it renders
   * `EmptySearchState` ("no markets match your search"), which during a fetch
   * is a statement about the user's query that the component cannot yet make.
   */
  const showEmptySearch = !isLoading && markets.length === 0;

  /**
   * Spacer rows that pad a short list out to ten.
   *
   * Withheld while pending, deliberately: `SkeletonMarkets` already fills the
   * rail with pending rows, so adding spacers under them would make the
   * container roughly twice as tall as it is about to be and then halve it —
   * the withheld-content defect with the sign flipped. `markets.length` is
   * also 0 during the fetch, so an ungated version would ask for exactly ten
   * spacers, i.e. the worst possible answer.
   *
   * Named rather than written inline so the next reader can tell this from a
   * value being hidden until it is known.
   */
  const showFillerRows = !isLoading && markets.length < 10;

  if (showEmptySearch) {
    return <EmptySearchState />;
  }

  return (
    <div className="flex flex-col">
      {isLoading && <SkeletonMarkets marketType={marketType} />}
      {markets.map((market, index) => (
        <MarketItem
          key={market.symbol}
          market={market}
          isSelected={market.symbol === selectedMarket}
          onSelect={onMarketSelect}
          onToggleWatchlist={onToggleWatchlist}
          marketType={marketType}
          index={index}
          isInWatchlist={isInWatchlist ? isInWatchlist(market.symbol) : !!market.type}
        />
      ))}
      {showFillerRows && <EmptyStateRows count={10 - markets.length} />}
    </div>
  );
}
