"use client";

import { useEffect, useState, useRef } from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SubscriptionLoading from "./loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Pause,
  Play,
  StopCircle,
  Plus,
  Loader2,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Wallet,
  Target,
  Zap,
  Shield,
  ExternalLink,
  Clock,
  ArrowUpRight,
  Sparkles,
  Trophy,
  ChevronDown,
  ChevronUp,
  Coins,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { formatPnL, formatAllocation } from "@/utils/currency";
import { HeroSection } from "@/components/ui/hero-section";
import { useTranslations } from "next-intl";

interface AllocationDetail {
  id: string;
  symbol: string;
  baseAmount: number;
  baseUsedAmount: number;
  quoteAmount: number;
  quoteUsedAmount: number;
  totalProfit: number;
  totalTrades: number;
  winRate: number;
  isActive: boolean;
}

interface Subscription {
  id: string;
  leaderId: string;
  copyMode: string;
  totalProfit: number;
  totalTrades: number;
  winRate: number;
  roi: number;
  status: string;
  createdAt: string;
  totalAllocatedUSDT?: number; // Calculated by backend using ECO prices
  allocations?: AllocationDetail[];
  leader?: {
    id: string;
    displayName: string;
    avatar?: string;
    tradingStyle: string;
    riskLevel: string;
    winRate: number;
    roi: number;
    user?: {
      avatar?: string;
    };
  };
}

