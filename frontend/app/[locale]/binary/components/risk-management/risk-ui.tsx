"use client";

/**
 * Risk & Settings UI kit — shared primitives for the binary terminal's
 * settings overlay and risk-management panels.
 *
 * Why this file exists
 * --------------------
 * The sixteen files in `settings/` and `risk-management/` had rebuilt the same
 * four shapes over and over: a labelled row of preset buttons, a numeric field
 * with a unit suffix, a pill toggle, and a tinted notice strip. Each rebuild
 * carried its own hand-written light/dark colour fork, which is how the tree
 * accumulated three neutral ramps and three spellings of every status colour.
 *
 * Colour rules enforced here (see plans/DESIGN-SYSTEM.md §2):
 *   - Tokens only. No `dark:` variants and no theme forks in JS — a token class
 *     is already correct in both themes.
 *   - Colour marks a STATE, never furniture. A field label, a section header
 *     and a satisfied setting are all neutral; hue is reserved for deviation.
 *   - On a status tint, the hue goes on the ICON and the label stays
 *     `text-foreground`. `--warning` / `--destructive` / `--success` measure
 *     2.8–3.6:1 as small text on their own tint in light mode, so a coloured
 *     label inside a coloured strip is unreadable there.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// TONES
// ============================================================================

/**
 * The only status vocabulary this cluster uses.
 *
 *   neutral     — within limits, not configured, disabled. The DEFAULT.
 *   accent      — interactive: a toggle that is on, a selected option.
 *   warning     — approaching a limit, cooldown running, risky mode armed.
 *   danger      — limit breached, order blocked, trading locked.
 *   up / down   — profit and loss DIRECTION only (R1).
 */
export type Tone = "neutral" | "accent" | "info" | "warning" | "danger" | "up" | "down";

/** Solid fills — meters, dots, progress. */
const TONE_FILL: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  accent: "bg-primary",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-destructive",
  up: "bg-up",
  down: "bg-down",
};

/**
 * Ink. Only ever used on a NEUTRAL ground (card / surface-2 / surface-3),
 * never inside a tint of the same hue — that is the light-mode contrast trap.
 */
const TONE_INK: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  accent: "text-primary",
  info: "text-info",
  warning: "text-warning",
  danger: "text-destructive",
  up: "text-up",
  down: "text-down",
};

/** Panel tint + hairline for a strip that is signalling something. */
const TONE_TINT: Record<Tone, string> = {
  neutral: "bg-surface-2 border border-transparent",
  accent: "bg-primary/10 border border-primary/25",
  info: "bg-info/10 border border-info/25",
  warning: "bg-warning/10 border border-warning/30",
  danger: "bg-destructive/10 border border-destructive/30",
  up: "bg-up/10 border border-up/25",
  down: "bg-down/10 border border-down/25",
};

export const toneFill = (tone: Tone) => TONE_FILL[tone];
export const toneInk = (tone: Tone) => TONE_INK[tone];
export const toneTint = (tone: Tone) => TONE_TINT[tone];

// ============================================================================
// TEXT
// ============================================================================

/**
 * Uppercase micro-label above a control.
 *
 * Deliberately `text-muted-foreground` and not `text-subtle-foreground`:
 * subtle measures 4.35:1 in light mode, under the 4.5:1 floor, and a field
 * label has to be read.
 */
export function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "text-xs font-medium uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      {children}
    </label>
  );
}

/** Secondary prose under a control. */
export function Hint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-[10px] mt-1 text-muted-foreground", className)}>
      {children}
    </div>
  );
}

// ============================================================================
// OPTION ROW  —  the single most repeated shape in this cluster
// ============================================================================

export interface Option<T> {
  value: T;
  label: React.ReactNode;
  title?: string;
}

export type OptionLayout = "flex" | "grid-2" | "grid-3";
export type OptionSize = "sm" | "md" | "lg";

const OPTION_SIZE: Record<OptionSize, string> = {
  sm: "py-1.5 rounded text-xs",
  md: "py-2 rounded-lg text-xs",
  lg: "py-2.5 rounded-lg text-xs",
};

const OPTION_LAYOUT: Record<OptionLayout, string> = {
  flex: "flex gap-2",
  "grid-2": "grid grid-cols-2 gap-2",
  "grid-3": "grid grid-cols-3 gap-2",
};

