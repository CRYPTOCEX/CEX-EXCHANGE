"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DashboardHeader } from "./components/dashboard-header";
import { StatsOverview } from "./components/stats-overview";
import { SearchFilters } from "./components/search-filters";
import { ActiveTradesTab } from "./components/active-trades-tab";
import { PendingTradesTab } from "./components/pending-trades-tab";
import { CompletedTradesTab } from "./components/completed-trades-tab";
import { DisputedTradesTab } from "./components/disputed-trades-tab";
import { RecentActivity } from "./components/recent-activity";
import { SafetyTips } from "./components/safety-tips";
import { LoadingSkeleton } from "./components/loading-skeleton";
import { ErrorDisplay } from "./components/error-display";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

export default function TradeDashboardClient() {
  const t = useTranslations("ext");
  const {
    tradeDashboardData,
    isLoadingTradeDashboardData,
    tradeDashboardDataError,
    fetchTradeDashboardData,
  } = useP2PStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    // Only runs on client, not SSR
    setCurrentTime(new Date().toLocaleTimeString());
    // Optional: live updating every second
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchTradeDashboardData();
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      await fetchTradeDashboardData();
      toast({
        title: "Success",
        description: "Dashboard data refreshed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Loading state
  if (isLoadingTradeDashboardData && !tradeDashboardData) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (tradeDashboardDataError && !tradeDashboardData) {
    return (
      <ErrorDisplay
        error={tradeDashboardDataError}
        onRetry={handleRefresh}
        isRetrying={isRefreshing}
      />
    );
  }

  // If we have data, render the dashboard
  const {
    tradeStats,
    recentActivity,
    activeTrades,
    completedTrades,
    disputedTrades,
  } = tradeDashboardData || {
    tradeStats: {},
    recentActivity: [],
    activeTrades: [],
    completedTrades: [],
    disputedTrades: [],
  };

  return (
    <div className="flex min-h-screen w-full flex-col container">
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        {/* Header Section */}
        <DashboardHeader
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />

        {/* Stats Overview */}
        <StatsOverview
          tradeStats={tradeStats}
          activeTrades={activeTrades}
          completedTrades={completedTrades}
        />

        {/* Search and Filter Section */}
        <SearchFilters />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trades Section */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="active">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="active">
                  {t("Active")}
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {activeTrades?.length || 0}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="pending">{t("Pending")}</TabsTrigger>
                <TabsTrigger value="completed">{t("Completed")}</TabsTrigger>
                <TabsTrigger value="disputed">
                  {t("Disputed")}
                  {disputedTrades && disputedTrades.length > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                      {disputedTrades.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4 space-y-4">
                <ActiveTradesTab
                  activeTrades={activeTrades}
                  currentTime={currentTime}
                />
              </TabsContent>

              <TabsContent value="pending" className="mt-4 space-y-4">
                <PendingTradesTab />
              </TabsContent>

              <TabsContent value="completed" className="mt-4 space-y-4">
                <CompletedTradesTab completedTrades={completedTrades} />
              </TabsContent>

              <TabsContent value="disputed" className="mt-4 space-y-4">
                <DisputedTradesTab disputedTrades={disputedTrades} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <RecentActivity recentActivity={recentActivity} />

            {/* Trading Tips */}
            <SafetyTips />
          </div>
        </div>
      </main>
    </div>
  );
}
