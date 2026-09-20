"use client";

/**
 * Shared primitives for the binary order panel.
 *
 * Every surface in this folder was hand-painted: the same bordered panel, the
 * same uppercase micro-label, the same +/- stepper, the same payout chip, the
 * same portal modal shell and the same two-sided direction toggle were each
 * rebuilt three to five times. They now live here once, on design tokens.
 *
 * Colour vocabulary for this cluster (see plans/DESIGN-SYSTEM.md §2/§4):
 *   up / down    price direction and the money that follows it — the two sides
 *                of the bet, the payout, the loss, expectancy.
 *   primary      selection and interaction: open dropdown, chosen preset,
 *                active row, order-type accent.
 *   warning      caution that does not block: high risk %, safe-zone pause,
 *                one-click armed, loss-streak suggestion.
 *   destructive  something was refused: order rejected, value out of range.
 *   neutral ramp everything structural.
 *
 * Contrast note (R2 + DESIGN-SYSTEM.md header): `--up`/`--down` are `--success`
 * / `--destructive`, which are too light in LIGHT mode to carry small text on a
 * tint of themselves. So small coloured labels put the hue on an ICON and keep
 * the label on `text-foreground`; only large/bold figures and filled buttons
 * take the colour directly.
 */

import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { Info, X, type LucideIcon } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================================================
// SURFACES
// ============================================================================

/** The bordered panel every field in the order column sits in. */
export function Panel({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-2 overflow-hidden",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Uppercase micro-label used above every value in the panel. */
export function FieldLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-wide text-subtle-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

/** The `-` / `+` buttons on the amount and expiry fields. */
export function StepperButton({
  onClick,
  disabled,
  children,
  className,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "p-1 rounded transition-all cursor-pointer text-subtle-foreground hover:bg-surface-3 hover:text-foreground",
        disabled && "opacity-30 cursor-not-allowed!",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/**
 * The `+85%` payout badge.
 *
 * A tint of `--up` with `text-foreground` ink, never `text-up` on `bg-up/10` —
 * that pairing measures 2.8:1 in light mode at this size.
 */
export function PayoutChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold px-1.5 py-0.5 rounded bg-up/10 text-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Muted explanatory line under a field. */
export function InfoNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-1.5 text-xs text-subtle-foreground",
        className
      )}
    >
      <Info size={12} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

/**
 * Inline status strip.
 *
 * `destructive` = the platform refused something (rejected order, value out of
 * range). `warning` = a caution the user can still trade through (safe zone,
 * oversized risk). The hue rides the icon; the copy stays on `foreground` so it
 * is readable on the tint in both themes.
 */
export function NoticeStrip({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: "destructive" | "warning";
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-2 py-1.5 rounded-lg flex items-center gap-2 border animate-in slide-in-from-top-2 duration-300",
        tone === "destructive"
          ? "bg-destructive/10 border-destructive/40"
          : "bg-warning/10 border-warning/40",
        className
      )}
    >
      <Icon
        size={12}
        className={cn(
          "shrink-0",
          tone === "destructive" ? "text-destructive" : "text-warning"
        )}
      />
      <span className="text-[10px] text-foreground">{children}</span>
    </div>
  );
}

// ============================================================================
// TWO-SIDED CONTROLS
// ============================================================================

/** Which half of a two-sided bet a control belongs to. */
export type Side = "up" | "down";

/**
 * Ink that flips with its fill.
 *
 * `--up === --success` and `--down === --destructive`, so the paired
 * foregrounds are the only inks designed to sit on those grounds. `text-overlay-foreground`
 * on `bg-up` measures 2.34:1 in dark mode — an invisible label.
 */
export const SIDE_FILL: Record<Side, string> = {
  up: "bg-up text-success-foreground",
  down: "bg-down text-destructive-foreground",
};

/** Tinted (unfilled) variant, used for the selected half of a segmented pair. */
export const SIDE_TINT: Record<Side, string> = {
  up: "bg-up/15 border-up/50 text-foreground",
  down: "bg-down/15 border-down/50 text-foreground",
};

/** Coloured ink for a direction figure on a plain surface. */
export const SIDE_INK: Record<Side, string> = {
  up: "text-up",
  down: "text-down",
};