/**
 * A row or grid of preset buttons.
 *
 * `value` selects one; omit it and every button is a plain action (that is the
 * "override for 15/30/60 minutes" and "10% / 25% / 50%" shapes).
 *
 * The selected option takes the brand accent, NOT the hue of what it controls.
 * A `-50%` stop-loss preset used to be red and a `+70%` take-profit preset
 * green; both are just the option you picked, and the sign in the label already
 * says which direction it is.
 */
export function OptionRow<T extends string | number>({
  options,
  value,
  onSelect,
  layout = "flex",
  size = "md",
  className,
  itemClassName,
}: {
  options: readonly Option<T>[];
  value?: T;
  onSelect: (value: T) => void;
  layout?: OptionLayout;
  size?: OptionSize;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn(OPTION_LAYOUT[layout], className)}>
      {options.map((opt) => {
        const selected = value !== undefined && opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            title={opt.title}
            aria-pressed={value !== undefined ? selected : undefined}
            onClick={() => onSelect(opt.value)}
            className={cn(
              layout === "flex" && "flex-1",
              OPTION_SIZE[size],
              "font-medium transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
              itemClassName
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// NUMBER FIELD
// ============================================================================

/** Numeric input with a unit suffix — every limit in this cluster is one. */
export function NumberField({
  value,
  onChange,
  suffix,
  step,
  bordered = false,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  suffix?: React.ReactNode;
  step?: number;
  bordered?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-1 rounded-lg flex items-center px-3 bg-surface-3",
        bordered && "border border-border",
        className
      )}
    >
      <input
        type="number"
        value={value}
        step={step}
        aria-label={ariaLabel}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 bg-transparent py-2 outline-none text-foreground text-sm"
      />
      {suffix != null && (
        <span className="text-xs text-muted-foreground">{suffix}</span>
      )}
    </div>
  );
}

// ============================================================================
// TOGGLE
// ============================================================================

/**
 * Pill switch.
 *
 * The off track is `border-strong` rather than a surface step: the knob is
 * `bg-card`, and on `surface-3` in LIGHT mode (#EDF2F8 under a #FFFFFF knob)
 * the control was all but invisible. `border-strong` gives the knob something
 * to sit on in both themes.
 */
export function Toggle({
  checked,
  onChange,
  size = "md",
  id,
  disabled = false,
  ariaLabel,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
  id?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  // The knob is anchored with an explicit `left-0.5` and travels
  // (track − knob − 2×inset) px. The original markup left `left` at `auto` and
  // relied on the absolutely-positioned knob's STATIC position, which resolved
  // to the track's right edge — so every switch in this cluster rendered its
  // knob 16px outside the pill when on. Measured, not eyeballed.
  const track = size === "sm" ? "w-8 h-4" : "w-10 h-5";
  const knob = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const shift = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <button
      type="button"
      id={id}
      role="switch"
      disabled={disabled}
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative rounded-full transition-colors shrink-0",
        track,
        checked ? "bg-primary" : "bg-border-strong",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 rounded-full bg-card shadow transition-transform",
          knob,
          checked ? shift : "translate-x-0"
        )}
      />
    </button>
  );
}

/** Icon + label + switch, the standard settings row. */
export function ToggleRow({
  icon,
  label,
  checked,
  onChange,
  size = "sm",
  className,
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="text-xs text-foreground">{label}</span>
      </div>
      <Toggle checked={checked} onChange={onChange} size={size} />
    </div>
  );
}

/**
 * Native range input, tokenised.
 *
 * The thumb colour lives in an arbitrary variant
 * (`[&::-webkit-slider-thumb]:bg-…`). Worth knowing that the ratchet DOES see
 * through that syntax — the character before `bg` is `:`, which clears the
 * negative lookbehind — so these were real debt, not an exempt corner.
 */
export function RangeSlider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  height = "h-1.5",
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  height?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={cn(
        "w-full rounded-full appearance-none cursor-pointer bg-surface-3",
        height,
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer",
        className
      )}
    />
  );
}

// ============================================================================
// METER
// ============================================================================

