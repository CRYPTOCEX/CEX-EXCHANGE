"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Filter
} from "lucide-react";

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
  };
}

export default function NFTAnalyticsDashboard() {
  const t = useTranslations();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: analyticsData, error: fetchError } = await $fetch({
        url: `/api/admin/nft/analytics?timeRange=${timeRange}`,
        silentSuccess: true,
      });

      if (fetchError) {
        throw new Error(fetchError);
      }

      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US", { notation: "compact" }).format(num);
  };

  const formatPercentage = (num: number) => {
    const isPositive = num >= 0;
    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '↗' : '↘'}
        {Math.abs(num).toFixed(1)}%
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">NFT Analytics</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">NFT Analytics</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchAnalyticsData}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NFT Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive marketplace insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data?.overview.totalCollections || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data?.trends.collectionsGrowth || 0)} from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total NFTs</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data?.overview.totalTokens || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data?.trends.tokensGrowth || 0)} from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trading Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.overview.totalVolume || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data?.trends.volumeGrowth || 0)} from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data?.overview.totalSales || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data?.trends.salesGrowth || 0)} from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data?.overview.totalUsers || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Unique marketplace participants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.overview.avgPrice || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Per NFT sale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data?.overview.totalListings || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Currently for sale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data?.overview.totalActivity || 0)}</div>
            <p className="text-xs text-muted-foreground">
              All marketplace events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="collections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="collections">Top Collections</TabsTrigger>
          <TabsTrigger value="creators">Top Creators</TabsTrigger>
          <TabsTrigger value="sales">Recent Sales</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Collections</CardTitle>
              <CardDescription>
                Collections ranked by trading volume in the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.topCollections?.map((collection, index) => (
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Floor: {formatCurrency(collection.floorPrice)}
                        </span>
                        {formatPercentage(collection.change24h)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Creators</CardTitle>
              <CardDescription>
                Creators ranked by total sales volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.topCreators?.map((creator, index) => (
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
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>
                Latest NFT sales transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.recentSales?.map((sale) => (
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

        <TabsContent value="charts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Volume & Sales Trend</CardTitle>
                <CardDescription>Trading volume and sales over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4" />
                  <p>Chart visualization would be implemented here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>NFTs by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.chartData?.categoryChart?.map((category) => (
                    <div key={category.name} className="flex items-center justify-between">
                      <span className="text-sm">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${category.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{category.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Blockchain Distribution</CardTitle>
                <CardDescription>Collections and volume by chain</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.chartData?.chainChart?.map((chain) => (
                    <div key={chain.name} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{chain.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(chain.collections)} collections
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(chain.volume)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Price Range Distribution</CardTitle>
                <CardDescription>NFT sales by price range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.chartData?.priceRanges?.map((range) => (
                    <div key={range.range} className="flex items-center justify-between">
                      <span className="text-sm">{range.range}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${range.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{formatNumber(range.count)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 