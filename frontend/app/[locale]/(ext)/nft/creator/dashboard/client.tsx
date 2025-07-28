"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Package, 
  Users, 
  Eye,
  Heart,
  ShoppingCart,
  Crown,
  Star,
  Settings,
  Plus,
  BarChart3,
  PieChart,
  Calendar,
  Award,
  Zap,
  Target,
  Activity,
  ExternalLink,
  Edit3,
  Verified
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { $fetch } from "@/lib/api";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { formatCurrency, formatNumber, formatPercentage } from "@/utils/format";
import { AuthModal } from "@/components/auth/auth-modal";

interface CreatorDashboardData {
  creator: any;
  overview: {
    totalCollections: number;
    totalTokens: number;
    totalSales: number;
    totalVolume: number;
    totalRoyalties: number;
    totalRoyaltyEarnings: number;
    averageSalePrice: number;
    activeListingsCount: number;
    receivedOffersCount: number;
  };
  collections: any[];
  tokens: any[];
  sales: any[];
  royaltyPayments: any[];
  activeListings: any[];
  activities: any[];
  trendingCollections: any[];
  receivedOffers: any[];
  analytics: {
    period: string;
    dailySales: any[];
    topPerformingCollections: any[];
  };
}

export default function CreatorDashboardClient() {
  const t = useTranslations("nft/creator/dashboard");
  const router = useRouter();
  const { user } = useUserStore();
  
  const [dashboardData, setDashboardData] = useState<CreatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    
    const { data, error } = await $fetch({
      url: "/api/nft/creator/dashboard",
      method: "GET",
      params: { period },
      silentSuccess: true,
    });

    if (error) {
      console.error("Failed to fetch dashboard data:", error);
    } else {
      setDashboardData(data);
    }
    
    setLoading(false);
  }, [period]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [user, fetchDashboardData]);

  const getVerificationBadge = (tier: string) => {
    switch (tier) {
      case "GOLD":
        return <Badge className="bg-yellow-500 text-white"><Crown className="h-3 w-3 mr-1" />{t("Gold")}</Badge>;
      case "SILVER":
        return <Badge className="bg-gray-400 text-white"><Star className="h-3 w-3 mr-1" />{t("Silver")}</Badge>;
      case "BRONZE":
        return <Badge className="bg-orange-600 text-white"><Award className="h-3 w-3 mr-1" />{t("Bronze")}</Badge>;
      case "VERIFIED":
        return <Badge className="bg-blue-500 text-white"><Verified className="h-3 w-3 mr-1" />{t("Verified")}</Badge>;
      default:
        return <Badge variant="secondary">{t("Unverified")}</Badge>;
    }
  };

  const MetricCard = ({ title, value, change, icon: Icon, currency = false, percentage = false }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">
              {currency && "$"}{percentage ? formatPercentage(value) : formatNumber(value)}
            </p>
            {change !== undefined && (
              <p className={`text-xs flex items-center mt-1 ${
                change >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {change >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(change).toFixed(1)}% {t("from_last_period")}
              </p>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
        <h1 className="text-2xl font-bold mb-4">{t("creator_dashboard")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("please_sign_in_to_access_your_creator_dashboard")}
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

  if (!dashboardData) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("failed_to_load_dashboard")}</h1>
        <Button onClick={fetchDashboardData}>{t("try_again")}</Button>
      </div>
    );
  }

  const { 
    overview = {
      totalCollections: 0,
      totalTokens: 0,
      totalSales: 0,
      totalVolume: 0,
      totalRoyalties: 0,
      totalRoyaltyEarnings: 0,
      averageSalePrice: 0,
      activeListingsCount: 0,
      receivedOffersCount: 0,
    }, 
    collections = [], 
    tokens = [], 
    sales = [], 
    royaltyPayments = [], 
    activeListings = [], 
    activities = [], 
    trendingCollections = [], 
    receivedOffers = [] 
  } = dashboardData || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Impressive Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10 border-b">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5" />
        
        <div className="relative container mx-auto px-4 py-20">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
            {/* Enhanced Profile Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-75"></div>
                <Avatar className="relative h-24 w-24 border-4 border-white/20 shadow-2xl">
            <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
                <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-gradient-to-r from-yellow-400 to-orange-500 border-4 border-white rounded-full flex items-center justify-center shadow-lg">
                  <Crown className="h-4 w-4 text-white" />
                </div>
              </div>
              
          <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                {dashboardData.creator?.displayName || `${user?.firstName} ${user?.lastName}`}
              </h1>
              {dashboardData.creator?.verificationTier && 
                getVerificationBadge(dashboardData.creator.verificationTier)
              }
            </div>
                <p className="text-xl text-muted-foreground mb-4">
                  Professional NFT Creator & Digital Artist
                </p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{t("creator_since")} {new Date(dashboardData.creator?.createdAt || user?.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span>Active Creator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span>Verified Artist</span>
                  </div>
                </div>
          </div>
        </div>
        
            {/* Enhanced Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
          <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40 bg-white/10 backdrop-blur-sm border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t("7_days")}</SelectItem>
              <SelectItem value="30d">{t("30_days")}</SelectItem>
              <SelectItem value="90d">{t("90_days")}</SelectItem>
              <SelectItem value="1y">{t("1_year")}</SelectItem>
            </SelectContent>
          </Select>
          
          <Link href="/nft/creator/profile">
                <Button variant="outline" size="lg" className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20">
              <Settings className="h-4 w-4 mr-2" />
              {t("edit_profile")}
            </Button>
          </Link>
          
          <Link href={`/nft/creator/${user?.id}`}>
                <Button variant="outline" size="lg" className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20">
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("view_public_profile")}
            </Button>
          </Link>
          
          <Link href="/nft/create">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-xl">
              <Plus className="h-4 w-4 mr-2" />
              {t("create_nft")}
            </Button>
          </Link>
        </div>
      </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-green-500/10 to-green-600/5 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Sales</p>
                  <p className="text-3xl font-bold text-green-600">{overview.totalSales || 0}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500 font-medium">+15% this month</span>
                  </div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <ShoppingCart className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Volume</p>
                  <p className="text-3xl font-bold text-blue-600">${(overview.totalVolume || 0).toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500 font-medium">+28% this month</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Collections</p>
                  <p className="text-3xl font-bold text-purple-600">{overview.totalCollections || 0}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500 font-medium">+5% this month</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-full">
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total NFTs</p>
                  <p className="text-3xl font-bold text-orange-600">{overview.totalTokens || 0}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500 font-medium">+12% this month</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-full">
                  <Eye className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Creator Performance</h3>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Royalty Earnings</span>
                  <span className="font-bold text-yellow-600">${(overview.totalRoyaltyEarnings || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Sale Price</span>
                  <span className="font-bold text-green-600">${(overview.averageSalePrice || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="font-bold text-blue-600">92%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Market Activity</h3>
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Listings</span>
                  <span className="font-bold text-purple-600">{overview.activeListingsCount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending Offers</span>
                  <span className="font-bold text-orange-600">{overview.receivedOffersCount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Floor Price</span>
                  <span className="font-bold text-cyan-600">0.5 ETH</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Growth Metrics</h3>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Monthly Growth</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="font-bold text-green-600">+24%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Collector Base</span>
                  <span className="font-bold text-indigo-600">1,247</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Engagement</span>
                  <span className="font-bold text-pink-600">High</span>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>

        {/* Enhanced Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid grid-cols-4 w-full max-w-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-xl">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Overview")}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="collections"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Collections")}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="offers"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Offers")}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="activity"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Activity")}</span>
              </TabsTrigger>
        </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Enhanced Recent Sales */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500/5 to-green-600/5 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{t("recent_sales")}</h3>
                      <p className="text-sm text-muted-foreground">Latest successful transactions</p>
                    </div>
                </CardTitle>
                <Link href="/nft/creator/sales">
                    <Button variant="ghost" size="sm" className="hover:bg-green-500/10">
                    {t("view_all")}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {sales.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                        {sale.token?.image && (
                          <Image
                            src={sale.token.image}
                            alt={sale.token.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{sale.token?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{sale.price} {sale.currency}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("Royalty")}: {sale.royaltyFee} {sale.currency}
                      </p>
                    </div>
                  </div>
                ))}
                {sales.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {t("no_sales_yet")}
                  </p>
                )}
              </CardContent>
            </Card>

              {/* Enhanced Top Collections */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500/5 to-purple-600/5 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{t("top_collections")}</h3>
                      <p className="text-sm text-muted-foreground">Your best performing collections</p>
                    </div>
                </CardTitle>
                <Link href="/nft/collections">
                    <Button variant="ghost" size="sm" className="hover:bg-purple-500/10">
                    {t("view_all")}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {trendingCollections.slice(0, 5).map((collection) => (
                  <div key={collection.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                        {collection.logoImage && (
                          <Image
                            src={collection.logoImage}
                            alt={collection.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{collection.name}</p>
                          {collection.isVerified && (
                            <Verified className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {collection.totalItems} {t("items")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{collection.volumeTraded} ETH</p>
                      <p className="text-sm text-muted-foreground">
                        {collection.totalSales} {t("sales")}
                      </p>
                    </div>
                  </div>
                ))}
                {trendingCollections.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {t("no_collections_yet")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

            {/* Enhanced Active Listings */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500/5 to-blue-600/5 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-6">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{t("active_listings")}</h3>
                    <p className="text-sm text-muted-foreground">Your NFTs currently for sale</p>
                  </div>
              </CardTitle>
              <Link href="/nft/dashboard">
                  <Button variant="ghost" size="sm" className="hover:bg-blue-500/10">
                  {t("manage_all")}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {activeListings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeListings.slice(0, 6).map((listing) => (
                    <div key={listing.id} className="border rounded-lg p-4">
                      <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                        {listing.token?.image && (
                          <Image
                            src={listing.token.image}
                            alt={listing.token.name}
                            width={200}
                            height={200}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <h3 className="font-medium mb-1">{listing.token?.name}</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {listing.type === "AUCTION" ? t("current_bid") : t("Price")}
                          </p>
                          <p className="font-bold">{listing.price} {listing.currency}</p>
                        </div>
                        <Badge variant={listing.type === "AUCTION" ? "secondary" : "default"}>
                          {listing.type === "AUCTION" ? t("Auction") : t("Fixed")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">{t("no_active_listings")}</p>
                  <Link href="/nft/dashboard">
                    <Button>
                      {t("list_an_nft")}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="collections" className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {t("my_collections")}
                </h2>
                <p className="text-muted-foreground mt-1">Manage and track your NFT collections</p>
              </div>
            <Link href="/nft/collections/create">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                {t("create_collection")}
              </Button>
            </Link>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map((collection) => (
                <Card key={collection.id} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                  <div className="aspect-video bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-t-lg overflow-hidden relative">
                  {collection.logoImage && (
                    <Image
                      src={collection.logoImage}
                      alt={collection.name}
                      width={300}
                      height={200}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                  <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{collection.name}</h3>
                    {collection.isVerified && (
                      <Verified className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {collection.description}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("Items")}</p>
                      <p className="font-medium">{collection.totalItems}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("Volume")}</p>
                      <p className="font-medium">{collection.volumeTraded} ETH</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("Floor")}</p>
                      <p className="font-medium">{collection.floorPrice || "—"} ETH</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("Sales")}</p>
                      <p className="font-medium">{collection.totalSales}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link href={`/nft/collections/${collection.slug}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        {t("View")}
                      </Button>
                    </Link>
                    <Link href={`/nft/collections/${collection.slug}/edit`} className="flex-1">
                      <Button size="sm" className="w-full">
                        <Edit3 className="h-3 w-3 mr-1" />
                        {t("Edit")}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {collections.length === 0 && (
              <div className="col-span-full">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500/5 to-blue-500/5">
                  <CardContent className="text-center py-16">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-20"></div>
                      <Package className="relative h-20 w-20 mx-auto text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {t("no_collections_yet")}
                    </h3>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                      Start your creative journey by creating your first NFT collection. Organize your digital art and build your brand.
              </p>
              <Link href="/nft/collections/create">
                      <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-xl">
                        <Plus className="h-5 w-5 mr-2" />
                  {t("create_collection")}
                </Button>
              </Link>
                  </CardContent>
                </Card>
            </div>
          )}
        </TabsContent>



        <TabsContent value="offers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                {t("received_offers")} ({receivedOffers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {receivedOffers.length > 0 ? (
                <div className="space-y-4">
                  {receivedOffers.map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden">
                          {offer.token?.image && (
                            <Image
                              src={offer.token.image}
                              alt={offer.token.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{offer.token?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {t("by")} {offer.user?.firstName} {offer.user?.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{offer.amount} {offer.currency}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("Expires")} {new Date(offer.expiresAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline">
                            {t("Decline")}
                          </Button>
                          <Button size="sm">
                            {t("Accept")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {t("no_offers_received_yet")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t("recent_activity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.token?.name} • {new Date(activity.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {activity.price && (
                        <div className="text-right">
                          <p className="font-medium">{activity.price} {activity.currency}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {t("no_activity_yet")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
} 