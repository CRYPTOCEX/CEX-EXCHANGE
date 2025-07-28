"use client";

import { useEffect } from "react";
import { ArrowRightLeft, LineChart, Users } from "lucide-react";
import { DashboardHero } from "./components/dashboard-hero";
import { StatsOverview } from "./components/stats-overview";
import { PortfolioChart } from "./components/portfolio-chart";
import { TradingActivity } from "./components/trading-activity";
import { RecentTransactions } from "./components/recent-transactions";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

export function DashboardClient() {
  const t = useTranslations("ext");
  const { user } = useUserStore();
  const {
    dashboardData,
    portfolio,
    dashboardStats,
    isLoadingDashboardData,
    isLoadingPortfolio,
    isLoadingDashboardStats,
    isLoadingTradingActivity,
    isLoadingTransactions,
    portfolioError,
    dashboardStatsError,
    tradingActivityError,
    transactionsError,
    fetchDashboardData,
  } = useP2PStore();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
