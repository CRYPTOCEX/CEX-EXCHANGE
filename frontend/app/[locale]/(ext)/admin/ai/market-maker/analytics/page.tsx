"use client";

/**
 * WHO — the operator who owns the synthetic markets, after the console has told
 *       them WHICH market needs looking at.
 * WHAT — decides whether a market is earning: where its price went over the
 *       period, what the pool made, and how much of that is measured rather
 *       than inferred.
 * CLICK — through to the market itself to change the thing that is wrong, or
 *       the period switch to see it over a different window.
 *
 * ---------------------------------------------------------------------------
 * WHAT CHANGED, AND WHY IT MATTERED
 *
 *  - **The heading printed dollars this platform does not hold.** Four figures
 *    read a hardcoded "$" over `(value / 1000).toFixed(1)` + "K" — a symbol on a
 *    sum across pools each denominated in its OWN quote asset, rounded to the
 *    nearest hundred. The console had already settled this rule (no unit unless
 *    every market agrees on one, which is what `quoteCurrency: null` from the
 *    endpoint means) and implemented it locally; that implementation is now
 *    `components/format.ts` and both pages read it.
 *
 *    THAT ONLY EVER FIXED THE LABEL. Suppressing the unit left the addition
 *    itself in place, so the figure was still a BTC total added to a NGN total
 *    and the page merely declined to say what it was a total OF. The endpoint
 *    prices each denomination into USD before it sums, so these four are USD and
 *    say so — and anything it could not price is named in `unpriced`, which puts
 *    a "lower bound" note in the provenance line instead of counting it as zero.
 *  - **The frame was hand-rolled** — a bare `min-h-screen` div, a hero, and a
 *    `container mx-auto py-8`. It is `PageShell` and the console's own masthead
 *    now, so the dashboard, the record page and this page are one product.
 *  - **The market and period selectors were a full-width card** above the
 *    content, which is 120px of chrome for two dropdowns. They are page-scope
 *    filters, so R5 puts them in the header.
 *  - **Two hand-built loading trees**, ~40 boxes of `rounded-2xl` gradient
 *    tiles that matched nothing they stood in for. The layout stays mounted and
 *    the VALUES wait instead.
 *  - `border-primary/20` on five cards, and `text-primary` as the ink on four
 *    P&L figures. R8 reserves the accent for things you click.
 *  - **Three of the four market figures read fields the endpoint has never
 *    returned.** `MarketPerformance` declared twenty-one keys invented whole;
 *    "Total Trades", "Daily Volume" and "Volume Target" resolved to undefined
 *    and drew 0 on every market on the platform. They read the real payload now
 *    — see the interface below — and the trade figures are a union of the
 *    AI-to-AI history table and the ledger of fills against real customers,
 *    which is what the count was missing at source.
 *
 * The domain logic below — the ledger provenance, the unmeasured-period rule,
 * the padded price domain — is unchanged. It was the careful part.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart3,
  ChartLine,
  ChartPie,
  DollarSign,
  ExternalLink,
  Plus,
  RefreshCw,
  Store,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/routing";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { HeadingStats } from "@/components/layout/heading-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loadable } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { MoneyFigure } from "@/components/ui/money-figure";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartCard,
  ChartTooltipContent,
  chartActiveDot,
  chartGrid,
  chartLineCursor,
  chartXAxis,
  chartYAxis,
  formatAxisDate,
  seriesColor,
} from "@/components/ui/chart";
import { moneyFormat } from "../components/format";

interface OverviewData {
  totalMarkets: number;
  activeMarkets: number;
  totalBots: number;
  activeBots: number;
  /** The unit of every total below. Always "USD" — the endpoint prices before it adds. */
  currency?: string;
  /**
   * Denominations with no USD rate, plus `"UNKNOWN"` for a market whose
   * ecosystem row was deleted. Non-empty means every total is a LOWER BOUND:
   * those amounts are omitted, never counted as zero.
   */
  unpriced?: string[];
  totalTVL: number;
  total24hVolume: number;
  totalPnL: number;
  pnlPercent: number | null;
  recentTradeCount: number;
  marketsByStatus: { active: number; paused: number; stopped: number };
  /**
   * The one quote asset every market shares, or null when they disagree.
   *
   * It describes the per-market rows in `markets[]` — NOT the totals above,
   * which are USD.
   */
  quoteCurrency: string | null;
  lastUpdated: string;
  /**
   * The RANKED HEAD of the market list, capped by the endpoint at `marketsCap`.
   *
   * NOT the picker's source. This page used to drive its market dropdown off
   * this array, which was safe only while the endpoint sent every market on the
   * platform; the moment that list was capped, market eleven became
   * unselectable. `marketIndex` is the complete population and the picker reads
   * that.
   */
  markets?: any[];
  marketsCap?: number;
  /** Every market maker — id, status and symbol only — in the same ranked order. */
  marketIndex?: {
    id: string;
    status: string;
    market: { id: string; symbol: string; currency: string; pair: string } | null;
  }[];
}

