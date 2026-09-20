"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Database,
  Clock,
  Users,
  TrendingUp,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Loadable, SkeletonBlock } from "@/components/ui/skeleton";
import { HeroSection } from "@/components/ui/hero-section";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

// Backend response structure — must match backend/src/api/(ext)/admin/copy-trading/health/index.get.ts
interface BackendHealthResponse {
  status: "healthy" | "degraded" | "critical";
  timestamp: string;
  metrics: {
    totalTrades24h: number;
    executedTrades24h: number;
    failedTrades24h: number;
    pendingTrades: number;
    failureRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    activeSubscriptions: number;
    activeLeaders: number;
  };
  services: {
    database: string;
    copyTradingEngine: string;
  };
  alerts: Array<{
    severity: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
  recentErrors: any[];
}

// Frontend-friendly structure
interface HealthData {
  status: "healthy" | "degraded" | "critical" | "unhealthy";
  timestamp: string;
  services: {
    database: string;
    copyTradingEngine: string;
  };
  metrics: {
    totalTrades24h: number;
    executedTrades24h: number;
    failedTrades24h: number;
    pendingTrades: number;
    failureRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    activeSubscriptions: number;
    activeLeaders: number;
  };
  alerts: Array<{
    level: "warning" | "error";
    message: string;
    timestamp: string;
  }>;
  recentErrors: any[];
}

// Transform the real backend response into the shape this page renders. Every
// metric below is read from the backend (which computes them from the last 24h
// of copy trades) — no fabricated zeros.
function transformHealthResponse(backend: BackendHealthResponse): HealthData {
  const m = backend?.metrics || ({} as BackendHealthResponse["metrics"]);
  return {
    status: backend?.status || "healthy",
    timestamp: backend?.timestamp || new Date().toISOString(),
    services: {
      database: backend?.services?.database || "unknown",
      copyTradingEngine: backend?.services?.copyTradingEngine || "unknown",
    },
    metrics: {
      totalTrades24h: m.totalTrades24h ?? 0,
      executedTrades24h: m.executedTrades24h ?? 0,
      failedTrades24h: m.failedTrades24h ?? 0,
      pendingTrades: m.pendingTrades ?? 0,
      failureRate: m.failureRate ?? 0,
      avgLatencyMs: m.avgLatencyMs ?? 0,
      p95LatencyMs: m.p95LatencyMs ?? 0,
      p99LatencyMs: m.p99LatencyMs ?? 0,
      activeSubscriptions: m.activeSubscriptions ?? 0,
      activeLeaders: m.activeLeaders ?? 0,
    },
    alerts: (backend?.alerts || []).map((a) => ({
      level: a.severity === "critical" ? "error" : "warning",
      message: a.message,
      timestamp: a.timestamp,
    })),
    recentErrors: backend?.recentErrors || [],
  };
}

export default function HealthClient() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const { data } = await $fetch({
        url: "/api/admin/copy-trading/health",
        method: "GET",
        silent: true,
      });

