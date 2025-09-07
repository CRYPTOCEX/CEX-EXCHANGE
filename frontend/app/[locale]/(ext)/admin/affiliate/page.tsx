"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  DollarSign,
  UserPlus,
  Percent,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Progress } from "@/components/ui/progress";
import { $fetch } from "@/lib/api";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  type TooltipProps,
  Area,
  AreaChart,
} from "recharts";
import { useTranslations } from "next-intl";

// Types for dashboard data
interface DashboardData {
  metrics: {
    totalAffiliates: MetricData;
    totalEarnings: MetricData;
    totalReferrals: MetricData;
    conversionRate: MetricData;
  };
  charts: {
    monthlyEarnings: {
      month: string;
      amount: number;
    }[];
    affiliateStatus: {
      status: string;
      count: number;
    }[];
    topAffiliates: {
      name: string;
      id: string;
      referrals: number;
      earnings: number;
      conversionRate: number;
    }[];
  };
}
interface MetricData {
  value: string | number;
  change: string;
  trend: "up" | "down";
}
// Custom tooltip component for earnings chart
const CustomEarningsTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  const t = useTranslations("ext");
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-md shadow-md">
        <p className="font-medium text-sm text-zinc-400">{label}</p>
        <p className="text-white text-lg font-bold">
          / $
          {payload[0].value?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};
// Custom tooltip component for pie chart
const CustomPieTooltip = ({
  active,
  payload,
}: TooltipProps<number, string>) => {
  const t = useTranslations("ext");
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-3 rounded-md shadow-md">
        <p className="font-medium text-sm capitalize">{payload[0].name}</p>
        <p className="text-primary text-lg font-bold">
          {payload[0].value} {t("affiliates")}
        </p>
      </div>
    );
  }
  return null;
};
// Custom label for pie chart
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  index,
  name,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};
