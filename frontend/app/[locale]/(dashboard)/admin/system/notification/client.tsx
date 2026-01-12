"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bell, Activity, Settings, TestTube, Database, TrendingUp, Smartphone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import { DashboardOverview } from "./components/dashboard-overview";
import { HealthMonitor } from "./components/health-monitor";
import { ChannelTester } from "./components/channel-tester";
import { QueueManager } from "./components/queue-manager";
import { MetricsPanel } from "./components/metrics-panel";
import { SettingsPanel } from "./components/settings-panel";
import { PwaManager } from "./components/pwa-manager";

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
        setError(error.message || "Failed to fetch dashboard data");
      } else {
        setDashboardData(data);
        setError(null);
      }
    } catch (err) {
      setError("An unexpected error occurred");
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
        return "text-green-500";
      case "degraded":
        return "text-yellow-500";
      case "unhealthy":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Healthy</Badge>;
      case "degraded":
        return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Degraded</Badge>;
      case "unhealthy":
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <Bell className="h-12 w-12 animate-pulse text-primary mx-auto" />
          <p className="text-muted-foreground">Loading notification service...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className={`container ${PAGE_PADDING} space-y-6`}>
      {/* Header */}
      <motion.div
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
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Notification Service
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Multi-channel notification management & monitoring
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {dashboardData && getStatusBadge(dashboardData.status)}
            <Badge variant="outline" className="gap-2">
              <Activity className="h-3 w-3" />
              {dashboardData?.channels.total || 0} Channels
            </Badge>
            <Link href="/admin/system/notification/template">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

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
          <DashboardOverview data={dashboardData} onRefresh={fetchDashboard} />
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
    </div>
  );
}
