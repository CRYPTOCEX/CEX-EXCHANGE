"use client"

import * as React from "react"
import { BarChart3, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { SkeletonBlock } from "@/components/ui/skeleton"

/**
 * The shell every chart on a page shares — Ledger, same as `StatsCard`.
 * ============================================================================
 *
 * A chart card was previously `<Card><CardHeader><CardTitle className="flex
 * items-center gap-2"><Icon className="h-5 w-5"/>Title</CardTitle>…`, written
 * out by hand in every file, and it drifted exactly where you would expect: the
 * title ran `text-lg` on some pages and `text-xl` on others, the icon was a
 * bare 5×5 glyph on some and a tinted tile on others, and the plot height was
 * `h-[300px]`, `h-[250px]`, `height={300}` or nothing at all depending on who
 * wrote it. Two charts side by side in one grid did not line up.
 *
 * The header matches the stat card's exactly — small muted label, `h-7 w-7`
 * tinted tile with a `h-3.5` glyph — because a KPI row sitting above a chart
 * row is the single most common page shape in this admin, and the two rows
 * should read as one system.
 *
 * The plot gets a FIXED height rather than an aspect ratio. Recharts'
 * `ResponsiveContainer` measures its parent, and a percentage height inside an
 * auto-height parent measures zero — which is the "chart renders blank until
 * you resize the window" bug, and it is in this codebase in three places.
 */
export interface ChartCardProps {
  title: string
  description?: string
  icon?: LucideIcon
  /** Icon tile ink + ground, e.g. from `statsCardColors`. */
  color?: string
  bgColor?: string
  /** Toolbar slot — a timeframe switcher, a refresh button. */
  actions?: React.ReactNode
  /** Plot height in px. The legend, if any, sits outside it. */
  height?: number
  /**
   * The child brings its own layout and may be TALLER than `height`.
   *
   * `height` is normally applied as a fixed box, because that is the only thing
   * `ResponsiveContainer` can measure — a percentage height inside an
   * auto-height parent measures zero and the chart renders blank. But a
   * `DonutChart` with its legend showing is a ring of `height` px PLUS a list
   * that grows with the number of segments, and inside a fixed box that list
   * spills straight out through the bottom of the card and over whatever sits
   * below it. Every DataTable analytics pie in the admin did exactly that.
   *
   * With `fitContent`, `height` becomes a MINIMUM and the box grows. Only pass
   * it for children that size their own plot area (DonutChart does); a bare
   * `SeriesChart` at `height="100%"` still needs the fixed box.
   */
  fitContent?: boolean
  loading?: boolean
  /** Render the empty state instead of children. */
  empty?: boolean
  emptyMessage?: string
  /** Footer slot, typically a `<ChartLegend variant="inline" />`. */
  footer?: React.ReactNode
  className?: string
  contentClassName?: string
  children: React.ReactNode
}

export function ChartCard({
  title,
  description,
  icon: Icon = BarChart3,
  color = "text-muted-foreground",
  bgColor = "bg-surface-3",
  actions,
  height = 280,
  fitContent = false,
  loading = false,
  empty = false,
  emptyMessage = "No data available",
  footer,
  className,
  contentClassName,
  children,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border border-border bg-card p-4",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-sm",
              bgColor,
              color
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
            {description ? (
              <p className="truncate text-[11px] text-subtle-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className={cn("min-w-0 flex-1", contentClassName)} style={{ minHeight: height }}>
        {/*
          THE PLOT AREA IS THE ONLY PENDING PART.

          This was a 32px spinner centred in the box. The box itself was the
          right size — `height` is applied to the branch — so the spinner cost
          no vertical shift; what it cost was every other signal. A card that
          says "wait" in the middle of an empty rectangle is indistinguishable
          from a card that failed, from a card with no data, and from a card
          that is about to draw a chart, and it is the shape a user reads at a
          glance to decide whether to keep waiting.

          A plot area is the one thing `SkeletonText` is NOT for: it has no
          text metrics to measure itself against, so `SkeletonBlock` with the
          caller's own `height` is the right primitive (see skeleton.tsx).

          Note this branch was also invisible to `scan-skeleton-debt.js`: its
          spinner rule fires on `loading ? <spinner/> : <real/>`, and here the
          false arm was ANOTHER ternary (`empty ? … : …`), which is not JSX, so
          the whole conditional fell through every structural rule.
        */}
        {loading ? (
          <div className="w-full" style={fitContent ? { minHeight: height } : { height }}>
            <SkeletonBlock className="h-full w-full" style={{ height }} />
          </div>
        ) : empty ? (
          <div
            className="flex h-full flex-col items-center justify-center gap-2"
            style={{ height }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-3">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          /* `h-full w-full` is load-bearing: `ResponsiveContainer` measures
             this box, and it measures ZERO against an auto-height parent.
             `fitContent` swaps the fixed height for a floor — see the prop. */
          <div
            className="w-full"
            style={fitContent ? { minHeight: height } : { height }}
          >
            {children}
          </div>
        )}
      </div>

      {/*
        The footer renders WHILE LOADING, and dropping `!loading` from this gate
        is the card's real layout shift.

        `footer` is almost always a `<ChartLegend variant="inline"/>` — a
        wrapping row of swatch+name at `text-xs`, so 18px of legend on top of
        `mt-3` + 1px rule + `pt-3` = 25px of chrome. Withholding it made every
        loading chart card 43px shorter than the one it was about to become, and
        a chart row is normally `h-full` inside a grid, so that is not one card
        moving: the row is measured by its tallest member and every sibling
        resized with it. The KPI row above and everything below the grid moved
        too.

        A caller that passes `footer` has told us a footer is coming; the border
        and its padding are knowable now. The legend inside will render zero
        items until the series lands (`ChartLegend` returns null on an empty
        list), so the rule and its spacing are reserved even when the names are
        not — the remaining settle is one text row, not the whole block.

        `!empty` stays. Empty is a RESOLVED state, not a pending one: the data
        arrived and there is none, so there are no series to name and a legend
        rule over nothing is a stray line.
      */}
      {footer && !empty ? (
        <div className="mt-3 border-t border-border pt-3">{footer}</div>
      ) : null}
    </div>
  )
}

ChartCard.displayName = "ChartCard"
