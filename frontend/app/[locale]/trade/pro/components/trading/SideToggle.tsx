"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  const isFutures = marketType === "futures";

  return (
    <div
      role="tablist"
      aria-label={tCommon("order_side")}
      className="grid grid-cols-2 gap-1 p-1 rounded-md bg-[var(--tp-bg-tertiary)]"
    >
      <button
        role="tab"
        aria-selected={side === "buy"}
        onClick={() => onChange("buy")}
        className={cn(
          "py-1.5 rounded text-[13px] font-semibold transition-colors",
          side === "buy"
            ? "bg-[var(--tp-green)] text-[var(--tp-green-fg)]"
            : "text-[var(--tp-text-muted)] hover:bg-[var(--tp-bg-elevated)] hover:text-[var(--tp-green)]"
        )}
      >
        {isFutures ? t("buy_long") : tCommon("buy")}
      </button>
      <button
        role="tab"
        aria-selected={side === "sell"}
        onClick={() => onChange("sell")}
        className={cn(
          "py-1.5 rounded text-[13px] font-semibold transition-colors",
          side === "sell"
            ? "bg-[var(--tp-red)] text-[var(--tp-red-fg)]"
            : "text-[var(--tp-text-muted)] hover:bg-[var(--tp-bg-elevated)] hover:text-[var(--tp-red)]"
        )}
      >
        {isFutures ? t("sell_short") : tCommon("sell")}
      </button>
    </div>
  );
});

export default SideToggle;
