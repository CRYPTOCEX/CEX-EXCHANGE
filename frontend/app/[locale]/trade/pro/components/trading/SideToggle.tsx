"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

export type OrderSide = "buy" | "sell";

interface SideToggleProps {
  side: OrderSide;
  onChange: (side: OrderSide) => void;
  marketType?: "spot" | "futures" | "eco";
}

export const SideToggle = memo(function SideToggle({
  side,
  onChange,
  marketType = "spot",
}: SideToggleProps) {
  const isFutures = marketType === "futures";
  const buyLabel = isFutures ? "Buy / Long" : "Buy";
  const sellLabel = isFutures ? "Sell / Short" : "Sell";

  return (
    <div className="flex border-b border-[var(--tp-border)]">
      <button
        onClick={() => onChange("buy")}
        className={cn(
          "flex-1 py-1.5 text-xs font-semibold",
          "transition-colors",
          side === "buy"
            ? "bg-[var(--tp-green)] text-white"
            : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] hover:text-[var(--tp-green)]"
        )}
      >
        {buyLabel}
      </button>
      <button
        onClick={() => onChange("sell")}
        className={cn(
          "flex-1 py-1.5 text-xs font-semibold",
          "transition-colors",
          side === "sell"
            ? "bg-[var(--tp-red)] text-white"
            : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] hover:text-[var(--tp-red)]"
        )}
      >
        {sellLabel}
      </button>
    </div>
  );
});

export default SideToggle;
