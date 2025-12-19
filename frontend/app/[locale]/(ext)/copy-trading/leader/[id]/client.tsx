"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  ArrowLeft,
  Loader2,
  DollarSign,
  Activity,
  Target,
  Shield,
  Zap,
  Trophy,
  Clock,
  CheckCircle2,
  Star,
  Calendar,
  ArrowUpRight,
  Flame,
  Award,
  Percent,
  Wallet,
  LineChart,
  PieChart,
  TrendingDown as TrendDown,
  AlertTriangle,
  Sparkles,
  Copy,
  Share2,
  Eye,
  Settings,
  Edit3,
  BarChart2,
  Coins,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { formatPnL, formatAllocation, formatFiat } from "@/utils/currency";
import LeaderDetailLoading from "./loading";
import LeaderNotFoundState from "./not-found-state";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";

interface LeaderMarket {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  isActive: boolean;
}

interface Leader {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  tradingStyle: string;
  riskLevel: string;
  winRate: number;
  roi: number;
  totalFollowers: number;
  totalTrades: number;
  totalProfit: number;
  totalVolume: number;
  profitSharePercent: number;
  minFollowAmount: number;
  maxFollowers: number;
  avgTradeProfit?: number;
  avgTradeDuration?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  currency?: string;
  createdAt?: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  isFollowing?: boolean;
  followerId?: string;
  followerStatus?: "ACTIVE" | "PAUSED" | null;
  dailyStats?: any[];
  markets?: LeaderMarket[];
  recentTrades?: Array<{
    id: string;
    symbol: string;
    side: string;
    amount: number;
    price: number;
    profit?: number;
    profitPercent?: number;
    profitCurrency?: string;
    status: string;
    createdAt: string;
    closedAt?: string;
  }>;
}

const tradingStyleConfig: Record<
  string,
  { icon: any; color: string; bg: string; description: string }
> = {
  SCALPING: {
    icon: Zap,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-500/20",
    description: "Quick trades, small profits",
  },
  DAY_TRADING: {
    icon: BarChart3,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/20",
    description: "Intraday positions",
  },
  SWING: {
    icon: TrendingUp,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-500/20",
    description: "Multi-day holds",
  },
  POSITION: {
    icon: Shield,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-100 dark:bg-indigo-500/20",
    description: "Long-term strategy",
  },
};

const riskConfig: Record<
  string,
  { color: string; bg: string; gradient: string; label: string }
> = {
  LOW: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    gradient: "from-emerald-500 to-green-500",
    label: "Conservative",
  },
  MEDIUM: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    gradient: "from-amber-500 to-orange-500",
    label: "Moderate",
  },
  HIGH: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    gradient: "from-red-500 to-rose-500",
    label: "Aggressive",
  },
};

