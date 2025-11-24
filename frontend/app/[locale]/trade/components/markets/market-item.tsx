"use client";

import type React from "react";

import { cn } from "@/lib/utils";
import { Star, TrendingUp } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import type { Market } from "./types";
import type { Symbol } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

interface MarketItemProps {
  market: Market;
  isSelected: boolean;
  onSelect: (symbol: Symbol) => void;
  onToggleWatchlist: (
    symbol: string,
    marketType: "spot" | "futures",
    e: React.MouseEvent
  ) => void;
  marketType: "spot" | "futures";
  onSortVolume?: (e: React.MouseEvent) => void;
  onSortPrice?: (e: React.MouseEvent) => void;
}

export function MarketItem({
  market,
  isSelected,
  onSelect,
  onToggleWatchlist,
  marketType,
  onSortVolume,
  onSortPrice,
}: MarketItemProps) {
  const t = useTranslations("trade/components/markets/market-item");
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 px-2 hover:bg-muted dark:hover:bg-zinc-800 cursor-pointer border-b border-zinc-200/70 dark:border-zinc-900 transition-colors",
        isSelected && "bg-muted dark:bg-zinc-800"
      )}
      onClick={() => onSelect(market.symbol)}
    >
      <div className="flex items-center flex-1">
        <button
          onClick={(e) => onToggleWatchlist(market.symbol, marketType, e)}
          className="mr-2 focus:outline-none"
          aria-label={
            market.type ? "Remove from watchlist" : "Add to watchlist"
          }
        >
          <Star
            className={cn(
              "h-3 w-3",
              market.type || market.symbol === market.symbol
                ? "text-yellow-400 fill-yellow-400"
                : "text-muted-foreground/40 dark:text-zinc-600 hover:text-muted-foreground dark:hover:text-zinc-400"
            )}
          />
        </button>
        
        {/* Futures Markets: 3-row layout */}
        {marketType === "futures" ? (
          <div className="flex flex-col flex-1">
            {/* Row 1: Symbol and badges */}
            <div className="flex items-center h-4 mb-1">
              <div className="font-medium text-xs mr-2">{market.displaySymbol}</div>
              {market.isTrending && (
                <div className="mr-1.5 px-1 py-0.5 text-[8px] rounded bg-emerald-100/70 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-700/50">
                  {t("Trending")}
                </div>
              )}
              {market.isHot && !market.isTrending && (
                <div className="mr-1.5 px-1 py-0.5 text-[8px] rounded bg-red-100/70 dark:bg-red-900/70 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-700/50">
                  {t("Hot")}
                </div>
              )}
              {market.isEco && (
                <div className="mr-1.5 px-1 py-0.5 text-[8px] rounded bg-blue-100/70 dark:bg-blue-900/70 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-700/50">
                  {t("Eco")}
                </div>
              )}
              {market.type && (
                <div
                  className={cn(
                    "mr-1.5 px-1 py-0.5 text-[8px] rounded border",
                    market.type === "futures"
                      ? "bg-blue-100/70 dark:bg-blue-900/70 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-700/50"
                      : "bg-emerald-100/70 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-700/50"
                  )}
                >
                  {market.type === "futures" ? "FUT" : "SPOT"}
                </div>
              )}
              {market.leverage && market.leverage > 1 && (
                <div className="mr-1.5 px-1 py-0.5 text-[8px] rounded bg-purple-100/70 dark:bg-purple-900/70 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-700/50">
                  {market.leverage}x
                </div>
              )}
            </div>
            
            {/* Row 2: Volume and Price */}
            <div className="flex items-center justify-between h-3 mb-1">
              <div>
                {market.volume ? (
                  <div className="text-[10px] text-muted-foreground dark:text-zinc-500">
                    {t("vol")} {market.volume}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground dark:text-zinc-500">
                    {t("vol")} --
                  </div>
                )}
              </div>
              <div>
                {market.price ? (
                  <div className="font-medium text-xs">
                    {market.price}
                  </div>
                ) : (
                  <div className="font-medium text-xs text-muted-foreground">
                    --
                  </div>
                )}
              </div>
            </div>
            
            {/* Row 3: Change and Funding Rate */}
            <div className="flex items-center justify-between h-3">
              <div>
                {market.change ? (
                  <div
                    className={cn(
                      "text-[10px] flex items-center",
                      market.isPositive
                        ? "text-emerald-600 dark:text-green-500"
                        : "text-red-600 dark:text-red-500"
                    )}
                  >
                    {market.isPositive ? (
                      <TrendingUp className="h-2 w-2 mr-0.5" />
                    ) : (
                      <TrendingUp className="h-2 w-2 mr-0.5 transform rotate-180" />
                    )}
                    {market.change}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground">
                    --
                  </div>
                )}
              </div>
              <div>
                {market.fundingRate && (
                  <div
                    className={cn(
                      "text-[10px] font-medium px-1 py-0.5 rounded",
                      Number(market.fundingRate.replace('%', '')) >= 0
                        ? "text-emerald-600 dark:text-green-400 bg-emerald-50 dark:bg-emerald-900/20"
                        : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                    )}
                    title="Funding Rate"
                  >
                    {market.fundingRate}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Spot Markets: Original 2-row layout */
          <div className="flex flex-col">
            <div className="flex items-center h-4">
              <div className="font-medium text-xs">{market.displaySymbol}</div>
              {market.isTrending && (
                <div className="ml-1.5 px-1 py-0.5 text-[8px] rounded bg-emerald-100/70 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-700/50">
                  {t("Trending")}
                </div>
              )}
              {market.isHot && !market.isTrending && (
                <div className="ml-1.5 px-1 py-0.5 text-[8px] rounded bg-red-100/70 dark:bg-red-900/70 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-700/50">
                  {t("Hot")}
                </div>
              )}
              {market.isEco && (
                <div className="ml-1.5 px-1 py-0.5 text-[8px] rounded bg-blue-100/70 dark:bg-blue-900/70 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-700/50">
                  {t("Eco")}
                </div>
              )}
              {market.type && (
                <div
                  className={cn(
                    "ml-1.5 px-1 py-0.5 text-[8px] rounded border",
                    market.type === "futures"
                      ? "bg-blue-100/70 dark:bg-blue-900/70 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-700/50"
                      : "bg-emerald-100/70 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-700/50"
                  )}
                >
                  {market.type === "futures" ? "FUT" : "SPOT"}
                </div>
              )}
              {market.leverage && market.leverage > 1 && (
                <div className="ml-1.5 px-1 py-0.5 text-[8px] rounded bg-purple-100/70 dark:bg-purple-900/70 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-700/50">
                  {market.leverage}x
                </div>
              )}
            </div>
            <div className="h-3 mt-0.5">
              {market.volume ? (
                <div className="text-[10px] text-muted-foreground dark:text-zinc-500">
                  {t("vol")} {market.volume}
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground dark:text-zinc-500">
                  {t("vol")} --
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Right side: Price and change for spot markets only */}
      {marketType !== "futures" && (
        <div className="flex flex-col items-end">
          <div className="h-4">
            {market.price ? (
              <div className="font-medium text-xs">
                {market.price}
              </div>
            ) : (
              <div className="font-medium text-xs text-muted-foreground">
                --
              </div>
            )}
          </div>
          <div className="h-3 mt-0.5 flex items-center justify-end space-x-2">
            {market.change ? (
              <div
                className={cn(
                  "text-[10px] flex items-center",
                  market.isPositive
                    ? "text-emerald-600 dark:text-green-500"
                    : "text-red-600 dark:text-red-500"
                )}
              >
                {market.isPositive ? (
                  <TrendingUp className="h-2 w-2 mr-0.5" />
                ) : (
                  <TrendingUp className="h-2 w-2 mr-0.5 transform rotate-180" />
                )}
                {market.change}
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground">
                --
              </div>
            )}
            {market.fundingRate && (
              <div
                className={cn(
                  "text-[10px] font-medium px-1 py-0.5 rounded",
                  Number(market.fundingRate.replace('%', '')) >= 0
                    ? "text-emerald-600 dark:text-green-400 bg-emerald-50 dark:bg-emerald-900/20"
                    : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                )}
                title="Funding Rate"
              >
                {market.fundingRate}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
