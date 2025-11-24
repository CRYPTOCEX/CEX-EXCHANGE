"use client";

import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStakingAdminAnalyticsStore } from "@/store/staking/admin/analytics";
import { useTranslations } from "next-intl";

interface PoolAnalyticsTabProps {
  pool: StakingPool;
  positions: StakingPosition[];
}

export function PoolAnalyticsTab({ pool, positions }: PoolAnalyticsTabProps) {
  const t = useTranslations("ext");
  const poolAnalytics = useStakingAdminAnalyticsStore(
    (state) => state.poolAnalytics
  );
  const isLoading = useStakingAdminAnalyticsStore((state) => state.isLoading);
  const error = useStakingAdminAnalyticsStore((state) => state.error);
  const timeRange = useStakingAdminAnalyticsStore((state) => state.timeRange);
  const fetchPoolAnalytics = useStakingAdminAnalyticsStore(
    (state) => state.fetchPoolAnalytics
  );
  const setTimeRange = useStakingAdminAnalyticsStore(
    (state) => state.setTimeRange
  );

  useEffect(() => {
    fetchPoolAnalytics(pool.id);
  }, [pool.id, timeRange, fetchPoolAnalytics]);

  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as "7d" | "30d" | "90d" | "1y");
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (!poolAnalytics?.timeSeriesData) return;

    const headers = ["Date", "Staked Amount", "Earnings", "Users"];
    const csvData = poolAnalytics.timeSeriesData.map((item) => [
      item.date,
      item.staked,
      item.earnings,
      item.users,
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${pool.name}_analytics_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.click();
  };

  // If isLoading or no data yet, show isLoading state
  if (isLoading || !poolAnalytics) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-xl font-semibold">{t("pool_analytics")}</h3>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t("last_7_days")}</SelectItem>
                <SelectItem value="30d">{t("last_30_days")}</SelectItem>
                <SelectItem value="90d">{t("last_90_days")}</SelectItem>
                <SelectItem value="1y">{t("last_year")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled>
              <Download className="h-4 w-4 mr-2" />
              {t("export_data")}
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="h-4 w-24 bg-muted animate-pulse rounded"></span>
                    <span className="h-4 w-4 bg-muted animate-pulse rounded-full"></span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-6 w-16 bg-muted animate-pulse rounded mb-2"></div>
                  <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                </CardContent>
              </Card>
            ))}
        </div>
        <div className="h-[400px] bg-muted/20 rounded-lg flex items-center justify-center">
          <div className="text-muted-foreground">
            {t("loading_analytics_data")}.
          </div>
        </div>
      </div>
    );
  }

  // If there's an error, show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-xl font-semibold">{t("pool_analytics")}</h3>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t("last_7_days")}</SelectItem>
                <SelectItem value="30d">{t("last_30_days")}</SelectItem>
                <SelectItem value="90d">{t("last_90_days")}</SelectItem>
                <SelectItem value="1y">{t("last_year")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled>
              <Download className="h-4 w-4 mr-2" />
              {t("export_data")}
            </Button>
          </div>
        </div>
        <Card className="p-6">
          <div className="text-center text-red-500">
            <h3 className="text-lg font-medium mb-2">
              {t("error_loading_analytics")}
            </h3>
            <p>{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => fetchPoolAnalytics(pool.id)}
            >
              {t("Retry")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Destructure analytics data for easier access
  const { timeSeriesData, metrics, distributions, performance } = poolAnalytics;

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-xl font-semibold">{t("pool_analytics")}</h3>

        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t("last_7_days")}</SelectItem>
              <SelectItem value="30d">{t("last_30_days")}</SelectItem>
              <SelectItem value="90d">{t("last_90_days")}</SelectItem>
              <SelectItem value="1y">{t("last_year")}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            {t("export_data")}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>{t("active_positions")}</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activePositions}</div>
            <div className="flex items-center mt-1 text-xs text-green-500">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>
                {t("active_out_of")}
                {positions.length}
                {t("total_positions")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>{t("total_earnings")}</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalEarnings.toFixed(4)} {pool.symbol}
            </div>
            <div className="flex items-center mt-1 text-xs text-green-500">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>
                +{(pool.apr / 12).toFixed(2)}
                {t("%_monthly_rate")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>
                {t("Avg")}. {t("stake_amount")}
              </span>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.avgStakeAmount.toFixed(2)} {pool.symbol}
            </div>
            <div className="flex items-center mt-1 text-xs text-muted-foreground">
              <span>
                min
                {pool.minStake} {pool.symbol}
              </span>
              <span className="mx-1">•</span>
              <span>
                {t("max")}
                {pool.maxStake || "∞"} {pool.symbol}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>{t("Performance")}</span>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics.efficiency * 100).toFixed(1)}%
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span
                className={
                  metrics.efficiency >= 1 ? "text-green-500" : "text-amber-500"
                }
              >
                {metrics.efficiency >= 1 ? (
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 inline mr-1" />
                )}
                {metrics.actualAPR.toFixed(2)}
                {t("%_actual_apr")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
          <TabsTrigger value="earnings">{t("Earnings")}</TabsTrigger>
          <TabsTrigger value="users">{t("Users")}</TabsTrigger>
          <TabsTrigger value="performance">{t("Performance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("staking_overview")}</CardTitle>
              <CardDescription>
                {t("total_staked_amount_and_earnings_over_time")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient
                        id="colorStaked"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8884d8"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8884d8"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="staked"
                      name={`Staked ${pool.symbol}`}
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#colorStaked)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("earnings_distribution")}</CardTitle>
                <CardDescription>
                  {t("how_earnings_are_distributed")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributions.earningsDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {distributions.earningsDistribution.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("pool_performance")}</CardTitle>
                <CardDescription>{t("expected_vs_actual_apr")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t("expected_apr")}</span>
                    <span className="font-medium">{metrics.expectedAPR}%</span>
                  </div>
                  <Progress value={100} className="h-2 bg-muted" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t("actual_apr")}</span>
                    <span
                      className={cn(
                        "font-medium",
                        metrics.actualAPR >= metrics.expectedAPR
                          ? "text-green-500"
                          : "text-amber-500"
                      )}
                    >
                      {metrics.actualAPR.toFixed(2)}%
                    </span>
                  </div>
                  <Progress
                    value={(metrics.actualAPR / metrics.expectedAPR) * 100}
                    className={cn(
                      "h-2",
                      metrics.actualAPR >= metrics.expectedAPR
                        ? "bg-green-500"
                        : "bg-amber-500"
                    )}
                  />
                </div>

                <div className="p-4 rounded-lg bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        metrics.efficiency >= 1
                          ? "bg-green-500/20 text-green-500"
                          : metrics.efficiency >= 0.95
                            ? "bg-amber-500/20 text-amber-500"
                            : "bg-red-500/20 text-red-500"
                      )}
                    >
                      {metrics.efficiency >= 1 ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : metrics.efficiency >= 0.95 ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {t("efficiency_rating")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {metrics.efficiency >= 1
                          ? "Exceeding expectations"
                          : metrics.efficiency >= 0.95
                            ? "Meeting expectations"
                            : "Below expectations"}
                      </div>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      metrics.efficiency >= 1
                        ? "bg-green-500"
                        : metrics.efficiency >= 0.95
                          ? "bg-amber-500"
                          : "bg-red-500"
                    )}
                  >
                    {(metrics.efficiency * 100).toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("earnings_over_time")}</CardTitle>
              <CardDescription>
                {t("daily_earnings_generated_by_the_pool")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="earnings"
                      name={`Earnings (${pool.symbol})`}
                      stroke="#82ca9d"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("earnings_by_type")}</CardTitle>
                <CardDescription>
                  {t("distribution_of_earnings_by_type")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributions.earningsByType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {distributions.earningsByType.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("earnings_metrics")}</CardTitle>
                <CardDescription>
                  {t("key_earnings_performance_indicators")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium">
                          {t("average_daily_earnings")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("per_position")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold">
                      {(
                        (pool.apr * metrics.avgStakeAmount) /
                        365 /
                        100
                      ).toFixed(6)}{" "}
                      {pool.symbol}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">
                          {t("distribution_frequency")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("how_often_earnings_are_paid")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold capitalize">
                      {pool.earningFrequency}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-500" />
                      <div>
                        <div className="font-medium">{t("admin_fee")}</div>
                        <div className="text-sm text-muted-foreground">
                          {t("platform_revenue")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold">
                      {pool.adminFeePercentage}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("user_activity")}</CardTitle>
              <CardDescription>{t("active_users_over_time")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="users" name="Active Users" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("user_retention")}</CardTitle>
                <CardDescription>
                  {t("how_long_users_stay_in_the_pool")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributions.userRetention}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {distributions.userRetention.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("user_metrics")}</CardTitle>
                <CardDescription>{t("key_user_statistics")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">{t("total_users")}</div>
                        <div className="text-sm text-muted-foreground">
                          {t("all_time")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold">{positions.length}</div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium">{t("retention_rate")}</div>
                        <div className="text-sm text-muted-foreground">
                          {t("users_who_complete_lock_period")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold">
                      {positions.filter((p) => p.status === "COMPLETED")
                        .length > 0
                        ? (
                            (positions.filter((p) => p.status === "COMPLETED")
                              .length /
                              positions.length) *
                            100
                          ).toFixed(0)
                        : "N/A"}
                      %
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      <div>
                        <div className="font-medium">
                          {t("early_withdrawal_rate")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("users_who_withdraw_early")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold">
                      {positions.filter((p) => p.status === "CANCELLED")
                        .length > 0
                        ? (
                            (positions.filter((p) => p.status === "CANCELLED")
                              .length /
                              positions.length) *
                            100
                          ).toFixed(0)
                        : "0"}
                      %
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("apr_performance")}</CardTitle>
              <CardDescription>
                {t("expected_vs_actual_apr_over_time")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performance.aprOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="expectedAPR"
                      name="Expected APR (%)"
                      stroke="#8884d8"
                      strokeDasharray="5 5"
                    />
                    <Line
                      type="monotone"
                      dataKey="actualAPR"
                      name="Actual APR (%)"
                      stroke="#82ca9d"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("efficiency_trend")}</CardTitle>
                <CardDescription>
                  {t("pool_efficiency_over_time")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performance.efficiencyTrend}>
                      <defs>
                        <linearGradient
                          id="colorEfficiency"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#82ca9d"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#82ca9d"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0.8, 1.2]} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="efficiency"
                        name="Efficiency"
                        stroke="#82ca9d"
                        fillOpacity={1}
                        fill="url(#colorEfficiency)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("performance_summary")}</CardTitle>
                <CardDescription>
                  {t("overall_pool_performance_metrics")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium">
                          {t("profit_efficiency")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("actual_vs_expected_profit")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold">
                      {(metrics.efficiency * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">
                          {t("consistency_rating")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("stability_of_returns")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold">
                      {metrics.efficiency >= 0.98
                        ? "A+"
                        : metrics.efficiency >= 0.95
                          ? "A"
                          : metrics.efficiency >= 0.9
                            ? "A-"
                            : "B+"}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-purple-500" />
                      <div>
                        <div className="font-medium">
                          {t("risk_assessment")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("based_on_historical_volatility")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold">
                      {metrics.efficiency >= 0.95
                        ? "Low"
                        : metrics.efficiency >= 0.9
                          ? "Medium-Low"
                          : "Medium"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
