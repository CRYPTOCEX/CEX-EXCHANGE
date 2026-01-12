"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import type { OrderSide } from "./SideToggle";

interface BalanceDisplayProps {
  baseBalance?: number;
  quoteBalance?: number;
  baseCurrency?: string;
  quoteCurrency?: string;
  side: OrderSide;
  isLoading?: boolean;
  pricePrecision?: number;
  amountPrecision?: number;
}

export const BalanceDisplay = memo(function BalanceDisplay({
  baseBalance = 0,
  quoteBalance = 0,
  baseCurrency = "BTC",
  quoteCurrency = "USDT",
  side,
  isLoading = false,
  pricePrecision,
  amountPrecision,
}: BalanceDisplayProps) {
  const formatBalance = (value: number, precision?: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(precision ?? 4)}K`;
    // Use precision if provided
    if (precision !== undefined) return value.toFixed(precision);
    // Fallback to smart formatting
    if (value >= 1) return value.toFixed(4);
    return value.toFixed(8);
  };

  const displayBalance = side === "buy" ? quoteBalance : baseBalance;
  const displayCurrency = side === "buy" ? quoteCurrency : baseCurrency;
  // For buy side, we display quote currency (USDT) - use price precision
  // For sell side, we display base currency (BTC) - use amount precision
  const displayPrecision = side === "buy" ? pricePrecision : amountPrecision;

  return (
    <div className="flex items-center justify-between px-2 py-1 text-[10px]">
      <span className="text-[var(--tp-text-muted)]">Available</span>
      {isLoading ? (
        <div className="w-16 h-3 bg-[var(--tp-bg-tertiary)] animate-pulse rounded" />
      ) : (
        <span className="font-mono text-[var(--tp-text-secondary)]">
          {formatBalance(displayBalance, displayPrecision)}{" "}
          <span className="text-[var(--tp-text-muted)]">{displayCurrency}</span>
        </span>
      )}
    </div>
  );
});

export default BalanceDisplay;