/**
 * Mirrors analytics/[marketId]/performance.get.ts EXACTLY.
 *
 * The previous declaration named twenty-one keys and the endpoint has never
 * produced one of them — `priceDeviationPercent`, `volumeTargetPercent`,
 * `realTradePercent` and `botAvgWinRate` appear nowhere in backend/src. So
 * "Total Trades" read `performance.totalTrades` against a payload whose count is
 * at `metrics.totalTrades`, and drew a confident 0 on every market; "Daily
 * Volume" and "Volume Target" did the same. Nothing contradicted either side,
 * because the endpoint's schema declared three of its properties and the six
 * that mattered were described by nothing.
 *
 * The count itself was also wrong at source: every trade-derived figure came
 * from the AI-to-AI history table alone, so a maker doing nothing but real
 * business rendered as idle. It is a union of both stores now, and `sources`
 * says how much each contributed — which is the only way to tell a quiet market
 * from a partly unreadable one.
 */
interface MarketPerformance {
  marketId: string;
  period: string;
  market?: { symbol?: string; currency?: string; pair?: string } | null;
  status?: string;
  currentPrice: number;
  targetPrice: number;
  priceHistory: {
    timestamp: string;
    price: number;
    /** Only TARGET_CHANGE and CURRENT points carry one. */
    targetPrice: number | null;
    source: "AI_ONLY" | "REAL" | "TARGET_CHANGE" | "START" | "CURRENT";
  }[];
  volumeHistory: {
    timestamp: string;
    volume: number;
    aiOnlyVolume: number;
    realVolume: number;
  }[];
  /** targetAchievement.rate, repeated bare. Null means nothing was sampled. */
  targetAchievementRate: number | null;
  targetAchievement: {
    rate: number | null;
    withinTolerance: number;
    sampled: number;
    tolerancePercent: number;
    target: number | null;
    measuredAgainst: string;
    /** What the rate does and does not mean. Rendered, not paraphrased. */
    caveat: string;
  };
  truncated: boolean;
  metrics: {
    totalTrades: number;
    aiOnlyTrades: number;
    realTrades: number;
    avgTradeSize: number | null;
    /** BASE volume over the period, both stores. */
    periodVolume: number;
    /** currentDailyVolume: AI-only, and zeroed at the daily reset. */
    totalVolume: number;
    tvl: number;
    unrealizedPnL: number;
    realizedPnL: number;
  };
  sources: {
    aiOnly: { store: string; trades: number; complete: boolean; reason: string | null };
    real: {
      store: string;
      trades: number;
      windowDays: number;
      windowStart: string;
      ledgerBeginsAt: string | null;
      botsQueried: number;
      unreadableBots: number;
      complete: boolean;
      reason: string | null;
    };
    undatedPrints: number;
    complete: boolean;
    /** Every shortfall in one sentence, or null. */
    reason: string | null;
  };
}

/**
 * Mirrors analytics/[marketId]/pnl.get.ts EXACTLY.
 *
 * The previous declaration named nine keys — poolRealizedPnl, roiPercent and
 * friends — that no backend file has ever produced, so every figure in this
 * card resolved to undefined and rendered as a confident 0.00. The endpoint has
 * always returned the nested shape below.
 */
