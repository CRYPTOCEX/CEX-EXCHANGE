"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import type { MarketType } from "../../types/common";

interface MarketTypeToggleProps {
  activeType: MarketType;
  onChange: (type: MarketType) => void;
}

const marketTypes = [
  { id: "spot" as const, label: "Spot", description: "Buy & Sell" },
  { id: "futures" as const, label: "Futures", description: "Perpetual" },
  { id: "eco" as const, label: "Eco", description: "Ecosystem" },
];

export const MarketTypeToggle = memo(function MarketTypeToggle({
  activeType,
  onChange,
}: MarketTypeToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center",
        "bg-[var(--tp-bg-tertiary)]",
        "rounded-lg",
        "p-0.5"
      )}
    >
      {marketTypes.map((type) => (
        <button
          key={type.id}
          onClick={() => onChange(type.id)}
          className={cn(
            "px-4 py-1.5",
            "text-sm font-medium",
            "rounded-md",
            "transition-all duration-150",
            activeType === type.id
              ? "bg-[var(--tp-bg-elevated)] text-[var(--tp-text-primary)] shadow-sm"
              : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
          )}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
});
