"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLoading from "./loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Loader2,
  DollarSign,
  Activity,
  Eye,
  EyeOff,
  Edit,
  Crown,
  Trophy,
  Target,
  Wallet,
  ArrowRight,
  Clock,
  Zap,
  Shield,
  Sparkles,
  ChevronRight,
  Percent,
  LineChart,
  Gift,
  Settings,
  ExternalLink,
  Calendar,
  Globe,
  Coins,
  AlertTriangle,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { formatPnL, formatAllocation } from "@/utils/currency";
import { useTranslations } from "next-intl";
import LeaderOnboarding from "./onboarding";

interface LeaderMarket {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  minBase: number;
  minQuote: number;
  isActive: boolean;
  followerCount: number;
}

interface EcosystemMarket {
  id: string;
  currency: string;
  pair: string;
  metadata: any;
}

interface LeaderProfile {
  id: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  tradingStyle: string;
  riskLevel: string;
  winRate: number;
  roi: number;
  totalFollowers: number;
  totalTrades: number;
  totalProfit: number;
  totalVolume: number;
  profitSharePercent: number;
  minFollowAmount: number;
  maxFollowers: number;
  status: string;
  isPublic: boolean;
  currency?: string;
  createdAt: string;
  user?: {
    avatar?: string;
  };
  dailyStats?: any[];
  markets?: LeaderMarket[];
  followers?: Array<{
    id: string;
    userId: string;
    copyMode: string;
    status: string;
    user?: {
      firstName?: string;
      lastName?: string;
    };
    allocations?: Array<{
      id: string;
      symbol: string;
      baseAmount: number;
      quoteAmount: number;
      isActive: boolean;
    }>;
  }>;
}

interface EditForm {
  bio: string;
  profitSharePercent: number;
  minFollowAmount: number;
  maxFollowers: number;
}

const tradingStyleInfo: Record<
  string,
  { icon: any; color: string; bg: string; label: string; gradient: string }
> = {
  SCALPING: {
    icon: Zap,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-500/20",
    label: "Scalping",
    gradient: "from-purple-500 to-pink-500",
  },
  DAY_TRADING: {
    icon: BarChart3,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/20",
    label: "Day Trading",
    gradient: "from-blue-500 to-cyan-500",
  },
  SWING: {
    icon: TrendingUp,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-500/20",
    label: "Swing",
    gradient: "from-cyan-500 to-teal-500",
  },
  POSITION: {
    icon: Shield,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-100 dark:bg-indigo-500/20",
    label: "Position",
    gradient: "from-indigo-500 to-purple-500",
  },
};

const riskLevelConfig: Record<
  string,
  { color: string; bg: string; gradient: string; label: string }
> = {
  LOW: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    gradient: "from-emerald-500 to-green-500",
    label: "Conservative",
  },
  MEDIUM: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    gradient: "from-amber-500 to-orange-500",
    label: "Moderate",
  },
  HIGH: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    gradient: "from-red-500 to-rose-500",
    label: "Aggressive",
  },
};

