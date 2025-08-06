"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Coins,
  ShoppingCart,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Eye,
  BarChart3,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  AlertTriangle
} from "lucide-react";

// Import the professional analytics components
import { KpiCard } from "@/components/blocks/data-table/analytics/kpi";
import ChartCard from "@/components/blocks/data-table/analytics/charts/line";
import BarChart from "@/components/blocks/data-table/analytics/charts/bar";
import { StatusDistribution } from "@/components/blocks/data-table/analytics/charts/donut";

interface AnalyticsData {
  overview: {
    totalCollections: number;
    totalTokens: number;
    totalListings: number;
    totalSales: number;
    totalVolume: number;
    totalUsers: number;
    totalActivity: number;
    avgPrice: number;
  };
  trends: {
    collectionsGrowth: number;
    tokensGrowth: number;
    volumeGrowth: number;
    salesGrowth: number;
  };
  topCollections: Array<{
    id: string;
    name: string;
    volume: number;
    sales: number;
    floorPrice: number;
    change24h: number;
  }>;
  topCreators: Array<{
    id: string;
    name: string;
    email: string;
    volume: number;
    sales: number;
    collections: number;
  }>;
  recentSales: Array<{
    id: string;
    tokenName: string;
    collectionName: string;
    price: number;
    currency: string;
    buyer: string;
    seller: string;
    timestamp: string;
  }>;
  chartData: {
    volumeChart: Array<{ date: string; volume: number; sales: number }>;
    categoryChart: Array<{ name: string; value: number; percentage: number }>;
    chainChart: Array<{ name: string; volume: number; collections: number }>;
    priceRanges: Array<{ range: string; count: number; percentage: number }>;
    trends?: {
      collections: Array<{ date: string; value: number }>;
      tokens: Array<{ date: string; value: number }>;
      volume: Array<{ date: string; value: number }>;
      sales: Array<{ date: string; value: number }>;
      users: Array<{ date: string; value: number }>;
      listings: Array<{ date: string; value: number }>;
      activity: Array<{ date: string; value: number }>;
    };
  };
}

type TimeframeOption = '7d' | '30d' | '90d' | '1y';

