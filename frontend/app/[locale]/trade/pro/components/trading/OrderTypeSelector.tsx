"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import type { MarketType } from "../../types/common";
import { useTranslations } from "next-intl";

export type OrderType =
  | "market"
  | "limit"
  | "stop_market"
  | "stop_limit"
  | "trailing_stop"
  | "bracket"
  | "oco";

interface OrderTypeSelectorProps {
  value: OrderType;
  onChange: (type: OrderType) => void;
  marketType: MarketType;
}

interface OrderTypeConfig {
  id: OrderType;
  label: string;
  advanced?: boolean;
  disabled?: boolean;
}

const orderTypes: OrderTypeConfig[] = [
  { id: "limit", label: "Limit" },
  { id: "market", label: "Market" },
  { id: "stop_limit", label: "Stop-Limit" },
  { id: "stop_market", label: "Stop-Market" },
  // These are not yet implemented - hidden for now
  // { id: "trailing_stop", label: "Trailing", advanced: true, disabled: true },
  // { id: "bracket", label: "Bracket", advanced: true, disabled: true },
  // { id: "oco", label: "OCO", advanced: true, disabled: true },
];

// Stop-limit / stop-market are now supported on EVERY market type, including
// ecosystem (in-house DEX) markets — resting stops are held by the backend
// StopOrderMonitor and materialized into real orders when their trigger price is
// crossed, so nothing is gated by market type here anymore. `marketType` is kept
// on the props for future per-market gating.
export const OrderTypeSelector = memo(function OrderTypeSelector({
  value,
  onChange,
}: OrderTypeSelectorProps) {
  const t = useTranslations("common");
  return (
    // A 2×2 grid, not a wrapping flex row. Four pills of unequal width wrapped
    // into a ragged block against the 260–300px panel; equal cells give the
    // group one edge and let "Stop-Market" keep its label at every panel width.
    <div className="grid grid-cols-2 gap-1" role="tablist" aria-label={t("order_type")}>
      {orderTypes.map((type) => {
        const disabled = !!type.disabled;
        const selected = value === type.id;
        return (
          <button
            key={type.id}
            role="tab"
            aria-selected={selected}
            onClick={() => {
              if (!disabled) onChange(type.id);
            }}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded text-[11px] font-medium transition-colors",
              disabled
                ? "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] opacity-40 cursor-not-allowed"
                : selected
                  ? "bg-[var(--tp-blue)] text-[var(--tp-blue-fg)]"
                  : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-elevated)] hover:text-[var(--tp-text-primary)]"
            )}
          >
            {type.label}
          </button>
        );
      })}
    </div>
  );
});

export default OrderTypeSelector;
