import React from "react";
import { Activity } from "lucide-react";

import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import type { ChartTimeframe } from "@/components/ui/chart/chart-axis";

import { resolveKpiIcon } from "./icon";

/**
 * The DataTable's KPI card — the SAME card as everywhere else.
 * ============================================================================
 *
 * This used to be a local implementation: `<Card>` + `<CardContent p-4 pb-24>`
 * + a `text-lg` title + a `text-3xl` value + an arrow-and-percentage delta + a
 * `h-[80px]` absolutely-positioned line chart. Its own file said it could not
 * collapse into the shared stat card because "hovering it REPLACES the
 * displayed value and delta", and no other card had a slot for that.
 *
 * That behaviour is the thing that had to go, not the thing that justified the
 * fork. Silently rewriting the headline number under the pointer means the card
 * shows one figure when you look at it and a different one the moment you move
 * the mouse across it, with nothing on screen saying which period you are now
 * reading. The tooltip does the same job honestly.
 *
 * WHAT THIS FILE GAINED WHEN THE ENGINE LEARNED TO DO MONEY
 *
 *  - **`format`.** The config type has carried `format: "currency" | "percent"`
 *    since it was written, and NOTHING read it — not `chart.ts`, not
 *    `analytics/index.tsx`, not this file. It was not a rendering bug so much
 *    as a promise nobody had kept: there was no money in the payload to format,
 *    because the aggregation engine could only count rows. Now that `sum` and
 *    `avg` exist, a figure that is a balance has to look like one.
 *
 *  - **`invert`.** `StatsCard.invertChange` exists and was never passed, so a
 *    page whose cancellations doubled painted `+112%` in green — the worst news
 *    on the screen rendered as the best-looking chip on it.
 *
 *  - **`error`.** A card whose config is broken now says so. The engine reports
 *    per-card errors rather than 400-ing, because `analyticsSlice` flattens
 *    every card on a page into ONE request and a throw took down all twenty.
 */
export interface KpiCardProps {
  id: string;
  title: string;
  value?: number | null;
  change?: number | null;
  trend: Array<{ date: string; value: number }>;
  variant?:
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "primary"
    | "secondary"
    | "muted"
    | "default";
  icon?: string;
  loading?: boolean;
  timeframe?: string;
  /** How to render the figure. Comes from the config, echoed by the engine. */
  format?: "currency" | "number" | "percent" | "compact" | "duration";
  currency?: string;
  /** `true` when a rise in this metric is bad. Flips the delta chip's colour. */
  invert?: boolean;
  /** Set when this card's config is broken; replaces the figure. */
  error?: string;
  /**
   * Currencies this card holds but the engine could not price. Present means
   * the figure is a LOWER BOUND, and the card has to say so — a total that
   * quietly dropped a currency reads exactly like a complete one, which is what
   * makes a wrong dashboard figure worse than no figure at all.
   */
  unpriced?: string[];
  /** Position in the row, for the staggered entrance. */
  index?: number;
}

/**
 * `variant` arrives as a positional token — the second KPI on every table is
 * painted "info" because it is second, not because it means anything. That is
 * identity, so it resolves to the categorical ramp. The status names are
 * preserved as keys so no config changes.
 */
const VARIANT_TILE: Record<string, { color: string; bgColor: string }> = {
  success: statsCardColors.green,
  info: statsCardColors.blue,
  warning: statsCardColors.amber,
  danger: statsCardColors.red,
  primary: statsCardColors.blue,
  secondary: statsCardColors.purple,
  muted: statsCardColors.neutral,
  default: statsCardColors.neutral,
};

