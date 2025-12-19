"use client";

import { useEffect, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DashboardHeader } from "./components/dashboard-header";
import { StatsOverview } from "./components/stats-overview";
import { SearchFilters, TradeFilters } from "./components/search-filters";
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

const defaultFilters: TradeFilters = {
  search: "",
  currency: "all",
  sortBy: "newest",
  tradeTypes: { buy: true, sell: true },
  statuses: { active: true, completed: false, disputed: false, cancelled: false },
  dateRange: "all",
};

export default function TradeDashboardClient() {
  const t = useTranslations("common");
  const tExt = useTranslations("ext");
  const {
    tradeDashboardData,
    isLoadingTradeDashboardData,
    tradeDashboardDataError,
    fetchTradeDashboardData,
  } = useP2PStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<TradeFilters>(defaultFilters);
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

  // Extract data from dashboard (must be before useMemo to ensure consistent hook order)
  const {
    tradeStats,
    recentActivity,
    activeTrades,
    completedTrades,
    disputedTrades,
    pendingTrades,
    availableCurrencies,
  } = tradeDashboardData || {
    tradeStats: {},
    recentActivity: [],
    activeTrades: [],
    completedTrades: [],
    disputedTrades: [],
    pendingTrades: [],
    availableCurrencies: [],
  };

  // Filter and sort trades - must be called before any conditional returns
  const filterTrades = useMemo(() => {
    return (trades: any[]) => {
      if (!trades) return [];

      let filtered = [...trades];

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(
          (trade) =>
            trade.id?.toLowerCase().includes(searchLower) ||
            trade.coin?.toLowerCase().includes(searchLower) ||
            trade.counterparty?.toLowerCase().includes(searchLower)
        );
      }

      // Currency filter
      if (filters.currency !== "all") {
        filtered = filtered.filter(
          (trade) => trade.coin?.toLowerCase() === filters.currency.toLowerCase()
        );
      }

      // Trade type filter
      if (!filters.tradeTypes.buy) {
        filtered = filtered.filter((trade) => trade.type !== "BUY");
      }
      if (!filters.tradeTypes.sell) {
        filtered = filtered.filter((trade) => trade.type !== "SELL");
      }

      // Date range filter
      if (filters.dateRange !== "all") {
        const now = new Date();
        let startDate: Date;

        switch (filters.dateRange) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            startDate = new Date(0);
        }

        filtered = filtered.filter((trade) => new Date(trade.date) >= startDate);
      }

      // Sort
      switch (filters.sortBy) {
        case "oldest":
          filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          break;
        case "value_high":
          filtered.sort((a, b) => (b.fiatAmount || 0) - (a.fiatAmount || 0));
          break;
        case "value_low":
          filtered.sort((a, b) => (a.fiatAmount || 0) - (b.fiatAmount || 0));
          break;
        case "newest":
        default:
          filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      return filtered;
    };
  }, [filters]);

  // Apply filters to trades - must be called before any conditional returns
  const filteredActiveTrades = useMemo(() => filterTrades(activeTrades), [filterTrades, activeTrades]);
  const filteredCompletedTrades = useMemo(() => filterTrades(completedTrades), [filterTrades, completedTrades]);
  const filteredDisputedTrades = useMemo(() => filterTrades(disputedTrades), [filterTrades, disputedTrades]);

  // Loading state - after all hooks
  if (isLoadingTradeDashboardData && !tradeDashboardData) {
    return <LoadingSkeleton />;
  }

  // Error state - after all hooks
  if (tradeDashboardDataError && !tradeDashboardData) {
    return (
      <ErrorDisplay
        error={tradeDashboardDataError}
        onRetry={handleRefresh}
        isRetrying={isRefreshing}
      />
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero section - Using HeroSection component */}
      <DashboardHeader />

      <main className="container mx-auto py-12 space-y-8">
        {/* Stats Overview */}
        <StatsOverview
          tradeStats={tradeStats}
          activeTrades={activeTrades}
          completedTrades={completedTrades}
        />

        {/* Search and Filter Section */}
        <SearchFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableCurrencies={availableCurrencies || []}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trades Section */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="active">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="active">
                  {t("active")}
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {filteredActiveTrades?.length || 0}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="pending">{t("pending")}</TabsTrigger>
                <TabsTrigger value="completed">
                  {t("completed")}
                  {filteredCompletedTrades && filteredCompletedTrades.length > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                      {filteredCompletedTrades.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="disputed">
                  {tExt("disputed")}
                  {filteredDisputedTrades && filteredDisputedTrades.length > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                      {filteredDisputedTrades.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4 space-y-4">
                <ActiveTradesTab
                  activeTrades={filteredActiveTrades}
                  currentTime={currentTime}
                />
              </TabsContent>

              <TabsContent value="pending" className="mt-4 space-y-4">
                <PendingTradesTab />
              </TabsContent>

              <TabsContent value="completed" className="mt-4 space-y-4">
                <CompletedTradesTab completedTrades={filteredCompletedTrades} />
              </TabsContent>

              <TabsContent value="disputed" className="mt-4 space-y-4">
                <DisputedTradesTab disputedTrades={filteredDisputedTrades} />
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
