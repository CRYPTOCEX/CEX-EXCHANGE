"use client";

/**
 * Compact form primitives for the Algo panel.
 *
 * These are deliberately local rather than shadcn: the panel lives in a ~300px
 * column beside the order book, and it must render identically in the Pro
 * workspace and the Standard layout — so it drives the `--algo-*` tokens from
 * `algo.css`, which chain to `--tp-*` when Pro is installed and to the app's
 * design tokens when it is not. It cannot import from `trade/pro/`: that tree
 * is optional and may be absent entirely.
 *
 * The measurements below are NOT free choices — they mirror the order form one
 * tab over, control for control, because all three tabs share a single column
 * and a user switching tabs should not feel the type ramp and control heights
 * change under them:
 *
 *   field height   32px      label    10px uppercase, tracking-wide, muted
 *   radius         6px       value    13px mono, tabular
 *   column gap     10px      readout  10px label / 11px mono value
 *
 * Anything that was 9px or 26px here is now 10px or 32px for that reason.
 */

import React, { memo, useCallback, useId, useState } from "react";
import { ChevronDown, Minus, Plus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export const FieldLabel = memo(function FieldLabel({
  children,
  hint,
  htmlFor,
}: {
  children: React.ReactNode;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex min-h-[14px] items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[var(--algo-text-muted)]"
    >
      {children}
      {hint && (
        <span title={hint} className="inline-flex cursor-help">
          <Info className="h-2.5 w-2.5" />
        </span>
      )}
    </label>
  );
});

export const Section = memo(function Section({
  title,
  children,
  defaultOpen = true,
  collapsible = false,
  action,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;

  return (
    <div className="border-t border-[var(--algo-border-subtle)] first:border-t-0">
      <div className="flex items-center justify-between px-2 pt-2.5 pb-1.5">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--algo-text-dim)] transition-colors hover:text-[var(--algo-text)]"
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-150",
                !isOpen && "-rotate-90"
              )}
            />
            {title}
          </button>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--algo-text-dim)]">
            {title}
          </span>
        )}
        {action}
      </div>
      {isOpen && <div className="space-y-2.5 px-2 pb-2.5">{children}</div>}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Number input                                                        */
/* ------------------------------------------------------------------ */

