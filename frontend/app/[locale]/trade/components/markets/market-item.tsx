"use client";

import type React from "react";
import { memo, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Star, TrendingUp, TrendingDown, Flame, Zap } from "lucide-react";
import type { Market } from "./types";
import type { Symbol } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

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
  onSortVolume?: (e: React.MouseEvent) => void;
  onSortPrice?: (e: React.MouseEvent) => void;
  index?: number;
  isInWatchlist?: boolean;
}

// Animated badge component
function AnimatedBadge({
  children,
  className,
  icon,
}: {
  children: React.ReactNode;
  className: string;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "px-1 py-0.5 text-[8px] rounded border flex items-center gap-0.5",
        className
      )}
    >
      {icon}
      {children}
    </motion.div>
  );
}

// Price flash component
function PriceDisplay({
  price,
  prevPrice,
  hasData,
}: {
  price: string | null;
  prevPrice: string | null;
  hasData: boolean;
}) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef(prevPrice);

  useEffect(() => {
    if (prevPriceRef.current && price && prevPriceRef.current !== price) {
      const prevNum = parseFloat(prevPriceRef.current.replace(/,/g, ""));
      const currNum = parseFloat(price.replace(/,/g, ""));
      if (!isNaN(prevNum) && !isNaN(currNum) && prevNum !== currNum) {
        setFlash(currNum > prevNum ? "up" : "down");
        const timer = setTimeout(() => setFlash(null), 500);
        return () => clearTimeout(timer);
      }
    }
    prevPriceRef.current = price;
  }, [price]);

  if (!hasData || !price) {
    return (
      <motion.div
        className="font-medium text-xs text-muted-foreground"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        --
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        "font-medium text-xs transition-colors duration-300",
        flash === "up" && "text-emerald-600 dark:text-emerald-400",
        flash === "down" && "text-red-600 dark:text-red-400"
      )}
      animate={{
        backgroundColor:
          flash === "up"
            ? "rgba(16, 185, 129, 0.15)"
            : flash === "down"
              ? "rgba(239, 68, 68, 0.15)"
              : "rgba(0, 0, 0, 0)",
      }}
      style={{ padding: "1px 3px", borderRadius: "3px", margin: "-1px -3px" }}
    >
      {price}
    </motion.div>
  );
}

// Change indicator with animation
function ChangeIndicator({
  change,
  isPositive,
}: {
  change: string | null;
  isPositive: boolean;
}) {
  if (!change) {
    return <div className="text-[10px] text-muted-foreground">--</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "text-[10px] flex items-center font-medium",
        isPositive
          ? "text-emerald-600 dark:text-green-500"
          : "text-red-600 dark:text-red-500"
      )}
    >
      <motion.div
        animate={{ y: isPositive ? [-1, 0] : [1, 0] }}
        transition={{ duration: 0.2 }}
      >
        {isPositive ? (
          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
        ) : (
          <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
        )}
      </motion.div>
      {change}
    </motion.div>
  );
}

