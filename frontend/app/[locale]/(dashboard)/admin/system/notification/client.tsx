"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import { m } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bell, Activity, Settings, TestTube, Database, TrendingUp, Smartphone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { PageShell } from "@/components/layout/page-shell";
import { Loadable } from "@/components/ui/skeleton";
import { DashboardOverview } from "./components/dashboard-overview";
import { HealthMonitor } from "./components/health-monitor";
import { ChannelTester } from "./components/channel-tester";
import { QueueManager } from "./components/queue-manager";
import { MetricsPanel } from "./components/metrics-panel";
import { SettingsPanel } from "./components/settings-panel";
import { PwaManager } from "./components/pwa-manager";
import { useTranslations } from "next-intl";

interface DashboardData {
  status: string;
  timestamp: string;
  health: {
    overall: string;
    redis: boolean;
    channels: string[];
  };
  metrics: {
    totalSent: number;
    totalFailed: number;
    successRate: string;
    cacheHitRate: string;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  channels: {
    available: string[];
    total: number;
  };
  uptime: number;
}

export function NotificationServiceClient() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get tab from URL or default to overview
  const tabFromUrl = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Sync with URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "overview";
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/notification",
        silent: true,
      });

      if (error) {
        setError(error || t("failed_to_fetch_dashboard_data"));
      } else {
        setDashboardData(data);
        setError(null);
      }
    } catch (err) {
      setError(tCommon("unexpected_error"));
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
        return <Badge className="bg-success/10 text-success-ink hover:bg-success/15">Healthy</Badge>;
      case "degraded":
        return <Badge className="bg-warning/10 text-warning-ink hover:bg-warning/15">Degraded</Badge>;
      case "unhealthy":
        return <Badge className="bg-destructive/10 text-destructive-ink hover:bg-destructive/15">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  /**
   * ONE PAGE, BOTH STATES.
   * ==========================================================================
   *
   * Two full-height swaps were removed from here:
   *
   *   if (isLoading && !dashboardData) return <div className="h-[calc(100vh-4rem)]"> … pulsing Bell …
   *   if (error && !dashboardData)     return <div className="h-[calc(100vh-4rem)]"> … Error card …
   *
   * `h-[calc(100vh-4rem)]` is the whole content column below the admin header,
   * so both of them were the page being replaced rather than filled. What they
   * replaced is almost entirely static: the title block, the Templates link,
   * and a SEVEN-tab `TabsList` whose labels and icons are literals in this
   * file. The tab bar in particular is the thing an operator aims at, and it
   * arrived last.
   *
   * The error is now a banner ABOVE the tabs instead of a page. That is not
   * cosmetic: this dashboard re-polls every 30 seconds, so a single failed
   * poll used to blow the whole screen away mid-session — including whichever
   * tab the operator was working in — and then restore it 30 seconds later.
   * As a banner it reports the failure and costs nothing else.
   *
   * `hasFailed` is a named boolean because it is the pair of `isLoading`, and
   * the point of this change is that the two are different states.
   */
  const hasFailed = !isLoading && Boolean(error) && !dashboardData;

  /**
   * The FIRST load, as opposed to any of the 30-second re-polls.
   *
   * `fetchDashboard` sets `isLoading` on every poll, which was harmless while
   * the pending state was a page-level bail-out guarded by `&& !dashboardData`.
   * Now that `isLoading` reaches individual VALUES it is not: driving the
   * placeholders off it directly would blank every figure on the page for the
   * duration of each refresh, twice a minute, which is a worse flicker than
   * the one being fixed. A value that is already on screen stays on screen and
   * simply updates.
   */
  const pending = isLoading && !dashboardData;

  return (
    <PageShell rhythm="md">
      {/* Header */}
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {t("notification_service")}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("multi_channel_notification_management_monitoring")}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* The status chip renders in BOTH states. Gated on `dashboardData`
                it was absent and then present, which re-flowed the whole
                right-hand action group sideways every 30 seconds on a slow
                poll — and the chip is the first thing an operator looks at. */}
            {dashboardData ? (
              getStatusBadge(dashboardData.status)
            ) : (
              <Badge variant="outline">
                <Loadable loading={pending} placeholder="Healthy">
                  {hasFailed ? tCommon("unknown") : null}
                </Loadable>
              </Badge>
            )}
            <Badge variant="outline" className="gap-2">
              <Activity className="h-3 w-3" />
              <Loadable loading={pending} placeholder="0">
                {dashboardData?.channels.total || 0}
              </Loadable>{" "}
              Channels
            </Badge>
            <Link href="/admin/system/notification/template">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </Link>
          </div>
        </div>
      </m.div>

      {/* A failed poll, reported without taking the page away. See `hasFailed`. */}
      {hasFailed && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive text-base">
              {t("could_not_reach_the_notification_service")}
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Health</span>
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <TestTube className="h-4 w-4" />
            <span className="hidden sm:inline">Testing</span>
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Queue</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="pwa" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">PWA</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <DashboardOverview data={dashboardData} onRefresh={fetchDashboard} loading={pending} />
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <HealthMonitor data={dashboardData} onRefresh={fetchDashboard} />
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <ChannelTester />
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <QueueManager onRefresh={fetchDashboard} />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <MetricsPanel />
        </TabsContent>

        <TabsContent value="pwa" className="space-y-6">
          <PwaManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
