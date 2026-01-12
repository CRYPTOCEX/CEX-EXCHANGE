"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { useRouter } from "@/i18n/routing";

interface MobileHeaderProps {
  symbol: string;
  currentPrice?: number;
  priceChange24h?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  onSymbolPress: () => void;
  className?: string;
  pricePrecision?: number;
}

export const MobileHeader = memo(function MobileHeader({
  symbol,
  currentPrice,
  priceChange24h = 0,
  high24h,
  low24h,
  volume24h,
  onSymbolPress,
  className,
  pricePrecision,
}: MobileHeaderProps) {
  const router = useRouter();
  const isPositive = priceChange24h >= 0;

  // Format price with precision or smart fallback
  const formatPrice = (price: number) => {
    if (pricePrecision !== undefined) return price.toFixed(pricePrecision);
    // Fallback to smart formatting
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(6);
    return price.toFixed(8);
  };

  // Format volume
  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  const handleBack = () => {
    router.push("/trade");
  };

  return (
    <header
      className={cn(
        "bg-[var(--tp-bg-secondary)]",
        "border-b border-[var(--tp-border)]",
        "safe-area-inset-top",
        className
      )}
    >
      {/* Top row: Back button, Symbol, Price, Change */}
      <div className="flex items-center px-3 py-2">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="p-2 -ml-2 text-[var(--tp-text-secondary)] hover:text-[var(--tp-text-primary)] transition-colors"
          aria-label="Go back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Symbol selector */}
        <button
          onClick={onSymbolPress}
          className="flex items-center gap-1.5 ml-1 px-2 py-1 rounded-md hover:bg-[var(--tp-bg-tertiary)] transition-colors"
        >
          <span className="text-base font-bold text-[var(--tp-text-primary)]">
            {symbol}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-[var(--tp-text-muted)]"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price and change */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold font-mono text-[var(--tp-text-primary)]">
            {currentPrice ? formatPrice(currentPrice) : "---"}
          </span>
          <span
            className={cn(
              "px-2 py-0.5 rounded text-sm font-semibold font-mono",
              isPositive
                ? "bg-[var(--tp-green)]/15 text-[var(--tp-green)]"
                : "bg-[var(--tp-red)]/15 text-[var(--tp-red)]"
            )}
          >
            {isPositive ? "+" : ""}
            {priceChange24h.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Bottom row: 24h stats */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--tp-bg-primary)]/50 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-[var(--tp-text-muted)]">24h High</span>
          <span className="font-mono text-[var(--tp-green)]">
            {high24h ? formatPrice(high24h) : "---"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[var(--tp-text-muted)]">24h Low</span>
          <span className="font-mono text-[var(--tp-red)]">
            {low24h ? formatPrice(low24h) : "---"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[var(--tp-text-muted)]">24h Vol</span>
          <span className="font-mono text-[var(--tp-text-secondary)]">
            {volume24h ? formatVolume(volume24h) : "---"}
          </span>
        </div>
      </div>
    </header>
  );
});

export default MobileHeader;
