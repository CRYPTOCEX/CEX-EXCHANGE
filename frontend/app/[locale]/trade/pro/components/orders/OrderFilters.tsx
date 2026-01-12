"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

export interface OrderFiltersState {
  symbol: string;
  side: string;
  hideOther: boolean;
}

interface OrderFiltersProps {
  filters: OrderFiltersState;
  onChange: (filters: OrderFiltersState) => void;
  currentSymbol: string;
}

export const OrderFilters = memo(function OrderFilters({
  filters,
  onChange,
  currentSymbol,
}: OrderFiltersProps) {
  const handleChange = (key: keyof OrderFiltersState, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Hide other symbols toggle */}
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.hideOther}
          onChange={(e) => handleChange("hideOther", e.target.checked)}
          className="w-3.5 h-3.5 rounded border-[var(--tp-border)] bg-[var(--tp-bg-tertiary)] accent-[var(--tp-blue)]"
        />
        <span className="text-[10px] text-[var(--tp-text-muted)]">
          {currentSymbol} only
        </span>
      </label>

      {/* Side filter */}
      <select
        value={filters.side}
        onChange={(e) => handleChange("side", e.target.value)}
        className={cn(
          "px-2 py-1",
          "text-[10px]",
          "bg-[var(--tp-bg-tertiary)]",
          "border border-[var(--tp-border)]",
          "rounded",
          "text-[var(--tp-text-secondary)]",
          "outline-none focus:border-[var(--tp-blue)]",
          "cursor-pointer"
        )}
      >
        <option value="">All Sides</option>
        <option value="BUY">Buy Only</option>
        <option value="SELL">Sell Only</option>
      </select>
    </div>
  );
});

export default OrderFilters;
