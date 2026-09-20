"use client";

import { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { m } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Activity,
  Database,
  Mail,
  MessageSquare,
  Smartphone,
  Inbox,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ChartCard, DonutChart, SeriesChart } from "@/components/ui/chart";
import { NotificationKpiRow } from "./kpi-row";
import { useTranslations } from "next-intl";

interface HealthMonitorProps {
  data: any;
  onRefresh: () => void;
}

interface HealthData {
  status: string;
  timestamp: string;
  redis: boolean;
  channels: {
    [key: string]: {
      available: boolean;
      configured: boolean;
      lastCheck: string;
      error?: string;
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
    notificationsOverTime: Array<{ date: string; total: number; sent: number; failed: number }>;
    channelBreakdown: Array<{ date: string; [key: string]: any }>;
    statusBreakdown: Array<{ name: string; value: number; color: string }>;
    channelTotals: Array<{ name: string; value: number; color: string }>;
  };
}

export function HealthMonitor({ data, onRefresh }: HealthMonitorProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  /* `true`, not `false`. `fetchHealth` runs from a `useEffect`, which fires
     AFTER the first paint — so an initial `false` meant the first frame said
     "not loading and no data", which is the definition of empty, and the
     "No analytics data available" card painted for a frame on every mount
     before a request had even been made. */
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("7d");

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      const [healthRes, analyticsRes] = await Promise.all([
        $fetch({ url: "/api/admin/system/notification/health", silent: true }),
        $fetch({ url: `/api/admin/system/notification/analytics?timeframe=${timeframe}`, silent: true }),
      ]);

      if (healthRes.error) {
        toast.error(t("failed_to_fetch_health_status"));
      } else {
        setHealthData(healthRes.data);
      }

      if (!analyticsRes.error) {
        setAnalyticsData(analyticsRes.data);
      }
    } catch (err) {
      console.error("Health fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
        return "text-success";
      case "degraded":
        return "text-warning";
      case "unhealthy":
        return "text-destructive";
      default:
        return "text-subtle-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "degraded":
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case "unhealthy":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Activity className="h-5 w-5 text-subtle-foreground" />;
    }
  };

  const channelIcons: Record<string, any> = {
    IN_APP: Inbox,
    EMAIL: Mail,
    SMS: MessageSquare,
    PUSH: Smartphone,
  };

  /**
   * PENDING AND EMPTY, kept apart.
   *
   * `analyticsData` is null in both, and the two want opposite treatments: one
   * draws the real cards with placeholder figures, the other says there is
   * nothing to draw. `analyticsPending` stays true across a timeframe change
   * only until the first payload lands — after that a re-poll keeps the
   * existing numbers on screen rather than blanking four charts every time the
   * operator clicks 24h/7d/30d/90d.
   */
  const analyticsPending = isLoading && !analyticsData;
  const showAnalyticsEmpty = !isLoading && !analyticsData;

