"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Zap,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { HeroSection } from "@/components/ui/hero-section";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
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

      setHealth(data);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
      case "ok":
      case "up":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "degraded":
      case "slow":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      healthy: "bg-green-100 text-green-700",
      degraded: "bg-yellow-100 text-yellow-700",
      unhealthy: "bg-red-100 text-red-700",
      connected: "bg-green-100 text-green-700",
      ok: "bg-green-100 text-green-700",
      up: "bg-green-100 text-green-700",
      slow: "bg-yellow-100 text-yellow-700",
      disconnected: "bg-red-100 text-red-700",
      error: "bg-red-100 text-red-700",
    };
    return (
      <Badge className={colors[status] || "bg-gray-100"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading && !health) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "System Health",
          gradient: "from-indigo-500/20 via-violet-500/20 to-indigo-500/20",
          iconColor: "text-indigo-500",
          textColor: "text-indigo-600 dark:text-indigo-400",
        }}
        title={[
          { text: "System " },
          {
            text: "Health",
            gradient: "from-indigo-600 via-violet-500 to-indigo-600 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400",
          },
        ]}
        description={t("monitor_copy_trading_system_status_and_metrics")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        background={{
          orbs: [
            {
              color: "#6366f1",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#8b5cf6",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#6366f1", "#8b5cf6"],
          size: 8,
        }}
        rightContent={
          <div className="flex items-center gap-4">
            {lastRefresh && (
              <span className="text-sm text-zinc-500">
                {tCommon("last_updated")}: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button onClick={fetchHealth} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
            <Link href="/admin/copy-trading">
              <Button
                variant="outline"
                className="border-indigo-500/50 text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {tCommon("back_to_dashboard")}
              </Button>
            </Link>
          </div>
        }
      />

      <div className="container mx-auto py-8 space-y-6">
        {health && (
          <>
            {/* Overall Status */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(health.status)}
                    <div>
                      <h2 className="text-xl font-semibold">
                        {t("overall_status")}
                      </h2>
                      <p className="text-sm text-zinc-500">
                        {t("system_is")} {health.status}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(health.status)}
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            {health.alerts && health.alerts.length > 0 && (
              <Card className="mb-6 border-yellow-200 dark:border-yellow-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-5 w-5" />
                    {t("active_alerts")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {health.alerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${
                        alert.level === "error"
                          ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                          : "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"
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

            {/* Services Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-zinc-500" />
                      <span className="font-medium">Database</span>
                    </div>
                    {getStatusIcon(health.services?.database || "unknown")}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {t("latency")}: {health.metrics?.avgLatencyMs || 0}ms
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-zinc-500" />
                      <span className="font-medium">Exchange</span>
                    </div>
                    {getStatusIcon(health.services?.copyTradingEngine || "unknown")}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {t("latency")}: {health.metrics?.avgLatencyMs || 0}ms
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-zinc-500" />
                      <span className="font-medium">WebSocket</span>
                    </div>
                    {getStatusIcon(health.services?.copyTradingEngine || "unknown")}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {tExt("connections")}: 0
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-zinc-500" />
                      <span className="font-medium">Queue</span>
                    </div>
                    {getStatusIcon(health.metrics?.pendingTrades === 0 ? "ok" : "degraded")}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {tCommon("pending")}: {health.metrics?.pendingTrades || 0}
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
                      <Users className="h-4 w-4 text-zinc-500" />
                      <span>{t("active_leaders")}</span>
                    </div>
                    <span className="font-semibold">
                      {health.metrics?.activeLeaders || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-500" />
                      <span>{t("active_subscriptions")}</span>
                    </div>
                    <span className="font-semibold">
                      {health.metrics?.activeSubscriptions || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-zinc-500" />
                      <span>{tExt("pending_trades")}</span>
                    </div>
                    <span className="font-semibold">
                      {health.metrics?.pendingTrades || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-zinc-500" />
                      <span>{`24h ${tCommon("trades")}`}</span>
                    </div>
                    <span className="font-semibold">
                      {health.metrics?.totalTrades24h || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-zinc-500" />
                      <span>{`24h ${tCommon("volume")}`}</span>
                    </div>
                    <span className="font-semibold">
                      $0
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{tExt("performance_metrics")}</CardTitle>
                  <CardDescription>
                    {t("system_performance_indicators")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">{t("trade_success_rate")}</span>
                      <span className="font-semibold">
                        {health.metrics?.totalTrades24h > 0
                          ? ((health.metrics?.executedTrades24h || 0) / health.metrics?.totalTrades24h * 100).toFixed(1)
                          : "0.0"}%
                      </span>
                    </div>
                    <Progress value={health.metrics?.totalTrades24h > 0
                      ? ((health.metrics?.executedTrades24h || 0) / health.metrics?.totalTrades24h * 100)
                      : 0} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">{t("error_rate")}</span>
                      <span className="font-semibold text-red-600">
                        {(health.metrics?.failureRate || 0).toFixed(2)}%
                      </span>
                    </div>
                    <Progress
                      value={health.metrics?.failureRate || 0}
                      className="[&>div]:bg-red-500"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-zinc-500" />
                      <span>{t("avg_trade_latency")}</span>
                    </div>
                    <span className="font-semibold">
                      {health.metrics?.avgLatencyMs || 0}ms
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
