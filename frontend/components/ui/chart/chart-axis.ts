import { format, parseISO, isValid } from "date-fns"

import { formatAxisNumber } from "./tokens"

/**
 * Axis, grid and cursor presets — spread these into Recharts elements.
 * ============================================================================
 *
 * THESE ARE PROP OBJECTS, NOT COMPONENTS, AND THAT IS DELIBERATE.
 *
 * Recharts decides what to render by inspecting the TYPE of each direct child
 * of `<LineChart>` / `<BarChart>` / `<AreaChart>` — it walks `props.children`
 * and matches on the component identity of `CartesianGrid`, `XAxis`, `YAxis`,
 * `Tooltip` and so on. Wrapping any of them in a component of your own, however
 * thin, makes the chart stop seeing it: the axis silently disappears and the
 * grid never draws. So the shared thing has to be the PROPS.
 *
 *     <CartesianGrid {...chartGrid} />
 *     <XAxis dataKey="date" {...chartXAxis} tickFormatter={fmt} />
 *     <YAxis {...chartYAxis} />
 *     <Tooltip {...chartLineCursor} content={<ChartTooltipContent />} />
 *
 * `<Tooltip content={...}>` is the exception that DOES take a component, because
 * Recharts renders that prop itself rather than scanning for it — which is why
 * `ChartTooltipContent` can be a real component.
 *
 * WHAT THE PRESETS ENCODE: the axis is scaffolding, not data. It gets no axis
 * line, no tick marks, muted ink, and 12px type; the grid is horizontal only at
 * 10% opacity. The reader should see the marks first and be able to find the
 * scale when they go looking for it.
 */

/** Horizontal-only hairline grid. Vertical rules compete with the marks. */
export const chartGrid = {
  strokeDasharray: "3 3",
  stroke: "hsl(var(--border))",
  opacity: 0.4,
  horizontal: true,
  vertical: false,
} as const

/** Category / time axis. Pass your own `dataKey` and `tickFormatter`. */
export const chartXAxis = {
  axisLine: false,
  tickLine: false,
  dy: 8,
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
  interval: "preserveStartEnd",
  minTickGap: 16,
} as const

/** Value axis. Abbreviated ticks — the axis gives scale, the tooltip gives truth. */
export const chartYAxis = {
  axisLine: false,
  tickLine: false,
  dx: -4,
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
  tickFormatter: formatAxisNumber,
  width: 48,
} as const

/**
 * Recharts' default y-domain starts at the data minimum, so a series that never
 * drops below 900 renders as a dramatic cliff between 900 and 1000. Anchor to
 * zero, and keep a chart of all-zeros from collapsing to a single line.
 */
export const chartYDomain: [number, (dataMax: number) => number] = [
  0,
  (dataMax: number) => (dataMax > 0 ? dataMax * 1.1 : 1),
]

/** Crosshair for line/area charts — a dashed rule, not a filled band. */
export const chartLineCursor = {
  cursor: {
    stroke: "hsl(var(--muted-foreground))",
    strokeWidth: 1,
    strokeDasharray: "4 4",
    opacity: 0.4,
  },
} as const

/** Hover band for bar charts — a filled column behind the hovered category. */
export const chartBarCursor = {
  cursor: { fill: "hsl(var(--muted-foreground))", opacity: 0.08 },
} as const

/**
 * A bar's top corners follow `--radius` like everything else — but as a NUMBER,
 * because Recharts draws an SVG path and cannot read a CSS custom property.
 * 4px is the value at the default radius; a theme at 0 keeps square bars via
 * `chartBarRadius(0)` if a caller wants to opt in.
 */
export const chartBarRadius: [number, number, number, number] = [4, 4, 0, 0]

/** Marker for the hovered point on a line/area series. */
export function chartActiveDot(stroke: string) {
  return {
    r: 4,
    fill: "hsl(var(--card))",
    stroke,
    strokeWidth: 2,
  }
}

export type ChartTimeframe = "24h" | "7d" | "30d" | "90d" | "1y" | "all" | string

/**
 * Coerce whatever the API sent — ISO string, epoch, Date — into a Date.
 *
 * THE STRING BRANCH IS DELIBERATELY STRICT, and it has to be. `new Date(str)`
 * in V8 falls back to a lenient parser that will read almost anything: the
 * bucket label `"Week 12"` parses cleanly to **December 1st**. Several
 * endpoints here send exactly that kind of pre-formatted label instead of a
 * timestamp, so the lenient path does not fail loudly — it invents a date and
 * puts it on the axis, and nothing downstream can tell.
 *
 * So a bare string is only accepted when it carries something that is
 * unambiguously a date: an ISO prefix, a full 4-digit year, or a clock time.
 * Anything else returns null and is passed through as its own label.
 */
