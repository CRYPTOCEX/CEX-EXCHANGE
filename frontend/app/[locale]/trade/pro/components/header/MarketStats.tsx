"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import type { TickerData } from "../../types/market";

interface MarketStatsProps {
  ticker: TickerData;
  className?: string;
  pricePrecision?: number;
}

interface StatItemProps {
  label: string;
  value: string;
  valueClass?: string;
}

const StatItem = memo(function StatItem({
  label,
  value,
  valueClass,
}: StatItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide">
        {label}
      </span>
      <span
        className={cn(
          "text-xs font-mono text-[var(--tp-text-secondary)]",
          valueClass
        )}
      >
        {value}
      </span>
    </div>
  );
});

export const MarketStats = memo(function MarketStats({
  ticker,
  className,
  pricePrecision,
}: MarketStatsProps) {
  // Format price with precision or smart fallback
  const formatPrice = (price: number): string => {
    if (pricePrecision !== undefined) return price.toFixed(pricePrecision);
    // Fallback to smart formatting
    if (price >= 1000) return price.toFixed(2);
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
    <div className={cn("flex items-center gap-4", className)}>
      {/* 24h High */}
      <StatItem
        label="24h High"
        value={ticker.high ? formatPrice(ticker.high) : "-"}
        valueClass="text-[var(--tp-green)]"
      />

      {/* 24h Low */}
      <StatItem
        label="24h Low"
        value={ticker.low ? formatPrice(ticker.low) : "-"}
        valueClass="text-[var(--tp-red)]"
      />

      {/* 24h Volume */}
      <StatItem label="24h Vol" value={formatVolume(ticker.baseVolume || 0)} />

      {/* 24h Turnover */}
      <StatItem
        label="24h Turnover"
        value={`$${formatVolume(ticker.quoteVolume || 0)}`}
      />

      {/* Funding Rate (for futures) */}
      {ticker.fundingRate !== undefined && (
        <StatItem
          label="Funding"
          value={`${(ticker.fundingRate * 100).toFixed(4)}%`}
          valueClass={
            ticker.fundingRate >= 0
              ? "text-[var(--tp-green)]"
              : "text-[var(--tp-red)]"
          }
        />
      )}
    </div>
  );
});
