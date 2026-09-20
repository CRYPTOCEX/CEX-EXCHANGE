"use client"

import * as React from "react"
import { AnimatePresence, m } from "framer-motion"
import { PieChart as PieChartIcon } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

import { cn } from "@/lib/utils"
import { Loadable } from "@/components/ui/skeleton"

import { ChartLegend, type ChartLegendItem } from "./chart-legend"
import { chartColor, formatExactNumber } from "./tokens"

/**
 * The one donut. A drop-in replacement for a hand-rolled `<PieChart>` block.
 * ============================================================================
 *
 * Fifteen files drew their own pie, and the same four faults ran through nearly
 * all of them:
 *
 *  1. **Labels outside the ring.** `label={({name, percent}) => \`${name} ${pct}%\`}`
 *     puts a text run at every slice's angle. At four or more segments they
 *     collide, at narrow widths they are clipped by the container, and the ring
 *     shrinks to make room for them — so the chart gets smaller the more data it
 *     has. The value belongs in the middle (where there is unlimited room) and
 *     in the legend (where it aligns into a column and can be compared).
 *  2. **Recharts' own `<Legend/>`,** which steals height from the container and
 *     is unstyleable from the design system.
 *  3. **Colours straight from the API,** including Recharts' own `#8884d8`
 *     default, which is how an unbranded lilac reached the admin dashboard.
 *  4. **No empty state.** A donut of all zeros renders as literally nothing —
 *     a blank box with a legend under it.
 *
 * The centre is the readout: it shows the total at rest, and the hovered
 * segment's own value and share while hovering. That is the "hoverable so you
 * can see how much per period" behaviour, and it needs no floating tooltip
 * because the ring already frames a space to put it in.
 */
export interface DonutSegment {
  /** Stable identity. Falls back to `name` when absent. */
  id?: string
  name: string
  value: number
  /** A name from `CHART_COLOR_NAMES`, any CSS colour, or nothing (takes a ramp slot). */
  color?: string
}

export interface DonutChartProps {
  data: DonutSegment[]
  /** Plot height. The legend sits below and adds its own. */
  height?: number
  /** Caption under the centre figure at rest. */
  centerLabel?: string
  /** Override the centre figure at rest. Defaults to the sum of all values. */
  total?: number
  /** Render each value — centre, legend and all. Defaults to an exact number. */
  valueFormatter?: (value: number) => string
  /** Hide the legend when the caller supplies its own. */
  showLegend?: boolean
  /** Shown when `data` is empty. */
  emptyMessage?: string
  loading?: boolean
  className?: string
  /** Extra classes for the legend block. */
  legendClassName?: string
}

const EMPTY_SEGMENT = "hsl(var(--muted))"

