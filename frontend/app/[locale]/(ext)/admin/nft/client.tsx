"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import {
  Activity,
  Users,
  DollarSign,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Package,
  Coins,
  ShoppingCart,
  TrendingUp
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

interface OnboardingStatus {
  completedTasks: string[];
  stats: {
    deployedMarketplaces: number;
    deployedChains: string[];
    categoriesCount: number;
    activeCollections: number;
    collectionsWithTokens: number;
    verifiedCreators: number;
    tradingConfigured: boolean;
    contentConfigured: boolean;
    verificationConfigured: boolean;
  };
}

export default function NFTAdminDashboard() {
  const t = useTranslations("ext_admin");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, activityResponse, onboardingResponse] = await Promise.all([
        $fetch({ url: "/api/admin/nft/stats", silentSuccess: true }),
        $fetch({ url: "/api/admin/nft/activity/recent", silentSuccess: true }),
        $fetch({ url: "/api/nft/onboarding/status", method: "GET", silent: true })
      ]);

      if (statsResponse.error) {
        throw new Error(statsResponse.error);
      }
      if (activityResponse.error) {
        throw new Error(activityResponse.error);
      }

      setStats(statsResponse.data || statsResponse);
      setRecentActivity(activityResponse.data || activityResponse || []);
      setOnboardingStatus(onboardingResponse.data || onboardingResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string | undefined) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!num || isNaN(num) || num === 0) return "0";

    // For very small numbers (crypto amounts)
    if (num < 0.01) {
      return num.toFixed(8).replace(/\.?0+$/, '');
    }

    // For normal numbers
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num).replace(/\.?0+$/, '');
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

  const getOnboardingProgress = () => {
    if (!onboardingStatus) return 0;

    // Total expected tasks (approximate based on onboarding phases)
    const totalTasks = 9; // 2 infra + 3 config + 3 content + 1 user
    const completed = onboardingStatus.completedTasks.length;

    return Math.round((completed / totalTasks) * 100);
  };

  const getNextStep = () => {
    if (!onboardingStatus) return null;

    const { stats } = onboardingStatus;

    // Priority order of tasks
    if (stats.deployedMarketplaces === 0) {
      return {
        title: "Deploy Your First Marketplace",
        description: "Deploy a marketplace contract to get started with NFT trading",
        action: "Deploy Contract",
        href: "/admin/nft/marketplace"
      };
    }

    if (!stats.tradingConfigured) {
      return {
        title: "Configure Trading Settings",
        description: "Set up auction features, offers, and bidding rules",
        action: "Configure Trading",
        href: "/admin/nft/settings"
      };
    }

    if (stats.categoriesCount < 2) {
      return {
        title: "Create NFT Categories",
        description: "Create at least 2 categories to organize your NFTs",
        action: "Create Categories",
        href: "/admin/nft/category"
      };
    }

    if (stats.activeCollections === 0) {
      return {
        title: "Approve First Collection",
        description: "Review and approve collections to start minting NFTs",
        action: "Manage Collections",
        href: "/admin/nft/collection"
      };
    }

    if (!stats.contentConfigured) {
      return {
        title: "Configure Content Settings",
        description: "Set file size limits, formats, and moderation rules",
        action: "Configure Content",
        href: "/admin/nft/settings"
      };
    }

    return null; // All major tasks completed
  };

  if (loading) {
    return (
      <div className=" space-y-6">
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
      <div className=" space-y-6">
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
    <div className=" space-y-6">
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
        </div>
      </div>

      {/* Dynamic Onboarding Alert */}
      {(() => {
        const progress = getOnboardingProgress();
        const nextStep = getNextStep();

        // Don't show alert if 100% complete
        if (progress >= 100 || !nextStep) return null;

        return (
          <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-600">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">
                      {nextStep.title}
                    </h3>
                    <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400">
                      {progress}% Complete
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {nextStep.description}
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                      Step-by-step guidance
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                      Progress tracking
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                      Expert tips
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={nextStep.href}>
                      <Button>
                        {nextStep.action}
                      </Button>
                    </Link>
                    <Link href="/admin/nft/onboarding">
                      <Button variant="outline">
                        <BookOpen className="h-4 w-4 mr-2" />
                        View Full Guide
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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

      {/* Recent Activity */}
      <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Recent Marketplace Activity</CardTitle>
                  <CardDescription>
                    Latest transactions and events in the NFT marketplace
                  </CardDescription>
                </div>
                <Link href="/admin/nft/activity">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Activity className="h-4 w-4" />
                    View All
                  </Button>
                </Link>
              </div>
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
      </div>
    </div>
  );
} 