  return (
    <div className="space-y-6">
      {/* Overall Health */}
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
                  {healthData && getStatusIcon(healthData.status)}
                  {t("overall_system_health")}
                </CardTitle>
                <CardDescription>
                  {t("last_checked")}: {healthData ? new Date(healthData.timestamp).toLocaleString() : tCommon("never")}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  fetchHealth();
                  onRefresh();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t("service_status")}</span>
                  <Badge
                    variant={healthData?.status === "healthy" ? "default" : "destructive"}
                    className={
                      healthData?.status === "healthy"
                        ? "bg-success/10 text-success-ink hover:bg-success/15"
                        : ""
                    }
                  >
                    {healthData?.status || data?.status || tCommon("unknown")}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </m.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Redis Health */}
        <m.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Database className="h-3.5 w-3.5" />
                </span>
                {t("redis_cache")}
              </CardTitle>
              <CardDescription>{t("cache_service_connection_status")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">{t("connection_status")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {healthData?.redis || data?.health?.redis ? t("connected_and_operational") : t("disconnected")}
                  </p>
                </div>
                <Badge
                  variant={healthData?.redis || data?.health?.redis ? "default" : "destructive"}
                  className={
                    healthData?.redis || data?.health?.redis
                      ? "bg-success/10 text-success-ink hover:bg-success/15"
                      : ""
                  }
                >
                  {healthData?.redis || data?.health?.redis ? tCommon("connected") : t("disconnected")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* Channels Health */}
        <m.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                </span>
                {t("channel_status")}
              </CardTitle>
              <CardDescription>{t("individual_channel_health")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthData?.channels ? (
                  Object.entries(healthData.channels).map(([channel, status]) => {
                    const Icon = channelIcons[channel] || Activity;
                    return (
                      <div
                        key={channel}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{channel.replace("_", "-")}</p>
                            {status.error && (
                              <p className="text-xs text-destructive mt-0.5">{status.error}</p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={status.available ? "default" : "secondary"}
                          className={
                            status.available
                              ? "bg-success/10 text-success-ink hover:bg-success/15"
                              : ""
                          }
                        >
                          {status.available ? tCommon("available") : tCommon("unavailable")}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t("no_detailed_channel_data_available")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </m.div>
      </div>

      {/* Analytics Section */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </span>
                  {t("health_analytics")}
                </CardTitle>
                <CardDescription>{t("historical_notification_performance_data")}</CardDescription>
              </div>
              <Tabs value={timeframe} onValueChange={setTimeframe}>
                <TabsList>
                  <TabsTrigger value="24h">24h</TabsTrigger>
                  <TabsTrigger value="7d">7d</TabsTrigger>
                  <TabsTrigger value="30d">30d</TabsTrigger>
                  <TabsTrigger value="90d">90d</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {/*
              ONE ANALYTICS BLOCK, BOTH STATES.

              What was here: `isLoading && !analyticsData ? <div className="flex
              items-center justify-center h-64"><Loader2/></div> : …`. A 256px
              centred spinner standing in for a KPI row plus three chart cards —
              well over 900px — inside a card that is itself inside the Health
              tab, so the tab's whole lower half changed height when the
              analytics call returned.

              (The scanner does not flag this one, and that is a limitation
              rather than a verdict: its `spinner-fallback` rule only inspects
              a `loading ? A : B` where BOTH arms are JSX, and the false arm
              here is another conditional.)

              `ChartCard` already reserves its own `height` and skeletons only
              the plot area while keeping the icon tile, title and footer, and
              `NotificationKpiRow` now takes `loading` — so every child can be
              told it is pending and nothing has to be withheld.
            */}
            {showAnalyticsEmpty ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">{t("no_analytics_data_available")}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* KPI Cards — the same four the Metrics tab shows, from the
                    same call, through the same component. */}
                <NotificationKpiRow
                  kpis={analyticsData?.kpis}
                  timeframe={timeframe}
                  loading={analyticsPending}
                />

                {/* Notifications Over Time Chart */}
                <ChartCard
                  title={t("notifications_over_time")}
                  icon={Activity}
                  height={300}
                  loading={analyticsPending}
                  /* `empty` is a statement about data that ARRIVED. Asserting
                     it while the request is in flight would print "No
                     notifications in this period" over every chart on mount. */
                  empty={
                    !analyticsPending &&
                    !analyticsData?.charts.notificationsOverTime?.length
                  }
                  emptyMessage={t("no_notifications_in_this_period")}
                >
                  <SeriesChart
                    data={analyticsData?.charts.notificationsOverTime ?? []}
                    series={[
                      { key: "total", label: tCommon("total") },
                      { key: "sent", label: tCommon("sent"), color: "green" },
                      { key: "failed", label: tCommon("failed"), color: "danger" },
                    ]}
                    type="area"
                    timeframe={timeframe}
                  />
                </ChartCard>

                {/* Channel Distribution */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Channel Breakdown Over Time */}
                  <ChartCard
                    title={t("channel_activity_over_time")}
                    icon={BarChart3}
                    height={320}
                    loading={analyticsPending}
                    empty={
                      !analyticsPending &&
                      !analyticsData?.charts.channelBreakdown?.length
                    }
                    emptyMessage={t("no_channel_activity_in_this_period")}
                  >
                    <SeriesChart
                      data={analyticsData?.charts.channelBreakdown ?? []}
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

                  {/* Channel Totals Pie Chart */}
                  <ChartCard
                    title={t("channel_distribution")}
                    icon={PieChartIcon}
                    height={320}
                    loading={analyticsPending}
                  >
                    <DonutChart
                      data={(analyticsData?.charts.channelTotals ?? []).map(
                        (entry) => ({
                          name: entry.name,
                          value: entry.value,
                        })
                      )}
                      height={190}
                      centerLabel="Total"
                    />
                  </ChartCard>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </m.div>
    </div>
  );
}