interface PnLReport {
  marketId: string;
  market?: any;
  summary: {
    daily: number;
    weekly: number;
    monthly: number;
    allTime: number;
    unrealized: number;
    realized: number;
    total: number;
  };
  roi: { percent: string; initialInvestment: number; currentValue: number };
  history: { date: string; pnl: number; cumulativePnl: number }[];
  breakdown: {
    tradeCount: number;
    winningTrades: number;
    losingTrades: number;
    avgWin: number;
    avgLoss: number;
    windowDays: number;
    windowTradeCount: number;
    windowFees: number;
    makerFillCount: number;
    takerFillCount: number;
    makerRatio: number | null;
  };
  /** Provenance: which figure covers which span. See the footnote under the cards. */
  ledger: {
    source: string;
    beginsAt: string | null;
    windowDays: number;
    windowTradeCount: number;
    allTimeSource: string;
    periodSource: string;
  };
  lastUpdated: string;
}

// The price series takes the first ramp slot — identity, not state.
const PRICE_COLOR = seriesColor(0).stroke;

/**
 * Kept on raw Recharts (kit PARTS rather than `<SeriesChart/>`) for one reason:
 * a price series needs a padded min/max y-domain. `SeriesChart` leaves the
 * domain to Recharts, which anchors at zero, and a pair trading in a 1% band
 * then renders as a flat line pinned to the top of the plot.
 */
const PriceChart = ({
  data,
  period,
  currency,
}: {
  data: { timestamp: string; price: number; targetPrice: number | null }[];
  period: string;
  currency: string;
}) => {
  const tCommon = useTranslations("common");

  const chartData = useMemo(
    () =>
      data
        .map((item) => ({
          ...item,
          date: new Date(item.timestamp),
          price: Number(item.price),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [data]
  );

  // The shared axis formatter caps at two decimals, which reads "0" at every
  // gridline for a token priced at 0.000123 — so this axis keeps its own.
  const formatPrice = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    if (value >= 1) return value.toFixed(2);
    return value.toFixed(6);
  };

  if (!chartData.length) return null;

  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || maxPrice * 0.05;

  // An hour of data is labelled like a day of data: clock time, not a date.
  const timeframe = period === "1h" ? "24h" : period;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRICE_COLOR} stopOpacity={0.28} />
            <stop offset="100%" stopColor={PRICE_COLOR} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...chartGrid} />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => formatAxisDate(value, timeframe)}
          {...chartXAxis}
        />
        <YAxis
          {...chartYAxis}
          domain={[minPrice - padding, maxPrice + padding]}
          tickFormatter={formatPrice}
          width={60}
        />
        <Tooltip
          {...chartLineCursor}
          isAnimationActive={false}
          content={
            <ChartTooltipContent
              timeframe={timeframe}
              hideIndicator
              valueFormatter={(value) =>
                typeof value === "number" ? `${value.toFixed(6)} ${currency}` : value
              }
            />
          }
        />
        <Area
          type="monotone"
          dataKey="price"
          name={tCommon("price")}
          stroke={PRICE_COLOR}
          strokeWidth={2}
          fill="url(#priceGradient)"
          dot={false}
          activeDot={chartActiveDot(PRICE_COLOR)}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

