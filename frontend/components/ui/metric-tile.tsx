import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Loadable } from "@/components/ui/skeleton";

/**
 * The small recessed label/value tile that sits INSIDE a card — the 3-up stat
 * row on a leader card, an ICO project card, a forex plan card, and so on.
 *
 * There were five separate inline implementations of this, each with its own
 * surface: `p-2 rounded-lg bg-muted/30`, `p-3 rounded-lg bg-muted dark:bg-muted/50`,
 * `p-3 rounded-xl bg-muted dark:bg-muted/50`, `rounded-xl bg-muted/80 p-3
 * border border-border-strong/50`, and `rounded-lg border border-border
 * bg-card/60 px-1 py-1.5`. Same idea, five different recessed surfaces, plus
 * two `dark:` forks doing what one alpha already does.
 *
 * The surface is shared here; the CONTENT is not, because it legitimately
 * differs — some tiles put the icon above, some beside the label, some show the
 * value first. Those are slots, not variants, so callers keep their own layout
 * without re-inventing the tile.
 *
 * It is not `<Card variant="muted">` because a nested tile should not carry a
 * border: inside a card that already has one, a second hairline reads as a
 * table cell rather than a grouped figure.
 */
const metricTileVariants = cva("bg-muted/60", {
  variants: {
    align: {
      center: "text-center",
      start: "text-start",
    },
    // Multiplied, so the two steps stay a step apart at any setting.
    padding: {
      sm: "p-[calc(0.5rem*var(--kpi-padding-scale))]",
      md: "p-[calc(0.75rem*var(--kpi-padding-scale))]",
    },
    radius: {
      /* `lg` is `var(--radius)`; see the radius ramp note in DESIGN-SYSTEM.md.
         A nested tile should never be rounder than the card containing it. */
      default: "rounded-lg",
      none: "rounded-none",
    },
  },
  defaultVariants: { align: "center", padding: "md", radius: "default" },
});

export interface MetricTileProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof metricTileVariants> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Rendered beside the label. Size it at the call site. */
  icon?: React.ReactNode;
  /** Put the value above the label (a headline figure) rather than below. */
  valueFirst?: boolean;
  valueClassName?: string;
  labelClassName?: string;
  /**
   * Render the tile with its value pending.
   *
   * The tile had no pending state at all, so its five original call sites each
   * withheld the whole tile behind their page's own `if (loading) return`. The
   * surface, the padding, the label and the icon are all knowable before the
   * fetch — only the value is not — and a tile is typically one of three or four
   * in a row, so a missing one takes the row's height with it.
   *
   * Defaults to `false`, so the six existing call sites are untouched.
   */
  loading?: boolean;
  /**
   * The string whose box to reserve while `loading`. Give a REAL-SHAPED value —
   * "1,234.00", "12.5%" — because the placeholder is only as honest as this.
   * Falls back to six zero-width-equivalent digits.
   */
  valuePlaceholder?: string;
}

export const MetricTile = React.forwardRef<HTMLDivElement, MetricTileProps>(
  (
    {
      className,
      align,
      padding,
      radius,
      label,
      value,
      icon,
      valueFirst = false,
      valueClassName,
      labelClassName,
      loading = false,
      valuePlaceholder,
      ...props
    },
    ref
  ) => {
    const labelRow = (
      <div
        className={cn(
          "flex items-center gap-1",
          align === "start" ? "justify-start" : "justify-center",
          labelClassName
        )}
      >
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
          {label}
        </span>
      </div>
    );
    /* The placeholder sits INSIDE the typography div, not beside it, so it is
       laid out by whatever `valueClassName` a caller has put on this tile —
       `text-lg`, `text-2xl`, a different leading — with nothing to keep in sync. */
    /* `--kpi-value-scale` multiplies the DEFAULT figure size only. A caller that
       passes its own `text-2xl` in `valueClassName` still wins, via twMerge, and
       that is correct: those tiles have chosen a headline size for a reason, and
       a global slider should not silently override a deliberate per-tile
       decision. */
    const valueRow = (
      <div
        className={cn(
          "text-[calc(0.875rem*var(--kpi-value-scale))] font-bold text-foreground",
          valueClassName
        )}
      >
        <Loadable loading={loading} placeholder={valuePlaceholder} chars={6}>
          {value}
        </Loadable>
      </div>
    );

    return (
      <div
        ref={ref}
        className={cn(metricTileVariants({ align, padding, radius }), className)}
        aria-busy={loading || undefined}
        {...props}
      >
        {valueFirst ? (
          <>
            {valueRow}
            {labelRow}
          </>
        ) : (
          <>
            {labelRow}
            {valueRow}
          </>
        )}
      </div>
    );
  }
);
MetricTile.displayName = "MetricTile";
