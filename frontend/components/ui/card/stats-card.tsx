"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { m } from "framer-motion"
import { cn } from "@/lib/utils"
import { SkeletonText } from "@/components/ui/skeleton"
import { formatMoney } from "@/utils/currency"
import { Sparkline, hasSparklineShape, normalizeSparkline } from "@/components/ui/chart/sparkline"
import { FIGURE_LINE_HEIGHT, figureFontSize } from "@/components/ui/card/fit-figure"
import type { ChartTimeframe } from "@/components/ui/chart/chart-axis"

/**
 * A sparkline point. `date` is optional for back-compatibility with the ten
 * call sites that pass bare numbers, but SUPPLY IT: without a date the trend is
 * a texture — you can see that something spiked and not when.
 */
export interface SparklineData {
  value: number
  date?: string | number | Date
}

/**
 * Is this value a FIGURE, or is it prose?
 *
 * Exported and pure because it is the single most-repeated decision in the card
 * migration — applied 230 times in one pass — and it was an untestable inline
 * expression. Anywhere outside this component that has to make the same call
 * should import it rather than re-derive the rule slightly differently.
 *
 * R4 asks for monospace and tabular figures on numbers, and the reason is
 * mechanical: tabular digits stop a value shifting sideways as it updates.
 * Neither reason applies to "Never" or "about 2 hours", and prose set in a
 * monospace face at 24px reads as a bug. Applying mono unconditionally — which
 * this component did — was the wrong half of the rule.
 *
 * A figure is a number, or a string carrying digits with no WORD in it. A unit
 * suffix of one or two letters is still a figure ("4.1h", "12.5K"); three or
 * more consecutive letters is a word, so "about 2 hours" is prose. That cutoff
 * is also why a currency CODE must be split out of the figure at the call site —
 * "1,200 USD" is prose by this rule, and rightly so.
 */
export function isFigureValue(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value !== "string") return false
  return /\d/.test(value) && !/[A-Za-z]{3,}/.test(value)
}

/**
 * Money, in a denomination `Intl` may never have heard of.
 *
 * `style: "currency"` does not require a REAL currency — it requires a
 * WELL-FORMED one, three ASCII letters — and throws a RangeError on anything
 * else. So "ETH" is fine (it prints `ETH 3.00`) and "USDT" takes the page down.
 * Not in a handler, either: this runs during render, so the throw escapes to
 * the error boundary and the whole analytics tab goes blank. That is what
 * /admin/nft/listing did — its "GMV (USDT)" card is `currency: "USDT"` — and it
 * is not a one-off: the DataTable KPI passes a code that can come from the
 * PAYLOAD, so any ticker on the platform can reach this line at runtime.
 *
 * `formatMoney` is the shared guard. Its fallback deliberately mirrors Intl's
 * own shape for an unknown-but-well-formed code — grouped figure, then the code — so the ETH card and the
 * USDT card beside it read as the same kind of number instead of one saying
 * `ETH 3.00` and the other `5,000.00 USDT`. Fraction digits match the ISO path
 * for the same reason.
 */
function formatCurrencyValue(value: number, currency: string, compact: boolean): string {
  /* `minimumFractionDigits: 2` on the full form is not decoration: the currency
     style applies a currency's own digit count (2 for anything Intl does not
     recognise), so without it the ETH card reads `ETH 3.00` and the USDT card
     next to it reads `USDT 5,000.5`. Compact drops it, exactly as `$1.2M` does. */
  return formatMoney(
    value,
    currency,
    compact
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )
}

