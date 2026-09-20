"use client";

import { useEffect, useState, useRef } from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MoneyFigure } from "@/components/ui/money-figure";
import { ChartCard } from "@/components/ui/chart/chart-card";
import { SeriesChart } from "@/components/ui/chart/series-chart";
import { m } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  DollarSign,
  Activity,
  Target,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  LineChart,
  Sparkles,
  Trophy,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import {
  formatCurrencyAuto,
  formatPnL,
  formatAllocation,
} from "@/utils/currency";
import AnalyticsErrorState from "./error-state";
import { Loadable } from "@/components/ui/skeleton";
import { HeroSection } from "@/components/ui/hero-section";
import { useTranslations } from "next-intl";

interface AnalyticsData {
  summary: {
    totalAllocated: number;
    totalProfit: number;
    overallROI: number;
    activeSubscriptions: number;
    totalTrades: number;
    winRate: number;
  };
  byLeader: Array<{
    leader: { id: string; displayName: string };
    subscription?: { id: string; status: string };
    trades: number;
    wins: number;
    profit: number;
    volume: number;
    winRate: number;
    roi: number;
  }>;
  profitChart: Array<{
    date: string;
    dailyProfit: number;
    cumulativeProfit: number;
  }>;
  tradeDistribution: {
    bySymbol: Array<{ symbol: string; count: number; profit: number }>;
    bySide: {
      buy: { count: number; profit: number };
      sell: { count: number; profit: number };
    };
  };
}

/**
 * The shape the page renders BEFORE the fetch resolves.
 *
 * Not a fallback for missing data — the error state still handles that. This
 * exists so the page's own layout can be the pending layout: every figure below
 * is wrapped in a `Loadable`, so these zeroes are never painted, they only give
 * the destructuring something to bind to. One object, so there is no second
 * copy of the analytics tree to keep in sync.
 */
const PENDING_ANALYTICS: AnalyticsData = {
  summary: {
    totalAllocated: 0,
    totalProfit: 0,
    overallROI: 0,
    activeSubscriptions: 0,
    totalTrades: 0,
    winRate: 0,
  },
  byLeader: [],
  profitChart: [],
  tradeDistribution: {
    bySymbol: [],
    bySide: { buy: { count: 0, profit: 0 }, sell: { count: 0, profit: 0 } },
  },
};

/** Leader rows to reserve while the breakdown is in flight. */
const PENDING_LEADER_ROWS = 2;

const periodOptions = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

