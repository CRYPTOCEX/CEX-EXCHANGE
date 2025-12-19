"use client";

import React, { useEffect, useState, useMemo } from "react";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { HeroSection } from "@/components/ui/hero-section";
import { BarChart3, Sparkles } from "lucide-react";

interface OverviewData {
  totalMarkets: number;
  activeMarkets: number;
  totalBots: number;
  activeBots: number;
  totalTVL: number;
  total24hVolume: number;
  totalPnL: number;
  pnlPercent: number;
  recentTradeCount: number;
  marketsByStatus: {
    active: number;
    paused: number;
    stopped: number;
  };
  lastUpdated: string;
  markets?: any[];
}

interface MarketPerformance {
  marketId: string;
  period: string;
  market: any;
  currentPrice: string;
  priceHistory: any[];
  volumeHistory: any[];
  targetAchievementRate: number;
  metrics: {
    totalTrades: number;
    avgTradeSize: number;
    totalVolume: number;
    tvl: number;
    unrealizedPnL: number;
    realizedPnL: number;
  };
  status: string;
}

interface PnLReport {
  marketId: string;
  market: any;
  summary: {
    daily: number;
    weekly: number;
    monthly: number;
    allTime: number;
    unrealized: number;
    realized: number;
    total: number;
  };
  roi: {
    percent: string;
    initialInvestment: number;
    currentValue: number;
  };
  history: any[];
  breakdown: {
    tradeCount: number;
    winningTrades: number;
    losingTrades: number;
    avgWin: number;
    avgLoss: number;
  };
}

