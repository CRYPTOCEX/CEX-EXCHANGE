"use client";

import { m } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Mail,
  MessageSquare,
  Smartphone,
  Inbox
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Loadable } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface DashboardOverviewProps {
  data: any;
  /**
   * The dashboard poll is in flight.
   *
   * Separate from `data == null` on purpose. This component used to open with
   * `if (!data) return null`, which meant the entire Overview tab - four KPI
   * cards, two feature cards and a four-up queue row, roughly 900px of layout -
   * did not exist until the fetch landed and then appeared all at once. The
   * page above it kept its `Tabs` shell, so what the operator saw was a tab
   * bar sitting on an empty page, then the page snapping to full height.
   *
   * `data` is also null when the fetch FAILED, and that case still renders the
   * chrome (with em-dashes for the figures) rather than a blank tab, so the
   * refresh button stays reachable.
   */
  loading?: boolean;
  onRefresh: () => void;
}

export function DashboardOverview({ data, onRefresh, loading = false }: DashboardOverviewProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  /* NaN and not 0: a success rate that has not arrived is unknown, not zero,
     and 0 would paint the progress bar at the bottom of its range before
     settling at ~99%. `Number.isFinite` below picks the em-dash for the figure
     while the bar renders at zero width, which reads as "no answer yet"
     instead of "catastrophe". */
  const successRate = parseFloat(data?.metrics?.successRate ?? "");
  const cacheHitRate = parseFloat(data?.metrics?.cacheHitRate ?? "");
  const queue = data?.queue;
  const totalJobs = queue
    ? queue.waiting + queue.active + queue.completed + queue.failed
    : undefined;

  const pct = (n: number) => (Number.isFinite(n) ? n.toFixed(1) + "%" : "—");
  const bar = (n: number) => (Number.isFinite(n) ? n : 0);

  const stats = [
    {
      label: t("total_sent"),
      value: data?.metrics?.totalSent,
      icon: CheckCircle2,
      ...statsCardColors.green,
      change: "+12.5",
      changeLabel: "vs last period",
      isPercent: true,
    },
    {
      label: t("total_failed"),
      value: data?.metrics?.totalFailed,
      icon: XCircle,
      ...statsCardColors.red,
      change: "-2.3",
      changeLabel: "improvement",
      isPercent: true,
    },
    {
      label: t("queue_jobs"),
      value: totalJobs,
      icon: Clock,
      ...statsCardColors.blue,
      change: queue?.waiting,
      changeLabel: "waiting",
    },
    {
      label: tCommon("success_rate"),
      value: pct(successRate),
      icon: TrendingUp,
      ...statsCardColors.purple,
      change: "Last 24h",
    },
  ];

  const channels = [
    {
      name: "In-App",
      icon: Inbox,
      enabled: data?.channels?.available?.includes("IN_APP") ?? false,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      name: "Email",
      icon: Mail,
      enabled: data?.channels?.available?.includes("EMAIL") ?? false,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      name: "SMS",
      icon: MessageSquare,
      enabled: data?.channels?.available?.includes("SMS") ?? false,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      name: "Push",
      icon: Smartphone,
      enabled: data?.channels?.available?.includes("PUSH") ?? false,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* `loading` goes INTO the card. StatsCard already renders its own
            shell - border, label, icon tile, delta row - with a measured
            placeholder where the figure goes, so the grid never changes
            height. Swapping the grid for grey rectangles, or for nothing at
            all, is what this file used to do. */}
        {stats.map((stat, index) => (
          <StatsCard key={stat.label} {...stat} index={index} loading={loading} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Channels Status */}
        <m.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{tCommon("notification_channels")}</CardTitle>
                  <CardDescription>{t("available_communication_channels")}</CardDescription>
                </div>
                <Badge variant="outline">
                  <Loadable loading={loading} placeholder="0">
                    {data?.channels?.total ?? "—"}
                  </Loadable>{" "}
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {channels.map((channel) => (
                <div
                  key={channel.name}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${channel.bgColor}`}>
                      <channel.icon className={`h-5 w-5 ${channel.color}`} />
                    </div>
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      {/*
                        "Inactive" / "Disabled" is a VERDICT about a channel,
                        and `data?.channels?.available?.includes(...) ?? false`
                        returns false for a payload that has not arrived — so
                        with the old `if (!data) return null` removed, all four
                        channels would have been reported DEAD for the length
                        of every poll. The pending state has to say "not known
                        yet", which is what the placeholder does; the failed
                        state says so with an em-dash rather than guessing.
                      */}
                      <p className="text-xs text-muted-foreground">
                        <Loadable loading={loading} placeholder="Active">
                          {data
                            ? channel.enabled
                              ? tCommon("active")
                              : tCommon("inactive")
                            : "—"}
                        </Loadable>
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={!loading && data && !channel.enabled ? "secondary" : "default"}
                    className={
                      loading || (data && channel.enabled)
                        ? "bg-success/10 text-success-ink hover:bg-success/15"
                        : ""
                    }
                  >
                    <Loadable loading={loading} placeholder="Enabled">
                      {data
                        ? channel.enabled
                          ? tCommon("enabled")
                          : tCommon("disabled")
                        : tCommon("unknown")}
                    </Loadable>
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </m.div>

        {/* Performance Metrics */}
        <m.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{tCommon("performance_metrics")}</CardTitle>
                  <CardDescription>{t("service_health_indicators")}</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Success Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{tCommon("success_rate")}</span>
                  <span className="text-muted-foreground">
                    <Loadable loading={loading} placeholder="00.0%">
                      {pct(successRate)}
                    </Loadable>
                  </span>
                </div>
                <Progress value={bar(successRate)} className="h-2" />
              </div>

              {/* Cache Hit Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t("cache_hit_rate")}</span>
                  <span className="text-muted-foreground">
                    <Loadable loading={loading} placeholder="00.0%">
                      {pct(cacheHitRate)}
                    </Loadable>
                  </span>
                </div>
                <Progress value={bar(cacheHitRate)} className="h-2" />
              </div>

              {/* Uptime */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Uptime</span>
                </div>
                <Badge variant="outline">
                  <Loadable loading={loading} placeholder="00d 00h">
                    {typeof data?.uptime === "number" ? formatUptime(data.uptime) : "—"}
                  </Loadable>
                </Badge>
              </div>

              {/* Redis Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("redis_cache")}</span>
                </div>
                {/* `variant`/`className` key off `loading` FIRST, or a
                    service whose health has not arrived is painted as a DOWN
                    Redis in destructive red for the length of the request. */}
                <Badge
                  variant={!loading && data && !data.health?.redis ? "destructive" : "default"}
                  className={
                    loading || !data || data.health?.redis
                      ? "bg-success/10 text-success-ink hover:bg-success/15"
                      : ""
                  }
                >
                  <Loadable loading={loading} placeholder="Connected">
                    {data
                      ? data.health?.redis
                        ? tCommon("connected")
                        : t("disconnected")
                      : tCommon("unknown")}
                  </Loadable>
                </Badge>
              </div>
            </CardContent>
          </Card>
        </m.div>
      </div>

      {/* Queue Overview */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("queue_status")}</CardTitle>
            <CardDescription>{t("current_notification_queue_statistics")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg border">
                <p className="font-mono tabular-nums text-2xl font-semibold leading-tight tracking-tight text-foreground">
                  <Loadable loading={loading} placeholder="000">
                    {queue?.waiting ?? "—"}
                  </Loadable>
                </p>
                <p className="text-xs font-medium text-muted-foreground mt-1">Waiting</p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <p className="font-mono tabular-nums text-2xl font-semibold leading-tight tracking-tight text-foreground">
                  <Loadable loading={loading} placeholder="000">
                    {queue?.active ?? "—"}
                  </Loadable>
                </p>
                <p className="text-xs font-medium text-muted-foreground mt-1">Active</p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <p className="font-mono tabular-nums text-2xl font-semibold leading-tight tracking-tight text-foreground">
                  <Loadable loading={loading} placeholder="000">
                    {queue?.completed ?? "—"}
                  </Loadable>
                </p>
                <p className="text-xs font-medium text-muted-foreground mt-1">Completed</p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <p className="font-mono tabular-nums text-2xl font-semibold leading-tight tracking-tight text-foreground">
                  <Loadable loading={loading} placeholder="000">
                    {queue?.failed ?? "—"}
                  </Loadable>
                </p>
                <p className="text-xs font-medium text-muted-foreground mt-1">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </m.div>
    </div>
  );
}