      // Transform backend response to frontend format
      const transformed = transformHealthResponse(data as BackendHealthResponse);
      setHealth(transformed);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to fetch health:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * `undefined` is now a legal argument, and it means PENDING — not "unknown".
   *
   * The distinction is the whole point: `default` here paints a red `XCircle`,
   * so the old call sites, which passed the literal `"unknown"` whenever the
   * field was missing, would have rendered a critical-failure icon on a system
   * whose health had simply not been fetched yet. An icon has no text metrics
   * of its own, so this is the one place on the page that genuinely wants a
   * `SkeletonBlock` — sized with the SAME `h-5 w-5` string the real icons
   * carry, not a re-invented approximation.
   */
  const getStatusIcon = (status: string | undefined) => {
    if (status === undefined)
      return <SkeletonBlock className="h-5 w-5 rounded-full" />;
    switch (status) {
      case "healthy":
      case "connected":
      case "ok":
      case "up":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "degraded":
      case "slow":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  // Hue comes from the one status table; the label stays the raw upper-cased
  // value the backend sent. While pending, the CHIP is chrome and only the word
  // inside it waits — `status` stays undefined so the tone resolves neutral
  // rather than flashing a colour that would read as a verdict.
  const getStatusBadge = (status: string | undefined) => (
    <StatusBadge
      status={status}
      label={
        <Loadable loading={status === undefined} placeholder="HEALTHY">
          {status?.toUpperCase()}
        </Loadable>
      }
    />
  );

  /*
    PENDING AND EMPTY ARE DIFFERENT STATES, AND SO ARE FIRST-LOAD AND REFRESH.
    ==========================================================================
    This page used to do BOTH halves of the anti-pattern at once. It opened
    with `if (isLoading && !health) return <min-h-screen spinner/>` — a
    full-viewport bail-out that discarded the hero, three service cards and two
    metric panels, about 1,100px of chrome that was knowable before the request
    was even sent — and then, having survived that, wrapped its entire body in
    `{health && (...)}`, so the container was still empty on the way in and grew
    to full height in one frame when the payload landed.

    Both are gone. The layout renders once; only the figures wait.

    `pending` is FIRST LOAD ONLY. This dashboard polls itself every 30 seconds,
    and `isLoading` goes true on every one of those polls — keying the
    placeholders off it would strobe every number on the page twice a minute
    while a perfectly good previous reading was already on screen. The last
    known value stays put and is replaced in place.
  */
  const pending = isLoading && !health;
  const RefreshIcon = isLoading ? Loader2 : RefreshCw;
  const metrics = health?.metrics;
  /* `metrics` is undefined exactly while pending (`transformHealthResponse`
     fills every field), so these ?? 0 defaults only ever feed the Progress
     bars, whose height is fixed either way. The FIGURES beside them go through
     `<Loadable>` instead of rendering a zero that would read as real data. */
  const totalTrades24h = metrics?.totalTrades24h ?? 0;
  const executedTrades24h = metrics?.executedTrades24h ?? 0;
  const successRate =
    totalTrades24h > 0 ? (executedTrades24h / totalTrades24h) * 100 : 0;

  return (
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "System Health",
        }}
        title={t("system_health")}
        description={t("monitor_copy_trading_system_status_and_metrics")}
        layout="split"
        rightContent={
          <div className="flex items-center gap-4">
            {/* The LABEL is knowable before the first response; only the clock
                reading is not. Gating the whole span on `lastRefresh` made this
                row appear from nothing and re-rag the two buttons beside it. */}
            <span className="text-sm text-subtle-foreground">
              {tCommon("last_updated")}:{" "}
              <Loadable loading={!lastRefresh} placeholder="12:00:00 AM">
                {lastRefresh?.toLocaleTimeString()}
              </Loadable>
            </span>
            {/* One icon element rather than a two-branch swap: both glyphs are
                `h-4 w-4`, but nothing was keeping them that way, and this
                button re-enters its spinning state every 30s on the poll. */}
            <Button onClick={fetchHealth} disabled={isLoading}>
              <RefreshIcon
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
              <span className="ml-2">Refresh</span>
            </Button>
            <Link href="/admin/copy-trading">
              <Button
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary-ink"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {tCommon("back_to_dashboard")}
              </Button>
            </Link>
          </div>
        }
      />

      <div className="container mx-auto py-8 space-y-6">
        {/* Overall Status */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(health?.status)}
                <div>
                  <h2 className="text-xs font-medium text-muted-foreground">
                    {t("overall_status")}
                  </h2>
                  <p className="text-[11px] text-subtle-foreground">
                    {t("system_is")}{" "}
                    <Loadable loading={pending} placeholder="healthy">
                      {health?.status}
                    </Loadable>
                  </p>
                </div>
              </div>
              {getStatusBadge(health?.status)}
            </div>
          </CardContent>
        </Card>

        {/* Alerts.
            This one stays conditional, and that is not the same defect: an
            alerts panel is gated on there BEING alerts, which is a property of
            the data and not of the request. Reserving a card for a list that is
            empty 99% of the time would be inventing chrome, not preserving it. */}
        {health?.alerts && health.alerts.length > 0 && (
          <Card className="mb-6 border-warning/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                {t("active_alerts")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {health.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    alert.level === "error"
                      ? "bg-destructive/5 text-destructive-ink"
                      : "bg-warning/5 text-warning-ink"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span>{alert.message}</span>
                    <span className="text-xs opacity-70">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Services Status — only real signals the backend reports:
            database connectivity, the copy engine, and the queue depth.

            `health?.services?.database` is undefined EXACTLY while pending:
            `transformHealthResponse` always writes a string (falling back to
            "unknown"), so dropping the `|| "unknown"` here loses no case and
            buys the helpers the one signal they need to tell "not fetched" from
            "fetched and broken". */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Database</span>
                </div>
                {getStatusIcon(health?.services?.database)}
              </div>
              <div className="text-[11px] text-subtle-foreground">
                {getStatusBadge(health?.services?.database)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{t("copy_engine")}</span>
                </div>
                {getStatusIcon(health?.services?.copyTradingEngine)}
              </div>
              <div className="text-[11px] text-subtle-foreground">
                {t("latency")}:{" "}
                <span className="font-mono tabular-nums">
                  <Loadable loading={pending} placeholder="120">
                    {metrics?.avgLatencyMs ?? 0}
                  </Loadable>
                  ms
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Queue</span>
                </div>
                {/* Pending queue depth is UNKNOWN, not zero. The old expression
                    read `pendingTrades === 0 ? "ok" : "degraded"` against an
                    undefined metric, which resolved to "degraded" — an amber
                    warning triangle on a queue nobody had measured yet. */}
                {getStatusIcon(
                  metrics ? (metrics.pendingTrades === 0 ? "ok" : "degraded") : undefined
                )}
              </div>
              <div className="text-[11px] text-subtle-foreground">
                {tCommon("pending")}:{" "}
                <span className="font-mono tabular-nums">
                  <Loadable loading={pending} placeholder="12">
                    {metrics?.pendingTrades ?? 0}
                  </Loadable>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("activity_metrics")}</CardTitle>
              <CardDescription>
                {t("current_system_activity")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-subtle-foreground" />
                  <span>{tExt("active_leaders")}</span>
                </div>
                <span className="font-semibold font-mono tabular-nums">
                  <Loadable loading={pending} placeholder="1,234">
                    {metrics?.activeLeaders ?? 0}
                  </Loadable>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-subtle-foreground" />
                  <span>{tExt("active_subscriptions")}</span>
                </div>
                <span className="font-semibold font-mono tabular-nums">
                  <Loadable loading={pending} placeholder="1,234">
                    {metrics?.activeSubscriptions ?? 0}
                  </Loadable>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-subtle-foreground" />
                  <span>{tExt("pending_trades")}</span>
                </div>
                <span className="font-semibold font-mono tabular-nums">
                  <Loadable loading={pending} placeholder="1,234">
                    {metrics?.pendingTrades ?? 0}
                  </Loadable>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-subtle-foreground" />
                  {/* An ICU placeholder was being printed at an operator:
                      the literal string "({completedTradesCount} trades)",
                      left behind when a `t(...)` call became a plain string.
                      The count is rendered on the right of this row already,
                      so the label only has to name the row — and it is built
                      from keys that exist in every locale rather than a new
                      one, which would render as its own key everywhere but
                      English. */}
                  <span>{`24h ${tCommon("trades")}`}</span>
                </div>
                <span className="font-semibold font-mono tabular-nums">
                  <Loadable loading={pending} placeholder="1,234">
                    {totalTrades24h}
                  </Loadable>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-subtle-foreground" />
                  <span>{`24h ${tCommon('executed')}`}</span>
                </div>
                <span className="font-semibold font-mono tabular-nums">
                  <Loadable loading={pending} placeholder="1,234">
                    {executedTrades24h}
                  </Loadable>
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tCommon("performance_metrics")}</CardTitle>
              <CardDescription>
                {t("system_performance_indicators")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">{t("trade_success_rate")}</span>
                  <span className="font-semibold font-mono tabular-nums">
                    <Loadable loading={pending} placeholder="100.0">
                      {successRate.toFixed(1)}
                    </Loadable>
                    %
                  </span>
                </div>
                {/* The bar is chrome with a fixed height — it renders empty
                    while pending and fills in place, which moves nothing. */}
                <Progress value={successRate} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">{t("error_rate")}</span>
                  <span className="font-semibold font-mono tabular-nums text-destructive">
                    <Loadable loading={pending} placeholder="0.00">
                      {(metrics?.failureRate ?? 0).toFixed(2)}
                    </Loadable>
                    %
                  </span>
                </div>
                <Progress
                  value={metrics?.failureRate ?? 0}
                  className="[&>div]:bg-destructive"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-subtle-foreground" />
                  <span>{t("avg_trade_latency")}</span>
                </div>
                <span className="font-semibold font-mono tabular-nums">
                  <Loadable loading={pending} placeholder="120">
                    {metrics?.avgLatencyMs ?? 0}
                  </Loadable>
                  ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-subtle-foreground" />
                  <span>{t("p95_latency")}</span>
                </div>
                <span className="font-semibold font-mono tabular-nums">
                  <Loadable loading={pending} placeholder="120">
                    {metrics?.p95LatencyMs ?? 0}
                  </Loadable>
                  ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-subtle-foreground" />
                  <span>{t("p99_latency")}</span>
                </div>
                <span className="font-semibold font-mono tabular-nums">
                  <Loadable loading={pending} placeholder="120">
                    {metrics?.p99LatencyMs ?? 0}
                  </Loadable>
                  ms
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
