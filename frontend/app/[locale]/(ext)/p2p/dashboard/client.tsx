"use client";

import { useEffect } from "react";
import { ArrowRightLeft, LineChart, Users } from "lucide-react";
import { DashboardHero } from "./components/dashboard-hero";
import { StatsOverview } from "./components/stats-overview";
import { PortfolioChart } from "./components/portfolio-chart";
import { TradingActivity } from "./components/trading-activity";
import { RecentTransactions } from "./components/recent-transactions";
import { MyOffers } from "./components/my-offers";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LogIn, FileText } from "lucide-react";

export function DashboardClient() {
  const t = useTranslations("ext");
  const router = useRouter();
  const { user, isLoading } = useUserStore();
  const {
    dashboardData,
    portfolio,
    dashboardStats,
    userOffers,
    isLoadingDashboardData,
    isLoadingPortfolio,
    isLoadingDashboardStats,
    isLoadingTradingActivity,
    isLoadingTransactions,
    isLoadingUserOffers,
    portfolioError,
    dashboardStatsError,
    tradingActivityError,
    transactionsError,
    userOffersError,
    fetchDashboardData,
  } = useP2PStore();

  // Redirect to login if user is not authenticated (after initial load)
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) {
      // Always fetch fresh data when dashboard mounts
      fetchDashboardData();
    }
  }, [user]); // Removed fetchDashboardData from dependencies to force refresh on every mount

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated (after loading)
  if (!user) {
    return (
      <div className="container mx-auto py-12">
        <Alert>
          <LogIn className="h-4 w-4" />
          <AlertTitle>{t("authentication_required")}</AlertTitle>
          <AlertDescription className="mt-2">
            {t("you_must_be_logged_in_to_access_the_dashboard")}.
          </AlertDescription>
          <Button
            onClick={() => router.push("/login")}
            className="mt-4"
          >
            <LogIn className="mr-2 h-4 w-4" />
            {t("login")}
          </Button>
        </Alert>
      </div>
    );
  }

  const formattedTradingActivity =
    dashboardData?.tradingActivity?.map((trade) => ({
      ...trade,
      time: trade.timestamp || new Date(trade.createdAt).toLocaleTimeString(),
    })) || [];

  const formattedTransactions =
    dashboardData?.transactions?.map((tx) => ({
      ...tx,
      time: tx.timestamp || new Date(tx.createdAt).toLocaleTimeString(),
    })) || [];

  const mappedPortfolio = portfolio
    ? {
        ...portfolio,
        totalValue: 0,
        changePercentage: 0,
        change24h: 0,
        return30d: 0,
        chartData: [],
      }
    : null;

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Hero section with gradient background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-violet-600/10 to-background z-0" />
        <div className="container relative z-10 py-12">
          <div className="flex flex-col gap-8">
            <DashboardHero
              name={`${user?.firstName} ${user?.lastName}`}
              isLoading={isLoadingDashboardData}
            />

            {/* Stats Overview */}
            {dashboardStatsError ? (
              <div className="p-6 border rounded-lg bg-red-50 text-red-500">
                {dashboardStatsError}
              </div>
            ) : (
              <StatsOverview
                stats={dashboardStats}
                isLoading={isLoadingDashboardStats}
              />
            )}
          </div>
        </div>
      </div>

      <div className="container py-12">
        {/* Main content */}
        <div className="space-y-12">
          {/* Portfolio Section */}
          <div>
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <LineChart className="h-8 w-8 mr-3 text-blue-500" />
              {t("portfolio_overview")}
            </h2>

            {portfolioError ? (
              <div className="p-6 border rounded-lg bg-red-50 text-red-500">
                {portfolioError}
              </div>
            ) : (
              <PortfolioChart
                portfolio={mappedPortfolio}
                isLoading={isLoadingPortfolio}
              />
            )}
          </div>

          {/* My Offers Section */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <FileText className="h-7 w-7 mr-3 text-blue-500" />
              {t("my_offers")}
            </h2>
            <MyOffers
              offers={userOffers}
              isLoading={isLoadingUserOffers}
              error={userOffersError}
            />
          </div>

          {/* Trading Activity and Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Users className="h-7 w-7 mr-3 text-violet-500" />
                {t("p2p_trading_activity")}
              </h2>
              {tradingActivityError ? (
                <div className="p-6 border rounded-lg bg-red-50 text-red-500">
                  {tradingActivityError}
                </div>
              ) : (
                <TradingActivity
                  trades={formattedTradingActivity}
                  isLoading={isLoadingTradingActivity}
                />
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <ArrowRightLeft className="h-7 w-7 mr-3 text-emerald-500" />
                {t("recent_transactions")}
              </h2>
              {transactionsError ? (
                <div className="p-6 border rounded-lg bg-red-50 text-red-500">
                  {transactionsError}
                </div>
              ) : (
                <RecentTransactions
                  transactions={formattedTransactions}
                  isLoading={isLoadingTransactions}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
