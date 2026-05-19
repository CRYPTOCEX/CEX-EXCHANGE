"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  AlertTriangle,
  BarChart3,
  Settings,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Crown,
  Target,
  Zap,
  Shield,
  Eye,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  LineChart,
  ChevronRight,
  CircleDot,
  Flame,
  Trophy,
  Star,
  Timer,
  XCircle,
  Play,
  MoreHorizontal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { motion, AnimatePresence } from "framer-motion";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { cn } from "@/lib/utils";
import { useCopyTradingAdminDashboardStore } from "@/store/copy-trading/admin-dashboard-store";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
} from "recharts";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

// Premium Card Component
function PremiumCard({
  children,
  className,
  hover = true,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "purple" | "blue" | "green" | "amber" | "rose";
}) {
  const glowColors = {
    purple: "before:bg-purple-500/20",
    blue: "before:bg-blue-500/20",
    green: "before:bg-emerald-500/20",
    amber: "before:bg-amber-500/20",
    rose: "before:bg-rose-500/20",
  };

  return (
    <motion.div
      variants={fadeInUp}
      className={cn(
        "relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_2px_20px_rgba(0,0,0,0.1)]",
        hover && "transition-all duration-300 hover:border-white/[0.15] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_8px_40px_rgba(0,0,0,0.15)]",
        glow && `before:absolute before:inset-0 before:rounded-2xl before:blur-3xl before:opacity-30 before:-z-10 ${glowColors[glow]}`,
        className
      )}
    >
      {children}
    </motion.div>
  );
}