/** Whole hours below a day, then days. Durations arrive from SQL as hours. */
function formatDuration(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0h";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function KpiCardImpl({
  id,
  title,
  value,
  change,
  trend,
  variant = "primary",
  icon,
  loading = false,
  timeframe,
  format,
  currency,
  invert,
  error,
  unpriced,
  index = 0,
}: KpiCardProps) {
  const tile = VARIANT_TILE[variant] ?? statsCardColors.neutral;

  /**
   * `?? "—"` and not `?? 0`: a KPI that has not loaded, or whose config is
   * broken, is UNKNOWN, and rendering it as zero is a claim about the data.
   * An em dash is prose, so `isFigureValue` correctly keeps it out of the mono
   * face. This distinction is the whole reason the 145 dead cards were so hard
   * to spot — they rendered a confident `0` that looked like a real answer.
   */
  let display: number | string = value ?? "—";
  if (typeof value === "number") {
    if (format === "percent") {
      // A percent is a figure with a one-character unit, so it stays monospaced.
      display = `${value.toFixed(value < 10 ? 1 : 0)}%`;
    } else if (format === "duration") {
      display = formatDuration(value);
    }
  }
  if (error) display = "—";

  /**
   * A converted total that could not price every currency it holds is SHORT,
   * and there is nothing in the figure itself to say so. `description` is the
   * card's one line of prose and an `error` already owns it — but a card cannot
   * be both broken and short, so they cannot collide.
   */
  const shortfall =
    !error && unpriced?.length
      ? `Excludes ${unpriced.join(", ")} — no exchange rate`
      : undefined;

  return (
    <StatsCard
      key={id}
      label={title}
      value={display}
      icon={resolveKpiIcon(icon) ?? Activity}
      description={error ?? shortfall}
      isCurrency={format === "currency"}
      currency={currency}
      compact={format === "compact"}
      change={typeof change === "number" ? Number(change.toFixed(2)) : undefined}
      isPercent={typeof change === "number"}
      /**
       * `loading ||` for the same reason as `sparklineData` below.
       *
       * `StatsCard` renders its delta ROW whenever `change`, `description` or
       * `changeLabel` is present, and uses `changeLabel` specifically as the
       * caller's promise that a chip is on its way — its own comment says so.
       * Deriving the label from `change` broke that promise: while loading,
       * `change` is undefined, so the label was undefined, so the row did not
       * render at all — and it reappeared ~23px tall (an 11px chip plus
       * `mt-1.5`) the instant the delta landed. With `h-full` cards in a grid
       * that is not one card growing; the row is measured by its tallest member,
       * so every sibling moved with it.
       *
       * Every KPI the analytics engine returns carries a `change`, so the
       * promise is a safe one to make.
       */
      changeLabel={loading || typeof change === "number" ? "vs prev" : undefined}
      invertChange={invert}
      /**
       * A sparkline is only drawn when the series carries a shape. Passing an
       * all-zero trend forced `min-h-44` on every card, so a five-metric row
       * cost ~900px of page whether or not there was anything to see.
       *
       * `loading ||` is the pending half of that same rule, and without it the
       * card was 49px short while it waited. `analytics/index.tsx` passes
       * `kpiData?.trend || []` — an EMPTY array until the request resolves — so
       * `.some()` was false, `sparklineData` was `undefined`, and `StatsCard`
       * skipped `min-h-44`: the card sat at its ~127px content height and then
       * jumped to 176px the moment a shaped series arrived. Every KPI in the
       * engine returns a trend, and the section grid is `auto-rows-fr`, so one
       * shaped metric stretches the whole row — meaning the 176px outcome is
       * the overwhelmingly common one and the short pending card was the
       * outlier. `StatsCard` keys the reservation on the PROP for exactly this
       * reason; passing `undefined` while loading defeated it.
       *
       * Still `undefined` once resolved-and-flat, so the "nothing to see" case
       * keeps its short card.
       */
      sparklineData={
        loading || trend?.some((p) => p.value !== 0) ? (trend ?? []) : undefined
      }
      sparklineLabel={title}
      timeframe={timeframe as ChartTimeframe}
      loading={loading}
      index={index}
      {...tile}
    />
  );
}

KpiCardImpl.displayName = "KpiCard";

export const KpiCard = React.memo(KpiCardImpl);
