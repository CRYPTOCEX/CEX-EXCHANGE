"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  BarChart3,
  Brain,
  ChevronRight,
  Clock,
  Zap,
  LineChart,
  PieChart,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trophy,
  Target,
  Activity,
  RefreshCw,
  Sparkles,
  Leaf,
  History,
  Timer,
  Layers,
  Coins,
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
    totalInvestments: number;
    totalAmount: number;
    totalProfit: number;
    activeInvestments: number;
    completedInvestments: number;
    cancelledInvestments: number;
    rejectedInvestments: number;
    winRate: number;
    activePlans: number;
    totalDurations: number;
    spotInvestments: number;
    ecoInvestments: number;
    averageInvestment: number;
  };
  investmentResults: {
    win: number;
    loss: number;
    draw: number;
  };
  chartData: Array<{ name: string; value: number }>;
  planDistribution: Array<{ name: string; value: number; count: number }>;
  recentInvestments: Array<{
    id: string;
    user: string;
    userId: string;
    userAvatar: string | null;
    plan: string;
    planId: string;
    duration: string;
    symbol: string;
    type: string;
    amount: number;
    profit: number;
    result: string;
    status: string;
    createdAt: string;
  }>;
  topPlans: Array<{
    id: string;
    name: string;
    title: string;
    image: string;
    minAmount: number;
    maxAmount: number;
    minProfit: number;
    maxProfit: number;
    profitPercentage: number;
    invested: number;
    status: boolean;
    trending: boolean;
  }>;
}

