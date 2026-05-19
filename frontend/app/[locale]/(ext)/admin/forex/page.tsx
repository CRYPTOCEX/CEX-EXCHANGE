"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  BarChart3,
  Briefcase,
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
  Trophy,
  Target,
  Activity,
  Wallet,
  RefreshCw,
  Rocket,
  Signal,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
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
    investmentsGrowth: number;
    activeUsers: number;
    usersGrowth: number;
    activePlans: number;
    plansGrowth: number;
    totalAccounts: number;
    accountsGrowth: number;
    totalProfit: number;
    activeInvestments: number;
    completedInvestments: number;
    winRate: number;
    liveAccounts: number;
    demoAccounts: number;
    totalSignals: number;
    activeSignals: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
  };
  chartData: Array<{ name: string; value: number }>;
  planDistribution: Array<{ name: string; value: number }>;
  investmentResults: {
    win: number;
    loss: number;
    draw: number;
  };
  recentInvestments: Array<{
    id: string;
    user: string;
    userId: string;
    plan: string;
    amount: number;
    profit: number;
    date: string;
    status: string;
    result: string;
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
    status: boolean;
    trending: boolean;
  }>;
}

export default function ForexDashboardPage() {
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
        url: `/api/admin/forex?timeframe=${timeframe}`,
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
    investmentsGrowth: 0,
    activeUsers: 0,
    usersGrowth: 0,
    activePlans: 0,
    plansGrowth: 0,
    totalAccounts: 0,
    accountsGrowth: 0,
    totalProfit: 0,
    activeInvestments: 0,
    completedInvestments: 0,
    winRate: 0,
    liveAccounts: 0,
    demoAccounts: 0,
    totalSignals: 0,
    activeSignals: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
  };

  const results = data?.investmentResults || { win: 0, loss: 0, draw: 0 };
  const totalResults = results.win + results.loss + results.draw;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <DollarSign className="h-3.5 w-3.5" />,
          text: "Forex Trading",
          gradient: "from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950",
          iconColor: "text-emerald-500",
          textColor: "text-emerald-600 dark:text-emerald-400",
        }}
        title={[
          { text: "Forex " },
          {
            text: "Dashboard",
            gradient:
              "from-emerald-600 via-teal-500 to-emerald-600 dark:from-emerald-400 dark:via-teal-400 dark:to-emerald-400",
          },
        ]}
        description="Monitor investments, manage accounts, and track trading performance"
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContentAlign="center"
        background={{
          orbs: [
            {
              color: "#10b981",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#14b8a6",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#10b981", "#14b8a6"],
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
              onClick={() => router.push("/admin/forex/plan")}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg font-semibold"
            >
              <Rocket className="w-5 h-5 mr-2" />
              {t("manage_plans")}
            </Button>
          </div>
        }
        bottomSlot={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <StatsCard
              label={tCommon("total_investments")}
              value={loading ? "-" : formatCurrency(overview.totalInvestments)}
              icon={DollarSign}
              index={0}
              change={overview.investmentsGrowth ? `${overview.investmentsGrowth > 0 ? "+" : ""}${overview.investmentsGrowth}%` : undefined}
              {...statsCardColors.green}
            />
            <StatsCard
              label={tCommon("active_users")}
              value={loading ? "-" : overview.activeUsers}
              icon={Users}
              index={1}
              change={overview.usersGrowth ? `${overview.usersGrowth > 0 ? "+" : ""}${overview.usersGrowth}%` : undefined}
              {...statsCardColors.blue}
            />
            <StatsCard
              label={t("total_accounts")}
              value={loading ? "-" : overview.totalAccounts}
              icon={Briefcase}
              index={2}
              change={overview.accountsGrowth ? `${overview.accountsGrowth > 0 ? "+" : ""}${overview.accountsGrowth}%` : undefined}
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
            title={tCommon("active")}
            value={overview.activeInvestments}
            icon={<Activity className="w-5 h-5 text-blue-500" />}
            color="blue"
            loading={loading}
          />
          <QuickStatCard
            title={tCommon("completed")}
            value={overview.completedInvestments}
            icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
            color="green"
            loading={loading}
          />
          <QuickStatCard
            title={t("live_accounts")}
            value={overview.liveAccounts}
            icon={<CreditCard className="w-5 h-5 text-emerald-500" />}
            color="emerald"
            loading={loading}
          />
          <QuickStatCard
            title={t("demo_accounts")}
            value={overview.demoAccounts}
            icon={<Briefcase className="w-5 h-5 text-purple-500" />}
            color="purple"
            loading={loading}
          />
          <QuickStatCard
            title={t("pending_deposits")}
            value={overview.pendingDeposits}
            icon={<ArrowDownCircle className="w-5 h-5 text-amber-500" />}
            color="amber"
            loading={loading}
            href="/admin/forex/deposit"
          />
          <QuickStatCard
            title={tExt("pending_withdrawals")}
            value={overview.pendingWithdrawals}
            icon={<ArrowUpCircle className="w-5 h-5 text-red-500" />}
            color="red"
            loading={loading}
            href="/admin/forex/withdraw"
          />
        </motion.div>

        {/* Results & Performance Row */}
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
                <Trophy className="w-5 h-5 text-emerald-500" />
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
                    <span className="text-sm text-muted-foreground">Total Completed: </span>
                    <span className="font-bold">{totalResults}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investment Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <LineChart className="w-5 h-5 text-emerald-500" />
                {t("investment_volume")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : data?.chartData?.length ? (
                <div className="h-64 relative">
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between h-[85%] gap-1 px-2">
                    {data.chartData.map((item, i) => {
                      const maxValue = Math.max(...data.chartData.map((d) => d.value), 1);
                      const height = (item.value / maxValue) * 100;

                      return (
                        <div key={i} className="flex-1 group relative">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(height, 2)}%` }}
                            transition={{ duration: 0.5, delay: i * 0.03 }}
                            className="bg-gradient-to-t from-emerald-600 to-emerald-400 dark:from-emerald-500 dark:to-emerald-300 rounded-t-sm group-hover:from-emerald-700 group-hover:to-emerald-500 transition-all duration-200 min-h-[2px]"
                          />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                            {formatCurrency(item.value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 transform translate-y-6">
                    {data.chartData.map((item, i) => (
                      <div
                        key={i}
                        className="text-[10px] text-muted-foreground truncate text-center flex-1"
                      >
                        {item.name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No chart data available</p>
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
                <PieChart className="w-5 h-5 text-emerald-500" />
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
                    const colors = ["emerald", "teal", "cyan", "blue", "purple"];
                    const color = colors[index % colors.length];

                    return (
                      <div key={plan.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate">{plan.name}</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(plan.value)}
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
                  <p className="text-muted-foreground text-sm">No plan data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Plans */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-emerald-500" />
                  {t("active_plans")}
                </CardTitle>
                <Link
                  href="/admin/forex/plan"
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center"
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
                      onClick={() => router.push(`/admin/forex/plan`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                          <Rocket className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-2">
                            {plan.name}
                            {plan.trending && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-500 rounded">
                                Trending
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${plan.minAmount} - ${plan.maxAmount}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {plan.minProfit}% - {plan.maxProfit}%
                        </div>
                        <div className="text-xs text-muted-foreground">Profit Range</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Rocket className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No active plans</p>
                  <Button
                    variant="link"
                    className="text-emerald-600 dark:text-emerald-400 mt-2"
                    onClick={() => router.push("/admin/forex/plan")}
                  >
                    Create a plan
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
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                  {tCommon("recent_investments")}
                </CardTitle>
                <Link
                  href="/admin/forex/investment"
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center"
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
                              {new Date(investment.date).toLocaleDateString()}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No investments yet</p>
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
                <Zap className="w-5 h-5 text-emerald-500" />
                {tCommon("quick_actions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <QuickActionButton
                  icon="mdi:account-multiple"
                  label={tCommon("accounts")}
                  color="emerald"
                  onClick={() => router.push("/admin/forex/account")}
                />
                <QuickActionButton
                  icon="mdi:rocket"
                  label={tCommon("plans")}
                  color="teal"
                  onClick={() => router.push("/admin/forex/plan")}
                />
                <QuickActionButton
                  icon="mdi:chart-line"
                  label={tCommon("investments")}
                  color="cyan"
                  onClick={() => router.push("/admin/forex/investment")}
                />
                <QuickActionButton
                  icon="mdi:signal"
                  label={t("signals")}
                  color="blue"
                  onClick={() => router.push("/admin/forex/signal")}
                />
                <QuickActionButton
                  icon="mdi:arrow-down-circle"
                  label={tCommon("deposits")}
                  color="purple"
                  onClick={() => router.push("/admin/forex/deposit")}
                />
                <QuickActionButton
                  icon="mdi:arrow-up-circle"
                  label={tCommon("withdrawals")}
                  color="amber"
                  onClick={() => router.push("/admin/forex/withdraw")}
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
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-xl border bg-white dark:bg-zinc-900/50 hover:shadow-md transition-all cursor-pointer ${
        href ? "hover:border-" + color + "-500/50" : ""
      }`}
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

  return content;
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
    emerald: "from-emerald-500 to-emerald-600",
    teal: "from-teal-500 to-teal-600",
    cyan: "from-cyan-500 to-cyan-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    amber: "from-amber-500 to-amber-600",
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
