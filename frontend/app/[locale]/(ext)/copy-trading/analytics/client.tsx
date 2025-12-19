"use client";

import { useEffect, useState, useRef } from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  DollarSign,
  Activity,
  Target,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  LineChart,
  Sparkles,
  Trophy,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { formatPnL, formatAllocation } from "@/utils/currency";
import AnalyticsLoading from "./loading";
import AnalyticsErrorState from "./error-state";
import { HeroSection } from "@/components/ui/hero-section";
import { useTranslations } from "next-intl";

interface AnalyticsData {
  summary: {
    totalAllocated: number;
    totalProfit: number;
    overallROI: number;
    activeSubscriptions: number;
    totalTrades: number;
    winRate: number;
  };
  byLeader: Array<{
    leader: { id: string; displayName: string };
    subscription?: { id: string; status: string };
    trades: number;
    wins: number;
    profit: number;
    volume: number;
    winRate: number;
    roi: number;
  }>;
  profitChart: Array<{
    date: string;
    dailyProfit: number;
    cumulativeProfit: number;
  }>;
  tradeDistribution: {
    bySymbol: Array<{ symbol: string; count: number; profit: number }>;
    bySide: {
      buy: { count: number; profit: number };
      sell: { count: number; profit: number };
    };
  };
}

const periodOptions = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

