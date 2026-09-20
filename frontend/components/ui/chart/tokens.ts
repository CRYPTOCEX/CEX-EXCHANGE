/**
 * Chart colour and number tokens — the single source for every chart in the app.
 * ============================================================================
 *
 * Before this file there were three: `charts/donut/utils.ts` had a `colorMap`,
 * `charts/line/utils.ts` had a `variants` map plus a ramp, and every hand-rolled
 * chart in `app/` had neither and wrote `hsl(var(--chart-1))` inline or, more
 * often, a raw hex. Recharts takes a CSS colour STRING, so none of those were
 * visible to the class-based design ratchet — a chart could sit years out of
 * palette without any gate noticing.
 *
 * THE FOUR JOBS A COLOUR CAN DO, and the rule for each:
 *
 *  - **identity** (series 1 vs series 2, segment A vs segment B) -> the ramp,
 *    assigned BY POSITION and never cycled. {@link seriesColor}, {@link chartColor}.
 *  - **magnitude** (light -> dark within one hue) -> not modelled here yet; use
 *    one ramp hue at varying alpha.
 *  - **polarity** (up vs down) -> `--up` / `--down`.
 *  - **state** (succeeded / failed / pending) -> the status tokens in
 *    {@link STATUS_COLORS}. Reserved: never reuse one of these as "series 4".
 *
 * The ramp itself is lightness-banded, chroma-floored and CVD-checked in BOTH
 * themes — see `--chart-1..6` in globals.css. Because every value here is a
 * token reference rather than a resolved colour, a chart re-paints itself when
 * the owner changes the palette in the design manager, with no JS involved.
 */

/**
 * Fixed-order categorical ramp. Assigned by index, NEVER cycled in a way the
 * reader has to disambiguate: a 7th series should fold into "Other" or split
 * into small multiples rather than repeat slot 1. The modulo below is a
 * last-resort guard, not a licence.
 */
export const CHART_RAMP = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
] as const

/**
 * Status / semantic colours. Use ONLY when the series genuinely means a state —
 * an error-rate line, a "failed" band, a profit-vs-loss pair. A two-series chart
 * of "Total Users" and "New Registrations" is two identities, not a success and
 * an info, and painting it that way is a category error that also caps the chart
 * at two distinguishable colours.
 */
export const STATUS_COLORS = {
  success: "hsl(var(--success))",
  danger: "hsl(var(--destructive))",
  destructive: "hsl(var(--destructive))",
  warning: "hsl(var(--warning))",
  info: "hsl(var(--info))",
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  muted: "hsl(var(--muted-foreground))",
  up: "hsl(var(--up))",
  down: "hsl(var(--down))",
  default: "hsl(var(--foreground))",
} as const

export type StatusColorName = keyof typeof STATUS_COLORS

/**
 * Colour NAMES a caller may pass as a segment/series `color`, mapped onto
 * tokens. Every name that survives from the old hex maps is preserved so no
 * call site has to change — only what they paint has.
 *
 * `purple` is the one whose meaning was actually wrong before: it resolved to
 * `--chart-3`, which is the 159deg GREEN slot, so every donut passing "purple"
 * painted green — indistinguishable from the `green`/`emerald` segment beside
 * it, because those resolve to `--success` at the same hue. `--chart-4` (270deg)
 * is the violet slot and the only ramp hue no status token duplicates.
 */
export const CHART_COLOR_NAMES: Record<string, string> = {
  // brand / interaction
  primary: "hsl(var(--primary))",
  blue: "hsl(var(--primary))",
  indigo: "hsl(var(--primary))",

  // status — meaning, not identity
  info: "hsl(var(--info))",
  cyan: "hsl(var(--info))",
  emerald: "hsl(var(--success))",
  green: "hsl(var(--success))",
  teal: "hsl(var(--success))",
  lime: "hsl(var(--success))",
  success: "hsl(var(--success))",
  amber: "hsl(var(--warning))",
  orange: "hsl(var(--warning))",
  yellow: "hsl(var(--warning))",
  gold: "hsl(var(--warning))",
  warning: "hsl(var(--warning))",
  red: "hsl(var(--destructive))",
  pink: "hsl(var(--destructive))",
  rose: "hsl(var(--destructive))",
  danger: "hsl(var(--destructive))",
  destructive: "hsl(var(--destructive))",

  // categorical
  purple: "hsl(var(--chart-4))",
  violet: "hsl(var(--chart-4))",
  gray: "hsl(var(--muted-foreground))",
  grey: "hsl(var(--muted-foreground))",
  slate: "hsl(var(--muted-foreground))",
  zinc: "hsl(var(--muted-foreground))",
  muted: "hsl(var(--muted-foreground))",
}