/**
 * Segmented two-button direction picker (Higher/Lower, CALL/PUT).
 * Both arms carry an icon, so the hue never has to be read from text alone.
 */
export function DirectionToggle<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: [
    { value: T; label: string; side: Side; icon: LucideIcon },
    { value: T; label: string; side: Side; icon: LucideIcon },
  ];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isSelected
                ? SIDE_TINT[option.side]
                : "bg-surface-3 border-border text-muted-foreground hover:border-border-strong"
            )}
          >
            <Icon
              size={12}
              className={cn(
                "inline mr-1",
                isSelected ? SIDE_INK[option.side] : undefined
              )}
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// DROPDOWNS
// ============================================================================

/** Trigger + anchored list used by the barrier and strike level pickers. */
export function LevelDropdown({
  open,
  onToggle,
  disabled,
  trigger,
  children,
  listClassName,
}: {
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
  trigger: ReactNode;
  children: ReactNode;
  listClassName?: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && onToggle()}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2.5 rounded-lg flex items-center justify-between transition-all",
          "bg-surface-3 border border-border text-foreground",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:border-primary"
        )}
      >
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-50 w-full mt-1 rounded-lg border border-border bg-popover overflow-hidden shadow-lg",
            listClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** One row inside a `LevelDropdown`. Selection is `primary`, never a hue. */
export function LevelRow({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between text-left transition-colors text-foreground",
        selected ? "bg-primary/15" : "hover:bg-surface-3",
        className
      )}
    >
      {children}
    </button>
  );
}

/** Popover panel rendered into `document.body` (amount + expiry menus). */
export function AnchoredPopover({
  panelRef,
  style,
  children,
}: {
  panelRef: RefObject<HTMLDivElement | null>;
  style: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      ref={panelRef}
      className="fixed w-[240px] rounded-xl shadow-2xl overflow-hidden z-[var(--z-top)] animate-in fade-in slide-in-from-top-1 duration-150 bg-popover backdrop-blur-xl border border-border"
      style={style}
    >
      {children}
    </div>
  );
}

// ============================================================================
// MODAL SHELL
// ============================================================================

/** Small launcher button in the order panel's quick-actions row. */
export function ToolbarButton({
  icon: Icon,
  label,
  badge,
  badgeAs = "span",
  onClick,
  title,
}: {
  icon: LucideIcon;
  label: string;
  badge: ReactNode;
  badgeAs?: "span" | "kbd";
  onClick: () => void;
  title?: string;
}) {
  const Badge = badgeAs;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer bg-surface-2 hover:bg-surface-3 border border-border hover:border-border-strong active:scale-95"
      title={title}
    >
      <div className="p-1 rounded-md bg-primary/10">
        <Icon size={12} className="text-primary" />
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground">
        {label}
      </span>
      <Badge
        className={cn(
          "text-[9px] px-1.5 py-0.5 rounded font-semibold bg-surface-3 text-muted-foreground",
          badgeAs === "kbd" && "font-mono"
        )}
      >
        {badge}
      </Badge>
    </button>
  );
}

/**
 * Portal + scrim + card + header, shared by the risk calculator and the
 * keyboard-shortcuts panel. The scrim uses `--overlay`, which is dark in both
 * themes; a theme-following surface token would fade to white in light mode.
 */
export function OverlayModal({
  isOpen,
  onClose,
  panelRef,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            className="fixed inset-0 bg-overlay/70 backdrop-blur-sm z-[var(--z-tour-content)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div
            className="fixed inset-0 z-[var(--z-tour-modal)] flex items-center justify-center p-4"
            style={{ pointerEvents: "none" }}
          >
            <m.div
              ref={panelRef}
              className="relative w-[340px] max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl bg-popover backdrop-blur-xl border border-border"
              style={{ pointerEvents: "auto" }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {title}
                    </h3>
                    <p className="text-[10px] text-subtle-foreground">
                      {subtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl transition-all duration-200 cursor-pointer text-subtle-foreground hover:text-foreground hover:bg-surface-3"
                >
                  <X size={16} />
                </button>
              </div>

              {children}
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ============================================================================
// SKELETON
// ============================================================================

/** Neutral block used by the order-panel loading state. */
export function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn("rounded bg-surface-3", className)} />;
}
