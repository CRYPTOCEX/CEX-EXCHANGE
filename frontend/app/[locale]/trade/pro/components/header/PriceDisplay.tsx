"use client";

import React, { memo, useRef, useEffect } from "react";
import { cn } from "../../utils/cn";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PriceDisplayProps {
  price: number;
  change: number;
  direction: "up" | "down" | "neutral";
  decimals?: number;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  compact?: boolean;
}

function formatPrice(price: number, decimals: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (price >= 1) {
    return price.toFixed(decimals);
  }

  // For very small numbers, show more decimals
  return price.toFixed(Math.max(decimals, 6));
}

export const PriceDisplay = memo(function PriceDisplay({
  price,
  change,
  direction,
  decimals = 2,
  showIcon = true,
  size = "md",
  compact = false,
}: PriceDisplayProps) {
  const priceRef = useRef<HTMLSpanElement>(null);
  const prevPriceRef = useRef(price);

  // Flash animation on price change
  useEffect(() => {
    if (price !== prevPriceRef.current && priceRef.current) {
      priceRef.current.classList.remove("tp-flash-green", "tp-flash-red");

      // Force reflow
      void priceRef.current.offsetWidth;

      if (price > prevPriceRef.current) {
        priceRef.current.classList.add("tp-flash-green");
      } else if (price < prevPriceRef.current) {
        priceRef.current.classList.add("tp-flash-red");
      }

      prevPriceRef.current = price;
    }
  }, [price]);

  const isPositive = change >= 0;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-base",
    lg: "text-lg",
  };

  const effectiveSize = compact ? "sm" : size;

  return (
    <div className={cn("tp-price-display flex items-center", compact ? "gap-1" : "gap-2")}>
      {/* Price */}
      <span
        ref={priceRef}
        className={cn(
          "font-mono font-semibold",
          sizeClasses[effectiveSize],
          direction === "up" && "text-[var(--tp-green)]",
          direction === "down" && "text-[var(--tp-red)]",
          direction === "neutral" && "text-[var(--tp-text-primary)]",
          "transition-colors duration-200",
          compact ? "px-0.5" : "px-1",
          "rounded"
        )}
      >
        {formatPrice(price, decimals)}
      </span>

      {/* Change percentage */}
      <div
        className={cn(
          "flex items-center gap-0.5 rounded",
          compact ? "px-1 py-0.5" : "px-1.5 py-0.5",
          isPositive
            ? "bg-[var(--tp-green-bg)] text-[var(--tp-green)]"
            : "bg-[var(--tp-red-bg)] text-[var(--tp-red)]"
        )}
      >
        {showIcon && !compact &&
          (isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
        <span className={cn("font-medium font-mono", compact ? "text-[10px]" : "text-xs")}>
          {isPositive ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      </div>
    </div>
  );
});
