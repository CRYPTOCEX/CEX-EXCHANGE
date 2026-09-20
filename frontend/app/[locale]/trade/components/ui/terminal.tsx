"use client";

/**
 * Shared terminal primitives for `app/[locale]/trade`.
 *
 * Panels, column headers, empty states and status rows are the most duplicated
 * markup in a trading terminal — the orderbook alone carried four copies of the
 * same three-column header and four copies of the same row, and the orders panel
 * carried two copies of its filter bar, its pagination and its table head. These
 * are those pieces, once.
 *
 * Colour rules encoded here, so a caller cannot get them wrong:
 *
 *  - Direction is `up` / `down`, never a hue name. This tree used BOTH `emerald`
 *    and `green` for "up" and `red` for both "down" and "error".
 *  - `--up` and `--down` are too light for small text on their OWN tint in light
 *    mode (measured: `text-up` on `bg-up/10` over `--background` is 2.80:1
 *    against a 4.5:1 floor; dark is 7.66:1). Where the value IS the direction —
 *    a bid price, a % change, a P&L figure — the token stays, because R1 says
 *    price owns the loudest colour and an orderbook without bid/ask colour is
 *    broken. Where the surrounding container already codes the direction, the
 *    numeral takes `text-foreground` and the hue moves to the icon and border.
 *    That is the documented workaround; the token VALUES are a Phase 0 decision
 *    and are not touched here.
 *  - `text-overlay-foreground` on a moved ground is the classic invisible control: white on
 *    `--up` measures 2.34:1 in dark. Filled direction grounds pair with
 *    `text-success-foreground` / `text-destructive-foreground`.
 */

import type React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Direction
 * ------------------------------------------------------------------ */

export type Direction = "up" | "down";

/** Ink for a figure whose value IS the direction (price, change, P&L). */
export const directionText = (up: boolean) => (up ? "text-up" : "text-down");

/** Hairline / rule in the direction colour. */
export const directionBorder = (up: boolean) => (up ? "border-up" : "border-down");

/** Low-alpha ground behind a directional row or chip. */
export const directionTint = (up: boolean) => (up ? "bg-up/10" : "bg-down/10");

/**
 * Solid direction fill plus the ink that is legible on it. Never `text-overlay-foreground`:
 * white on `--up` is 2.34:1 in dark.
 */
export const directionFill = (up: boolean) =>
  up ? "bg-up text-success-foreground" : "bg-down text-destructive-foreground";

/* ------------------------------------------------------------------ *
 * Structure
 * ------------------------------------------------------------------ */

/** Raised strip above a scrolling body — toolbar, column header, footer. */
export function PanelStrip({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex-shrink-0 bg-surface-2 border-b border-border",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Column header for a fixed-column grid body. `cols` is a Tailwind grid class
 * written out in full — v4 cannot compile a constructed class name.
 */
export function ColumnHeader({
  labels,
  cols = "grid-cols-3",
  align = "center",
  className,
  size = "text-[10px]",
}: {
  labels: React.ReactNode[];
  cols?: string;
  align?: "center" | "spread";
  className?: string;
  size?: string;
}) {
  return (
    <PanelStrip className={cn("grid p-1", cols, size, className)}>
      {labels.map((label, i) => (
        <div
          key={i}
          className={cn(
            "text-muted-foreground font-medium",
            align === "center"
              ? "text-center"
              : i === 0
                ? "text-left"
                : i === labels.length - 1
                  ? "text-right"
                  : "text-center"
          )}
        >
          {label}
        </div>
      ))}
    </PanelStrip>
  );
}

/** Header cell for a `<table>`. */
export function Th({
  align = "right",
  className,
  children,
}: {
  align?: "left" | "right" | "center";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <th
      className={cn(
        "p-2 font-medium text-muted-foreground",
        align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right",
        className
      )}
    >
      {children}
    </th>
  );
}

/** The one empty state: icon, headline, hint. Was hand-written six times. */
export function EmptyState({
  icon,
  title,
  hint,
  compact = false,
  className,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  hint?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-muted-foreground",
        compact ? "h-32" : "h-full py-10",
        className
      )}
    >
      <div className={cn("opacity-30", compact ? "mb-2" : "mb-3")}>{icon}</div>
      <p className={cn("font-medium mb-1", compact ? "text-xs" : "text-sm")}>
        {title}
      </p>
      {hint && (
        <p className="text-xs text-muted-foreground/70 text-center max-w-[220px]">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Indeterminate spinner on the brand accent. */
export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-primary border-t-transparent",
        className || "h-6 w-6"
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * A notice on a status tint. The label rides `--foreground`, not the status
 * token: `text-destructive` on `bg-destructive/10` is 3.62:1 in light mode.
 * The hue is carried by the icon and the border, which is §4a's rule.
 */
export function StatusNotice({
  tone,
  icon,
  children,
  className,
}: {
  tone: "destructive" | "warning" | "success" | "info";
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const tint = {
    destructive: "bg-destructive/10 border-destructive/40",
    warning: "bg-warning/10 border-warning/40",
    success: "bg-success/10 border-success/40",
    info: "bg-info/10 border-info/40",
  }[tone];
  const ink = {
    destructive: "text-destructive",
    warning: "text-warning",
    success: "text-success",
    info: "text-info",
  }[tone];

  return (
    <div
      className={cn(
        "flex items-start gap-1.5 border text-xs p-2 rounded text-foreground",
        tint,
        className
      )}
    >
      {icon && <span className={cn("shrink-0", ink)}>{icon}</span>}
      <span>{children}</span>
    </div>
  );
}

/**
 * Neutral informational chip — ECO, leverage, market type, counts.
 *
 * These were four different hues (emerald / blue / amber) standing in for
 * categorical identity that the chip's own text already states. Over a handful
 * of keys colour cannot carry identity at all, and a status token used as
 * decoration eventually collapses two meanings into one paint.
 */
export function MetaChip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-border bg-surface-3 px-1.5 text-muted-foreground font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Underline tab, used by the orders panel. Active state is the brand accent (R2). */
export function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center flex-1 py-2 text-xs font-medium border-b-2 transition-colors",
        active
          ? "text-foreground border-primary"
          : "text-muted-foreground border-transparent hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
