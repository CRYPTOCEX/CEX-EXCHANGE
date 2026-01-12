"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  max?: number;
  precision?: number;
  currency?: string;
  label?: string;
  placeholder?: string;
}

export const AmountInput = memo(function AmountInput({
  value,
  onChange,
  max = 0,
  precision = 4,
  currency = "BTC",
  label = "Amount",
  placeholder,
}: AmountInputProps) {
  // Generate placeholder based on precision if not provided
  const displayPlaceholder = placeholder ?? (0).toFixed(precision);

  const setMax = () => {
    if (max > 0) {
      onChange(max.toFixed(precision));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Allow empty, numbers, and decimals
    if (newValue === "" || /^\d*\.?\d*$/.test(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className="tp-amount-input">
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[10px] text-[var(--tp-text-muted)]">{label}</label>
        {max > 0 && (
          <button
            onClick={setMax}
            className="text-[10px] text-[var(--tp-blue)] hover:text-[var(--tp-blue)]/80"
          >
            Max: {max.toFixed(precision)} {currency}
          </button>
        )}
      </div>

      <div className="flex items-center bg-[var(--tp-bg-tertiary)] rounded border border-[var(--tp-border)] focus-within:border-[var(--tp-blue)]">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder={displayPlaceholder}
          className={cn(
            "flex-1 px-2 py-1",
            "bg-transparent",
            "text-[var(--tp-text-primary)] text-xs font-mono",
            "outline-none"
          )}
        />
        <span className="px-2 text-[10px] text-[var(--tp-text-muted)]">{currency}</span>
      </div>
    </div>
  );
});

export default AmountInput;
