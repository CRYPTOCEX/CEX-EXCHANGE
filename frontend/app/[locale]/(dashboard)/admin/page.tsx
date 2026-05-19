"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import Image from "next/image";
import {
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Shield,
  AlertTriangle,
  Calendar,
  Download,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldAlert,
  BadgeCheck,
  Zap,
  Package,
  Globe,
  MessageCircle,
  AlertOctagon,
  ChevronRight,
  Lightbulb,
  Target,
  Layers,
  ArrowUpRight,
  Bell,
  Settings,
  BarChart3,
  PieChart,
  Wallet,
  CreditCard,
  UserCheck,
  Clock,
  TrendingDown,
  Percent,
  Building2,
  ShoppingBag,
  Repeat,
  Coins,
  LineChart,
} from "lucide-react";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Import the professional analytics components
import { KpiCard } from "@/components/blocks/data-table/analytics/kpi";
import ChartCard from "@/components/blocks/data-table/analytics/charts/line";
import BarChart from "@/components/blocks/data-table/analytics/charts/bar";
import { StatusDistribution } from "@/components/blocks/data-table/analytics/charts/donut";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";

interface DashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    totalRevenue: number;
    totalTransactions: number;
    pendingKYC: number;
    systemHealth: string;
  };
  userMetrics: {
    registrations: Array<{ date: string; total: number; new: number }>;
    usersByLevel: Array<{ level: string; count: number; color: string }>;
  };
  financialMetrics: {
    dailyRevenue: Array<{ date: string; revenue: number; profit: number }>;
    transactionVolume: Array<{ type: string; value: number; color: string }>;
  };
  tradingActivity: {
    dailyTrades: Array<{ date: string; count: number; volume: number }>;
    topAssets: Array<{ asset: string; volume: number; trades: number }>;
  };
}

interface ExtensionData {
  id: string;
  productId: string;
  name: string;
  title: string;
  description: string;
  link: string;
  status: boolean;
  version: string;
  image: string;
  licenseVerified?: boolean;
}

interface UpdateInfo {
  productId: string;
  name: string;
  title: string;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  type: "core" | "extension" | "blockchain" | "exchange";
  image?: string;
}

type TimeframeOption = "weekly" | "monthly" | "yearly";

