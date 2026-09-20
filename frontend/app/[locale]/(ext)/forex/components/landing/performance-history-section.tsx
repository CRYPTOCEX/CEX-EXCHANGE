"use client";

import { m } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  CheckCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Loadable } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PerformanceMonth {
  month: string;
  totalInvested: number;
  totalProfit: number;
  avgReturn: number;
  completions: number;
}

interface PerformanceHistorySectionProps {
  history: PerformanceMonth[];
  isLoading?: boolean;
}

/**
 * Abbreviated — for headline stats and labels, where space is the constraint.
 *
 * NO CURRENCY MARK, AND THAT IS THE FIX. This section sums
 * `forexInvestment.amount` and its signed profit across every plan with no
 * currency bucket (`forex/landing/index.get.ts:283-300`) and stamped a `$` on
 * the result. The rule is written down in this addon's own
 * `utils/money.ts:9-14`: *"a bare SUM(amount) adds 10,000 USD to 1.5 BTC and
 * publishes '10001.5'."* The HERO on this same page follows it; this section
 * was missed, which is exactly what proves it was an oversight rather than a
 * decision.
 */
function formatCurrency(num: number | string): string {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value)) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${value.toFixed(0)}`;
}

/**
 * Exact — for the hover readout, which is the whole reason to hover.
 *
 * `formatCurrency` above rounds $12,483 to "$12K", and it was being used in the
 * tooltip as well as the labels. Nothing on screen said the figure was
 * approximate, so a month's invested total simply read wrong.
 */
function formatCurrencyExact(num: number | string): string {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value)) return '0';
  // No `$` here either, for the same reason as `formatCurrency` above: the
  // figure is a cross-plan sum with no single denomination. Being exact about a
  // number does not make its unit knowable.
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

/**
 * The pending bar heights.
 *
 * Fixed rather than random so the server and the client agree — a random height
 * here is a hydration mismatch. Six of them because the section's copy says "the
 * last 6 months", so the column count is genuinely knowable.
 */
const PENDING_BAR_HEIGHTS = [45, 70, 55, 85, 60, 75];

function BarChart({
  data,
  isLoading,
}: {
  data: PerformanceMonth[];
  isLoading?: boolean;
}) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");

  const maxValue = Math.max(...data.map((d) => d.totalInvested), 1);

  /*
    ONE CHART, TWO SETS OF INPUTS.

    The pending state used to be a second `<div className="flex items-end ... h-48">`
    holding six two-part columns of its own. The container matched, which is why
    this looked close — but the CHILDREN did not: the month label under each bar
    is a `text-xs` span (16px line box) and its stand-in was `<Skeleton className="h-3">`
    (12px). So every column, and therefore the card around it, was 4px short
    until the data landed. The bar itself also lost its `max-w-12` cap, so the
    pending bars were full column width and the real ones were 48px — the chart
    visibly narrowed on arrival.

    Deriving both states from one list of `{month, heightPercent}` means the
    column markup exists once and cannot drift again.
  */
  const columns: { key: string; month?: PerformanceMonth; heightPercent: number }[] =
    isLoading
      ? PENDING_BAR_HEIGHTS.map((heightPercent, i) => ({
          key: `pending-${i}`,
          heightPercent,
        }))
      : data.map((month) => ({
          key: month.month,
          month,
          heightPercent: (month.totalInvested / maxValue) * 100,
        }));

  return (
    <div className="flex items-end justify-between gap-3 h-48">
      {columns.map(({ key, month, heightPercent }, index) => {
        const isPositive = (month?.totalProfit ?? 0) >= 0;

        return (
          <m.div
            key={key}
            initial={{ opacity: 0, scaleY: 0 }}
            whileInView={{ opacity: 1, scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="relative flex-1 flex flex-col items-center gap-2 group"
            style={{ transformOrigin: "bottom" }}
          >
            {/*
              The hover readout, and it was broken in two ways at once.

              It was `absolute -top-20` on a column with no positioned ancestor
              of its own, so it resolved against `<section className="py-24
              relative overflow-hidden">` — which meant EVERY bar's readout
              appeared in the same spot near the top of the section rather than
              above the bar you were pointing at, and `-top-20` put it outside
              that section's box, where `overflow-hidden` clipped it away
              entirely. `relative` on the column above plus `bottom-full` anchors
              it to its own bar and keeps it inside the section.
            */}
            {/* No readout for a bar with no month behind it. The tooltip is
                `absolute` and hover-only, so its absence costs no layout — and
                a hover card full of placeholders would be a worse answer than
                no hover card. */}
            {month && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 mb-2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground whitespace-nowrap shadow-md">
                <p className="font-medium">{month.month}</p>
                {/* `formatCurrencyExact`, not `formatCurrency`: the latter is the
                    AXIS/label formatter and it rounds — $12,483 rendered as
                    "$12K" in the one place the reader had asked for the number. */}
                <p className="text-muted-foreground">
                  {tCommon("invested")}{" "}
                  <span className="font-mono tabular-nums text-foreground">
                    {formatCurrencyExact(month.totalInvested)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  {tCommon("profit")}{" "}
                  <span
                    className={`font-mono tabular-nums ${isPositive ? "text-up" : "text-down"}`}
                  >
                    {isPositive ? "+" : ""}
                    {formatCurrencyExact(month.totalProfit)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  {tCommon("return")}{" "}
                  <span className="font-mono tabular-nums text-foreground">
                    {month.avgReturn}%
                  </span>
                </p>
              </div>
            </div>
            )}

            {/* Bar */}
            <div className="relative w-full flex justify-center">
              <div
                /* Profit and loss, so this is the price pair (R1) rather than
                   success/destructive — the same green and red the terminal
                   uses for a candle. A bar with no month behind it takes the
                   neutral pulse: `bg-up` on an unknown P&L would paint the
                   whole chart green before a single figure had arrived. */
                className={cn(
                  "w-full max-w-12 rounded-t-lg transition-all duration-300 group-hover:opacity-80",
                  !month ? "bg-muted animate-pulse" : isPositive ? "bg-up" : "bg-down"
                )}
                style={{ height: `${Math.max(heightPercent, 10)}%` }}
              />
            </div>

            {/* Month Label */}
            <span className="text-xs font-medium text-subtle-foreground">
              <Loadable loading={!month} placeholder="Jan">
                {month?.month}
              </Loadable>
            </span>
          </m.div>
        );
      })}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend?: { value: number; positive: boolean };
  isLoading?: boolean;
}) {
  /*
    THE ICON AND THE LABEL ARE PROPS.

    The retired loading branch replaced both with grey boxes — a `w-10 h-10`
    block over the icon that this component is HANDED, and an `h-3 w-16` bar
    over a label string the caller passes as a literal ("Total Invested"). There
    was never a moment when either was unknown.

    It also dropped the `m.div`, so the pending card had no entrance and
    the resolved one faded up 20px: the four cards visibly jumped as the fetch
    landed. And `h-5` (20px) stood in for a `text-lg` figure, whose line box is
    28px, so the row was 8px short on top of that.

    One card now, with a placeholder where the only unknown is.
  */
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-4 rounded-lg bg-card border border-border"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-subtle-foreground">{label}</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-lg font-bold tabular-nums text-foreground">
              <Loadable loading={!!isLoading} placeholder="$000K">
                {value}
              </Loadable>
            </p>
            {/* `trend` is derived (`totalProfit !== 0`), so it is absent while
                loading and appears on arrival — but it sits INSIDE this
                `flex items-center gap-2` row, whose height is set by the
                `text-lg` figure beside it. The chip changes the row's width,
                not its height, so nothing below it moves. */}
            {trend && (
              <span
                className={`flex items-center font-mono text-xs font-medium tabular-nums ${
                  trend.positive ? "text-up" : "text-down"
                }`}
              >
                {trend.positive ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </m.div>
  );
}

export default function PerformanceHistorySection({
  history,
  isLoading,
}: PerformanceHistorySectionProps) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  /**
   * `loading` and `empty` are different states, and this one was the worst of
   * the three on `/en/forex`.
   * ==========================================================================
   *
   * `if (!isLoading && !history.length) return null` reserved a `py-24`
   * section, a centred header, four `StatCard`s and a `h-48` chart in a `p-8`
   * panel — about 800px — and then threw all of it away on an install with no
   * completed months.
   *
   * It also produced the strangest line in the harness output:
   *
   *     y -1936.95  x -229   P  "Total invested"
   *
   * The harness matches elements between the two passes by their text. During
   * the fetch the only "Total invested" on the page was this section's
   * `StatCard` label; after it resolved, this section was gone and the only
   * one was the HERO's stat label, 1,937px higher up and in a different
   * column. Two different elements, one string, and a 1.9k "shift" that was
   * really a section disappearing out from under a label. Keeping the stat row
   * on the page in every state is what retired that line.
   */
  const showEmptyState = !isLoading && (!history || history.length === 0);

  // Calculate summary stats
  const totalInvested = history.reduce((sum, m) => sum + m.totalInvested, 0);
  const totalProfit = history.reduce((sum, m) => sum + m.totalProfit, 0);
  const totalCompletions = history.reduce((sum, m) => sum + m.completions, 0);
  const avgReturn =
    history.length > 0
      ? history.reduce((sum, m) => sum + m.avgReturn, 0) / history.length
      : 0;

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-primary/10 border-primary/20"
          >
            <BarChart3 className="w-4 h-4 text-primary mr-2" />
            <span className="text-sm font-medium text-primary">
              {t("platform_performance") || t("platform_performance")}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {tCommon("monthly") || tCommon("monthly")}{" "}
            <span className="text-primary">
              {tExt("performance_history") || tExt("performance_history")}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("track_our_consistent_performance") ||
              t("track_our_consistent_performance_over_the")}
          </p>
        </m.div>

        {/*
          THE CHART SHELL IS THE SHAPE-PRESERVER, IN ALL THREE STATES.

          The first pass at this replaced the whole block with a centred empty
          panel, which fixed the vanishing section but left ~166px of the gap
          behind: a `p-16` panel is simply not as tall as four stat cards plus a
          `h-48` plot area in a `p-8` card. SKELETONS.md says it directly for
          charts — the shell reserves the height, so skeleton the plot area and
          keep the axes and legend chrome. An empty chart is its own frame with
          nothing plotted in it, not the absence of a frame.

          So the stat row and the chart card render in every state. The four
          figures are `Loadable` while the fetch is out and are honest zeroes
          when it comes back empty — "0 completions" on a platform where nothing
          has completed is a fact, not a placeholder — and the plot area itself
          carries the "no months yet" line where the bars would be.
        */}
        <div className="max-w-5xl mx-auto">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard
              icon={DollarSign}
              label={tCommon("total_invested") || tCommon("total_invested")}
              value={formatCurrency(totalInvested)}
              isLoading={isLoading}
            />
            <StatCard
              icon={TrendingUp}
              label={tCommon("total_profit") || tCommon("total_profit")}
              value={formatCurrency(totalProfit)}
              trend={
                totalProfit !== 0
                  ? { value: avgReturn, positive: totalProfit >= 0 }
                  : undefined
              }
              isLoading={isLoading}
            />
            <StatCard
              icon={CheckCircle}
              label={t("completions") || t("completions")}
              value={totalCompletions.toString()}
              isLoading={isLoading}
            />
            <StatCard
              icon={BarChart3}
              label={t("avg_return") || t("avg_return")}
              value={`${avgReturn.toFixed(1)}%`}
              isLoading={isLoading}
            />
          </div>

          {/* Bar Chart */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 md:p-8 rounded-lg bg-card border border-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-foreground">
                {t("monthly_investments") || t("monthly_investments")}
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-up" />
                  <span className="text-muted-foreground">
                    {tCommon("profit") || tCommon("profit")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-down" />
                  <span className="text-muted-foreground">
                    {tCommon("loss") || tCommon("loss")}
                  </span>
                </div>
              </div>
            </div>
            {showEmptyState ? (
              /* The plot area's own `h-48`, kept, with the reason there is
                 nothing in it written inside. Gated on `!isLoading` through the
                 predicate above — without that it asserts "no months" against a
                 `history` array that is `[]` only because the request has not
                 come back. */
              <div className="flex h-48 flex-col items-center justify-center text-center">
                <BarChart3 className="mb-3 h-10 w-10 text-subtle-foreground" />
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  {t("no_month_has_closed_yet_invested")}
                </p>
              </div>
            ) : (
              <BarChart data={history} isLoading={isLoading} />
            )}
          </m.div>
        </div>
      </div>
    </section>
  );
}
