"use client";

import { useEffect } from "react";
import { LineChart, Users } from "lucide-react";
import { DashboardHero } from "./components/dashboard-hero";
import { StatsOverview } from "./components/stats-overview";
import { PortfolioChart } from "./components/portfolio-chart";
import { TradingActivity } from "./components/trading-activity";
import { MyOffers } from "./components/my-offers";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LogIn, FileText } from "lucide-react";

export function DashboardClient() {
  const t = useTranslations("ext_p2p");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
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
    isLoadingUserOffers,
    portfolioError,
    dashboardStatsError,
    tradingActivityError,
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
    const P2PDashboardLoading = require('./loading').default;
    return <P2PDashboardLoading />;
  }

  // Show login prompt if not authenticated (after loading)
  if (!user) {
    const { DashboardErrorState } = require('./error-state');
    return <DashboardErrorState showLoginButton={true} />;
  }

  const formattedTradingActivity =
    dashboardData?.tradingActivity?.map((trade: any) => ({
      id: trade.id,
      type: trade.type || "BUY",
      status: trade.status || "PENDING",
      amount: `${parseFloat(trade.amount || 0).toFixed(trade.amount >= 1 ? 2 : 6)} ${trade.currency || ""}`,
      value: `$${parseFloat(trade.total || 0).toFixed(2)}`,
      user: trade.counterpartyName || "Unknown",
      userRating: trade.counterpartyRating || 0,
      avatar: trade.counterpartyAvatar,
      paymentMethod: trade.paymentMethodName || "Unknown",
      time: trade.timestamp
        ? new Date(trade.timestamp).toLocaleTimeString()
        : trade.createdAt
          ? new Date(trade.createdAt).toLocaleTimeString()
          : "",
      timestamp: trade.timestamp || trade.createdAt,
    })) || [];

  const mappedPortfolio = portfolio
    ? {
        totalValue: portfolio.totalValue || 0,
        changePercentage: portfolio.changePercentage || 0,
        change24h: portfolio.change24h || 0,
        return30d: portfolio.return30d || 0,
        chartData: portfolio.chartData || [],
      }
    : null;

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero section - Using HeroSection component */}
      <DashboardHero
        name={`${user?.firstName} ${user?.lastName}`}
      />

      {/* Stats Overview - With proper card backgrounds */}
      <section className="py-12">
        <div className="container mx-auto">
          {dashboardStatsError ? (
            <div className="p-6 border rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400">
              {dashboardStatsError}
            </div>
          ) : (
            <StatsOverview
              stats={dashboardStats}
              isLoading={isLoadingDashboardStats}
            />
          )}
        </div>
      </section>

      <div className="container mx-auto pb-12">
        {/* Main content */}
        <div className="space-y-12">
          {/* Portfolio Section */}
          <div>
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <div className={`h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center mr-3`}>
                <LineChart className={`h-5 w-5 text-blue-500`} />
              </div>
              {tExt("portfolio_overview")}
            </h2>

            {portfolioError ? (
              <div className="p-6 border rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400">
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
              <div className={`h-9 w-9 rounded-xl bg-blue-500/20 flex items-center justify-center mr-3`}>
                <FileText className={`h-5 w-5 text-blue-500`} />
              </div>
              {tCommon("my_offers")}
            </h2>
            <MyOffers
              offers={userOffers}
              isLoading={isLoadingUserOffers}
              error={userOffersError}
            />
          </div>

          {/* Trading Activity - Full Width */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <div className={`h-9 w-9 rounded-xl bg-blue-500/20 flex items-center justify-center mr-3`}>
                <Users className={`h-5 w-5 text-blue-500`} />
              </div>
              {t("p2p_trading_activity")}
            </h2>
            {tradingActivityError ? (
              <div className="p-6 border rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400">
                {tradingActivityError}
              </div>
            ) : (
              <TradingActivity
                trades={formattedTradingActivity}
                isLoading={isLoadingTradingActivity}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
