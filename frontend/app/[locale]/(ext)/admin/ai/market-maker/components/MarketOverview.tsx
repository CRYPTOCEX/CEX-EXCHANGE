"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Sliders,
  Droplets,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Play,
  Square,
  RefreshCw,
  Zap,
  Target,
  Gauge,
  Wallet,
  BarChart3,
} from "lucide-react";
import type { LiveEvent } from "./BotManagement";
import { useTranslations } from "next-intl";

interface MarketOverviewProps {
  data: any;
  onRefresh: () => void;
  liveEvents?: LiveEvent[];
}

interface OverviewCardProps {
  title: string;
  icon: React.ElementType;
  gradient: string;
  children: React.ReactNode;
  highlight?: boolean; // Cards with dynamic highlight colors (like P&L) don't need borders
}

function OverviewCard({ title, icon: IconComponent, gradient, children, highlight }: OverviewCardProps) {
  // Cards with gradient backgrounds don't need borders as they are visually distinct
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          <CardTitle className="text-base font-semibold text-foreground">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

interface StatRowProps {
  label: string;
  value: string | React.ReactNode;
  highlight?: "success" | "danger" | "warning" | "info";
}

function StatRow({ label, value, highlight }: StatRowProps) {
  const highlightClasses = {
    success: "text-success dark:text-green-400",
    danger: "text-destructive dark:text-red-400",
    warning: "text-warning dark:text-yellow-400",
    info: "text-blue-500 dark:text-blue-400",
  };

  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? highlightClasses[highlight] : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ data, liveEvents = [] }) => {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const pool = data.pool || {};
  const totalPnL = Number(pool.realizedPnL || 0) + Number(pool.unrealizedPnL || 0);
  const realizedPnL = Number(pool.realizedPnL || 0);
  const unrealizedPnL = Number(pool.unrealizedPnL || 0);
  const volumeUsage = data.maxDailyVolume && Number(data.maxDailyVolume) > 0
    ? (Number(data.currentDailyVolume || 0) / Number(data.maxDailyVolume)) * 100
    : 0;
  const quoteCurrency = data.market?.pair || "";
  const baseCurrency = data.market?.currency || "";

  return (
    <div className="space-y-6">
      {/* Top Row - Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Price Info */}
        <OverviewCard
          title={t("price_settings")}
          icon={Target}
          gradient="from-purple-500 to-purple-600"
        >
          <div className="space-y-1 divide-y divide-border">
            <StatRow
              label={tExt("target_price")}
              value={`${Number(data.targetPrice || 0).toFixed(6)} ${quoteCurrency}`}
            />
            <StatRow
              label={t("range_low")}
              value={`${Number(data.priceRangeLow || 0).toFixed(6)} ${quoteCurrency}`}
            />
            <StatRow
              label={t("range_high")}
              value={`${Number(data.priceRangeHigh || 0).toFixed(6)} ${quoteCurrency}`}
            />
          </div>
          {/* Price Range Visualization */}
          <div className="mt-4 pt-4 border-t border-border">
            {(() => {
              const targetPrice = Number(data.targetPrice || 0);
              const rangeLow = Number(data.priceRangeLow || 0);
              const rangeHigh = Number(data.priceRangeHigh || 0);
              const rangePercent = targetPrice > 0
                ? ((rangeHigh - rangeLow) / targetPrice) * 100
                : 0;
              const lowPercent = targetPrice > 0
                ? ((targetPrice - rangeLow) / targetPrice) * 100
                : 0;
              return (
                <>
                  <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                      style={{
                        left: `${Math.max(0, 50 - lowPercent)}%`,
                        width: `${Math.min(100, rangePercent)}%`,
                      }}
                    />
                    <div
                      className="absolute h-full w-1 bg-white shadow-lg rounded-full"
                      style={{ left: "50%", transform: "translateX(-50%)" }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>-{lowPercent.toFixed(0)}%</span>
                    <span>Target</span>
                    <span>+{(rangePercent - lowPercent).toFixed(0)}%</span>
                  </div>
                </>
              );
            })()}
          </div>
        </OverviewCard>

        {/* Trading Config */}
        <OverviewCard
          title={t("trading_config")}
          icon={Sliders}
          gradient="from-purple-500 to-purple-600"
        >
          <div className="space-y-4">
            {/* Aggression Level */}
            <div>
              {(() => {
                const aggressionMap: Record<string, { level: number; color: string }> = {
                  CONSERVATIVE: { level: 30, color: "from-green-400 to-green-600" },
                  MODERATE: { level: 60, color: "from-purple-400 to-purple-600" },
                  AGGRESSIVE: { level: 100, color: "from-red-400 to-red-600" },
                };
                const aggression = aggressionMap[data.aggressionLevel] || aggressionMap.MODERATE;
                return (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">{t("aggression_level")}</span>
                      <span className={`text-sm font-bold ${
                        data.aggressionLevel === "CONSERVATIVE" ? "text-green-500 dark:text-green-400" :
                        data.aggressionLevel === "AGGRESSIVE" ? "text-red-500 dark:text-red-400" :
                        "text-purple-500 dark:text-purple-400"
                      }`}>{data.aggressionLevel}</span>
                    </div>
                    <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${aggression.color} rounded-full transition-all duration-500`}
                        style={{ width: `${aggression.level}%` }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Real Liquidity */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">{t("real_liquidity")}</span>
                <span className="text-sm font-bold text-purple-500 dark:text-purple-400">{data.realLiquidityPercent}%</span>
              </div>
              <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${data.realLiquidityPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <StatRow
                label={t("max_daily_volume")}
                value={`${Number(data.maxDailyVolume).toLocaleString()} ${quoteCurrency}`}
              />
            </div>
          </div>
        </OverviewCard>

        {/* Pool Summary */}
        <OverviewCard
          title={t("pool_summary")}
          icon={Droplets}
          gradient="from-purple-500 to-purple-600"
        >
          <div className="space-y-1 divide-y divide-border">
            <StatRow
              label={t("base_balance")}
              value={`${Number(pool.baseBalance || 0).toFixed(4)} ${baseCurrency}`}
            />
            <StatRow
              label={t("quote_balance")}
              value={`${Number(pool.quoteBalance || 0).toFixed(4)} ${quoteCurrency}`}
            />
          </div>
          {/* TVL Highlight */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{tCommon("total_value_locked")}</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Number(pool.totalValueLocked || 0).toLocaleString()} {quoteCurrency}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-purple-500/30" />
            </div>
          </div>
        </OverviewCard>

        {/* P&L Summary */}
        <OverviewCard
          title={t("p_l_summary")}
          icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
          gradient={totalPnL >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600"}
          highlight
        >
          <div className="space-y-1 divide-y divide-border">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">{t("realized_p_l")}</span>
              <div className="flex items-center gap-1">
                {realizedPnL >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-success dark:text-green-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-destructive dark:text-red-400" />
                )}
                <span className={`font-medium ${realizedPnL >= 0 ? "text-success dark:text-green-400" : "text-destructive dark:text-red-400"}`}>
                  {realizedPnL >= 0 ? "+" : ""}{realizedPnL.toFixed(2)} {quoteCurrency}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">{t("unrealized_p_l")}</span>
              <div className="flex items-center gap-1">
                {unrealizedPnL >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-success dark:text-green-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-destructive dark:text-red-400" />
                )}
                <span className={`font-medium ${unrealizedPnL >= 0 ? "text-success dark:text-green-400" : "text-destructive dark:text-red-400"}`}>
                  {unrealizedPnL >= 0 ? "+" : ""}{unrealizedPnL.toFixed(2)} {quoteCurrency}
                </span>
              </div>
            </div>
          </div>
          {/* Total P&L Highlight */}
          <div className={`mt-4 p-4 rounded-xl ${totalPnL >= 0 ? "bg-green-500/10 dark:bg-green-500/20" : "bg-red-500/10 dark:bg-red-500/20"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{tCommon("total_p_l")}</p>
                <p className={`text-2xl font-bold ${totalPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)} {quoteCurrency}
                </p>
              </div>
              {totalPnL >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-500/30" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500/30" />
              )}
            </div>
          </div>
        </OverviewCard>

        {/* Safety Settings */}
        <OverviewCard
          title={t("safety_settings")}
          icon={Shield}
          gradient="from-amber-500 to-amber-600"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  data.volatilityPauseEnabled ? "bg-green-500/20 dark:bg-green-500/30" : "bg-muted"
                }`}>
                  <Shield className={`w-5 h-5 ${data.volatilityPauseEnabled ? "text-green-500" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t("volatility_pause")}</p>
                  <p className="text-xs text-muted-foreground">{t("auto_pause_on_high_volatility")}</p>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                data.volatilityPauseEnabled
                  ? "bg-green-500/20 text-green-600 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}>
                {data.volatilityPauseEnabled ? "Enabled" : "Disabled"}
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">{t("volatility_threshold")}</span>
                <span className="text-sm font-bold text-amber-500 dark:text-amber-400">{data.volatilityThreshold}%</span>
              </div>
              <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(data.volatilityThreshold, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </OverviewCard>

        {/* Volume Stats */}
        <OverviewCard
          title={t("volume_stats")}
          icon={BarChart3}
          gradient="from-purple-500 to-purple-600"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10 dark:bg-purple-500/20">
                <p className="text-xs text-muted-foreground mb-1">{`24h ${tCommon('volume')}`}</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {Number(data.currentDailyVolume || 0).toLocaleString()} {quoteCurrency}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">{t("volume_limit")}</p>
                <p className="text-lg font-bold text-foreground">
                  {Number(data.maxDailyVolume).toLocaleString()} {quoteCurrency}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">{t("daily_usage")}</span>
                <span className={`text-sm font-bold ${
                  volumeUsage > 90 ? "text-red-500 dark:text-red-400" :
                  volumeUsage > 70 ? "text-amber-500 dark:text-amber-400" :
                  "text-green-500 dark:text-green-400"
                }`}>
                  {volumeUsage.toFixed(1)}%
                </span>
              </div>
              <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    volumeUsage > 90 ? "bg-gradient-to-r from-red-400 to-red-600" :
                    volumeUsage > 70 ? "bg-gradient-to-r from-amber-400 to-amber-600" :
                    "bg-gradient-to-r from-green-400 to-green-600"
                  }`}
                  style={{ width: `${Math.min(volumeUsage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </OverviewCard>
      </div>

      {/* Live Events */}
      {liveEvents.length > 0 && (
        <Card className="border-0 shadow-lg overflow-hidden dark:border dark:border-slate-700">
          <CardHeader className="bg-gradient-to-r from-green-500/20 to-green-600/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                {t("live_events")}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-64 overflow-y-auto">
            <div className="divide-y divide-border">
              {liveEvents.slice(0, 10).map((event, index) => {
                const eventConfig: Record<string, { icon: React.ElementType; bg: string; color: string; label: string }> = {
                  TRADE: { icon: RefreshCw, bg: "bg-blue-500/10 dark:bg-blue-500/20", color: "text-blue-500", label: "Trade Executed" },
                  ORDER: { icon: Zap, bg: "bg-purple-500/10 dark:bg-purple-500/20", color: "text-purple-500", label: "Order Placed" },
                  STATUS_CHANGE: { icon: Activity, bg: "bg-amber-500/10 dark:bg-amber-500/20", color: "text-amber-500", label: "Status Changed" },
                  BOT_UPDATE: { icon: Activity, bg: "bg-cyan-500/10 dark:bg-cyan-500/20", color: "text-cyan-500", label: "Bot Updated" },
                  BOT_ACTIVITY: { icon: Activity, bg: "bg-cyan-500/10 dark:bg-cyan-500/20", color: "text-cyan-500", label: "Bot Activity" },
                  POOL_UPDATE: { icon: Droplets, bg: "bg-indigo-500/10 dark:bg-indigo-500/20", color: "text-indigo-500", label: "Pool Updated" },
                  ERROR: { icon: Activity, bg: "bg-red-500/10 dark:bg-red-500/20", color: "text-red-500", label: "Error" },
                };
                const config = eventConfig[event.type] || eventConfig.TRADE;
                const EventIcon = config.icon;

                const getEventDetails = () => {
                  if (event.type === "TRADE" && event.data?.side && event.data?.amount && event.data?.price) {
                    return `${event.data.side} ${Number(event.data.amount).toFixed(4)} @ ${Number(event.data.price).toFixed(6)}`;
                  } else if (event.type === "ORDER" && event.data?.side && event.data?.amount && event.data?.price) {
                    return `${event.data.side} ${Number(event.data.amount).toFixed(4)} @ ${Number(event.data.price).toFixed(6)}`;
                  } else if (event.type === "STATUS_CHANGE") {
                    return event.data?.status || event.data?.newStatus || "Status updated";
                  } else if (event.type === "BOT_UPDATE" || event.type === "BOT_ACTIVITY") {
                    const action = event.data?.action || "Activity";
                    const botName = event.data?.botName || "";
                    const details = event.data?.details;
                    if (details?.side && details?.amount && details?.price) {
                      return `${botName ? botName + ": " : ""}${details.side} ${Number(details.amount).toFixed(4)} @ ${Number(details.price).toFixed(6)}`;
                    }
                    return `${botName ? botName + ": " : ""}${action}`;
                  } else if (event.type === "POOL_UPDATE") {
                    return event.data?.message || "Pool updated";
                  } else if (event.type === "ERROR") {
                    return event.data?.message || event.data?.error || "An error occurred";
                  }
                  // Fallback: try to show something meaningful
                  if (event.data?.message) return event.data.message;
                  if (event.data?.action) return event.data.action;
                  return "Event received";
                };

                return (
                  <div
                    key={`${event.timestamp}-${index}`}
                    className="flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors animate-in slide-in-from-top-2 duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                        <EventIcon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {config.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getEventDetails()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="border-0 shadow-lg overflow-hidden dark:border dark:border-slate-700">
        <CardHeader className="bg-gradient-to-r from-secondary/50 to-secondary">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 shadow-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-base font-semibold text-foreground">
              {tCommon("recent_activity")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentActivity && data.recentActivity.length > 0 ? (
            <div className="divide-y divide-border">
              {data.recentActivity.slice(0, 10).map((activity: any, index: number) => {
                const actionConfig: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
                  TRADE: { icon: RefreshCw, bg: "bg-blue-500/10 dark:bg-blue-500/20", color: "text-blue-500" },
                  START: { icon: Play, bg: "bg-green-500/10 dark:bg-green-500/20", color: "text-green-500" },
                  STOP: { icon: Square, bg: "bg-red-500/10 dark:bg-red-500/20", color: "text-red-500" },
                  DEPOSIT: { icon: ArrowUpRight, bg: "bg-green-500/10 dark:bg-green-500/20", color: "text-green-500" },
                  WITHDRAW: { icon: ArrowDownRight, bg: "bg-amber-500/10 dark:bg-amber-500/20", color: "text-amber-500" },
                  DEFAULT: { icon: Zap, bg: "bg-muted", color: "text-muted-foreground" },
                };
                const config = actionConfig[activity.action] || actionConfig.DEFAULT;
                const ActionIcon = config.icon;

                // Get display amount - for DEPOSIT/WITHDRAW show actual amount, otherwise show price
                const getDisplayValue = () => {
                  if (activity.action === "DEPOSIT" || activity.action === "WITHDRAW") {
                    const amount = activity.details?.amount;
                    const currency = activity.details?.currency === "BASE" ? baseCurrency : quoteCurrency;
                    const currencySymbol = activity.details?.currencySymbol || currency;
                    return amount ? `${Number(amount).toFixed(6)} ${currencySymbol}` : `${Number(activity.poolValueAtAction || 0).toFixed(2)} ${quoteCurrency}`;
                  }
                  return `${Number(activity.priceAtAction).toFixed(6)} ${quoteCurrency}`;
                };

                // Get subtitle based on action type
                const getSubtitle = () => {
                  if (activity.action === "DEPOSIT" || activity.action === "WITHDRAW") {
                    return activity.details?.currency === "BASE" ? "Base currency" : "Quote currency";
                  }
                  return activity.details?.type || activity.details?.reason || "System action";
                };

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
                        <ActionIcon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getSubtitle()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {getDisplayValue()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="p-4 rounded-full bg-secondary mb-4">
                <Clock className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-medium">{tExt("no_recent_activity")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("activity_will_appear_here_once_the")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketOverview;