export default function AiInvestmentDashboardPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("1y");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await $fetch({
        url: `/api/admin/ai/investment?timeframe=${timeframe}`,
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
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [timeframe]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "text-blue-500 bg-blue-500/10";
      case "COMPLETED":
        return "text-green-500 bg-green-500/10";
      case "CANCELLED":
        return "text-red-500 bg-red-500/10";
      case "REJECTED":
        return "text-purple-500 bg-purple-500/10";
      default:
        return "text-zinc-500 bg-zinc-500/10";
    }
  };

  const getResultColor = (result: string) => {
    switch (result?.toUpperCase()) {
      case "WIN":
        return "text-green-500";
      case "LOSS":
        return "text-red-500";
      case "DRAW":
        return "text-zinc-500";
      default:
        return "text-zinc-500";
    }
  };

  const getResultIcon = (result: string) => {
    switch (result?.toUpperCase()) {
      case "WIN":
        return <Trophy className="w-4 h-4" />;
      case "LOSS":
        return <TrendingDown className="w-4 h-4" />;
      case "DRAW":
        return <Target className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === "ECO") {
      return <Leaf className="w-4 h-4 text-green-500" />;
    }
    return <Coins className="w-4 h-4 text-blue-500" />;
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
    totalInvestments: 0,
    totalAmount: 0,
    totalProfit: 0,
    activeInvestments: 0,
    completedInvestments: 0,
    cancelledInvestments: 0,
    rejectedInvestments: 0,
    winRate: 0,
    activePlans: 0,
    totalDurations: 0,
    spotInvestments: 0,
    ecoInvestments: 0,
    averageInvestment: 0,
  };

  const results = data?.investmentResults || { win: 0, loss: 0, draw: 0 };
  const totalResults = results.win + results.loss + results.draw;

  const totalTypeInvestments = overview.spotInvestments + overview.ecoInvestments;
  const spotPercent = totalTypeInvestments > 0 ? (overview.spotInvestments / totalTypeInvestments) * 100 : 50;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "AI Investment",
          gradient: "from-cyan-100 to-purple-100 dark:from-cyan-950 dark:to-purple-950",
          iconColor: "text-cyan-500",
          textColor: "text-cyan-600 dark:text-cyan-400",
        }}
        title={[
          { text: "AI Investment " },
          {
            text: "Dashboard",
            gradient:
              "from-cyan-600 via-purple-500 to-cyan-600 dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400",
          },
        ]}
        description={t("monitor_ai_powered_investments_manage_plans")}
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
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="h-10 px-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium"
            >
              <option value="1m">{tCommon("last_30_days")}</option>
              <option value="3m">{t("last_3_months")}</option>
              <option value="1y">{t("last_12_months")}</option>
            </select>
            <Button
              onClick={() => router.push("/admin/ai/investment/plan")}
              className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white shadow-lg font-semibold"
            >
              <Brain className="w-5 h-5 mr-2" />
              {t("manage_plans")}
            </Button>
          </div>
        }
        bottomSlot={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <StatsCard
              label={tCommon("total_invested")}
              value={loading ? "-" : formatCurrency(overview.totalAmount)}
              icon={DollarSign}
              index={0}
              {...statsCardColors.cyan}
            />
            <StatsCard
              label={tExt("total_profit")}
              value={loading ? "-" : formatCurrency(overview.totalProfit)}
              icon={overview.totalProfit >= 0 ? TrendingUp : TrendingDown}
              index={1}
              {...(overview.totalProfit >= 0 ? statsCardColors.green : statsCardColors.red)}
            />
            <StatsCard
              label={tCommon("active_investments")}
              value={loading ? "-" : overview.activeInvestments}
              icon={Activity}
              index={2}
              {...statsCardColors.purple}
            />
            <StatsCard
              label={tCommon("win_rate")}
              value={loading ? "-" : `${overview.winRate}%`}
              icon={Trophy}
              index={3}
              {...statsCardColors.amber}
            />
          </div>
        }
      />

      {/* Main Content */}
      <div className="container mx-auto py-8 space-y-8">
        {/* Quick Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          <QuickStatCard
            title={tCommon("completed")}
            value={overview.completedInvestments}
            icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
            color="green"
            loading={loading}
          />
          <QuickStatCard
            title={tCommon("cancelled")}
            value={overview.cancelledInvestments}
            icon={<XCircle className="w-5 h-5 text-red-500" />}
            color="red"
            loading={loading}
          />
          <QuickStatCard
            title={t("active_plans")}
            value={overview.activePlans}
            icon={<Brain className="w-5 h-5 text-cyan-500" />}
            color="cyan"
            loading={loading}
            href="/admin/ai/investment/plan"
          />
          <QuickStatCard
            title={tCommon("durations")}
            value={overview.totalDurations}
            icon={<Timer className="w-5 h-5 text-purple-500" />}
            color="purple"
            loading={loading}
            href="/admin/ai/investment/duration"
          />
          <QuickStatCard
            title={t("spot_investments")}
            value={overview.spotInvestments}
            icon={<Coins className="w-5 h-5 text-blue-500" />}
            color="blue"
            loading={loading}
          />
          <QuickStatCard
            title={t("eco_investments")}
            value={overview.ecoInvestments}
            icon={<Leaf className="w-5 h-5 text-emerald-500" />}
            color="emerald"
            loading={loading}
          />
        </motion.div>

        {/* Results & Type Distribution Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Investment Results */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-cyan-500" />
                {t("investment_results")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="font-medium">{tCommon("win")}</span>
                    </div>
                    <span className="text-2xl font-bold text-green-500">{results.win}</span>
                  </div>
                  <Progress
                    value={totalResults > 0 ? (results.win / totalResults) * 100 : 0}
                    className="h-2 [&>div]:bg-green-500"
                  />

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="font-medium">{tCommon("loss")}</span>
                    </div>
                    <span className="text-2xl font-bold text-red-500">{results.loss}</span>
                  </div>
                  <Progress
                    value={totalResults > 0 ? (results.loss / totalResults) * 100 : 0}
                    className="h-2 [&>div]:bg-red-500"
                  />

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-zinc-500" />
                      <span className="font-medium">{tCommon("draw")}</span>
                    </div>
                    <span className="text-2xl font-bold text-zinc-500">{results.draw}</span>
                  </div>
                  <Progress
                    value={totalResults > 0 ? (results.draw / totalResults) * 100 : 0}
                    className="h-2 [&>div]:bg-zinc-500"
                  />

                  <div className="pt-4 border-t text-center">
                    <span className="text-sm text-muted-foreground">{t("total_completed")} </span>
                    <span className="font-bold">{totalResults}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investment Type Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-500" />
                {t("investment_types")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold">Spot</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-500">
                      {overview.spotInvestments}
                    </span>
                  </div>
                  <div className="relative h-4 bg-emerald-500/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${spotPercent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-5 h-5 text-emerald-500" />
                      <span className="font-semibold">Eco</span>
                    </div>
                    <span className="text-2xl font-bold text-emerald-500">
                      {overview.ecoInvestments}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
                    <span>{spotPercent.toFixed(1)}% Spot</span>
                    <span>{(100 - spotPercent).toFixed(1)}% Eco</span>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t("avg_investment")}</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">
                        {formatCurrency(overview.averageInvestment)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investment Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <LineChart className="w-5 h-5 text-cyan-500" />
                {t("investment_volume")}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : data?.chartData?.length ? (
                <div className="h-48 flex flex-col overflow-hidden">
                  {/* Chart bars container */}
                  <div className="h-36 flex items-end justify-between gap-0.5 px-1 relative overflow-hidden">
                    {data.chartData.slice(0, 12).map((item, i) => {
                      const maxValue = Math.max(...data.chartData.map((d) => d.value), 1);
                      const height = (item.value / maxValue) * 100;

                      return (
                        <div key={i} className="flex-1 h-full flex items-end group">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(height, 2)}%` }}
                            transition={{ duration: 0.5, delay: i * 0.03 }}
                            className="w-full bg-gradient-to-t from-cyan-600 to-purple-500 dark:from-cyan-500 dark:to-purple-400 rounded-t-sm group-hover:from-cyan-700 group-hover:to-purple-600 transition-all duration-200 min-h-[2px] relative"
                          >
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-1 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                              {item.name}: {formatCurrency(item.value)}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                  {/* X-axis labels */}
                  <div className="h-6 flex justify-between gap-0.5 px-1 pt-2 border-t border-zinc-200 dark:border-zinc-700 mt-auto shrink-0">
                    {data.chartData.slice(0, 12).map((item, i) => (
                      <div key={i} className="flex-1 text-center">
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{t("no_chart_data")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Plans & Distribution Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Plan Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5 text-cyan-500" />
                {t("plan_distribution")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : data?.planDistribution?.length ? (
                <div className="space-y-3">
                  {data.planDistribution.slice(0, 5).map((plan, index) => {
                    const total = data.planDistribution.reduce((sum, p) => sum + p.value, 0);
                    const percentage = total > 0 ? (plan.value / total) * 100 : 0;
                    const colors = ["cyan", "purple", "blue", "pink", "indigo"];
                    const color = colors[index % colors.length];

                    return (
                      <div key={plan.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate">{plan.name}</span>
                          <span className="text-muted-foreground">
                            {plan.count} {t("inv")} {formatCurrency(plan.value)}
                          </span>
                        </div>
                        <Progress
                          value={percentage}
                          className={`h-2 [&>div]:bg-${color}-500`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">{t("no_plan_data")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Plans */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-500" />
                  {t("active_plans")}
                </CardTitle>
                <Link
                  href="/admin/ai/investment/plan"
                  className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center"
                >
                  {tCommon("view_all")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : data?.topPlans?.length ? (
                <div className="space-y-2">
                  {data.topPlans.map((plan, index) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                      onClick={() => router.push(`/admin/ai/investment/plan`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                          <Brain className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-2">
                            {plan.name}
                            {plan.trending && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/10 text-cyan-500 rounded">
                                Trending
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${plan.minAmount} - ${plan.maxAmount} · {plan.profitPercentage}% base
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                          {plan.minProfit}% - {plan.maxProfit}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(plan.invested)} invested
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">{t("no_active_plans")}</p>
                  <Button
                    variant="link"
                    className="text-cyan-600 dark:text-cyan-400 mt-2"
                    onClick={() => router.push("/admin/ai/investment/plan")}
                  >
                    {t("create_a_plan")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Investments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-500" />
                  {tCommon("recent_investments")}
                </CardTitle>
                <Link
                  href="/admin/ai/investment/log"
                  className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center"
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
              ) : data?.recentInvestments?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="pb-3 font-medium">User</th>
                        <th className="pb-3 font-medium">Plan</th>
                        <th className="pb-3 font-medium">Type</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Profit</th>
                        <th className="pb-3 font-medium">Result</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.recentInvestments.map((investment, index) => (
                        <motion.tr
                          key={investment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-4 font-medium">{investment.user}</td>
                          <td className="py-4 text-muted-foreground">{investment.plan}</td>
                          <td className="py-4">
                            <span className="flex items-center gap-1">
                              {getTypeIcon(investment.type)}
                              {investment.type}
                            </span>
                          </td>
                          <td className="py-4">{formatCurrency(investment.amount)}</td>
                          <td className="py-4">
                            <span
                              className={investment.profit >= 0 ? "text-green-500" : "text-red-500"}
                            >
                              {investment.profit >= 0 ? "+" : ""}
                              {formatCurrency(investment.profit)}
                            </span>
                          </td>
                          <td className="py-4">
                            {investment.result && (
                              <span className={`flex items-center gap-1 ${getResultColor(investment.result)}`}>
                                {getResultIcon(investment.result)}
                                {investment.result}
                              </span>
                            )}
                          </td>
                          <td className="py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(investment.status)}`}
                            >
                              {investment.status}
                            </span>
                          </td>
                          <td className="py-4 text-muted-foreground text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(investment.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">{tCommon("no_investments_yet")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-500" />
                {tCommon("quick_actions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <QuickActionButton
                  icon="mdi:brain"
                  label={tCommon("plans")}
                  color="cyan"
                  onClick={() => router.push("/admin/ai/investment/plan")}
                />
                <QuickActionButton
                  icon="mdi:clock"
                  label={tCommon("durations")}
                  color="purple"
                  onClick={() => router.push("/admin/ai/investment/duration")}
                />
                <QuickActionButton
                  icon="mdi:history"
                  label={t("investment_logs")}
                  color="blue"
                  onClick={() => router.push("/admin/ai/investment/log")}
                />
                <QuickActionButton
                  icon="mdi:refresh"
                  label={tCommon("refresh")}
                  color="pink"
                  onClick={fetchDashboardData}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// Quick Stat Card Component
function QuickStatCard({
  title,
  value,
  icon,
  color,
  loading,
  href,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
  href?: string;
}) {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-xl border bg-white dark:bg-zinc-900/50 hover:shadow-md transition-all cursor-pointer`}
      onClick={() => href && router.push(href)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-${color}-500/10`}>{icon}</div>
        {loading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <span className="text-2xl font-bold">{value}</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{title}</span>
    </motion.div>
  );
}

// Quick Action Button Component
function QuickActionButton({
  icon,
  label,
  color,
  onClick,
}: {
  icon: string;
  label: string;
  color: string;
  onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    cyan: "from-cyan-500 to-cyan-600",
    purple: "from-purple-500 to-purple-600",
    blue: "from-blue-500 to-blue-600",
    pink: "from-pink-500 to-pink-600",
  };

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300"
    >
      <div
        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
      >
        <Icon icon={icon} className="w-6 h-6 text-white" />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}