export default function AnalyticsClient() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const lastPeriodRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastPeriodRef.current === period) return;
    lastPeriodRef.current = period;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const { data } = await $fetch({
          url: "/api/copy-trading/analytics",
          method: "GET",
          params: { period },
          silentSuccess: true,
        });

        setAnalytics(data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  const handlePeriodChange = (newPeriod: string) => {
    lastPeriodRef.current = null;
    setPeriod(newPeriod);
  };

  /*
    THE WHOLE PAGE USED TO DISAPPEAR ON EVERY PERIOD CHANGE.

    `if (isLoading) return <AnalyticsLoading/>` did not only fire on first load:
    `setIsLoading(true)` runs at the top of the fetch, and the fetch re-runs
    whenever the user picks 24H/7D/30D/90D/1Y/All. So clicking a period button
    in the hero replaced the page — including the button row itself — with the
    route's skeleton, and the control the user had just clicked vanished under
    the cursor.

    Now the hero, the period buttons, the six KPI cards, both chart frames and
    the leader breakdown's heading all stay put; only the figures and the series
    inside them are pending.

    `!analytics` is the FAILED answer, so it must wait for the request to
    finish — unqualified it would show the retry screen during every fetch.
  */
  const resolvedWithNoData = !isLoading && !analytics;
  if (resolvedWithNoData) {
    return (
      <AnalyticsErrorState
        onRetry={() => {
          lastPeriodRef.current = null;
          setPeriod(period);
        }}
      />
    );
  }

  const { summary, byLeader, profitChart, tradeDistribution } =
    analytics ?? PENDING_ANALYTICS;
  const isPositiveROI = summary.overallROI >= 0;
  // Cumulative P&L is POLARITY, not identity. The bar chart this replaced
  // painted every bar `bg-success`/`bg-destructive` by sign, so the series keeps
  // the direction-of-money tokens rather than taking a categorical ramp slot —
  // a period that ended underwater must not read as "series 1".
  const profitPoints = profitChart ?? [];
  const profitEndsUp =
    (profitPoints[profitPoints.length - 1]?.cumulativeProfit ?? 0) >= 0;

  return (
    /* No background on the root. The `HeroSection` below mounts
       `WorkspaceGround` (`fixed inset-0 -z-10`); the wash that used to live
       here — `bg-linear-to-b from-background via-muted/10 to-background` — is
       an in-flow background, so it painted straight over the grid, the ramp
       and the accent stop. `min-h-screen` stays: the ground is fixed, but the
       page still has to own the viewport. */
    <div className="min-h-screen">
      {/* Hero Header */}
      <HeroSection
        badge={{
          icon: <BarChart3 className="h-3.5 w-3.5" />,
          text: "Performance Analytics",
        }}
        title={t("your_trading_analytics")}
        description={t("track_your_copy_trading_performance_with")}
        layout="split"
        rightContentAlign="end"
        rightContent={
          <div className="flex gap-1 bg-muted dark:bg-muted/50 p-1 rounded-xl">
            {periodOptions.map((opt) => (
              <Button
                key={opt.value}
                variant="ghost"
                size="sm"
                onClick={() => handlePeriodChange(opt.value)}
                className={`rounded-lg px-4 ${
                  period === opt.value
                    ? "bg-card"
                    : "hover:bg-card/50 dark:hover:bg-muted/50"
                }`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="container mx-auto px-4 py-8">
        {/* Main Stats Grid */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8"
        >
          {/* Total Allocated */}
          <StatsCard
            label={tExt("total_allocated")}
            value={
              <MoneyFigure
                value={formatAllocation(summary.totalAllocated, "USDT")}
              />
            }
            icon={Wallet}
            loading={isLoading}
            {...statsCardColors.primary}
          />

          {/* Total Profit */}
          <StatsCard
            label={tCommon("total_profit")}
            value={
              <span
                className={
                  summary.totalProfit >= 0 ? "text-success" : "text-destructive"
                }
              >
                <MoneyFigure
                  value={formatPnL(summary.totalProfit, "USDT").formatted}
                />
              </span>
            }
            icon={summary.totalProfit >= 0 ? TrendingUp : TrendingDown}
            loading={isLoading}
            {...(summary.totalProfit >= 0
              ? statsCardColors.success
              : statsCardColors.red)}
          />

          {/* Overall ROI */}
          <StatsCard
            label={t("overall_roi")}
            value={
              <span
                className={`font-mono tabular-nums ${
                  isPositiveROI ? "text-success" : "text-destructive"
                }`}
              >
                {isPositiveROI ? "+" : ""}
                {summary.overallROI.toFixed(2)}%
              </span>
            }
            icon={Target}
            loading={isLoading}
            {...(isPositiveROI ? statsCardColors.success : statsCardColors.red)}
          />

          {/* Active Subscriptions */}
          <StatsCard
            label="Active"
            value={summary.activeSubscriptions}
            icon={Users}
            loading={isLoading}
            {...statsCardColors.primary}
          />

          {/* Total Trades */}
          <StatsCard
            label={tCommon("total_trades")}
            value={summary.totalTrades.toLocaleString()}
            icon={Activity}
            loading={isLoading}
            {...statsCardColors.warning}
          />

          {/* Win Rate */}
          <StatsCard
            label={tCommon("win_rate")}
            value={`${summary.winRate.toFixed(1)}%`}
            icon={Trophy}
            loading={isLoading}
            {...statsCardColors.primary}
          />
        </m.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Profit Chart */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/*
              This was a hand-rolled div bar chart, and it had a real data bug
              on top of the styling one: the bar height came from
              `Math.abs(item.cumulativeProfit)`, so a cumulative loss of -500
              drew the SAME height as a gain of +500, upward from the same
              floor. Only the fill colour distinguished them — and the axis was
              implied, so there was nothing to read the sign off. A period that
              went underwater looked like a period that did well.

              It also carried a native `title=` attribute as its tooltip: an
              unstyled OS bubble that appears about a second after you stop
              moving, which is why the dates were duplicated as first/last
              captions underneath.
            */}
            <ChartCard
              title={t("profit_over_time")}
              icon={LineChart}
              {...statsCardColors.primary}
              height={240}
              loading={isLoading}
              empty={!profitChart || profitChart.length === 0}
              emptyMessage={t("no_profit_data_yet")}
              className="h-full"
            >
              <SeriesChart
                data={(profitChart ?? []).slice(-30)}
                series={[
                  {
                    key: "cumulativeProfit",
                    label: t("profit_over_time"),
                    color: profitEndsUp ? "hsl(var(--up))" : "hsl(var(--down))",
                  },
                ]}
                type="area"
                xKey="date"
                // NOT `formatPnL().formatted`: that formats `Math.abs(amount)`
                // and only ever prefixes a "+", because its callers carry the
                // sign in `colorClass`. A tooltip has no colour to read, so a
                // cumulative loss of -500 rendered as "500 USDT" — the exact
                // misreading this chart replaced a bar chart to fix.
                valueFormatter={(v) =>
                  `${v > 0 ? "+" : v < 0 ? "-" : ""}${formatCurrencyAuto(Math.abs(v), "USDT")}`
                }
              />
            </ChartCard>
          </m.div>

          {/* Trade Distribution */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChart className="h-5 w-5 text-primary" />
                  {tCommon("trade_distribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* Buy/Sell Distribution */}
                  <div>
                    <h4 className="text-sm font-medium text-subtle-foreground mb-4">
                      {t("by_side")}
                    </h4>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-success/5 dark:bg-success/20">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowUpRight className="h-4 w-4 text-success" />
                          <span className="font-medium text-success">
                            Buy
                          </span>
                        </div>
                        <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                          <Loadable loading={isLoading} chars={3}>
                            {tradeDistribution.bySide.buy.count}
                          </Loadable>
                        </div>
                        <div
                          className={`text-sm ${
                            tradeDistribution.bySide.buy.profit >= 0
                              ? 'text-success'
                              : 'text-destructive'
                          }`}
                        >
                          <Loadable loading={isLoading} placeholder="+1,234.00 USDT">
                            <MoneyFigure
                              value={
                                formatPnL(
                                  tradeDistribution.bySide.buy.profit,
                                  "USDT"
                                ).formatted
                              }
                            />
                          </Loadable>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-destructive/5 dark:bg-destructive/20">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive">
                            Sell
                          </span>
                        </div>
                        <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                          <Loadable loading={isLoading} chars={3}>
                            {tradeDistribution.bySide.sell.count}
                          </Loadable>
                        </div>
                        <div
                          className={`text-sm ${
                            tradeDistribution.bySide.sell.profit >= 0
                              ? 'text-success'
                              : 'text-destructive'
                          }`}
                        >
                          <Loadable loading={isLoading} placeholder="+1,234.00 USDT">
                            <MoneyFigure
                              value={
                                formatPnL(
                                  tradeDistribution.bySide.sell.profit,
                                  "USDT"
                                ).formatted
                              }
                            />
                          </Loadable>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Symbols */}
                  <div>
                    <h4 className="text-sm font-medium text-subtle-foreground mb-4">
                      {t("top_symbols")}
                    </h4>
                    {/* Loading is not empty: while the request is in flight
                        `bySymbol` is `[]`, and the resolved "No data" line is
                        one 20px row where five 40px rows are about to be — a
                        180px jump inside a card the charts are aligned to. */}
                    {isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }, (_, i) => (
                          <div
                            key={`pending-symbol-${i}`}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                              <div>
                                <p className="text-sm font-medium">
                                  <Loadable loading placeholder="BTC/USDT" />
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  <Loadable loading chars={2} /> trades
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold">
                              <Loadable loading placeholder="+123.00 USDT" />
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : tradeDistribution.bySymbol &&
                    tradeDistribution.bySymbol.length > 0 ? (
                      <div className="space-y-3">
                        {tradeDistribution.bySymbol.slice(0, 5).map((item) => (
                          <div
                            key={item.symbol}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                                {item.symbol.slice(0, 3)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {item.symbol}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.count} trades
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-sm font-semibold ${
                                item.profit >= 0
                                  ? 'text-success'
                                  : 'text-destructive'
                              }`}
                            >
                              <MoneyFigure
                                value={formatPnL(item.profit, "USDT").formatted}
                              />
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">{tCommon("no_data")}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </div>

        {/* Performance by Leader */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                {t("performance_by_leader")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Loading is not empty. The resolved empty state here is a
                  `py-16` panel with a call to action ("Start following leaders
                  to see your...") — showing that to an existing subscriber for
                  the length of every period change told them, wrongly, that
                  they follow nobody. */}
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: PENDING_LEADER_ROWS }, (_, idx) => (
                    <div
                      key={`pending-leader-${idx}`}
                      className="p-4 rounded-xl bg-muted dark:bg-muted/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-3 animate-pulse" />
                          <div>
                            <p className="font-semibold text-foreground">
                              <Loadable loading placeholder={tExt("leader_name")} />
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <StatusBadge status="ACTIVE" className="text-xs" />
                              <span className="text-muted-foreground">
                                <Loadable loading chars={2} /> trades
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold tracking-tight">
                            <Loadable loading placeholder="+1,234.00 USDT" />
                          </p>
                          <p className="text-sm">
                            <Loadable loading placeholder="+12.34%" />
                          </p>
                        </div>
                      </div>

                      {/* Stats bar */}
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                        <div>
                          <p className="text-xs text-subtle-foreground mb-1">
                            {tCommon("win_rate")}
                          </p>
                          <div className="flex items-center gap-2">
                            <Progress value={0} className="h-2 flex-1" />
                            <span className="text-sm font-medium font-mono tabular-nums">
                              <Loadable loading placeholder="67.5%" />
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-subtle-foreground mb-1">ROI</p>
                          <div className="flex items-center gap-2">
                            <Progress value={0} className="h-2 flex-1" />
                            <span className="text-sm font-medium font-mono tabular-nums">
                              <Loadable loading placeholder="+12.3%" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : byLeader && byLeader.length > 0 ? (
                <div className="space-y-4">
                  {byLeader.map((item, idx) => {
                    const isPositive = item.profit >= 0;
                    return (
                      <m.div
                        key={item.leader?.id || `leader-${idx}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 rounded-xl bg-muted dark:bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold">
                              {item.leader.displayName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {item.leader.displayName}
                              </p>
                              <div className="flex items-center gap-2 text-sm">
                                <StatusBadge
                                  status={item.subscription?.status || "STOPPED"}
                                  className="text-xs"
                                />
                                <span className="text-muted-foreground">
                                  {item.trades} trades
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-xl font-semibold tracking-tight ${
                                isPositive
                                  ? 'text-success'
                                  : 'text-destructive'
                              }`}
                            >
                              <MoneyFigure
                                value={formatPnL(item.profit, "USDT").formatted}
                              />
                            </p>
                            <p
                              className={`text-sm ${
                                isPositive
                                  ? 'text-success'
                                  : 'text-destructive'
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {item.roi.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        {/* Stats bar */}
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-xs text-subtle-foreground mb-1">
                              {tCommon("win_rate")}
                            </p>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={item.winRate}
                                className="h-2 flex-1"
                              />
                              <span className="text-sm font-medium font-mono tabular-nums">
                                {item.winRate.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-subtle-foreground mb-1">ROI</p>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={Math.min(Math.abs(item.roi), 100)}
                                className="h-2 flex-1"
                              />
                              <span
                                className={`text-sm font-medium font-mono tabular-nums ${
                                  isPositive
                                    ? 'text-success'
                                    : 'text-destructive'
                                }`}
                              >
                                {isPositive ? "+" : ""}
                                {item.roi.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </m.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {t("no_active_subscriptions")}
                  </h3>
                  <p className="text-subtle-foreground mb-6">
                    {t("start_following_leaders_to_see_your")}
                  </p>
                  <Link href="/copy-trading/leader">
                    <Button className="rounded-xl gap-2">
                      <Sparkles className="h-4 w-4" />
                      {t("explore_leaders")}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </m.div>
      </div>
    </div>
  );
}
