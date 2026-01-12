"use client";

import React, { memo, useCallback } from "react";
import { cn } from "../../utils/cn";

interface PriceInputProps {
  value: string;
  onChange: (value: string) => void;
  currentPrice: number | null;
  precision?: number;
  label?: string;
  className?: string;
  placeholder?: string;
}

export const PriceInput = memo(function PriceInput({
  value,
  onChange,
  currentPrice,
  precision = 2,
  label = "Price",
  className,
  placeholder,
}: PriceInputProps) {
  const step = Math.pow(10, -precision);

  // Generate placeholder based on precision if not provided
  const displayPlaceholder = placeholder ?? (0).toFixed(precision);

  const increment = useCallback(() => {
    const current = parseFloat(value) || currentPrice || 0;
    onChange((current + step).toFixed(precision));
  }, [value, currentPrice, step, precision, onChange]);

  const decrement = useCallback(() => {
    const current = parseFloat(value) || currentPrice || 0;
    const newValue = current - step;
    if (newValue > 0) {
      onChange(newValue.toFixed(precision));
    }
  }, [value, currentPrice, step, precision, onChange]);

  const setToMarket = useCallback(() => {
    if (currentPrice) {
      onChange(currentPrice.toFixed(precision));
    }
  }, [currentPrice, precision, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Allow empty, numbers, and decimals
    if (newValue === "" || /^\d*\.?\d*$/.test(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className={cn("tp-price-input", className)}>
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[10px] text-[var(--tp-text-muted)]">{label}</label>
        {currentPrice && (
          <button
            onClick={setToMarket}
            className="text-[10px] text-[var(--tp-blue)] hover:text-[var(--tp-blue)]/80"
          >
            Market: {currentPrice.toFixed(precision)}
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

        <div className="flex flex-col border-l border-[var(--tp-border)]">
          <button
            type="button"
            onClick={increment}
            className="px-1.5 py-px text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-elevated)] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={decrement}
            className="px-1.5 py-px text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-elevated)] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

export default PriceInput;