/** Horizontal progress / usage bar. `tone` is the only thing that carries state. */
export function Meter({
  percent,
  tone = "neutral",
  height = "h-2",
  className,
}: {
  percent: number;
  tone?: Tone;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-full overflow-hidden bg-surface-3", height, className)}
    >
      <div
        className={cn("h-full rounded-full transition-all", TONE_FILL[tone])}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

/** Discrete pip row — "3 of 5 consecutive losses". */
export function Pips({
  total,
  filled,
  tone = "warning",
  className,
  pipClassName = "flex-1 h-1.5",
}: {
  total: number;
  filled: number;
  tone?: Tone;
  className?: string;
  pipClassName?: string;
}) {
  return (
    <div className={cn("flex gap-1", className)}>
      {Array.from({ length: Math.max(0, total) }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all",
            pipClassName,
            i < filled ? TONE_FILL[tone] : "bg-surface-3"
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// NOTICE STRIP
// ============================================================================

/**
 * Tinted advisory strip.
 *
 * The label is ALWAYS `text-foreground`; only the icon takes the tone. An
 * alpha tint composites onto whatever is behind it, so the same chip measures
 * differently panel to panel — putting the hue on 11px type is how these end up
 * unreadable in light mode.
 */
export function NoticeStrip({
  tone = "info",
  icon,
  children,
  dense = false,
  className,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** `dense` matches the 10px inline hint used at the foot of each panel. */
  dense?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg",
        dense ? "p-2" : "p-3",
        TONE_TINT[tone],
        className
      )}
    >
      {icon && (
        <span className={cn("mt-0.5 shrink-0", TONE_INK[tone])}>{icon}</span>
      )}
      <span
        className={cn(
          dense ? "text-[10px]" : "text-xs",
          tone === "neutral" || tone === "info"
            ? "text-muted-foreground"
            : "text-foreground"
        )}
      >
        {children}
      </span>
    </div>
  );
}

// ============================================================================
// PANEL
// ============================================================================

/** Card with an optional hairline-separated header. Elevation is the ramp, not a shadow. */
export function Panel({
  header,
  children,
  className,
  bodyClassName = "p-4 space-y-4",
  headerClassName = "px-4 py-3",
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg overflow-hidden",
        className
      )}
    >
      {header && (
        <div
          className={cn(
            "border-b border-border flex items-center justify-between",
            headerClassName
          )}
        >
          {header}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/** Title cluster for a `Panel` header. */
export function PanelTitle({
  icon,
  tone = "neutral",
  children,
  size = "sm",
}: {
  icon?: React.ReactNode;
  tone?: Tone;
  children: React.ReactNode;
  size?: "xs" | "sm";
}) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className={TONE_INK[tone]}>{icon}</span>}
      <span
        className={cn(
          "font-medium text-foreground",
          size === "xs" ? "text-xs" : "text-sm"
        )}
      >
        {children}
      </span>
    </div>
  );
}

// ============================================================================
// STAT TILE
// ============================================================================

/** Micro-label over a figure. `tone` is for P&L direction only. */
export function StatTile({
  label,
  value,
  tone = "neutral",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("p-3 rounded-lg bg-surface-2", className)}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "text-sm font-semibold mt-0.5",
          tone === "neutral" ? "text-foreground" : TONE_INK[tone]
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** Key/value line inside a summary block. */
export function SummaryRow({
  label,
  value,
  tone = "neutral",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold",
          tone === "neutral" ? "text-foreground" : TONE_INK[tone]
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// BUTTONS
// ============================================================================

/** Full-width primary action. */
export function ActionButton({
  children,
  onClick,
  disabled,
  tone = "accent",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "accent" | "up" | "down" | "warning" | "danger" | "muted";
  className?: string;
}) {
  const fills: Record<string, string> = {
    accent: "bg-primary text-primary-foreground hover:bg-primary/90",
    up: "bg-up text-success-foreground hover:bg-up/90",
    down: "bg-down text-destructive-foreground hover:bg-down/90",
    warning: "bg-warning text-warning-foreground hover:bg-warning/90",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    muted: "bg-surface-3 text-muted-foreground cursor-not-allowed",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors",
        disabled ? fills.muted : fills[tone],
        className
      )}
    >
      {children}
    </button>
  );
}

/** Low-emphasis full-width button, used for "not recommended" escapes. */
export function SubtleButton({
  children,
  onClick,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "neutral" | "warning" | "danger";
  className?: string;
}) {
  const fills = {
    neutral: "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
    warning: "bg-warning/10 text-foreground hover:bg-warning/20",
    danger: "bg-destructive/10 text-foreground hover:bg-destructive/20",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-colors",
        fills[tone],
        className
      )}
    >
      {children}
    </button>
  );
}