/** One period's P&L. A Ledger surface, tinted only by direction. */
const PnLTile = ({
  title,
  value,
  subtitle,
  currency,
  unmeasured,
  loading,
}: {
  title: string;
  value: number;
  subtitle?: string;
  currency?: string;
  /**
   * The period has no ledger behind it. A zero that means "not measured" must
   * not be drawn like a zero that means "broke even" — the per-trade ledger only
   * starts at the release that began writing it, so an un-flagged 0 next to a
   * large all-time figure reads as a collapse in performance that never happened.
   */
  unmeasured?: boolean;
  loading?: boolean;
}) => {
  const isPositive = value >= 0;
  return (
    <Card>
      {/* `pt-4`: `CardContent` drops its top padding on the assumption that a
          `CardHeader` supplies it, and this tile has none. */}
      <CardContent padding="md" className="pt-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
          {title}
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold leading-tight tracking-tight",
            unmeasured
              ? "text-muted-foreground"
              : isPositive
                ? "text-up"
                : "text-down"
          )}
        >
          <Loadable loading={Boolean(loading)} placeholder="+000.00">
            {unmeasured ? (
              "—"
            ) : (
              <MoneyFigure
                value={`${isPositive ? "+" : ""}${value.toFixed(2)} ${currency || ""}`}
              />
            )}
          </Loadable>
        </p>
        {subtitle ? (
          <p className="mt-1 text-[11px] text-subtle-foreground">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
};

/** A labelled figure inside a panel. Not a KPI card — the page has no KPI row. */
function Figure({
  label,
  children,
  hint,
  /**
   * Long-form caveat, surfaced on hover. For a figure whose NAME implies more
   * than it measures — the target-achievement rate is one — the qualification
   * has to be reachable without a paragraph beside every number.
   */
  title,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="min-w-0" title={title}>
      <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
        {label}
      </p>
      <div className="mt-1 text-xl font-semibold leading-tight tracking-tight text-foreground">
        {children}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function AnalyticsPage() {
  const t = useTranslations("ext_admin");
  const tExtAdmin = t;
  const tMm = useTranslations("ext_admin_ai_market-maker");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string>(
    searchParams.get("market") || ""
  );
  const [period, setPeriod] = useState<string>("24h");
  const [performance, setPerformance] = useState<MarketPerformance | null>(null);
  const [pnlReport, setPnlReport] = useState<PnLReport | null>(null);

  /**
   * The picker's population — `marketIndex`, NOT `markets`.
   *
   * `markets` is a ranked head capped by the endpoint, so driving a dropdown off
   * it would silently hide every market past the cap: the operator would open
   * this page to analyse market fourteen and find it is not in the list. Both
   * arrive in the same ranked order, so `[0]` still seeds the market that most
   * needs looking at, and the enrichment below still finds its `market` by id.
   */
  const markets = overview?.marketIndex || [];
  const marketCount = markets.length;

  /**
   * TWO SCALES, because there are two kinds of figure on this page.
   *
   * The heading totals are portfolio-wide and the endpoint prices each
   * denomination into USD before it adds them, so they are formatted as USD. The
   * per-market figures below the fold are native to the selected market and keep
   * using its own `pair`, which is what `quote` is for.
   */
  const fmt = moneyFormat(overview?.currency ?? "USD");

  const fetchOverview = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // `$fetch` resolves to `{data, error}` and never throws — reporting the
      // failure here is the only way it gets reported at all.
      const { data, error } = await $fetch({
        url: "/api/admin/ai/market-maker/analytics/overview",
        silent: true,
      });
      if (error) {
        toast.error(
          typeof error === "string" ? error : t("failed_to_load_overview")
        );
      } else if (data) {
        const payload = data as OverviewData;
        setOverview(payload);
        // Seeded from the payload rather than from `selectedMarket`, which is
        // deliberately NOT a dependency here: re-creating this callback on every
        // dropdown change would re-run its effect and refetch the overview.
        setSelectedMarket(
          (current) => current || payload.marketIndex?.[0]?.id || ""
        );
      }
      setLoading(false);
      setRefreshing(false);
    },
    [t]
  );

  const fetchMarketAnalytics = useCallback(async () => {
    if (!selectedMarket) return;
    setLoadingAnalytics(true);
    const [perf, pnl] = await Promise.all([
      $fetch({
        url: `/api/admin/ai/market-maker/analytics/${selectedMarket}/performance?period=${period}`,
        silent: true,
      }),
      $fetch({
        url: `/api/admin/ai/market-maker/analytics/${selectedMarket}/pnl`,
        silent: true,
      }),
    ]);

    if (perf.data) {
      // Enrich performance data with market info from the overview.
      //
      // `marketIndex` is the whole population, so this lookup finds the selected
      // market whatever its rank — off the capped `markets` head it would have
      // resolved to null for anything past the cap and quietly reported the pair
      // as "unknown" on a market the operator had just picked by name.
      const marketInfo = markets.find((m: any) => m.id === selectedMarket);
      setPerformance({
        ...(perf.data as MarketPerformance),
        market: marketInfo?.market
          ? {
              symbol:
                marketInfo.market.symbol ||
                `${marketInfo.market.currency}/${marketInfo.market.pair}`,
              currency: marketInfo.market.currency,
              pair: marketInfo.market.pair,
            }
          : null,
        status: marketInfo?.status || "unknown",
      });
    }
    if (pnl.data) setPnlReport(pnl.data as PnLReport);
    setLoadingAnalytics(false);
  }, [selectedMarket, period, markets]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (selectedMarket && marketCount > 0) fetchMarketAnalytics();
    // `marketCount`, not `markets`: the array is rebuilt on every render of the
    // parent state, and depending on it refetches in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarket, period, marketCount]);

  // `roi.percent` is a fixed-2 STRING from the endpoint, so it is coerced once
  // here rather than at each of the three places that render it.
  const roiPercent = Number(pnlReport?.roi?.percent ?? 0);

  // The daily/weekly/monthly cards are not measurements when the per-trade
  // ledger has nothing in it: either it never started (beginsAt null) or it
  // started outside the 30-day window (windowTradeCount 0). Rendering +0.00 in
  // that state is the exact misreading this page is supposed to prevent.
  const periodUnmeasured =
    !!pnlReport &&
    (pnlReport.ledger.beginsAt === null || pnlReport.ledger.windowTradeCount === 0);

  const quote = performance?.market?.pair || "";
  const busy = loading || loadingAnalytics;

  const masthead = (
    <div className="border-b border-border bg-card">
      {/* Supplying `header` flips `PageShell`'s container to a plain `py-8`, so
          `pt-header-clear` here is what keeps the page out from under the fixed
          site header. */}
      <div className="mx-auto w-full px-4 container pt-header-clear pb-8">
        <div className="divide-y divide-border">
          {/* 1 — PROVENANCE ------------------------------------------------ */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-3 font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
            <Link
              href="/admin/ai/market-maker"
              className="flex items-center gap-1.5 rounded-sm text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <ArrowLeft className="h-3 w-3" />
              {tCommon("back_to_dashboard")}
            </Link>
            {overview?.lastUpdated ? (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                <span>
                  {tCommon("last_updated")}{" "}
                  {new Date(overview.lastUpdated).toLocaleTimeString()}
                </span>
              </>
            ) : null}
            {overview?.quoteCurrency ? (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                <span className="text-muted-foreground">
                  {overview.quoteCurrency}
                </span>
              </>
            ) : null}

            {/* THE HEADING TOTALS ARE A LOWER BOUND, SAID ONCE.
                A denomination with no USD rate is left OUT of them rather than
                counted as zero, which is the only honest treatment and an
                invisible one unless it is named here. */}
            {overview?.unpriced?.length ? (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                <span className="text-warning-ink">
                  {tMm("totals_exclude_unpriced", {
                    assets: overview.unpriced.join(", "),
                  })}
                </span>
              </>
            ) : null}
          </div>

          {/* 2 — IDENTITY -------------------------------------------------- */}
          <PageHeader
            className="py-5"
            title={t("performance_analytics")}
            description={t("performance_metrics_and_p_l_analysis")}
            actions={
              <>
                {/* R5: a page-scope filter belongs in the header, not in a
                    120px card above the content. */}
                <Select
                  value={selectedMarket}
                  onValueChange={setSelectedMarket}
                  disabled={!marketCount}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder={tMm("choose_a_market")} />
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.market
                          ? `${m.market.currency}/${m.market.pair}`
                          : tMm("unlinked_market")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">{tCommon("last_hour")}</SelectItem>
                    <SelectItem value="24h">{tCommon("last_24_hours")}</SelectItem>
                    <SelectItem value="7d">{tCommon("last_7_days")}</SelectItem>
                    <SelectItem value="30d">{tCommon("last_30_days")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => fetchOverview(true)}
                  disabled={loading || refreshing}
                >
                  <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                  {tCommon("refresh")}
                </Button>
              </>
            }
          />

          {/* 3 — STATE ----------------------------------------------------- */}
          {/* The portfolio totals, as a caption on the title rather than four
              KPI cards — R3 keeps the page's one figure row for the market
              being analysed. Every figure carries its unit from the endpoint,
              or none at all when the markets disagree. */}
          <div className="pt-4">
            <HeadingStats
              loading={loading}
              stats={[
                {
                  icon: DollarSign,
                  label: tCommon("total_tvl"),
                  value: fmt.money(overview?.totalTVL ?? 0),
                  placeholder: "$0.0K",
                },
                {
                  icon: BarChart3,
                  label: t("volume_today"),
                  value: fmt.money(overview?.total24hVolume ?? 0),
                  placeholder: "$0.0K",
                },
                {
                  icon: TrendingUp,
                  label: tCommon("total_p_l"),
                  value: fmt.signedMoney(overview?.totalPnL ?? 0),
                  placeholder: "+$0.0K",
                },
                {
                  icon: Store,
                  label: tCommon("active_markets"),
                  value: `${overview?.activeMarkets ?? 0} / ${overview?.totalMarkets ?? 0}`,
                  placeholder: "0 / 0",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------

  if (!loading && !marketCount) {
    return (
      <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead}>
        <Card>
          <CardContent
            padding="md"
            className="flex flex-col items-center justify-center gap-3 py-16 text-center"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-muted-foreground">
              <BarChart3 className="h-6 w-6" />
            </span>
            <p className="text-base font-semibold text-foreground">
              {tExt("no_markets_available")}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("create_an_ai_market_maker_first")}
            </p>
            {/* R7: an empty state carries the action that fills it. */}
            <Button
              className="mt-2"
              onClick={() => router.push("/admin/ai/market-maker/market/create")}
            >
              <Plus className="h-4 w-4" />
              {tCommon("create_market")}
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead}>
      {!selectedMarket && !loading ? (
        <Card>
          <CardContent
            padding="md"
            className="flex flex-col items-center justify-center gap-3 py-16 text-center"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-muted-foreground">
              <ChartLine className="h-6 w-6" />
            </span>
            <p className="text-base font-semibold text-foreground">
              {t("select_a_market")}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("choose_a_market_from_the_dropdown")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* MARKET ------------------------------------------------------- */}
          <Card>
            <CardHeader
              padding="md"
              className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-border"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
                  <ChartLine className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
                    <Loadable loading={busy} placeholder="AAA/BBB">
                      {performance?.market?.symbol ?? tMm("unlinked_market")}
                    </Loadable>
                    {performance?.status ? (
                      <StatusBadge status={performance.status} className="text-[11px]" />
                    ) : null}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {tMm("analytics_market_hint")}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedMarket}
                onClick={() =>
                  router.push(`/admin/ai/market-maker/market/${selectedMarket}`)
                }
              >
                <ExternalLink className="h-4 w-4" />
                {tCommon("view_details")}
              </Button>
            </CardHeader>
            {/* `pt-4`: the header above draws a rule, and `CardContent` has no
                top padding of its own. */}
            <CardContent padding="md" className="pt-4">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Figure label={tCommon("current_price")}>
                  <Loadable loading={busy} placeholder="0.000000">
                    <MoneyFigure
                      value={`${fmt.price(Number(performance?.currentPrice ?? 0))} ${quote}`}
                    />
                  </Loadable>
                </Figure>

                {/* BOTH STORES. This read `performance.totalTrades`, which the
                    endpoint has never returned, so it drew 0 always — and the
                    count behind it excluded every customer fill anyway. The
                    split is the hint because "40 trades" of which none was a
                    customer describes a different market from one where half
                    were. */}
                <Figure
                  label={tCommon("total_trades")}
                  hint={
                    performance
                      ? `${tExt("ai_trade")}: ${performance.metrics.aiOnlyTrades.toLocaleString()} · ${tCommon("customer")}: ${performance.metrics.realTrades.toLocaleString()}`
                      : undefined
                  }
                >
                  <span className="font-mono tabular-nums">
                    <Loadable loading={busy} placeholder="00,000">
                      {(performance?.metrics.totalTrades ?? 0).toLocaleString()}
                    </Loadable>
                  </span>
                </Figure>

                {/* Volume over the PERIOD, both stores. Deliberately not
                    `metrics.totalVolume`, which is the market's
                    currentDailyVolume counter: AI-only, and zeroed at the daily
                    reset, so it cannot be compared with the window the rest of
                    this card describes. */}
                <Figure label={`${tCommon("volume")} · ${period}`}>
                  <Loadable loading={busy} placeholder="000.00">
                    <MoneyFigure
                      value={`${Number(performance?.metrics.periodVolume ?? 0).toFixed(2)} ${performance?.market?.currency || ""}`}
                    />
                  </Loadable>
                </Figure>

                {/* The rate is NULL when nothing was sampled, and an em dash is
                    the only honest rendering of that: 0% claims every print
                    missed the target, which is a measurement nobody made. The
                    caveat rides on the title — the figure's name implies it
                    tracks the target THROUGH the period, and it does not. */}
                <Figure
                  label={t("target_achievement")}
                  title={performance?.targetAchievement.caveat}
                  hint={
                    performance
                      ? `±${performance.targetAchievement.tolerancePercent}% · ${performance.targetAchievement.withinTolerance}/${performance.targetAchievement.sampled}`
                      : undefined
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums">
                      <Loadable loading={busy} placeholder="00.0%">
                        {performance?.targetAchievement.rate == null
                          ? "—"
                          : `${performance.targetAchievement.rate.toFixed(1)}%`}
                      </Loadable>
                    </span>
                    <Progress
                      value={performance?.targetAchievement.rate ?? 0}
                      className="h-2 max-w-[80px] flex-1"
                    />
                  </div>
                </Figure>
              </div>

              {/* A MERGED FIGURE THAT FELL SHORT SAYS SO.
                  Both halves can be short of the period: the history read is
                  capped at 5,000 rows, and the ledger is a Scylla read that can
                  be partly unreadable and that only begins at the release which
                  started writing it. Without this line a quiet market and a
                  partly unreadable one are the same four numbers. The endpoint's
                  own wording is rendered rather than re-derived — it is the side
                  that knows which of the cases happened. */}
              {performance && !performance.sources.complete && performance.sources.reason ? (
                <p className="mt-5 border-t border-border pt-3 text-[11px] text-warning-ink">
                  {performance.sources.reason}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* PRICE -------------------------------------------------------- */}
          <ChartCard
            title={tCommon("price")}
            icon={ChartLine}
            height={280}
            loading={busy}
            empty={!performance?.priceHistory?.length}
            emptyMessage={`${t("no_price_data")}. ${t("start_trading_to_see_chart")}`}
          >
            <PriceChart
              data={performance?.priceHistory || []}
              period={period}
              currency={quote}
            />
          </ChartCard>

          {/* P&L ---------------------------------------------------------- */}
          {/* Daily / Weekly / Monthly / All-time — the split the ledger
              actually produces. The first three come from the per-trade ledger
              and read as an em dash until it has something in it; the fourth is
              the lifetime accumulator and predates it. */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <PnLTile
              title={tCommon("daily")}
              value={pnlReport?.summary.daily ?? 0}
              currency={quote}
              unmeasured={periodUnmeasured}
              loading={busy}
            />
            <PnLTile
              title={tCommon("weekly")}
              value={pnlReport?.summary.weekly ?? 0}
              currency={quote}
              unmeasured={periodUnmeasured}
              loading={busy}
            />
            <PnLTile
              title={tCommon("monthly")}
              value={pnlReport?.summary.monthly ?? 0}
              currency={quote}
              unmeasured={periodUnmeasured}
              loading={busy}
            />
            <PnLTile
              title={tCommon("all_time")}
              value={pnlReport?.summary.allTime ?? 0}
              subtitle={t("lifetime_accumulator_predates_the_per_trade_ledger")}
              currency={quote}
              loading={busy}
            />
          </div>

          {/* Where the ledger starts. Without this the three period cards
              beside a large all-time figure read as a drop to zero. */}
          {pnlReport ? (
            <p className="text-[11px] text-subtle-foreground">
              {pnlReport.ledger.beginsAt ? (
                <>
                  {t("per_trade_history_begins")}{" "}
                  {new Date(pnlReport.ledger.beginsAt).toLocaleDateString()} —{" "}
                  {t(
                    "period_figures_cover_fills_from_that_date_onward_all_time_is_the_full_lifetime_total"
                  )}
                </>
              ) : (
                t(
                  "no_fills_against_real_users_recorded_yet_period_figures_will_populate_after_the_first_one"
                )
              )}
            </p>
          ) : null}

          {/* `lg:items-start`: these two cards hold different amounts, and
              stretching the shorter one leaves a tall empty band down its
              middle. Each sizes to its own content. */}
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            {/* ROI ------------------------------------------------------- */}
            <Card>
              <CardHeader padding="md">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
                    <ChartPie className="h-4 w-4" />
                  </span>
                  <CardTitle className="text-base font-semibold text-foreground">
                    {t("return_on_investment")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent padding="md" className="space-y-5">
                <div className="flex flex-wrap items-center gap-6">
                  <div
                    className={cn(
                      "grid h-24 w-24 shrink-0 place-items-center rounded-full",
                      roiPercent >= 0 ? "bg-up/10" : "bg-down/10"
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-xl font-semibold tabular-nums tracking-tight",
                        roiPercent >= 0 ? "text-up" : "text-down"
                      )}
                    >
                      <Loadable loading={busy} placeholder="+00.0%">
                        {`${roiPercent >= 0 ? "+" : ""}${roiPercent.toFixed(2)}%`}
                      </Loadable>
                    </span>
                  </div>
                  <p className="min-w-[12rem] flex-1 text-sm text-muted-foreground">
                    {tMm("roi_hint")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <Figure label={t("initial_investment")}>
                    <Loadable loading={busy} placeholder="000,000">
                      <MoneyFigure
                        value={`${Number(pnlReport?.roi.initialInvestment ?? 0).toLocaleString()} ${quote}`}
                      />
                    </Loadable>
                  </Figure>
                  <Figure label={tCommon("pool_tvl")}>
                    <Loadable loading={busy} placeholder="000,000">
                      <MoneyFigure
                        value={`${Number(pnlReport?.roi.currentValue ?? 0).toLocaleString()} ${quote}`}
                      />
                    </Loadable>
                  </Figure>
                </div>
              </CardContent>
            </Card>

            {/* BREAKDOWN -------------------------------------------------- */}
            <Card>
              <CardHeader padding="md">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <CardTitle className="text-base font-semibold text-foreground">
                    {t("p_l_breakdown")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent padding="md" className="space-y-4">
                <div className="rounded-md border border-border bg-surface-2 px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                    {tMm("pool_net_pnl")}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-semibold leading-tight tracking-tight",
                      (pnlReport?.summary.total ?? 0) >= 0 ? "text-up" : "text-down"
                    )}
                  >
                    <Loadable loading={busy} placeholder="+000.00">
                      <MoneyFigure
                        value={`${(pnlReport?.summary.total ?? 0) >= 0 ? "+" : ""}${(pnlReport?.summary.total ?? 0).toFixed(2)} ${quote}`}
                      />
                    </Loadable>
                  </p>
                </div>

                {/* The two bottom tiles used to be "Bot realized" and "Bot
                    unrealized". Bot-realized IS pool-realized (the pool's
                    column is synced from the bots), so one was the same number
                    twice and the other had no source. They carry the two facts
                    the ledger records per fill and nothing else reads: the
                    maker/taker mix, and fees paid. */}
                <div className="grid grid-cols-2 gap-4">
                  <Figure label={t("realized")}>
                    <span
                      className={cn(
                        "font-mono tabular-nums",
                        (pnlReport?.summary.realized ?? 0) >= 0 ? "text-up" : "text-down"
                      )}
                    >
                      {`${(pnlReport?.summary.realized ?? 0) >= 0 ? "+" : ""}${(pnlReport?.summary.realized ?? 0).toFixed(2)}`}
                    </span>
                  </Figure>
                  <Figure label={t("unrealized")}>
                    <span
                      className={cn(
                        "font-mono tabular-nums",
                        (pnlReport?.summary.unrealized ?? 0) >= 0
                          ? "text-up"
                          : "text-down"
                      )}
                    >
                      {`${(pnlReport?.summary.unrealized ?? 0) >= 0 ? "+" : ""}${(pnlReport?.summary.unrealized ?? 0).toFixed(2)}`}
                    </span>
                  </Figure>
                  <Figure label={`${tCommon("maker")} / ${tCommon("taker")}`}>
                    <span className="font-mono tabular-nums">
                      {(pnlReport?.breakdown.windowTradeCount ?? 0) > 0
                        ? `${pnlReport!.breakdown.makerFillCount} / ${pnlReport!.breakdown.takerFillCount}`
                        : "—"}
                    </span>
                  </Figure>
                  <Figure
                    label={`${tExt("fees_paid")} (${pnlReport?.breakdown.windowDays ?? 0}d)`}
                  >
                    <span className="font-mono tabular-nums">
                      {(pnlReport?.breakdown.windowTradeCount ?? 0) > 0
                        ? pnlReport!.breakdown.windowFees.toFixed(2)
                        : "—"}
                    </span>
                  </Figure>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}
