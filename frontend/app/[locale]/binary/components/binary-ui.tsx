"use client";

/**
 * Shared primitives for the binary terminal shell — the surfaces OUTSIDE the
 * order column (`order/order-ui.tsx` owns that one; import from there rather
 * than duplicating a primitive here).
 *
 * Four full-bleed overlays (analytics, pattern library, leaderboard,
 * challenges) each carried their own hand-rolled copy of the same scrim +
 * panel + `isMobile ? div : m.div` animation dance, the same header, the
 * same stats strip and the same filter pill. Two headers, two nav bars and two
 * modals repeated the icon button, the tab indicator and the label/value row.
 * They live here once, on design tokens.
 *
 * Colour vocabulary for this cluster (see plans/DESIGN-SYSTEM.md §2/§4):
 *   up / down    price direction and the money that follows it — market change,
 *                P&L, a won or lost trade, bullish vs bearish patterns.
 *   success      the REAL account (real money is live).
 *   warning      the DEMO/practice account, and any caution the user can still
 *                trade through (near expiry, wait-before-cash-out).
 *   destructive  something was refused or broke: rejected order, init failure,
 *                error boundary.
 *   primary      selection and interaction: active tab, open overlay, chosen
 *                filter, the product's brand mark. The five per-tool accents
 *                (blue analytics / purple settings / amber leaderboard / green
 *                challenges / orange brand) were decorative, not semantic, and
 *                all collapse here.
 *   neutral ramp everything structural.
 *
 * Surface note: `--surface-2` equals `--card` in LIGHT mode, so a strip meant
 * to read as raised ON a card must be `bg-surface-3` — `bg-surface-2` would be
 * white-on-white. That is why the stats strips and inset tiles below use
 * `surface-3` even though their originals were `*-800`.
 *
 * Contrast note (R2): `--up`/`--down` are `--success`/`--destructive`, too
 * light in LIGHT mode to carry small text on a tint of themselves. Small
 * coloured labels put the hue on an ICON or a mark and keep the copy on
 * `text-foreground`; only large/bold figures and filled buttons take the hue.
 *
 * CVD note (R3): `--up` and `--down` are not separable under deuteranopia, so
 * anywhere the two are distinguished, a second channel rides along — a `+`/`-`
 * sign, a directional icon, the written word, or `ToneMark`'s disc-vs-diamond
 * (the same shape pairing the analytics cluster uses).
 */

import type { ReactNode } from "react";
import { m, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ============================================================================
// TONES
// ============================================================================

/** The meanings a small coloured mark in this cluster can carry. */
export type BinaryTone =
  | "up"
  | "down"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "muted";

/** Coloured ink for an icon or a large figure. Never for small body copy. */
export const TONE_INK: Record<BinaryTone, string> = {
  up: "text-up",
  down: "text-down",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

/** Tinted ground for a chip or an icon well. Pair with `text-foreground` ink. */
export const TONE_TINT: Record<BinaryTone, string> = {
  up: "bg-up/10",
  down: "bg-down/10",
  primary: "bg-primary/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  destructive: "bg-destructive/10",
  muted: "bg-surface-3",
};

/**
 * Bare solid ground for a mark or a progress bar.
 *
 * Written out rather than derived from `TONE_INK` by rewriting the ink class prefix at runtime:
 * a class assembled at runtime is never in the source Tailwind scans, so it
 * compiles to nothing. That exact construction was painting the challenge
 * difficulty stripe on `demo-challenges.tsx` — and three of its four colours
 * silently rendered as no stripe at all.
 */
export const TONE_MARK: Record<BinaryTone, string> = {
  up: "bg-up",
  down: "bg-down",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
};

/** Solid fill + the only ink designed to sit on it. `text-overlay-foreground` is 2.34:1. */
export const TONE_FILL: Record<BinaryTone, string> = {
  up: "bg-up text-success-foreground",
  down: "bg-down text-destructive-foreground",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  muted: "bg-surface-3 text-foreground",
};

/**
 * A small tone mark. `shape` — filled disc for up, rotated square for down —
 * is the non-colour cue that keeps the two apart for a deuteranope, matching
 * the analytics cluster's `ToneDot`.
 */
export function ToneMark({
  tone,
  size = 8,
  className,
}: {
  tone: BinaryTone;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0",
        tone === "down" || tone === "destructive" ? "rotate-45" : "rounded-full",
        TONE_MARK[tone],
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}

// ============================================================================
// FULL-BLEED OVERLAY SHELL
// ============================================================================

/**
 * Scrim + full-bleed panel used by the four terminal overlays.
 *
 * `isMobile` drops the enter/exit animation entirely (swapping overlays on a
 * phone must be instant, and an exit transition adds a visible stall) — that
 * behaviour is preserved exactly, it just lives in one place now.
 *
 * The scrim is `--overlay`, which is dark in BOTH themes; a theme-following
 * surface token would fade to white in light mode and stop reading as a scrim.
 */
export function FullBleedOverlay({
  isOpen,
  isMobile = false,
  onClose,
  children,
  panelClassName,
}: {
  isOpen: boolean;
  isMobile?: boolean;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
}) {
  if (!isOpen) return null;

  const Wrapper = isMobile ? "div" : m.div;
  const Backdrop = isMobile ? "div" : m.div;
  const Panel = isMobile ? "div" : m.div;

  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  const content = (
    <Wrapper
      {...(isMobile ? {} : { ...fade, transition: { duration: 0.2 } })}
      className="absolute inset-0 z-50 flex"
    >
      <Backdrop
        {...(isMobile ? {} : fade)}
        className="absolute inset-0 bg-overlay/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <Panel
        {...(isMobile ? {} : { ...fade, transition: { duration: 0.15 } })}
        className={cn(
          "relative h-full w-full flex flex-col bg-card ",
          panelClassName
        )}
      >
        {children}
      </Panel>
    </Wrapper>
  );

  // On mobile there is no AnimatePresence, so there is no exit delay.
  if (isMobile) return content;

  return <AnimatePresence>{isOpen && content}</AnimatePresence>;
}

/** Icon well + title + subtitle + trailing actions, atop a full-bleed overlay. */
export function OverlayHeader({
  icon: Icon,
  tone = "primary",
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  tone?: BinaryTone;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-xl", TONE_TINT[tone])}>
          <Icon size={20} className={TONE_INK[tone]} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Square icon button used for refresh / close in an overlay header. */
export function OverlayIconButton({
  icon: Icon,
  onClick,
  disabled,
  label,
  iconClassName,
  className,
}: {
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "p-2 rounded-lg transition-colors cursor-pointer text-muted-foreground",
        "hover:bg-surface-3 hover:text-foreground disabled:opacity-50",
        className
      )}
    >
      <Icon size={18} className={iconClassName} />
    </button>
  );
}

/**
 * The raised strip under an overlay header. `surface-3`, not `surface-2`:
 * `--surface-2` is identical to `--card` in light mode, so the strip would
 * vanish on the very panel it is meant to sit on.
 */
export function OverlayStatsBar({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="px-6 py-2.5 border-b border-border bg-surface-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5 text-[11px]">{children}</div>
        {trailing}
      </div>
    </div>
  );
}

/** One icon + label pair inside an `OverlayStatsBar`. Hue rides the icon. */
export function OverlayStat({
  icon: Icon,
  tone = "muted",
  children,
}: {
  icon: LucideIcon;
  tone?: BinaryTone;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className={TONE_INK[tone]} />
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

// ============================================================================
// CONTROLS
// ============================================================================

/**
 * Filter pill (category, period, metric). Selection is `primary` — never a hue,
 * because a selected pill is interaction state, not a price direction.
 */
export function FilterChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-surface-3 text-muted-foreground hover:text-foreground hover:border-border-strong border border-transparent",
        className
      )}
    >
      {children}
    </button>
  );
}

/**
 * Flat tab with a top indicator rule, used by both mobile bars. The indicator
 * is the second channel: the tab is not identified by ink colour alone.
 */
export function IndicatorTab({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex-1 relative flex items-center justify-center transition-colors cursor-pointer",
        "border-r last:border-r-0 border-border",
        active
          ? "bg-surface-3 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-surface-3/60",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5",
          active ? "bg-primary" : "bg-transparent"
        )}
      />
      {children}
    </button>
  );
}

