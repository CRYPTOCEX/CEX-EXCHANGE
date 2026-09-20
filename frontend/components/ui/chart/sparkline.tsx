"use client"

import * as React from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts"

import { cn } from "@/lib/utils"

import { chartLineCursor, formatTooltipDate, type ChartTimeframe } from "./chart-axis"
import { ChartTooltipContent } from "./chart-tooltip"
import { formatExactNumber } from "./tokens"

/**
 * The background trend line on a stat card — and it is HOVERABLE.
 * ============================================================================
 *
 * A sparkline that cannot be interrogated is a texture: it tells you the shape
 * of the last N periods and nothing else, so a reader who wants to know what
 * happened on the day of the spike has to leave the card. Every point here
 * carries its date, and hovering names the period and gives the exact value.
 *
 * IT IS STILL BACKGROUND. The fill sits at ~14% and the stroke at ~35%, behind
 * the figure, so the card still reads as a number with a trend behind it rather
 * than as a chart with a caption. Only on hover does the line come forward.
 *
 * TWO THINGS THAT LOOK LIKE DETAILS AND ARE NOT:
 *
 *  - **The gradient id comes from `useId`, not from the card's `index`.** SVG
 *    ids are document-global. Ten cards keyed `sparkline-gradient-0` (one per
 *    grid, all starting at index 0 — and a page routinely has three grids) all
 *    resolve `url(#sparkline-gradient-0)` to whichever one mounted first, so
 *    the fills silently cross-wire between unrelated sections.
 *  - **A flat or all-zero series is not drawn.** It renders as a rule across
 *    the bottom of the card, which reads as a divider — a piece of chrome the
 *    card does not otherwise have — rather than as "no movement".
 */
export interface SparklinePoint {
  value: number
  /** ISO string, epoch or Date. Without it the tooltip shows the value alone. */
  date?: string | number | Date
}

export interface SparklineProps {
  data: Array<SparklinePoint | number> | undefined | null
  /** Stroke colour. Defaults to `currentColor` so it inherits the card's tint. */
  color?: string
  /** Series name in the tooltip. */
  label?: string
  timeframe?: ChartTimeframe
  valueFormatter?: (value: number) => string
  /** Set false for a purely decorative trend (a print view, a dense table row). */
  interactive?: boolean
  /** Notified as the pointer moves across the series, and with `null` on leave. */
  onHoverPoint?: (point: { value: number; date?: string | number | Date; index: number } | null) => void
  className?: string
}

/** Normalise `number[]` and `{value,date}[]` into one shape. */
export function normalizeSparkline(
  data: Array<SparklinePoint | number> | undefined | null
): SparklinePoint[] {
  if (!Array.isArray(data)) return []
  return data.map((item) =>
    typeof item === "number" ? { value: item } : { value: Number(item?.value ?? 0), date: item?.date }
  )
}

/**
 * Is there anything worth drawing? Fewer than two points has no shape, all
 * zeros has no magnitude, and a constant series is a straight line that reads
 * as a border rather than as data.
 */
export function hasSparklineShape(points: SparklinePoint[]): boolean {
  if (points.length <= 1) return false
  const values = points.map((p) => p.value)
  if (!values.some((v) => v !== 0)) return false
  return values.some((v) => v !== values[0])
}

export function Sparkline({
  data,
  color = "currentColor",
  label,
  timeframe,
  valueFormatter = formatExactNumber,
  interactive = true,
  onHoverPoint,
  className,
}: SparklineProps) {
  const gradientId = React.useId().replace(/:/g, "")
  const points = React.useMemo(() => normalizeSparkline(data), [data])

  const handleMouseMove = React.useCallback(
    (state: any) => {
      if (!onHoverPoint) return
      /* Recharts 3 widened TooltipIndex to `string | null`, so this arrives as
         a numeric STRING where v2 handed over a number. Coerce before the
         guard, or every hover falls through to onHoverPoint(null). */
      const rawIndex = state?.activeTooltipIndex
      const index = typeof rawIndex === "string" ? Number(rawIndex) : rawIndex
      if (typeof index !== "number" || !Number.isFinite(index) || !points[index]) {
        onHoverPoint(null)
        return
      }
      onHoverPoint({ ...points[index], index })
    },
    [onHoverPoint, points]
  )

  const handleMouseLeave = React.useCallback(() => {
    onHoverPoint?.(null)
  }, [onHoverPoint])

  if (!hasSparklineShape(points)) return null

  const hasDates = points.some((p) => p.date !== undefined && p.date !== null)

  return (
    <div
      /* Marks this as the compact chart shape, so the series-width token can
         keep a sparkline proportionally finer than a full chart instead of
         snapping both to one weight. See the chart block in globals.css. */
      data-chart-spark=""
      className={cn(
        "h-full w-full",
        /* The card's content sits above this layer. Non-interactive sparklines
           must not intercept a click meant for the card itself. */
        interactive ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
          onMouseMove={interactive ? handleMouseMove : undefined}
          onMouseLeave={interactive ? handleMouseLeave : undefined}
          /* Recharts 3 defaults this to TRUE, which puts tabIndex={0} and
             role="application" on every chart svg. A sparkline is a decorative
             trend line inside a stat card, so that would add one keyboard tab
             stop per card across a whole grid. The reader's real target is
             SeriesChart, which keeps the default. */
          accessibilityLayer={false}
        >
          <defs>
            <linearGradient id={`sparkline-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          {/* Anchored at zero so the trend reads against a fixed floor. Without
              it Recharts starts the domain at the series minimum and a line
              that moves 900 -> 910 fills the whole card like a cliff. */}
          <YAxis hide domain={[0, (dataMax: number) => (dataMax > 0 ? dataMax * 1.15 : 1)]} />
          {interactive ? (
            <Tooltip
              {...chartLineCursor}
              isAnimationActive={false}
              wrapperStyle={{ zIndex: 30, outline: "none" }}
              allowEscapeViewBox={{ x: false, y: true }}
              content={
                <ChartTooltipContent
                  timeframe={timeframe}
                  hideLabel={!hasDates}
                  hideIndicator
                  /* The date has to be dug out of the ROW, not read off the
                     Recharts `label`. There is no `<XAxis dataKey>` on a
                     sparkline — the axis is hidden — so `label` is the array
                     INDEX, and a heading of "3" is worse than no heading.
                     Recharts' own `labelFormatter` prop cannot fix this either:
                     it only applies to the DEFAULT tooltip body and is ignored
                     entirely once `content` is supplied. */
                  labelFormatter={(_, rows) =>
                    formatTooltipDate(
                      (rows?.[0]?.payload as SparklinePoint | undefined)?.date,
                      timeframe
                    )
                  }
                  valueFormatter={(value) =>
                    typeof value === "number" ? valueFormatter(value) : value
                  }
                  nameFormatter={() => label ?? "Value"}
                />
              }
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.4}
            fill={`url(#sparkline-${gradientId})`}
            dot={false}
            activeDot={
              interactive
                ? { r: 3, fill: "hsl(var(--card))", stroke: color, strokeWidth: 2 }
                : false
            }
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

Sparkline.displayName = "Sparkline"
