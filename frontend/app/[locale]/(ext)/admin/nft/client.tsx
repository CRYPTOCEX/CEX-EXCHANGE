"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/routing";
import {
  Package,
  Coins,
  ShoppingCart,
  TrendingUp,
  Activity,
  Users,
  DollarSign,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Settings,
  BarChart3,
  Zap,
  Building2,
  BookOpen,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface AdminStats {
  collections: {
    total: number;
    active: number;
    pending: number;
    verified: number;
  };
  tokens: {
    total: number;
    minted: number;
    listed: number;
  };
  listings: {
    total: number;
    active: number;
    auctions: number;
    fixedPrice: number;
  };
  sales: {
    total: number;
    volume: number;
    avgPrice: number;
    last24h: number;
  };
  activity: {
    totalTransactions: number;
    last24h: number;
    uniqueUsers: number;
    topCollection: string;
  };
  revenue: {
    totalFees: number;
    marketplaceFees: number;
    royaltyFees: number;
    last30Days: number;
  };
}

interface RecentActivity {
  id: string;
  type: string;
  tokenName: string;
  collectionName: string;
  user: string;
  price?: number;
  currency?: string;
  timestamp: string;
}

export default function NFTAdminDashboard() {
  const t = useTranslations();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, activityResponse] = await Promise.all([
        $fetch({ url: "/api/admin/nft/stats", silentSuccess: true }),
        $fetch({ url: "/api/admin/nft/activity/recent", silentSuccess: true })
      ]);

      if (statsResponse.error) {
        throw new Error(statsResponse.error);
      }
      if (activityResponse.error) {
        throw new Error(activityResponse.error);
      }

      setStats(statsResponse.data || statsResponse);
      setRecentActivity(activityResponse.data || activityResponse || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "MINT": return <Plus className="h-4 w-4 text-green-500" />;
      case "LIST": return <ShoppingCart className="h-4 w-4 text-blue-500" />;
      case "SALE": return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case "BID": return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
      case "TRANSFER": return <ArrowDownRight className="h-4 w-4 text-gray-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">NFT Admin Dashboard</h1>
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
          <h1 className="text-3xl font-bold">NFT Admin Dashboard</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchDashboardData}>Try Again</Button>
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
          <h1 className="text-3xl font-bold">NFT Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your NFT marketplace and monitor performance
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/nft/onboarding">
            <Button variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Setup Guide
            </Button>
          </Link>
          <Link href="/admin/nft/analytics">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/admin/nft/settings">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Link href="/nft">
            <Button>
              <Zap className="h-4 w-4 mr-2" />
              View Marketplace
            </Button>
          </Link>
        </div>
      </div>

      {/* Onboarding Alert */}
      {stats && (stats.collections.total === 0 || stats.tokens.total === 0) && (
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-2">
                  Welcome to your NFT Marketplace! 🎉
                </h3>
                <p className="text-orange-800 mb-4">
                  Your marketplace isn't fully set up yet. Follow our comprehensive setup guide to deploy contracts, configure settings, and launch successfully.
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1 text-sm text-orange-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Step-by-step guidance
                  </div>
                  <div className="flex items-center gap-1 text-sm text-orange-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Progress tracking
                  </div>
                  <div className="flex items-center gap-1 text-sm text-orange-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Expert tips
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/admin/nft/onboarding">
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Start Setup Guide
                    </Button>
                  </Link>
                  <Link href="/admin/nft/marketplace">
                    <Button variant="outline">
                      Deploy First Contract
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Collections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.collections.total || 0)}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{stats?.collections.active || 0} Active</Badge>
              <Badge variant="outline">{stats?.collections.verified || 0} Verified</Badge>
            </div>
          </CardContent>
        </Card>

        {/* NFTs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">NFTs</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.tokens.total || 0)}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{stats?.tokens.minted || 0} Minted</Badge>
              <Badge variant="outline">{stats?.tokens.listed || 0} Listed</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Active Listings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.listings.active || 0)}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{stats?.listings.auctions || 0} Auctions</Badge>
              <Badge variant="outline">{stats?.listings.fixedPrice || 0} Fixed</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Sales Volume */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.sales.volume || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats?.sales.total || 0)} total sales
            </p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.revenue.totalFees || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.revenue.last30Days || 0)} last 30 days
            </p>
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.activity.last24h || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats?.activity.uniqueUsers || 0)} unique users
            </p>
          </CardContent>
        </Card>

        {/* Average Price */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.sales.avgPrice || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats?.sales.last24h || 0)} sales today
            </p>
          </CardContent>
        </Card>


      </div>

      {/* Quick Actions & Recent Activity */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Marketplace Activity</CardTitle>
              <CardDescription>
                Latest transactions and events in the NFT marketplace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{activity.tokenName}</span>
                          <Badge variant="outline">{activity.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {activity.collectionName} • by {activity.user}
                        </p>
                      </div>
                      {activity.price && (
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(activity.price)}</p>
                          <p className="text-xs text-muted-foreground">{activity.currency}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-orange-600" />
                  Setup Guide & Onboarding
                </CardTitle>
                <CardDescription>
                  Complete marketplace setup checklist with step-by-step guidance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/nft/onboarding">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">Start Setup Guide</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Marketplace Contracts
                </CardTitle>
                <CardDescription>
                  Deploy and manage marketplace contracts across blockchains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/nft/marketplace">
                  <Button className="w-full">Manage Contracts</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Manage Collections
                </CardTitle>
                <CardDescription>
                  View and manage NFT collections, verify creators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/nft/collection">
                  <Button className="w-full">View Collections</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Manage NFTs
                </CardTitle>
                <CardDescription>
                  Review and moderate individual NFTs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/nft/token">
                  <Button className="w-full">View NFTs</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Active Listings
                </CardTitle>
                <CardDescription>
                  Monitor and manage marketplace listings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/nft/listing">
                  <Button className="w-full">View Listings</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Sales Analytics
                </CardTitle>
                <CardDescription>
                  View sales data and marketplace performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/nft/sale">
                  <Button className="w-full">View Sales</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analytics Dashboard
                </CardTitle>
                <CardDescription>
                  Detailed analytics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/nft/analytics">
                  <Button className="w-full">View Analytics</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Marketplace Settings
                </CardTitle>
                <CardDescription>
                  Configure marketplace parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/nft/settings">
                  <Button className="w-full">Open Settings</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 