// Animated star button
function StarButton({
  isInWatchlist,
  onClick,
}: {
  isInWatchlist: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="mr-2 focus:outline-none"
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.8 }}
      aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
    >
      <motion.div
        animate={
          isInWatchlist
            ? {
                scale: [1, 1.3, 1],
                rotate: [0, 10, -10, 0],
              }
            : {}
        }
        transition={{ duration: 0.3 }}
      >
        <Star
          className={cn(
            "h-3 w-3 transition-colors duration-200",
            isInWatchlist
              ? "text-yellow-400 fill-yellow-400"
              : "text-muted-foreground/40 dark:text-zinc-600 hover:text-yellow-400/70"
          )}
        />
      </motion.div>
    </motion.button>
  );
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
  const t = useTranslations("common");
  const tTradeComponents = useTranslations("trade_components");
  const [isHovered, setIsHovered] = useState(false);
  const prevPriceRef = useRef<string | null>(market.price);

  // Store previous price for flash detection
  useEffect(() => {
    const timer = setTimeout(() => {
      prevPriceRef.current = market.price;
    }, 100);
    return () => clearTimeout(timer);
  }, [market.price]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.2,
        delay: Math.min(index * 0.02, 0.3),
        ease: "easeOut",
      }}
      whileHover={isSelected ? undefined : { backgroundColor: "rgba(0,0,0,0.02)" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        "flex items-center justify-between py-2 px-2 cursor-pointer border-b border-zinc-200/70 dark:border-zinc-900 transition-all duration-200",
        isSelected && "bg-muted dark:bg-zinc-800 border-l-2 border-l-primary"
      )}
      onClick={() => onSelect(market.symbol)}
    >
      <div className="flex items-center flex-1">
        <StarButton
          isInWatchlist={isInWatchlist}
          onClick={(e) => onToggleWatchlist(market.symbol, marketType, e)}
        />

        {/* Futures Markets: 3-row layout */}
        {marketType === "futures" ? (
          <div className="flex flex-col flex-1">
            {/* Row 1: Symbol and badges */}
            <div className="flex items-center h-4 mb-1 gap-1">
              <div
                className={cn(
                  "font-medium text-xs transition-colors duration-200",
                  isSelected && "text-primary"
                )}
              >
                {market.displaySymbol}
              </div>

              {market.isTrending && (
                <AnimatedBadge
                  className="bg-emerald-100/70 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-700/50"
                  icon={<Zap className="h-2 w-2" />}
                >
                  {t("trending")}
                </AnimatedBadge>
              )}
              {market.isHot && !market.isTrending && (
                <AnimatedBadge
                  className="bg-red-100/70 dark:bg-red-900/70 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-700/50"
                  icon={<Flame className="h-2 w-2" />}
                >
                  {t("hot")}
                </AnimatedBadge>
              )}
              {market.isEco && (
                <AnimatedBadge className="bg-blue-100/70 dark:bg-blue-900/70 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-700/50">
                  {t("eco")}
                </AnimatedBadge>
              )}
              {market.type && (
                <AnimatedBadge
                  className={cn(
                    market.type === "futures"
                      ? "bg-blue-100/70 dark:bg-blue-900/70 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-700/50"
                      : "bg-emerald-100/70 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-700/50"
                  )}
                >
                  {market.type === "futures" ? "FUT" : "SPOT"}
                </AnimatedBadge>
              )}
              {market.leverage && market.leverage > 1 && (
                <AnimatedBadge className="bg-purple-100/70 dark:bg-purple-900/70 text-purple-700 dark:text-purple-400 border-purple-200/50 dark:border-purple-700/50">
                  {market.leverage}x
                </AnimatedBadge>
              )}
            </div>

            {/* Row 2: Volume and Price */}
            <div className="flex items-center justify-between h-3 mb-1">
              <motion.div
                className="text-[10px] text-muted-foreground dark:text-zinc-500"
                animate={{ opacity: market.volume ? 1 : 0.5 }}
              >
                {t("vol")} {market.volume || "--"}
              </motion.div>
              <PriceDisplay
                price={market.price}
                prevPrice={prevPriceRef.current}
                hasData={market.hasData}
              />
            </div>

            {/* Row 3: Change and Funding Rate */}
            <div className="flex items-center justify-between h-3">
              <ChangeIndicator
                change={market.change}
                isPositive={market.isPositive}
              />
              {market.fundingRate && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded",
                    Number(market.fundingRate.replace("%", "")) >= 0
                      ? "text-emerald-600 dark:text-green-400 bg-emerald-50 dark:bg-emerald-900/20"
                      : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                  )}
                  title={tTradeComponents("funding_rate")}
                >
                  {market.fundingRate}
                </motion.div>
              )}
            </div>
          </div>
        ) : (
          /* Spot Markets: Original 2-row layout */
          <div className="flex flex-col">
            <div className="flex items-center h-4 gap-1">
              <div
                className={cn(
                  "font-medium text-xs transition-colors duration-200",
                  isSelected && "text-primary"
                )}
              >
                {market.displaySymbol}
              </div>

              {market.isTrending && (
                <AnimatedBadge
                  className="bg-emerald-100/70 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-700/50"
                  icon={<Zap className="h-2 w-2" />}
                >
                  {t("trending")}
                </AnimatedBadge>
              )}
              {market.isHot && !market.isTrending && (
                <AnimatedBadge
                  className="bg-red-100/70 dark:bg-red-900/70 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-700/50"
                  icon={<Flame className="h-2 w-2" />}
                >
                  {t("hot")}
                </AnimatedBadge>
              )}
              {market.isEco && (
                <AnimatedBadge className="bg-blue-100/70 dark:bg-blue-900/70 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-700/50">
                  {t("eco")}
                </AnimatedBadge>
              )}
              {market.type && (
                <AnimatedBadge
                  className={cn(
                    market.type === "futures"
                      ? "bg-blue-100/70 dark:bg-blue-900/70 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-700/50"
                      : "bg-emerald-100/70 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-700/50"
                  )}
                >
                  {market.type === "futures" ? "FUT" : "SPOT"}
                </AnimatedBadge>
              )}
              {market.leverage && market.leverage > 1 && (
                <AnimatedBadge className="bg-purple-100/70 dark:bg-purple-900/70 text-purple-700 dark:text-purple-400 border-purple-200/50 dark:border-purple-700/50">
                  {market.leverage}x
                </AnimatedBadge>
              )}
            </div>
            <div className="h-3 mt-0.5">
              <motion.div
                className="text-[10px] text-muted-foreground dark:text-zinc-500"
                animate={{ opacity: market.volume ? 1 : 0.5 }}
              >
                {t("vol")} {market.volume || "--"}
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Right side: Price and change for spot markets only */}
      {marketType !== "futures" && (
        <div className="flex flex-col items-end">
          <div className="h-4">
            <PriceDisplay
              price={market.price}
              prevPrice={prevPriceRef.current}
              hasData={market.hasData}
            />
          </div>
          <div className="h-3 mt-0.5 flex items-center justify-end space-x-2">
            <ChangeIndicator
              change={market.change}
              isPositive={market.isPositive}
            />
            {market.fundingRate && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                  Number(market.fundingRate.replace("%", "")) >= 0
                    ? "text-emerald-600 dark:text-green-400 bg-emerald-50 dark:bg-emerald-900/20"
                    : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                )}
                title={tTradeComponents("funding_rate")}
              >
                {market.fundingRate}
              </motion.div>
            )}
          </div>
        </div>
      )}

    </motion.div>
  );
});