export default function LeaderDetailPage() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const params = useParams();
  const leaderId = params.id as string;
  const { user } = useUserStore();

  const [leader, setLeader] = useState<Leader | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchedLeaderIdRef = useRef<string | null>(null);

  // Determine if this is the user's own profile by comparing user store id with leader's userId
  const isOwnProfile = !!(user?.id && leader?.userId && user.id === leader.userId);

  useEffect(() => {
    if (fetchedLeaderIdRef.current === leaderId) return;
    fetchedLeaderIdRef.current = leaderId;

    const fetchLeader = async () => {
      const { data } = await $fetch({
        url: `/api/copy-trading/leader/${leaderId}`,
        method: "GET",
        silentSuccess: true,
      });
      setLeader(data);
      setIsLoading(false);
    };

    fetchLeader();
  }, [leaderId]);

  if (isLoading) {
    return <LeaderDetailLoading />;
  }

  if (!leader) {
    return <LeaderNotFoundState />;
  }

  const avatar = leader.avatar || leader.user?.avatar;
  const initials = leader.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isPositiveRoi = leader.roi >= 0;
  const styleInfo =
    tradingStyleConfig[leader.tradingStyle] || tradingStyleConfig.DAY_TRADING;
  const risk = riskConfig[leader.riskLevel] || riskConfig.MEDIUM;
  const StyleIcon = styleInfo.icon;
  const spotsLeft = leader.maxFollowers - leader.totalFollowers;
  const spotsPercent = (leader.totalFollowers / leader.maxFollowers) * 100;
  const isTopPerformer = leader.roi > 30;
  const avgProfit =
    leader.avgTradeProfit ||
    leader.totalProfit / Math.max(leader.totalTrades, 1);

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Banner */}
      <div className="pt-16 relative overflow-hidden border-b border-zinc-200/50 dark:border-zinc-800/50">
        {/* Gradient background */}
        <div
          className={`absolute inset-0 bg-linear-to-br ${risk.gradient} opacity-10`}
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80" />

        {/* Decorative elements */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute top-20 -left-20 w-60 h-60 bg-violet-500/20 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative py-8 md:py-12">
          {/* Main layout: two columns on desktop */}
          <div className="flex flex-col lg:flex-row lg:gap-8">
            {/* Left column: Back button + Profile */}
            <div className="flex-1 min-w-0">
              {/* Back button */}
              <Link
                href="/copy-trading/leader"
                className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors group mb-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
                {t("back_to_leaders")}
              </Link>

              {/* Profile header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-5">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-4 ring-white dark:ring-zinc-800 shadow-xl">
                      <AvatarImage src={avatar} alt={leader.displayName} />
                      <AvatarFallback className="text-2xl md:text-3xl bg-linear-to-br from-indigo-500 via-violet-500 to-indigo-600 text-white font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-zinc-800 rounded-full" />

                    {/* Top performer badge */}
                    {isTopPerformer && (
                      <div className="absolute -top-1 -right-1">
                        <div className="w-7 h-7 rounded-full bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                          <Trophy className="h-3.5 w-3.5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Name and badges */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
                        {leader.displayName}
                      </h1>
                      {isOwnProfile && (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          {tExt("your_profile")}
                        </Badge>
                      )}
                      {leader.isFollowing && !isOwnProfile && (
                        <Badge className="bg-primary/10 text-primary border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Following
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center flex-wrap gap-2 mb-3">
                      <Badge
                        className={`${styleInfo.bg} ${styleInfo.color} border-0`}
                      >
                        <StyleIcon className="h-3 w-3 mr-1" />
                        {leader.tradingStyle.replace("_", " ")}
                      </Badge>
                      <Badge className={`${risk.bg} ${risk.color} border-0`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {risk.label}
                      </Badge>
                      {leader.createdAt && (
                        <Badge
                          variant="outline"
                          className="text-zinc-500 border-zinc-300 dark:border-zinc-700"
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Since{" "}
                          {new Date(leader.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "short", year: "numeric" }
                          )}
                        </Badge>
                      )}
                    </div>

                    {leader.bio && (
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base max-w-xl">
                        {leader.bio}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right column: CTA Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 lg:mt-0 lg:w-80 shrink-0"
            >
              <Card className="relative overflow-hidden border-0 shadow-2xl bg-linear-to-br from-zinc-900 via-zinc-900 to-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
                {/* Decorative gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary via-violet-500 to-primary" />

                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-5" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                  backgroundSize: '24px 24px'
                }} />

                <CardContent className="relative p-6">
                  {isOwnProfile ? (
                    /* Owner View */
                    <>
                      {/* Header for owner */}
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium mb-3">
                          <Star className="h-3 w-3 fill-current" />
                          {t("your_leader_profile")}
                        </div>
                        <p className="text-lg text-white/70 mt-2">
                          {t("manage_your_copy_trading_profile")}
                        </p>
                      </div>

                      {/* Stats Grid for owner */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-xs text-white/50 mb-1">Followers</p>
                          <p className="text-xl font-bold text-white">
                            {leader.totalFollowers}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-xs text-white/50 mb-1">{tCommon("profit_share")}</p>
                          <p className="text-xl font-bold text-white">
                            {leader.profitSharePercent}%
                          </p>
                        </div>
                      </div>

                      {/* Capacity for owner */}
                      <div className="mb-6">
                        <div className="flex justify-between text-xs text-white/50 mb-2">
                          <span>{t("follower_capacity")}</span>
                          <span>{leader.totalFollowers} / {leader.maxFollowers}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${spotsPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Owner Action Buttons */}
                      <div className="space-y-3">
                        <Link href="/copy-trading/dashboard" className="block">
                          <Button className="w-full h-12 gap-2 bg-white text-zinc-900 hover:bg-white/90 font-semibold shadow-lg">
                            <BarChart2 className="h-4 w-4" />
                            {tCommon("view_dashboard")}
                          </Button>
                        </Link>
                        <Link href="/copy-trading/dashboard?tab=settings" className="block">
                          <Button
                            variant="outline"
                            className="w-full h-11 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                          >
                            <Settings className="h-4 w-4" />
                            {tExt("edit_profile")}
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    /* Visitor View */
                    <>
                      {/* Profit Share Header */}
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs font-medium mb-3">
                          <Percent className="h-3 w-3" />
                          {tCommon("profit_share")}
                        </div>
                        <p className="text-4xl font-bold text-white">
                          {leader.profitSharePercent}%
                        </p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-xs text-white/50 mb-1">{t("min_investment_1")}</p>
                          <p className="text-sm font-semibold text-white">
                            {formatAllocation(leader.minFollowAmount, "USDT")}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-xs text-white/50 mb-1">{t("available_spots")}</p>
                          <p className={`text-sm font-semibold ${spotsLeft <= 10 ? "text-amber-400" : "text-white"}`}>
                            {spotsLeft} / {leader.maxFollowers}
                          </p>
                        </div>
                      </div>

                      {/* Spots Progress */}
                      <div className="mb-6">
                        <div className="flex justify-between text-xs text-white/50 mb-2">
                          <span>Capacity</span>
                          <span>{Math.round(spotsPercent)}% filled</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-primary to-violet-500 rounded-full transition-all duration-500"
                            style={{ width: `${spotsPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* CTA Button */}
                      {leader.isFollowing ? (
                        <div className="space-y-2">
                          <Link href="/copy-trading/subscription" className="block">
                            <Button
                              variant="outline"
                              className="w-full h-12 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                            >
                              <Eye className="h-4 w-4" />
                              {tExt("view_subscription")}
                            </Button>
                          </Link>
                          {leader.followerStatus === "PAUSED" && (
                            <div className="text-xs text-center text-amber-400">
                              {t("your_subscription_is_currently_paused")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={`/copy-trading/leader/${leader.id}/follow`}
                          className="block"
                        >
                          <Button className="w-full h-12 gap-2 bg-white text-zinc-900 hover:bg-white/90 font-semibold shadow-lg">
                            <Copy className="h-4 w-4" />
                            {t("start_copying")}
                          </Button>
                        </Link>
                      )}

                      {/* Urgency Message */}
                      {spotsLeft <= 10 && spotsLeft > 0 && (
                        <div className="mt-4 flex items-center justify-center gap-1.5 text-amber-400">
                          <Flame className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">
                            Only {spotsLeft} {t("spots_remaining")}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Main Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {/* ROI Card */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div
                className={`absolute inset-0 bg-linear-to-br ${
                  isPositiveRoi
                    ? "from-emerald-500/5 to-transparent"
                    : "from-red-500/5 to-transparent"
                }`}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-zinc-500">
                    {t("total_roi")}
                  </span>
                  <div
                    className={`p-2 rounded-xl ${
                      isPositiveRoi ? "bg-emerald-500/10" : "bg-red-500/10"
                    }`}
                  >
                    {isPositiveRoi ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                <p
                  className={`text-3xl font-bold ${
                    isPositiveRoi ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {isPositiveRoi ? "+" : ""}
                  {leader.roi.toFixed(2)}%
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {t("all_time_return")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Win Rate Card */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-zinc-500">
                    {tCommon("win_rate")}
                  </span>
                  <div className="p-2 rounded-xl bg-blue-500/10">
                    <Target className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {leader.winRate.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {tCommon("success_rate")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Followers Card */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-zinc-500">Followers</span>
                  <div className="p-2 rounded-xl bg-purple-500/10">
                    <Users className="h-4 w-4 text-purple-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {leader.totalFollowers}
                </p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Capacity</span>
                    <span>
                      {leader.totalFollowers}/{leader.maxFollowers}
                    </span>
                  </div>
                  <Progress value={spotsPercent} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Trades Card */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-zinc-500">
                    {tExt("total_trades")}
                  </span>
                  <div className="p-2 rounded-xl bg-amber-500/10">
                    <Activity className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {leader.totalTrades.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {tExt("completed_trades")}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Detailed Stats Card */}
          <Card className="lg:col-span-2 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                {tExt("performance_metrics")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <DollarSign className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xl font-bold text-emerald-500">
                    {formatAllocation(leader.totalProfit || 0, "USDT")}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {tExt("total_profit")}
                  </p>
                </div>
                <div className="text-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <Wallet className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {formatFiat((leader.totalVolume || 0) / 1000, "USD", 1)}K
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {tExt("total_volume")}
                  </p>
                </div>
                <div className="text-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <LineChart className="h-5 w-5 text-purple-500 mx-auto mb-2" />
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {formatAllocation(avgProfit, "USDT")}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {t("avg_profit_trade")}
                  </p>
                </div>
                <div className="text-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {leader.maxDrawdown
                      ? `${leader.maxDrawdown.toFixed(1)}%`
                      : "N/A"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {t("max_drawdown")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card className="border-0 shadow-lg bg-linear-to-br from-primary/5 to-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                {t("quick_info")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StyleIcon className={`h-4 w-4 ${styleInfo.color}`} />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Style
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {leader.tradingStyle.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className={`h-4 w-4 ${risk.color}`} />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {tCommon("risk_level")}
                  </span>
                </div>
                <span className={`text-sm font-medium ${risk.color}`}>
                  {risk.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {tCommon("profit_share")}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {leader.profitSharePercent}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {t("min_investment_1")}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {formatAllocation(leader.minFollowAmount, "USDT")}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs defaultValue="trades" className="space-y-6">
            <TabsList className="bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
              <TabsTrigger
                value="trades"
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow"
              >
                <Activity className="h-4 w-4 mr-2" />
                {tCommon("recent_trades")}
              </TabsTrigger>
              <TabsTrigger
                value="markets"
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow"
              >
                <Coins className="h-4 w-4 mr-2" />
                Markets
                {leader.markets && leader.markets.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {leader.markets.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow"
              >
                <LineChart className="h-4 w-4 mr-2" />
                Performance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trades">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  {leader.recentTrades && leader.recentTrades.length > 0 ? (
                    <div className="space-y-3">
                      {leader.recentTrades.map((trade: any, idx: number) => (
                        <motion.div
                          key={trade.id || `trade-${idx}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                                trade.side === "BUY"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-red-500/10 text-red-500"
                              }`}
                            >
                              {trade.side === "BUY" ? "B" : "S"}
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-white">
                                {trade.symbol}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-zinc-500">
                                <Clock className="h-3 w-3" />
                                {new Date(
                                  trade.closedAt || trade.createdAt
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-lg font-bold ${
                                (trade.profit || 0) >= 0
                                  ? "text-emerald-500 dark:text-emerald-400"
                                  : "text-red-500 dark:text-red-400"
                              }`}
                            >
                              {
                                formatPnL(
                                  trade.profit || 0,
                                  trade.profitCurrency || "USDT"
                                ).formatted
                              }
                            </p>
                            <p
                              className={`text-sm ${
                                (trade.profitPercent || 0) >= 0
                                  ? "text-emerald-500 dark:text-emerald-400"
                                  : "text-red-500 dark:text-red-400"
                              }`}
                            >
                              {(trade.profitPercent || 0) >= 0 ? "+" : ""}
                              {(trade.profitPercent || 0).toFixed(2)}%
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                        <Activity className="h-8 w-8 text-zinc-400" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {tCommon("no_recent_trades")}
                      </h3>
                      <p className="text-zinc-500">
                        {t("this_leader_hasnt_completed_any_trades_yet")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="markets">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Coins className="h-5 w-5 text-primary" />
                    {t("trading_markets")}
                  </CardTitle>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t("markets_this_leader_actively_trades_on")}
                  </p>
                </CardHeader>
                <CardContent>
                  {leader.markets && leader.markets.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {leader.markets.map((market) => (
                        <div
                          key={market.id}
                          className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {market.baseCurrency.slice(0, 3)}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-white">
                                {market.symbol}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {market.baseCurrency} / {market.quoteCurrency}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                        <Coins className="h-8 w-8 text-zinc-400" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {t("no_markets_declared")}
                      </h3>
                      <p className="text-zinc-500">
                        {t("this_leader_hasnt_declared_any_trading_markets_yet")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  {leader.dailyStats && leader.dailyStats.length > 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <LineChart className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-500">
                          {t("performance_chart_coming_soon")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                        <LineChart className="h-8 w-8 text-zinc-400" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {t("no_performance_data")}
                      </h3>
                      <p className="text-zinc-500">
                        {t("performance_history_will_appear_here_as")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Bottom CTA - Only show for visitors who aren't following */}
        {!leader.isFollowing && !isOwnProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card className="border-0 shadow-xl bg-linear-to-r from-primary/10 via-purple-500/10 to-primary/10 overflow-hidden">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">
                      {t("ready_to_follow")} {leader.displayName}?
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {t("start_copying_trades_with_as_little_as")}{" "}
                      {formatAllocation(leader.minFollowAmount, "USDT")}
                    </p>
                  </div>
                  <Link href={`/copy-trading/leader/${leader.id}/follow`}>
                    <Button size="lg" className="h-14 px-8 rounded-xl gap-2">
                      <Star className="h-5 w-5" />
                      {t("start_following")}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
