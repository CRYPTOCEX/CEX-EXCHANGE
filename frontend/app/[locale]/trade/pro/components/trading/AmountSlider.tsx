"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { useTranslations } from "next-intl";

interface AmountSliderProps {
  /** Current fill as a percentage of the max tradable amount (0–100). */
  value: number;
  onChange: (percentage: number) => void;
  /**
   * CSS colour for the fill and thumb. Direction colour in the order form,
   * where the control sizes a buy or a sell; the interaction accent everywhere
   * else, where there is no direction to signal.
   */
  accent?: string;
  disabled?: boolean;
}

const STOPS = [0, 25, 50, 75, 100];

/**
 * Position sizing as a continuous control.
 *
 * The four 25/50/75/100 buttons this replaces were 14px tall, gave no feedback
 * about where the current amount actually sat, and could only express four of
 * the hundred sizes a trader might want. The stop labels underneath keep the
 * one-click presets.
 */
export const AmountSlider = memo(function AmountSlider({
  value,
  onChange,
  accent = "var(--tp-blue)",
  disabled = false,
}: AmountSliderProps) {
  const t = useTranslations("trade_pro");
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div
      className={cn("tp-amount-slider select-none", disabled && "opacity-50")}
      style={{ "--tp-slider-accent": accent } as React.CSSProperties}
    >
      <div className="relative flex items-center h-4">
        {/* Rail */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-[var(--tp-bg-elevated)]" />

        {/* Filled portion */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-[var(--tp-slider-accent)]"
          style={{ width: `${pct}%` }}
        />

        {/* Quarter markers. Pointer events stay off so they never swallow a
            drag — the labels below are the clickable presets. */}
        {STOPS.slice(1, -1).map((stop) => (
          <span
            key={stop}
            aria-hidden
            className={cn(
              // Centred on both axes explicitly — the static position of an
              // abspos flex child is not a reliable placement.
              "absolute top-1/2 w-[5px] h-[5px] rotate-45 -translate-x-1/2 -translate-y-1/2 pointer-events-none border",
              pct >= stop
                ? "bg-[var(--tp-slider-accent)] border-[var(--tp-slider-accent)]"
                : "bg-[var(--tp-bg-secondary)] border-[var(--tp-border)]"
            )}
            style={{ left: `${stop}%` }}
          />
        ))}

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          disabled={disabled}
          aria-label={t("order_size_as_percentage_of_balance")}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className={cn(
            "relative w-full h-4 appearance-none bg-transparent",
            "outline-none cursor-pointer disabled:cursor-not-allowed",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-3",
            "[&::-webkit-slider-thumb]:h-3",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-[var(--tp-slider-accent)]",
            "[&::-webkit-slider-thumb]:border-2",
            "[&::-webkit-slider-thumb]:border-[var(--tp-bg-secondary)]",
            "[&::-webkit-slider-thumb]:shadow-sm",
            "[&::-webkit-slider-thumb]:cursor-grab",
            "[&::-moz-range-thumb]:w-3",
            "[&::-moz-range-thumb]:h-3",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-[var(--tp-slider-accent)]",
            "[&::-moz-range-thumb]:border-2",
            "[&::-moz-range-thumb]:border-[var(--tp-bg-secondary)]",
            "[&::-moz-range-thumb]:cursor-grab"
          )}
        />
      </div>

      <div className="flex items-center justify-between mt-0.5">
        {STOPS.map((stop) => (
          <button
            key={stop}
            type="button"
            disabled={disabled}
            onClick={() => onChange(stop)}
            className={cn(
              "px-1 py-0.5 rounded text-[10px] font-medium tabular-nums transition-colors",
              "hover:bg-[var(--tp-bg-elevated)]",
              pct === stop
                ? "text-[var(--tp-text-primary)]"
                : "text-[var(--tp-text-muted)]"
            )}
          >
            {stop}%
          </button>
        ))}
      </div>
    </div>
  );
});

export default AmountSlider;