export function DonutChart({
  data,
  height = 220,
  centerLabel = "Total",
  total,
  valueFormatter = formatExactNumber,
  showLegend = true,
  emptyMessage = "No data available",
  loading = false,
  className,
  legendClassName,
}: DonutChartProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const segments = React.useMemo(
    () =>
      (Array.isArray(data) ? data : [])
        .filter((d) => d && typeof d.value === "number" && Number.isFinite(d.value))
        .map((d, i) => ({
          id: d.id ?? d.name ?? String(i),
          name: d.name,
          value: d.value,
          color: chartColor(d.color, i),
        })),
    [data]
  )

  const sum = React.useMemo(
    () => segments.reduce((acc, s) => acc + s.value, 0),
    [segments]
  )

  /* Every value is zero. The data is real — there just isn't any of it yet —
     so the shape stays and goes grey, rather than the chart vanishing. Equal
     slices, because zero has no proportions. */
  const isEmpty = segments.length > 0 && sum === 0

  const plotted = React.useMemo(
    () => (isEmpty ? segments.map((s) => ({ ...s, value: 1 })) : segments.filter((s) => s.value > 0)),
    [segments, isEmpty]
  )

  const active = activeId ? segments.find((s) => s.id === activeId) : null

  const legendItems: ChartLegendItem[] = segments.map((s) => ({
    id: s.id,
    name: s.name,
    color: isEmpty ? EMPTY_SEGMENT : s.color,
    value: s.value,
    percent: sum > 0 ? (s.value / sum) * 100 : 0,
  }))

  /*
    THE PENDING DONUT IS THE REAL DONUT WITH ITS VALUES OUT.

    What used to be here was `if (loading) return <div style={{height}}><spinner/></div>` —
    the ring's own box, and nothing else. Three things were missing from it and
    all three are height:

      - the LEGEND. `showLegend` defaults true and the pending tree had none, so
        a six-segment donut's card grew by three legend rows (81px) at the
        moment the data landed.
      - the CENTRE READOUT, which is a `text-2xl leading-tight` figure over a
        `text-xs` caption. It is absolutely positioned so it costs no height of
        its own, but it is the part of a donut people actually read, and it
        arrived last.
      - `centerLabel`, which is a caption the CALLER already has. There was
        never a reason to withhold it.

    The ring itself is the one part with no text metrics, so it is the one part
    that gets a `SkeletonBlock`-style box — drawn as a RING, at the same 66%/88%
    radii the `<Pie>` below uses, with the hole punched in `bg-card` because that
    is exactly the colour the real donut strokes its segments with.
  */
  /* RESOLVED and empty. Named rather than spelled `!loading && …` inline
     because the two are genuinely different states and this is the one that
     means "the answer came back and there is nothing in it". */
  const resolvedEmpty = !loading && segments.length === 0

  if (resolvedEmpty) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center gap-3", className)}
        style={{ minHeight: height }}
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-3">
          <PieChartIcon className="h-5 w-5 text-muted-foreground" />
        </span>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="relative" style={{ height }}>
        {/* Both arms are a plain `div` filling the plot box — same root, same
            geometry — so the ring never changes size or position as it resolves. */}
        {loading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="relative aspect-square h-full">
              <div className="absolute inset-[6%] animate-pulse rounded-full bg-muted" />
              <div className="absolute inset-[17%] rounded-full bg-card" />
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={plotted}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="66%"
                  outerRadius="88%"
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  /* A 2px ring in the CARD colour, not `--background`: a donut
                     sits on a card, and matching the page ground drew a visible
                     seam between every pair of segments in dark mode. */
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                  isAnimationActive={false}
                  onMouseEnter={(_, index: number) => setActiveId(plotted[index]?.id ?? null)}
                  onMouseLeave={() => setActiveId(null)}
                  style={{ opacity: isEmpty ? 0.4 : 1 }}
                >
                  {plotted.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={isEmpty ? EMPTY_SEGMENT : entry.color}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                      opacity={activeId && activeId !== entry.id ? 0.45 : 1}
                      style={{ cursor: "default", outline: "none" }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* The readout. `pointer-events-none` or it would eat the hover it
            exists to report. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <m.div
              key={active?.id ?? "total"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="max-w-[60%] text-center"
            >
              <div
                className={cn(
                  "font-mono text-2xl font-semibold leading-tight tracking-tight tabular-nums",
                  isEmpty ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {/* The figure waits INSIDE the typography element, so the
                    placeholder is measured by the same `text-2xl leading-tight`
                    run that will lay out the total a moment later. */}
                <Loadable loading={loading} chars={5}>
                  {valueFormatter(isEmpty ? 0 : (active ? active.value : (total ?? sum)))}
                </Loadable>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {active ? (
                  <>
                    {active.name}
                    {sum > 0 ? (
                      <span className="ml-1 font-mono tabular-nums text-subtle-foreground">
                        {((active.value / sum) * 100).toFixed(1)}%
                      </span>
                    ) : null}
                  </>
                ) : (
                  centerLabel
                )}
              </div>
            </m.div>
          </AnimatePresence>
        </div>
      </div>

      {showLegend ? (
        <ChartLegend
          items={legendItems}
          variant="list"
          activeId={activeId}
          onActivate={setActiveId}
          valueFormatter={(v) => valueFormatter(v)}
          muted={isEmpty}
          loading={loading}
          className={legendClassName}
        />
      ) : null}
    </div>
  )
}

DonutChart.displayName = "DonutChart"