export default function NFTAnalyticsDashboard() {
  const t = useTranslations();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');

  const fetchAnalyticsData = useCallback(async (selectedTimeframe?: TimeframeOption) => {
    try {
      setLoading(true);
      setError(null);

      const response = await $fetch({
        url: `/api/admin/nft/analytics`,
        params: {
          timeRange: selectedTimeframe || timeframe
        },
        silentSuccess: true,
      });

      if (response.data) {
        setData(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching NFT analytics:", err);
      setError(err.message || "Failed to load NFT analytics data");
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe: TimeframeOption) => {
    setTimeframe(newTimeframe);
    fetchAnalyticsData(newTimeframe);
  }, [fetchAnalyticsData]);

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
        id: "total-collections",
        title: "Total Collections",
        value: data.overview.totalCollections,
        change: data.trends.collectionsGrowth,
        trend: data.chartData?.trends?.collections || [],
        icon: "Package",
        variant: "info" as const
      },
      {
        id: "total-nfts",
        title: "Total NFTs",
        value: data.overview.totalTokens,
        change: data.trends.tokensGrowth,
        trend: data.chartData?.trends?.tokens || [],
        icon: "Coins",
        variant: "success" as const
      },
      {
        id: "trading-volume",
        title: "Trading Volume",
        value: data.overview.totalVolume,
        change: data.trends.volumeGrowth,
        trend: data.chartData?.trends?.volume || [],
        icon: "TrendingUp",
        variant: "warning" as const
      },
      {
        id: "total-sales",
        title: "Total Sales",
        value: data.overview.totalSales,
        change: data.trends.salesGrowth,
        trend: data.chartData?.trends?.sales || [],
        icon: "ShoppingCart",
        variant: "danger" as const
      },
      {
        id: "active-users",
        title: "Active Users",
        value: data.overview.totalUsers,
        change: 0,
        trend: data.chartData?.trends?.users || [],
        icon: "Users",
        variant: "info" as const
      },
      {
        id: "average-price",
        title: "Average Price",
        value: data.overview.avgPrice,
        change: 0,
        trend: data.chartData?.trends?.volume || [], // Use volume trend as proxy
        icon: "DollarSign",
        variant: "success" as const
      },
      {
        id: "active-listings",
        title: "Active Listings",
        value: data.overview.totalListings,
        change: 0,
        trend: data.chartData?.trends?.listings || [],
        icon: "Eye",
        variant: "warning" as const
      },
      {
        id: "total-activity",
        title: "Total Activity",
        value: data.overview.totalActivity,
        change: 0,
        trend: data.chartData?.trends?.activity || [],
        icon: "Activity",
        variant: "danger" as const
      }
    ];
  }, [data]);

  // Memoize chart configurations
  const chartConfigs = useMemo(() => ({
    topCollections: {
      title: `Top Collections by Volume ${timeframe === '1y' ? '(12 Months)' : timeframe === '7d' ? '(7 Days)' : timeframe === '90d' ? '(90 Days)' : '(30 Days)'}`
    },
    categoryDistribution: {
      title: "Category Distribution"
    },
    chainDistribution: {
      title: "Blockchain Distribution"
    },
    priceRanges: {
      title: "Price Range Distribution"
    }
  }), [timeframe]);

  // Get timeframe display label
  const getTimeframeLabel = useCallback((tf: TimeframeOption) => {
    switch (tf) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case '1y': return 'Last Year';
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
          {Array.from({ length: 8 }).map((_, i) => (
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
          <h3 className="text-lg font-semibold">Error loading NFT analytics</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => fetchAnalyticsData()} variant="outline">
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
          <h1 className="text-3xl font-bold tracking-tight">NFT Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive marketplace insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => fetchAnalyticsData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
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
            timeframe={timeframe === '7d' ? 'd' : timeframe === '30d' ? 'm' : timeframe === '90d' ? 'm' : 'y'}
          />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Distribution */}
        <StatusDistribution
          data={data.chartData.categoryChart.map(item => ({
            id: item.name,
            name: item.name,
            value: item.value,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
          }))}
          config={chartConfigs.categoryDistribution}
          loading={loading}
        />

        {/* Blockchain Distribution */}
        <StatusDistribution
          data={data.chartData.chainChart.map(item => ({
            id: item.name,
            name: item.name,
            value: item.volume,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
          }))}
          config={chartConfigs.chainDistribution}
          loading={loading}
        />

        {/* Price Range Distribution */}
        <StatusDistribution
          data={data.chartData.priceRanges.map(item => ({
            id: item.range,
            name: item.range,
            value: item.count,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
          }))}
          config={chartConfigs.priceRanges}
          loading={loading}
        />

        {/* Top Collections */}
        <Card className="bg-transparent">
          <CardHeader>
            <CardTitle>{chartConfigs.topCollections.title}</CardTitle>
            <CardDescription>
              Collections ranked by trading volume in the selected time period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topCollections.slice(0, 5).map((collection, index) => (
                <div key={collection.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">#{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-medium">{collection.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(collection.sales)} sales
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(collection.volume)}</p>
                    <p className="text-sm text-muted-foreground">
                      Floor: {formatCurrency(collection.floorPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="collections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="collections">Top Collections</TabsTrigger>
          <TabsTrigger value="creators">Top Creators</TabsTrigger>
          <TabsTrigger value="sales">Recent Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="collections" className="space-y-4">
          <Card className="bg-transparent">
            <CardHeader>
              <CardTitle>All Collections Performance</CardTitle>
              <CardDescription>
                Complete list of collections ranked by trading volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topCollections.map((collection, index) => (
                  <div key={collection.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{collection.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(collection.sales)} sales
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(collection.volume)}</p>
                      <p className="text-sm text-muted-foreground">
                        Floor: {formatCurrency(collection.floorPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creators" className="space-y-4">
          <Card className="bg-transparent">
            <CardHeader>
              <CardTitle>Top Creators</CardTitle>
              <CardDescription>
                Creators ranked by total sales volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topCreators.map((creator, index) => (
                  <div key={creator.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{creator.name}</h4>
                        <p className="text-sm text-muted-foreground">{creator.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(creator.volume)}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatNumber(creator.sales)} sales</span>
                        <span>•</span>
                        <span>{creator.collections} collections</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card className="bg-transparent">
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>
                Latest NFT sales transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{sale.tokenName}</h4>
                      <p className="text-sm text-muted-foreground">{sale.collectionName}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{formatCurrency(sale.price)}</p>
                      <Badge variant="outline">{sale.currency}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {sale.buyer} ← {sale.seller}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 