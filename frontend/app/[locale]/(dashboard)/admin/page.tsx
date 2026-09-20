"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  DollarSign,
  Info,
  RefreshCw,
  Repeat,
  UserCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonText } from "@/components/ui/skeleton";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChartCard,
  DonutChart,
  SeriesChart,
  formatAxisNumber,
} from "@/components/ui/chart";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "@/store/config";
import { formatMoney } from "@/utils/currency";
import { cn } from "@/lib/utils";

import { PlatformHealth } from "./components/platform-health";
import { ProductOperations } from "./components/product-operations";
import { RevenueStreams } from "./components/revenue-streams";
import {
  GrowthPanel,
  QuickActions,
  SecurityNotice,
  SupportBanner,
  UpdatesWidget,
} from "./components/side-blocks";
import type {
  DashboardData,
  ExtensionData,
  HealthData,
  OperationsSummary,
  SchedulerStatus,
  TimeframeOption,
  UpdateInfo,
} from "./components/types";
import { useTranslations } from "next-intl";

/**
 * The admin landing page.
 *
 * IT IS TITLED "Dashboard", TO AGREE WITH THE NAV ITEM THAT REACHES IT
 * (`config/menu.ts`, key `admin-dashboard`). It read "Operations" for a while,
 * which was wrong twice over: an operator clicked a link labelled Dashboard and
 * landed on a heading that said something else, and the name described the work
 * board — the one block on the page that was a queue — which no longer lives
 * here (see below). If this title is ever changed again, change it WITH the nav
 * label, and note that the nav label renders through the translation path
 * `menu.admin.dashboard.title`, so the word actually shown comes from 90 message
 * files rather than from the literal in `menu.ts`.
 *
 * The page is arranged around the three questions an operator opens it to ask,
 * and they are not the three it used to answer:
 *
 *   1. Is anything on fire?      -> the alert band, and the health card
 *   2. What is waiting on me?    -> the header's Operations inbox, NOT this page
 *   3. How is the business doing? -> the KPI row, the charts, revenue by product
 *
 * (3) is now the bulk of it — five KPIs, four charts, revenue streams and the
 * busiest markets — with platform STATUS (health, updates, per-product tiles,
 * quick actions) beside it. That is what the title and description describe.
 *
 * Before this, (2) was a single "Pending KYC" tile out of a possible seventeen
 * queues, and the largest block above the fold was an upsell carousel. An
 * operator who opened the page to approve a withdrawal could not see that there
 * WAS a withdrawal, and the second-largest block, a system-status panel, was
 * drawing its gauges from `Math.random()`.
 *
 * (2) IS NO LONGER A BLOCK ON THIS PAGE. It was — a `WorkBoard` card of one tile
 * per queue — and that card was a second, larger copy of `OperationsInbox`,
 * which sits in the admin header on every admin route including this one. Both
 * read `/api/admin/operations/summary`, on their own 60-second timers, and drew
 * the same glyph, count, breach chip, oldest age and SLA bar from the same maps
 * in `config/operations.ts`. The inbox is the surviving surface: it is reachable
 * from everywhere rather than from here, and it covers the same queues (the
 * clear ones collapse to a pill row rather than holding a full tile).
 *
 * What this page keeps is the part a popover cannot do, because it requires no
 * click: the ALERT BAND below. A breached queue still stops the operator on
 * arrival, by name and count, with a link into it — so removing the board cost
 * the roomier browse, not the warning.
 *
 * `/api/admin/operations/summary` is therefore still fetched here. It feeds that
 * alert band and `ProductOperations`; the board was never its only consumer.
 *
 * POLLING. Everything here is read-only and cheap, and an operator leaves this
 * tab open. Operations and health refresh on an interval; the analytics payload
 * does not, because it is the expensive one and its numbers do not change minute
 * to minute. All four requests are `silent`, so a transient failure leaves the
 * last good figures on screen instead of throwing a toast over the operator's
 * work every sixty seconds.
 */

const OPERATIONS_POLL_MS = 60_000;
const HEALTH_POLL_MS = 5 * 60_000;

/**
 * Chart-kit timeframe token for each period.
 *
 * These are the tokens `bucketOf` in `chart-axis.ts` actually recognises. The
 * old page passed `"d" | "m" | "y"`, none of which match anything in that
 * table, so all three fell through to the `day` default — and the YEARLY view
 * therefore labelled its twelve monthly buckets "Jan 01, Feb 01, Mar 01" and
 * its tooltips "Wed, Jan 1, 2026", as if they were single days rather than
 * months. `1y` is the token that selects the month bucket.
 */