// Security Notice - Compact inline notice
function SecurityNotice() {
  const t = useTranslations("dashboard_admin");
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    const isDismissed = localStorage.getItem("security-notice-dismissed");
    if (isDismissed) {
      const dismissedTime = parseInt(isDismissed, 10);
      if (Date.now() - dismissedTime < 30 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }
    setDismissed(false);
  }, []);

  // Don't render anything until we know the dismissed state (prevents flash)
  if (dismissed === null || dismissed === true) return null;

  return (
    <div
      className="bg-gradient-to-r from-red-100/80 via-red-50/60 to-red-100/80 dark:from-red-950/40 dark:via-red-900/30 dark:to-red-950/40 border border-red-300/50 dark:border-red-500/30 rounded-lg p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              {t("security_reminder_we_are_exclusive_envato_authors")}
            </p>
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
              {t("official_support_only_at")}{" "}
              <a href="https://support.mashdiv.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-700 dark:hover:text-red-300">
                {t("support_mashdiv_com")}
              </a>
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 shrink-0"
          onClick={() => {
            localStorage.setItem("security-notice-dismissed", Date.now().toString());
            setDismissed(true);
          }}
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Smart Insight Card - Shows contextual recommendations
function InsightCard({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  variant = "default",
}: {
  icon: any;
  title: string;
  description: string;
  action: () => void;
  actionLabel: string;
  variant?: "default" | "warning" | "success" | "info";
}) {
  const variants = {
    default: "from-zinc-800/50 to-zinc-900/50 border-zinc-700/50",
    warning: "from-amber-950/30 to-amber-900/20 border-amber-500/30",
    success: "from-emerald-950/30 to-emerald-900/20 border-emerald-500/30",
    info: "from-blue-950/30 to-blue-900/20 border-blue-500/30",
  };

  const iconVariants = {
    default: "bg-zinc-700/50 text-zinc-300",
    warning: "bg-amber-500/20 text-amber-400",
    success: "bg-emerald-500/20 text-emerald-400",
    info: "bg-blue-500/20 text-blue-400",
  };

  return (
    <div className={cn("bg-gradient-to-br border rounded-lg p-4 flex items-start gap-4", variants[variant])}>
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", iconVariants[variant])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
      </div>
      <Button size="sm" variant="ghost" onClick={action} className="shrink-0 gap-1 text-xs">
        {actionLabel}
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

// Platform Health Service Interface
interface HealthService {
  name: string;
  status: "up" | "down" | "warning" | "unconfigured";
  message: string;
  latency?: number;
  critical?: boolean;
}

interface HealthData {
  overall: {
    score: number;
    status: "healthy" | "warning" | "critical";
  };
  services: HealthService[];
  timestamp: string;
}

// Platform Health Score
function PlatformHealthScore() {
  const t = useTranslations("dashboard_admin");
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchHealthData = useCallback(async (force = false) => {
    // Prevent duplicate calls on mount (React Strict Mode)
    if (!force && hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/health/batch",
        silent: true,
      });

      if (!error && data) {
        setHealthData(data);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();
    // Refresh every 5 minutes
    const interval = setInterval(() => fetchHealthData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchHealthData]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const getStrokeColor = (score: number) => {
    if (score >= 80) return "#34d399"; // emerald-400
    if (score >= 60) return "#fbbf24"; // amber-400
    return "#f87171"; // red-400
  };

  const getScoreLabel = (status: string) => {
    if (status === "healthy") return "Healthy";
    if (status === "warning") return "Warning";
    return "Critical";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "up":
        return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
      case "down":
        return <XCircle className="h-3 w-3 text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-3 w-3 text-amber-400" />;
      default:
        return <Clock className="h-3 w-3 text-zinc-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "up":
        return "text-emerald-400";
      case "down":
        return "text-red-400";
      case "warning":
        return "text-amber-400";
      default:
        return "text-zinc-500";
    }
  };

  if (loading) {
    return (
      <Card className="rounded-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-zinc-900/80 dark:to-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {t("platform_health")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = healthData?.overall?.score ?? 85;
  const status = healthData?.overall?.status ?? "healthy";
  const services = healthData?.services ?? [];

  // Group services by status for summary
  const upCount = services.filter((s) => s.status === "up").length;
  const warningCount = services.filter((s) => s.status === "warning").length;
  const downCount = services.filter((s) => s.status === "down").length;

  return (
    <Card className="rounded-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-zinc-900/80 dark:to-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {t("platform_health")}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchHealthData(true)}
            className="h-7 w-7"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="relative h-24 w-24 shrink-0">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                className="stroke-zinc-200 dark:stroke-zinc-800"
                strokeWidth="8"
                fill="none"
                r="42"
                cx="50"
                cy="50"
              />
              <circle
                className="transition-all duration-1000"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                r="42"
                cx="50"
                cy="50"
                stroke={getStrokeColor(score)}
                strokeDasharray={`${score * 2.64} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-2xl font-bold", getScoreColor(score))}>{score}</span>
              <span className="text-[10px] text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className={cn("text-xs", getScoreColor(score))}>
                {getScoreLabel(status)}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {upCount > 0 && (
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{upCount} Up</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1 text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{warningCount} Warning</span>
                </div>
              )}
              {downCount > 0 && (
                <div className="flex items-center gap-1 text-red-400">
                  <XCircle className="h-3 w-3" />
                  <span>{downCount} Down</span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs h-7 px-2"
              onClick={() => setExpanded(!expanded)}
            >
              <span>{expanded ? "Hide Details" : "Show Details"}</span>
              <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
            </Button>
          </div>
        </div>

        {/* Expandable service list */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800"
          >
            {services.map((service) => (
              <div
                key={service.name}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  service.status === "warning" || service.status === "down"
                    ? "bg-zinc-100/80 dark:bg-zinc-800/50"
                    : "bg-zinc-100/80 dark:bg-zinc-800/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(service.status)}
                    <span className="text-xs font-medium">{service.name}</span>
                    {service.critical && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-zinc-300 dark:border-zinc-700">
                        Critical
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {service.latency && (
                      <span className="text-[10px] text-muted-foreground">{service.latency}ms</span>
                    )}
                    <span className={cn("text-[10px] capitalize", getStatusColor(service.status))}>
                      {service.status}
                    </span>
                  </div>
                </div>
                {/* Show message details for warnings and down services */}
                {(service.status === "warning" || service.status === "down") && service.message && (
                  <div className={cn(
                    "mt-1.5 ml-5 text-[10px] px-2 py-1 rounded",
                    service.status === "warning"
                      ? "bg-amber-500/10 text-amber-500 dark:text-amber-400"
                      : "bg-red-500/10 text-red-500 dark:text-red-400"
                  )}>
                    {service.message}
                  </div>
                )}
              </div>
            ))}
            {healthData?.timestamp && (
              <p className="text-[10px] text-muted-foreground text-center pt-2">
                {t("last_checked")} {healthData.timestamp}
              </p>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// Updates Widget - Compact
function UpdatesWidget({
  updates,
  loading,
  onRefresh,
}: {
  updates: UpdateInfo[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const t = useTranslations("dashboard_admin");
  const router = useRouter();
  const availableUpdates = updates.filter((u) => u.hasUpdate);

  return (
    <Card className="rounded-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-zinc-900/80 dark:to-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Updates
            {availableUpdates.length > 0 && (
              <Badge className="bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30 text-xs">
                {availableUpdates.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onRefresh} className="h-7 w-7" disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : availableUpdates.length > 0 ? (
          <div className="space-y-2">
            {availableUpdates.slice(0, 3).map((update) => (
              <div
                key={update.productId}
                className="flex items-center gap-3 p-2 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                onClick={() => router.push(update.type === "core" ? "/admin/system/update" : `/admin/system/extension/${update.productId}`)}
              >
                <div className="h-8 w-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{update.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {update.currentVersion} → <span className="text-orange-600 dark:text-orange-400">{update.latestVersion}</span>
                  </p>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">{t("all_up_to_date")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick Stats Row - Using reusable StatsCard component
function QuickStats({ data }: { data: DashboardData["overview"] }) {
  const stats = [
    {
      label: "Total Users",
      value: data.totalUsers,
      icon: Users,
      change: data.newUsersToday,
      changeLabel: "today",
      ...statsCardColors.blue,
    },
    {
      label: "Active Users",
      value: data.activeUsers,
      icon: UserCheck,
      change: Math.round((data.activeUsers / Math.max(data.totalUsers, 1)) * 100),
      changeLabel: "rate",
      ...statsCardColors.green,
      isPercent: true,
    },
    {
      label: "Revenue",
      value: data.totalRevenue,
      icon: DollarSign,
      ...statsCardColors.amber,
      isCurrency: true,
    },
    {
      label: "Transactions",
      value: data.totalTransactions,
      icon: Repeat,
      ...statsCardColors.purple,
    },
    {
      label: "Pending KYC",
      value: data.pendingKYC,
      icon: Shield,
      ...(data.pendingKYC > 10 ? statsCardColors.red : statsCardColors.green),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <StatsCard {...stat} index={index} />
        </motion.div>
      ))}
    </div>
  );
}

// Growth Opportunities Section - Intelligent recommendations for ALL extensions
function GrowthOpportunities({ extensions, data }: { extensions: ExtensionData[]; data: DashboardData }) {
  const t = useTranslations("dashboard_admin");
  const router = useRouter();

  // Helper to check if extension is licensed
  const isLicensed = (name: string) => extensions.find((e) => e.name === name && e.licenseVerified);
  const isActive = (name: string) => extensions.find((e) => e.name === name && e.status);

  // Calculate metrics for smart recommendations
  const totalUsers = data.overview.totalUsers || 0;
  const activeUsers = data.overview.activeUsers || 0;
  const totalTransactions = data.overview.totalTransactions || 0;
  const totalRevenue = data.overview.totalRevenue || 0;
  const pendingKYC = data.overview.pendingKYC || 0;
  const avgDailyTrades = data.tradingActivity.dailyTrades.length > 0
    ? data.tradingActivity.dailyTrades.reduce((a, b) => a + b.count, 0) / data.tradingActivity.dailyTrades.length
    : 0;
  const avgDailyVolume = data.tradingActivity.dailyTrades.length > 0
    ? data.tradingActivity.dailyTrades.reduce((a, b) => a + b.volume, 0) / data.tradingActivity.dailyTrades.length
    : 0;
  const userRetentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

  // Smart recommendations based on platform data
  const recommendations = useMemo(() => {
    const recs: Array<{
      type: string;
      icon: any;
      title: string;
      description: string;
      action: string;
      path: string;
      priority: number;
      variant: "warning" | "info" | "success";
    }> = [];

    // PRIORITY 0: Urgent Actions (KYC backlog)
    if (pendingKYC > 10) {
      recs.push({
        type: "action",
        icon: Shield,
        title: "Review KYC Applications",
        description: `${pendingKYC} KYC applications pending. Users are waiting for verification to start trading.`,
        action: "Review Now",
        path: "/admin/crm/kyc/application",
        priority: 0,
        variant: "warning",
      });
    }

    // P2P Trading - Best for high user count platforms wanting fiat on/off ramps
    if (!isLicensed("p2p")) {
      if (totalUsers >= 50) {
        recs.push({
          type: "feature",
          icon: Repeat,
          title: "Enable P2P Trading",
          description: `With ${totalUsers.toLocaleString()} users, P2P enables direct fiat-to-crypto trades between users, reducing your operational costs.`,
          action: "Explore P2P",
          path: "/admin/system/extension/44593497",
          priority: totalUsers >= 200 ? 1 : 2,
          variant: totalUsers >= 200 ? "warning" : "info",
        });
      }
    }

    // Futures Trading - For platforms with active trading
    if (!isLicensed("futures")) {
      if (avgDailyTrades >= 20 || totalTransactions >= 500) {
        recs.push({
          type: "feature",
          icon: LineChart,
          title: "Unlock Futures Trading",
          description: `~${Math.round(avgDailyTrades)} daily trades detected. Futures with leverage can 10x your trading volume and fees.`,
          action: "Explore Futures",
          path: "/admin/system/extension/46094641",
          priority: avgDailyTrades >= 50 ? 1 : 2,
          variant: avgDailyTrades >= 50 ? "warning" : "info",
        });
      }
    }

    // Staking - For platforms wanting to increase user retention
    if (!isLicensed("staking")) {
      if (userRetentionRate < 50 || totalUsers >= 30) {
        recs.push({
          type: "feature",
          icon: Coins,
          title: "Add Staking Rewards",
          description: userRetentionRate < 50
            ? `User retention is ${userRetentionRate.toFixed(0)}%. Staking rewards keep users engaged with passive income.`
            : "Staking increases user retention by offering passive income on held assets.",
          action: "Learn More",
          path: "/admin/system/extension/37434481",
          priority: userRetentionRate < 30 ? 1 : 3,
          variant: userRetentionRate < 30 ? "warning" : "info",
        });
      }
    }

    // Ecosystem & Native Trading - For platforms wanting full control
    if (!isLicensed("ecosystem")) {
      if (totalTransactions >= 100 || totalRevenue >= 500) {
        recs.push({
          type: "feature",
          icon: Layers,
          title: "Native Trading Ecosystem",
          description: "Create your own tokens and markets. Full control over trading pairs, fees, and liquidity.",
          action: "Discover",
          path: "/admin/system/extension/40071914",
          priority: 3,
          variant: "info",
        });
      }
    }

    // AI Market Maker - For ecosystem users wanting automated liquidity
    if (isLicensed("ecosystem") && !isLicensed("ai_market_maker")) {
      recs.push({
        type: "feature",
        icon: Activity,
        title: "AI Market Maker",
        description: "Automate liquidity and price discovery for your ecosystem markets with AI-powered trading bots.",
        action: "Explore AI",
        path: "/admin/system/extension/61007981",
        priority: 2,
        variant: "info",
      });
    }

    // Copy Trading - For platforms with successful traders
    if (!isLicensed("copy_trading")) {
      if (avgDailyTrades >= 30 || totalUsers >= 100) {
        recs.push({
          type: "feature",
          icon: Users,
          title: "Enable Copy Trading",
          description: "Let beginners automatically copy successful traders. Increases engagement and attracts new users.",
          action: "Learn More",
          path: "/admin/system/extension/61107157",
          priority: 3,
          variant: "info",
        });
      }
    }

    // MLM / Affiliate - For user growth focus
    if (!isLicensed("mlm")) {
      if (totalUsers >= 20) {
        recs.push({
          type: "feature",
          icon: Target,
          title: "Affiliate Program",
          description: `Turn your ${totalUsers} users into ambassadors. Multi-level referrals can accelerate growth exponentially.`,
          action: "Setup MLM",
          path: "/admin/system/extension/36667808",
          priority: 4,
          variant: "info",
        });
      }
    }

    // AI Investments - For platforms with deposits
    if (!isLicensed("ai_investment")) {
      if (totalRevenue >= 100 || totalUsers >= 50) {
        recs.push({
          type: "feature",
          icon: TrendingUp,
          title: "AI Investment Plans",
          description: "Offer automated investment strategies. Users deposit, AI generates returns. Great passive income feature.",
          action: "Explore",
          path: "/admin/system/extension/35988984",
          priority: 4,
          variant: "info",
        });
      }
    }

    // Forex Trading - For traditional trading platforms
    if (!isLicensed("forex")) {
      if (avgDailyTrades >= 10) {
        recs.push({
          type: "feature",
          icon: Globe,
          title: "Forex & Investment",
          description: "Expand beyond crypto with forex pairs. Attract traditional traders to your platform.",
          action: "Add Forex",
          path: "/admin/system/extension/36668679",
          priority: 5,
          variant: "info",
        });
      }
    }

    // ICO Platform - For token launches
    if (!isLicensed("ico")) {
      if (isLicensed("ecosystem") || totalUsers >= 100) {
        recs.push({
          type: "feature",
          icon: Zap,
          title: "Token ICO Platform",
          description: "Launch token sales with MetaMask integration. Perfect for ecosystem token distribution.",
          action: "Learn More",
          path: "/admin/system/extension/36120046",
          priority: 5,
          variant: "info",
        });
      }
    }

    // NFT Marketplace - For creative/digital asset focus
    if (!isLicensed("nft")) {
      if (isLicensed("ecosystem") || isLicensed("wallet_connect")) {
        recs.push({
          type: "feature",
          icon: ShoppingBag,
          title: "NFT Marketplace",
          description: "Create, sell, and trade NFTs. Tap into the digital collectibles market.",
          action: "Explore NFTs",
          path: "/admin/system/extension/60962133",
          priority: 5,
          variant: "info",
        });
      }
    }

    // Ecommerce - For platforms wanting to sell products
    if (!isLicensed("ecommerce")) {
      if (totalUsers >= 50 || totalRevenue >= 200) {
        recs.push({
          type: "feature",
          icon: ShoppingBag,
          title: "Digital Store",
          description: "Sell digital products, software licenses, and more. Accept crypto payments.",
          action: "Setup Store",
          path: "/admin/system/extension/44624493",
          priority: 6,
          variant: "info",
        });
      }
    }

    // Payment Gateway - For merchant services
    if (!isLicensed("gateway")) {
      if (totalTransactions >= 200 || totalRevenue >= 1000) {
        recs.push({
          type: "feature",
          icon: CreditCard,
          title: "Payment Gateway",
          description: "Accept crypto payments on external websites. WooCommerce plugin included. New revenue stream.",
          action: "Explore",
          path: "/admin/system/extension/61043226",
          priority: 5,
          variant: "info",
        });
      }
    }

    // Wallet Connect - Essential for Web3
    if (!isLicensed("wallet_connect")) {
      recs.push({
        type: "feature",
        icon: Wallet,
        title: "Wallet Connect",
        description: "Enable MetaMask and Web3 wallet login. Essential for modern crypto platforms.",
        action: "Enable",
        path: "/admin/system/extension/37548018",
        priority: 4,
        variant: "info",
      });
    }

    // MailWizard - For marketing & communication
    if (!isLicensed("mailwizard")) {
      if (totalUsers >= 50) {
        recs.push({
          type: "feature",
          icon: MessageCircle,
          title: "MailWizard",
          description: `Engage your ${totalUsers} users with AI-powered emails. Drag-and-drop editor, AI content generation.`,
          action: "Explore",
          path: "/admin/system/extension/45613491",
          priority: 6,
          variant: "info",
        });
      }
    }

    // Knowledge Base - For support optimization
    if (!isLicensed("knowledge_base")) {
      if (totalUsers >= 30) {
        recs.push({
          type: "feature",
          icon: Building2,
          title: "Knowledge Base & FAQs",
          description: "Reduce support tickets with self-service FAQs. Help users find answers instantly.",
          action: "Setup",
          path: "/admin/system/extension/39166202",
          priority: 7,
          variant: "info",
        });
      }
    }

    return recs.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [extensions, data, totalUsers, activeUsers, totalTransactions, totalRevenue, pendingKYC, avgDailyTrades, avgDailyVolume, userRetentionRate]);

  if (recommendations.length === 0) return null;

  return (
    <Card className="rounded-lg bg-gradient-to-br from-zinc-900/80 to-zinc-950 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          {t("smart_insights")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, index) => (
          <InsightCard
            key={index}
            icon={rec.icon}
            title={rec.title}
            description={rec.description}
            action={() => router.push(rec.path)}
            actionLabel={rec.action}
            variant={rec.variant}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// Quick Actions Grid
function QuickActions() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const actions = [
    { icon: Users, label: "Users", path: "/admin/crm/user", color: "text-blue-600 dark:text-blue-400" },
    { icon: Shield, label: "KYC", path: "/admin/crm/kyc/application", color: "text-emerald-600 dark:text-emerald-400" },
    { icon: Wallet, label: "Deposits", path: "/admin/finance/deposit/log", color: "text-amber-600 dark:text-amber-400" },
    { icon: CreditCard, label: "Withdrawals", path: "/admin/finance/withdraw/log", color: "text-purple-600 dark:text-purple-400" },
    { icon: BarChart3, label: "Markets", path: "/admin/finance/exchange/market", color: "text-cyan-600 dark:text-cyan-400" },
    { icon: MessageCircle, label: "Support", path: "/admin/crm/support", color: "text-pink-600 dark:text-pink-400" },
    { icon: Settings, label: "Settings", path: "/admin/system/settings", color: "text-zinc-600 dark:text-zinc-400" },
    { icon: Package, label: "Extensions", path: "/admin/system/extension", color: "text-orange-600 dark:text-orange-400" },
  ];

  return (
    <Card className="rounded-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-zinc-900/80 dark:to-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          {tCommon("quick_access")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              className="h-auto py-3 flex-col gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer"
              onClick={() => router.push(action.path)}
            >
              <action.icon className={cn("h-5 w-5", action.color)} />
              <span className="text-[10px] font-medium text-muted-foreground">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Support Banner
function SupportBanner() {
  const t = useTranslations("dashboard_admin");
  return (
    <div className="bg-gradient-to-r from-emerald-100/80 via-emerald-50/60 to-emerald-100/80 dark:from-emerald-950/30 dark:via-emerald-900/20 dark:to-emerald-950/30 border border-emerald-300/50 dark:border-emerald-500/20 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <BadgeCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{t("official_support_portal")}</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{t("get_help_from_our_verified_team_at_mashdiv")}</p>
          </div>
        </div>
        <a href="https://support.mashdiv.com/" target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <MessageCircle className="h-4 w-4" />
            {t("get_support")}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </a>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeOption>("monthly");

  const [extensions, setExtensions] = useState<ExtensionData[]>([]);
  const [updates, setUpdates] = useState<UpdateInfo[]>([]);
  const [extensionsLoading, setExtensionsLoading] = useState(true);
  const [updatesLoading, setUpdatesLoading] = useState(true);

  const fetchDashboardData = useCallback(
    async (selectedTimeframe?: TimeframeOption) => {
      try {
        setLoading(true);
        const response = await $fetch({
          url: "/api/admin/dashboard",
          params: { timeframe: selectedTimeframe || timeframe },
          silentSuccess: true,
        });
        if (response.data) setData(response.data);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    },
    [timeframe]
  );

  const fetchExtensions = useCallback(async () => {
    try {
      setExtensionsLoading(true);
      const { data, error } = await $fetch({ url: "/api/admin/system/extension", silent: true });
      if (!error && data) {
        let allProducts: ExtensionData[] = [];
        if (Array.isArray(data)) {
          allProducts = data;
        } else {
          if (data.extensions) allProducts.push(...data.extensions);
          if (data.blockchains) allProducts.push(...data.blockchains);
          if (data.exchangeProviders) allProducts.push(...data.exchangeProviders);
        }
        setExtensions(allProducts);
      }
    } catch {
      // Silent fail
    } finally {
      setExtensionsLoading(false);
    }
  }, []);

  const checkAllUpdates = useCallback(async (extensionsList: ExtensionData[]) => {
    try {
      setUpdatesLoading(true);

      // Use single batch API call instead of multiple individual calls
      const { data: batchResult } = await $fetch({
        url: "/api/admin/system/update/check/batch",
        method: "POST",
        silent: true,
      });

      if (batchResult?.products && Array.isArray(batchResult.products)) {
        // Map the batch response to our UpdateInfo format
        // API returns snake_case: product_id, update_available, latest_version, current_version
        const updateChecks: UpdateInfo[] = batchResult.products
          .filter((product: any) => !product.error) // Skip products with errors
          .map((product: any) => {
            // Handle both camelCase and snake_case responses
            const productId = product.product_id || product.productId;
            const currentVersion = product.current_version || product.currentVersion || "0.0.0";
            const latestVersion = product.latest_version || product.latestVersion || currentVersion;
            const updateAvailable = product.update_available || product.updateAvailable || false;

            // Find matching extension for title and image
            const ext = extensionsList.find((e) => e.productId === productId);
            const coreProductId = process.env.NEXT_PUBLIC_MAIN_PRODUCT_ID || "35599184";
            const isCore = productId === coreProductId;

            return {
              productId,
              name: ext?.name || (isCore ? "bicrypto" : "unknown"),
              title: ext?.title || (isCore ? "Bicrypto Core" : productId),
              currentVersion,
              latestVersion,
              hasUpdate: updateAvailable === true,
              type: isCore ? "core" as const : "extension" as const,
              image: ext?.image,
            };
          });

        setUpdates(updateChecks);
      } else {
        setUpdates([]);
      }
    } catch {
      // Silent fail - batch endpoint might not exist yet
      setUpdates([]);
    } finally {
      setUpdatesLoading(false);
    }
  }, []);

  // Track if updates have been checked to prevent duplicate calls
  const updatesCheckedRef = useRef(false);

  useEffect(() => {
    fetchDashboardData();
    fetchExtensions();
  }, [fetchDashboardData, fetchExtensions]);

  useEffect(() => {
    if (extensions.length > 0 && !updatesCheckedRef.current) {
      updatesCheckedRef.current = true;
      checkAllUpdates(extensions);
    }
  }, [extensions, checkAllUpdates]);

  const handleTimeframeChange = useCallback(
    (newTimeframe: TimeframeOption) => {
      setTimeframe(newTimeframe);
      fetchDashboardData(newTimeframe);
    },
    [fetchDashboardData]
  );

  const chartConfigs = useMemo(
    () => ({
      userRegistrations: {
        title: "User Growth",
        metrics: ["total", "new"],
        labels: { total: "Total Users", new: "New Registrations" },
      },
      dailyRevenue: {
        title: "Revenue",
        metrics: ["revenue", "profit"],
        labels: { revenue: "Revenue", profit: "Profit" },
      },
      dailyTrades: {
        title: "Trading Activity",
        type: "bar" as "bar",
        model: "trade",
        metrics: ["count", "volume"],
        labels: { count: "Trades", volume: "Volume" },
      },
      usersByLevel: { title: "Users by Level" },
    }),
    []
  );

  if (loading && !data) {
    return (
      <div className={`container ${PAGE_PADDING} space-y-6`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`container ${PAGE_PADDING} flex items-center justify-center min-h-96`}>
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold">{tCommon("error_loading_dashboard")}</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => fetchDashboardData()} variant="outline">Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={`container ${PAGE_PADDING} space-y-6`}>
      {/* Security Notice */}
      <SecurityNotice />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tCommon("admin_dashboard")}</h1>
          <p className="text-sm text-muted-foreground">{t("comprehensive_overview_of_your_platforms_performance")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-40 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <SelectItem value="weekly">{tCommon("last_7_days")}</SelectItem>
              <SelectItem value="monthly">{tCommon("last_30_days")}</SelectItem>
              <SelectItem value="yearly">{t("this_year")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats data={data.overview} />

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            <ChartCard
              chartKey="user-registrations"
              config={chartConfigs.userRegistrations}
              data={data.userMetrics.registrations}
              formatXAxis={(value) => value}
              width="full"
              loading={loading}
              timeframe={timeframe === "weekly" ? "d" : timeframe === "monthly" ? "m" : "y"}
            />
            <ChartCard
              chartKey="daily-revenue"
              config={chartConfigs.dailyRevenue}
              data={data.financialMetrics.dailyRevenue}
              formatXAxis={(value) => value}
              width="full"
              loading={loading}
              timeframe={timeframe === "weekly" ? "d" : timeframe === "monthly" ? "m" : "y"}
            />
          </div>

          {/* Trading & Distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            <BarChart
              chartKey="daily-trades"
              config={chartConfigs.dailyTrades}
              data={data.tradingActivity.dailyTrades}
              formatXAxis={(value) => value}
              width="full"
              loading={loading}
              timeframe={timeframe === "weekly" ? "d" : timeframe === "monthly" ? "m" : "y"}
            />
            <StatusDistribution
              data={data.userMetrics.usersByLevel.map((item) => ({
                id: item.level,
                name: item.level,
                value: item.count,
                color: item.color,
              }))}
              config={chartConfigs.usersByLevel}
              loading={loading}
            />
          </div>

          {/* Smart Insights */}
          <GrowthOpportunities extensions={extensions} data={data} />
        </div>

        {/* Right Column - Widgets */}
        <div className="space-y-6">
          <PlatformHealthScore />
          <UpdatesWidget updates={updates} loading={updatesLoading} onRefresh={() => checkAllUpdates(extensions)} />
          <QuickActions />
        </div>
      </div>

      {/* Support Banner */}
      <SupportBanner />
    </div>
  );
}