const tradingStyleInfo: Record<string, { icon: any; color: string; bg: string }> = {
  SCALPING: { icon: Zap, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-500/20' },
  DAY_TRADING: { icon: BarChart3, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20' },
  SWING: { icon: TrendingUp, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-500/20' },
  POSITION: { icon: Shield, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-500/20' },
};

const riskConfig: Record<string, { color: string; bg: string }> = {
  LOW: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  MEDIUM: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  HIGH: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
};

export default function SubscriptionClient() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "pause" | "resume" | "stop";
    subscription: Subscription;
  } | null>(null);
  const [expandedAllocations, setExpandedAllocations] = useState<Set<string>>(new Set());

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchSubscriptions = async () => {
      try {
        const { data } = await $fetch({
          url: "/api/copy-trading/follower",
          method: "GET",
          silentSuccess: true,
        });
        setSubscriptions(data || []);
      } catch (error) {
        console.error("Failed to fetch subscriptions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const refetchSubscriptions = async () => {
    const { data } = await $fetch({
      url: "/api/copy-trading/follower",
      method: "GET",
      silentSuccess: true,
    });
    setSubscriptions(data || []);
  };

  const handleAction = async (
    action: "pause" | "resume" | "stop",
    subscriptionId: string
  ) => {
    setActionLoading(subscriptionId);
    const { error } = await $fetch({
      url: `/api/copy-trading/follower/${subscriptionId}/${action}`,
      method: "POST",
    });

    if (!error) {
      refetchSubscriptions();
    }
    setActionLoading(null);
    setConfirmAction(null);
  };

  const toggleAllocations = (subscriptionId: string) => {
    setExpandedAllocations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subscriptionId)) {
        newSet.delete(subscriptionId);
      } else {
        newSet.add(subscriptionId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Active
          </Badge>
        );
      case "PAUSED":
        return (
          <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0">
            <Pause className="h-3 w-3 mr-1" />
            Paused
          </Badge>
        );
      case "STOPPED":
        return (
          <Badge className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0">
            <StopCircle className="h-3 w-3 mr-1" />
            Stopped
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Calculate totals
  const totalMarkets = subscriptions.reduce((sum, s) => sum + (s.allocations?.filter(a => a.isActive).length || 0), 0);
  const totalProfit = subscriptions.reduce((sum, s) => sum + (s.totalProfit ?? 0), 0);
  const activeCount = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const totalTrades = subscriptions.reduce((sum, s) => sum + (s.totalTrades ?? 0), 0);
  const avgRoi = subscriptions.length > 0
    ? subscriptions.reduce((sum, s) => sum + (s.roi ?? 0), 0) / subscriptions.length
    : 0;
  const avgWinRate = subscriptions.length > 0
    ? subscriptions.reduce((sum, s) => sum + (s.winRate ?? 0), 0) / subscriptions.length
    : 0;

  // Calculate total allocated in USDT
  // Backend calculates this using ECO prices (getEcoPriceInUSD) for accurate conversion
  const totalAllocated = subscriptions.reduce((sum, s) => {
    return sum + (s.totalAllocatedUSDT || 0);
  }, 0);

  if (isLoading) {
    return <SubscriptionLoading />;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Header */}
      <HeroSection
        badge={{
          icon: <Users className="h-3.5 w-3.5" />,
          text: "My Subscriptions",
          gradient: "from-indigo-500/10 to-violet-500/10",
          iconColor: "text-indigo-500",
          textColor: "text-indigo-600 dark:text-indigo-400",
        }}
        title={[
          { text: "Active " },
          { text: "Subscriptions", gradient: "from-indigo-500 to-violet-500" },
        ]}
        description={t("monitor_and_manage_your_copy_trading")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContent={
          <div className="lg:mt-8">
            <Link href="/copy-trading/leader">
              <Button size="lg" className="rounded-xl w-full sm:w-auto">
                <Plus className="mr-2 h-5 w-5" />
                {t("follow_new_leader")}
              </Button>
            </Link>
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
        {/* Summary Cards */}
        {subscriptions.length > 0 && (
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
                    {formatAllocation(totalAllocated, "USDT")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Total Profit */}
            <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
              <CardContent className="p-5 relative">
                <div
                  className={`absolute inset-0 bg-linear-to-br ${
                    totalProfit >= 0
                      ? "from-emerald-500/5 to-transparent"
                      : "from-red-500/5 to-transparent"
                  }`}
                />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500">{tExt("total_profit")}</span>
                    <div
                      className={`p-1.5 rounded-lg ${
                        totalProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
                      }`}
                    >
                      {totalProfit >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      totalProfit >= 0
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-red-500 dark:text-red-400'
                    }`}
                  >
                    {formatPnL(totalProfit, "USDT").formatted}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Avg ROI */}
            <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
              <CardContent className="p-5 relative">
                <div
                  className={`absolute inset-0 bg-linear-to-br ${
                    avgRoi >= 0
                      ? "from-emerald-500/5 to-transparent"
                      : "from-red-500/5 to-transparent"
                  }`}
                />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500">{t("avg_roi")}</span>
                    <div
                      className={`p-1.5 rounded-lg ${
                        avgRoi >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
                      }`}
                    >
                      <Target className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      avgRoi >= 0
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-red-500 dark:text-red-400'
                    }`}
                  >
                    {avgRoi >= 0 ? "+" : ""}
                    {(avgRoi ?? 0).toFixed(2)}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Active Count */}
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
                    {activeCount}
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
                    {totalTrades.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Avg Win Rate */}
            <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
              <CardContent className="p-5 relative">
                <div className="absolute inset-0 bg-linear-to-br from-cyan-500/5 to-transparent" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500">{tCommon('avg_win_rate')}</span>
                    <div className="p-1.5 rounded-lg bg-cyan-500/10">
                      <Trophy className="h-3.5 w-3.5 text-cyan-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {(avgWinRate ?? 0).toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Subscriptions List */}
        {subscriptions.length > 0 ? (
          <div className="space-y-4">
            {subscriptions.map((subscription, idx) => {
              const leader = subscription.leader;
              if (!leader) return null;

              const avatar = leader.avatar || leader.user?.avatar;
              const initials = leader.displayName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              const styleInfo = tradingStyleInfo[leader.tradingStyle] || tradingStyleInfo.DAY_TRADING;
              const StyleIcon = styleInfo.icon;
              const risk = riskConfig[leader.riskLevel] || riskConfig.MEDIUM;
              const isPositiveRoi = (subscription.roi ?? 0) >= 0;

              return (
                <motion.div
                  key={subscription.id || `subscription-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                >
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Leader Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="relative">
                            <Avatar className="h-16 w-16 ring-2 ring-white dark:ring-zinc-800 shadow-lg">
                              <AvatarImage src={avatar} alt={leader.displayName} />
                              <AvatarFallback className="bg-linear-to-br from-indigo-500 via-violet-500 to-indigo-600 text-white text-lg font-bold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {subscription.status === "ACTIVE" && (
                              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-zinc-800 rounded-full" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Link href={`/copy-trading/leader/${leader.id}`}>
                                <h3 className="font-bold text-lg hover:text-primary transition-colors flex items-center gap-1.5 text-zinc-900 dark:text-white">
                                  {leader.displayName}
                                  <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                                </h3>
                              </Link>
                              {getStatusBadge(subscription.status)}
                            </div>

                            <div className="flex items-center flex-wrap gap-2">
                              <Badge className={`${styleInfo.bg} ${styleInfo.color} border-0`}>
                                <StyleIcon className="h-3 w-3 mr-1" />
                                {leader.tradingStyle.replace("_", " ")}
                              </Badge>
                              <Badge className={`${risk.bg} ${risk.color} border-0`}>
                                {leader.riskLevel}
                              </Badge>
                              <Badge variant="outline" className="text-zinc-500 border-zinc-200 dark:border-zinc-700">
                                <Target className="h-3 w-3 mr-1" />
                                {subscription.copyMode.replace("_", " ")}
                              </Badge>
                              <span className="text-xs text-zinc-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Since {new Date(subscription.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
                          <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                            <div className="text-xs text-zinc-500 mb-1">Markets</div>
                            <div className="text-lg font-bold text-zinc-900 dark:text-white">
                              {subscription.allocations?.filter(a => a.isActive).length || 0}
                            </div>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                            <div className="text-xs text-zinc-500 mb-1">Profit</div>
                            <div
                              className={`text-lg font-bold ${
                                (subscription.totalProfit ?? 0) >= 0
                                  ? 'text-emerald-500 dark:text-emerald-400'
                                  : 'text-red-500 dark:text-red-400'
                              }`}
                            >
                              {formatPnL(subscription.totalProfit ?? 0, "USDT").formatted}
                            </div>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                            <div className="text-xs text-zinc-500 mb-1">ROI</div>
                            <div
                              className={`text-lg font-bold flex items-center justify-center gap-1 ${
                                isPositiveRoi
                                  ? 'text-emerald-500 dark:text-emerald-400'
                                  : 'text-red-500 dark:text-red-400'
                              }`}
                            >
                              {isPositiveRoi ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              {(subscription.roi ?? 0).toFixed(2)}%
                            </div>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                            <div className="text-xs text-zinc-500 mb-1">Trades</div>
                            <div className="text-lg font-bold text-zinc-900 dark:text-white">
                              {subscription.totalTrades ?? 0}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 lg:border-l lg:pl-6 lg:border-zinc-200 dark:lg:border-zinc-700">
                          {subscription.status !== "STOPPED" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
                                  {actionLoading === subscription.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreVertical className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {subscription.status === "ACTIVE" ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setConfirmAction({
                                        type: "pause",
                                        subscription,
                                      })
                                    }
                                    className="gap-2"
                                  >
                                    <Pause className="h-4 w-4" />
                                    {t("pause_copying")}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setConfirmAction({
                                        type: "resume",
                                        subscription,
                                      })
                                    }
                                    className="gap-2"
                                  >
                                    <Play className="h-4 w-4" />
                                    {t("resume_copying")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 gap-2"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "stop",
                                      subscription,
                                    })
                                  }
                                >
                                  <StopCircle className="h-4 w-4" />
                                  {t("stop_subscription")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <Link href={`/copy-trading/leader/${leader.id}`}>
                            <Button
                              variant="outline"
                              className="rounded-xl gap-2 hover:bg-primary/5 hover:border-primary"
                            >
                              {tExt("view_leader")}
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Market Allocations Section */}
                      {subscription.allocations && subscription.allocations.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                          <button
                            onClick={() => toggleAllocations(subscription.id)}
                            className="flex items-center justify-between w-full text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg p-2 -m-2 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Coins className="h-4 w-4 text-indigo-500" />
                              <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                                {t("market_allocations")}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {subscription.allocations.length} markets
                              </Badge>
                            </div>
                            {expandedAllocations.has(subscription.id) ? (
                              <ChevronUp className="h-4 w-4 text-zinc-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-zinc-400" />
                            )}
                          </button>

                          {expandedAllocations.has(subscription.id) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 space-y-3"
                            >
                              {subscription.allocations.map((alloc) => {
                                const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");
                                const baseAvailable = (alloc.baseAmount ?? 0) - (alloc.baseUsedAmount ?? 0);
                                const quoteAvailable = (alloc.quoteAmount ?? 0) - (alloc.quoteUsedAmount ?? 0);
                                const baseUsedPercent = (alloc.baseAmount ?? 0) > 0
                                  ? ((alloc.baseUsedAmount ?? 0) / (alloc.baseAmount ?? 0)) * 100
                                  : 0;
                                const quoteUsedPercent = (alloc.quoteAmount ?? 0) > 0
                                  ? ((alloc.quoteUsedAmount ?? 0) / (alloc.quoteAmount ?? 0)) * 100
                                  : 0;

                                return (
                                  <div
                                    key={alloc.id}
                                    className={`p-4 rounded-xl border ${
                                      alloc.isActive
                                        ? "bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-700"
                                        : "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-600 opacity-60"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-zinc-900 dark:text-white">
                                          {alloc.symbol}
                                        </span>
                                        {!alloc.isActive && (
                                          <Badge variant="outline" className="text-xs text-zinc-500">
                                            Inactive
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4 text-sm">
                                        <span className="text-zinc-500">
                                          {alloc.totalTrades ?? 0} trades
                                        </span>
                                        <span className="text-zinc-500">
                                          {(alloc.winRate ?? 0).toFixed(1)}% win rate
                                        </span>
                                        <span
                                          className={`font-medium ${
                                            (alloc.totalProfit ?? 0) >= 0
                                              ? "text-emerald-500"
                                              : "text-red-500"
                                          }`}
                                        >
                                          {(alloc.totalProfit ?? 0) >= 0 ? "+" : ""}
                                          {(alloc.totalProfit ?? 0).toFixed(2)} {quoteCurrency}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      {/* Base Currency Allocation */}
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-zinc-500">
                                            {baseCurrency} (for SELL)
                                          </span>
                                          <span className="text-zinc-600 dark:text-zinc-400">
                                            {baseAvailable.toFixed(6)} / {(alloc.baseAmount ?? 0).toFixed(6)}
                                          </span>
                                        </div>
                                        <Progress value={baseUsedPercent} className="h-1.5" />
                                        <div className="flex justify-between text-xs text-zinc-400">
                                          <span>{t("used")} {(alloc.baseUsedAmount ?? 0).toFixed(6)}</span>
                                          <span>{baseUsedPercent.toFixed(1)}%</span>
                                        </div>
                                      </div>

                                      {/* Quote Currency Allocation */}
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-zinc-500">
                                            {quoteCurrency} (for BUY)
                                          </span>
                                          <span className="text-zinc-600 dark:text-zinc-400">
                                            {quoteAvailable.toFixed(2)} / {(alloc.quoteAmount ?? 0).toFixed(2)}
                                          </span>
                                        </div>
                                        <Progress value={quoteUsedPercent} className="h-1.5" />
                                        <div className="flex justify-between text-xs text-zinc-400">
                                          <span>{t("used")} {(alloc.quoteUsedAmount ?? 0).toFixed(2)}</span>
                                          <span>{quoteUsedPercent.toFixed(1)}%</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="py-20 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-linear-to-br from-indigo-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center">
                  <Users className="h-10 w-10 text-indigo-500" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{t("no_subscriptions_yet")}</h3>
                <p className="text-zinc-500 mb-8 max-w-md mx-auto">
                  {t("you_havent_subscribed_to_any_leaders_yet")} {t("start_following_top_traders_to_automatically")}
                </p>
                <Link href="/copy-trading/leader">
                  <Button size="lg">
                    <Sparkles className="h-5 w-5" />
                    {t("explore_leaders")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmAction?.type === "pause" && <Pause className="h-5 w-5 text-amber-500" />}
              {confirmAction?.type === "resume" && <Play className="h-5 w-5 text-emerald-500" />}
              {confirmAction?.type === "stop" && <StopCircle className="h-5 w-5 text-red-500" />}
              {confirmAction?.type === "pause"
                ? "Pause Subscription"
                : confirmAction?.type === "resume"
                ? "Resume Subscription"
                : "Stop Subscription"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "stop"
                ? "This will permanently stop copying trades from this leader. Your remaining funds will be returned to your wallet. This action cannot be undone."
                : confirmAction?.type === "pause"
                ? "Pausing will temporarily stop copying trades from this leader. You can resume anytime."
                : "Resume copying trades from this leader. New trades will be copied automatically."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmAction &&
                handleAction(confirmAction.type, confirmAction.subscription.id)
              }
              className={`rounded-xl ${
                confirmAction?.type === "stop"
                  ? "bg-red-600 hover:bg-red-700"
                  : confirmAction?.type === "resume"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : ""
              }`}
            >
              {confirmAction?.type === "pause" && "Pause"}
              {confirmAction?.type === "resume" && "Resume"}
              {confirmAction?.type === "stop" && "Stop Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
