"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { PriceDisplay } from "./PriceDisplay";
import { ChevronDown } from "lucide-react";
import type { TickerData } from "../../types/market";

interface SymbolDisplayProps {
  symbol: string;
  ticker: TickerData | null;
  priceDirection: "up" | "down" | "neutral";
  onClick?: () => void;
  compact?: boolean;
  pricePrecision?: number;
}

function formatSymbol(symbol: string): string {
  // If already has a slash, return as-is (clean up any extra characters)
  if (symbol.includes("/")) {
    // Remove any dash before the slash (BTC-/USDT -> BTC/USDT)
    return symbol.replace(/-?\//g, "/");
  }

  // Handle symbols with dash separator (BTC-USDT -> BTC/USDT)
  if (symbol.includes("-")) {
    return symbol.replace("-", "/");
  }

  // Common base currencies to split on
  const quoteCurrencies = ["USDT", "USDC", "BUSD", "USD", "BTC", "ETH", "BNB"];

  for (const quote of quoteCurrencies) {
    if (symbol.endsWith(quote)) {
      const base = symbol.slice(0, -quote.length);
      return `${base}/${quote}`;
    }
  }

  return symbol;
}

export const SymbolDisplay = memo(function SymbolDisplay({
  symbol,
  ticker,
  priceDirection,
  onClick,
  compact = false,
  pricePrecision,
}: SymbolDisplayProps) {
  // Parse symbol to display (e.g., BTCUSDT -> BTC/USDT)
  const displaySymbol = formatSymbol(symbol);

  const content = (
    <>
      {/* Symbol name */}
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "tp-symbol-display font-semibold text-[var(--tp-text-primary)]",
          compact ? "text-sm" : "text-lg"
        )}>
          {displaySymbol}
        </span>
        {onClick && (
          <ChevronDown
            size={compact ? 14 : 16}
            className="text-[var(--tp-text-muted)] group-hover:text-[var(--tp-text-secondary)] transition-colors shrink-0"
          />
        )}
      </div>

      {/* Price display */}
      {ticker && (
        <PriceDisplay
          price={ticker.last}
          change={ticker.percentage}
          direction={priceDirection}
          compact={compact}
          decimals={pricePrecision}
        />
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex items-center",
          compact ? "gap-2 px-2 py-1 -mx-2" : "gap-3 px-3 py-1.5 -mx-3",
          "rounded-lg",
          "hover:bg-[var(--tp-bg-tertiary)]",
          "transition-colors",
          "group",
          "min-w-0"
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn(
      "flex items-center",
      compact ? "gap-2" : "gap-3",
      "min-w-0"
    )}>
      {content}
    </div>
  );
});