export const NumberField = memo(function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
  hint,
  disabled,
  placeholder,
  showSteppers = true,
}: {
  label?: string;
  value: number | string;
  onChange: (value: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  disabled?: boolean;
  placeholder?: string;
  showSteppers?: boolean;
}) {
  const id = useId();

  const clamp = useCallback(
    (next: number) => {
      let v = next;
      if (min !== undefined && v < min) v = min;
      if (max !== undefined && v > max) v = max;
      // Kill float drift from repeated stepping (0.1 + 0.2 style artefacts).
      return Number(v.toFixed(8));
    },
    [min, max]
  );

  const nudge = useCallback(
    (direction: 1 | -1) => {
      const current = Number(value) || 0;
      onChange(clamp(current + step * direction));
    },
    [value, step, onChange, clamp]
  );

  return (
    <div className="space-y-1">
      {label && (
        <FieldLabel htmlFor={id} hint={hint}>
          {label}
        </FieldLabel>
      )}
      <div className="relative flex items-center">
        {showSteppers && (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => nudge(-1)}
            aria-label={`Decrease ${label ?? "value"}`}
            className="absolute left-0 z-10 flex h-8 w-7 items-center justify-center rounded-l-md text-[var(--algo-text-muted)] transition-colors hover:bg-[var(--algo-bg-elevated)] hover:text-[var(--algo-text)] disabled:opacity-40"
          >
            <Minus className="h-3 w-3" />
          </button>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          step={step}
          onChange={(e) => {
            const raw = e.target.value;
            // Let the field go empty while typing instead of snapping to 0.
            onChange(raw === "" ? (0 as number) : Number(raw));
          }}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(clamp(v));
          }}
          className={cn(
            "algo-input h-8 text-[13px]",
            showSteppers ? "px-7 text-center" : "px-2.5",
            unit && !showSteppers && "pr-11"
          )}
        />
        {showSteppers && (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => nudge(1)}
            aria-label={`Increase ${label ?? "value"}`}
            className="absolute right-0 z-10 flex h-8 w-7 items-center justify-center rounded-r-md text-[var(--algo-text-muted)] transition-colors hover:bg-[var(--algo-bg-elevated)] hover:text-[var(--algo-text)] disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
        {unit && !showSteppers && (
          <span className="pointer-events-none absolute right-2.5 text-[11px] font-medium text-[var(--algo-text-muted)]">
            {unit}
          </span>
        )}
      </div>
      {unit && showSteppers && (
        <div className="text-right text-[10px] text-[var(--algo-text-muted)]">
          {unit}
        </div>
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  size = "md",
}: {
  label?: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  hint?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className="space-y-1">
      {label && <FieldLabel hint={hint}>{label}</FieldLabel>}
      <div
        role="tablist"
        className="flex gap-0.5 rounded-md bg-[var(--algo-bg-raised)] p-1"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded font-medium transition-all duration-150",
                size === "sm" ? "h-[22px] text-[10px]" : "h-[26px] text-[11px]",
                // Filled with the INTERACTION accent, not the strategy accent:
                // there is no ink that clears 4.5:1 on both the yellow and the
                // green strategy, and this one carries a label.
                active
                  ? "bg-[var(--algo-blue)] text-[var(--algo-blue-fg)] shadow-sm"
                  : "text-[var(--algo-text-muted)] hover:bg-[var(--algo-bg-elevated)] hover:text-[var(--algo-text)]"
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Select                                                              */
/* ------------------------------------------------------------------ */

export const SelectField = memo(function SelectField({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      {label && (
        <FieldLabel htmlFor={id} hint={hint}>
          {label}
        </FieldLabel>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="algo-input h-8 cursor-pointer appearance-none px-2.5 pr-7 text-[13px]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--algo-text-muted)]" />
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Slider                                                              */
/* ------------------------------------------------------------------ */

export const SliderField = memo(function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <FieldLabel hint={hint}>{label}</FieldLabel>
        <span className="algo-num text-[12px] font-semibold text-[var(--algo-text)]">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        className="algo-range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Switch row                                                          */
/* ------------------------------------------------------------------ */

export const SwitchRow = memo(function SwitchRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[16px] w-[28px] shrink-0 rounded-full transition-colors duration-150",
          checked ? "bg-[var(--algo-accent)]" : "bg-[var(--algo-bg-elevated)]"
        )}
      >
        <span
          className={cn(
            // `bg-background`, not `bg-white`: the same thumb token
            // `components/ui/switch` uses, so it follows the theme.
            "absolute top-[2px] h-[12px] w-[12px] rounded-full bg-background transition-transform duration-150",
            checked ? "translate-x-[14px]" : "translate-x-[2px]"
          )}
        />
      </button>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Percentage picker                                                   */
/* ------------------------------------------------------------------ */

const PERCENT_STOPS = [0, 25, 50, 75, 100];

/**
 * Continuous 0–100% picker with clickable stops.
 *
 * Same control as the order form's position-size slider — allocating capital to
 * a bot is the same decision as sizing an order, so it gets the same instrument
 * rather than a row of 9px chips that could only express four of a hundred
 * choices and never showed where the current value sat.
 */
export const PercentSlider = memo(function PercentSlider({
  value,
  onSelect,
  disabled,
}: {
  /** Current position on the 0–100 scale. */
  value: number;
  onSelect: (percent: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("trade_components");
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn("select-none", disabled && "opacity-50")}>
      <div className="relative flex h-4 items-center">
        <div className="algo-slider-rail absolute inset-x-0" />
        <div className="algo-slider-fill absolute left-0" style={{ width: `${pct}%` }} />

        {PERCENT_STOPS.slice(1, -1).map((stop) => (
          <span
            key={stop}
            aria-hidden
            className={cn(
              "algo-slider-notch pointer-events-none absolute",
              pct >= stop && "algo-slider-notch-filled"
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
          aria-label={t("allocation_as_percentage_of_balance")}
          onChange={(e) => onSelect(Number(e.target.value))}
          className="algo-slider-input relative"
        />
      </div>

      <div className="mt-0.5 flex items-center justify-between">
        {PERCENT_STOPS.map((stop) => (
          <button
            key={stop}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(stop)}
            className={cn(
              "algo-num rounded px-1 py-0.5 text-[10px] font-medium transition-colors hover:bg-[var(--algo-bg-elevated)]",
              pct === stop
                ? "text-[var(--algo-text)]"
                : "text-[var(--algo-text-muted)]"
            )}
          >
            {stop}%
          </button>
        ))}
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Readout rows                                                        */
/* ------------------------------------------------------------------ */

export const StatRow = memo(function StatRow({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
  hint?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-[var(--algo-green)]"
      : tone === "negative"
        ? "text-[var(--algo-red)]"
        : tone === "warning"
          ? "text-[var(--algo-yellow)]"
          : "text-[var(--algo-text)]";

  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className="flex items-center gap-1 text-[10px] text-[var(--algo-text-muted)]"
        title={hint}
      >
        {label}
        {hint && <Info className="h-2.5 w-2.5 cursor-help" />}
      </span>
      <span className={cn("algo-num text-[11px] font-medium", toneClass)}>
        {value}
      </span>
    </div>
  );
});
