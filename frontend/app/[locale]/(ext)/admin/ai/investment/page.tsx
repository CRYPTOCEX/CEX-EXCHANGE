"use client";

import { useEffect, useState } from "react";
import { m } from "framer-motion";
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
import { Loadable, Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { statusTone } from "@/lib/status-tone";
import type { BadgeTone } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

/**
 * Ink for a bare (untinted) status glyph+label. The HUE decision lives in
 * `lib/status-tone.ts`; this table only says how a tone is painted when the
 * element is not a chip.
 */
const TONE_INK: Record<BadgeTone, string> = {
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  neutral: "text-subtle-foreground",
};

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
      // $fetch never throws, so the catch below is dead — surface the failure
      // here instead of falling through to an empty dashboard.
      if (response.error) {
        setError(
          typeof response.error === "string"
            ? response.error
            : t("failed_to_load_dashboard_data")
        );
      } else if (response.data) {
        setData(response.data);
      }
    } catch (err: any) {
      setError(err.message || t("failed_to_load_dashboard_data"));
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
      return <Leaf className="w-4 h-4 text-success" />;
    }
    return <Coins className="w-4 h-4 text-primary" />;
  };

  // Only take over the page when there is nothing to show — this refetches on
  // a timer and one failed poll must not wipe an already-loaded dashboard.
  if (error && !data) {
    return (
      // `pt-header-clear` because this branch REPLACES the page, hero and all,
      // so nothing above it is left to clear the `fixed top-0` bar.
      <div className="flex flex-col items-center justify-center min-h-[60vh] pt-header-clear px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-destructive" />
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
    /* Dashboard root, no background of its own. The hero below mounts
       `WorkspaceGround`; the grey wash that used to be here covered it, so the
       ground under every one of these cards was invisible. `min-h-screen` is
       kept because the ground is `fixed` and needs the shell's height. */
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "AI Investment",
        }}
        title={t("ai_investment_dashboard")}
        description={t("monitor_ai_powered_investments_manage_plans")}
        layout="split"
        rightContentAlign="center"
        rightContent={
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="h-10 px-4 rounded-lg bg-card border border-border text-sm font-medium"
            >
              <option value="1m">{tCommon("last_30_days")}</option>
              <option value="3m">{t("last_3_months")}</option>
              <option value="1y">{t("last_12_months")}</option>
            </select>
            <Button
              onClick={() => router.push("/admin/ai/investment/plan")}
              className="bg-primary hover:bg-primary text-primary-foreground shadow-lg font-semibold"
            >
              <Brain className="w-5 h-5 mr-2" />
              {t("manage_plans")}
            </Button>
          </div>
        }
        stats={[
          { icon: DollarSign, label: tCommon("total_invested"), value: loading ? "-" : formatCurrency(overview.totalAmount) },
          { icon: overview.totalProfit >= 0 ? TrendingUp : TrendingDown, label: tCommon("total_profit"), value: loading ? "-" : formatCurrency(overview.totalProfit) },
          { icon: Activity, label: tCommon("active_investments"), value: loading ? "-" : overview.activeInvestments },
          { icon: Trophy, label: tCommon("win_rate"), value: loading ? "-" : `${overview.winRate}%` },
        ]}
      />

      {/* Main Content */}
      <div className="container mx-auto py-8 space-y-8">
        {/* Quick Stats Row */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          <StatsCard
            label={tCommon("completed")}
            value={loading ? "-" : overview.completedInvestments}
            icon={CheckCircle2}
            index={0}
            {...statsCardColors.success}
          />
          <StatsCard
            label={tCommon("cancelled")}
            value={loading ? "-" : overview.cancelledInvestments}
            icon={XCircle}
            index={1}
            {...statsCardColors.red}
          />
          <Link href="/admin/ai/investment/plan" className="block h-full">
            <StatsCard
              label={t("active_plans")}
              value={loading ? "-" : overview.activePlans}
              icon={Brain}
              index={2}
              className="h-full"
              {...statsCardColors.primary}
            />
          </Link>
          <Link href="/admin/ai/investment/duration" className="block h-full">
            <StatsCard
              label={tCommon("durations")}
              value={loading ? "-" : overview.totalDurations}
              icon={Timer}
              index={3}
              className="h-full"
              {...statsCardColors.primary}
            />
          </Link>
          <StatsCard
            label={t("spot_investments")}
            value={loading ? "-" : overview.spotInvestments}
            icon={Coins}
            index={4}
            {...statsCardColors.primary}
          />
          <StatsCard
            label={t("eco_investments")}
            value={loading ? "-" : overview.ecoInvestments}
            icon={Leaf}
            index={5}
            {...statsCardColors.success}
          />
        </m.div>

        {/* Results & Type Distribution Row */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Investment Results */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                {t("investment_results")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {/*
                ONE TREE, TWO STATES.
                A `Skeleton h-40` against a panel whose real height is three
                label/figure rows (30px `text-2xl leading-tight` each), three
                8px bars, a `space-y-4` between all six, and a `pt-4 border-t`
                footer — about 250px, not 160. The card therefore grew by ~90px
                the moment the data landed, and everything below it in the
                column moved with it. The labels, the colour dots, the bars and
                the footer caption are all knowable before the fetch; only the
                counts are not.
              */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="font-medium">{tCommon("win")}</span>
                  </div>
                  <span className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-success"><Loadable loading={loading} placeholder="0,000">{results.win}</Loadable></span>
                </div>
                <Progress
                  value={totalResults > 0 ? (results.win / totalResults) * 100 : 0}
                  className="h-2 [&>div]:bg-success"
                />

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <span className="font-medium">{tCommon("loss")}</span>
                  </div>
                  <span className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-down"><Loadable loading={loading} placeholder="0,000">{results.loss}</Loadable></span>
                </div>
                <Progress
                  value={totalResults > 0 ? (results.loss / totalResults) * 100 : 0}
                  className="h-2 [&>div]:bg-destructive"
                />

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-muted" />
                    <span className="font-medium">{tCommon("draw")}</span>
                  </div>
                  <span className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-subtle-foreground"><Loadable loading={loading} placeholder="0,000">{results.draw}</Loadable></span>
                </div>
                <Progress
                  value={totalResults > 0 ? (results.draw / totalResults) * 100 : 0}
                  className="h-2 [&>div]:bg-muted"
                />

                <div className="pt-4 border-t text-center">
                  <span className="text-sm text-muted-foreground">{t("total_completed")}: </span>
                  <span className="font-mono font-semibold tabular-nums text-foreground"><Loadable loading={loading} placeholder="0,000">{totalResults}</Loadable></span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investment Type Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                {t("investment_types")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {/*
                ONE TREE, TWO STATES.
                A `Skeleton h-40` against a panel whose real height is three
                label/figure rows (30px `text-2xl leading-tight` each), three
                8px bars, a `space-y-4` between all six, and a `pt-4 border-t`
                footer — about 250px, not 160. The card therefore grew by ~90px
                the moment the data landed, and everything below it in the
                column moved with it. The labels, the colour dots, the bars and
                the footer caption are all knowable before the fetch; only the
                counts are not.
              */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Spot</span>
                  </div>
                  <span className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-primary">
                    <Loadable loading={loading} placeholder="0,000">{overview.spotInvestments}</Loadable>
                  </span>
                </div>
                <div className="relative h-4 bg-success/20 rounded-full overflow-hidden">
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${spotPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute left-0 top-0 h-full bg-primary rounded-full"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-success" />
                    <span className="font-semibold">Eco</span>
                  </div>
                  <span className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-success">
                    <Loadable loading={loading} placeholder="0,000">{overview.ecoInvestments}</Loadable>
                  </span>
                </div>
                <div className="flex justify-between text-sm tabular-nums text-muted-foreground pt-2 border-t">
                  <span>{spotPercent.toFixed(1)}% Spot</span>
                  <span>{(100 - spotPercent).toFixed(1)}% Eco</span>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("avg_investment")}:</span>
                    <span className="font-mono font-semibold tabular-nums text-primary">
                      {formatCurrency(overview.averageInvestment)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investment Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <LineChart className="w-5 h-5 text-primary" />
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
                          <m.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(height, 2)}%` }}
                            transition={{ duration: 0.5, delay: i * 0.03 }}
                            className="w-full bg-primary rounded-t-sm group-hover:bg-primary transition-all duration-200 min-h-[2px] relative"
                          >
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-1 px-2 py-1 bg-popover text-popover-foreground border border-border shadow-md text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                              {item.name}: {formatCurrency(item.value)}
                            </div>
                          </m.div>
                        </div>
                      );
                    })}
                  </div>
                  {/* X-axis labels */}
                  <div className="h-6 flex justify-between gap-0.5 px-1 pt-2 border-t border-border mt-auto shrink-0">
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
        </m.div>

        {/* Plans & Distribution Row */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Plan Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                {t("plan_distribution")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : data?.planDistribution?.length ? (
                <div className="space-y-3">
                  {data.planDistribution.slice(0, 5).map((plan) => {
                    const total = data.planDistribution.reduce((sum, p) => sum + p.value, 0);
                    const percentage = total > 0 ? (plan.value / total) * 100 : 0;

                    return (
                      <div key={plan.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate">{plan.name}</span>
                          <span className="text-muted-foreground">
                            {plan.count} {t("inv")} {formatCurrency(plan.value)}
                          </span>
                        </div>
                        {/* Each bar sits directly beneath its own plan name and
                            value, so a per-row hue separated nothing; the fill
                            is the accent. The old class was built from a hue
                            name at render time and so never painted at all. */}
                        <Progress value={percentage} className="h-2" />
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
                  <Brain className="w-5 h-5 text-primary" />
                  {t("active_plans")}
                </CardTitle>
                <Link
                  href="/admin/ai/investment/plan"
                  className="text-xs font-medium text-primary hover:text-primary flex items-center"
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
                    <m.div
                      key={plan.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                      onClick={() => router.push(`/admin/ai/investment/plan`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Brain className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-2">
                            {plan.name}
                            {plan.trending && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary-ink rounded">
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
                        <div className="text-sm font-medium text-primary">
                          {plan.minProfit}% - {plan.maxProfit}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(plan.invested)} invested
                        </div>
                      </div>
                    </m.div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">{t("no_active_plans")}</p>
                  <Button
                    variant="link"
                    className="text-primary mt-2"
                    onClick={() => router.push("/admin/ai/investment/plan")}
                  >
                    {t("create_a_plan")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </m.div>

        {/* Recent Investments */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  {tCommon("recent_investments")}
                </CardTitle>
                <Link
                  href="/admin/ai/investment/log"
                  className="text-xs font-medium text-primary hover:text-primary flex items-center"
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
                        <m.tr
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
                              className={investment.profit >= 0 ? "text-up" : "text-down"}
                            >
                              {investment.profit >= 0 ? "+" : ""}
                              {formatCurrency(investment.profit)}
                            </span>
                          </td>
                          <td className="py-4">
                            {investment.result && (
                              <span className={`flex items-center gap-1 ${TONE_INK[statusTone(investment.result)]}`}>
                                {getResultIcon(investment.result)}
                                {investment.result}
                              </span>
                            )}
                          </td>
                          <td className="py-4">
                            <StatusBadge
                              status={investment.status}
                              label={investment.status}
                            />
                          </td>
                          <td className="py-4 text-muted-foreground text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(investment.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                        </m.tr>
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
        </m.div>

        {/* Quick Actions */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
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
        </m.div>
      </div>
    </div>
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
    cyan: "bg-primary",
    purple: "bg-primary",
    blue: "bg-primary",
    pink: "bg-primary",
  };

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300"
    >
      <div
        className={`w-12 h-12 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
      >
        <Icon icon={icon} className="w-6 h-6 text-primary-foreground" />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}