export interface StatsCardProps {
  /** The label/title displayed above the value */
  label: string
  /**
   * The main value.
   *
   * A number or a numeric string renders as a FIGURE — monospaced and tabular.
   * Prose ("Never", "about 2 hours") renders in the interface face, because R4
   * asks for monospace on numbers and prose set in mono just looks broken.
   * A ReactNode (a Badge, say) is rendered untouched at figure size.
   */
  value: number | string | React.ReactNode
  /** Lucide icon component */
  icon: LucideIcon
  /** Optional change value (e.g., +5 today) */
  change?: number | string
  /** Label for the change badge (e.g., "today", "rate") */
  changeLabel?: string
  /**
   * Flip which direction of the delta is the good one.
   *
   * `up`/`down` are DIRECTIONAL tokens — green for a rise, red for a fall — and
   * that is right for revenue and wrong for a failure count: notification
   * failures that doubled over the period rendered `+112%` in green, i.e. the
   * card painted the worst news on the page as the best. Set this on a metric
   * where less is better and the chip's colour follows the MEANING instead of
   * the sign. The figure is untouched: `+112%` still reads `+112%`.
   */
  invertChange?: boolean
  /** Optional description text displayed below the value */
  description?: string
  /** Icon colour — a Tailwind text colour class. Tints the TILE only. */
  color?: string
  /** Icon tile background — a Tailwind bg colour class. */
  bgColor?: string
  /** Format value as currency */
  isCurrency?: boolean
  /**
   * Abbreviate the figure — 12,483 becomes "12K".
   *
   * OFF by default, and that default is load-bearing. This component used to
   * compact EVERY number unconditionally, and when 26 local cards were migrated
   * onto it several of them silently started rounding: a support queue of 12,483
   * tickets rendered as "12K", and the "Total Users 54" card would have read the
   * same at 54,321. An abbreviated figure is a lie about a count, and nothing in
   * the UI said it was approximate. Ask for it where the space genuinely matters.
   */
  compact?: boolean
  /** Format change as percentage */
  isPercent?: boolean
  /**
   * Currency code for formatting (default: USD).
   *
   * Any code is safe here, ISO 4217 or not — a crypto ticker of four or more
   * letters no longer throws. See `formatCurrencyValue`.
   */
  currency?: string
  /** Optional click handler */
  onClick?: () => void
  /** Optional className for the card */
  className?: string
  /** Animation delay index for staggered animations */
  index?: number
  /**
   * Optional 0-100 fill under the figure. Exists so a card with a proportion to
   * show does not have to be built by hand — that is how three of the four
   * shapes on the CRM user page came to be local markup.
   */
  progress?: number
  /**
   * Optional trend behind the figure. `{ value, date }[]` or a bare `number[]`.
   *
   * It is INTERACTIVE: hovering it names the period and gives the exact value
   * for that point. Pass dates, or the tooltip can only show the value.
   */
  sparklineData?: SparklineData[] | number[]
  /** Sparkline color - defaults to the card's own tint via `currentColor`. */
  sparklineColor?: string
  /** Series name in the sparkline tooltip. Defaults to the card's `label`. */
  sparklineLabel?: string
  /** Controls how the sparkline tooltip renders its dates. */
  timeframe?: ChartTimeframe
  /** Set false for a decorative-only trend (a dense grid, a print view). */
  sparklineInteractive?: boolean
  /**
   * Render the shell with placeholders instead of the figure.
   *
   * The card keeps its own frame while loading rather than being swapped for a
   * bare `<Skeleton className="h-32"/>`, which is what most call sites did: a
   * grid of loose grey rectangles that then reflows into bordered cards is a
   * visible layout jump on every refresh.
   */
  loading?: boolean
}

/**
 * THE stat card. One component, "Ledger" shell.
 * ============================================================================
 *
 * There were 26 separate implementations of this idea across 26 files —
 * `StatCard` in fifteen of them, plus `SummaryCard`, `MetricCard`, `KpiCard`,
 * `QuickStatCard`, `OverviewCard`, `StatusCard` — none importing from a shared
 * one. That is why `/admin` and `/admin/crm/kyc` render the same concept in two
 * unrelated visual languages. This is the one they all collapse into.
 *
 * THE SHELL: hairline border, `--card` fill, `rounded-lg` (the radius the
 * design system names), and NO elevation. Depth comes from the border, which is
 * a border at any lightness — so this looks identical in both colour schemes and
 * survives an owner setting any palette in the design manager. The alternative
 * that was on the table, a soft two-layer shadow, is invisible on a 3.5%
 * lightness ground: it would have given the product one card language in light
 * mode and a different one in dark.
 *
 * WHAT WAS REMOVED, AND WHY
 *
 *  - **The coloured figure.** `color` used to be applied to the value text, so
 *    the number rendered in the caller's hue. On this platform colour means
 *    direction or state; a KPI's hue was chosen by its position in an array, so
 *    it meant "this is the third card". The figure is now `--foreground` and the
 *    colour has moved to the delta, where it says something true. `color` still
 *    tints the icon TILE, so every existing call site keeps its identity — that
 *    is a separate, reversible decision (flip the two defaults below to go fully
 *    neutral).
 *
 *  - **Five stacked absolutely-positioned layers** faking depth: a
 *    `backdrop-blur-xl` glass plate, a hover glow, a light-mode-only shadow, a
 *    24x24 blurred accent blob, and a masked bottom accent line. All decoration,
 *    none of it in the token system, and the blob in particular re-derived a
 *    colour by string-replacing `/10` with `/40` inside a class name.
 *
 *  - **`whileHover={{ scale: 1.02 }}`.** A scale transform cannot be reached by
 *    `prefers-reduced-motion` from CSS, and Ledger has no lift to animate to.
 *    The staggered entrance stays: callers pass `index` and rely on it.
 *
 * THE FIGURE IS MONOSPACED AND TABULAR. Rule R4 already requires it for prices
 * and balances; a KPI is the same kind of number, and tabular figures stop the
 * digits shifting sideways as a value updates.
 */