const AXIS_TIMEFRAME: Record<TimeframeOption, string> = {
  weekly: "7d",
  monthly: "30d",
  yearly: "1y",
};

export default function AdminDashboard() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const extensions = useConfigStore((s) => s.extensions);

  const [timeframe, setTimeframe] = useState<TimeframeOption>("monthly");

  /*
   * ANALYTICS LOADING IS DERIVED, NOT SET.
   *
   * `settled` records which request produced the payload on screen. While its
   * key differs from the key the page currently wants, the request is in
   * flight — so there is no `setLoading(true)` to write, and nothing sets state
   * synchronously inside an effect.
   *
   * It also gives the behaviour a separate loading flag has to be talked into:
   * the PREVIOUS result stays on screen for the whole of a refresh, because
   * `settled` is only replaced once a new answer exists. Changing the timeframe
   * does not blank the page, and a failed refresh leaves the last good figures
   * up rather than five empty cards.
   */
  const [reloadNonce, setReloadNonce] = useState(0);
  const [settled, setSettled] = useState<{
    key: string;
    data: DashboardData | null;
    error: string | null;
  } | null>(null);

  const requestKey = `${timeframe}:${reloadNonce}`;
  const dataLoading = settled?.key !== requestKey;
  const data = settled?.data ?? null;
  const dataError = settled?.error ?? null;

  const [operations, setOperations] = useState<OperationsSummary | null>(null);
  const [operationsLoading, setOperationsLoading] = useState(true);

  const [health, setHealth] = useState<HealthData | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [updates, setUpdates] = useState<UpdateInfo[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(true);

  /*
   * `$fetch` NEVER THROWS — it resolves `{ data, error }`. The previous version
   * of this page wrapped it in try/catch, which made `setError` unreachable, so
   * a failed load fell through to `if (!data) return null`: a blank page with
   * no message and no way to retry whenever the API was down.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data: payload, error } = await $fetch({
        url: "/api/admin/dashboard",
        params: { timeframe },
        silent: true,
      });

      // A timeframe changed mid-flight must not have its stale answer land on
      // top of the newer one.
      if (cancelled) return;

      setSettled({
        key: requestKey,
        data: (payload as DashboardData) ?? null,
        error: error
          ? error
          : payload
            ? null
            : // 2xx carrying nothing usable is still a failed load, not an
              // empty platform — rendering zeros would state that as fact.
              t("the_server_returned_no_dashboard_data"),
      });
    })();

    return () => {
      cancelled = true;
    };
    // `timeframe` is baked into `requestKey`; listing it too would re-run this
    // on a nonce-only change and vice versa, which is the same request twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const reloadDashboard = useCallback(() => setReloadNonce((n) => n + 1), []);

  const loadOperations = useCallback(async () => {
    setOperationsLoading(true);
    const { data: payload, error } = await $fetch({
      url: "/api/admin/operations/summary",
      silent: true,
    });
    if (!error && payload) setOperations(payload as OperationsSummary);
    setOperationsLoading(false);
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    /*
     * The scheduler probe needs `view.cron`, which the health batch does not,
     * so the two are requested independently and a role without it simply gets
     * no scheduler line rather than losing the health card as well.
     */
    const [healthResult, schedulerResult] = await Promise.all([
      $fetch({ url: "/api/admin/system/health/batch", silent: true }),
      $fetch({ url: "/api/admin/system/cron/scheduler", silent: true }),
    ]);
    if (!healthResult.error && healthResult.data) {
      setHealth(healthResult.data as HealthData);
    }
    setScheduler(
      !schedulerResult.error && schedulerResult.data
        ? (schedulerResult.data as SchedulerStatus)
        : null
    );
    setHealthLoading(false);
  }, []);

  const loadUpdates = useCallback(async () => {
    setUpdatesLoading(true);

    const [extensionResult, updateResult] = await Promise.all([
      $fetch({ url: "/api/admin/system/extension", silent: true }),
      $fetch({
        url: "/api/admin/system/update/check/batch",
        method: "POST",
        silent: true,
      }),
    ]);

    const catalog: ExtensionData[] = [];
    const payload = extensionResult.data;
    if (!extensionResult.error && payload) {
      if (Array.isArray(payload)) {
        catalog.push(...payload);
      } else {
        catalog.push(...(payload.extensions ?? []));
        catalog.push(...(payload.blockchains ?? []));
        catalog.push(...(payload.exchangeProviders ?? []));
      }
    }

    /*
     * An unreachable update service is NOT "everything is up to date". Both
     * cases render the same empty widget here, which is the honest floor: the
     * widget can only ever claim an update EXISTS, never that none does.
     */
    const products = updateResult.error ? [] : (updateResult.data?.products ?? []);
    const core = process.env.NEXT_PUBLIC_MAIN_PRODUCT_ID || "35599184";

    setUpdates(
      (Array.isArray(products) ? products : [])
        .filter((p: any) => !p.error)
        .map((p: any): UpdateInfo => {
          // The batch endpoint answers in snake_case; individual checks use
          // camelCase. Accept both rather than silently reading `undefined`.
          const productId = p.product_id ?? p.productId;
          const currentVersion = p.current_version ?? p.currentVersion ?? "0.0.0";
          const match = catalog.find((e) => e.productId === productId);
          const isCore = productId === core;
          return {
            productId,
            name: match?.name ?? (isCore ? "bicrypto" : "unknown"),
            title: match?.title ?? (isCore ? t("bicrypto_core") : String(productId)),
            currentVersion,
            latestVersion: p.latest_version ?? p.latestVersion ?? currentVersion,
            hasUpdate: (p.update_available ?? p.updateAvailable) === true,
            type: isCore ? "core" : "extension",
          };
        })
    );
    setUpdatesLoading(false);
  }, []);

  /*
   * Guarded against React Strict Mode's double-invoke in development, which
   * would otherwise fire the update-check POST twice on every mount.
   */
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    void loadOperations();
    void loadHealth();
    void loadUpdates();
  }, [loadOperations, loadHealth, loadUpdates]);

  useEffect(() => {
    const work = setInterval(() => void loadOperations(), OPERATIONS_POLL_MS);
    const status = setInterval(() => void loadHealth(), HEALTH_POLL_MS);
    return () => {
      clearInterval(work);
      clearInterval(status);
    };
  }, [loadOperations, loadHealth]);

  const overview = data?.overview;
  const axis = AXIS_TIMEFRAME[timeframe];

  /*
   * `sparklineData` is `undefined`, not an empty array, when there is nothing
   * to draw: a StatsCard that receives the prop AT ALL reserves `min-h-44` for
   * the trend, so passing `[]` costs a five-card row ~250px of blank height
   * before the data lands.
   */
  const sparkline = <T,>(rows: T[] | undefined, pick: (row: T) => number) =>
    rows && rows.length > 1 ? rows.map((row) => ({ value: pick(row) })) : undefined;

  /**
   * THE KPI ROW EXISTS BEFORE THE DATA DOES.
   * ==========================================================================
   *
   * This opened with `if (!overview) return []`, which is why the render below
   * had to branch to a grid of five `h-44` grey rectangles: with no entries
   * there was nothing to map. But four of the six fields on each card — label,
   * icon, colour pair, description, `changeLabel` — are LITERALS in this file
   * and known before the request is made. Only `value`, `change` and the
   * sparkline are unknown.
   *
   * Building the array unconditionally lets the real `StatsCard` render its
   * own pending state (it takes `loading` and measures the placeholder against
   * its own `text-2xl leading-tight` figure), which is both exact and one
   * layout instead of two.
   *
   * `sparklineData` is passed as `[]` rather than `undefined` on the two cards
   * that carry a trend, and that is deliberate: `StatsCard` reserves its
   * `min-h-44` trend space on `sparklineData !== undefined`, so `undefined`
   * while pending would have made those two cards 50px shorter than their
   * neighbours and then re-ragged the whole row when the series arrived.
   */
  const kpis = useMemo(() => {
    const registrations = data?.userMetrics.registrations;
    const revenue = data?.financialMetrics.dailyRevenue;

    return [
      {
        label: tCommon("total_users"),
        value: overview?.totalUsers,
        icon: Users,
        change: overview?.newUsersToday,
        changeLabel: "today",
        sparklineData: sparkline(registrations, (r) => r.total) ?? [],
        ...statsCardColors.blue,
      },
      {
        label: tCommon("active_users"),
        value: overview?.activeUsers,
        icon: UserCheck,
        description: t("signed_in_within_30_days"),
        progress: overview
          ? overview.totalUsers > 0
            ? (overview.activeUsers / overview.totalUsers) * 100
            : 0
          : 0,
        ...statsCardColors.green,
      },
      {
        label: tCommon("fee_revenue"),
        value: overview?.revenue.total,
        icon: DollarSign,
        isCurrency: true,
        currency: overview?.revenue.currency,
        change: overview?.deltas.revenue ?? undefined,
        changeLabel:
          overview && overview.deltas.revenue !== null ? "vs previous" : undefined,
        isPercent: Boolean(overview && overview.deltas.revenue !== null),
        sparklineData: sparkline(revenue, (r) => r.revenue) ?? [],
        ...statsCardColors.amber,
      },
      {
        label: tCommon("transactions"),
        value: overview?.totalTransactions,
        icon: Repeat,
        description: tCommon("all_time"),
        ...statsCardColors.purple,
      },
      {
        label: t("new_users"),
        value: overview?.newUsersThisPeriod,
        icon: Activity,
        change: overview?.deltas.users ?? undefined,
        changeLabel:
          overview && overview.deltas.users !== null ? "vs previous" : "this period",
        isPercent: Boolean(overview && overview.deltas.users !== null),
        ...statsCardColors.cyan,
      },
    ];
  }, [overview, data]);

  /** Anything that should stop the operator before they read a chart. */
  const alerts = useMemo(() => {
    const list: Array<{ key: string; text: string; href?: string }> = [];
    if (operations && operations.breached > 0) {
      const worst = [...operations.queues]
        .filter((q) => q.breached > 0)
        .sort((a, b) => b.breached - a.breached);
      list.push({
        key: "sla",
        text: `${operations.breached} item${operations.breached === 1 ? "" : "s"} past target — ${worst
          .slice(0, 3)
          .map((q) => `${q.label} (${q.breached})`)
          .join(", ")}`,
        href: worst[0]?.href,
      });
    }
    if (scheduler && scheduler.status !== "running" && scheduler.status !== "unknown") {
      list.push({ key: "cron", text: scheduler.message, href: "/admin/system/cron" });
    }
    /*
     * THE SCHEDULER IS NOT REPORTED TWICE.
     *
     * A dead cron process both trips its own probe and drags `overall.status`
     * to critical, so the band rendered two red rows that said the same thing —
     * "…Scheduler (Cron) down" directly under the scheduler's own message. The
     * cron row is the better of the two (it carries the actual reason and a
     * link), so it wins, and the health row reports only what it ADDS.
     *
     * If cron is the only thing down, the health row is dropped entirely; if
     * Redis is down as well, it still appears, naming Redis alone.
     */
    if (health?.overall.status === "critical") {
      const cronReported = list.some((a) => a.key === "cron");
      const down = health.services
        .filter((s) => s.status === "down")
        .filter((s) => !(cronReported && /cron|schedul/i.test(s.name)));

      if (!cronReported || down.length > 0) {
        list.push({
          key: "health",
          text: `Platform health is critical${
            down.length ? ` — ${down.map((s) => s.name).join(", ")} down` : ""
          }`,
        });
      }
    }
    return list;
  }, [operations, scheduler, health]);

  const refreshAll = useCallback(() => {
    reloadDashboard();
    void loadOperations();
    void loadHealth();
  }, [reloadDashboard, loadOperations, loadHealth]);

  return (
    <PageShell rhythm="md">
      <PageHeader
        title="Dashboard"
        description={t("platform_performance_system_health_and_how")}
        actions={
          <>
            <Select
              value={timeframe}
              onValueChange={(value) => setTimeframe(value as TimeframeOption)}
            >
              <SelectTrigger className="w-40">
                <Calendar className="me-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{tCommon("this_week")}</SelectItem>
                <SelectItem value="monthly">{t("last_4_weeks")}</SelectItem>
                <SelectItem value="yearly">{t("this_year")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={refreshAll}
              aria-label={t("refresh_everything")}
            >
              <RefreshCw
                className={cn("h-4 w-4", (dataLoading || operationsLoading) && "animate-spin")}
              />
            </Button>
          </>
        }
      />

      {/* 1. Is anything on fire? */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
            >
              {/*
               * `flex-1 min-w-0` + `line-clamp-2`: the message is whatever the
               * probe wrote, and the scheduler's runs to four lines. Without
               * the flex basis the text block claimed its full natural width
               * and shoved "Open" onto a row of its own; without the clamp a
               * single alert grew the band past the work queue. Two lines, and
               * the full text on hover — the page behind "Open" has the rest.
               */}
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive-ink" />
                <p className="line-clamp-2 text-sm text-destructive-ink" title={alert.text}>
                  {alert.text}
                </p>
              </div>
              {alert.href && (
                /* `Link` from `@/i18n/routing`, not a bare `<a>` — these are
                   internal paths and a raw anchor drops the locale prefix,
                   sending an operator on /de/admin to the English route. */
                <Button variant="outline" size="sm" asChild>
                  <Link href={alert.href}>Open</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/*
       * The standing vendor notice sits BELOW the operational alerts and is
       * toned like `SupportBanner`, not like an incident.
       *
       * It used to render above the `<h1>` in full destructive red — the same
       * treatment as "57 items past target". Two consequences: the first thing
       * on an operations console was a piracy warning rather than the page's
       * own title, and red stopped meaning "something is wrong with YOUR
       * platform" because a permanent banner was already wearing it. It is
       * still above the fold and still first in the notices stack; it just no
       * longer outranks the page or competes with a real alert.
       */}
      <SecurityNotice />

      {/* 2. What is waiting on me? -> the Operations inbox in the header. The
          alert band above still names anything past its target, so the answer
          is not one click away when it is URGENT — only when it is routine. */}

      {/* 3. How is the business doing? */}
      {dataError ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
              title={t("could_not_load_analytics")}
              description={dataError}
              action={
                <Button variant="outline" onClick={reloadDashboard}>
                  Retry
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/*
            ONE GRID. It was two: a `[0,1,2,3,4].map` of `h-44` grey blocks and
            then the real cards. `h-44` is 176px and a StatsCard carrying a
            trend is `min-h-44` PLUS its border — so the row was already the
            wrong height, and the five loose rectangles had no border, no
            label, no icon tile and no delta row to reflow from.
          */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi, index) => (
              <StatsCard
                key={kpi.label}
                {...kpi}
                index={index}
                timeframe={axis}
                loading={dataLoading && !data}
              />
            ))}
          </div>

          {overview && overview.revenue.unpriced.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="flex w-fit items-center gap-1.5 text-[11px] text-warning-ink">
                  <Info className="h-3 w-3" />
                  Revenue excludes {overview.revenue.unpriced.join(", ")} — no USD rate
                </p>
              </TooltipTrigger>
              <TooltipContent>
                {t("set_a_rate_for_these_currencies")}
              </TooltipContent>
            </Tooltip>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="grid gap-6 md:grid-cols-2">
                <ChartCard
                  title={tCommon("fee_revenue")}
                  icon={DollarSign}
                  color={statsCardColors.amber.color}
                  bgColor={statsCardColors.amber.bgColor}
                  height={220}
                  loading={dataLoading && !data}
                  empty={!!data && data.financialMetrics.dailyRevenue.every((d) => d.revenue === 0)}
                  emptyMessage={t("no_fees_credited_in_this_period")}
                >
                  <SeriesChart
                    type="area"
                    data={data?.financialMetrics.dailyRevenue ?? []}
                    series={[{ key: "revenue", label: tCommon("revenue") }]}
                    timeframe={axis}
                    valueFormatter={(value) =>
                      formatMoney(value, overview?.revenue.currency ?? "USD", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    }
                  />
                </ChartCard>

                <ChartCard
                  title={t("user_growth")}
                  icon={Users}
                  color={statsCardColors.blue.color}
                  bgColor={statsCardColors.blue.bgColor}
                  height={220}
                  loading={dataLoading && !data}
                >
                  <SeriesChart
                    type="line"
                    data={data?.userMetrics.registrations ?? []}
                    series={[
                      { key: "total", label: tCommon("total_users") },
                      { key: "new", label: tCommon("new") },
                    ]}
                    timeframe={axis}
                  />
                </ChartCard>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <ChartCard
                  title={tCommon("trading_activity")}
                  icon={Activity}
                  color={statsCardColors.green.color}
                  bgColor={statsCardColors.green.bgColor}
                  height={220}
                  loading={dataLoading && !data}
                  empty={!!data && data.tradingActivity.dailyTrades.every((d) => d.count === 0)}
                  emptyMessage={t("no_filled_orders_in_this_period")}
                >
                  <SeriesChart
                    type="bar"
                    data={data?.tradingActivity.dailyTrades ?? []}
                    series={[{ key: "count", label: t("filled_orders") }]}
                    timeframe={axis}
                    valueFormatter={formatAxisNumber}
                  />
                </ChartCard>

                <ChartCard
                  title={t("transaction_mix")}
                  icon={Repeat}
                  color={statsCardColors.purple.color}
                  bgColor={statsCardColors.purple.bgColor}
                  height={200}
                  fitContent
                  loading={dataLoading && !data}
                  empty={!!data && data.financialMetrics.transactionVolume.length === 0}
                  emptyMessage={t("no_completed_transactions_in_this_period")}
                >
                  <DonutChart
                    height={200}
                    centerLabel="Transactions"
                    data={(data?.financialMetrics.transactionVolume ?? []).map((row) => ({
                      id: row.type,
                      name: row.type,
                      value: row.value,
                    }))}
                  />
                </ChartCard>
              </div>

              <RevenueStreams data={data} loading={dataLoading} />
            </div>

            <div className="space-y-6">
              <PlatformHealth
                health={health}
                scheduler={scheduler}
                loading={healthLoading}
                onRefresh={loadHealth}
              />
              <UpdatesWidget
                updates={updates}
                loading={updatesLoading}
                onRefresh={loadUpdates}
              />
              <QuickActions />
              <TopAssets data={data} loading={dataLoading} />
            </div>
          </div>

          {/*
           * FULL WIDTH, AND THE REASON IS THE COLUMN ABOVE IT.
           *
           * This card is a grid of one tile per installed product — twenty of
           * them on a full install. Inside the two-thirds column it was three
           * tiles wide and seven rows tall (620px), which made the main column
           * 1034px against a 832px side rail, and the page rendered an ~850px
           * empty channel down the right-hand side beneath "Quick access".
           *
           * Out here it is four tiles wide and five rows tall, the two columns
           * above it end within ~200px of each other (exactly level once
           * "Busiest markets" has data), and the tile grid gets the width it
           * actually wants. Nothing was removed to achieve it.
           */}
          <ProductOperations
            data={data}
            operations={operations}
            extensions={extensions}
            loading={operationsLoading}
          />

          <GrowthPanel activeExtensions={extensions} />
        </>
      )}

      <SupportBanner />
    </PageShell>
  );
}

/** The busiest markets this period. Small enough to live beside the page. */
function TopAssets({
  data,
  loading,
}: {
  data: DashboardData | null;
  loading: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const assets = data?.tradingActivity.topAssets ?? [];
  /* Empty is a conclusion: a platform with no trades has no "busiest markets"
     card at all. Pending is not — the card stays, with pending rows. */
  const hideCard = !loading && assets.length === 0;
  if (hideCard) return null;

  /* Three rows, because the list has no knowable length and three is what the
     old hardcoded fallback reserved. The container is what matters. */
  const pendingRows = [0, 1, 2];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid h-7 w-7 place-items-center rounded-sm bg-chart-3/15 text-chart-3">
            <Activity className="h-3.5 w-3.5" />
          </span>
          {t("busiest_markets")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/*
          ONE `<ul>`, both states.

          This branched from a `<div className="space-y-2">` of three `h-6`
          bars to a `<ul className="space-y-2">` of rows — a different element
          with different default margins, and `h-6` (24px) against a row whose
          content is `text-xs` in a flex line, which measures 16px. So the card
          was 24px taller than it was about to be, times three rows, and it
          sits in a `lg:auto-rows-fr` band where that resizes its neighbours.

          Now the list element and its spacing are constant, and each row's two
          VALUES carry the placeholder inside the span that styles them.
        */}
        <ul className="space-y-2">
          {loading && !data
            ? pendingRows.map((i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-xs font-medium">
                    <SkeletonText placeholder="BTC/USDT" />
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    <SkeletonText placeholder="1.2K" /> trades
                  </span>
                </li>
              ))
            : assets.map((asset) => (
                <li key={asset.asset} className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-xs font-medium">
                    {asset.asset}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatAxisNumber(asset.trades)} trades
                  </span>
                </li>
              ))}
        </ul>
      </CardContent>
    </Card>
  );
}
