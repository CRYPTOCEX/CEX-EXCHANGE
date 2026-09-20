import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Loadable } from "@/components/ui/skeleton";
import { isFigureValue } from "@/components/ui/card/stats-card";

/**
 * The figures that belong to a page HEADING, in the one shape the whole product
 * uses.
 *
 * ===========================================================================
 * WHY THIS EXISTS
 * ===========================================================================
 * "A few numbers under the page description" was invented separately on every
 * surface that wanted it:
 *
 *   - the DataTable hero  — an inline icon-tile rail, `design.stats`
 *   - eleven `HeroSection` pages — a `bottomSlot` holding a 2-to-4 column grid
 *     of `StatsCard`, i.e. FULL KPI CARDS inside the heading
 *   - `admin/ico/offer/[id]` — hand-rolled `bg-primary/5` tiles
 *   - `admin/faq/manage` — a single `Card` with an icon and two lines
 *   - `ico/*`, `copy-trading/*` — a third inline treatment, close to the
 *     DataTable's but not the same
 *
 * The `StatsCard` version is the one that reads worst, and it is worth being
 * precise about why rather than calling it ugly: a `StatsCard` is a KPI TILE.
 * It owns a bordered surface, ~96px of height, a trend sparkline, a compact
 * currency formatter and a tone. All of that is right in a dashboard grid,
 * where the tiles ARE the content. In a heading they are four large boxes
 * competing with the `<h1>` directly above them, and they push the page's first
 * actual control below the fold — on `/admin/finance/deposit/gateway`, 260px
 * of heading before the alert that is the whole point of the screen.
 *
 * A heading figure is a CAPTION on the title, not a card. So: an icon in a
 * tile, a label, a figure, optionally one clause of context. No surface, no
 * border, no chart, no tone.
 *
 * ===========================================================================
 * NO TONE AXIS, DELIBERATELY
 * ===========================================================================
 * `StatsCard` has one and the pages used it — "Need credentials 12" drew amber
 * on the gateway console. It is not carried over. A rail of four figures where
 * two are tinted is R2's accent spent on decoration, and a colour that carries
 * the verdict on its own is R8 besides. Where a figure genuinely IS a verdict
 * the page already says so in words underneath — that same console opens with
 * "12 gateways are switched on and cannot authenticate" in a destructive
 * banner, which is both louder and clickable.
 *
 * The ONE accent here is the icon tile, which is chrome and marks nothing.
 */
export interface HeadingStat {
  icon: LucideIcon;
  label: React.ReactNode;
  value: React.ReactNode;
  /** One short clause under the figure. Omit it far more often than not. */
  hint?: React.ReactNode;
  /**
   * What the skeleton reserves while `loading`. Give it the width of a typical
   * value ("00", "$0.0K") so the rail does not resize when the fetch lands.
   */
  placeholder?: string;
}

export interface HeadingStatsProps {
  stats: HeadingStat[];
  /**
   * Draw skeletons instead of the values.
   *
   * The LABELS and the icons still render: they are known before the request
   * goes out, and a rail that appears from nothing is a layout shift at the top
   * of the page. Only the figures are withheld — rendering `0` for a pending
   * count is the defect these pages already documented at their `StatsCard`
   * call sites ("an install with sixteen gateways reporting that it has none").
   */
  loading?: boolean;
  className?: string;
}

export function HeadingStats({ stats, loading, className }: HeadingStatsProps) {
  if (!stats.length) return null;

  return (
    /* A description list, because that is what it is. The `<div>` wrapper
       around each `dt`/`dd` group is valid inside `<dl>` and is what lets the
       pair sit beside its icon. */
    <dl
      className={cn("flex flex-wrap gap-x-8 gap-y-4 sm:gap-x-10", className)}
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          /* `items-start`, NOT `items-center`. One entry carrying a `hint` is
             three lines tall and its neighbours are two, and centring each
             independently put every label in the row on a different baseline —
             which reads as a rendering fault rather than as a design. Aligned
             at the top, the labels line up whatever any one entry carries. */
          <div key={index} className="flex items-start gap-2.5 sm:gap-3">
            {/* `mt-0.5` optically seats the tile against the LABEL's cap
                height rather than against the top of its line box. */}
            <span
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:size-10"
              aria-hidden
            >
              <Icon className="size-4 text-primary sm:size-5" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs text-subtle-foreground sm:text-sm">
                {stat.label}
              </dt>
              <dd
                className={cn(
                  "text-base font-bold text-foreground sm:text-lg",
                  /* R4: tabular figures on numbers, the interface face on
                     prose. `isFigureValue` is the shared rule — "Never" and
                     "about 2 hours" are not figures and read as a bug in
                     mono. */
                  isFigureValue(stat.value) && "font-mono tabular-nums"
                )}
              >
                <Loadable loading={Boolean(loading)} placeholder={stat.placeholder ?? "00"}>
                  {stat.value}
                </Loadable>
              </dd>
              {stat.hint ? (
                <dd className="text-xs text-subtle-foreground">{stat.hint}</dd>
              ) : null}
            </div>
          </div>
        );
      })}
    </dl>
  );
}
