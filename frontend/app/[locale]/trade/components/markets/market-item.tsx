"use client";

import type React from "react";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { m } from "framer-motion";
import type { Market } from "./types";
import type { Symbol } from "@/store/trade/use-binary-store";
import {
  ChangeCell,
  FundingRateCell,
  MarketBadges,
  PriceCell,
  SymbolLabel,
  VolumeLabel,
  WatchlistStar,
} from "./market-cells";

interface MarketItemProps {
  market: Market;
  isSelected: boolean;
  onSelect: (symbol: Symbol) => void;
  onToggleWatchlist: (
    symbol: string,
    marketType: "spot" | "eco" | "futures",
    e: React.MouseEvent
  ) => void;
  marketType: "spot" | "eco" | "futures";
  index?: number;
  isInWatchlist?: boolean;
}

export const MarketItem = memo(function MarketItem({
  market,
  isSelected,
  onSelect,
  onToggleWatchlist,
  marketType,
  index = 0,
  isInWatchlist = false,
}: MarketItemProps) {
  const isFutures = marketType === "futures";

  return (
    <m.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.2,
        delay: Math.min(index * 0.02, 0.3),
        ease: "easeOut",
      }}
      // Hover and selection tints are CSS classes, not Motion animations —
      // Tailwind v4 alpha utilities compile to `color-mix(in oklab, …)`, which
      // Motion cannot use as an animation start point.
      //
      // Selection is a ramp step plus a 2px accent rule, and the symbol goes
      // semibold. It used to go `text-primary`, which measures 4.12:1 on the
      // selected ground in light mode — under the 4.5:1 floor for 12px text.
      // The accent survives where it is not being read as prose.
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 border-b border-border px-2 py-2 transition-colors duration-200",
        isSelected
          ? "border-l-2 border-l-primary bg-surface-3"
          : "hover:bg-surface-3/60"
      )}
      onClick={() => onSelect(market.symbol)}
    >
      <div className="flex min-w-0 flex-1 items-center">
        <WatchlistStar
          isInWatchlist={isInWatchlist}
          onClick={(e) => onToggleWatchlist(market.symbol, marketType, e)}
        />

        {isFutures ? (
          /* Futures: everything stacks in the left column — the funding rate
             needs a third row that spot markets do not have. */
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-1 flex h-4 min-w-0 items-center gap-1 overflow-hidden">
              <SymbolLabel symbol={market.displaySymbol} isSelected={isSelected} />
              <MarketBadges market={market} />
            </div>
            <div className="mb-1 flex h-3 min-w-0 items-center justify-between gap-2">
              <VolumeLabel volume={market.volume} />
              <PriceCell price={market.price} hasData={market.hasData} />
            </div>
            <div className="flex h-3 min-w-0 items-center justify-between gap-2">
              <ChangeCell change={market.change} isPositive={market.isPositive} />
              <FundingRateCell fundingRate={market.fundingRate} />
            </div>
          </div>
        ) : (
          /* Spot: symbol + volume on the left, price + change on the right. */
          <div className="flex min-w-0 flex-col">
            <div className="flex h-4 min-w-0 items-center gap-1 overflow-hidden">
              <SymbolLabel symbol={market.displaySymbol} isSelected={isSelected} />
              <MarketBadges market={market} />
            </div>
            <div className="mt-0.5 h-3">
              <VolumeLabel volume={market.volume} />
            </div>
          </div>
        )}
      </div>

      {!isFutures && (
        <div className="flex shrink-0 flex-col items-end">
          <div className="h-4">
            <PriceCell price={market.price} hasData={market.hasData} />
          </div>
          <div className="mt-0.5 flex h-3 items-center justify-end space-x-2">
            <ChangeCell change={market.change} isPositive={market.isPositive} />
            <FundingRateCell fundingRate={market.fundingRate} />
          </div>
        </div>
      )}
    </m.div>
  );
});
