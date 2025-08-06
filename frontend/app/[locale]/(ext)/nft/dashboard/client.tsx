"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { 
  Package, 
  Heart, 
  ShoppingCart, 
  TrendingUp, 
  Eye, 
  Plus,
  Filter,
  Grid3X3,
  List,
  ExternalLink,
  Activity,
  Sparkles,
  Wallet,
  Crown,
  Zap,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  Flame,
  Star,
  Award,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Clock,
  Globe,
  Palette,
  Camera,
  Film,
  Music,
  Gamepad2,
  Layers
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { useNftStore } from "@/store/nft/nft-store";
import NFTCard from "../components/nft-card";
import CollectionCard from "../components/collection-card";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { AuthModal } from "@/components/auth/auth-modal";

export default function NFTDashboardClient() {
  const t = useTranslations("nft/dashboard");
  const router = useRouter();
  const { user } = useUserStore();
  const {
    tokens,
    collections,
    activities,
    loading,
    setLoading,
    fetchTokens,
    fetchCollections,
    fetchActivities,
  } = useNftStore();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterCategory, setFilterCategory] = useState("all");
  const [period, setPeriod] = useState("30d");

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    
    const { data, error } = await $fetch({
      url: "/api/nft/user/dashboard",
      method: "GET",
      params: { period },
      silentSuccess: true,
    });

    if (error) {
      console.error("Failed to fetch dashboard data:", error);
    } else {
      setDashboardData(data);
      // Update the NFT store with the fetched data
      if (data.tokens) {
        // You can update the store here if needed
      }
    }
    
    setLoading(false);
  }, [user, period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Get stats from dashboard data
  const stats = dashboardData?.overview || {
    totalNFTs: 0,
    totalCollections: 0,
    totalValue: 0,
    totalViews: 0,
    totalSales: 0,
    totalEarnings: 0,
    avgPrice: 0,
    successRate: 0,
  };

  const growth = dashboardData?.growth || {
    nftsGrowth: 0,
    collectionsGrowth: 0,
    valueGrowth: 0,
    viewsGrowth: 0,
    salesGrowth: 0,
    volumeGrowth: 0,
  };

  const categoryDistribution = dashboardData?.categoryDistribution || [];
  const recentActivities = dashboardData?.recentActivities || [];
  const dashboardTokens = dashboardData?.tokens || [];
  const dashboardCollections = dashboardData?.collections || [];

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("my_nft_dashboard")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("please_sign_in_to_view_your_nft_dashboard")}
        </p>
        <Button onClick={() => setIsAuthModalOpen(true)}>
          {t("sign_in")}
        </Button>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialView="login"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10 border-b">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="relative container mx-auto px-4 py-16">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
            {/* Profile Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-white/20 shadow-xl">
                  <AvatarImage src={user?.avatar} alt={user?.firstName || "User"} />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    {user?.firstName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                  <Crown className="h-3 w-3 text-white" />
                </div>
              </div>
        <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  Welcome back, {user?.firstName || "Creator"}
                </h1>
                <p className="text-xl text-muted-foreground mb-4">
            {t("manage_your_nfts_collections")}
          </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <span>Creator</span>
                  </div>
                </div>
              </div>
        </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/nft/create">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Create NFT
            </Button>
          </Link>
          <Link href="/nft/creator/dashboard">
                <Button variant="outline" size="lg" className="shadow-lg">
                  <Package className="h-5 w-5 mr-2" />
                  Creator Hub
            </Button>
          </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm text-muted-foreground font-medium">Total NFTs</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalNFTs}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {growth.nftsGrowth >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${growth.nftsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {growth.nftsGrowth >= 0 ? '+' : ''}{growth.nftsGrowth.toFixed(1)}% this period
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-full">
                  <Sparkles className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Collections</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalCollections}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {growth.collectionsGrowth >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${growth.collectionsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {growth.collectionsGrowth >= 0 ? '+' : ''}{growth.collectionsGrowth.toFixed(1)}% this period
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
            </div>
          </CardContent>
        </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Value</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalValue.toFixed(2)} ETH</p>
                  <div className="flex items-center gap-1 mt-1">
                    {growth.valueGrowth >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${growth.valueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {growth.valueGrowth >= 0 ? '+' : ''}{growth.valueGrowth.toFixed(1)}% this period
                    </span>
              </div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
            </div>
          </CardContent>
        </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Views</p>
                  <p className="text-3xl font-bold text-orange-600">{(stats?.totalViews || 0).toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {growth.viewsGrowth >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${growth.viewsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {growth.viewsGrowth >= 0 ? '+' : ''}{growth.viewsGrowth.toFixed(1)}% this period
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-full">
                  <Eye className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Portfolio Performance</h3>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Price</span>
                  <span className="font-medium">{stats.avgPrice.toFixed(3)} ETH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Earnings</span>
                  <span className="font-medium text-green-600">+{stats.totalEarnings.toFixed(2)} ETH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="font-medium">{stats.successRate}%</span>
                </div>
            </div>
          </CardContent>
        </Card>

          <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Top Categories</h3>
                <PieChart className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                {categoryDistribution.slice(0, 3).map((category, index) => {
                  const iconColors = ["text-purple-500", "text-blue-500", "text-green-500"];
                  const icons = [Palette, Camera, Music];
                  const Icon = icons[index] || Palette;
                  
                  return (
                    <div key={category.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${iconColors[index] || "text-gray-500"}`} />
                        <span className="text-sm">{category.name}</span>
                      </div>
                      <span className="text-sm font-medium">{category.percentage}%</span>
                    </div>
                  );
                })}
                {categoryDistribution.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    No categories yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Recent Activity</h3>
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                {recentActivities.slice(0, 3).map((activity, index) => {
                  const activityColors = ["bg-green-500", "bg-blue-500", "bg-purple-500"];
                  const activityColor = activityColors[index] || "bg-gray-500";
                  
                  return (
                    <div key={activity.id} className="flex items-center gap-3">
                      <div className={`w-2 h-2 ${activityColor} rounded-full`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {recentActivities.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    No recent activity
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Enhanced Main Content */}
      <Tabs defaultValue="nfts" className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <TabsList className="grid grid-cols-4 w-full sm:w-auto">
              <TabsTrigger value="nfts" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">My NFTs</span>
              </TabsTrigger>
              <TabsTrigger value="collections" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Collections</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Favorites</span>
              </TabsTrigger>
        </TabsList>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={setPeriod}>
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
              
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search NFTs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-48"
                  />
                </div>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="price-high">Price: High</SelectItem>
                    <SelectItem value="price-low">Price: Low</SelectItem>
                    <SelectItem value="views">Most Viewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

        <TabsContent value="nfts" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{t("my_nfts")}</h2>
            <Link href="/nft/create">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t("create_nft")}
              </Button>
            </Link>
          </div>

          {Array.isArray(dashboardTokens) && dashboardTokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {dashboardTokens
                .filter(token => 
                  searchQuery === "" || 
                  token.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((token) => (
                <NFTCard key={token.id} token={token} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("no_nfts_yet")}</h3>
                <p className="text-muted-foreground mb-4">
                  {t("create_your_first_nft_to_get_started")}
                </p>
                <Link href="/nft/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("create_nft")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="collections" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{t("my_collections")}</h2>
            <Link href="/nft/creator/dashboard">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t("creator_hub")}
              </Button>
            </Link>
          </div>

          {Array.isArray(dashboardCollections) && dashboardCollections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("no_collections_yet")}</h3>
                <p className="text-muted-foreground mb-4">
                  {t("create_your_first_collection_to_organize_your_nfts")}
                </p>
                <Link href="/nft/creator/dashboard">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("creator_hub")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <h2 className="text-xl font-semibold mb-6">{t("recent_activity")}</h2>
          
          {Array.isArray(recentActivities) && recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{activity.type.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.tokenName ? `${activity.tokenName} • ` : ""}
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {activity.price && (
                          <p className="font-medium">
                            {activity.price} {activity.currency}
                          </p>
                        )}
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("no_activity_yet")}</h3>
                <p className="text-muted-foreground">
                  {t("your_nft_activities_will_appear_here")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-6">
          <h2 className="text-xl font-semibold mb-6">{t("favorite_nfts")}</h2>
          
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("no_favorites_yet")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("start_exploring_and_add_nfts_to_your_favorites")}
              </p>
              <Link href="/nft">
                <Button>
                  {t("explore_nfts")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
} 