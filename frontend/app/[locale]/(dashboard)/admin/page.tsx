"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { $fetch } from "@/lib/api";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Shield, 
  AlertTriangle,
  Calendar
} from "lucide-react";

// Import the professional analytics components
import { KpiCard } from "@/components/blocks/data-table/analytics/kpi";
import ChartCard from "@/components/blocks/data-table/analytics/charts/line";
import BarChart from "@/components/blocks/data-table/analytics/charts/bar";
import { StatusDistribution } from "@/components/blocks/data-table/analytics/charts/donut";

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

type TimeframeOption = 'weekly' | 'monthly' | 'yearly';

export default function AdminDashboard() {
  const t = useTranslations();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('monthly');

  const fetchDashboardData = useCallback(async (selectedTimeframe?: TimeframeOption) => {
    try {
      setLoading(true);
      const response = await $fetch({
        url: "/api/admin/dashboard",
        params: {
          timeframe: selectedTimeframe || timeframe
        },
        silentSuccess: true,
      });

      if (response.data) {
        setData(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe: TimeframeOption) => {
    setTimeframe(newTimeframe);
    fetchDashboardData(newTimeframe);
  }, [fetchDashboardData]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  }, []);

  // Memoize KPI data for the professional KPI cards
  const kpiData = useMemo(() => {
    if (!data) return [];
    
    return [
      {
        id: "total-users",
        title: "Total Users",
        value: data.overview.totalUsers,
        change: data.userMetrics.registrations.length > 1 
          ? ((data.userMetrics.registrations[data.userMetrics.registrations.length - 1]?.total || 0) - 
             (data.userMetrics.registrations[data.userMetrics.registrations.length - 2]?.total || 0)) 
          : 0,
        trend: data.userMetrics.registrations.map(item => ({ 
          date: item.date, 
          value: item.total 
        })),
        icon: "Users",
        variant: "info" as const
      },
      {
        id: "active-users",
        title: "Active Users",
        value: data.overview.activeUsers,
        change: 0, // Would need historical data
        trend: data.userMetrics.registrations.map(item => ({ 
          date: item.date, 
          value: Math.round(item.total * 0.8) // Estimate active users as 80% of total
        })),
        icon: "Activity",
        variant: "success" as const
      },
      {
        id: "total-revenue",
        title: "Total Revenue",
        value: data.overview.totalRevenue,
        change: data.financialMetrics.dailyRevenue.length > 1 
          ? ((data.financialMetrics.dailyRevenue[data.financialMetrics.dailyRevenue.length - 1]?.revenue || 0) - 
             (data.financialMetrics.dailyRevenue[data.financialMetrics.dailyRevenue.length - 2]?.revenue || 0)) 
          : 0,
        trend: data.financialMetrics.dailyRevenue.map(item => ({ 
          date: item.date, 
          value: item.revenue 
        })),
        icon: "DollarSign",
        variant: "warning" as const
      },
      {
        id: "total-transactions",
        title: "Total Transactions",
        value: data.overview.totalTransactions,
        change: data.tradingActivity.dailyTrades.length > 1 
          ? ((data.tradingActivity.dailyTrades[data.tradingActivity.dailyTrades.length - 1]?.count || 0) - 
             (data.tradingActivity.dailyTrades[data.tradingActivity.dailyTrades.length - 2]?.count || 0)) 
          : 0,
        trend: data.tradingActivity.dailyTrades.map(item => ({ 
          date: item.date, 
          value: item.count 
        })),
        icon: "TrendingUp",
        variant: "danger" as const
      }
    ];
  }, [data]);

  // Memoize chart configurations with proper timeframe context
  const chartConfigs = useMemo(() => ({
    userRegistrations: {
      title: `User Registration Trends ${timeframe === 'yearly' ? '(12 Months)' : timeframe === 'weekly' ? '(7 Days)' : '(4 Weeks)'}`,
      metrics: ["total", "new"],
      labels: {
        total: "Total Users",
        new: "New Registrations"
      }
    },
    dailyRevenue: {
      title: `Revenue & Profit ${timeframe === 'yearly' ? '(Monthly)' : timeframe === 'weekly' ? '(Daily)' : '(Weekly)'}`,
      metrics: ["revenue", "profit"],
      labels: {
        revenue: "Revenue",
        profit: "Profit"
      }
    },
    dailyTrades: {
      title: `Trading Activity ${timeframe === 'yearly' ? '(Monthly)' : timeframe === 'weekly' ? '(Daily)' : '(Weekly)'}`,
      type: "bar" as "bar",
      model: "trade",
      metrics: ["count", "volume"],
      labels: {
        count: "Trade Count",
        volume: "Volume"
      }
    },
    usersByLevel: {
      title: "User Distribution by Level"
    },
    transactionVolume: {
      title: "Transaction Volume by Type"
    }
  }), [timeframe]);

  // Get timeframe display label
  const getTimeframeLabel = useCallback((tf: TimeframeOption) => {
    switch (tf) {
      case 'weekly': return 'Last 7 Days';
      case 'monthly': return 'Last 30 Days';
      case 'yearly': return 'Current Year';
      default: return 'Last 30 Days';
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-[200px] mb-2" />
            <Skeleton className="h-5 w-[400px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-transparent">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[80px] mb-2" />
                <Skeleton className="h-3 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-transparent">
              <CardHeader>
                <Skeleton className="h-6 w-[200px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold">Error loading dashboard</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => fetchDashboardData()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Header with Timeframe Selector */}
      <div className="flex items-center justify-between">
    <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of your platform's performance and metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Last 7 Days</SelectItem>
              <SelectItem value="monthly">Last 30 Days</SelectItem>
              <SelectItem value="yearly">Current Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards using professional analytics components */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <KpiCard
            key={kpi.id}
            id={kpi.id}
            title={kpi.title}
            value={kpi.value}
            change={kpi.change}
            trend={kpi.trend}
            variant={kpi.variant}
            icon={kpi.icon}
            loading={loading}
            timeframe={timeframe === 'weekly' ? 'd' : timeframe === 'monthly' ? 'm' : 'y'}
          />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Registration Trends */}
        <ChartCard
          chartKey="user-registrations"
          config={chartConfigs.userRegistrations}
          data={data.userMetrics.registrations}
          formatXAxis={(value) => value}
          width="full"
          loading={loading}
          timeframe={timeframe === 'weekly' ? 'd' : timeframe === 'monthly' ? 'm' : 'y'}
        />

        {/* Daily Revenue */}
        <ChartCard
          chartKey="daily-revenue"
          config={chartConfigs.dailyRevenue}
          data={data.financialMetrics.dailyRevenue}
          formatXAxis={(value) => value}
          width="full"
          loading={loading}
          timeframe={timeframe === 'weekly' ? 'd' : timeframe === 'monthly' ? 'm' : 'y'}
        />

        {/* Trading Activity */}
        <BarChart
          chartKey="daily-trades"
          config={chartConfigs.dailyTrades}
          data={data.tradingActivity.dailyTrades}
          formatXAxis={(value) => value}
          width="full"
          loading={loading}
          timeframe={timeframe === 'weekly' ? 'd' : timeframe === 'monthly' ? 'm' : 'y'}
        />

        {/* User Level Distribution */}
        <StatusDistribution
          data={data.userMetrics.usersByLevel.map(item => ({
            id: item.level,
            name: item.level,
            value: item.count,
            color: item.color
          }))}
          config={chartConfigs.usersByLevel}
          loading={loading}
        />
      </div>

      {/* Transaction Volume by Type */}
      <div className="grid gap-6">
        <StatusDistribution
          data={data.financialMetrics.transactionVolume.map(item => ({
            id: item.type,
            name: item.type,
            value: item.value,
            color: item.color
          }))}
          config={chartConfigs.transactionVolume}
          loading={loading}
          className="md:col-span-2"
        />
      </div>



      {/* Additional Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.overview.pendingKYC)}</div>
            <p className="text-xs text-muted-foreground">
              Verification requests awaiting review
            </p>
          </CardContent>
        </Card>

        <Card className="bg-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.overview.newUsersToday)}</div>
            <p className="text-xs text-muted-foreground">
              Registered in the last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card className="bg-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Asset</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.tradingActivity.topAssets[0]?.asset || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.tradingActivity.topAssets[0] ? 
                formatCurrency(data.tradingActivity.topAssets[0].volume) : 
                "No trading data"
              }
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
