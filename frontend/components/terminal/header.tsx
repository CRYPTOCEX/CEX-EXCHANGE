"use client";

/**
 * Terminal top bar — the h-10 strip of butted, full-height segments.
 *
 * Same lineage as the panel kit: `trade/pro`'s TradingHeader defined the shape,
 * the FX terminal rebuilt it on semantic tokens because pro's `--tp-*`
 * stylesheets are not loaded on its route, and this is that shape once more in
 * a place any route can import.
 *
 * ------------------------------------------------------------------------
 * NOTHING IN THIS BAR MAY RELAYOUT ON A TICK
 * ------------------------------------------------------------------------
 * Every live figure re-renders several times a second and each is a
 * variable-LENGTH string. `font-mono` fixes the width of a digit, not how many
 * of them there are — "—" becoming "1.08512" is a 60px jump, and in a row of
 * butted segments that re-measures the whole bar, so the figure you are trying
 * to read slides out from under you. `HeaderStat` therefore RESERVES its
 * realistic maximum with `min-w` and right-aligns, so extra digits grow into
 * reserved space instead of shoving a sibling.
 *
 * For the same reason: put cells that come and go with state at the END of the
 * left group, immediately before the spacer, so they expand into it and
 * displace nothing.
 *
 * The bar lives inside an `overflow-hidden` workspace, so one cell too many
 * does not wrap and does not scroll — it silently clips the rightmost cells off
 * the screen. Budget the widths deliberately.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function TerminalHeaderBar({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex h-10 min-h-[40px] shrink-0 select-none items-center border-b border-border bg-card",
        className
      )}
    >
      {children}
    </header>
  );
}

/** Pushes everything after it to the right edge. Growth moves cells LEFT of it. */
export function HeaderSpacer() {
  return <div className="min-w-0 flex-1" />;
}

/** A full-height 40x40 icon cell — square, unrounded, butted to its neighbour. */
export const headerIconCellClass =
  "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-subtle-foreground transition-colors hover:bg-surface-3 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

export function HeaderIconButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(headerIconCellClass, className)}
    >
      {children}
    </button>
  );
}

/** A bordered full-height segment. `divider` draws the 1px seam on its left. */
export function HeaderSegment({
  divider = true,
  className,
  children,
}: {
  divider?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-10 shrink-0 items-center gap-1.5 px-3 text-xs",
        divider && "border-l border-border",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * A live figure with its width reserved.
 *
 * `minWidth` must be the realistic MAXIMUM the value can reach, not its
 * current width — that is the whole mechanism. Right-aligned so growth
 * consumes the reservation rather than pushing the next cell.
 */
export function HeaderStat({
  label,
  value,
  tone,
  minWidth = "min-w-[64px]",
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "up" | "down" | "accent" | "muted";
  minWidth?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex h-10 shrink-0 flex-col justify-center border-l border-border px-3", className)}
      title={hint}
    >
      <span className="text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-right font-mono text-xs font-semibold leading-tight tabular-nums",
          minWidth,
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          tone === "accent" && "text-primary",
          tone === "muted" && "text-muted-foreground",
          !tone && "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Live/stale indicator.
 *
 * A pulsing dot is the cheapest possible "this is real time" signal, and its
 * absence is the cheapest possible "this is not". Both states are rendered —
 * a connection indicator that only appears when healthy tells the operator
 * nothing at the moment they most need to know.
 */
export function ConnectionDot({
  connected,
  label,
  className,
}: {
  connected: boolean;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("components");
  return (
    <span
      className={cn("flex items-center gap-1.5", className)}
      title={connected ? t("live_streaming_over_websocket") : t("disconnected_reconnecting")}
    >
      <span className="relative flex h-1.5 w-1.5">
        {connected && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex h-1.5 w-1.5 rounded-full",
            connected ? "bg-up" : "bg-muted-foreground"
          )}
        />
      </span>
      {label && (
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-wide",
            connected ? "text-up" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