export default function AdminDashboard() {
  const t = useTranslations("ext");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchDashboardData();
  }, []);
  async function fetchDashboardData() {
    setLoading(true);
    const { data, error } = await $fetch({
      url: "/api/admin/affiliate/dashboard",
      silentSuccess: true,
    });
    if (!error) {
      setDashboardData(data);
      setError(null);
    } else {
      setError(error);
    }
    console.error("Error fetching dashboard data:", error);
    setLoading(false);
  }
  if (loading && !dashboardData) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("affiliate_dashboard")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("loading_affiliate_data")}.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-6">
                <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("affiliate_dashboard")}
            </h1>
            <p className="text-red-500 mt-1">{error}</p>
          </div>
          <Button onClick={fetchDashboardData}>{t("Retry")}</Button>
        </div>
      </div>
    );
  }
  // Extract data for display
  const metrics = dashboardData?.metrics || {
    totalAffiliates: {
      value: 0,
      change: "0",
      trend: "up",
    },
    totalEarnings: {
      value: 0,
      change: "0",
      trend: "up",
    },
    totalReferrals: {
      value: 0,
      change: "0",
      trend: "up",
    },
    conversionRate: {
      value: 0,
      change: "0",
      trend: "up",
    },
  };
  const charts = dashboardData?.charts || {
    monthlyEarnings: [],
    affiliateStatus: [],
    topAffiliates: [],
  };
  // Enhanced colors for pie chart
  const STATUS_COLORS = {
    ACTIVE: "#10b981",
    // emerald-500
    PENDING: "#f59e0b",
    // amber-500
    SUSPENDED: "#ef4444",
    // red-500
    INACTIVE: "#6366f1", // indigo-500
  };
  // Format monthly earnings data for better display
  const formattedMonthlyEarnings = charts.monthlyEarnings.map((item) => ({
    ...item,
    formattedAmount: `$${item.amount.toLocaleString()}`,
    // Format month for better display
    displayMonth: new Date(item.month + "-01").toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
  }));
  // Find the maximum value for the chart
  const maxEarnings = Math.max(
    ...formattedMonthlyEarnings.map((item) => item.amount),
    10
  ); // Ensure at least 10 for empty data
  // Custom formatter for Y axis
  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("affiliate_dashboard")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("key_metrics_overview")}
          </p>
        </div>
      </div>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Affiliates"
          value={metrics.totalAffiliates.value.toString()}
          change={`${metrics.totalAffiliates.change}%`}
          trend={metrics.totalAffiliates.trend}
          description="from last month"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Total Earnings"
          value={`$${Number(metrics.totalEarnings.value).toLocaleString()}`}
          change={`${metrics.totalEarnings.change}%`}
          trend={metrics.totalEarnings.trend}
          description="from last month"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Total Referrals"
          value={metrics.totalReferrals.value.toString()}
          change={`${metrics.totalReferrals.change}%`}
          trend={metrics.totalReferrals.trend}
          description="from last month"
          icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate.value}%`}
          change={`${metrics.conversionRate.change}%`}
          trend={metrics.conversionRate.trend}
          description="from last month"
          icon={<Percent className="h-4 w-4 text-muted-foreground" />}
        />
      </div>
      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Earnings */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("monthly_earnings")}</CardTitle>
            <CardDescription>
              {t("revenue_generated_through_the_affiliate_program")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={formattedMonthlyEarnings}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 20,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="colorEarnings"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#8884d8"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#888"
                    strokeOpacity={0.1}
                  />
                  <XAxis
                    dataKey="displayMonth"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#888",
                      fontSize: 12,
                    }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#888",
                      fontSize: 12,
                    }}
                    tickFormatter={formatYAxis}
                    domain={[0, Math.ceil(maxEarnings * 1.2)]} // Add 20% padding to the max value
                  />
                  <Tooltip content={<CustomEarningsTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#8884d8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEarnings)"
                    activeDot={{
                      r: 6,
                      strokeWidth: 0,
                    }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        {/* Affiliate Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t("affiliate_status")}</CardTitle>
            <CardDescription>{t("distribution_by_status")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.affiliateStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                    label={renderCustomizedLabel}
                    paddingAngle={2}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  >
                    {charts.affiliateStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          STATUS_COLORS[
                            entry.status as keyof typeof STATUS_COLORS
                          ] || "#8884d8"
                        }
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    formatter={(value) => (
                      <span className="capitalize text-sm">
                        {value.toLowerCase()}
                      </span>
                    )}
                    iconType="circle"
                    iconSize={10}
                    wrapperStyle={{
                      paddingTop: 20,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("quick_actions")}</CardTitle>
            <CardDescription>
              {t("common_administrative_tasks")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link
              href="/admin/affiliate/settings"
              className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{t("configure_commission_settings")}</span>
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin/affiliate/condition"
              className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{t("manage_conditions")}</span>
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin/affiliate/reward"
              className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{t("manage_rewards")}</span>
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
      {/* Top Affiliates */}
      <Card>
        <CardHeader>
          <CardTitle>{t("top_performing_affiliates")}</CardTitle>
          <CardDescription>{t("ranked_by_earnings")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {charts.topAffiliates.slice(0, 3).map((affiliate, i) => {
              return (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{affiliate.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("id")}
                        {affiliate.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        / $
                        {affiliate.earnings.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {affiliate.referrals} {t("referrals")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{t("conversion_rate")}</span>
                      <span className="font-medium">
                        {affiliate.conversionRate}%
                      </span>
                    </div>
                    <Progress
                      value={affiliate.conversionRate}
                      className="h-2"
                      indicatorClassName="bg-gradient-to-r from-indigo-500 to-purple-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
// Helper component for metric cards
function MetricCard({
  title,
  value,
  change,
  trend,
  description,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs">
          <span className={trend === "up" ? "text-green-500" : "text-red-500"}>
            {trend === "up" ? (
              <ChevronUp className="h-3 w-3 inline mr-1" />
            ) : (
              <ChevronDown className="h-3 w-3 inline mr-1" />
            )}
            {change}
          </span>
          <span className="text-muted-foreground ml-1">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}