export function toChartDate(value: unknown): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null
  if (typeof value === "number") {
    const d = new Date(value)
    return isValid(d) ? d : null
  }
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = parseISO(trimmed)
    return isValid(d) ? d : null
  }

  // An all-digit string is an epoch, in seconds or milliseconds.
  if (/^\d{9,14}$/.test(trimmed)) {
    const n = Number(trimmed)
    const d = new Date(trimmed.length <= 10 ? n * 1000 : n)
    return isValid(d) ? d : null
  }

  const looksDated = /\d{4}/.test(trimmed) || /\d{1,2}:\d{2}/.test(trimmed)
  if (!looksDated) return null

  const d = new Date(trimmed)
  return isValid(d) ? d : null
}

/**
 * Which bucket size does this timeframe imply?
 *
 * CASE-INSENSITIVE, AND THAT IS THE POINT. Timeframe strings are not a shared
 * enum in this app — the DataTable emits `"24h"` / `"1y"`, the ICO portfolio
 * emits `"1W"` / `"1M"` / `"1Y"` / `"ALL"`, and pages in between use their own.
 * Matching `timeframe === "1y"` therefore fell through to the DAY branch for
 * every uppercase caller, so a year-long chart labelled its month buckets
 * "Jan 05" on the axis and "Fri, Jan 5, 2026" in the tooltip — plausible, and
 * wrong about what the bucket represents.
 *
 * Anything unrecognised gets the day branch, which is the safe default: it is
 * the only one that never claims more precision than the data has.
 */
function bucketOf(timeframe?: ChartTimeframe): "hour" | "day" | "month" {
  if (!timeframe) return "day"
  const t = String(timeframe).toLowerCase()
  if (t === "24h" || t === "1h" || t === "1d" || t === "today") return "hour"
  if (t === "1y" || t === "12m" || t === "all" || t === "ytd" || t === "max") return "month"
  return "day"
}

/**
 * Was this value written with an EXPLICIT zone, i.e. does it denote an instant
 * rather than a bare calendar date?
 *
 * Deliberately narrow. It matches only what `toISOString()` and the MySQL/
 * Sequelize UTC serialisers emit — a trailing `Z`, or a numeric `+05:00` /
 * `+0500` offset. It does NOT match:
 *
 *   - a bare `2026-08-02`, which `parseISO` already reads as LOCAL midnight, so
 *     the local calendar fields are the ones the caller meant;
 *   - an epoch number or a `Date` object, where nothing in the value says which
 *     zone the caller was thinking in — treating those as UTC would silently
 *     re-label every chart whose author intended local time.
 *
 * So this changes the rendering of exactly the values whose zone is stated, and
 * leaves every ambiguous one exactly as it was.
 */
function hasExplicitZone(value: unknown): boolean {
  if (typeof value !== "string") return false
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(value.trim())
}

/**
 * The same instant, with its UTC calendar fields moved into the local ones, so
 * that date-fns `format` — which always reads local fields — prints the UTC day.
 *
 * The alternative is `date-fns-tz`, which is not a dependency here and is not
 * worth adding for one offset.
 */
function asUtcFields(date: Date): Date {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60_000)
}

/**
 * A BUCKET LABEL MUST BE RENDERED IN THE ZONE THE BUCKET WAS CUT IN.
 *
 * `format` reads a Date's LOCAL fields. The dashboards behind these charts cut
 * their daily and monthly buckets in UTC and send the boundary as an ISO
 * instant, so a `2026-08-02T00:00:00.000Z` bucket rendered "Aug 01" for every
 * viewer west of Greenwich — the axis disagreeing with the aggregate it labels,
 * silently, and only for some of the people reading it.
 *
 * Anything without a stated zone keeps its previous local rendering; see
 * `hasExplicitZone` for why that asymmetry is the correct one.
 */
function forDisplay(value: unknown, date: Date): Date {
  return hasExplicitZone(value) ? asUtcFields(date) : date
}

/**
 * AXIS date label — short, because it repeats along the axis.
 *
 * Falls back to the raw value rather than rendering "Invalid Date": several
 * endpoints send a pre-formatted bucket label ("Week 12", "Jan") instead of a
 * timestamp, and those should pass through untouched.
 */
export function formatAxisDate(value: unknown, timeframe?: ChartTimeframe): string {
  const parsed = toChartDate(value)
  if (!parsed) return typeof value === "string" ? value : ""
  const date = forDisplay(value, parsed)
  const bucket = bucketOf(timeframe)
  if (bucket === "hour") return format(date, "HH:mm")
  if (bucket === "month") return format(date, "MMM yyyy")
  return format(date, "MMM dd")
}

/**
 * TOOLTIP date label — long, because it appears once and is the whole point of
 * hovering. "Mar 14" tells you which bar; "Fri, Mar 14, 2026" tells you which
 * day, which is what a reader comparing periods actually needs.
 */
export function formatTooltipDate(value: unknown, timeframe?: ChartTimeframe): string {
  const parsed = toChartDate(value)
  if (!parsed) return typeof value === "string" ? value : ""
  /* Same zone rule as the axis, and it has to be the same or hovering a bar
     would name a different day than the tick directly beneath it. */
  const date = forDisplay(value, parsed)
  const bucket = bucketOf(timeframe)
  if (bucket === "hour") return format(date, "MMM d, h:mm a")
  if (bucket === "month") return format(date, "MMMM yyyy")
  return format(date, "EEE, MMM d, yyyy")
}
