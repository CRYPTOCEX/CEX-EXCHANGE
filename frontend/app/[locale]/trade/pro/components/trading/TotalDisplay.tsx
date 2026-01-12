"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

interface TotalDisplayProps {
  total: number;
  currency?: string;
  label?: string;
  precision?: number;
}

export const TotalDisplay = memo(function TotalDisplay({
  total,
  currency = "USDT",
  label = "Total",
  precision,
}: TotalDisplayProps) {
  const formatTotal = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    // Use precision if provided, otherwise smart format
    if (precision !== undefined) return value.toFixed(precision);
    if (value >= 1) return value.toFixed(4);
    return value.toFixed(8);
  };

  return (
    <div className="flex items-center justify-between py-1 px-2 bg-[var(--tp-bg-tertiary)] rounded">
      <span className="text-[10px] text-[var(--tp-text-muted)]">{label}</span>
      <span className="text-xs font-mono text-[var(--tp-text-primary)]">
        {formatTotal(total)} <span className="text-[var(--tp-text-muted)]">{currency}</span>
      </span>
    </div>
  );
});

export default TotalDisplay;