export function StatsCard({
  label,
  value,
  icon: Icon,
  change,
  changeLabel,
  invertChange = false,
  description,
  color = "text-muted-foreground",
  bgColor = "bg-surface-3",
  isCurrency = false,
  isPercent = false,
  compact = false,
  progress,
  currency = "USD",
  onClick,
  className,
  index = 0,
  sparklineData,
  sparklineColor,
  sparklineLabel,
  timeframe,
  sparklineInteractive = true,
  loading = false,
}: StatsCardProps) {
  const isFigure = isFigureValue(value)

  const formatValue = () => {
    if (React.isValidElement(value)) return value
    if (typeof value === "string") return value
    if (typeof value !== "number") return value as React.ReactNode

    if (isCurrency) {
      return formatCurrencyValue(value, currency, compact)
    }

    return new Intl.NumberFormat(
      "en-US",
      compact ? { notation: "compact", maximumFractionDigits: 1 } : {}
    ).format(value)
  }

  const formatChange = () => {
    if (change === undefined || change === null) return null

    const prefix = typeof change === "number" && change > 0 ? "+" : ""
    const suffix = isPercent ? "%" : ""

    return `${prefix}${change}${suffix}`
  }

  /**
   * Direction of the delta, and the ONE case that is neither.
   *
   * A change of exactly 0 — or a non-numeric string like "4.1h" that some call
   * sites pass as a change — is not an improvement, and painting it green said
   * it was. Those get the neutral chip.
   */
  const changeDirection: "up" | "down" | "flat" = (() => {
    if (typeof change === "number") return change > 0 ? "up" : change < 0 ? "down" : "flat"
    if (typeof change === "string") {
      if (change.startsWith("-")) return "down"
      if (/^\+|^\d/.test(change.trim()) && /%|\d/.test(change)) {
        return change.startsWith("+") ? "up" : "flat"
      }
    }
    return "flat"
  })()

  /** Which colour the delta is painted in — see `invertChange`. */
  const changeTone: "up" | "down" | "flat" =
    invertChange && changeDirection !== "flat"
      ? changeDirection === "up"
        ? "down"
        : "up"
      : changeDirection

  /**
   * THE FIGURE IS FITTED TO THE CARD, NOT THE OTHER WAY AROUND.
   *
   * A long figure used to paint straight through the card's right-hand border —
   * the root deliberately has no `overflow-hidden` (the sparkline's tooltip
   * lives inside it) and a `grid-cols-N` column is `minmax(0, 1fr)` and cannot
   * grow, so the text simply left. `fit-figure.ts` holds the rule, the numbers
   * and the reasoning; it is a separate module because jsdom implements no
   * container queries, so the arithmetic is the only part a unit test can
   * reach.
   *
   * Only a FIGURE is fitted. `isFigureValue` has already decided what counts,
   * and prose ("about 2 hours") is set in the interface face where a fixed
   * glyph advance does not hold — it has spaces and wraps on its own.
   *
   * Not while LOADING either: the placeholder is six characters and always
   * fits, and fitting it to a value the card is not yet showing would size the
   * skeleton for a number nobody can see.
   */
  const rendered = formatValue()
  const fittedChars =
    !loading &&
    isFigure &&
    (typeof rendered === "string" || typeof rendered === "number")
      ? String(rendered).length
      : 0

  const figureStyle: React.CSSProperties = {
    lineHeight: FIGURE_LINE_HEIGHT,
    fontSize: figureFontSize(fittedChars),
  }

  const sparklineStroke = sparklineColor ?? "currentColor"
  const sparklinePoints = React.useMemo(
    () => normalizeSparkline(sparklineData),
    [sparklineData]
  )
  const hasSparklineData = !loading && hasSparklineShape(sparklinePoints)

  /**
   * A card that carries a trend reserves room for it.
   *
   * The sparkline is a `h-3/5` layer, so on a card left at its content height —
   * label row, figure, delta chip, 32px of padding, about 127px — the trend gets
   * roughly 76px and reads as a smudge along the bottom edge rather than as a
   * shape. The DataTable's analytics KPIs do not look like that, and the reason
   * is incidental: their section is `lg:auto-rows-fr` beside a 373px donut card,
   * which stretches each KPI row to ~178px and hands the trend ~107px. Every
   * other KPI row in the product — /admin/system/notification, ecommerce, nft,
   * faq, copy-trading — has no such neighbour and got the smudge.
   *
   * `min-h-44` (176px) is that stretched height, made a property of the card
   * instead of a side effect of what happens to sit next to it. It is a MINIMUM,
   * so the DataTable's row is unaffected and a card with a long description
   * still grows.
   *
   * Keyed on the PROP, not on `hasSparklineData`: a series that is empty while
   * loading, or flat because nothing moved, must still occupy the same box, or a
   * four-up row reflows by 50px as the data lands and re-ragged itself whenever
   * one metric happened to be quiet.
   */
  const reservesTrendSpace = sparklineData !== undefined

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0, 0, 0.2, 1] }}
      className={cn(
        /* `h-full` so a card always fills its grid cell.
           Without it, a KPI row renders ragged: the cards carrying a delta chip
           are one line taller than the ones that are not, and a CSS grid
           stretches the ITEM, not the content inside it. Outside a stretch
           context `height: 100%` against an auto-height parent resolves to auto,
           so this is a no-op everywhere else. */
        /* NO `overflow-hidden` on the root, and that is load-bearing now that
           the sparkline is interactive. Recharts renders its tooltip inside the
           chart's own wrapper, i.e. inside this box — so a clipping root cuts
           the tooltip off at the card edge. It cut the VALUE row specifically,
           because the heading renders first: hovering gave you the date and
           then hid the number, which is the wrong half to lose. The sparkline
           layer clips itself instead, just below. */
        "group relative h-full rounded-lg border border-border bg-card p-4",
        reservesTrendSpace && "min-h-44",
        onClick &&
          "cursor-pointer transition-colors duration-200 hover:border-border-strong focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
      onClick={onClick}
      /* A card that does something is a control, so it has to be reachable and
         operable from the keyboard. 171 call sites pass `onClick` and none of
         them were. */
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {/* Sparkline, behind the content and deliberately quiet. The gradient here
          is DATA (an area fill), not faked depth, so R3 does not apply. */}
      {hasSparklineData && (
        <div
          className={cn(
            /*
              NO `z-0` here, and that is not an oversight.

              Recharts renders its tooltip as a child of the chart wrapper, so
              the tooltip is INSIDE this layer. `z-0` is a z-index value, not
              `auto`, so it opens a stacking context — and everything inside is
              then trapped below the `relative z-10` content beside it, however
              high its own z-index goes. The tooltip would render underneath the
              figure it is annotating.

              Left at `auto`, this layer still paints first (it comes earlier in
              the DOM and the content is positioned), so the trend stays behind
              the number, while the tooltip's own z-index competes in the card's
              stacking context and wins.

              And no `overflow-hidden` either — the area fill cannot escape its
              own `<svg>`, which browsers clip by default, so it was only ever
              clipping the tooltip.
            */
            "absolute inset-x-0 bottom-0 h-3/5",
            color
          )}
        >
          <Sparkline
            data={sparklinePoints}
            color={sparklineStroke}
            label={sparklineLabel ?? label}
            timeframe={timeframe}
            interactive={sparklineInteractive && !onClick}
          />
        </div>
      )}

      {/*
        `pointer-events-none` so the trend underneath stays hoverable.

        This layer is a full-width block. A transparent box still hit-tests, so
        without this it swallows every pointer event across its whole width —
        including the empty space beside the figure, which is most of the card —
        and the sparkline behind it can only be reached in the thin strip below
        the last line of text. Nothing in here is interactive: the click handler
        lives on the ROOT, and events pass through to it exactly as before.

        The one exception is the figure itself, which gets its events back below
        so the number stays selectable. It sits above the plot area, so it costs
        no hover surface.
      */}
      <div className={cn("relative z-10", hasSparklineData && "pointer-events-none")}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-sm",
              bgColor,
              color
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>

        {/*
          ONE element in both states, and that is the fix.

          This used to branch to `<div className="h-8 w-24 ...">`, a box that
          does not match the figure it stands in for: `text-2xl leading-tight`
          is a 30px line box and `h-8` is 32px, so every card twitched 2px
          upward as its number landed — times however many rows of cards the
          page has. The branch also dropped `text-2xl` entirely, so the
          placeholder could not track a typography change even in principle.

          Keeping the typography div and swapping only its CONTENT means the
          height is produced by the same text layout in both states, so it
          cannot disagree with itself. `SkeletonText` measures the rest.

          `leading-tight` has since become `FIGURE_LINE_HEIGHT` in the style
          below — the same 30px, but stated in absolute units so it survives the
          font being fitted. That is the same argument one level down.
        */}
        {/* The query container for the figure's size, and it is THIS wrapper
            rather than the card root on purpose. `container-type: inline-size`
            brings layout containment with it, which makes the element a
            containing block and a stacking context — on the root that would put
            the sparkline's tooltip in a box it is documented to need to escape.
            A plain block child fills the card's content width, so `100cqi` is
            the same number either way, and nothing else is affected. */}
        <div className="@container">
          <div
            className={cn(
              "text-2xl font-semibold tracking-tight text-foreground",
              /* `|| loading` because `value` is typically undefined until the
                 fetch lands, which would make `isFigure` false and drop the
                 tabular metrics from exactly the state that needs them: the
                 placeholder is digits, and it should be measured as digits. */
              (isFigure || loading) && "font-mono tabular-nums",
              /* The last resort under the clamp's floor — see `figureStyle`. */
              fittedChars > 0 && "[overflow-wrap:anywhere]",
              /* `w-fit` so re-enabling pointer events here reclaims only the
                 number's own box, not the full card width. */
              hasSparklineData && "pointer-events-auto w-fit"
            )}
            style={figureStyle}
          >
            {loading ? <SkeletonText chars={6} /> : rendered}
          </div>
        </div>

        {typeof progress === "number" ? (
          <div
            className="mt-2.5 h-1 w-full overflow-hidden rounded-sm bg-surface-3"
            role="progressbar"
            aria-valuenow={Math.round(Math.min(100, Math.max(0, progress)))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {/* `currentColor` so the bar inherits whatever hue the tile carries,
                rather than introducing a second colour decision per card. */}
            <div
              className={cn("h-full rounded-sm bg-current", color)}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        ) : null}

        {/*
          The delta row renders in BOTH states, and the `!loading &&` that used
          to gate it was the larger of this card's two shifts.

          `changeLabel` and `description` are static strings the caller already
          has while the fetch is in flight — there is no reason to withhold
          them, and withholding them made the card ~17px shorter than it was
          about to be. In a grid with `h-full` that is not one card moving: the
          whole row is measured by its tallest member, so every sibling
          resized too.

          Only the delta CHIP is genuinely unknown while loading, and a caller
          that passes `changeLabel` has told us one is coming — a label for a
          chip that never arrives is meaningless — so that is the signal used
          to reserve its box.
        */}
        {(change !== undefined && change !== null) || description || changeLabel ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-subtle-foreground">
            {change !== undefined && change !== null ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
                  changeTone === "up" && "bg-up/12 text-up-ink",
                  changeTone === "down" && "bg-down/12 text-down-ink",
                  changeTone === "flat" && "bg-surface-3 text-muted-foreground"
                )}
              >
                {formatChange()}
              </span>
            ) : loading && changeLabel ? (
              <span className="inline-flex items-center rounded-sm bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums">
                <SkeletonText chars={4} radius="rounded-xs" />
              </span>
            ) : null}
            {changeLabel ? <span>{changeLabel}</span> : null}
            {/* NOT `truncate`. It was, and the binary analytics migration proved
                why that is wrong: all eight of its captions run 66-95 characters
                and every one ENDS in the threshold that makes the figure
                readable ("Good: >= 1.5"). At this grid's width roughly 26
                characters survived, so the clipped part was the load-bearing
                part. A caption that does not fit should wrap, not disappear. */}
            {description ? <span>{description}</span> : null}
          </div>
        ) : null}
      </div>
    </m.div>
  )
}

