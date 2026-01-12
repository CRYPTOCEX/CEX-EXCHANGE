"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, RefreshCw, Mail, MessageSquare, Smartphone, Inbox, BarChart3, Send, XCircle, CheckCircle2, Bell, Eye, Activity } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface MetricsData {
  period: string;
  timestamp: string;
  overview: {
    totalSent: number;
    totalFailed: number;
    successRate: string;
    cacheHitRate?: number;
  };
  byChannel: {
    [key: string]: {
      sent: number;
      failed: number;
      successRate: string;
    };
  };
  byType: {
    [key: string]: {
      sent: number;
      failed: number;
    };
  };
}

interface AnalyticsData {
  timeframe: string;
  timestamp: string;
  kpis: Array<{
    id: string;
    title: string;
    value: number | string;
    change: number;
    trend: Array<{ date: string; value: number }>;
    icon: string;
  }>;
  charts: {
    notificationsOverTime: Array<{
      date: string;
      total: number;
      sent: number;
      failed: number;
    }>;
    channelBreakdown: Array<{
      date: string;
      "In-App": number;
      Email: number;
      SMS: number;
      Push: number;
    }>;
    statusBreakdown: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    channelTotals: Array<{
      name: string;
      value: number;
      color: string;
    }>;
  };
}

// KPI Card with mini sparkline
function KPICard({
  title,
  value,
  change,
  trend,
  icon: IconName,
  index,
}: {
  title: string;
  value: string | number;
  change: number;
  trend: Array<{ date: string; value: number }>;
  icon: string;
  index: number;
}) {
  const iconMap: Record<string, any> = {
    Bell,
    CheckCircle2,
    XCircle,
    Eye,
  };
  const Icon = iconMap[IconName] || Bell;
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
              {change !== 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? "text-green-500" : "text-red-500"}`}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(change).toFixed(1)}%</span>
                  <span className="text-muted-foreground">vs prev</span>
                </div>
              )}
            </div>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>
          {/* Mini Sparkline */}
          {trend && trend.length > 0 && (
            <div className="mt-3 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id={`sparkline-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    fill={`url(#sparkline-${index})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function MetricsPanel() {
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState("7d");

  const fetchData = async (selectedTimeframe: string) => {
    setIsLoading(true);
    try {
      // Fetch both metrics and analytics in parallel
      const [metricsResult, analyticsResult] = await Promise.all([
        $fetch({
          url: `/api/admin/system/notification/metrics?period=${selectedTimeframe === "24h" ? "day" : selectedTimeframe === "7d" ? "week" : "month"}`,
          silent: true,
        }),
        $fetch({
          url: `/api/admin/system/notification/analytics?timeframe=${selectedTimeframe}`,
          silent: true,
        }),
      ]);

      if (metricsResult.error) {
        toast.error("Failed to fetch metrics");
      } else {
        setMetricsData(metricsResult.data);
      }

      if (!analyticsResult.error) {
        setAnalyticsData(analyticsResult.data);
      }
    } catch (err) {
      console.error("Data fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(timeframe);
  }, [timeframe]);

  const channelIcons: Record<string, any> = {
    IN_APP: { icon: Inbox, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    EMAIL: { icon: Mail, color: "text-green-500", bgColor: "bg-green-500/10" },
    SMS: { icon: MessageSquare, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    PUSH: { icon: Smartphone, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  };

  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (timeframe === "24h") {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Header with Timeframe Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Notification Metrics
                </CardTitle>
                <CardDescription>
                  Analytics and performance metrics for {timeframe === "24h" ? "last 24 hours" : timeframe === "7d" ? "last 7 days" : timeframe === "30d" ? "last 30 days" : "last 90 days"}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchData(timeframe)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={timeframe} onValueChange={setTimeframe}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="24h">24 Hours</TabsTrigger>
                <TabsTrigger value="7d">7 Days</TabsTrigger>
                <TabsTrigger value="30d">30 Days</TabsTrigger>
                <TabsTrigger value="90d">90 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* KPI Cards */}
      {analyticsData?.kpis && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {analyticsData.kpis.map((kpi, index) => (
            <KPICard
              key={kpi.id}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              trend={kpi.trend}
              icon={kpi.icon}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Charts Grid */}
      {analyticsData?.charts && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Notifications Over Time Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Notifications Over Time
                </CardTitle>
                <CardDescription>Total, sent, and failed notifications by {timeframe === "24h" ? "hour" : "day"}</CardDescription>
              </CardHeader>
              <CardContent>
                                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData.charts.notificationsOverTime}>
                      <defs>
                        <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatChartDate}
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" domain={[0, (dataMax: number) => Math.max(dataMax, 1)]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelFormatter={formatChartDate}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#totalGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="sent"
                        name="Sent"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#sentGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="failed"
                        name="Failed"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#failedGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                              </CardContent>
            </Card>
          </motion.div>

          {/* Channel Breakdown Over Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Channel Activity
                </CardTitle>
                <CardDescription>Notifications by channel over time</CardDescription>
              </CardHeader>
              <CardContent>
                                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.charts.channelBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatChartDate}
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" domain={[0, (dataMax: number) => Math.max(dataMax, 1)]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelFormatter={formatChartDate}
                      />
                      <Legend />
                      <Bar dataKey="In-App" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Email" stackId="a" fill="#22c55e" />
                      <Bar dataKey="SMS" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="Push" stackId="a" fill="#a855f7" />
                    </BarChart>
                  </ResponsiveContainer>
                              </CardContent>
            </Card>
          </motion.div>

          {/* Status Distribution Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Status Distribution
                </CardTitle>
                <CardDescription>Breakdown by notification status</CardDescription>
              </CardHeader>
              <CardContent>
                                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analyticsData.charts.statusBreakdown.some((d) => d.value > 0)
                          ? analyticsData.charts.statusBreakdown.filter((d) => d.value > 0)
                          : [{ name: "No Data", value: 1, color: "#e5e7eb" }]
                        }
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={analyticsData.charts.statusBreakdown.some((d) => d.value > 0)
                          ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`
                          : ({ name }) => name
                        }
                        labelLine={false}
                      >
                        {analyticsData.charts.statusBreakdown.some((d) => d.value > 0)
                          ? analyticsData.charts.statusBreakdown.filter((d) => d.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))
                          : <Cell fill="#e5e7eb" />
                        }
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string) => [
                          analyticsData.charts.statusBreakdown.some((d) => d.value > 0)
                            ? value.toLocaleString()
                            : "0",
                          name === "No Data" ? "Count" : "Count"
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                              </CardContent>
            </Card>
          </motion.div>

          {/* Channel Totals Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Channel Distribution
                </CardTitle>
                <CardDescription>Total notifications by channel</CardDescription>
              </CardHeader>
              <CardContent>
                                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analyticsData.charts.channelTotals.some((d) => d.value > 0)
                          ? analyticsData.charts.channelTotals.filter((d) => d.value > 0)
                          : [{ name: "No Data", value: 1, color: "#e5e7eb" }]
                        }
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={analyticsData.charts.channelTotals.some((d) => d.value > 0)
                          ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`
                          : ({ name }) => name
                        }
                        labelLine={false}
                      >
                        {analyticsData.charts.channelTotals.some((d) => d.value > 0)
                          ? analyticsData.charts.channelTotals.filter((d) => d.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))
                          : <Cell fill="#e5e7eb" />
                        }
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string) => [
                          analyticsData.charts.channelTotals.some((d) => d.value > 0)
                            ? value.toLocaleString()
                            : "0",
                          name === "No Data" ? "Count" : "Count"
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Channel Breakdown Cards */}
      {metricsData?.byChannel && Object.keys(metricsData.byChannel).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance</CardTitle>
              <CardDescription>Detailed metrics for each notification channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(metricsData.byChannel).map(([channel, stats]) => {
                  const channelInfo = channelIcons[channel] || {
                    icon: TrendingUp,
                    color: "text-gray-500",
                    bgColor: "bg-gray-500/10",
                  };
                  const Icon = channelInfo.icon;

                  return (
                    <div key={channel} className="p-4 rounded-lg border">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${channelInfo.bgColor}`}>
                          <Icon className={`h-5 w-5 ${channelInfo.color}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{channel.replace("_", "-")}</h3>
                          <Badge
                            variant="outline"
                            className={`mt-1 ${
                              parseFloat(stats.successRate) >= 95
                                ? "bg-green-500/10 text-green-500"
                                : parseFloat(stats.successRate) >= 80
                                ? "bg-yellow-500/10 text-yellow-500"
                                : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {parseFloat(stats.successRate).toFixed(1)}% Success
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{stats.sent.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground mt-1">Sent</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-500">
                            {stats.failed.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Failed</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Type Breakdown */}
      {metricsData?.byType && Object.keys(metricsData.byType).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Metrics by Type</CardTitle>
              <CardDescription>Notification distribution by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metricsData.byType)
                  .sort((a, b) => b[1].sent - a[1].sent)
                  .map(([type, stats]) => {
                    const total = stats.sent + stats.failed;
                    const successRate = total > 0 ? ((stats.sent / total) * 100).toFixed(1) : "0";
                    const percentage = metricsData.overview.totalSent > 0
                      ? ((stats.sent / metricsData.overview.totalSent) * 100)
                      : 0;

                    return (
                      <div key={type} className="flex items-center gap-4 p-3 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{type}</span>
                            <Badge variant="outline">{successRate}%</Badge>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 mb-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Sent: <span className="text-foreground font-medium">{stats.sent.toLocaleString()}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Failed: <span className="text-red-500 font-medium">{stats.failed.toLocaleString()}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!metricsData && !analyticsData && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No metrics data available</p>
          </CardContent>
        </Card>
      )}

      {isLoading && !metricsData && !analyticsData && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