// Performance Chart Component
function PerformanceChart({
  data,
  isLoading,
}: {
  data: { date: string; trades: number; volume: number; profit: number }[];
  isLoading: boolean;
}) {
  const t = useTranslations("ext_admin");
  const [activeMetric, setActiveMetric] = useState<"volume" | "profit" | "trades">("volume");

  if (isLoading) {
    return <Skeleton className="h-[280px] w-full rounded-xl" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>{t("no_trading_data_available")}</p>
        </div>
      </div>
    );
  }

  const metrics = [
    { key: "volume", label: "Volume", color: "#8b5cf6" },
    { key: "profit", label: "Profit", color: "#10b981" },
    { key: "trades", label: "Trades", color: "#f59e0b" },
  ];

  return (
    <div className="space-y-4">
      {/* Metric Toggle */}
      <div className="flex items-center gap-2">
        {metrics.map((metric) => (
          <button
            key={metric.key}
            onClick={() => setActiveMetric(metric.key as any)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeMetric === metric.key
                ? "bg-white/10 text-white"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: metric.color }}
              />
              {metric.label}
            </span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={metrics.find(m => m.key === activeMetric)?.color}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={metrics.find(m => m.key === activeMetric)?.color}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(value) => activeMetric === "trades" ? value : `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              formatter={(value: number) => [
                activeMetric === "trades" ? value : `$${value.toLocaleString()}`,
                metrics.find(m => m.key === activeMetric)?.label
              ]}
            />
            <Area
              type="monotone"
              dataKey={activeMetric}
              stroke={metrics.find(m => m.key === activeMetric)?.color}
              strokeWidth={2.5}
              fill="url(#chartGradient)"
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Leader Card Component
function LeaderCard({
  leader,
  rank,
}: {
  leader: any;
  rank: number;
}) {
  const getRankIcon = () => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-amber-400" />;
    if (rank === 2) return <Trophy className="h-4 w-4 text-slate-300" />;
    if (rank === 3) return <Trophy className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "LOW": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "MEDIUM": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
      case "HIGH": return "text-rose-400 bg-rose-400/10 border-rose-400/20";
      default: return "text-muted-foreground bg-muted/50";
    }
  };

  return (
    <Link href={`/admin/copy-trading/leader/${leader.id}`}>
      <motion.div
        whileHover={{ x: 4 }}
        className={cn(
          "group flex items-center gap-2 p-3 rounded-xl transition-all cursor-pointer",
          "hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06]",
          rank === 1 && "bg-gradient-to-r from-amber-500/5 to-transparent border-amber-500/10"
        )}
      >
        <div className="h-7 w-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          {getRankIcon()}
        </div>

        <Avatar className="h-9 w-9 border-2 border-white/10 shrink-0">
          <AvatarImage src={leader.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
            {leader.displayName?.[0] || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="font-semibold text-sm truncate flex items-center gap-1.5">
            <span className="truncate">{leader.displayName || "Anonymous"}</span>
            {rank === 1 && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0", getRiskColor(leader.riskLevel))}>
              {leader.riskLevel}
            </span>
            <span className="text-xs text-muted-foreground truncate">{leader.followerCount} followers</span>
          </div>
        </div>

        <div className="text-right shrink-0 pl-2">
          <p className={cn("font-bold text-sm", parseFloat(leader.winRate) >= 50 ? "text-emerald-400" : "text-rose-400")}>
            {leader.winRate}%
          </p>
          <p className="text-[10px] text-muted-foreground">{leader.totalTrades} trades</p>
        </div>
      </motion.div>
    </Link>
  );
}

// Trade Row Component
function TradeRow({ trade }: { trade: any }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "CLOSED":
        return { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" };
      case "OPEN":
        return { icon: Play, color: "text-blue-400", bg: "bg-blue-400/10" };
      case "PENDING":
      case "PENDING_REPLICATION":
        return { icon: Timer, color: "text-amber-400", bg: "bg-amber-400/10" };
      case "FAILED":
      case "REPLICATION_FAILED":
        return { icon: XCircle, color: "text-rose-400", bg: "bg-rose-400/10" };
      default:
        return { icon: CircleDot, color: "text-muted-foreground", bg: "bg-muted/50" };
    }
  };

  const statusConfig = getStatusConfig(trade.status);
  const StatusIcon = statusConfig.icon;
  const quoteCurrency = trade.symbol?.split("/")?.[1] || "USDT";

  return (
    <div className="group flex items-center gap-2 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
      <div className={cn(
        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
        trade.side === "BUY" ? "bg-emerald-500/10" : "bg-rose-500/10"
      )}>
        {trade.side === "BUY" ? (
          <ArrowDownRight className="h-4 w-4 text-emerald-400" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-rose-400" />
        )}
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-sm">{trade.symbol}</span>
          <div className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0", statusConfig.bg, statusConfig.color)}>
            <StatusIcon className="h-2.5 w-2.5" />
            {trade.status === "PENDING_REPLICATION" ? "PENDING" : trade.status}
          </div>
          {trade.isLeaderTrade && (
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-medium border border-purple-400/20 shrink-0">
              LEADER
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {trade.leader?.displayName || "Unknown"}
        </p>
      </div>

      <div className="text-right shrink-0 pl-2">
        <p className="font-semibold text-sm">
          {trade.cost?.toLocaleString() || "0"}
          <span className="text-[10px] text-muted-foreground ml-1">{quoteCurrency}</span>
        </p>
        {trade.profit !== null && (
          <p className={cn("text-[10px] font-medium", trade.profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {trade.profit >= 0 ? "+" : ""}{trade.profit?.toFixed(2)} {quoteCurrency}
          </p>
        )}
      </div>
    </div>
  );
}

// Application Card Component
function ApplicationCard({ app }: { app: any }) {
  return (
    <Link href={`/admin/copy-trading/leader/${app.id}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="group flex items-center gap-3 p-3 rounded-xl border border-amber-500/10 bg-gradient-to-r from-amber-500/5 to-transparent hover:border-amber-500/20 transition-all cursor-pointer"
      >
        <Avatar className="h-10 w-10 border-2 border-amber-500/20">
          <AvatarImage src={app.user?.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white text-sm">
            {app.user?.firstName?.[0] || app.displayName?.[0] || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{app.displayName}</p>
            <Timer className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <p className="text-xs text-muted-foreground truncate">{app.tradingStyle} • {app.riskLevel}</p>
        </div>

        <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
          Review
        </Button>
      </motion.div>
    </Link>
  );
}

// Health Score Component
function HealthScore({ score, status }: { score: number; status: string }) {
  const getColor = () => {
    if (score >= 90) return { stroke: "#10b981", text: "text-emerald-400", bg: "from-emerald-500 to-emerald-400" };
    if (score >= 70) return { stroke: "#f59e0b", text: "text-amber-400", bg: "from-amber-500 to-amber-400" };
    return { stroke: "#ef4444", text: "text-rose-400", bg: "from-rose-500 to-rose-400" };
  };

  const colors = getColor();
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-white/5"
          />
          {/* Animated progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className={cn("text-3xl font-bold", colors.text)}
          >
            {score}
          </motion.span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <Badge className={cn("mt-3 bg-gradient-to-r border-0 text-white", colors.bg)}>
        {status}
      </Badge>
    </div>
  );
}

// Quick Actions Grid Component (like main admin dashboard)
function QuickActionsGrid() {
  const actions = [
    { icon: Eye, label: "Applications", path: "/admin/copy-trading/leader?status=PENDING", color: "text-purple-400" },
    { icon: Crown, label: "Leaders", path: "/admin/copy-trading/leader", color: "text-amber-400" },
    { icon: UserCheck, label: "Followers", path: "/admin/copy-trading/follower", color: "text-blue-400" },
    { icon: Activity, label: "Trades", path: "/admin/copy-trading/trade", color: "text-emerald-400" },
    { icon: BarChart3, label: "Analytics", path: "/admin/copy-trading/analytics", color: "text-cyan-400" },
    { icon: Shield, label: "Risk", path: "/admin/copy-trading/risk", color: "text-rose-400" },
    { icon: Settings, label: "Settings", path: "/admin/copy-trading/settings", color: "text-zinc-400" },
    { icon: DollarSign, label: "Revenue", path: "/admin/copy-trading/revenue", color: "text-orange-400" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((action) => (
        <Link key={action.label} href={action.path}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full h-auto py-3 flex flex-col items-center gap-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <action.icon className={cn("h-5 w-5", action.color)} />
            <span className="text-[10px] font-medium text-muted-foreground">{action.label}</span>
          </motion.button>
        </Link>
      ))}
    </div>
  );
}

// Distribution Bars Component
function DistributionBars({
  data,
  type
}: {
  data: { style?: string; level?: string; count: number }[];
  type: "style" | "risk";
}) {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{tExt("no_data")}</p>;
  }

  const configs = type === "style"
    ? {
        SCALPING: { label: "Scalping", color: "bg-purple-500" },
        DAY_TRADING: { label: "Day Trading", color: "bg-blue-500" },
        SWING: { label: "Swing", color: "bg-cyan-500" },
        POSITION: { label: "Position", color: "bg-amber-500" },
      }
    : {
        LOW: { label: "Low Risk", color: "bg-emerald-500" },
        MEDIUM: { label: "Medium Risk", color: "bg-amber-500" },
        HIGH: { label: "High Risk", color: "bg-rose-500" },
      };

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const key = type === "style" ? item.style : item.level;
        const config = configs[key as keyof typeof configs] || { label: key, color: "bg-gray-500" };
        const percentage = total > 0 ? (item.count / total) * 100 : 0;

        return (
          <div key={key} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{config.label}</span>
              <span className="font-medium">{item.count} ({percentage.toFixed(0)}%)</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn("h-full rounded-full", config.color)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Main Dashboard Component
export default function DashboardClient() {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { data, isLoading, error, fetchDashboard } = useCopyTradingAdminDashboardStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      {/* Hero Section - Keeping as requested */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Copy Trading",
          gradient: "from-indigo-500/20 via-violet-500/20 to-indigo-500/20",
          iconColor: "text-indigo-500",
          textColor: "text-indigo-600 dark:text-indigo-400",
        }}
        title={[
          { text: "Copy Trading " },
          {
            text: "Admin",
            gradient: "from-indigo-600 via-violet-500 to-indigo-600 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400",
          },
          { text: " Dashboard" },
        ]}
        description={t("monitor_and_manage_your_copy_trading_platform")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        background={{
          orbs: [
            { color: "#6366f1", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
            { color: "#8b5cf6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
          ],
        }}
        particles={{ count: 6, type: "floating", colors: ["#6366f1", "#8b5cf6"], size: 8 }}
        rightContent={
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/admin/copy-trading/leader">
              <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg font-semibold">
                <Users className="h-4 w-4 mr-2" />
                {t("manage_leaders")}
              </Button>
            </Link>
            <Link href="/admin/copy-trading/settings">
              <Button variant="outline" className="border-indigo-500/50 text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        }
        bottomSlot={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {/* Financial Stats Group */}
            <StatsCard
              label={t("platform_revenue")}
              value={`$${(stats?.financial?.platformRevenue || 0).toLocaleString()}`}
              icon={DollarSign}
              index={0}
              sparklineData={data?.sparklines?.revenue}
              {...statsCardColors.amber}
            />
            <StatsCard
              label={tExt("total_allocated")}
              value={`$${(stats?.financial?.totalAllocated || 0).toLocaleString()}`}
              icon={Wallet}
              index={1}
              sparklineData={data?.sparklines?.allocation}
              {...statsCardColors.green}
            />
            <StatsCard
              label={tCommon("total_volume")}
              value={`$${((stats?.trades?.volume || 0) / 1000).toFixed(1)}k`}
              icon={BarChart3}
              index={2}
              sparklineData={data?.tradeTimeline?.map((t) => t.volume)}
              {...statsCardColors.blue}
            />
            <StatsCard
              label={tCommon("total_trades")}
              value={(stats?.trades?.completed || 0).toLocaleString()}
              icon={Activity}
              index={3}
              sparklineData={data?.tradeTimeline?.map((t) => t.trades)}
              {...statsCardColors.purple}
            />
          </div>
        }
      />

      {/* Main Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 flex items-center gap-3"
            >
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <p className="text-rose-400 flex-1">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchDashboard()} className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* People & Activity Metrics Row */}
          <motion.div variants={fadeInUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {/* Leaders Group */}
            <StatsCard
              label={t("total_leaders")}
              value={stats?.leaders?.total || 0}
              change={stats?.leaders?.growth}
              changeLabel="this week"
              icon={Users}
              index={0}
              sparklineData={data?.sparklines?.leaders}
              {...statsCardColors.purple}
            />
            <StatsCard
              label={t("active_leaders")}
              value={stats?.leaders?.active || 0}
              icon={Crown}
              index={1}
              sparklineData={data?.sparklines?.leaders}
              {...statsCardColors.amber}
            />
            {/* Followers & Activity */}
            <StatsCard
              label={tExt("active_followers")}
              value={stats?.followers?.active || 0}
              change={stats?.followers?.growth}
              changeLabel="this week"
              icon={UserCheck}
              index={2}
              sparklineData={data?.sparklines?.followers}
              {...statsCardColors.blue}
            />
            <StatsCard
              label={t("todays_trades")}
              value={stats?.trades?.today || 0}
              change={stats?.trades?.todayGrowth}
              icon={Zap}
              index={3}
              sparklineData={data?.tradeTimeline?.map((t) => t.trades)}
              {...statsCardColors.green}
            />
          </motion.div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - 8 cols */}
            <motion.div variants={fadeInUp} className="lg:col-span-8 space-y-6">
              {/* Performance Chart */}
              <PremiumCard glow="purple" className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Activity className="h-5 w-5 text-purple-400" />
                      {t("performance_overview")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{t("last_7_days_trading_activity")}</p>
                  </div>
                  <Link href="/admin/copy-trading/trade">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
                      {tCommon("view_details")}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <PerformanceChart data={data?.tradeTimeline || []} isLoading={isLoading} />
              </PremiumCard>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Trades */}
                <PremiumCard className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Flame className="h-4 w-4 text-amber-400" />
                      {tCommon("recent_trades")}
                    </h3>
                    <Link href="/admin/copy-trading/trade">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        {tCommon("view_all")}
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                      ))
                    ) : data?.recentTrades?.length ? (
                      data.recentTrades.slice(0, 5).map((trade) => (
                        <TradeRow key={trade.id} trade={trade} />
                      ))
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">{tCommon("no_recent_trades")}</p>
                      </div>
                    )}
                  </div>
                </PremiumCard>

                {/* Top Leaders */}
                <PremiumCard className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-400" />
                      {tExt("top_leaders")}
                    </h3>
                    <Link href="/admin/copy-trading/leader">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        {tCommon("view_all")}
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                      ))
                    ) : data?.topLeaders?.length ? (
                      data.topLeaders.slice(0, 5).map((leader, index) => (
                        <LeaderCard key={leader.id} leader={leader} rank={index + 1} />
                      ))
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        <Crown className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">{t("no_leaders_yet")}</p>
                      </div>
                    )}
                  </div>
                </PremiumCard>
              </div>

              {/* Distribution Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PremiumCard className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <LineChart className="h-4 w-4 text-purple-400" />
                    {tExt("trading_styles")}
                  </h3>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                  ) : (
                    <DistributionBars data={data?.distributions?.tradingStyle || []} type="style" />
                  )}
                </PremiumCard>

                <PremiumCard className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    {t("risk_distribution")}
                  </h3>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                  ) : (
                    <DistributionBars data={data?.distributions?.riskLevel || []} type="risk" />
                  )}
                </PremiumCard>
              </div>
            </motion.div>

            {/* Right Column - 4 cols */}
            <motion.div variants={fadeInUp} className="lg:col-span-4 space-y-6">
              {/* System Health */}
              <PremiumCard glow="green" className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  {t("system_health")}
                </h3>
                <div className="flex justify-center py-2">
                  {isLoading ? (
                    <Skeleton className="h-32 w-32 rounded-full" />
                  ) : (
                    <HealthScore score={stats?.health?.score || 0} status={stats?.health?.status || "Unknown"} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-lg bg-white/[0.03] p-3 text-center">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-lg font-bold">{stats?.health?.pendingTrades || 0}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t("failure_rate")}</p>
                    <p className="text-lg font-bold">{stats?.health?.failureRate || "0"}%</p>
                  </div>
                </div>
              </PremiumCard>

              {/* Pending Applications */}
              <PremiumCard glow="amber" className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    {t("pending_applications")}
                  </h3>
                  {(stats?.leaders?.pending || 0) > 0 && (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-400/20">
                      {stats?.leaders?.pending}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                  ) : data?.pendingApplications?.length ? (
                    <>
                      {data.pendingApplications.slice(0, 3).map((app) => (
                        <ApplicationCard key={app.id} app={app} />
                      ))}
                      {(stats?.leaders?.pending || 0) > 3 && (
                        <Link href="/admin/copy-trading/leader?status=PENDING" className="block mt-3">
                          <Button variant="outline" size="sm" className="w-full border-amber-500/20 text-amber-400 hover:bg-amber-500/10">
                            View All ({stats?.leaders?.pending})
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      )}
                    </>
                  ) : (
                    <div className="py-6 text-center">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400/50" />
                      <p className="text-sm text-muted-foreground">{tCommon("all_caught_up")}</p>
                    </div>
                  )}
                </div>
              </PremiumCard>

              {/* Quick Actions */}
              <PremiumCard className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-400" />
                  {tCommon("quick_access")}
                </h3>
                <QuickActionsGrid />
              </PremiumCard>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
