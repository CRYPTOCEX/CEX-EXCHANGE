"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  chartActiveDot,
  chartBarCursor,
  chartBarRadius,
  chartGrid,
  chartLineCursor,
  chartXAxis,
  chartYAxis,
  formatAxisDate,
  toChartDate,
  type ChartTimeframe,
} from "./chart-axis"
import { ChartTooltipContent } from "./chart-tooltip"
import { chartColor, formatExactNumber, seriesColor } from "./tokens"

/**
 * One time-series chart, in five shapes.
 * ============================================================================
 *
 * `line`, `area`, `stackedArea`, `bar` and `stackedBar` differ by about ten
 * lines each, and every one of those ten lines was copied into every file that
 * drew a chart. The copies drifted: the DataTable's bar chart picked its series
 * colours with `variants[index === 0 ? "info" : "success"]` — status tokens
 * used as identity, and a hard cap of two distinguishable series — while the
 * area chart beside it had already been fixed to use the ramp. Same config,
 * same page, different colours for the same metric.
 *
 * WHAT THE SHAPE MEANS, so a caller picks rather than guesses:
 *  - `line` — several independent series compared against each other.
 *  - `area` — ONE series where the magnitude matters as much as the movement.
 *  - `stackedArea` / `stackedBar` — parts of a whole over time. Only correct
 *    when the parts genuinely sum to something meaningful.
 *  - `bar` — discrete periods, or categories that are not a continuum.
 *
 * NOT SUPPORTED, DELIBERATELY: a second y-axis. Two measures on different
 * scales sharing one plot is the single most misread chart there is — the
 * crossing point is an artefact of where you put the axes. Use two charts, or
 * index both series to a common base.
 */
export type SeriesChartType = "line" | "area" | "stackedArea" | "bar" | "stackedBar"

export interface SeriesDef {
  /** Key in each data row. */
  key: string
  /** Legend/tooltip name. Defaults to `key`. */
  label?: string
  /**
   * A name from `CHART_COLOR_NAMES`, or any CSS colour. Omit for a ramp slot by
   * position — which is what you want unless the series means a STATE.
   */
  color?: string
}

export interface SeriesChartProps {
  /**
   * `Record<string, any>` and not `Record<string, unknown>`.
   *
   * Callers hand this typed rows — `TradeTimelineItem[]`, `DailyStat[]` — and
   * an INTERFACE does not get an implicit index signature in TypeScript, so it
   * is not assignable to `Record<string, unknown>` however well its fields
   * match. Every call site would have needed a cast through `unknown`, which is
   * a worse outcome than the looseness: it would train people to cast their way
   * past this component's types.
   */
  data: Array<Record<string, any>>
  series: SeriesDef[]
  type?: SeriesChartType
  /** Row key for the x value. */
  xKey?: string
  /** Treat the x value as a date and format it. Set false for plain categories. */
  xIsDate?: boolean
  timeframe?: ChartTimeframe
  /** Format values in the tooltip. The axis always abbreviates. */
  valueFormatter?: (value: number) => string
  /** Add a summed row to the tooltip. Meaningful on stacked shapes. */
  showTotal?: boolean
  /** Override the x tick text. */
  formatXAxis?: (value: any) => string
  /** Hide the y axis entirely — for a compact chart where the tooltip suffices. */
  hideYAxis?: boolean
  /**
   * Lay a BAR chart on its side: categories down the y axis, magnitude along x.
   *
   * This is the shape a ranking needs. A top-10 drawn vertically gives every
   * label a ~40px column to fit a gateway name or a wallet address into, so the
   * ticks are either rotated or truncated; horizontally each label gets a full
   * row. It is also the honest alternative to a ten-slice donut, which cannot
   * be read at all — four configs in this codebase tried one.
   *
   * Ignored for anything that is not a bar: a sideways time series is nonsense.
   */
  horizontal?: boolean
  /** Recharts margin override. */
  margin?: { top?: number; right?: number; left?: number; bottom?: number }
  /**
   * Fixed height. OMIT when this sits inside a `ChartCard`, which already gives
   * the plot a sized box — `ResponsiveContainer` measures its parent and
   * measures ZERO against an auto-height one.
   *
   * Recharts 3 narrowed `ResponsiveContainer`'s height from `number | string`
   * to `number | ${number}%`, so this mirrors it rather than widening it back:
   * a "300px" here was never honoured by the container anyway, and every call
   * site already passes a number or "100%".
   */
  height?: number | `${number}%`
}