export interface StatsGridProps {
  /** Array of stats to display */
  stats: StatsCardProps[]
  /** Number of columns on different breakpoints */
  columns?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  /** Optional className for the grid container */
  className?: string
}

/**
 * A grid layout for multiple StatsCard components with staggered animations.
 */
export function StatsGrid({
  stats,
  columns = { default: 2, md: 3, lg: 5 },
  className,
}: StatsGridProps) {
  /**
   * These MUST be written out as whole literal class names.
   *
   * The previous implementation built them by interpolation
   * (`` `md:grid-cols-${columns.md}` ``). Tailwind discovers classes by scanning
   * source TEXT, so a class assembled at runtime is never emitted — and none of
   * these were: `md:grid-cols-3` and `lg:grid-cols-5`, this component's own
   * defaults, are both absent from the compiled stylesheet. Every StatsGrid was
   * therefore pinned to `grid-cols-2` at every breakpoint, because
   * `grid-cols-2` happens to exist in the CSS from unrelated source.
   */
  const GRID_COLS: Record<number, string> = {
    1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3",
    4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6",
  }
  const GRID_COLS_SM: Record<number, string> = {
    1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3",
    4: "sm:grid-cols-4", 5: "sm:grid-cols-5", 6: "sm:grid-cols-6",
  }
  const GRID_COLS_MD: Record<number, string> = {
    1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3",
    4: "md:grid-cols-4", 5: "md:grid-cols-5", 6: "md:grid-cols-6",
  }
  const GRID_COLS_LG: Record<number, string> = {
    1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3",
    4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6",
  }
  const GRID_COLS_XL: Record<number, string> = {
    1: "xl:grid-cols-1", 2: "xl:grid-cols-2", 3: "xl:grid-cols-3",
    4: "xl:grid-cols-4", 5: "xl:grid-cols-5", 6: "xl:grid-cols-6",
  }

  const getGridCols = () => {
    const cols: string[] = []

    if (columns.default) cols.push(GRID_COLS[columns.default])
    if (columns.sm) cols.push(GRID_COLS_SM[columns.sm])
    if (columns.md) cols.push(GRID_COLS_MD[columns.md])
    if (columns.lg) cols.push(GRID_COLS_LG[columns.lg])
    if (columns.xl) cols.push(GRID_COLS_XL[columns.xl])

    return cols.filter(Boolean).join(" ")
  }

  return (
    <div className={cn("grid gap-3", getGridCols(), className)}>
      {stats.map((stat, index) => (
        <StatsCard key={stat.label + index} {...stat} index={index} />
      ))}
    </div>
  )
}