export default function DashboardPage() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const settingsRef = useRef<HTMLDivElement>(null);

  const [leaderProfile, setLeaderProfile] = useState<LeaderProfile | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && ["followers", "markets", "performance", "settings"].includes(tabFromUrl)
      ? tabFromUrl
      : "followers"
  );

  // Handle tab change and update URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "followers") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const [editForm, setEditForm] = useState<EditForm>({
    bio: "",
    profitSharePercent: 20,
    minFollowAmount: 100,
    maxFollowers: 100,
  });

  const [platformStats, setPlatformStats] = useState({
    totalLeaders: 0,
    totalVolume: 0,
    avgRoi: 0,
  });

  // Markets management state
  const [availableMarkets, setAvailableMarkets] = useState<EcosystemMarket[]>(
    []
  );
  const [leaderMarkets, setLeaderMarkets] = useState<LeaderMarket[]>([]);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchData = async () => {
      try {
        // Fetch leader profile and platform stats in parallel
        const [leaderResponse, statsResponse, marketsResponse] =
          await Promise.all([
            $fetch({
              url: "/api/copy-trading/leader/me",
              method: "GET",
              silentSuccess: true,
            }),
            $fetch({
              url: "/api/copy-trading/stats",
              method: "GET",
              silent: true,
            }),
            $fetch({
              url: "/api/ecosystem/market",
              method: "GET",
              silent: true,
            }),
          ]);

        if (!leaderResponse.error) {
          setLeaderProfile(leaderResponse.data);
          // Fetch leader's declared markets if they are a leader
          if (leaderResponse.data?.id) {
            const { data: leaderMarketsData } = await $fetch({
              url: "/api/copy-trading/leader/market",
              method: "GET",
              silentSuccess: true,
            });
            if (leaderMarketsData) {
              setLeaderMarkets(leaderMarketsData);
            }
          }
          // Show onboarding for new leaders (less than 5 trades or no markets)
          const profile = leaderResponse.data;
          const isNewLeader =
            profile.totalTrades < 5 &&
            profile.totalFollowers === 0 &&
            !localStorage.getItem(`leader-onboarding-dismissed-${profile.id}`);
          setShowOnboarding(isNewLeader);
        }

        if (statsResponse.data) {
          setPlatformStats({
            totalLeaders: statsResponse.data.totalLeaders || 0,
            totalVolume: statsResponse.data.totalVolume || 0,
            avgRoi: statsResponse.data.avgRoi || 0,
          });
        }

        if (marketsResponse.data) {
          setAvailableMarkets(marketsResponse.data);
        }
      } catch (error) {
        // User is not a leader or stats fetch failed
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Scroll to settings tab if coming from URL with tab param
  useEffect(() => {
    if (tabFromUrl && !isLoading && leaderProfile && settingsRef.current) {
      // Small delay to ensure the tab content is rendered
      setTimeout(() => {
        settingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [tabFromUrl, isLoading, leaderProfile]);

  const refetchLeaderProfile = async () => {
    const { data, error } = await $fetch({
      url: "/api/copy-trading/leader/me",
      method: "GET",
      silentSuccess: true,
    });

    if (!error) {
      setLeaderProfile(data);
    }
  };

  const handleDismissOnboarding = () => {
    if (leaderProfile?.id) {
      localStorage.setItem(
        `leader-onboarding-dismissed-${leaderProfile.id}`,
        "true"
      );
    }
    setShowOnboarding(false);
  };

  const handleNavigateToTab = (tab: string) => {
    setActiveTab(tab);
    setShowOnboarding(false);
  };

  const handleUpdateProfile = async () => {
    if (!leaderProfile) return;

    setIsSubmitting(true);
    const { error } = await $fetch({
      url: "/api/copy-trading/leader/me",
      method: "PUT",
      body: {
        bio: editForm.bio,
        profitSharePercent: editForm.profitSharePercent,
        minFollowAmount: editForm.minFollowAmount,
        maxFollowers: editForm.maxFollowers,
        isPublic: leaderProfile.isPublic,
      },
    });

    if (!error) {
      toast.success("Profile updated successfully");
      setIsEditDialogOpen(false);
      refetchLeaderProfile();
    }
    setIsSubmitting(false);
  };

  const handleToggleVisibility = async () => {
    if (!leaderProfile) return;

    const { error } = await $fetch({
      url: "/api/copy-trading/leader/me",
      method: "PUT",
      body: {
        isPublic: !leaderProfile.isPublic,
      },
    });

    if (!error) {
      toast.success(
        leaderProfile.isPublic ? "Profile hidden" : "Profile is now public"
      );
      refetchLeaderProfile();
    }
  };

  const [togglingMarket, setTogglingMarket] = useState<string | null>(null);
  const [disableConfirmDialog, setDisableConfirmDialog] = useState<{
    open: boolean;
    symbol: string;
    followerCount: number;
  }>({ open: false, symbol: "", followerCount: 0 });

  // Market settings editing state
  const [editingMarketSettings, setEditingMarketSettings] = useState<{
    open: boolean;
    symbol: string;
    baseCurrency: string;
    quoteCurrency: string;
    minBase: number;
    minQuote: number;
  } | null>(null);
  const [isSavingMarketSettings, setIsSavingMarketSettings] = useState(false);

  const handleToggleMarket = async (symbol: string, enable: boolean) => {
    // If disabling and has followers, show confirmation dialog
    if (!enable) {
      const market = leaderMarkets.find((m) => m.symbol === symbol);
      if (market && market.followerCount > 0) {
        setDisableConfirmDialog({
          open: true,
          symbol,
          followerCount: market.followerCount,
        });
        return;
      }
    }

    await executeMarketToggle(symbol, enable);
  };

  const executeMarketToggle = async (symbol: string, enable: boolean) => {
    setTogglingMarket(symbol);
    setDisableConfirmDialog({ open: false, symbol: "", followerCount: 0 });

    const { data, error } = await $fetch({
      url: `/api/copy-trading/leader/market/${encodeURIComponent(symbol)}/toggle`,
      method: "PUT",
      body: { isActive: enable },
    });

    if (!error && data) {
      if (data.refundedAllocations > 0) {
        toast.success(
          `Market ${symbol} disabled. ${data.refundedAllocations} follower allocation(s) refunded.`
        );
      } else {
        toast.success(`Market ${symbol} ${enable ? "enabled" : "disabled"}`);
      }
      // Refetch leader markets
      const { data: marketsData } = await $fetch({
        url: "/api/copy-trading/leader/market",
        method: "GET",
        silentSuccess: true,
      });
      if (marketsData) {
        setLeaderMarkets(marketsData);
      }
    }
    setTogglingMarket(null);
  };

  // Save market min amounts
  const handleSaveMarketSettings = async () => {
    if (!editingMarketSettings) return;

    setIsSavingMarketSettings(true);
    const { data, error } = await $fetch({
      url: `/api/copy-trading/leader/market/${encodeURIComponent(editingMarketSettings.symbol)}`,
      method: "PUT",
      body: {
        minBase: editingMarketSettings.minBase,
        minQuote: editingMarketSettings.minQuote,
      },
    });

    if (!error && data) {
      toast.success("Market settings updated");
      // Refetch leader markets
      const { data: marketsData } = await $fetch({
        url: "/api/copy-trading/leader/market",
        method: "GET",
        silentSuccess: true,
      });
      if (marketsData) {
        setLeaderMarkets(marketsData);
      }
      setEditingMarketSettings(null);
    }
    setIsSavingMarketSettings(false);
  };

  // Open market settings dialog
  const handleOpenMarketSettings = (market: LeaderMarket) => {
    setEditingMarketSettings({
      open: true,
      symbol: market.symbol,
      baseCurrency: market.baseCurrency,
      quoteCurrency: market.quoteCurrency,
      minBase: market.minBase || 0,
      minQuote: market.minQuote || 0,
    });
  };

  // Check if a market is enabled by the leader
  const isMarketEnabled = (currency: string, pair: string) => {
    const symbol = `${currency}/${pair}`;
    return leaderMarkets.some((m) => m.symbol === symbol && m.isActive);
  };

  // Get follower count for a market
  const getMarketFollowerCount = (currency: string, pair: string) => {
    const symbol = `${currency}/${pair}`;
    const market = leaderMarkets.find((m) => m.symbol === symbol);
    return market?.followerCount || 0;
  };

  // Get leader market data for a symbol
  const getLeaderMarket = (currency: string, pair: string): LeaderMarket | undefined => {
    const symbol = `${currency}/${pair}`;
    return leaderMarkets.find((m) => m.symbol === symbol);
  };

  if (isLoading) {
    return <DashboardLoading />;
  }

  // Not a leader - show apply section with premium design
  if (!leaderProfile) {
    return (
      <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950 overflow-hidden">
        {/* Hero Section */}
        <div className="relative pt-28 pb-32">
          {/* Background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-linear-to-r from-amber-500/30 to-orange-500/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-linear-to-r from-indigo-500/20 to-violet-500/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-linear-to-r from-primary/10 to-cyan-500/10 rounded-full blur-3xl" />
          </div>

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          <div className="container mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-4xl mx-auto"
            >
              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Badge
                  variant="outline"
                  className="px-5 py-2.5 rounded-full mb-8 bg-linear-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-amber-500/30 backdrop-blur-sm"
                >
                  <Crown className="w-4 h-4 text-amber-500 mr-2" />
                  <span className="text-sm font-semibold bg-linear-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                    {t("elite_leader_program")}
                  </span>
                </Badge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8"
              >
                <span className="bg-linear-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-200 dark:to-white bg-clip-text text-transparent">
                  {t("become_a")}
                </span>
                <br />
                <span className="bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                  {t("trading_legend")}
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-12"
              >
                {t("share_your_expertise_build_your_following")}
              </motion.p>

              {/* Stats preview - Using real platform data */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap justify-center gap-8 mb-12"
              >
                {[
                  {
                    value:
                      platformStats.totalLeaders > 0
                        ? `${platformStats.totalLeaders}`
                        : "0",
                    label: "Active Leaders",
                  },
                  {
                    value:
                      platformStats.totalVolume > 0
                        ? `$${
                            platformStats.totalVolume >= 1000000
                              ? `${(platformStats.totalVolume / 1000000).toFixed(1)}M`
                              : platformStats.totalVolume >= 1000
                                ? `${(platformStats.totalVolume / 1000).toFixed(0)}K`
                                : platformStats.totalVolume.toFixed(0)
                          }`
                        : "$0",
                    label: "Total Volume",
                  },
                  {
                    value:
                      platformStats.avgRoi > 0
                        ? `${platformStats.avgRoi.toFixed(1)}%`
                        : "0%",
                    label: "Avg. ROI",
                  },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="container mx-auto -mt-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
          >
            {[
              {
                icon: Users,
                title: "Build Your Empire",
                description:
                  "Attract thousands of traders who want to replicate your winning strategies",
                gradient: "from-blue-500 to-purple-500",
                iconBg: "bg-blue-500",
                stats: "Up to 1000 followers",
              },
              {
                icon: DollarSign,
                title: "Earn Profit Share",
                description:
                  "Set your commission rate (5-50%) and earn automatically when followers profit",
                gradient: "from-emerald-500 to-green-500",
                iconBg: "bg-emerald-500",
                stats: "5-50% commission",
              },
              {
                icon: Trophy,
                title: "Gain Recognition",
                description:
                  "Climb the leaderboards, earn badges, and become a verified trading expert",
                gradient: "from-amber-500 to-orange-500",
                iconBg: "bg-amber-500",
                stats: "Verified status",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group"
              >
                <Card className="h-full border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 overflow-hidden">
                  {/* Gradient top border */}
                  <div className={`h-1.5 bg-linear-to-r ${item.gradient}`} />

                  {/* Hover glow effect */}
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                  />

                  <CardContent className="p-8 relative">
                    {/* Icon */}
                    <motion.div
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      className={`w-16 h-16 rounded-2xl ${item.iconBg} flex items-center justify-center mb-6 shadow-lg`}
                    >
                      <item.icon className="h-8 w-8 text-white" />
                    </motion.div>

                    <h3 className="font-bold text-xl mb-3 text-zinc-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Stats badge */}
                    <Badge
                      variant="secondary"
                      className="bg-zinc-100 dark:bg-zinc-800"
                    >
                      {item.stats}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Features grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="max-w-4xl mx-auto mb-20"
          >
            <div className="text-center mb-12">
              <Badge
                variant="outline"
                className="px-4 py-2 rounded-full mb-6 bg-linear-to-r from-indigo-500/10 to-violet-500/10 border-indigo-500/20"
              >
                <Sparkles className="w-4 h-4 text-indigo-500 mr-2" />
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {t("premium_features")}
                </span>
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                  {tCommon("everything_you_need_to_succeed")}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: LineChart, text: "Real-time performance analytics" },
                { icon: Users, text: "Follower management dashboard" },
                { icon: Percent, text: "Customizable profit sharing" },
                { icon: Shield, text: "Verified leader badge" },
                { icon: Globe, text: "Public profile & visibility" },
                { icon: Gift, text: "Earn rewards & bonuses" },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 group cursor-default"
                >
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center shrink-0 group-hover:from-indigo-500/30 group-hover:to-violet-500/30 transition-all">
                    <feature.icon className="h-6 w-6 text-indigo-500" />
                  </div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {feature.text}
                  </span>
                  <ChevronRight className="h-5 w-5 text-zinc-300 dark:text-zinc-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="max-w-4xl mx-auto pb-20"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-linear-to-r from-amber-500/40 via-orange-500/40 to-rose-500/40 rounded-4xl blur-2xl opacity-70" />

              <Card className="relative overflow-hidden border-0 bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 bg-size-[200%_100%] animate-gradient-x">
                {/* Pattern overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'0.07\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

                {/* Floating shapes */}
                <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />

                <CardContent className="relative p-10 md:p-16">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="text-center lg:text-left">
                      <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                        <Crown className="h-8 w-8 text-white/90" />
                        <span className="text-white/80 font-medium">
                          {t("start_your_journey")}
                        </span>
                      </div>
                      <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                        {t("ready_to_lead")}
                      </h3>
                      <p className="text-white/80 max-w-lg text-lg">
                        {t("complete_your_application_now_and_start")}{" "}
                        {t("no_upfront_costs")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-4">
                      <Link href="/copy-trading/become-leader">
                        <Button
                          size="lg"
                          className="h-16 px-10 bg-white text-amber-600 hover:bg-zinc-100 font-bold rounded-2xl shadow-2xl transition-all group text-lg"
                        >
                          <span className="flex items-center">
                            {t("apply_now")}
                            <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" />
                          </span>
                        </Button>
                      </Link>
                      <p className="text-white/60 text-sm text-center">
                        {t("takes_only_2_minutes")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Leader dashboard with premium design
  const avatar = leaderProfile.avatar || leaderProfile.user?.avatar;
  const initials = leaderProfile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isPositiveRoi = leaderProfile.roi >= 0;
  const styleConfig =
    tradingStyleInfo[leaderProfile.tradingStyle] ||
    tradingStyleInfo.DAY_TRADING;
  const riskConfig =
    riskLevelConfig[leaderProfile.riskLevel] || riskLevelConfig.MEDIUM;
  const StyleIcon = styleConfig.icon;
  const spotsUsed =
    (leaderProfile.totalFollowers / leaderProfile.maxFollowers) * 100;
  const daysActive = Math.floor(
    (Date.now() - new Date(leaderProfile.createdAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            Active
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 px-3 py-1">
            <Clock className="h-3 w-3 mr-1.5" />
            {tCommon("pending_review")}
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 px-3 py-1">
            Suspended
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 px-3 py-1">
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950 overflow-hidden">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden border-b border-zinc-200/50 dark:border-zinc-800/50 pt-24 pb-8">
        {/* Background effects */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-violet-500/20 rounded-full blur-3xl" />

        <div className="container mx-auto relative">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-12"
          >
            {/* Left side - Avatar and info */}
            <div className="flex items-center gap-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="relative"
              >
                {/* Glow effect behind avatar */}
                <div
                  className={`absolute -inset-2 bg-linear-to-br ${styleConfig.gradient} rounded-3xl blur-xl opacity-40`}
                />

                <Avatar className="h-24 w-24 md:h-28 md:w-28 ring-4 ring-white dark:ring-zinc-800 shadow-2xl relative">
                  <AvatarImage src={avatar} alt={leaderProfile.displayName} />
                  <AvatarFallback
                    className={`text-3xl bg-linear-to-br ${styleConfig.gradient} text-white font-bold`}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Crown badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-linear-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center ring-4 ring-white dark:ring-zinc-800 shadow-lg"
                >
                  <Crown className="h-5 w-5 text-white" />
                </motion.div>
              </motion.div>

              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">
                    {leaderProfile.displayName}
                  </h1>
                  {getStatusBadge(leaderProfile.status)}
                </div>

                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <Badge
                    className={`${styleConfig.bg} ${styleConfig.color} border-0 px-3 py-1`}
                  >
                    <StyleIcon className="h-3.5 w-3.5 mr-1.5" />
                    {styleConfig.label}
                  </Badge>
                  <Badge
                    className={`${riskConfig.bg} ${riskConfig.color} border-0 px-3 py-1`}
                  >
                    <Shield className="h-3.5 w-3.5 mr-1.5" />
                    {riskConfig.label} Risk
                  </Badge>
                  {!leaderProfile.isPublic && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                      <EyeOff className="h-3.5 w-3.5" />
                      Hidden
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {daysActive} {t("days_active")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    {tCommon("id")} {leaderProfile.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3"
            >
              <Button
                variant="outline"
                onClick={handleToggleVisibility}
                className="gap-2 rounded-xl h-11 px-5 border-zinc-200 dark:border-zinc-700"
              >
                {leaderProfile.isPublic ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    {t("hide_profile")}
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    {t("make_public")}
                  </>
                )}
              </Button>
              <Link href={`/copy-trading/leader/${leaderProfile.id}`}>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-11 w-11 border-zinc-200 dark:border-zinc-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Key Metrics Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {/* ROI Card */}
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-zinc-900 overflow-hidden">
              <div
                className={`h-1 bg-linear-to-r ${isPositiveRoi ? "from-emerald-500 to-green-500" : "from-red-500 to-rose-500"}`}
              />
              <CardContent className="p-5 h-[140px] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {t("total_roi")}
                  </span>
                  <div
                    className={`p-2 rounded-xl ${isPositiveRoi ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-red-100 dark:bg-red-500/20"}`}
                  >
                    {isPositiveRoi ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                </div>
                <div
                  className={`text-3xl md:text-4xl font-bold ${isPositiveRoi ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
                >
                  {isPositiveRoi ? "+" : ""}
                  {leaderProfile.roi.toFixed(2)}%
                </div>
                <div className="mt-auto text-xs text-zinc-500 dark:text-zinc-400">
                  {t("all_time_performance")}
                </div>
              </CardContent>
            </Card>

            {/* Win Rate Card */}
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="h-1 bg-linear-to-r from-blue-500 to-cyan-500" />
              <CardContent className="p-5 h-[140px] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {tCommon("win_rate")}
                  </span>
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-500/20">
                    <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {leaderProfile.winRate.toFixed(1)}%
                </div>
                <div className="mt-auto">
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(leaderProfile.winRate, 100)}%`,
                      }}
                      transition={{ delay: 0.5, duration: 1 }}
                      className="h-full bg-linear-to-r from-blue-500 to-cyan-500 rounded-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Followers Card */}
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="h-1 bg-linear-to-r from-indigo-500 to-violet-500" />
              <CardContent className="p-5 h-[140px] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Followers
                  </span>
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
                    <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                  {leaderProfile.totalFollowers}
                </div>
                <div className="mt-auto">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                    <span>Capacity</span>
                    <span className="font-medium">
                      {leaderProfile.totalFollowers}/
                      {leaderProfile.maxFollowers}
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(spotsUsed, 100)}%` }}
                      transition={{ delay: 0.6, duration: 1 }}
                      className={`h-full rounded-full ${
                        spotsUsed > 90
                          ? "bg-red-500"
                          : spotsUsed > 70
                            ? "bg-amber-500"
                            : "bg-indigo-500"
                      }`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Trades Card */}
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="h-1 bg-linear-to-r from-amber-500 to-orange-500" />
              <CardContent className="p-5 h-[140px] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {tExt("total_trades")}
                  </span>
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/20">
                    <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-amber-600 dark:text-amber-400">
                  {leaderProfile.totalTrades.toLocaleString()}
                </div>
                <div className="mt-auto text-xs text-zinc-500 dark:text-zinc-400">
                  {t("executed_trades")}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Onboarding for new leaders - placed outside hero section */}
      {showOnboarding && (
        <div className="container mx-auto px-4 mt-8 mb-8">
          <LeaderOnboarding
            leaderProfile={{
              displayName: leaderProfile.displayName,
              totalTrades: leaderProfile.totalTrades,
              totalFollowers: leaderProfile.totalFollowers,
              markets: leaderMarkets,
              bio: leaderProfile.bio,
              isPublic: leaderProfile.isPublic,
            }}
            onDismiss={handleDismissOnboarding}
            onNavigateToTab={handleNavigateToTab}
          />
        </div>
      )}

      <div className="container mx-auto py-8">
        {/* Financial Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          {/* Total Profit */}
          <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    {tExt("total_profit")}
                  </p>
                  <div
                    className={`text-3xl font-bold ${leaderProfile.totalProfit >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
                  >
                    {formatPnL(leaderProfile.totalProfit, "USDT").formatted}
                  </div>
                </div>
                <div
                  className={`p-3 rounded-2xl ${leaderProfile.totalProfit >= 0 ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-red-100 dark:bg-red-500/20"}`}
                >
                  <DollarSign
                    className={`h-6 w-6 ${leaderProfile.totalProfit >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
                  />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {t("all_time_earnings")}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                    {leaderProfile.totalTrades} trades
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Volume */}
          <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    {tExt("total_volume")}
                  </p>
                  <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                    {formatAllocation(leaderProfile.totalVolume, "USDT")}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-500/20">
                  <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {t("avg_per_trade")}
                  </span>
                  <span className="text-zinc-900 dark:text-white font-medium">
                    {formatAllocation(
                      leaderProfile.totalVolume /
                        Math.max(leaderProfile.totalTrades, 1),
                      "USDT"
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profit Share Settings */}
          <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    {tCommon("profit_share")}
                  </p>
                  <div className="text-3xl font-bold text-primary">
                    {leaderProfile.profitSharePercent}%
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-primary/10 dark:bg-primary/20">
                  <Percent className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {t("minimum_allocations")}
                  </span>
                  <span className="text-zinc-900 dark:text-white font-medium">
                    {t("per_market") || "Per Market"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div ref={settingsRef}>
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="space-y-6"
          >
            <TabsList className="bg-zinc-100/80 dark:bg-zinc-800/50 p-1 rounded-lg backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50">
              <TabsTrigger
                value="followers"
                className="rounded-md px-6 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all"
              >
                <Users className="h-4 w-4 mr-2" />
                Followers
                {leaderProfile.followers &&
                  leaderProfile.followers.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {leaderProfile.followers.length}
                    </Badge>
                  )}
              </TabsTrigger>
              <TabsTrigger
                value="markets"
                className="rounded-md px-6 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all"
              >
                <Coins className="h-4 w-4 mr-2" />
                Markets
                {leaderMarkets.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {leaderMarkets.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                className="rounded-md px-6 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all"
              >
                <LineChart className="h-4 w-4 mr-2" />
                Performance
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-md px-6 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="followers" className="space-y-4">
              <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 overflow-hidden">
                <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-500/20">
                        <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      {tExt("active_followers")}
                    </CardTitle>
                    <Badge variant="outline" className="px-3">
                      {leaderProfile.totalFollowers} /{" "}
                      {leaderProfile.maxFollowers} spots
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {leaderProfile.followers &&
                  leaderProfile.followers.length > 0 ? (
                    <div className="space-y-3">
                      {leaderProfile.followers.map(
                        (follower: any, i: number) => (
                          <motion.div
                            key={follower.id || `follower-${i}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 hover:border-primary/30 transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-zinc-700">
                                <AvatarFallback className="bg-linear-to-br from-indigo-500/50 to-violet-600/50 text-white font-medium">
                                  {(
                                    follower.user?.firstName?.[0] || "A"
                                  ).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-zinc-900 dark:text-white">
                                  {follower.user?.firstName || "Anonymous"}{" "}
                                  {follower.user?.lastName || ""}
                                </div>
                                <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                  <Wallet className="h-3.5 w-3.5" />
                                  <span>
                                    {formatAllocation(
                                      follower.totalAllocatedValueUSDT || 0,
                                      "USDT"
                                    )}
                                  </span>
                                  <span className="text-zinc-300 dark:text-zinc-600">
                                    •
                                  </span>
                                  <span>
                                    {follower.allocations?.filter(a => a.isActive).length || 0} market{follower.allocations?.filter(a => a.isActive).length !== 1 ? 's' : ''}
                                  </span>
                                  <span className="text-zinc-300 dark:text-zinc-600">
                                    •
                                  </span>
                                  <span className="capitalize">
                                    {follower.copyMode
                                      .replace("_", " ")
                                      .toLowerCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge
                              className={`${
                                follower.status === "ACTIVE"
                                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0"
                                  : follower.status === "PAUSED"
                                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0"
                                    : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0"
                              }`}
                            >
                              {follower.status === "ACTIVE" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                              )}
                              {follower.status}
                            </Badge>
                          </motion.div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-24 h-24 mx-auto mb-6 bg-linear-to-br from-indigo-500/20 to-violet-500/20 rounded-3xl flex items-center justify-center"
                      >
                        <Users className="h-12 w-12 text-indigo-500" />
                      </motion.div>
                      <h3 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">
                        {tExt("no_followers_yet")}
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
                        {t("your_followers_will_appear_here_once")}{" "}
                        {t("keep_your_profile_public_and_maintain")}
                      </p>
                      <Button variant="outline" className="rounded-xl">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t("view_public_profile")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="markets" className="space-y-4">
              <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 overflow-hidden">
                <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/20">
                        <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      {t("trading_markets")}
                    </CardTitle>
                    <Badge variant="outline" className="px-3">
                      {leaderMarkets.filter((m) => m.isActive).length} of{" "}
                      {availableMarkets.length} enabled
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    {t("enable_markets_description") + ' ' + t("disable_market_refund_notice")}
                  </p>

                  {/* Available Markets Grid */}
                  {availableMarkets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableMarkets.map((market) => {
                        const symbol = `${market.currency}/${market.pair}`;
                        const isEnabled = isMarketEnabled(
                          market.currency,
                          market.pair
                        );
                        const isToggling = togglingMarket === symbol;
                        const followerCount = getMarketFollowerCount(
                          market.currency,
                          market.pair
                        );
                        const leaderMarket = getLeaderMarket(
                          market.currency,
                          market.pair
                        );

                        return (
                          <motion.div
                            key={market.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`relative p-4 rounded-2xl border-2 transition-all ${
                              isEnabled
                                ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/10"
                                : "border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    isEnabled
                                      ? "bg-emerald-500/20"
                                      : "bg-zinc-200 dark:bg-zinc-700"
                                  }`}
                                >
                                  <Coins
                                    className={`h-5 w-5 ${
                                      isEnabled
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-zinc-500"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <div className="font-semibold text-zinc-900 dark:text-white">
                                    {market.currency}/{market.pair}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span
                                      className={
                                        isEnabled
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : "text-zinc-500"
                                      }
                                    >
                                      {isEnabled ? "Enabled" : "Disabled"}
                                    </span>
                                    {isEnabled && followerCount > 0 && (
                                      <>
                                        <span className="text-zinc-300 dark:text-zinc-600">
                                          •
                                        </span>
                                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                          <Users className="h-3 w-3" />
                                          {followerCount} follower
                                          {followerCount !== 1 ? "s" : ""}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isToggling && (
                                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                                )}
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={(checked) =>
                                    handleToggleMarket(symbol, checked)
                                  }
                                  disabled={isToggling}
                                  className="data-[state=checked]:bg-emerald-500"
                                />
                              </div>
                            </div>

                            {/* Min Amounts Section - Only show for enabled markets */}
                            {isEnabled && leaderMarket && (
                              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                    {t("minimum_allocations")}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => handleOpenMarketSettings(leaderMarket)}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                    <div className="text-zinc-500 dark:text-zinc-400">
                                      Min {market.currency}
                                    </div>
                                    <div className="font-medium text-zinc-900 dark:text-white">
                                      {leaderMarket.minBase > 0
                                        ? leaderMarket.minBase
                                        : "Not set"}
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                    <div className="text-zinc-500 dark:text-zinc-400">
                                      Min {market.pair}
                                    </div>
                                    <div className="font-medium text-zinc-900 dark:text-white">
                                      {leaderMarket.minQuote > 0
                                        ? leaderMarket.minQuote
                                        : "Not set"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-16 h-16 mx-auto mb-4 bg-zinc-200 dark:bg-zinc-700 rounded-2xl flex items-center justify-center"
                      >
                        <Coins className="h-8 w-8 text-zinc-400" />
                      </motion.div>
                      <h4 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-white">
                        {tExt("no_markets_available")}
                      </h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                        {t("there_are_no_ecosystem_markets_available")}
                      </p>
                    </div>
                  )}

                  {leaderMarkets.filter((m) => m.isActive).length > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>{tExt("important")}</strong> {t("followers_can_only_copy_your_trades")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 overflow-hidden">
                <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-500/20">
                        <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      {tExt("performance_history")}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs"
                      >
                        7D
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs bg-primary/10 border-primary/30 text-primary"
                      >
                        30D
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs"
                      >
                        90D
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs"
                      >
                        All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-20">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-24 h-24 mx-auto mb-6 bg-linear-to-br from-blue-500/20 to-cyan-500/20 rounded-3xl flex items-center justify-center"
                    >
                      <BarChart3 className="h-12 w-12 text-blue-500" />
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">
                      {t("performance_charts_coming_soon")}
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                      {t("detailed_performance_analytics_and_charts_will")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 overflow-hidden">
                <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-700">
                      <Settings className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    {t("profile_settings")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Profile Visibility */}
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {tExt("profile_visibility")}
                      </span>
                      <Badge
                        variant={
                          leaderProfile.isPublic ? "default" : "secondary"
                        }
                      >
                        {leaderProfile.isPublic ? "Public" : "Hidden"}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                      {leaderProfile.isPublic
                        ? "Your profile is visible to all users"
                        : "Your profile is hidden from the leader board"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleVisibility}
                      className="w-full rounded-xl"
                    >
                      {leaderProfile.isPublic ? "Hide Profile" : "Make Public"}
                    </Button>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="settingsBio"
                      className="text-sm font-medium"
                    >
                      Bio
                    </Label>
                    <Textarea
                      id="settingsBio"
                      value={editForm.bio}
                      onChange={(e) =>
                        setEditForm({ ...editForm, bio: e.target.value })
                      }
                      placeholder={t(
                        "tell_followers_about_your_trading_strategy"
                      )}
                      rows={3}
                      maxLength={500}
                      className="rounded-xl resize-none"
                    />
                    <p className="text-xs text-zinc-500">
                      {editForm.bio.length}/500 characters
                    </p>
                  </div>

                  {/* Profit Share */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        {t("profit_share_commission")}
                      </Label>
                      <span className="text-2xl font-bold text-primary">
                        {editForm.profitSharePercent}%
                      </span>
                    </div>
                    <Slider
                      value={[editForm.profitSharePercent]}
                      onValueChange={([v]) =>
                        setEditForm({ ...editForm, profitSharePercent: v })
                      }
                      min={5}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>5% (More attractive)</span>
                      <span>50% ({t("higher_earnings")})</span>
                    </div>
                  </div>

                  {/* Max Followers (Min follow amount removed - now per-market) */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="settingsMaxFollowers"
                      className="text-sm font-medium"
                    >
                      {t("max_followers")}
                    </Label>
                    <Input
                      id="settingsMaxFollowers"
                      type="number"
                      min={1}
                      max={1000}
                      value={editForm.maxFollowers}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          maxFollowers: parseInt(e.target.value) || 0,
                        })
                      }
                      className="rounded-xl"
                    />
                    <p className="text-xs text-zinc-500">
                      {t("maximum_number_of_followers_allowed")}
                    </p>
                  </div>

                  {/* Info about per-market minimums */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      💡 {t("set_minimum_allocations_per_market_in_markets_tab") || "Set minimum allocation requirements for each market in the Markets tab after creating your profile."}
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                      onClick={handleUpdateProfile}
                      disabled={isSubmitting}
                      className="rounded-xl w-full md:w-auto"
                    >
                      {isSubmitting && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {tCommon("save_changes")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </div>
        </motion.div>

        {/* Edit Dialog - kept for potential future use but not triggered */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Edit className="h-5 w-5 text-primary" />
                </div>
                {t("edit_profile_settings")}
              </DialogTitle>
              <DialogDescription>
                {t("update_your_leader_profile_and_follower")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="editBio">Bio</Label>
                <Textarea
                  id="editBio"
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm({ ...editForm, bio: e.target.value })
                  }
                  placeholder={t("tell_followers_about_your_trading_strategy")}
                  rows={3}
                  maxLength={500}
                  className="rounded-xl resize-none"
                />
                <p className="text-xs text-zinc-500">
                  {editForm.bio.length}/500 characters
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t("profit_share_commission")}</Label>
                  <span className="text-2xl font-bold text-primary">
                    {editForm.profitSharePercent}%
                  </span>
                </div>
                <Slider
                  value={[editForm.profitSharePercent]}
                  onValueChange={([v]) =>
                    setEditForm({ ...editForm, profitSharePercent: v })
                  }
                  min={5}
                  max={50}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>5%</span>
                  <span>50% ({t("higher_earnings")})</span>
                </div>
              </div>

              {/* Note: Minimum follow amount removed - now set per-market in Markets tab */}
              <div className="space-y-2">
                <Label htmlFor="editMaxFollowers">{t("max_followers")}</Label>
                <Input
                  id="editMaxFollowers"
                  type="number"
                  min={1}
                  max={1000}
                  value={editForm.maxFollowers}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      maxFollowers: parseInt(e.target.value) || 0,
                    })
                  }
                  className="rounded-xl"
                />
                <p className="text-xs text-zinc-500">
                  {t("set_per_market_minimums_in_markets_tab") || "Set minimum allocations per market in the Markets tab"}
                </p>
              </div>
            </div>
            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateProfile}
                disabled={isSubmitting}
                className="rounded-xl"
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {tCommon("save_changes")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Market Settings Dialog */}
        <Dialog
          open={!!editingMarketSettings}
          onOpenChange={(open) => !open && setEditingMarketSettings(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/20">
                  <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                {tExtAdmin("market_settings")} {editingMarketSettings?.symbol}
              </DialogTitle>
              <DialogDescription>
                {t("set_minimum_allocation_amounts_for_followers")}
              </DialogDescription>
            </DialogHeader>
            {editingMarketSettings && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="minBase">
                    Minimum {editingMarketSettings.baseCurrency} Allocation
                  </Label>
                  <Input
                    id="minBase"
                    type="number"
                    min={0}
                    step="any"
                    value={editingMarketSettings.minBase}
                    onChange={(e) =>
                      setEditingMarketSettings({
                        ...editingMarketSettings,
                        minBase: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder={`Enter minimum ${editingMarketSettings.baseCurrency}`}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-zinc-500">
                    Minimum {editingMarketSettings.baseCurrency} {t("amount_a_follower_must_allocate")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minQuote">
                    Minimum {editingMarketSettings.quoteCurrency} Allocation
                  </Label>
                  <Input
                    id="minQuote"
                    type="number"
                    min={0}
                    step="any"
                    value={editingMarketSettings.minQuote}
                    onChange={(e) =>
                      setEditingMarketSettings({
                        ...editingMarketSettings,
                        minQuote: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder={`Enter minimum ${editingMarketSettings.quoteCurrency}`}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-zinc-500">
                    Minimum {editingMarketSettings.quoteCurrency} {t("amount_a_follower_must_allocate")}
                  </p>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>{tCommon("note")}: </strong> {t("setting_0_means_no_minimum_requirement")}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingMarketSettings(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveMarketSettings}
                disabled={isSavingMarketSettings}
                className="rounded-xl"
              >
                {isSavingMarketSettings && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {tCommon("save_settings")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog for Disabling Market with Followers */}
        <AlertDialog
          open={disableConfirmDialog.open}
          onOpenChange={(open) =>
            setDisableConfirmDialog((prev) => ({ ...prev, open }))
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t("disable_market_with_active_followers")}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  {t("you_are_about_to_disable")}{" "}
                  <strong>{disableConfirmDialog.symbol}</strong> {t("which_has")}{" "}
                  <strong>
                    {disableConfirmDialog.followerCount} {t("active_follower")}
                    {disableConfirmDialog.followerCount !== 1 ? "s" : ""}
                  </strong>
                  .
                </p>
                <p>
                  {t("disabling_this_market_will_automatically")}{" "}
                  <strong>{t("refund_all_follower_allocations")}</strong> {t("for_this_market")}
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  executeMarketToggle(disableConfirmDialog.symbol, false)
                }
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {togglingMarket === disableConfirmDialog.symbol ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {t("disable_refund")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
