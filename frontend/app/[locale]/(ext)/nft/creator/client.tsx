"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  DollarSign,
  Package,
  Eye,
  ShoppingCart,
  Crown,
  Plus,
  BarChart3,
  ExternalLink,
  Edit3,
  Verified,
  Image as ImageIcon,
  Wallet,
  Target,
  User,
  Globe,
  Twitter,
  Instagram,
  MessageCircle,
  Rocket,
  AlertCircle,
  CheckCircle2,
  Copy,
  Sparkles,
  Award,
  Flame,
  ArrowUpRight,
  TrendingDown,
  Heart
} from "lucide-react";
import Image from "next/image";
import { useUserStore } from "@/store/user";
import { $fetch } from "@/lib/api";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { AuthModal } from "@/components/auth/auth-modal";
import { CreatorOnboarding } from "@/app/[locale]/(ext)/nft/components/shared/creator-onboarding";
import { DeployCollectionModal } from "@/app/[locale]/(ext)/nft/components/shared/deploy-collection-modal";
import { toast } from "sonner";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";

interface CreatorDashboardData {
  creator?: any;
  portfolio?: {
    totalCollections: number;
    createdNFTs: number;
    totalVolume: number;
    totalValue: number;
    totalViews: number;
  };
  created?: {
    collections: any[];
    recentSales: any[];
    recent: any[];
    stats: {
      totalRoyalties: number;
      totalSales: number;
      totalVolume: number;
    };
  };
  overview?: {
    totalCollections: number;
    totalTokens: number;
    totalVolume: number;
    totalRoyaltyEarnings: number;
    averageSalePrice: number;
    totalViews: number;
  };
  collections?: any[];
  recentSales?: any[];
  topTokens?: any[];
}

