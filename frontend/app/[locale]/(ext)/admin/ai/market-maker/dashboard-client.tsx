"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useRouter } from "@/i18n/routing";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { getCryptoImageUrl, handleImageError } from "@/utils/image-fallback";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";

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
  alerts?: string[];
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <Card className="relative overflow-hidden border bg-card">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-14 w-14 rounded-2xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border bg-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold tracking-tight text-foreground">
              {value}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  trend.positive ? "text-green-500" : "text-red-500"
                }`}
              >
                <Icon
                  icon={
                    trend.positive ? "mdi:trending-up" : "mdi:trending-down"
                  }
                  className="w-4 h-4"
                />
                <span>
                  {trend.positive ? "+" : ""}
                  {trend.value.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <div
            className={`flex items-center justify-center w-14 h-14 rounded-2xl ${iconBg} group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon icon={icon} className={`w-7 h-7 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MarketCard = ({
  market,
  onClick,
}: {
  market: any;
  onClick: () => void;
}) => {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const pnl =
    Number(market.pool?.realizedPnL || 0) +
    Number(market.pool?.unrealizedPnL || 0);
  const isPnlPositive = pnl >= 0;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return {
          color: "bg-green-500",
          text: "text-green-500",
          bg: "bg-green-500/10",
          pulse: true,
        };
      case "PAUSED":
        return {
          color: "bg-amber-500",
          text: "text-amber-500",
          bg: "bg-amber-500/10",
          pulse: false,
        };
      case "STOPPED":
        return {
          color: "bg-red-500",
          text: "text-red-500",
          bg: "bg-red-500/10",
          pulse: false,
        };
      default:
        return {
          color: "bg-cyan-500",
          text: "text-cyan-500",
          bg: "bg-cyan-500/10",
          pulse: true,
        };
    }
  };

  const statusConfig = getStatusConfig(market.status);

  return (
    <Card
      className="group cursor-pointer hover:shadow-xl transition-all duration-300 border hover:border-cyan-500/50 overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-cyan-500 via-purple-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shadow-lg overflow-hidden">
              <Image
                src={getCryptoImageUrl(market.market?.currency || "generic")}
                alt={market.market?.currency || "Token"}
                width={32}
                height={32}
                className="object-cover"
                onError={(e) => handleImageError(e, "/img/crypto/generic.webp")}
              />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                {market.market?.symbol || "Unknown"}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
            >
              {statusConfig.pulse && (
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusConfig.color} opacity-75`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.color}`}
                  />
                </span>
              )}
              {market.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {tExt("target_price")}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {market.targetPrice
                ? `${Number(market.targetPrice).toFixed(6)} ${market.market?.pair || ""}`
                : "Not set"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">TVL</p>
            <p className="text-sm font-semibold text-foreground">
              {Number(market.pool?.totalValueLocked || 0).toLocaleString()}{" "}
              {market.market?.pair || ""}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {tCommon("active_bots")}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {market.activeBots || 0}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">P&L</p>
            <p
              className={`text-sm font-semibold ${
                isPnlPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {isPnlPositive ? "+" : ""}
              {pnl.toFixed(2)} {market.market?.pair || ""}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon icon="mdi:clock-outline" className="w-3.5 h-3.5" />
            <span>
              Updated{" "}
              {new Date(market.updatedAt || Date.now()).toLocaleDateString()}
            </span>
          </div>
          <Icon
            icon="mdi:arrow-right"
            className="w-5 h-5 text-muted-foreground group-hover:text-cyan-500 group-hover:translate-x-1 transition-all"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardClient: React.FC = () => {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const response = await $fetch({
        url: "/api/admin/ai/market-maker/analytics/overview",
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
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleEmergencyStop = async () => {
    if (!confirm("Are you sure you want to stop ALL AI trading operations?")) {
      return;
    }
    try {
      await $fetch({
        url: "/api/admin/ai/market-maker/emergency/stop",
        method: "POST",
      });
      fetchOverview();
    } catch (err: any) {
      alert(err.message || "Failed to execute emergency stop");
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <Icon icon="mdi:alert-circle" className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {t("failed_to_load_dashboard")}
        </h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={fetchOverview}>
          <Icon icon="mdi:refresh" className="w-5 h-5 mr-2" />
          {tCommon("try_again")}
        </Button>
      </div>
    );
  }

  // Safely extract data with null checks
  const totalMarkets = data?.totalMarkets ?? 0;
  const activeMarkets = data?.activeMarkets ?? 0;
  const pausedMarkets = data?.marketsByStatus?.paused ?? 0;
  const stoppedMarkets = data?.marketsByStatus?.stopped ?? 0;
  const totalTVL = data?.totalTVL ?? 0;
  const total24hVolume = data?.total24hVolume ?? 0;
  const totalPnL = data?.totalPnL ?? 0;
  const pnlPercent = data?.pnlPercent ?? 0;
  const totalBots = data?.totalBots ?? 0;
  const activeBots = data?.activeBots ?? 0;
  const recentTradeCount = data?.recentTradeCount ?? 0;
  const markets = data?.markets ?? [];
  const alerts = data?.alerts ?? [];

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section with AI Theme */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: tCommon("ai_market_maker"),
          gradient: "from-cyan-100 to-purple-100 dark:from-cyan-950 dark:to-purple-950",
          iconColor: "text-cyan-500",
          textColor: "text-cyan-600 dark:text-cyan-400",
        }}
        title={[
          { text: "AI Market " },
          {
            text: "Maker",
            gradient:
              "from-cyan-600 via-purple-500 to-cyan-600 dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400",
          },
          { text: " Dashboard" },
        ]}
        description={tCommon("monitor_and_manage_ai_powered_market_makers")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContentAlign="center"
        background={{
          orbs: [
            {
              color: "#06b6d4", // cyan
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#a855f7", // purple
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => router.push("/admin/ai/market-maker/market/create")}
              className="bg-linear-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white shadow-lg font-semibold"
            >
              <Icon icon="mdi:plus" className="w-5 h-5 mr-2" />
              {tCommon("new_market_maker")}
            </Button>
            <Button
              onClick={handleEmergencyStop}
              variant="outline"
              className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-600"
            >
              <Icon icon="mdi:alert-octagon" className="w-5 h-5 mr-2" />
              {tCommon("emergency_stop")}
            </Button>
          </div>
        }
        bottomSlot={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title={tCommon("total_tvl")}
              value={`${(totalTVL / 1000).toFixed(1)}K`}
              subtitle={tCommon("total_value_locked")}
              icon="mdi:currency-usd"
              iconBg="bg-cyan-600"
              iconColor="text-white"
              loading={loading}
            />
            <StatCard
              title={`24h ${tCommon("volume")}`}
              value={`${(total24hVolume / 1000).toFixed(1)}K`}
              subtitle={tCommon("trading_volume")}
              icon="mdi:chart-line"
              iconBg="bg-purple-500"
              iconColor="text-white"
              loading={loading}
            />
            <StatCard
              title={tCommon("active_markets")}
              value={`${activeMarkets}/${totalMarkets}`}
              subtitle={`${pausedMarkets} paused, ${stoppedMarkets} stopped`}
              icon="mdi:store"
              iconBg="bg-cyan-600"
              iconColor="text-white"
              loading={loading}
            />
            <StatCard
              title={tCommon("active_bots")}
              value={`${activeBots}/${totalBots}`}
              subtitle={tCommon("currently_running")}
              icon="mdi:robot"
              iconBg="bg-purple-500"
              iconColor="text-white"
              loading={loading}
            />
          </div>
        }
      />

      {/* Main Content Container */}
      <div className="container mx-auto py-8 space-y-8">
        {/* Alerts */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Icon icon="mdi:alert" className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">
                      {tCommon("system_alerts")}
                    </h4>
                    <ul className="space-y-1">
                      {alerts.map((alert, index) => (
                        <li
                          key={`alert-${index}-${alert.slice(0, 30)}`}
                          className="text-sm text-muted-foreground flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {alert}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          <StatCard
            title={tCommon("total_p_l")}
            value={`${totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}`}
            icon="mdi:chart-line"
            iconBg={totalPnL >= 0 ? "bg-green-500" : "bg-red-500"}
            iconColor="text-white"
            trend={{
              value: pnlPercent,
              positive: pnlPercent >= 0,
            }}
            loading={loading}
          />
          <StatCard
            title={tCommon("recent_trades")}
            value={recentTradeCount}
            subtitle="Last 24 hours"
            icon="mdi:swap-horizontal"
            iconBg="bg-linear-to-br from-cyan-500 to-purple-500"
            iconColor="text-white"
            loading={loading}
          />
        </motion.div>

        {/* Market Status Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Icon
                  icon="mdi:chart-donut"
                  className="w-5 h-5 text-cyan-500"
                />
                {tCommon("market_status_overview")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500" />
                      Active
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {activeMarkets}
                    </span>
                  </div>
                  <Progress
                    value={
                      totalMarkets > 0 ? (activeMarkets / totalMarkets) * 100 : 0
                    }
                    className="h-2"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      Paused
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {pausedMarkets}
                    </span>
                  </div>
                  <Progress
                    value={
                      totalMarkets > 0 ? (pausedMarkets / totalMarkets) * 100 : 0
                    }
                    className="h-2"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                      Stopped
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {stoppedMarkets}
                    </span>
                  </div>
                  <Progress
                    value={
                      totalMarkets > 0 ? (stoppedMarkets / totalMarkets) * 100 : 0
                    }
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Markets Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {tCommon("your_markets")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tCommon("recent_market_makers_and_their_performance")}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/ai/market-maker/market")}
              className="border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/5"
            >
              {tCommon("view_all_markets")}
              <Icon icon="mdi:arrow-right" className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-xl" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : markets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.slice(0, 6).map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  onClick={() =>
                    router.push(`/admin/ai/market-maker/market/${market.id}`)
                  }
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-linear-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-6">
                <Icon
                  icon="mdi:chart-line-variant"
                  className="w-10 h-10 text-cyan-500"
                />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {tCommon("no_markets_yet")}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {t("create_your_first_ai_market_maker")}
              </p>
              <Button
                onClick={() =>
                  router.push("/admin/ai/market-maker/market/create")
                }
                size="lg"
                className="bg-linear-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
              >
                <Icon icon="mdi:plus" className="w-5 h-5 mr-2" />
                {tCommon("create_your_first_market")}
              </Button>
            </Card>
          )}
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
                  onClick={() =>
                    router.push("/admin/ai/market-maker/market/create")
                  }
                  className="group flex flex-col items-center p-6 rounded-2xl border-2 border-dashed border-border hover:border-cyan-500 hover:bg-cyan-500/5 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon icon="mdi:plus" className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {tCommon("new_market")}
                  </span>
                </button>

                <button
                  onClick={() => router.push("/admin/ai/market-maker/market")}
                  className="group flex flex-col items-center p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon icon="mdi:view-grid" className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {tCommon("all_markets")}
                  </span>
                </button>

                <button
                  onClick={() => router.push("/admin/ai/market-maker/analytics")}
                  className="group flex flex-col items-center p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-cyan-500 to-purple-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon
                      icon="mdi:chart-areaspline"
                      className="w-6 h-6 text-white"
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Analytics
                  </span>
                </button>

                <button
                  onClick={() => router.push("/admin/ai/market-maker/settings")}
                  className="group flex flex-col items-center p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon icon="mdi:cog" className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Settings
                  </span>
                </button>

                <button
                  onClick={() => router.push("/admin/ai/market-maker/guide")}
                  className="group flex flex-col items-center p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon
                      icon="mdi:book-open-variant"
                      className="w-6 h-6 text-white"
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Guide
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