export function SeriesChart({
  data,
  series,
  type = "line",
  xKey = "date",
  xIsDate = true,
  timeframe,
  valueFormatter = formatExactNumber,
  showTotal,
  formatXAxis,
  hideYAxis = false,
  horizontal = false,
  margin = { top: 8, right: 8, left: 0, bottom: 0 },
  height = "100%",
}: SeriesChartProps) {
  const gradientId = React.useId().replace(/:/g, "")

  /* Parse dates ONCE, and drop rows whose date will not parse rather than
     letting `Invalid Date` reach the axis — Recharts renders those as a tick
     labelled "Invalid Date" and puts the point at NaN, which silently collapses
     the whole domain. */
  const rows = React.useMemo(() => {
    if (!Array.isArray(data)) return []
    if (!xIsDate) return data
    return data
      .map((row) => {
        const date = toChartDate(row[xKey])
        return date ? { ...row, [xKey]: date } : null
      })
      .filter(Boolean) as Array<Record<string, any>>
  }, [data, xKey, xIsDate])

  const resolved = React.useMemo(
    () =>
      series.map((s, i) => ({
        ...s,
        label: s.label ?? s.key,
        stroke: s.color ? chartColor(s.color, i) : seriesColor(i).stroke,
      })),
    [series]
  )

  /**
   * RECHARTS' DEFAULT Y DOMAIN IS `[0, "auto"]`, WHICH CLIPS NEGATIVES.
   *
   * A P&L series that goes below zero is drawn flat along the axis floor and
   * the loss simply is not there — no warning, no clipped-marker, nothing. So
   * the domain has to be chosen from the data: anchor at zero when everything
   * is non-negative (a count that never touches its own axis reads as a cliff
   * otherwise), and let Recharts fit both ends as soon as anything is negative.
   */
  const hasNegative = React.useMemo(
    () =>
      rows.some((row) =>
        series.some((s) => {
          const v = row[s.key]
          return typeof v === "number" && v < 0
        })
      ),
    [rows, series]
  )
  const yDomain: [number | string, number | string] = hasNegative
    ? ["auto", "auto"]
    : [0, "auto"]

  if (rows.length === 0 || resolved.length === 0) return null

  const stacked = type === "stackedArea" || type === "stackedBar"
  const isBar = type === "bar" || type === "stackedBar"

  const tickFormatter =
    formatXAxis ?? (xIsDate ? (v: any) => formatAxisDate(v, timeframe) : undefined)

  /**
   * AN ARRAY, NOT A FRAGMENT. This is the rule at the top of `./chart-axis`,
   * and it bites here just as hard as it does at a call site.
   *
   * Recharts locates its children by walking `props.children` and matching on
   * component identity. `React.Children.toArray` FLATTENS a nested array, so
   * every element below is seen as a direct child of the chart — but it treats
   * a `<>…</>` as ONE opaque child, so a Fragment hides everything inside it.
   *
   * This was a Fragment first, and the failure is silent and easy to miss: the
   * marks still draw (they are direct children), so the chart looks basically
   * right — it just has no axes, no grid and no tooltip. It took a DOM probe
   * counting `.recharts-cartesian-axis-tick` on a rendered page to see it;
   * every converted chart in the app had lost its axes and read as plausible.
   */
  const axes = [
    <CartesianGrid key="grid" {...chartGrid} />,
    <XAxis
      key="x"
      dataKey={xKey}
      tickFormatter={tickFormatter}
      {...chartXAxis}
      interval={timeframe === "24h" && isBar ? 2 : chartXAxis.interval}
    />,
    hideYAxis ? (
      <YAxis key="y" hide domain={yDomain} />
    ) : (
      <YAxis key="y" {...chartYAxis} domain={yDomain} />
    ),
    // A zero rule, but only where zero is INSIDE the plot. On an all-positive
    // chart it would sit on the axis floor and read as a second axis line.
    hasNegative ? (
      <ReferenceLine key="zero" y={0} stroke="hsl(var(--border-strong))" strokeWidth={1} />
    ) : null,
    <Tooltip
      key="tip"
      {...(isBar ? chartBarCursor : chartLineCursor)}
      isAnimationActive={false}
      content={
        <ChartTooltipContent
          timeframe={timeframe}
          hideLabel={!xIsDate && !formatXAxis}
          labelFormatter={
            xIsDate ? undefined : (label) => (label == null ? null : String(label))
          }
          valueFormatter={(value) =>
            typeof value === "number" ? valueFormatter(value) : value
          }
          showTotal={showTotal ?? stacked}
        />
      }
    />,
  ]

  if (isBar && horizontal) {
    /**
     * A separate axis array, not a flag on the shared one. With
     * `layout="vertical"` Recharts swaps which axis is which: X carries the
     * NUMBER and Y carries the CATEGORY, so `dataKey`, the tick formatter and
     * the numeric domain all move across. Reusing `axes` here silently
     * produced a chart with a category domain on a numeric axis, which renders
     * as bars of equal length — plausible, and wrong.
     */
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid {...chartGrid} horizontal={false} />
          {/* The NUMBER axis. `chartYAxis` is the numeric preset — it is
              spread here, on x, because that is where the magnitude now lives. */}
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={chartYAxis.tick}
            tickFormatter={chartYAxis.tickFormatter}
            domain={yDomain}
          />
          {/* The CATEGORY axis.
              NOT `{...chartYAxis}`: that preset carries `tickFormatter:
              formatAxisNumber`, and running a category label through a number
              formatter renders every row as "0" — the bars are the right length
              and every label is a zero. Only the styling is shared. */}
          <YAxis
            type="category"
            dataKey={xKey}
            axisLine={false}
            tickLine={false}
            tick={chartYAxis.tick}
            /* Room for a real label — a gateway name, a currency, a status. */
            width={128}
            interval={0}
            tickFormatter={(v: any) => {
              const s = v == null ? "" : String(v)
              return s.length > 18 ? s.slice(0, 17) + "…" : s
            }}
          />
          <Tooltip
            {...chartBarCursor}
            isAnimationActive={false}
            content={
              <ChartTooltipContent
                valueFormatter={(value) =>
                  typeof value === "number" ? valueFormatter(value) : value
                }
                labelFormatter={(label) => (label == null ? null : String(label))}
              />
            }
          />
          {resolved.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.stroke}
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (isBar) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={margin}>
          {axes}
          {resolved.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.stroke}
              stackId={type === "stackedBar" ? "a" : undefined}
              /* Only the TOP bar of a stack gets rounded corners; rounding
                 every segment leaves visible notches down the column. */
              radius={type === "stackedBar" ? undefined : chartBarRadius}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (type === "area" || type === "stackedArea") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={rows} margin={margin}>
          <defs>
            {resolved.map((s, i) => (
              <linearGradient
                key={s.key}
                id={`series-${gradientId}-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.stroke} stopOpacity={stacked ? 0.5 : 0.28} />
                <stop offset="100%" stopColor={s.stroke} stopOpacity={stacked ? 0.2 : 0.02} />
              </linearGradient>
            ))}
          </defs>
          {axes}
          {resolved.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.stroke}
              strokeWidth={2}
              fill={`url(#series-${gradientId}-${i})`}
              stackId={stacked ? "1" : undefined}
              dot={false}
              activeDot={chartActiveDot(s.stroke)}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={margin}>
        {axes}
        {resolved.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.stroke}
            strokeWidth={2}
            /* A single-point series draws no line at all — Recharts needs two
               points to stroke a path — so it has to be shown as a dot or the
               chart looks broken. */
            dot={rows.length === 1 ? { r: 3, fill: s.stroke, strokeWidth: 0 } : false}
            activeDot={chartActiveDot(s.stroke)}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

SeriesChart.displayName = "SeriesChart"

/** Legend items for a `SeriesChart`, resolved the same way the marks are. */
export function seriesLegendItems(series: SeriesDef[]) {
  return series.map((s, i) => ({
    id: s.key,
    name: s.label ?? s.key,
    color: s.color ? chartColor(s.color, i) : seriesColor(i).stroke,
  }))
}
