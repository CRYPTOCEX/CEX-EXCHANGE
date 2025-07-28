"use client";

import { useCronStore } from "@/store/cron";
import { useState, useEffect } from "react";
import { CronCard } from "./components/cron-card";
import { ConnectionStatus } from "./components/connection-status";
import { TimelineView } from "./components/timeline-view";
import { SearchBar } from "./components/search-bar";
import { StatusTabs } from "./components/status-tabs";
import { CronDetailModal } from "./components/cron-detail-modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

// Import the WebSocket manager and helper from your store
import { handleWebSocketMessage } from "@/store/cron";
import { $fetch } from "@/lib/api";
import WebSocketManager from "@/utils/ws";
import { CronHealth } from "./components/health";
import { useTranslations } from "next-intl";

export default function HomePage() {
  return <CronManagementClient />;
}

export function CronManagementClient() {
  const t = useTranslations("dashboard");
  // Get state from store
  const {
    cronJobs,
    getFilteredJobs,
    isConnected: storeConnected,
  } = useCronStore();

  // Local state
  const [selectedCronName, setSelectedCronName] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(true);

  // Get filtered jobs
  const filteredJobs = getFilteredJobs();

  // Update current time
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Set loading state
  useEffect(() => {
    if (storeConnected && cronJobs.length > 0) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    } else if (!storeConnected) {
      setIsLoading(true);
    }
  }, [storeConnected, cronJobs.length]);

  async function fetchInitialCrons() {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/cron",
        silent: true,
      });
      if (!error) {
        useCronStore.getState().setCronJobs(data);
      }
    } catch (err) {
      console.error("Error fetching initial cron jobs:", err);
      setError("Error fetching initial cron jobs");
    }
    setIsLoading(false);
  }

  // Setup initial fetch and WebSocket connection
  useEffect(() => {
    // 1. Fetch the initial list of cron jobs
    fetchInitialCrons();

    // 2. Initialize the WebSocket connection
    const wsManager = new WebSocketManager("/api/admin/system/cron");

    wsManager.on("open", () => {
      useCronStore.getState().setIsConnected(true);
      wsManager.send({ action: "SUBSCRIBE", payload: {} });
    });
    wsManager.on("close", () => {
      useCronStore.getState().setIsConnected(false);
    });
    wsManager.on("message", (message: any) => {
      // Process incoming messages through your handler
      handleWebSocketMessage(message);
    });

    wsManager.connect();

    // Cleanup on unmount
    return () => {
      wsManager.disconnect();
    };
  }, []);

  // Handle cron card click
  const handleCronCardClick = (cronName: string) => {
    setSelectedCronName(cronName);
    setIsModalOpen(true);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setViewMode(value as "grid" | "list");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            {t("cron_management")}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              {t("real-time_cron_job_monitoring_dashboard")}
            </p>
            <span className="text-xs text-muted-foreground">
              {currentTime ? currentTime.toLocaleTimeString() : ""}
            </span>
          </div>
        </div>
        <ConnectionStatus />
      </motion.div>

      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">{t("error")}</strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div>
            <CronHealth />
          </div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{t("Timeline")}</CardTitle>
                <CardDescription>{t("recent_cron_job_events")}</CardDescription>
              </CardHeader>
              <CardContent>
                <TimelineView />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          className="lg:col-span-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between mb-4">
                <CardTitle>{t("cron_jobs")}</CardTitle>
                <SearchBar />
              </div>
              <StatusTabs />
            </CardHeader>
            <CardContent className="p-4">
              <Tabs
                defaultValue="grid"
                className="mb-4"
                onValueChange={handleTabChange}
              >
                <TabsList className="mb-2">
                  <TabsTrigger value="grid">{t("grid_view")}</TabsTrigger>
                  <TabsTrigger value="list">{t("list_view")}</TabsTrigger>
                </TabsList>

                <TabsContent value="grid">
                  {viewMode === "grid" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredJobs.length > 0 ? (
                        filteredJobs.map((cron) => (
                          <CronCard
                            key={cron.name}
                            cron={cron}
                            onClick={() => handleCronCardClick(cron.name)}
                          />
                        ))
                      ) : (
                        <div className="col-span-full text-center p-8 border rounded-md">
                          <p className="text-muted-foreground">
                            {isLoading
                              ? "Loading cron jobs..."
                              : cronJobs.length === 0
                                ? "No cron jobs available. Please check your connection."
                                : "No cron jobs found with the selected filters."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="list">
                  {viewMode === "list" && (
                    <div className="border rounded-md overflow-hidden">
                      <div className="grid grid-cols-12 gap-4 p-3 bg-muted font-medium text-sm">
                        <div className="col-span-4">{t("Name")}</div>
                        <div className="col-span-2">{t("Status")}</div>
                        <div className="col-span-2">{t("Category")}</div>
                        <div className="col-span-2">{t("Period")}</div>
                        <div className="col-span-2">{t("last_run")}</div>
                      </div>

                      <div className="h-[600px] overflow-auto">
                        <div className="pr-4">
                          {filteredJobs.length > 0 ? (
                            filteredJobs.slice(0, 100).map((cron, index) => (
                              <div
                                key={cron.name}
                                className={`grid grid-cols-12 gap-4 p-3 items-center text-sm border-b cursor-pointer hover:bg-muted/50 ${
                                  index % 2 === 0
                                    ? "bg-background"
                                    : "bg-muted/20"
                                }`}
                                onClick={() => handleCronCardClick(cron.name)}
                              >
                                <div className="col-span-4 font-medium truncate">
                                  {cron.title}
                                </div>
                                <div className="col-span-2">
                                  <Badge
                                    variant="outline"
                                    className={`capitalize rounded-full ${
                                      cron.status === "running"
                                        ? "border-blue-500 text-blue-500"
                                        : cron.status === "completed"
                                          ? "border-green-500 text-green-500"
                                          : cron.status === "failed"
                                            ? "border-red-500 text-red-500"
                                            : "border-slate-400 text-slate-400"
                                    }`}
                                  >
                                    {cron.status === "running" && (
                                      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500 status-pulse"></span>
                                    )}
                                    {cron.status || "idle"}
                                  </Badge>
                                </div>
                                <div className="col-span-2 capitalize">
                                  {(cron.category || "normal").replace(
                                    "_",
                                    " "
                                  )}
                                </div>
                                <div className="col-span-2">
                                  {formatPeriod(cron.period || 0)}
                                </div>
                                <div className="col-span-2 text-muted-foreground">
                                  {cron.lastRun instanceof Date
                                    ? formatDistanceToNow(cron.lastRun, {
                                        addSuffix: true,
                                      })
                                    : "Never"}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center p-8">
                              <p className="text-muted-foreground">
                                {isLoading
                                  ? "Loading cron jobs..."
                                  : cronJobs.length === 0
                                    ? "No cron jobs available. Please check your connection."
                                    : "No cron jobs found with the selected filters."}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <CronDetailModal
        cronName={selectedCronName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

// Helper function for formatting period
function formatPeriod(ms: number) {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
