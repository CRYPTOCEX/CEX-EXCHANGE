"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { m } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, RefreshCw, Mail, MessageSquare, Smartphone, Inbox, BarChart3, Send, CheckCircle2, Activity } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartCard, DonutChart, SeriesChart } from "@/components/ui/chart";
import { NotificationKpiRow } from "./kpi-row";
import { useTranslations } from "next-intl";

interface MetricsData {
  period: string;
  timestamp: string;
  overview: {
    totalSent: number;
    totalFailed: number;
    successRate: string;
    cacheHitRate?: number;
  };
  byChannel: {
    [key: string]: {
      sent: number;
      failed: number;
      successRate: string;
    };
  };
  byType: {
    [key: string]: {
      sent: number;
      failed: number;
    };
  };
}

interface AnalyticsData {
  timeframe: string;
  timestamp: string;
  kpis: Array<{
    id: string;
    title: string;
    value: number | string;
    change: number;
    trend: Array<{ date: string; value: number }>;
    icon: string;
  }>;
  charts: {
    notificationsOverTime: Array<{
      date: string;
      total: number;
      sent: number;
      failed: number;
    }>;
    channelBreakdown: Array<{
      date: string;
      "In-App": number;
      Email: number;
      SMS: number;
      Push: number;
    }>;
    statusBreakdown: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    channelTotals: Array<{
      name: string;
      value: number;
      color: string;
    }>;
  };
}

// The analytics endpoint hands each status segment a raw hex (#22c55e, #ef4444…).
// These four segments are STATES, so they take the status tokens instead — an
// off-palette literal cannot follow a theme change.
const STATUS_SEGMENT_COLORS: Record<string, string> = {
  Sent: "green",
  Failed: "danger",
  Read: "info",
  Pending: "warning",
};