/** Count badge pinned to the corner of a tab or an icon button. */
export function CountBadge({
  count,
  tone = "primary",
  className,
}: {
  count: number;
  tone?: BinaryTone;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "min-w-4 h-4 px-1 flex items-center justify-center rounded-full",
        "text-[8px] font-bold tabular-nums",
        TONE_FILL[tone],
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Header action button — the 40px square that fills the terminal's top bar.
 * `active` means "this overlay is currently open", which is interaction state,
 * so it is `primary` for every tool rather than a per-tool accent hue.
 */
export function HeaderIconButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
  active = false,
  className,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  tooltip?: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const button = (
    <m.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={onClick ? active : undefined}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "h-10 w-10 flex items-center justify-center border-r border-border",
        "transition-colors relative cursor-pointer",
        active
          ? "text-primary-ink bg-primary/10"
          : "text-muted-foreground hover:text-primary hover:bg-surface-3",
        className
      )}
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </m.button>
  );

  if (!tooltip) return button;

  return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="text-xs bg-popover text-foreground border-border"
        >
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
  );
}

/** Uppercase micro-heading above a group of menu rows. */
export function MenuSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 py-1.5 mb-1">
      <span className="text-[10px] font-semibold text-subtle-foreground uppercase tracking-wide">
        {children}
      </span>
    </div>
  );
}

// ============================================================================
// READOUTS
// ============================================================================

/** `label ............ value` row, repeated all over the two order modals. */
export function DetailRow({
  label,
  value,
  valueClassName,
  emphasis = false,
}: {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span
        className={cn(
          emphasis ? "text-foreground font-medium" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span className={cn("font-medium text-foreground", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

/** Inset block inside a modal or panel. Raised on `--card` in both themes. */
export function InsetPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg bg-surface-3 p-4", className)}>{children}</div>
  );
}

/** Animated progress track. `tone` colours the bar, never the copy beside it. */
export function ProgressTrack({
  percent,
  tone = "primary",
  height = "h-2",
  className,
}: {
  percent: number;
  tone?: BinaryTone;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-surface-3 border border-border",
        height,
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <m.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn("h-full rounded-full", TONE_MARK[tone])}
      />
    </div>
  );
}

/** Centred icon + message, used by every empty / error / loading state. */
export function EmptyState({
  icon: Icon,
  message,
  hint,
  tone = "muted",
  className,
}: {
  icon: LucideIcon;
  message: string;
  hint?: string;
  tone?: BinaryTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <Icon className={cn("w-8 h-8 mb-2", TONE_INK[tone])} />
      <p className="text-sm text-muted-foreground">{message}</p>
      {hint ? <p className="text-xs text-subtle-foreground mt-1">{hint}</p> : null}
    </div>
  );
}
