"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import type { TickerData } from "../../types/market";
import { useTranslations } from "next-intl";

interface MarketStatsProps {
  ticker: TickerData;
  className?: string;
  pricePrecision?: number;
  quoteCurrency?: string;
}

interface StatItemProps {
  label: string;
  value: string;
  valueClass?: string;
  /** Native tooltip, for figures that need a caveat the row has no space for. */
  title?: string;
}

const StatItem = memo(function StatItem({
  label,
  value,
  valueClass,
  title,
}: StatItemProps) {
  return (
    <div className="flex flex-col" title={title}>
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
  quoteCurrency,
}: MarketStatsProps) {
  const tTrade = useTranslations("trade");
  const tCommon = useTranslations('common');
  // Determine the currency symbol/label for turnover display
  const isUsdLike = !quoteCurrency || ["USDT", "USDC", "BUSD", "USD", "DAI"].includes(quoteCurrency.toUpperCase());
  const turnoverPrefix = isUsdLike ? "$" : "";
  const turnoverSuffix = isUsdLike ? "" : ` ${quoteCurrency}`;
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
        label={`24h ${tCommon('high')}`}
        value={ticker.high ? formatPrice(ticker.high) : "-"}
        valueClass="text-[var(--tp-green)]"
      />

      {/* 24h Low */}
      <StatItem
        label={`24h ${tCommon('low')}`}
        value={ticker.low ? formatPrice(ticker.low) : "-"}
        valueClass="text-[var(--tp-red)]"
      />

      {/* 24h Volume */}
      <StatItem label={`24h ${tCommon('vol')}`} value={formatVolume(ticker.baseVolume || 0)} />

      {/* 24h Turnover */}
      <StatItem
        label={`24h ${tCommon('turnover')}`}
        value={`${turnoverPrefix}${formatVolume(ticker.quoteVolume || 0)}${turnoverSuffix}`}
      />

      {/* Funding rate, when the feed supplies one. This desk DOES settle
          funding — `settleFuturesFunding` debits payers and credits receivers
          at each window — so the figure is a charge against an open position
          and carries no disclaimer. `!= null` rather than `!== undefined` so an
          explicit null is treated as absent too. */}
      {ticker.fundingRate != null && (
        <StatItem
          label={tCommon("funding_rate")}
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
