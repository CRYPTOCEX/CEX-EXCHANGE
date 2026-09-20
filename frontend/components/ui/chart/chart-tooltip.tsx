"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

import { formatTooltipDate, type ChartTimeframe } from "./chart-axis"
import { formatExactNumber } from "./tokens"

/**
 * The one chart tooltip.
 * ============================================================================
 *
 * Every chart in the app had its own. Three shapes were in circulation:
 *
 *  - `<Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: … }}`
 *    — an INLINE STYLE object, repeated verbatim in nine files, which is why a
 *    tooltip could not pick up a radius or a border colour from the design
 *    system. It also loses the label entirely on a pie chart.
 *  - a local `renderTooltipContent` in the DataTable's line/bar/area charts,
 *    duplicated four times, each drifting slightly.
 *  - Recharts' own default, which is a white box with a black 1px border and no
 *    relationship to the palette at all.
 *
 * WHY THE VALUE IS NOT ABBREVIATED HERE. Two of the four local copies ran the
 * value through the compact formatter, so hovering a bar of 12,483 read "12K".
 * An axis may abbreviate — it is scaffolding and it is space-constrained. A
 * tooltip may not: it is the one surface where the reader has asked for the
 * exact number, and there is nothing on screen saying the figure is rounded.
 *
 * WHY IT CARRIES A SHADOW when Ledger cards do not: a tooltip is a FLOATING
 * surface. It sits over arbitrary content and needs to detach from it; the
 * design gate exempts popovers, toasts and tooltips from the no-elevation rule
 * for exactly this reason.
 */
export interface ChartTooltipPayloadItem {
  name?: string | number
  value?: number | string
  dataKey?: string | number
  color?: string
  stroke?: string
  fill?: string
  unit?: string
  payload?: Record<string, unknown>
}

export interface ChartTooltipContentProps {
  /** Injected by Recharts. */
  active?: boolean
  /** Injected by Recharts. */
  payload?: ChartTooltipPayloadItem[]
  /** Injected by Recharts — the x-axis value of the hovered category. */
  label?: string | number | Date
  /** Drives how the label date is rendered. */
  timeframe?: ChartTimeframe
  /** Replace the heading entirely. Receives the raw Recharts label. */
  labelFormatter?: (label: unknown, payload: ChartTooltipPayloadItem[]) => React.ReactNode
  /** Format a single series' value. Defaults to an exact grouped number. */
  valueFormatter?: (
    value: number | string | undefined,
    item: ChartTooltipPayloadItem
  ) => React.ReactNode
  /** Rename a series. Defaults to the Recharts `name`. */
  nameFormatter?: (name: string, item: ChartTooltipPayloadItem) => React.ReactNode
  /** Drop the heading row (a pie/donut has no meaningful x value). */
  hideLabel?: boolean
  /** Drop the colour swatches (a single-series chart does not need them). */
  hideIndicator?: boolean
  /** Append a total row summing every series. Useful on stacked charts. */
  showTotal?: boolean
  className?: string
}

/** Recharts hands back `url(#gradient-x)` for gradient fills — unusable as ink. */
function swatchColor(item: ChartTooltipPayloadItem): string {
  const candidates = [item.color, item.stroke, item.fill]
  const usable = candidates.find((c) => typeof c === "string" && c && !c.startsWith("url("))
  return usable ?? "hsl(var(--muted-foreground))"
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  timeframe,
  labelFormatter,
  valueFormatter,
  nameFormatter,
  hideLabel = false,
  hideIndicator = false,
  showTotal = false,
  className,
}: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null

  /* Recharts keeps rendering series that are hidden or absent for this
     category, with value `null`. Showing "Failed —" for every day that had no
     failures is noise, so those rows drop out. */
  const rows = payload.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== ""
  )
  if (rows.length === 0) return null

  const heading = hideLabel
    ? null
    : labelFormatter
      ? labelFormatter(label, rows)
      : formatTooltipDate(label, timeframe)

  const total = showTotal
    ? rows.reduce((sum, item) => sum + (typeof item.value === "number" ? item.value : 0), 0)
    : null

  const renderValue = (item: ChartTooltipPayloadItem) => {
    if (valueFormatter) return valueFormatter(item.value, item)
    if (typeof item.value === "number") return formatExactNumber(item.value)
    return item.value
  }

  return (
    <div
      className={cn(
        /* `text-popover-foreground` is not decoration — it is a RESET.
           On a stat card the sparkline layer carries the card's tint as a text
           colour (`text-chart-3`, say) so the line can be drawn in
           `currentColor`, and Recharts renders the tooltip INSIDE that layer.
           Measured on /admin/crm/user: the tooltip inherited
           `color: rgb(120, 245, 10)`. Every element below happens to set its own
           colour, so nothing was visibly green — but that is luck, and the first
           child added without a colour class would render acid green on a
           near-black ground. The container owns its ink. */
        "min-w-[9rem] rounded-lg border border-border bg-popover p-2.5 text-xs text-popover-foreground shadow-md",
        className
      )}
    >
      {heading ? (
        <div className="mb-1.5 font-medium text-foreground">{heading}</div>
      ) : null}

      <div className="grid gap-1">
        {rows.map((item, index) => (
          <div
            key={`${item.dataKey ?? item.name ?? index}`}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              {hideIndicator ? null : (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: swatchColor(item) }}
                  aria-hidden="true"
                />
              )}
              {/* The series NAME wears muted ink, never the series colour. The
                  swatch beside it already carries identity, and coloured text
                  at 11px fails contrast on both grounds. */}
              <span className="truncate text-muted-foreground">
                {nameFormatter
                  ? nameFormatter(String(item.name ?? item.dataKey ?? ""), item)
                  : String(item.name ?? item.dataKey ?? "")}
              </span>
            </div>
            <span className="shrink-0 font-mono font-medium tabular-nums text-foreground">
              {renderValue(item)}
              {item.unit ? <span className="ml-0.5 font-sans text-muted-foreground">{item.unit}</span> : null}
            </span>
          </div>
        ))}

        {total !== null && rows.length > 1 ? (
          <div className="mt-0.5 flex items-center justify-between gap-4 border-t border-border pt-1">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono font-medium tabular-nums text-foreground">
              {formatExactNumber(total)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

ChartTooltipContent.displayName = "ChartTooltipContent"