export default function NFTDashboardClient() {
  const t = useTranslations("ext_nft");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { user } = useUserStore();
  const searchParams = useSearchParams();

  const [dashboardData, setDashboardData] = useState<CreatorDashboardData | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [creatorStats, setCreatorStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [selectedCollectionForDeploy, setSelectedCollectionForDeploy] = useState<any>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const { ref: heroRef, inView: heroInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    const [overviewRes, profileRes, statsRes] = await Promise.all([
      $fetch({
        url: "/api/nft/creator/overview",
        method: "GET",
        silent: true,
      }),
      $fetch({
        url: "/api/nft/creator/profile",
        method: "GET",
        silent: true,
      }),
      $fetch({
        url: "/api/nft/creator/stats?timeframe=30d",
        method: "GET",
        silent: true,
      })
    ]);

    if (overviewRes.error) {
      console.error("Failed to fetch dashboard data:", overviewRes.error);
    } else {
      setDashboardData(overviewRes.data);
    }

    if (!profileRes.error) {
      setCreatorProfile(profileRes.data);
    }

    if (!statsRes.error) {
      setCreatorStats(statsRes.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [user, fetchDashboardData]);

  // Handle tab query parameter
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["overview", "collections", "nfts", "profile"].includes(tab)) {
      setActiveTab(tab);

      setTimeout(() => {
        if (tabsRef.current) {
          tabsRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }, 300);
    }
  }, [searchParams]);

  const handleDeployCollection = (collectionId: string) => {
    if (!dashboardData || !dashboardData.collections) {
      toast.error("Dashboard data not loaded");
      return;
    }

    const collection = dashboardData.collections.find((c: any) => c.id === collectionId);
    if (!collection) {
      toast.error("Collection not found");
      return;
    }

    setSelectedCollectionForDeploy(collection);
    setDeployModalOpen(true);
  };

  const handleDeploySuccess = async () => {
    await fetchDashboardData();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen px-4 bg-gradient-to-b from-primary/5 via-purple-600/5 to-background`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className={`mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-full flex items-center justify-center`}>
            <Crown className="h-10 w-10 text-primary" />
          </div>
          <h1 className={`text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent`}>
            {tExt("creator_dashboard")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("please_sign_in_to_access_your_creator_dashboard")}
          </p>
          <Button
            size="lg"
            onClick={() => setIsAuthModalOpen(true)}
            className={`bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-xl`}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {tCommon("sign_in")}
          </Button>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialView="login"
          />
        </motion.div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-2xl font-bold">{tExt("failed_to_load_dashboard")}</h1>
          <Button onClick={fetchDashboardData}>{tCommon("try_again")}</Button>
        </div>
      </div>
    );
  }

  const {
    portfolio = {
      totalCollections: 0,
      createdNFTs: 0,
      totalVolume: 0,
      totalValue: 0,
      totalViews: 0,
    },
    created = {
      collections: [],
      recentSales: [],
      recent: [],
      stats: {
        totalRoyalties: 0,
        totalSales: 0,
        totalVolume: 0,
      }
    }
  } = dashboardData || {};

  const overview = {
    totalCollections: portfolio.totalCollections,
    totalTokens: portfolio.createdNFTs,
    totalVolume: portfolio.totalVolume,
    totalRoyaltyEarnings: created.stats.totalRoyalties,
    averageSalePrice: created.stats.totalSales > 0 ? created.stats.totalVolume / created.stats.totalSales : 0,
    totalViews: portfolio.totalViews,
  };

  const collections = created.collections || [];
  const recentSales = created.recentSales || [];
  const topTokens = created.recent || [];

  // Calculate onboarding data
  const hasCollections = collections.length > 0;
  const deployedCollections = collections.filter((c: any) => c.contractAddress && c.status === "ACTIVE");
  const undeployedCollections = collections.filter((c: any) => !c.contractAddress || c.status !== "ACTIVE");
  const hasDeployedCollections = deployedCollections.length > 0;
  const hasNFTs = overview.totalTokens > 0;

  // Stats for hero
  const volumeChange = creatorStats?.totalVolumeChange || 0;
  const viewsChange = creatorStats?.totalViewsChange || 0;

  const stats = [
    {
      label: "Total Volume",
      value: (overview.totalVolume || 0).toLocaleString(),
      change: `${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(1)}%`,
      trend: volumeChange > 0 ? "up" : volumeChange < 0 ? "down" : "neutral",
      icon: DollarSign,
      color: "blue"
    },
    {
      label: "Collections",
      value: overview.totalCollections || 0,
      icon: Package,
      color: "purple"
    },
    {
      label: "Total NFTs",
      value: overview.totalTokens || 0,
      icon: ImageIcon,
      color: "amber"
    },
    {
      label: "Total Views",
      value: (overview.totalViews || 0).toLocaleString(),
      change: `${viewsChange > 0 ? '+' : ''}${viewsChange.toFixed(1)}%`,
      trend: viewsChange > 0 ? "up" : viewsChange < 0 ? "down" : "neutral",
      icon: Eye,
      color: "rose"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <section ref={heroRef} className={`relative pt-20 pb-12 overflow-hidden bg-gradient-to-b from-primary/5 via-purple-600/5 to-background border-b-2`}>
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className={`absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-600/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000`} />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-8"
          >
            {/* Profile Section */}
            <div className="flex items-center gap-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={heroInView ? { scale: 1, opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-xl ring-4 ring-primary/10">
                  <AvatarImage src={user?.avatar || undefined} />
                  <AvatarFallback className={`text-2xl bg-gradient-to-br from-primary to-purple-600 text-white`}>
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className={`text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent`}>
                    {dashboardData.creator?.displayName || `${user?.firstName} ${user?.lastName}`}
                  </h1>
                  {dashboardData.creator?.verificationTier === 'VERIFIED' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={heroInView ? { scale: 1 } : {}}
                      transition={{ type: "spring", delay: 0.4 }}
                    >
                      <Verified className="h-7 w-7 text-blue-500 flex-shrink-0" />
                    </motion.div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Badge className="bg-primary/10 text-primary border-primary/30">
                    <Crown className="w-3 h-3 mr-1" />
                    Creator
                  </Badge>
                  <span>
                    {t("creator_since")} {new Date(dashboardData.creator?.createdAt || user?.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={heroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center gap-3"
            >
              <Link href="/nft/create">
                <Button size="lg" className={`bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-xl`}>
                  <Plus className="h-5 w-5 mr-2" />
                  {t("create_nft")}
                </Button>
              </Link>
              <Link href="/nft/creator/profile">
                <Button size="lg" variant="outline" className="border-2">
                  <Edit3 className="h-5 w-5 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const colorClasses = {
                blue: "from-blue-500/10 to-blue-600/10 border-blue-500/20",
                purple: `from-purple-500/10 to-purple-600/10 border-purple-500/20`,
                amber: "from-amber-500/10 to-amber-600/10 border-amber-500/20",
                rose: "from-rose-500/10 to-rose-600/10 border-rose-500/20",
              }[stat.color];

              const iconColorClasses = {
                blue: "text-blue-600",
                purple: `text-purple-600`,
                amber: "text-amber-600",
                rose: "text-rose-600",
              }[stat.color];

              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.25 + index * 0.05 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                >
                  <Card className={cn("border hover:shadow-lg transition-all duration-200 bg-linear-to-br", colorClasses)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className={cn("p-2 rounded-lg bg-white/50 dark:bg-black/20")}>
                          <Icon className={cn("w-5 h-5", iconColorClasses)} />
                        </div>
                        {stat.change && (
                          <div className={cn(
                            "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            stat.trend === "up" ? "bg-green-500/20 text-green-600 dark:text-green-500" : "bg-red-500/20 text-red-600 dark:text-red-500"
                          )}>
                            {stat.trend === "up" ? <ArrowUpRight className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {stat.change}
                          </div>
                        )}
                      </div>
                      <p className="text-xl lg:text-2xl font-bold mb-1">{stat.value}</p>
                      <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Onboarding Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <CreatorOnboarding
            hasCollections={hasCollections}
            hasDeployedCollections={hasDeployedCollections}
            hasNFTs={hasNFTs}
            totalCollections={collections.length}
            deployedCount={deployedCollections.length}
            undeployedCount={undeployedCollections.length}
            totalNFTs={overview.totalTokens}
          />
        </motion.div>

        {/* Secondary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8"
        >
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-amber-600" />
                </div>
                Earnings Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Royalty Earnings</span>
                <span className="font-bold text-lg text-amber-600">
                  {(overview.totalRoyaltyEarnings || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Avg Sale Price</span>
                <span className="font-bold text-lg text-emerald-600">
                  {(overview.averageSalePrice || 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className={`p-2 bg-purple-500/10 rounded-lg`}>
                  <Target className={`h-5 w-5 text-purple-600`} />
                </div>
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Success Rate</span>
                <span className="font-bold text-lg text-blue-600">
                  {overview.totalTokens > 0 ? Math.round((recentSales.length / overview.totalTokens) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Total Sales</span>
                <span className={`font-bold text-lg text-purple-600`}>
                  {recentSales.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <div ref={tabsRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b-2 rounded-none bg-transparent p-0 h-auto mb-8">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-4 text-base"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="collections"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-4 text-base"
              >
                <Package className="h-5 w-5 mr-2" />
                Collections ({collections.length})
              </TabsTrigger>
              <TabsTrigger
                value="nfts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-4 text-base"
              >
                <ImageIcon className="h-5 w-5 mr-2" />
                NFTs ({topTokens.length})
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-4 text-base"
              >
                <User className="h-5 w-5 mr-2" />
                Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Sales */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="border-2 hover:shadow-xl transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500" />
                        Recent Sales
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="gap-1">
                        View All
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {recentSales.length > 0 ? (
                        <div className="space-y-4">
                          {recentSales.slice(0, 5).map((sale: any, index: number) => (
                            <motion.div
                              key={sale.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                            >
                              <div className={`w-14 h-14 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-xl flex-shrink-0 overflow-hidden`}>
                                {sale.token?.image && (
                                  <Image
                                    src={sale.token.image}
                                    alt={sale.token.name}
                                    width={56}
                                    height={56}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{sale.token?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(sale.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">{sale.price} {sale.currency}</p>
                                {sale.royaltyFee > 0 && (
                                  <p className="text-xs text-amber-600 font-semibold">
                                    +{sale.royaltyFee} royalty
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center">
                            <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">No sales yet</p>
                          <p className="text-xs text-muted-foreground mt-1">Your sales will appear here</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Top NFTs */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="border-2 hover:shadow-xl transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-500" />
                        Top NFTs
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="gap-1">
                        View All
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {topTokens.length > 0 ? (
                        <div className="space-y-4">
                          {topTokens.slice(0, 5).map((token: any, index: number) => (
                            <Link key={token.id} href={`/nft/token/${token.id}`}>
                              <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                              >
                                <div className={`w-14 h-14 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-xl flex-shrink-0 overflow-hidden`}>
                                  {token.image && (
                                    <Image
                                      src={token.image}
                                      alt={token.name}
                                      width={56}
                                      height={56}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold truncate">{token.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {token.collection?.name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Eye className="h-4 w-4" />
                                  <span className="text-sm font-semibold">{token.views || 0}</span>
                                </div>
                              </motion.div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">No NFTs yet</p>
                          <p className="text-xs text-muted-foreground mt-1">Create your first NFT to get started</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="collections" className="mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">My Collections</h2>
                  <p className="text-muted-foreground">
                    Manage and track your NFT collections
                  </p>
                </div>
                <Link href="/nft/collection/create">
                  <Button size="lg" className={`bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-xl`}>
                    <Plus className="h-5 w-5 mr-2" />
                    Create Collection
                  </Button>
                </Link>
              </div>

              {collections.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {collections.map((collection: any, index: number) => (
                    <motion.div
                      key={collection.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:border-primary/50 transition-all">
                        {/* Banner */}
                        <div className={`relative h-40 bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20`}>
                          {collection.bannerImage ? (
                            <Image
                              src={collection.bannerImage}
                              alt={collection.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : collection.logoImage ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="relative w-24 h-24">
                                <Image
                                  src={collection.logoImage}
                                  alt={collection.name}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Package className="h-16 w-16 text-primary/40" />
                            </div>
                          )}

                          {/* Status Badge */}
                          <Badge
                            className={cn(
                              "absolute top-3 right-3 text-xs font-semibold",
                              collection.status === 'ACTIVE'
                                ? 'bg-emerald-500 text-white'
                                : collection.status === 'PENDING'
                                ? 'bg-amber-500 text-white'
                                : 'bg-zinc-500 text-white'
                            )}
                          >
                            {collection.status || 'PENDING'}
                          </Badge>

                          {/* Logo overlay - positioned at bottom left overlapping banner */}
                          {collection.logoImage && collection.bannerImage && (
                            <div className="absolute -bottom-8 left-4 w-16 h-16 rounded-xl border-4 border-card bg-card overflow-hidden shadow-lg">
                              <Image
                                src={collection.logoImage}
                                alt={`${collection.name} logo`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                        </div>

                        <div className={cn("p-5", collection.logoImage && collection.bannerImage && "pt-10")}>
                          {/* Title */}
                          <h3 className="font-bold text-lg mb-1 truncate group-hover:text-primary transition-colors">{collection.name}</h3>
                          {collection.symbol && (
                            <p className="text-xs text-muted-foreground mb-4 font-medium">{collection.symbol}</p>
                          )}

                          {/* Deployment Status */}
                          {collection.contractAddress ? (
                            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-900 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Deployed</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs text-emerald-600 dark:text-emerald-400 truncate flex-1 font-mono">
                                  {collection.contractAddress.slice(0, 8)}...{collection.contractAddress.slice(-6)}
                                </code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => copyToClipboard(collection.contractAddress)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900 rounded-xl">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Not Deployed</span>
                              </div>
                            </div>
                          )}

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-4 border-b">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <Package className="h-4 w-4" />
                              {collection.tokenCount || 0}
                            </span>
                            <Badge variant="outline" className="text-xs font-semibold">{collection.chain || 'BSC'}</Badge>
                            <Badge variant="outline" className="text-xs font-semibold">{collection.standard || 'ERC721'}</Badge>
                          </div>

                          {/* Actions */}
                          {collection.contractAddress ? (
                            <div className="flex gap-2">
                              <Link href={`/nft/collection/${collection.id}`} className="flex-1">
                                <Button size="sm" className="w-full h-10 font-semibold">View</Button>
                              </Link>
                              <Link href={`/nft/collection/${collection.id}/edit`}>
                                <Button size="sm" variant="outline" className="h-10 w-10 p-0">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                className={`w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg h-10`}
                                onClick={() => handleDeployCollection(collection.id)}
                              >
                                <Rocket className="h-4 w-4 mr-2" />
                                Deploy to Blockchain
                              </Button>
                              <div className="flex gap-2">
                                <Link href={`/nft/collection/${collection.id}`} className="flex-1">
                                  <Button size="sm" variant="outline" className="w-full h-9 font-semibold">View</Button>
                                </Link>
                                <Link href={`/nft/collection/${collection.id}/edit`}>
                                  <Button size="sm" variant="outline" className="h-9 w-9 p-0">
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="border-2">
                    <CardContent className="text-center py-20">
                      <div className={`w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-full flex items-center justify-center`}>
                        <Package className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">No collections yet</h3>
                      <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-lg">
                        Start your creative journey by creating your first NFT collection
                      </p>
                      <Link href="/nft/collection/create">
                        <Button size="lg" className={`bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-xl h-12 px-8`}>
                          <Plus className="h-5 w-5 mr-2" />
                          Create Collection
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="nfts" className="mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">My NFTs</h2>
                  <p className="text-muted-foreground">
                    All NFTs you've created
                  </p>
                </div>
                <Link href="/nft/create">
                  <Button size="lg" className={`bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-xl`}>
                    <Plus className="h-5 w-5 mr-2" />
                    Create NFT
                  </Button>
                </Link>
              </div>

              {topTokens.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {topTokens.map((token: any, index: number) => (
                    <motion.div
                      key={token.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link href={`/nft/token/${token.id}`} className="block">
                        <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:border-primary/50 transition-all">
                          {/* Image */}
                          <div className={`relative aspect-square overflow-hidden bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20`}>
                            {token.image ? (
                              <Image
                                src={token.image}
                                alt={token.name}
                                width={400}
                                height={400}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Sparkles className="w-16 h-16 text-primary/40" />
                              </div>
                            )}

                            {/* Overlay Actions */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <Button
                                size="icon"
                                variant="secondary"
                                className="rounded-full"
                                onClick={(e) => {
                                  e.preventDefault();
                                }}
                              >
                                <Heart className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                className={`rounded-full bg-gradient-to-r from-primary to-purple-600`}
                                onClick={(e) => {
                                  e.preventDefault();
                                }}
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Status Badge */}
                            {token.status && (
                              <Badge className="absolute top-3 left-3 bg-primary/20 text-primary border border-primary/30">
                                {token.status}
                              </Badge>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-4">
                            {/* Collection */}
                            <div className="flex items-center gap-1 mb-2">
                              <span className="text-xs text-muted-foreground truncate">
                                {token.collection?.name}
                              </span>
                              {token.collection?.isVerified && (
                                <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center shrink-0">
                                  <span className="text-[8px] text-white">✓</span>
                                </div>
                              )}
                            </div>

                            {/* Name */}
                            <h3 className="font-semibold text-lg mb-3 truncate">
                              {token.name}
                            </h3>

                            {/* Stats */}
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Status
                                </div>
                                <div className="font-bold">
                                  {token.status || 'Draft'}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {token.views || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3" />
                                  {token.likeCount || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="border-2">
                    <CardContent className="text-center py-20">
                      <div className={`w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-full flex items-center justify-center`}>
                        <ImageIcon className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">No NFTs yet</h3>
                      <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-lg">
                        Create your first NFT and start building your collection
                      </p>
                      <Link href="/nft/create">
                        <Button size="lg" className={`bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-xl h-12 px-8`}>
                          <Plus className="h-5 w-5 mr-2" />
                          Create NFT
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              {!creatorProfile ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mx-auto"
                >
                  <Card className="border-2">
                    <CardContent className="p-16 text-center">
                      <div className={`mx-auto w-24 h-24 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-full flex items-center justify-center mb-8`}>
                        <User className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="text-3xl font-bold mb-4">No Creator Profile Yet</h3>
                      <p className="text-muted-foreground mb-10 max-w-md mx-auto text-lg">
                        Create your creator profile to showcase your work, add a bio, and connect your social media accounts.
                      </p>
                      <Link href="/nft/creator/profile">
                        <Button size="lg" className={`bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-xl h-12 px-8`}>
                          <Edit3 className="h-5 w-5 mr-2" />
                          Create Your Profile
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Keep existing profile content */}
                  <Card className="border-2">
                    <CardContent className="p-0">
                      {/* Banner */}
                      {creatorProfile?.banner ? (
                        <div className={`relative w-full h-56 bg-gradient-to-r from-primary to-purple-600 rounded-t-xl overflow-hidden`}>
                          <Image
                            src={creatorProfile.banner}
                            alt="Profile Banner"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`w-full h-56 bg-gradient-to-r from-primary via-purple-600 to-pink-600 rounded-t-xl`} />
                      )}

                      {/* Profile Info */}
                      <div className="p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 -mt-24 mb-6">
                          <Avatar className="h-40 w-40 border-4 border-background shadow-2xl ring-4 ring-primary/20">
                            <AvatarImage src={user?.avatar || undefined} />
                            <AvatarFallback className={`text-4xl bg-gradient-to-br from-primary to-purple-600 text-white`}>
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 mt-16 sm:mt-0">
                            <div className="flex items-center gap-3 mb-3">
                              <h2 className="text-3xl font-bold">
                                {creatorProfile?.displayName || `${user?.firstName} ${user?.lastName}`}
                              </h2>
                              {creatorProfile?.isVerified && (
                                <Verified className="h-7 w-7 text-blue-500" />
                              )}
                            </div>
                            <p className="text-muted-foreground mb-6 text-lg">
                              {creatorProfile?.bio || "No bio added yet"}
                            </p>

                            <div className="flex flex-wrap gap-4">
                              {creatorProfile?.website && (
                                <a
                                  href={creatorProfile.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Globe className="h-4 w-4" />
                                  Website
                                </a>
                              )}
                              {creatorProfile?.twitter && (
                                <a
                                  href={`https://twitter.com/${creatorProfile.twitter}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Twitter className="h-4 w-4" />
                                  Twitter
                                </a>
                              )}
                              {creatorProfile?.instagram && (
                                <a
                                  href={`https://instagram.com/${creatorProfile.instagram}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Instagram className="h-4 w-4" />
                                  Instagram
                                </a>
                              )}
                              {creatorProfile?.discord && (
                                <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                  <MessageCircle className="h-4 w-4" />
                                  {creatorProfile.discord}
                                </span>
                              )}
                            </div>
                          </div>

                          <Link href="/nft/creator/profile">
                            <Button variant="outline" size="lg" className="flex-shrink-0 border-2">
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit Profile
                            </Button>
                          </Link>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t-2">
                          <div className="text-center">
                            <p className="text-3xl font-bold mb-1">
                              {overview.totalCollections || 0}
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">Collections</p>
                          </div>
                          <div className="text-center">
                            <p className="text-3xl font-bold mb-1">
                              {overview.totalTokens || 0}
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">NFTs Created</p>
                          </div>
                          <div className="text-center">
                            <p className="text-3xl font-bold mb-1">
                              {(overview.totalVolume || 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">Total Volume</p>
                          </div>
                          <div className="text-center">
                            <p className="text-3xl font-bold mb-1">
                              {overview.totalViews || 0}
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">Total Views</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Profile Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-2 hover:border-primary/50 transition-all">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold">Account Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground">Email</span>
                          <span className="text-sm font-semibold">{user?.email}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground">Member Since</span>
                          <span className="text-sm font-semibold">
                            {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground">Profile Status</span>
                          <Badge variant={creatorProfile?.profilePublic ? "default" : "secondary"} className="font-semibold">
                            {creatorProfile?.profilePublic ? "Public" : "Private"}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground">Verification</span>
                          {creatorProfile?.isVerified ? (
                            <Badge className="bg-blue-500 text-white font-semibold">
                              <Verified className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="font-semibold">Unverified</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 hover:border-primary/50 transition-all">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold">Creator Earnings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground">Total Sales</span>
                          <span className="text-sm font-bold text-emerald-600">
                            {recentSales.length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground">Sales Volume</span>
                          <span className="text-sm font-bold text-emerald-600">
                            {(overview.totalVolume || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground">Royalty Earnings</span>
                          <span className="text-sm font-bold text-emerald-600">
                            {(overview.totalRoyaltyEarnings || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground">Avg Sale Price</span>
                          <span className="text-sm font-bold text-emerald-600">
                            {(overview.averageSalePrice || 0).toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Deploy Collection Modal */}
      {selectedCollectionForDeploy && (
        <DeployCollectionModal
          isOpen={deployModalOpen}
          onClose={() => {
            setDeployModalOpen(false);
            setSelectedCollectionForDeploy(null);
          }}
          collection={selectedCollectionForDeploy}
          onSuccess={handleDeploySuccess}
        />
      )}
    </div>
  );
}