export default function AnalyticsClient() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const lastPeriodRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastPeriodRef.current === period) return;
    lastPeriodRef.current = period;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const { data } = await $fetch({
          url: "/api/copy-trading/analytics",
          method: "GET",
          params: { period },
          silentSuccess: true,
        });

        setAnalytics(data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  const handlePeriodChange = (newPeriod: string) => {
    lastPeriodRef.current = null;
    setPeriod(newPeriod);
  };

  if (isLoading) {
    return <AnalyticsLoading />;
  }

  if (!analytics) {
    return (
      <AnalyticsErrorState
        onRetry={() => {
          lastPeriodRef.current = null;
          setPeriod(period);
        }}
      />
    );
  }

  const { summary, byLeader, profitChart, tradeDistribution } = analytics;
  const isPositiveROI = summary.overallROI >= 0;
  const maxProfit = Math.max(
    ...profitChart.map((p) => Math.abs(p.cumulativeProfit)),
    1
  );

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Header */}
      <HeroSection
        badge={{
          icon: <BarChart3 className="h-3.5 w-3.5" />,
          text: "Performance Analytics",
          gradient: "from-indigo-500/10 to-violet-500/10",
          iconColor: "text-indigo-500",
          textColor: "text-indigo-600 dark:text-indigo-400",
        }}
        title={[
          { text: "Your Trading " },
          { text: "Analytics", gradient: "from-indigo-500 to-violet-500" },
        ]}
        description={t("track_your_copy_trading_performance_with")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContentAlign="end"
        rightContent={
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
            {periodOptions.map((opt) => (
              <Button
                key={opt.value}
                variant="ghost"
                size="sm"
                onClick={() => handlePeriodChange(opt.value)}
                className={`rounded-lg px-4 ${
                  period === opt.value
                    ? "bg-white dark:bg-zinc-700 shadow-sm"
                    : "hover:bg-white/50 dark:hover:bg-zinc-700/50"
                }`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        }
        background={{
          orbs: [
            { color: "#6366f1", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
            { color: "#8b5cf6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
          ],
        }}
        particles={{ count: 6, type: "floating", colors: ["#6366f1", "#8b5cf6"], size: 8 }}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Main Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8"
        >
          {/* Total Allocated */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">{tExt("total_allocated")}</span>
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <Wallet className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {formatAllocation(summary.totalAllocated, "USDT")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Total Profit */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div
                className={`absolute inset-0 bg-linear-to-br ${
                  summary.totalProfit >= 0
                    ? "from-emerald-500/5 to-transparent"
                    : "from-red-500/5 to-transparent"
                }`}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">{tExt("total_profit")}</span>
                  <div
                    className={`p-1.5 rounded-lg ${
                      summary.totalProfit >= 0
                        ? "bg-emerald-500/10"
                        : "bg-red-500/10"
                    }`}
                  >
                    {summary.totalProfit >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    summary.totalProfit >= 0
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {formatPnL(summary.totalProfit, "USDT").formatted}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Overall ROI */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div
                className={`absolute inset-0 bg-linear-to-br ${
                  isPositiveROI
                    ? "from-emerald-500/5 to-transparent"
                    : "from-red-500/5 to-transparent"
                }`}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">{t("overall_roi")}</span>
                  <div
                    className={`p-1.5 rounded-lg ${
                      isPositiveROI ? "bg-emerald-500/10" : "bg-red-500/10"
                    }`}
                  >
                    <Target className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    isPositiveROI
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {isPositiveROI ? "+" : ""}
                  {summary.overallROI.toFixed(2)}%
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Active Subscriptions */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">Active</span>
                  <div className="p-1.5 rounded-lg bg-indigo-500/10">
                    <Users className="h-3.5 w-3.5 text-indigo-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {summary.activeSubscriptions}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Total Trades */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">{tExt("total_trades")}</span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Activity className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {summary.totalTrades.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div className="absolute inset-0 bg-linear-to-br from-cyan-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">{tCommon("win_rate")}</span>
                  <div className="p-1.5 rounded-lg bg-cyan-500/10">
                    <Trophy className="h-3.5 w-3.5 text-cyan-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {summary.winRate.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Profit Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LineChart className="h-5 w-5 text-primary" />
                  {t("profit_over_time")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profitChart && profitChart.length > 0 ? (
                  <div className="h-64">
                    {/* Simple bar chart visualization */}
                    <div className="flex items-end justify-between h-48 gap-1 px-2">
                      {profitChart.slice(-30).map((item, idx) => {
                        const height =
                          maxProfit > 0
                            ? (Math.abs(item.cumulativeProfit) / maxProfit) *
                              100
                            : 0;
                        const isPositive = item.cumulativeProfit >= 0;
                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center justify-end group cursor-pointer"
                            title={`${item.date}: ${formatPnL(item.cumulativeProfit, "USDT").formatted}`}
                          >
                            <div
                              className={`w-full rounded-t transition-all group-hover:opacity-80 ${
                                isPositive
                                  ? "bg-linear-to-t from-emerald-500 to-emerald-400"
                                  : "bg-linear-to-t from-red-500 to-red-400"
                              }`}
                              style={{ height: `${Math.max(height, 4)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-zinc-400 px-2">
                      <span>
                        {profitChart.length > 30
                          ? profitChart[profitChart.length - 30]?.date
                          : profitChart[0]?.date}
                      </span>
                      <span>{profitChart[profitChart.length - 1]?.date}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                      <p className="text-zinc-500">{t("no_profit_data_yet")}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Trade Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-0 shadow-lg h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChart className="h-5 w-5 text-primary" />
                  {t("trade_distribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* Buy/Sell Distribution */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-500 mb-4">
                      {t("by_side")}
                    </h4>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            Buy
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-600">
                          {tradeDistribution.bySide.buy.count}
                        </div>
                        <div
                          className={`text-sm ${
                            tradeDistribution.bySide.buy.profit >= 0
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : 'text-red-500 dark:text-red-400'
                          }`}
                        >
                          {
                            formatPnL(
                              tradeDistribution.bySide.buy.profit,
                              "USDT"
                            ).formatted
                          }
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-700 dark:text-red-400">
                            Sell
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                          {tradeDistribution.bySide.sell.count}
                        </div>
                        <div
                          className={`text-sm ${
                            tradeDistribution.bySide.sell.profit >= 0
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : 'text-red-500 dark:text-red-400'
                          }`}
                        >
                          {
                            formatPnL(
                              tradeDistribution.bySide.sell.profit,
                              "USDT"
                            ).formatted
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Symbols */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-500 mb-4">
                      {t("top_symbols")}
                    </h4>
                    {tradeDistribution.bySymbol &&
                    tradeDistribution.bySymbol.length > 0 ? (
                      <div className="space-y-3">
                        {tradeDistribution.bySymbol.slice(0, 5).map((item) => (
                          <div
                            key={item.symbol}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">
                                {item.symbol.slice(0, 3)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {item.symbol}
                                </p>
                                <p className="text-xs text-zinc-400">
                                  {item.count} trades
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-sm font-semibold ${
                                item.profit >= 0
                                  ? 'text-emerald-500 dark:text-emerald-400'
                                  : 'text-red-500 dark:text-red-400'
                              }`}
                            >
                              {formatPnL(item.profit, "USDT").formatted}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-400 text-sm">{t("no_data")}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Performance by Leader */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                {t("performance_by_leader")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {byLeader && byLeader.length > 0 ? (
                <div className="space-y-4">
                  {byLeader.map((item, idx) => {
                    const isPositive = item.profit >= 0;
                    return (
                      <motion.div
                        key={item.leader?.id || `leader-${idx}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold">
                              {item.leader.displayName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-white">
                                {item.leader.displayName}
                              </p>
                              <div className="flex items-center gap-2 text-sm">
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    item.subscription?.status === "ACTIVE"
                                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                      : item.subscription?.status === "PAUSED"
                                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                      : item.subscription?.status === "PENDING"
                                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                      : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  {item.subscription?.status || "STOPPED"}
                                </Badge>
                                <span className="text-zinc-400">
                                  {item.trades} trades
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-xl font-bold ${
                                isPositive
                                  ? 'text-emerald-500 dark:text-emerald-400'
                                  : 'text-red-500 dark:text-red-400'
                              }`}
                            >
                              {formatPnL(item.profit, "USDT").formatted}
                            </p>
                            <p
                              className={`text-sm ${
                                isPositive
                                  ? 'text-emerald-500 dark:text-emerald-400'
                                  : 'text-red-500 dark:text-red-400'
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {item.roi.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        {/* Stats bar */}
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">
                              {tCommon("win_rate")}
                            </p>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={item.winRate}
                                className="h-2 flex-1"
                              />
                              <span className="text-sm font-medium">
                                {item.winRate.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">ROI</p>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={Math.min(Math.abs(item.roi), 100)}
                                className="h-2 flex-1"
                              />
                              <span
                                className={`text-sm font-medium ${
                                  isPositive
                                    ? 'text-emerald-500 dark:text-emerald-400'
                                    : 'text-red-500 dark:text-red-400'
                                }`}
                              >
                                {isPositive ? "+" : ""}
                                {item.roi.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {t("no_active_subscriptions")}
                  </h3>
                  <p className="text-zinc-500 mb-6">
                    {t("start_following_leaders_to_see_your")}
                  </p>
                  <Link href="/copy-trading/leader">
                    <Button className="rounded-xl gap-2">
                      <Sparkles className="h-4 w-4" />
                      {t("explore_leaders")}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
