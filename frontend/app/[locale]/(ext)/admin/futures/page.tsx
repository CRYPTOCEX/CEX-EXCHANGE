"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Target,
  Flame,
  ChevronRight,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  LineChart,
  PieChart,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Icon } from "@iconify/react";

interface DashboardData {
  overview: {
    totalMarkets: number;
    activeMarkets: number;
    totalPositions: number;
    activePositions: number;
    closedPositions: number;
    liquidatedPositions: number;
    cancelledPositions: number;
    longPositions: number;
    shortPositions: number;
    totalPnl: number;
    totalVolume: number;
  };
  recentPositions: Array<{
    id: string;
    symbol: string;
    side: string;
    status: string;
    entryPrice: number;
    amount: number;
    leverage: number;
    unrealizedPnl: number;
    createdAt: string;
    userId: string;
  }>;
  topMarkets: Array<{
    id: string;
    symbol: string;
    currency: string;
    pair: string;
    isTrending: boolean;
    isHot: boolean;
  }>;
  chartData: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
    }>;
  };
  timeRange: string;
}

export default function FuturesDashboardPage() {
  const t = useTranslations("ext_admin_futures");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("7d");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await $fetch({
        url: `/api/admin/futures/dashboard?timeRange=${timeRange}`,
        silent: true,
      });
      if (response.data) {
        setData(response.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
      case "ACTIVE":
        return "text-green-500 bg-green-500/10";
      case "CLOSED":
        return "text-blue-500 bg-blue-500/10";
      case "LIQUIDATED":
        return "text-red-500 bg-red-500/10";
      case "CANCELLED":
        return "text-zinc-500 bg-zinc-500/10";
      default:
        return "text-zinc-500 bg-zinc-500/10";
    }
  };

  const getSideColor = (side: string) => {
    const s = side?.toUpperCase();
    if (s === "BUY" || s === "LONG") {
      return "text-green-500";
    }
    return "text-red-500";
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {tExt("failed_to_load_dashboard")}
        </h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={fetchDashboardData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {tCommon("try_again")}
        </Button>
      </div>
    );
  }

  const overview = data?.overview || {
    totalMarkets: 0,
    activeMarkets: 0,
    totalPositions: 0,
    activePositions: 0,
    closedPositions: 0,
    liquidatedPositions: 0,
    cancelledPositions: 0,
    longPositions: 0,
    shortPositions: 0,
    totalPnl: 0,
    totalVolume: 0,
  };

  const longPercent = overview.totalPositions > 0
    ? (overview.longPositions / overview.totalPositions) * 100
    : 50;
  const shortPercent = 100 - longPercent;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <TrendingUp className="h-3.5 w-3.5" />,
          text: "Futures Trading",
          gradient: "from-amber-100 to-red-100 dark:from-amber-950 dark:to-red-950",
          iconColor: "text-amber-500",
          textColor: "text-amber-600 dark:text-amber-400",
        }}
        title={[
          { text: "Futures " },
          {
            text: "Dashboard",
            gradient:
              "from-amber-600 via-red-500 to-amber-600 dark:from-amber-400 dark:via-red-400 dark:to-amber-400",
          },
        ]}
        description={t("monitor_and_manage_futures_trading_positions")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContentAlign="center"
        background={{
          orbs: [
            {
              color: "#f59e0b",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#ef4444",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#f59e0b", "#ef4444"],
          size: 8,
        }}
        rightContent={
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="h-10 px-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium"
            >
              <option value="24h">{tCommon("last_24_hours")}</option>
              <option value="7d">{tCommon("last_7_days")}</option>
              <option value="30d">{tCommon("last_30_days")}</option>
            </select>
            <Button
              onClick={() => router.push("/admin/futures/market/create")}
              className="bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white shadow-lg font-semibold"
            >
              <Icon icon="mdi:plus" className="w-5 h-5 mr-2" />
              {tCommon("new_market")}
            </Button>
          </div>
        }
        bottomSlot={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <StatsCard
              label={tCommon("total_positions")}
              value={loading ? "-" : overview.totalPositions}
              icon={Activity}
              index={0}
              {...statsCardColors.amber}
            />
            <StatsCard
              label={tCommon("active_positions")}
              value={loading ? "-" : overview.activePositions}
              icon={Target}
              index={1}
              {...statsCardColors.green}
            />
            <StatsCard
              label={tCommon("total_volume")}
              value={loading ? "-" : formatCurrency(overview.totalVolume)}
              icon={BarChart3}
              index={2}
              {...statsCardColors.blue}
            />
            <StatsCard
              label={tCommon("total_p_l")}
              value={loading ? "-" : formatCurrency(overview.totalPnl)}
              icon={overview.totalPnl >= 0 ? TrendingUp : TrendingDown}
              index={3}
              {...(overview.totalPnl >= 0 ? statsCardColors.green : statsCardColors.red)}
            />
          </div>
        }
      />

      {/* Main Content */}
      <div className="container mx-auto py-8 space-y-8">
        {/* Position Metrics Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Position Status Breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5 text-amber-500" />
                {t("position_status_overview")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        Active
                      </span>
                      <span className="text-sm font-bold">
                        {overview.activePositions}
                      </span>
                    </div>
                    <Progress
                      value={
                        overview.totalPositions > 0
                          ? (overview.activePositions / overview.totalPositions) * 100
                          : 0
                      }
                      className="h-2 [&>div]:bg-green-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500" />
                        Closed
                      </span>
                      <span className="text-sm font-bold">
                        {overview.closedPositions}
                      </span>
                    </div>
                    <Progress
                      value={
                        overview.totalPositions > 0
                          ? (overview.closedPositions / overview.totalPositions) * 100
                          : 0
                      }
                      className="h-2 [&>div]:bg-blue-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        Liquidated
                      </span>
                      <span className="text-sm font-bold">
                        {overview.liquidatedPositions}
                      </span>
                    </div>
                    <Progress
                      value={
                        overview.totalPositions > 0
                          ? (overview.liquidatedPositions / overview.totalPositions) * 100
                          : 0
                      }
                      className="h-2 [&>div]:bg-red-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-zinc-500" />
                        Cancelled
                      </span>
                      <span className="text-sm font-bold">
                        {overview.cancelledPositions}
                      </span>
                    </div>
                    <Progress
                      value={
                        overview.totalPositions > 0
                          ? (overview.cancelledPositions / overview.totalPositions) * 100
                          : 0
                      }
                      className="h-2 [&>div]:bg-zinc-500"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Long vs Short */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                {t("long_short_ratio")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-green-500">Long</span>
                    </div>
                    <span className="text-2xl font-bold text-green-500">
                      {overview.longPositions}
                    </span>
                  </div>
                  <div className="relative h-4 bg-red-500/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${longPercent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="w-5 h-5 text-red-500" />
                      <span className="font-semibold text-red-500">Short</span>
                    </div>
                    <span className="text-2xl font-bold text-red-500">
                      {overview.shortPositions}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
                    <span>{longPercent.toFixed(1)}% Long</span>
                    <span>{shortPercent.toFixed(1)}% Short</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Chart and Markets Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Activity Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-amber-500" />
                  {t("trading_activity")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : data?.chartData?.labels?.length ? (
                <div className="h-64 relative">
                  {/* Simple bar chart visualization */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between h-[85%] gap-1 px-2">
                    {data.chartData.labels.map((label, i) => {
                      const positionData = data.chartData.datasets[0]?.data || [];
                      const maxValue = Math.max(...positionData, 1);
                      const value = positionData[i] || 0;
                      const height = (value / maxValue) * 100;

                      return (
                        <div key={i} className="flex-1 group relative">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className="bg-gradient-to-t from-amber-600 to-amber-400 dark:from-amber-500 dark:to-amber-300 rounded-t-sm group-hover:from-amber-700 group-hover:to-amber-500 transition-all duration-200 min-h-[2px]"
                          />
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                            {value} positions
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* X-axis labels */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 transform translate-y-6">
                    {data.chartData.labels.map((label, i) => (
                      <div
                        key={i}
                        className="text-[10px] text-muted-foreground truncate text-center flex-1"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">{tCommon("no_chart_data_available")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Markets */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  {tCommon("markets")}
                </CardTitle>
                <Link
                  href="/admin/futures/market"
                  className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center"
                >
                  {tCommon("view_all")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : data?.topMarkets?.length ? (
                <div className="space-y-2">
                  {data.topMarkets.map((market, index) => (
                    <motion.div
                      key={market.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                      onClick={() => router.push(`/admin/futures/market/${market.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                            {market.currency?.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-2">
                            {market.symbol}
                            {market.isTrending && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/10 text-blue-500 rounded">
                                Trending
                              </span>
                            )}
                            {market.isHot && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-red-500/10 text-red-500 rounded">
                                Hot
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Flame className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">{tExt("no_markets_available")}</p>
                  <Button
                    variant="link"
                    className="text-amber-600 dark:text-amber-400 mt-2"
                    onClick={() => router.push("/admin/futures/market/create")}
                  >
                    {tCommon("create_your_first_market")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Positions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-500" />
                  {t("recent_positions")}
                </CardTitle>
                <Link
                  href="/admin/futures/position"
                  className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center"
                >
                  {tCommon("view_all")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : data?.recentPositions?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="pb-3 font-medium">Symbol</th>
                        <th className="pb-3 font-medium">Side</th>
                        <th className="pb-3 font-medium">{tCommon("entry_price")}</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Leverage</th>
                        <th className="pb-3 font-medium">P&L</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.recentPositions.map((position, index) => (
                        <motion.tr
                          key={position.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-4 font-medium">{position.symbol}</td>
                          <td className="py-4">
                            <span className={`flex items-center gap-1 ${getSideColor(position.side)}`}>
                              {position.side?.toUpperCase() === "BUY" || position.side?.toUpperCase() === "LONG" ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4" />
                              )}
                              {position.side}
                            </span>
                          </td>
                          <td className="py-4">${position.entryPrice.toFixed(4)}</td>
                          <td className="py-4">{position.amount.toFixed(4)}</td>
                          <td className="py-4">{position.leverage}x</td>
                          <td className="py-4">
                            <span
                              className={
                                position.unrealizedPnl >= 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }
                            >
                              {position.unrealizedPnl >= 0 ? "+" : ""}
                              ${position.unrealizedPnl.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(position.status)}`}
                            >
                              {position.status?.toUpperCase() === "OPEN" || position.status?.toUpperCase() === "ACTIVE" ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : position.status?.toUpperCase() === "LIQUIDATED" ? (
                                <AlertTriangle className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              {position.status}
                            </span>
                          </td>
                          <td className="py-4 text-muted-foreground text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(position.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("no_positions_yet")}</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    {t("positions_will_appear_here_once_traders")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {tCommon("quick_actions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <button
                  onClick={() => router.push("/admin/futures/market/create")}
                  className="group flex flex-col items-center p-6 rounded-2xl border-2 border-dashed border-border hover:border-amber-500 hover:bg-amber-500/5 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon icon="mdi:plus" className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {tCommon("new_market")}
                  </span>
                </button>

                <button
                  onClick={() => router.push("/admin/futures/market")}
                  className="group flex flex-col items-center p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon icon="lucide:candlestick-chart" className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {tCommon("markets")}
                  </span>
                </button>

                <button
                  onClick={() => router.push("/admin/futures/position")}
                  className="group flex flex-col items-center p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon icon="lucide:arrow-left-right" className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Positions
                  </span>
                </button>

                <button
                  onClick={fetchDashboardData}
                  className="group flex flex-col items-center p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <RefreshCw className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Refresh
                  </span>
                </button>

                <button
                  onClick={() => router.push("/admin/finance/order/futures")}
                  className="group flex flex-col items-center p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon icon="mdi:receipt" className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {tCommon("orders")}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
