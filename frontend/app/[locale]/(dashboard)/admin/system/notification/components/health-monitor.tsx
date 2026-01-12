"use client";

import { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Activity,
  Database,
  Mail,
  MessageSquare,
  Smartphone,
  Inbox,
  TrendingUp,
  Clock,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface HealthMonitorProps {
  data: any;
  onRefresh: () => void;
}

interface HealthData {
  status: string;
  timestamp: string;
  redis: boolean;
  channels: {
    [key: string]: {
      available: boolean;
      configured: boolean;
      lastCheck: string;
      error?: string;
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
    notificationsOverTime: Array<{ date: string; total: number; sent: number; failed: number }>;
    channelBreakdown: Array<{ date: string; [key: string]: any }>;
    statusBreakdown: Array<{ name: string; value: number; color: string }>;
    channelTotals: Array<{ name: string; value: number; color: string }>;
  };
}

const COLORS = {
  primary: "#3b82f6",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
  purple: "#a855f7",
  cyan: "#06b6d4",
};

export function HealthMonitor({ data, onRefresh }: HealthMonitorProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState("7d");

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      const [healthRes, analyticsRes] = await Promise.all([
        $fetch({ url: "/api/admin/system/notification/health", silent: true }),
        $fetch({ url: `/api/admin/system/notification/analytics?timeframe=${timeframe}`, silent: true }),
      ]);

      if (healthRes.error) {
        toast.error("Failed to fetch health status");
      } else {
        setHealthData(healthRes.data);
      }

      if (!analyticsRes.error) {
        setAnalyticsData(analyticsRes.data);
      }
    } catch (err) {
      console.error("Health fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
        return "text-green-500";
      case "degraded":
        return "text-yellow-500";
      case "unhealthy":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "unhealthy":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const channelIcons: Record<string, any> = {
    IN_APP: Inbox,
    EMAIL: Mail,
    SMS: MessageSquare,
    PUSH: Smartphone,
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (timeframe === "24h") {
      return format(date, "HH:mm");
    }
    return format(date, "MMM dd");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Overall Health */}
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
                  {healthData && getStatusIcon(healthData.status)}
                  Overall System Health
                </CardTitle>
                <CardDescription>
                  Last checked: {healthData ? new Date(healthData.timestamp).toLocaleString() : "Never"}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  fetchHealth();
                  onRefresh();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Service Status</span>
                  <Badge
                    variant={healthData?.status === "healthy" ? "default" : "destructive"}
                    className={
                      healthData?.status === "healthy"
                        ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                        : ""
                    }
                  >
                    {healthData?.status || data?.status || "Unknown"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Redis Health */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Redis Cache
              </CardTitle>
              <CardDescription>Cache service connection status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {healthData?.redis || data?.health?.redis ? "Connected and operational" : "Disconnected"}
                  </p>
                </div>
                <Badge
                  variant={healthData?.redis || data?.health?.redis ? "default" : "destructive"}
                  className={
                    healthData?.redis || data?.health?.redis
                      ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                      : ""
                  }
                >
                  {healthData?.redis || data?.health?.redis ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Channels Health */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Channel Status
              </CardTitle>
              <CardDescription>Individual channel health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthData?.channels ? (
                  Object.entries(healthData.channels).map(([channel, status]) => {
                    const Icon = channelIcons[channel] || Activity;
                    return (
                      <div
                        key={channel}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{channel.replace("_", "-")}</p>
                            {status.error && (
                              <p className="text-xs text-red-500 mt-0.5">{status.error}</p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={status.available ? "default" : "secondary"}
                          className={
                            status.available
                              ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                              : ""
                          }
                        >
                          {status.available ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No detailed channel data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Analytics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Health Analytics
                </CardTitle>
                <CardDescription>Historical notification performance data</CardDescription>
              </div>
              <Tabs value={timeframe} onValueChange={setTimeframe}>
                <TabsList>
                  <TabsTrigger value="24h">24h</TabsTrigger>
                  <TabsTrigger value="7d">7d</TabsTrigger>
                  <TabsTrigger value="30d">30d</TabsTrigger>
                  <TabsTrigger value="90d">90d</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && !analyticsData ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : analyticsData ? (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analyticsData.kpis.map((kpi, index) => (
                    <motion.div
                      key={kpi.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <p className="text-sm text-muted-foreground">{kpi.title}</p>
                      <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                      {kpi.change !== 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className={`text-xs ${
                              kpi.change > 0
                                ? kpi.id === "totalFailed"
                                  ? "text-red-500"
                                  : "text-green-500"
                                : kpi.id === "totalFailed"
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
                            {kpi.change > 0 ? "+" : ""}
                            {kpi.change}%
                          </span>
                          <span className="text-xs text-muted-foreground">vs prev</span>
                        </div>
                      )}
                      {/* Mini sparkline */}
                      <div className="h-12 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={kpi.trend.slice(-12)}>
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={kpi.id === "totalFailed" ? COLORS.danger : COLORS.primary}
                              fill={kpi.id === "totalFailed" ? COLORS.danger : COLORS.primary}
                              fillOpacity={0.2}
                              strokeWidth={1.5}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Notifications Over Time Chart */}
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle className="text-base">Notifications Over Time</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.charts.notificationsOverTime}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                          />
                          <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" domain={[0, (dataMax: number) => Math.max(dataMax, 1)]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="total"
                            name="Total"
                            stroke={COLORS.primary}
                            fill="url(#colorTotal)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="sent"
                            name="Sent"
                            stroke={COLORS.success}
                            fill="url(#colorSent)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="failed"
                            name="Failed"
                            stroke={COLORS.danger}
                            fill="url(#colorFailed)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Channel Distribution */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Channel Breakdown Over Time */}
                  <Card className="border-0 shadow-none">
                    <CardHeader className="px-0">
                      <CardTitle className="text-base">Channel Activity Over Time</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.charts.channelBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={formatDate}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} domain={[0, (dataMax: number) => Math.max(dataMax, 1)]} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="In-App" stackId="a" fill={COLORS.primary} />
                            <Bar dataKey="Email" stackId="a" fill={COLORS.success} />
                            <Bar dataKey="SMS" stackId="a" fill={COLORS.warning} />
                            <Bar dataKey="Push" stackId="a" fill={COLORS.purple} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Channel Totals Pie Chart */}
                  <Card className="border-0 shadow-none">
                    <CardHeader className="px-0">
                      <CardTitle className="text-base">Channel Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
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
                            >
                              {analyticsData.charts.channelTotals.some((d) => d.value > 0)
                                ? analyticsData.charts.channelTotals
                                    .filter((d) => d.value > 0)
                                    .map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))
                                : <Cell fill="#e5e7eb" />
                              }
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No analytics data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