/**
 * Pre-defined colour slots for the icon TILE. 171 call sites reference these
 * keys, so every key is preserved — only what they paint has changed.
 *
 * They no longer reach the figure. On a stat tile the icon's colour is identity
 * (which metric is this), and the hue-named slots map onto the validated
 * categorical chart ramp — lightness-banded, chroma-floored and CVD-checked in
 * both themes. The semantic slots use status tokens.
 *
 * `neutral` is the recommended default and what an unspecified card now gets:
 * the icon says WHICH metric, not what mood, and it stays legible under every
 * palette an owner can set in the design manager. Passing a hue is still
 * supported for pages that use the tile to tell four cards apart at a glance.
 */
export const statsCardColors = {
  // identity slots -> chart ramp
  blue: { color: "text-chart-1", bgColor: "bg-chart-1/15" },
  green: { color: "text-chart-3", bgColor: "bg-chart-3/15" },
  amber: { color: "text-chart-2", bgColor: "bg-chart-2/15" },
  purple: { color: "text-chart-4", bgColor: "bg-chart-4/15" },
  red: { color: "text-chart-5", bgColor: "bg-chart-5/15" },
  pink: { color: "text-chart-5", bgColor: "bg-chart-5/15" },
  cyan: { color: "text-chart-6", bgColor: "bg-chart-6/15" },
  orange: { color: "text-chart-2", bgColor: "bg-chart-2/15" },
  rose: { color: "text-chart-5", bgColor: "bg-chart-5/15" },
  zinc: { color: "text-muted-foreground", bgColor: "bg-muted" },
  // state slots -> status tokens
  primary: { color: "text-primary", bgColor: "bg-primary/15" },
  success: { color: "text-success", bgColor: "bg-success/15" },
  info: { color: "text-info", bgColor: "bg-info/15" },
  warning: { color: "text-warning", bgColor: "bg-warning/15" },
  // the recommended default
  neutral: { color: "text-muted-foreground", bgColor: "bg-surface-3" },
}