export function MetricsPanel() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  /**
   * `true`, not `false`. `fetchData` runs from a `useEffect`, which fires after
   * the first paint — so the initial render used to report "not loading, no
   * data", which is the definition of the empty state, and the "No metrics data
   * available" card painted for a frame on every mount before a request had
   * even been made. Starting at `true` says what is actually happening.
   */
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("7d");

  const fetchData = async (selectedTimeframe: string) => {
    setIsLoading(true);
    try {
      // Fetch both metrics and analytics in parallel
      const [metricsResult, analyticsResult] = await Promise.all([
        $fetch({
          url: `/api/admin/system/notification/metrics?period=${selectedTimeframe === "24h" ? "day" : selectedTimeframe === "7d" ? "week" : "month"}`,
          silent: true,
        }),
        $fetch({
          url: `/api/admin/system/notification/analytics?timeframe=${selectedTimeframe}`,
          silent: true,
        }),
      ]);

      if (metricsResult.error) {
        toast.error(t("failed_to_fetch_metrics"));
      } else {
        setMetricsData(metricsResult.data);
      }

      if (!analyticsResult.error) {
        setAnalyticsData(analyticsResult.data);
      }
    } catch (err) {
      console.error("Data fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(timeframe);
  }, [timeframe]);

  const channelIcons: Record<string, any> = {
    IN_APP: { icon: Inbox, color: "text-primary", bgColor: "bg-primary/10" },
    EMAIL: { icon: Mail, color: "text-success", bgColor: "bg-success/10" },
    SMS: { icon: MessageSquare, color: "text-warning", bgColor: "bg-warning/10" },
    PUSH: { icon: Smartphone, color: "text-primary", bgColor: "bg-primary/10" },
  };

  /**
   * FIRST LOAD IS PENDING. A REFRESH IS NOT.
   * ==========================================================================
   *
   * `isLoading` flips true on every timeframe click and on the refresh button,
   * and on those the previous numbers are still on screen and still roughly
   * right. Treating that as "pending" would blank four charts each time the
   * operator moved between 24h / 7d / 30d / 90d — a self-inflicted flicker on
   * the control the panel exists to be driven by. Pending is the one state
   * where there is genuinely nothing to show.
   */
  const pending = isLoading && !metricsData && !analyticsData;

  const charts = analyticsData?.charts;

  /**
   * The chart grid renders while pending, and that is what the deleted
   * skeleton block was standing in for.
   *
   * What was here:
   *
   *     {isLoading && !metricsData && !analyticsData && (
   *       <div className="space-y-4">
   *         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
   *           {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44" />)}
   *         </div>
   *         <div className="grid gap-6 lg:grid-cols-2">
   *           {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
   *         </div>
   *       </div>
   *     )}
   *
   * Eight loose grey rectangles in place of eight bordered cards. Every part of
   * a `ChartCard` except the plot area is knowable now — the tinted icon tile,
   * the title, the description line, the border and its 16px of padding — so
   * `h-80` was not just an approximation of a card, it was an approximation of
   * a card with all of its chrome deleted. `ChartCard` already takes `loading`
   * and skeletons ONLY the plot area at the caller's own `height`, which is the
   * one part of a chart with no text metrics to measure itself against.
   *
   * `showCharts` keeps the grid out of the RESOLVED-and-empty case, where the
   * "No metrics data available" card below is the honest answer — so the two
   * are still mutually exclusive, they just no longer share a condition.
   */
  const showCharts = pending || Boolean(charts);

  /**
   * Resolved, and there is nothing. Written as a named boolean because the
   * inline `!metricsData && !analyticsData && !isLoading &&` it replaces is the
   * `hidden-while-loading` shape — and because reading it back is the only way
   * to see that this card is about the ANSWER being empty, not about the answer
   * being late.
   */
  const showEmptyState = !isLoading && !metricsData && !analyticsData;

  return (
    <div className="space-y-6">
      {/* Header with Timeframe Selector */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t("notification_metrics")}
                </CardTitle>
                <CardDescription>
                  {t("analytics_and_performance_metrics_for")} {timeframe === "24h" ? tCommon("last_24_hours") : timeframe === "7d" ? tCommon("last_7_days") : timeframe === "30d" ? tCommon("last_30_days") : tCommon("last_90_days")}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchData(timeframe)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={timeframe} onValueChange={setTimeframe}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="24h">24 Hours</TabsTrigger>
                <TabsTrigger value="7d">7 Days</TabsTrigger>
                <TabsTrigger value="30d">30 Days</TabsTrigger>
                <TabsTrigger value="90d">90 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      </m.div>

      {/*
        KPI Cards — rendered in BOTH states now that `NotificationKpiRow` takes
        `loading`.

        It used to be gated on the data alone, which is not the
        `hidden-while-loading` shape the scanner looks for and was the same
        defect anyway: ~192px of cards appeared above everything below the
        moment the analytics call returned. The row is shared with the Health
        tab precisely so the two cannot drift, so the fix belongs in that
        component rather than as a second copy of the KPI layout here.
      */}
      <NotificationKpiRow
        kpis={analyticsData?.kpis}
        timeframe={timeframe}
        loading={pending}
      />

      {/* Charts Grid — see `showCharts`. One tree in both states. */}
      {showCharts && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Notifications Over Time Chart */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ChartCard
              title={t("notifications_over_time")}
              description={`Total, sent, and failed notifications by ${timeframe === "24h" ? "hour" : "day"}`}
              icon={Activity}
              height={300}
              loading={pending}
              empty={!charts?.notificationsOverTime?.length}
              emptyMessage={t("no_notifications_in_this_period")}
            >
              <SeriesChart
                data={charts?.notificationsOverTime ?? []}
                series={[
                  { key: "total", label: tCommon("total") },
                  { key: "sent", label: tCommon("sent"), color: "green" },
                  { key: "failed", label: tCommon("failed"), color: "danger" },
                ]}
                type="area"
                timeframe={timeframe}
              />
            </ChartCard>
          </m.div>

          {/* Channel Breakdown Over Time */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <ChartCard
              title={t("channel_activity")}
              description={t("notifications_by_channel_over_time")}
              icon={BarChart3}
              height={300}
              loading={pending}
              empty={!charts?.channelBreakdown?.length}
              emptyMessage={t("no_channel_activity_in_this_period")}
            >
              <SeriesChart
                data={charts?.channelBreakdown ?? []}
                series={[
                  { key: "In-App" },
                  { key: "Email" },
                  { key: "SMS" },
                  { key: "Push" },
                ]}
                type="stackedBar"
                timeframe={timeframe}
              />
            </ChartCard>
          </m.div>

          {/* Status Distribution Pie Chart */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <ChartCard
              title={tCommon("status_distribution")}
              description={t("breakdown_by_notification_status")}
              icon={CheckCircle2}
              height={320}
              loading={pending}
            >
              <DonutChart
                data={(charts?.statusBreakdown ?? []).map((entry) => ({
                  name: entry.name,
                  value: entry.value,
                  color: STATUS_SEGMENT_COLORS[entry.name],
                }))}
                height={190}
                centerLabel="Total"
              />
            </ChartCard>
          </m.div>

          {/* Channel Totals Pie Chart */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <ChartCard
              title={t("channel_distribution")}
              description={t("total_notifications_by_channel")}
              icon={Send}
              height={320}
              loading={pending}
            >
              <DonutChart
                data={(charts?.channelTotals ?? []).map((entry) => ({
                  name: entry.name,
                  value: entry.value,
                }))}
                height={190}
                centerLabel="Total"
              />
            </ChartCard>
          </m.div>
        </div>
      )}

      {/* Channel Breakdown Cards */}
      {metricsData?.byChannel && Object.keys(metricsData.byChannel).length > 0 && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t("channel_performance")}</CardTitle>
              <CardDescription>{t("detailed_metrics_for_each_notification_channel")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(metricsData.byChannel).map(([channel, stats]) => {
                  const channelInfo = channelIcons[channel] || {
                    icon: TrendingUp,
                    color: "text-subtle-foreground",
                    bgColor: "bg-muted/10",
                  };
                  const Icon = channelInfo.icon;

                  return (
                    /* The Ledger interior, matching the KPI row at the top of
                       this same page: `h-7 w-7 rounded-sm` tile with an `h-3.5`
                       glyph, an `xs` muted label, and the figure in
                       `text-2xl font-semibold font-mono tabular-nums`. These
                       were `p-2 rounded-lg` tiles with `h-5` glyphs and
                       `text-2xl font-bold` sans figures — the same metric,
                       three anatomies apart, 400px down the page. */
                    <div key={channel} className="rounded-lg border border-border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-muted-foreground">
                          {channel.replace("_", "-")}
                        </span>
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm ${channelInfo.bgColor} ${channelInfo.color}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                      </div>
                      <div className="flex items-baseline gap-4">
                        <div>
                          <div className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-foreground">
                            {stats.sent.toLocaleString()}
                          </div>
                          <div className="mt-0.5 text-[11px] text-subtle-foreground">Sent</div>
                        </div>
                        <div>
                          {/* Failed keeps its status colour: zero failures vs some
                              failures is a STATE, which is what `--destructive`
                              is for. The count above it is neutral ink. */}
                          <div
                            className={`text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums ${
                              stats.failed > 0 ? "text-destructive" : "text-foreground"
                            }`}
                          >
                            {stats.failed.toLocaleString()}
                          </div>
                          <div className="mt-0.5 text-[11px] text-subtle-foreground">Failed</div>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-subtle-foreground">
                        <span
                          className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                            parseFloat(stats.successRate) >= 95
                              ? "bg-success/12 text-success-ink"
                              : parseFloat(stats.successRate) >= 80
                              ? "bg-warning/12 text-warning-ink"
                              : "bg-destructive/12 text-destructive-ink"
                          }`}
                        >
                          {parseFloat(stats.successRate).toFixed(1)}%
                        </span>
                        <span>success</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </m.div>
      )}

      {/* Type Breakdown */}
      {metricsData?.byType && Object.keys(metricsData.byType).length > 0 && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t("metrics_by_type")}</CardTitle>
              <CardDescription>{t("notification_distribution_by_type")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metricsData.byType)
                  .sort((a, b) => b[1].sent - a[1].sent)
                  .map(([type, stats]) => {
                    const total = stats.sent + stats.failed;
                    const successRate = total > 0 ? ((stats.sent / total) * 100).toFixed(1) : "0";
                    const percentage = metricsData.overview.totalSent > 0
                      ? ((stats.sent / metricsData.overview.totalSent) * 100)
                      : 0;

                    return (
                      <div key={type} className="flex items-center gap-4 rounded-lg border border-border bg-card p-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{type}</span>
                            <Badge variant="outline">{successRate}%</Badge>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 mb-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {tCommon("sent")}: <span className="text-foreground font-medium">{stats.sent.toLocaleString()}</span>
                            </span>
                            <span className="text-muted-foreground">
                              {tCommon("failed")}: <span className="text-destructive font-medium">{stats.failed.toLocaleString()}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </m.div>
      )}

      {showEmptyState && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{t("no_metrics_data_available")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