// Price Chart Component
const PriceChart = ({
  data,
  period,
  currency,
}: {
  data: { timestamp: string; price: number; targetPrice: number }[];
  period: string;
  currency: string;
}) => {
  const chartData = useMemo(() => {
    return data
      .map((item) => ({
        ...item,
        date: new Date(item.timestamp),
        price: Number(item.price),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  const formatDate = (date: Date) => {
    if (period === "1h" || period === "24h") {
      return format(date, "HH:mm");
    }
    return format(date, "MMM dd");
  };

  const formatPrice = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    if (value >= 1) return value.toFixed(2);
    return value.toFixed(6);
  };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-xl">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {format(label, "MMM dd, HH:mm")}
          </p>
          <p className="text-lg font-bold text-foreground">
            {Number(payload[0].value).toFixed(6)} {currency}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!chartData.length) return null;

  // Calculate min/max for Y axis with padding
  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || maxPrice * 0.05;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.1}
          horizontal={true}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          axisLine={false}
          tickLine={false}
          dy={10}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          domain={[minPrice - padding, maxPrice + padding]}
          axisLine={false}
          tickLine={false}
          dx={-10}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          tickFormatter={formatPrice}
          width={60}
        />
        <Tooltip content={renderTooltip} />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#06b6d4"
          strokeWidth={2}
          fill="url(#priceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const PnLCard = ({
  title,
  value,
  subtitle,
  positive,
  currency,
}: {
  title: string;
  value: number;
  subtitle?: string;
  positive?: boolean;
  currency?: string;
}) => {
  const isPositive = positive ?? value >= 0;
  return (
    <div
      className={`p-5 rounded-2xl ${
        isPositive
          ? "bg-linear-to-br from-green-500/10 to-green-500/5"
          : "bg-linear-to-br from-red-500/10 to-red-500/5"
      }`}
    >
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p
        className={`text-2xl font-bold ${
          isPositive ? "text-green-500" : "text-red-500"
        }`}
      >
        {isPositive ? "+" : ""}
        {value.toFixed(2)} {currency || ""}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
};

export default function AnalyticsPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string>(
    searchParams.get("market") || ""
  );
  const [period, setPeriod] = useState<string>("24h");
  const [performance, setPerformance] = useState<MarketPerformance | null>(
    null
  );
  const [pnlReport, setPnlReport] = useState<PnLReport | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const response = await $fetch({
        url: "/api/admin/ai/market-maker/analytics/overview",
        silent: true,
      });
      if (response.data) {
        setOverview(response.data);
        if (!selectedMarket && response.data.markets?.length > 0) {
          setSelectedMarket(response.data.markets[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load overview", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketAnalytics = async () => {
    if (!selectedMarket) return;

    try {
      setLoadingAnalytics(true);
      const [perfResponse, pnlResponse] = await Promise.all([
        $fetch({
          url: `/api/admin/ai/market-maker/analytics/${selectedMarket}/performance?period=${period}`,
          silent: true,
        }),
        $fetch({
          url: `/api/admin/ai/market-maker/analytics/${selectedMarket}/pnl`,
          silent: true,
        }),
      ]);

      if (perfResponse.data) setPerformance(perfResponse.data);
      if (pnlResponse.data) setPnlReport(pnlResponse.data);
    } catch (err) {
      console.error("Failed to load market analytics", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (selectedMarket) {
      fetchMarketAnalytics();
    }
  }, [selectedMarket, period]);

  const markets = overview?.markets || [];
  const winRate =
    pnlReport?.breakdown?.tradeCount && pnlReport?.breakdown?.tradeCount > 0
      ? (
          (pnlReport.breakdown.winningTrades / pnlReport.breakdown.tradeCount) *
          100
        ).toFixed(1)
      : "0";

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section with AI Theme */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Analytics",
          gradient: "from-cyan-100 to-purple-100 dark:from-cyan-950 dark:to-purple-950",
          iconColor: "text-cyan-500",
          textColor: "text-cyan-600 dark:text-cyan-400",
        }}
        title={[
          { text: "Performance " },
          {
            text: "Analytics",
            gradient:
              "from-cyan-600 via-purple-500 to-cyan-600 dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400",
          },
        ]}
        description={t("performance_metrics_and_p_l_analysis")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContentAlign="center"
        background={{
          orbs: [
            {
              color: "#06b6d4",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#a855f7",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#06b6d4", "#a855f7"],
          size: 8,
        }}
        rightContent={
          <Button
            onClick={() => router.push("/admin/ai/market-maker")}
            variant="outline"
            className="border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/5"
          >
            <Icon icon="mdi:arrow-left" className="w-5 h-5 mr-2" />
            {tCommon("back_to_dashboard")}
          </Button>
        }
        bottomSlot={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur border-cyan-500/20">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  {tCommon("total_tvl")}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {((overview?.totalTVL || 0) / 1000).toFixed(1)}K
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-purple-500/20">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{`24h ${tCommon("volume")}`}</p>
                <p className="text-2xl font-bold text-foreground">
                  {((overview?.total24hVolume || 0) / 1000).toFixed(1)}K
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-cyan-500/20">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  {tCommon("total_p_l")}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    (overview?.totalPnL || 0) >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {(overview?.totalPnL || 0) >= 0 ? "+" : ""}
                  {(overview?.totalPnL || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-purple-500/20">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  {tCommon("active_markets")}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {overview?.activeMarkets || 0} / {overview?.totalMarkets || 0}
                </p>
              </CardContent>
            </Card>
          </div>
        }
      />

      {/* Main Content Container */}
      <div className="container mx-auto py-8 space-y-8">
        {/* Market Selector Card */}
        <Card className="border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  {t("select_market")}
                </label>
                <Select
                  value={selectedMarket}
                  onValueChange={setSelectedMarket}
                >
                  <SelectTrigger className="w-full h-12">
                    <SelectValue
                      placeholder={t("choose_a_market_to_analyze")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <Icon icon="mdi:chart-line" className="w-4 h-4" />
                          <span>{m.market?.symbol || "Unknown"}</span>
                          <span className="text-muted-foreground">
                            - {m.status}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:w-48">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  {t("time_period")}
                </label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder={t("select_period")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">{t("last_hour")}</SelectItem>
                    <SelectItem value="24h">{t("last_24_hours")}</SelectItem>
                    <SelectItem value="7d">{tCommon("last_7_days")}</SelectItem>
                    <SelectItem value="30d">
                      {tCommon("last_30_days")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-6">
            {/* Loading P&L Cards - match PnLCard gradient style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-linear-to-br from-muted/50 to-muted/30"
                >
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </div>
            {/* Loading Performance Card */}
            <Card className="border-cyan-500/20">
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full rounded-2xl" />
              </CardContent>
            </Card>
          </div>
        ) : loadingAnalytics ? (
          <div className="space-y-6">
            {/* Loading Performance Header Card */}
            <Card className="border-cyan-500/20">
              <CardHeader className="border-b">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-2xl" />
                  <div>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-32" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-64 w-full mt-8 rounded-2xl" />
              </CardContent>
            </Card>
            {/* Loading P&L Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-linear-to-br from-muted/50 to-muted/30"
                >
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </div>
          </div>
        ) : !markets.length ? (
          <Card className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-6">
              <Icon
                icon="mdi:chart-box-outline"
                className="w-10 h-10 text-cyan-500"
              />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {tExt("no_markets_available")}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t("create_an_ai_market_maker_first")}
            </p>
            <Button
              onClick={() =>
                router.push("/admin/ai/market-maker/market/create")
              }
              size="lg"
              className="bg-linear-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
            >
              <Icon icon="mdi:plus" className="w-5 h-5 mr-2" />
              {t("create_market")}
            </Button>
          </Card>
        ) : selectedMarket && performance ? (
          <>
            {/* Market Performance Header */}
            <Card className="border-cyan-500/20">
              <CardHeader className="border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Icon
                        icon="mdi:chart-line"
                        className="w-7 h-7 text-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">
                          {performance.market?.symbol || "Market"} Performance
                        </CardTitle>
                        <StatusBadge status={performance.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {performance.market?.currency}/
                        {performance.market?.pair}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(
                        `/admin/ai/market-maker/market/${selectedMarket}`
                      )
                    }
                    className="border-cyan-500/30 hover:border-cyan-500/50"
                  >
                    <Icon icon="mdi:open-in-new" className="w-4 h-4 mr-2" />
                    {tCommon("view_details")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {tCommon("current_price")}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {Number(performance.currentPrice).toFixed(6)}{" "}
                      {performance.market?.pair || ""}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {tExt("total_trades")}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {performance.metrics.totalTrades.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {t("avg_trade_size")}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {performance.metrics.avgTradeSize.toFixed(2)}{" "}
                      {performance.market?.currency || ""}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {t("target_achievement")}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-foreground">
                        {performance.targetAchievementRate}%
                      </p>
                      <div className="flex-1 max-w-[60px]">
                        <Progress
                          value={performance.targetAchievementRate}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price Chart */}
                <div className="mt-8 h-72">
                  {performance.priceHistory.length > 0 ? (
                    <PriceChart
                      data={performance.priceHistory}
                      period={period}
                      currency={performance.market?.pair || ""}
                    />
                  ) : (
                    <div className="h-full bg-linear-to-br from-cyan-500/5 to-purple-600/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                          <Icon
                            icon="mdi:chart-areaspline"
                            className="w-8 h-8 text-cyan-500"
                          />
                        </div>
                        <p className="font-medium text-foreground">
                          {t("no_price_data")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("start_trading_to_see_chart")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* P&L Report */}
            {pnlReport && (
              <>
                {/* P&L Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <PnLCard
                    title={t("daily_p_l")}
                    value={pnlReport.summary.daily}
                    currency={performance?.market?.pair}
                  />
                  <PnLCard
                    title={t("weekly_p_l")}
                    value={pnlReport.summary.weekly}
                    currency={performance?.market?.pair}
                  />
                  <PnLCard
                    title={t("monthly_p_l")}
                    value={pnlReport.summary.monthly}
                    currency={performance?.market?.pair}
                  />
                  <PnLCard
                    title={t("all_time_p_l")}
                    value={pnlReport.summary.allTime}
                    currency={performance?.market?.pair}
                  />
                </div>

                {/* ROI and Trade Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* ROI Card */}
                  <Card className="border-cyan-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon
                          icon="mdi:chart-donut"
                          className="w-5 h-5 text-cyan-500"
                        />
                        {t("return_on_investment")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center py-6">
                        <div className="relative">
                          <div
                            className={`w-32 h-32 rounded-full flex items-center justify-center ${
                              Number(pnlReport.roi.percent) >= 0
                                ? "bg-linear-to-br from-green-500/20 to-green-500/5"
                                : "bg-linear-to-br from-red-500/20 to-red-500/5"
                            }`}
                          >
                            <span
                              className={`text-3xl font-bold ${
                                Number(pnlReport.roi.percent) >= 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {Number(pnlReport.roi.percent) >= 0 ? "+" : ""}
                              {pnlReport.roi.percent}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            {t("initial_investment")}
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            {pnlReport.roi.initialInvestment.toLocaleString()}{" "}
                            {performance?.market?.pair || ""}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            {tExt("current_value")}
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            {pnlReport.roi.currentValue.toLocaleString()}{" "}
                            {performance?.market?.pair || ""}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trade Breakdown Card */}
                  <Card className="border-purple-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon
                          icon="mdi:swap-horizontal"
                          className="w-5 h-5 text-purple-500"
                        />
                        {t("trade_breakdown")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Win Rate Circle */}
                        <div className="flex items-center justify-center">
                          <div className="relative w-28 h-28">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="56"
                                cy="56"
                                r="48"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-secondary"
                              />
                              <circle
                                cx="56"
                                cy="56"
                                r="48"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${Number(winRate) * 3.01} 301`}
                                className="text-green-500"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xl font-bold text-foreground">
                                {winRate}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-secondary/50 rounded-xl text-center">
                            <p className="text-xs text-muted-foreground">
                              {tExt("total_trades")}
                            </p>
                            <p className="text-lg font-bold text-foreground">
                              {pnlReport.breakdown.tradeCount}
                            </p>
                          </div>
                          <div className="p-3 bg-green-500/10 rounded-xl text-center">
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Winning
                            </p>
                            <p className="text-lg font-bold text-green-500">
                              {pnlReport.breakdown.winningTrades}
                            </p>
                          </div>
                          <div className="p-3 bg-red-500/10 rounded-xl text-center">
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Losing
                            </p>
                            <p className="text-lg font-bold text-red-500">
                              {pnlReport.breakdown.losingTrades}
                            </p>
                          </div>
                          <div className="p-3 bg-secondary/50 rounded-xl text-center">
                            <p className="text-xs text-muted-foreground">
                              {t("avg_win_loss")}
                            </p>
                            <p className="text-sm font-bold">
                              <span className="text-green-500">
                                +{pnlReport.breakdown.avgWin.toFixed(2)}
                              </span>
                              <span className="text-muted-foreground mx-1">
                                /
                              </span>
                              <span className="text-red-500">
                                {pnlReport.breakdown.avgLoss.toFixed(2)}
                              </span>
                              <span className="text-muted-foreground ml-1 text-xs">
                                {performance?.market?.pair || ""}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* P&L History Table */}
                {pnlReport.history.length > 0 && (
                  <Card className="border-cyan-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon
                          icon="mdi:history"
                          className="w-5 h-5 text-amber-500"
                        />
                        {t("p_l_history")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground">
                                Date
                              </th>
                              <th className="text-right py-4 px-4 text-sm font-semibold text-muted-foreground">
                                {t("daily_p_l")}
                              </th>
                              <th className="text-right py-4 px-4 text-sm font-semibold text-muted-foreground">
                                Cumulative
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pnlReport.history
                              .slice(-10)
                              .reverse()
                              .map((entry, index) => (
                                <tr
                                  key={index}
                                  className="border-b last:border-0 hover:bg-secondary/50 transition-colors"
                                >
                                  <td className="py-4 px-4 text-sm text-foreground">
                                    {entry.date}
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    <span
                                      className={`inline-flex items-center gap-1 text-sm font-semibold ${
                                        entry.pnl >= 0
                                          ? "text-green-500"
                                          : "text-red-500"
                                      }`}
                                    >
                                      <Icon
                                        icon={
                                          entry.pnl >= 0
                                            ? "mdi:trending-up"
                                            : "mdi:trending-down"
                                        }
                                        className="w-4 h-4"
                                      />
                                      {entry.pnl >= 0 ? "+" : ""}
                                      {entry.pnl.toFixed(2)}{" "}
                                      {performance?.market?.pair || ""}
                                    </span>
                                  </td>
                                  <td
                                    className={`py-4 px-4 text-right text-sm font-semibold ${
                                      entry.cumulativePnl >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }`}
                                  >
                                    {entry.cumulativePnl >= 0 ? "+" : ""}
                                    {entry.cumulativePnl.toFixed(2)}{" "}
                                    {performance?.market?.pair || ""}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        ) : (
          <Card className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-6">
              <Icon
                icon="mdi:chart-box-outline"
                className="w-10 h-10 text-cyan-500"
              />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t("select_a_market")}
            </h3>
            <p className="text-muted-foreground">
              {t("choose_a_market_from_the_dropdown")}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
