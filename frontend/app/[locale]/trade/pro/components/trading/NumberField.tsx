"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { useTranslations } from "next-intl";

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Rendered on the right of the label row — quick-fill buttons, hints, etc. */
  hint?: React.ReactNode;
  /** Currency code shown inside the field, after the value. */
  suffix?: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Adds the up/down stepper column on the trailing edge. */
  onStep?: (direction: 1 | -1) => void;
  className?: string;
  inputClassName?: string;
}

/**
 * The one text field the trading form uses.
 *
 * Price, stop price, amount and order value were three near-identical blocks
 * that had already drifted apart (different heights, one had a stepper, one had
 * a suffix, none had an invalid state). They are one control now, so the panel
 * reads as a single column of same-height fields instead of a stack of
 * one-offs.
 */
export const NumberField = memo(function NumberField({
  label,
  value,
  onChange,
  hint,
  suffix,
  placeholder,
  invalid = false,
  disabled = false,
  onStep,
  className,
  inputClassName,
}: NumberFieldProps) {
  const t = useTranslations("trade_pro");
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    // Allow empty, numbers, and decimals
    if (next === "" || /^\d*\.?\d*$/.test(next)) {
      onChange(next);
    }
  };

  return (
    <div className={cn("tp-number-field", className)}>
      <div className="flex items-center justify-between gap-2 mb-1 min-h-[14px]">
        <label className="text-[10px] font-medium uppercase tracking-wide text-[var(--tp-text-muted)]">
          {label}
        </label>
        {hint}
      </div>

      <div
        className={cn(
          "flex items-stretch rounded-md border transition-colors",
          "bg-[var(--tp-bg-tertiary)]",
          disabled && "opacity-50",
          invalid
            ? "border-[var(--tp-red)]"
            : "border-[var(--tp-border)] focus-within:border-[var(--tp-blue)]"
        )}
      >
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label}
          aria-invalid={invalid || undefined}
          className={cn(
            "flex-1 min-w-0 h-8 px-2.5",
            "bg-transparent",
            "text-[13px] font-mono tabular-nums text-[var(--tp-text-primary)]",
            "placeholder:text-[var(--tp-text-disabled)]",
            "outline-none",
            inputClassName
          )}
        />

        {suffix && (
          <span className="flex items-center pr-2.5 text-[11px] font-medium text-[var(--tp-text-muted)]">
            {suffix}
          </span>
        )}

        {onStep && (
          <div className="flex flex-col border-l border-[var(--tp-border)]">
            <button
              type="button"
              tabIndex={-1}
              aria-label={t("increase", { label: String(label) })}
              onClick={() => onStep(1)}
              className="flex-1 px-1.5 flex items-center text-[var(--tp-text-muted)] hover:text-[var(--tp-text-primary)] hover:bg-[var(--tp-bg-elevated)] transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label={t("decrease", { label: String(label) })}
              onClick={() => onStep(-1)}
              className="flex-1 px-1.5 flex items-center border-t border-[var(--tp-border)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-primary)] hover:bg-[var(--tp-bg-elevated)] transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

/** Small link-styled button used in the `hint` slot (Market / Max / …). */
export const FieldAction = memo(function FieldAction({
  onClick,
  children,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "shrink-0 px-1 -mr-1 rounded",
        "text-[10px] font-mono tabular-nums",
        "text-[var(--tp-blue)] hover:bg-[var(--tp-blue-bg)]",
        "transition-colors"
      )}
    >
      {children}
    </button>
  );
});

export default NumberField;
