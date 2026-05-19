"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import type { MarketType } from "../../types/common";

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

export const OrderTypeSelector = memo(function OrderTypeSelector({
  value,
  onChange,
  marketType,
}: OrderTypeSelectorProps) {
  return (
    <div className="px-2 py-1.5 border-b border-[var(--tp-border)]">
      {/* Order types */}
      <div className="flex flex-wrap gap-1">
        {orderTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onChange(type.id)}
            className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded",
              "transition-colors",
              value === type.id
                ? "bg-[var(--tp-blue)] text-white"
                : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-elevated)]"
            )}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
});

export default OrderTypeSelector;
