"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Loadable } from "@/components/ui/skeleton"

import { formatExactNumber } from "./tokens"

/**
 * The one chart legend — plain HTML, deliberately NOT Recharts' `<Legend/>`.
 * ============================================================================
 *
 * Recharts renders its legend inside the SVG's sibling wrapper, which means it
 * steals height from `ResponsiveContainer` (so the plot silently shrinks), it
 * cannot wrap sensibly at narrow widths, and its text is unstyleable from the
 * design system — the app's charts ended up with a legend whose type size and
 * colour matched nothing else on the page. Nine files rendered a bare
 * `<Legend />` and got exactly that.
 *
 * Identity must never be carried by colour alone (a legend IS the fix for
 * that), so this always pairs a swatch with a name. `list` additionally shows
 * the value and share, which is what makes a donut readable without hovering
 * every segment.
 */
export interface ChartLegendItem {
  /** Stable key, and the id passed back to `onActivate`. */
  id: string
  name: string
  /** Already resolved through `chartColor` — this component does not resolve. */
  color: string
  /** `list` variant only. */
  value?: number
  /** `list` variant only — 0-100. Derived from the values when omitted. */
  percent?: number
}

export interface ChartLegendProps {
  items: ChartLegendItem[]
  /**
   * `inline` — a centred wrapping row of swatch + name. For multi-series
   * line/bar/area charts, where the values live on the axis.
   * `list` — a two-column grid of swatch + name + value + share. For donuts,
   * where there is no axis to read values from.
   */
  variant?: "inline" | "list"
  /** Currently highlighted item, for hover-linking with the marks. */
  activeId?: string | null
  onActivate?: (id: string | null) => void
  /** `list` only — how to render each value. Defaults to an exact number. */
  valueFormatter?: (value: number, item: ChartLegendItem) => React.ReactNode
  /** Dim everything, for the all-zeros state. */
  muted?: boolean
  /**
   * Render the legend's own rows with pending names and values.
   *
   * Without this a legend simply is not there while its series is in flight —
   * `items` is `[]` until the fetch lands and the component returned `null` —
   * so the block it occupies appeared out of nowhere at the moment of arrival
   * and pushed everything below it down. For the `list` variant under a donut
   * that is `ceil(n/2)` rows of `py-1.5 text-xs`, i.e. 27px per row: a
   * six-segment donut card grew by 81px as its data landed.
   */
  loading?: boolean
  /**
   * How many pending rows to draw. A series has no knowable length before it
   * arrives, so this reserves the container rather than the exact count and the
   * number settles — the same compromise `DataTable` makes with its page size.
   */
  pendingCount?: number
  className?: string
}

export function ChartLegend({
  items,
  variant = "inline",
  activeId,
  onActivate,
  valueFormatter,
  muted = false,
  loading = false,
  pendingCount = 4,
  className,
}: ChartLegendProps) {
  /* Loading and empty are DIFFERENT states and the early return used to
     conflate them: `items.length === 0` is true for both "still fetching" and
     "resolved, nothing to show", and only the second one means "draw nothing". */
  if (!loading && (!items || items.length === 0)) return null

  /* ONE row list for both states, so the pending legend cannot drift from the
     real one — it is literally the same map over the same markup. */
  const rows: ChartLegendItem[] = loading
    ? Array.from({ length: Math.max(1, pendingCount) }, (_, i) => ({
        id: `pending-${i}`,
        name: "",
        color: "transparent",
      }))
    : items

  const total = rows.reduce((sum, item) => sum + (item.value ?? 0), 0)

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5",
          muted && "opacity-60",
          className
        )}
        role="list"
      >
        {rows.map((item) => (
          <div
            key={item.id}
            role="listitem"
            className={cn(
              "flex items-center gap-1.5 text-xs transition-opacity",
              activeId && activeId !== item.id && "opacity-40"
            )}
            onMouseEnter={onActivate && !loading ? () => onActivate(item.id) : undefined}
            onMouseLeave={onActivate && !loading ? () => onActivate(null) : undefined}
          >
            {/* ONE element in both states rather than a swatch/skeleton swap:
                a swatch is 8x8 either way, and two roots for one 8px dot is a
                second thing to keep in sync for no gain. */}
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                loading && "animate-pulse bg-muted"
              )}
              style={loading ? undefined : { backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              <Loadable loading={loading} chars={9}>
                {item.name}
              </Loadable>
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn("grid grid-cols-1 gap-x-2 sm:grid-cols-2", muted && "opacity-60", className)}
      role="list"
    >
      {rows.map((item) => {
        const share =
          item.percent ?? (total > 0 ? ((item.value ?? 0) / total) * 100 : 0)
        const isActive = activeId === item.id
        return (
          <div
            key={item.id}
            role="listitem"
            className={cn(
              "flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors",
              onActivate && "cursor-default",
              isActive ? "bg-surface-3" : onActivate && "hover:bg-surface-3/60"
            )}
            onMouseEnter={onActivate && !loading ? () => onActivate(item.id) : undefined}
            onMouseLeave={onActivate && !loading ? () => onActivate(null) : undefined}
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                loading && "animate-pulse bg-muted"
              )}
              style={loading ? undefined : { backgroundColor: item.color }}
              aria-hidden="true"
            />
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate text-muted-foreground">
                <Loadable loading={loading} chars={9}>
                  {item.name}
                </Loadable>
              </span>
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                <span className="font-mono tabular-nums text-foreground">
                  <Loadable loading={loading} chars={4}>
                    {valueFormatter
                      ? valueFormatter(item.value ?? 0, item)
                      : formatExactNumber(item.value ?? 0)}
                  </Loadable>
                </span>
                {/* The `%` is static — it is knowable now and never changes —
                    so only the digits in front of it wait. */}
                <span className="hidden font-mono tabular-nums text-subtle-foreground sm:inline">
                  <Loadable loading={loading} placeholder="00.0">
                    {share.toFixed(1)}
                  </Loadable>
                  %
                </span>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

ChartLegend.displayName = "ChartLegend"