/** Values Recharts can actually paint. Anything else must not reach `fill`. */
const CSS_COLOUR = /^(#|rgb|hsl|oklch|lab|color\(|var\(|currentColor$|transparent$)/i

/**
 * Recharts' own default palette, which the dashboard API sends down as chart
 * DATA (`{ level: "No KYC Data", color: "#8884D8" }`). These six are never a
 * deliberate brand choice — they are the library's defaults, copied into the
 * API — so they are treated as "no colour given" and take a ramp slot. Any
 * OTHER hex is still honoured, because a caller passing a specific colour
 * means it.
 */
const RECHARTS_DEFAULTS = new Set([
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff8042",
  "#8884d8",
  "#82ca9d",
])

/**
 * Resolve whatever a caller passed as a colour into something paintable.
 *
 * @param color a name from {@link CHART_COLOR_NAMES}, any CSS colour, or
 *              nothing at all.
 * @param index the item's position — used whenever `color` is absent OR
 *              unusable.
 *
 * The unusable case is the one that bites: an API that returns level NAMES in
 * the `color` field hands Recharts a string like `"level-1"`, Recharts silently
 * falls back to its OWN default palette, and an unbranded lilac appears on the
 * dashboard. Anything that is neither a known name nor a CSS colour takes its
 * ramp slot instead.
 */
export function chartColor(color?: string | null, index = 0): string {
  const fallback = CHART_RAMP[index % CHART_RAMP.length]
  if (!color) return fallback
  const named = CHART_COLOR_NAMES[color.toLowerCase()]
  if (named) return named
  if (RECHARTS_DEFAULTS.has(color.toLowerCase())) return fallback
  return CSS_COLOUR.test(color) ? color : fallback
}

/**
 * A series' stroke and its matching translucent fill, by position.
 *
 * The fill is the stroke at 20% — an AREA fill, i.e. data, not faked depth, so
 * the design system's no-gradient rule does not apply to it.
 */
export function seriesColor(index: number): { stroke: string; fill: string } {
  const token = `--chart-${(index % CHART_RAMP.length) + 1}`
  return {
    stroke: `hsl(var(${token}))`,
    fill: `hsl(var(${token}) / 0.2)`,
  }
}

/** Same shape as {@link seriesColor} but for a named status series. */
export function statusSeriesColor(name: StatusColorName): {
  stroke: string
  fill: string
} {
  const stroke = STATUS_COLORS[name] ?? STATUS_COLORS.default
  // `hsl(var(--x))` -> `hsl(var(--x) / 0.2)`; anything else gets a colour-mix.
  const fill = stroke.startsWith("hsl(var(")
    ? stroke.replace(/\)$/, " / 0.2)")
    : `color-mix(in oklab, ${stroke} 20%, transparent)`
  return { stroke, fill }
}

/**
 * AXIS number format — abbreviated, because an axis is space-constrained and
 * its job is to give the reader a scale, not a value.
 *
 * Do NOT use this in a tooltip. `notation: "compact"` rounds silently: 12,483
 * becomes "12K", and a tooltip is the one place the reader is entitled to the
 * exact figure. That mistake has already shipped in this codebase once — the
 * DataTable's bar and area tooltips both ran their values through the compact
 * formatter, so hovering a bar of 12,483 read "12K".
 */
export function formatAxisNumber(value: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0"
  if (Math.abs(value) < 1000) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
  }
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

/** TOOLTIP number format — exact, grouped, never abbreviated. */
export function formatExactNumber(value: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0"
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(value)
}
