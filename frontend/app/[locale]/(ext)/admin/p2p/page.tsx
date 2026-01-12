"use client";
import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import {
  Users,
  BarChart3,
  Shield,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  RefreshCw,
  Crown,
  Zap,
  Target,
  PieChart,
  CreditCard,
  Timer,
  Scale,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboardStore } from "@/store/p2p/admin-dashboard-store";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { motion } from "framer-motion";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// Premium glassmorphism card component
function GlassCard({
  children,
  className,
  gradient,
}: {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-card/50 backdrop-blur-xl",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        className
      )}
    >
      {gradient && (
        <div
          className={cn(
            "absolute inset-0 opacity-5",
            gradient
          )}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// Trade timeline chart
function TradeTimelineChart({
  data,
}: {
  data: { date: string; trades: number; volume: number; revenue: number }[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#volumeGradient)"
            name="Volume"
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            name="Revenue"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Currency distribution chart
function CurrencyDistChart({ data }: { data: { currency: string; count: number }[] }) {
  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444"];

  if (!data || data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-muted-foreground">
        No currencies available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex items-center gap-4">
      <div className="h-[180px] w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="count"
              style={{}}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${entry.currency}-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  style={{}}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
          </RechartsPie>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.slice(0, 5).map((item, index) => (
          <div key={item.currency} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm font-medium flex-1">{item.currency}</span>
            <span className="text-sm text-muted-foreground">
              {total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Offer type distribution mini chart
function OfferTypeChart({ buy, sell }: { buy: number; sell: number }) {
  const total = buy + sell;
  const buyPercent = total > 0 ? (buy / total) * 100 : 50;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span>Buy Offers</span>
        </div>
        <span className="font-semibold">{buy}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${buyPercent}%` }}
        />
        <div
          className="h-full bg-rose-500 transition-all duration-500"
          style={{ width: `${100 - buyPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span>Sell Offers</span>
        </div>
        <span className="font-semibold">{sell}</span>
      </div>
    </div>
  );
}

// Recent trades table
function RecentTradesTable({
  trades,
  loading,
}: {
  trades: any[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>No recent trades</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "PENDING":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "PAYMENT_SENT":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "CANCELLED":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "DISPUTED":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-2">
      {trades.map((trade) => (
        <Link
          key={trade.id}
          href={`/admin/p2p/trade/${trade.id}`}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
        >
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              trade.type === "BUY"
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-rose-500/10 text-rose-500"
            )}
          >
            {trade.type === "BUY" ? (
              <ArrowDownRight className="h-5 w-5" />
            ) : (
              <ArrowUpRight className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{trade.currency}</span>
              <Badge variant="outline" className={cn("text-xs", getStatusColor(trade.status))}>
                {trade.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {trade.buyer?.name || "Unknown"} → {trade.seller?.name || "Unknown"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">${trade.total?.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(trade.createdAt).toLocaleDateString()}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ))}
    </div>
  );
}

// Recent disputes
function RecentDisputesSection({
  disputes,
  loading,
}: {
  disputes: any[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!disputes || disputes.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500/50" />
        <p>No open disputes</p>
        <p className="text-sm">Great work keeping the platform healthy!</p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "MEDIUM":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <div className="space-y-2">
      {disputes.map((dispute) => (
        <Link
          key={dispute.id}
          href={`/admin/p2p/dispute/${dispute.id}`}
          className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
        >
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", getPriorityColor(dispute.priority))}>
                {dispute.priority}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {dispute.trade?.currency} - ${dispute.trade?.total?.toLocaleString() || 0}
              </span>
            </div>
            <p className="text-sm mt-1 line-clamp-1">{dispute.reason}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reported by {dispute.reportedBy?.name || "Unknown"}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-3" />
        </Link>
      ))}
    </div>
  );
}

// Top traders leaderboard
function TopTradersLeaderboard({
  traders,
  loading,
}: {
  traders: any[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!traders || traders.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Crown className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>No traders yet</p>
      </div>
    );
  }

  const getRankBadge = (index: number) => {
    if (index === 0) return <Crown className="h-4 w-4 text-amber-500" />;
    if (index === 1) return <span className="text-sm font-bold text-slate-400">2</span>;
    if (index === 2) return <span className="text-sm font-bold text-amber-700">3</span>;
    return <span className="text-sm text-muted-foreground">{index + 1}</span>;
  };

  return (
    <div className="space-y-2">
      {traders.map((trader, index) => (
        <div
          key={trader.id || index}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-colors",
            index === 0 && "bg-amber-500/5 border border-amber-500/10"
          )}
        >
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            {getRankBadge(index)}
          </div>
          <Avatar className="h-9 w-9">
            <AvatarImage src={trader.avatar} />
            <AvatarFallback>{trader.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{trader.name || "Anonymous"}</p>
            <p className="text-xs text-muted-foreground">{trader.tradeCount} trades</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-emerald-500">
              ${trader.totalVolume?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// System health gauge
function SystemHealthGauge({ score, status }: { score: number; status: string }) {
  const getColor = () => {
    if (score >= 90) return "text-emerald-500";
    if (score >= 70) return "text-amber-500";
    return "text-red-500";
  };

  const getGradient = () => {
    if (score >= 90) return "from-emerald-500 to-emerald-400";
    if (score >= 70) return "from-amber-500 to-amber-400";
    return "from-red-500 to-red-400";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-muted/30"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="url(#healthGradient)"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${score * 3.52} 352`}
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={score >= 90 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444"} />
              <stop offset="100%" stopColor={score >= 90 ? "#34d399" : score >= 70 ? "#fbbf24" : "#f87171"} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", getColor())}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <Badge className={cn("mt-3", `bg-gradient-to-r ${getGradient()} text-white border-0`)}>
        {status}
      </Badge>
    </div>
  );
}

// Quick action button
function QuickActionButton({
  icon: Icon,
  label,
  href,
  color,
}: {
  icon: any;
  label: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href} className="block">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer",
          "hover:shadow-lg hover:border-transparent",
          color
        )}
      >
        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <span className="font-medium">{label}</span>
        <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
      </motion.div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { stats, isLoadingStats, statsError, fetchStats } = useAdminDashboardStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "P2P Trading",
          gradient: "from-blue-500/20 via-violet-500/20 to-blue-500/20",
          iconColor: "text-blue-500",
          textColor: "text-blue-600 dark:text-blue-400",
        }}
        title={[
          { text: "P2P " },
          {
            text: "Admin",
            gradient:
              "from-blue-600 via-violet-500 to-blue-600 dark:from-blue-400 dark:via-violet-400 dark:to-blue-400",
          },
          { text: " Dashboard" },
        ]}
        description="Monitor and manage your peer-to-peer trading platform"
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        background={{
          orbs: [
            { color: "#3b82f6", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
            { color: "#8b5cf6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
          ],
        }}
        particles={{ count: 6, type: "floating", colors: ["#3b82f6", "#8b5cf6"], size: 8 }}
        rightContent={
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/admin/p2p/offer">
              <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg font-semibold">
                <DollarSign className="h-4 w-4 mr-2" />
                {t("manage_offers")}
              </Button>
            </Link>
            <Link href="/admin/p2p/trade">
              <Button variant="outline" className="border-blue-500/50 text-blue-600 hover:bg-blue-500/10">
                <BarChart3 className="h-4 w-4 mr-2" />
                {t("view_trades")}
              </Button>
            </Link>
          </div>
        }
        bottomSlot={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <StatsCard
              label={t("total_offers")}
              value={stats?.totalOffers || 0}
              icon={Users}
              change={stats?.offerGrowth}
              changeLabel="from yesterday"
              index={0}
              {...statsCardColors.blue}
            />
            <StatsCard
              label={tExt("active_trades")}
              value={stats?.activeTrades || 0}
              icon={BarChart3}
              change={stats?.tradeGrowth}
              changeLabel="from last week"
              index={1}
              {...statsCardColors.purple}
            />
            <StatsCard
              label={t("open_disputes")}
              value={stats?.openDisputes || 0}
              icon={Shield}
              change={stats?.disputeChange}
              changeLabel="from yesterday"
              index={2}
              {...statsCardColors.amber}
            />
            <StatsCard
              label={t("platform_revenue")}
              value={stats?.platformRevenue || "$0"}
              icon={DollarSign}
              change={stats?.revenueGrowth}
              changeLabel="from last month"
              index={3}
              {...statsCardColors.green}
            />
          </div>
        }
      />

      {/* Main Content */}
      <div className="container mx-auto py-8 space-y-6">
        {statsError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-destructive/15 p-4 text-destructive flex items-center gap-3"
          >
            <AlertTriangle className="h-5 w-5" />
            <p>{statsError}</p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => fetchStats()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </motion.div>
        )}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 lg:grid-cols-3"
        >
          {/* Left Column - Main Charts */}
          <motion.div variants={containerVariants} className="lg:col-span-2 space-y-6">
            {/* Trading Volume Chart */}
            <GlassCard gradient="bg-gradient-to-br from-blue-500/10 to-violet-500/10">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      Trading Overview
                    </CardTitle>
                    <CardDescription>Volume and revenue for the last 7 days</CardDescription>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">Volume</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground">Revenue</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <TradeTimelineChart data={stats?.tradeTimeline || []} />
                )}
              </CardContent>
            </GlassCard>

            {/* Stats Grid */}
            <motion.div variants={containerVariants} className="grid gap-6 md:grid-cols-3">
              {/* Completed Trades */}
              <GlassCard>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed Trades</p>
                      <div className="text-2xl font-bold mt-1">
                        {isLoadingStats ? (
                          <Skeleton className="h-8 w-20" />
                        ) : (
                          stats?.completedTrades?.toLocaleString() || 0
                        )}
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-emerald-500">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>All time</span>
                  </div>
                </CardContent>
              </GlassCard>

              {/* Total Volume */}
              <GlassCard>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Volume</p>
                      <div className="text-2xl font-bold mt-1">
                        {isLoadingStats ? (
                          <Skeleton className="h-8 w-24" />
                        ) : (
                          `$${(stats?.totalVolume || 0).toLocaleString()}`
                        )}
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Wallet className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground">
                      This week: ${(stats?.weekVolume || 0).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </GlassCard>

              {/* Average Trade */}
              <GlassCard>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Trade Value</p>
                      <div className="text-2xl font-bold mt-1">
                        {isLoadingStats ? (
                          <Skeleton className="h-8 w-20" />
                        ) : (
                          `$${(stats?.avgTradeValue || 0).toFixed(2)}`
                        )}
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <Target className="h-6 w-6 text-violet-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-muted-foreground">
                    <Scale className="h-4 w-4 mr-1" />
                    <span>Per completed trade</span>
                  </div>
                </CardContent>
              </GlassCard>
            </motion.div>

            {/* Recent Trades */}
            <GlassCard>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-500" />
                      Recent Trades
                    </CardTitle>
                    <CardDescription>Latest trading activity on the platform</CardDescription>
                  </div>
                  <Link href="/admin/p2p/trade">
                    <Button variant="ghost" size="sm">
                      View All
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <RecentTradesTable trades={stats?.recentTrades || []} loading={isLoadingStats} />
              </CardContent>
            </GlassCard>

            {/* Distribution Cards */}
            <motion.div variants={containerVariants} className="grid gap-6 md:grid-cols-2">
              {/* Currency Distribution */}
              <GlassCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieChart className="h-5 w-5 text-violet-500" />
                    Currency Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <Skeleton className="h-[180px] w-full" />
                  ) : (
                    <CurrencyDistChart data={stats?.currencyDist || []} />
                  )}
                </CardContent>
              </GlassCard>

              {/* Offer Type Distribution */}
              <GlassCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Active Offers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : (
                    <>
                      <OfferTypeChart
                        buy={stats?.offerTypeDist?.buy || 0}
                        sell={stats?.offerTypeDist?.sell || 0}
                      />
                      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Active</span>
                        <span className="font-semibold">{stats?.activeOffers || 0}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </GlassCard>
            </motion.div>
          </motion.div>

          {/* Right Column - Sidebar Widgets */}
          <motion.div variants={containerVariants} className="space-y-6">
            {/* System Health */}
            <GlassCard gradient="bg-gradient-to-br from-emerald-500/10 to-blue-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5 text-emerald-500" />
                  Platform Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="flex flex-col items-center py-4">
                    <Skeleton className="h-32 w-32 rounded-full" />
                    <Skeleton className="h-6 w-20 mt-3" />
                  </div>
                ) : (
                  <SystemHealthGauge
                    score={stats?.healthScore || 0}
                    status={stats?.systemHealth || "Unknown"}
                  />
                )}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Pending</p>
                    <p className="font-semibold">{stats?.pendingVerifications || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Flagged</p>
                    <p className="font-semibold">{stats?.flaggedOffers || 0}</p>
                  </div>
                </div>
              </CardContent>
            </GlassCard>

            {/* Top Traders */}
            <GlassCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Top Traders
                </CardTitle>
                <CardDescription>By trading volume</CardDescription>
              </CardHeader>
              <CardContent>
                <TopTradersLeaderboard traders={stats?.topTraders || []} loading={isLoadingStats} />
              </CardContent>
            </GlassCard>

            {/* Recent Disputes */}
            <GlassCard gradient="bg-gradient-to-br from-rose-500/10 to-amber-500/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-5 w-5 text-rose-500" />
                      Open Disputes
                    </CardTitle>
                  </div>
                  {stats?.disputeStats?.highPriority ? (
                    <Badge variant="destructive" className="animate-pulse">
                      {stats.disputeStats.highPriority} High Priority
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <RecentDisputesSection disputes={stats?.recentDisputes || []} loading={isLoadingStats} />
                {(stats?.openDisputes || 0) > 0 && (
                  <Link href="/admin/p2p/dispute" className="block mt-4">
                    <Button variant="outline" className="w-full">
                      View All Disputes
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-blue-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickActionButton
                  icon={Eye}
                  label="Review Pending Offers"
                  href="/admin/p2p/offer?status=PENDING_APPROVAL"
                  color="bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/10"
                />
                <QuickActionButton
                  icon={AlertTriangle}
                  label="Investigate Flagged"
                  href="/admin/p2p/offer?flagged=true"
                  color="bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/10"
                />
                <QuickActionButton
                  icon={CreditCard}
                  label="Payment Methods"
                  href="/admin/p2p/payment-method"
                  color="bg-violet-500/5 hover:bg-violet-500/10 border-violet-500/10"
                />
              </CardContent>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
