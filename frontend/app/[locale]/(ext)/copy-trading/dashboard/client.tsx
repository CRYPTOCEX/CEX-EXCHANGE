"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { statusTone } from "@/lib/status-tone";
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
import { m } from "framer-motion";
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
  Info,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { formatPnL, formatAllocation } from "@/utils/currency";
import { useTranslations } from "next-intl";
import LeaderOnboarding from "./onboarding";
import { toLeaderProfile } from "./leader-profile-shape";
import { MoneyFigure } from "@/components/ui/money-figure";
import { Loadable } from "@/components/ui/skeleton";

/**
 * The page's decorative cross pattern, as a MASK.
 *
 * A `data:` URI SVG is a separate document and cannot resolve a page custom
 * property, so any `fill` baked into it is unreachable by the admin design
 * panel — this shape shipped twice, once as `%23000` and once as `%23fff`.
 * A mask only reads alpha, so the fill below is irrelevant and the colour comes
 * from an ordinary `backgroundColor` token on the host element.
 */
const CROSS_PATTERN =
  `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

interface LeaderMarket {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  minBase: number;
  minQuote: number;
  isActive: boolean;
  followerCount: number;
  marketType?: "SPOT" | "BINARY";
}

interface EcosystemMarket {
  id: string;
  currency: string;
  pair: string;
  metadata: any;
}

interface BinaryMarket {
  id: string;
  currency: string;
  pair: string;
  status?: boolean | string;
  isTrending?: boolean;
  isHot?: boolean;
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
  tradingType?: "SPOT" | "BINARY" | "BOTH";
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

/**
 * Compact platform volume, LABELLED WITH THE UNIT IT IS ACTUALLY IN.
 *
 * `/api/copy-trading/stats` returns `volumeCurrency` beside the figure and only
 * says "USD" when it had to convert — a platform whose leaders all settle in one
 * quote asset keeps that asset, deliberately, so the total survives an empty
 * rate table. This tile printed a hardcoded "$", so a USDT- or BTC-denominated
 * volume was published to every visitor as dollars.
 *
 * The whole-number compaction is also wrong below 1 for a crypto unit — 0.5 BTC
 * `toFixed(0)` is "1" — so a native figure keeps its decimals.
 */
function formatPlatformVolume(value: number, currency: string): string {
  const compact =
    value >= 1000000
      ? `${(value / 1000000).toFixed(1)}M`
      : value >= 1000
        ? `${(value / 1000).toFixed(0)}K`
        : currency === "USD"
          ? value.toFixed(0)
          : String(Number(value.toFixed(4)));
  return currency === "USD" ? `$${compact}` : `${compact} ${currency}`;
}

const tradingStyleInfo: Record<
  string,
  { icon: any; color: string; bg: string; label: string; gradient: string }
> = {
  SCALPING: {
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
    label: "Scalping",
    gradient: "bg-primary",
  },
  DAY_TRADING: {
    icon: BarChart3,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
    label: "Day Trading",
    gradient: "bg-primary",
  },
  SWING: {
    icon: TrendingUp,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
    label: "Swing",
    gradient: "from-primary to-success",
  },
  POSITION: {
    icon: Shield,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
    label: "Position",
    gradient: "bg-primary",
  },
};

/**
 * Risk rungs are a STATE — LOW/MEDIUM/HIGH resolve through the central
 * `STATUS_TONE` table, so only this module's wording stays local.
 */
const riskLevelLabel: Record<string, string> = {
  LOW: "Conservative",
  MEDIUM: "Moderate",
  HIGH: "Aggressive",
};

/**
 * The profile shape the dashboard renders BEFORE the fetch resolves.
 *
 * None of these values is ever painted — every one is behind a `Loadable` in
 * the tree below — so what this actually does is let the ONE dashboard layout
 * render in both states instead of the page keeping a second, hand-maintained
 * copy of itself as a skeleton.
 */
/** Follower rows / market tiles to reserve while the profile is in flight. */
const PENDING_FOLLOWER_ROWS = 3;
const PENDING_MARKET_TILES = 6;

const PENDING_LEADER_PROFILE: LeaderProfile = {
  id: "",
  displayName: "",
  tradingStyle: "DAY_TRADING",
  riskLevel: "MEDIUM",
  winRate: 0,
  roi: 0,
  totalFollowers: 0,
  totalTrades: 0,
  totalProfit: 0,
  totalVolume: 0,
  profitSharePercent: 0,
  minFollowAmount: 0,
  maxFollowers: 0,
  status: "ACTIVE",
  isPublic: true,
  createdAt: new Date().toISOString(),
  followers: [],
  markets: [],
  dailyStats: [],
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
    router.replace(`${pathname}${query ? `?${query}` : ""}`);
  };

  const [editForm, setEditForm] = useState<EditForm>({
    bio: "",
    profitSharePercent: 20,
    minFollowAmount: 100,
    maxFollowers: 100,
  });

  const [platformStats, setPlatformStats] = useState<{
    totalLeaders: number;
    totalVolume: number;
    /**
     * The unit `totalVolume` is in. `/api/copy-trading/stats` only converts to
     * USD when the platform's leaders do NOT share one quote asset, so this is
     * not always a dollar figure — the tile below used to print a literal "$"
     * in front of whatever came back.
     */
    volumeCurrency: string;
    /**
     * Denominations with no USD rate, left OUT of `totalVolume` rather than
     * folded in as zero. Non-empty means the figure is a LOWER BOUND.
     */
    unpricedCurrencies: string[];
    /** null means "no leader has closed a trade" — which is not 0%. */
    avgRoi: number | null;
  }>({
    totalLeaders: 0,
    totalVolume: 0,
    volumeCurrency: "USD",
    unpricedCurrencies: [],
    avgRoi: null,
  });

  // Markets management state
  const [availableMarkets, setAvailableMarkets] = useState<EcosystemMarket[]>(
    []
  );
  const [leaderMarkets, setLeaderMarkets] = useState<LeaderMarket[]>([]);
  const [binaryMarkets, setBinaryMarkets] = useState<BinaryMarket[]>([]);

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
              silent: true,
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
          const apiData = leaderResponse.data;
          const transformedProfile = toLeaderProfile(apiData);
          setLeaderProfile(transformedProfile);
          // Fetch leader's declared markets if they are a leader
          if (apiData?.id) {
            const { data: leaderMarketsData } = await $fetch({
              url: "/api/copy-trading/leader/market",
              method: "GET",
              silentSuccess: true,
            });
            if (leaderMarketsData?.markets) {
              setLeaderMarkets(leaderMarketsData.markets);
            } else if (Array.isArray(leaderMarketsData)) {
              setLeaderMarkets(leaderMarketsData);
            }
            // Fetch binary markets catalog when the leader offers binary copy trading
            const leaderTradingType = apiData?.tradingType || "SPOT";
            if (
              leaderTradingType === "BINARY" ||
              leaderTradingType === "BOTH"
            ) {
              const { data: binaryMarketsData } = await $fetch({
                url: "/api/exchange/binary/market",
                method: "GET",
                silent: true,
              });
              if (Array.isArray(binaryMarketsData)) {
                setBinaryMarkets(binaryMarketsData);
              } else if (Array.isArray(binaryMarketsData?.data)) {
                setBinaryMarkets(binaryMarketsData.data);
              }
            }
          }
          // Show onboarding for new leaders (less than 5 trades or no markets)
          const isNewLeader =
            transformedProfile.totalTrades < 5 &&
            transformedProfile.totalFollowers === 0 &&
            !localStorage.getItem(`leader-onboarding-dismissed-${transformedProfile.id}`);
          setShowOnboarding(isNewLeader);
        }

        if (statsResponse.data) {
          setPlatformStats({
            totalLeaders: statsResponse.data.totalLeaders || 0,
            totalVolume: statsResponse.data.totalVolume || 0,
            volumeCurrency: statsResponse.data.volumeCurrency || "USD",
            unpricedCurrencies: Array.isArray(
              statsResponse.data.unpricedCurrencies
            )
              ? statsResponse.data.unpricedCurrencies
              : [],
            // NOT `|| 0`: the backend sends null for "no leader has closed a
            // trade", and `||` would turn that unknown into a claim of 0%.
            avgRoi:
              typeof statsResponse.data.avgRoi === "number"
                ? statsResponse.data.avgRoi
                : null,
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

    if (!error && data) {
      // Same transform as the initial fetch — see `toLeaderProfile`. This path
      // runs after a profile edit, so a divergent copy here re-zeroes the cards.
      setLeaderProfile(toLeaderProfile(data));
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
      toast.success(t("profile_updated_successfully"));
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
        leaderProfile.isPublic ? t("profile_hidden") : t("profile_is_now_public")
      );
      refetchLeaderProfile();
    }
  };

  const [togglingMarket, setTogglingMarket] = useState<string | null>(null);
  // Performance chart time-range in days (0 = all-time)
  const [perfRange, setPerfRange] = useState<number>(30);
  const [disableConfirmDialog, setDisableConfirmDialog] = useState<{
    open: boolean;
    symbol: string;
    marketType: "SPOT" | "BINARY";
    followerCount: number;
  }>({ open: false, symbol: "", marketType: "SPOT", followerCount: 0 });

  // Market settings editing state
  const [editingMarketSettings, setEditingMarketSettings] = useState<{
    open: boolean;
    symbol: string;
    marketType: "SPOT" | "BINARY";
    baseCurrency: string;
    quoteCurrency: string;
    minBase: number;
    minQuote: number;
  } | null>(null);
  const [isSavingMarketSettings, setIsSavingMarketSettings] = useState(false);

  const handleToggleMarket = async (
    symbol: string,
    enable: boolean,
    marketType: "SPOT" | "BINARY" = "SPOT"
  ) => {
    // If disabling and has followers, show confirmation dialog
    if (!enable) {
      const market = leaderMarkets.find(
        (m) =>
          m.symbol === symbol && (m.marketType || "SPOT") === marketType
      );
      if (market && market.followerCount > 0) {
        setDisableConfirmDialog({
          open: true,
          symbol,
          marketType,
          followerCount: market.followerCount,
        });
        return;
      }
    }

    await executeMarketToggle(symbol, enable, marketType);
  };

  const executeMarketToggle = async (
    symbol: string,
    enable: boolean,
    marketType: "SPOT" | "BINARY" = "SPOT"
  ) => {
    setTogglingMarket(`${marketType}:${symbol}`);
    setDisableConfirmDialog({
      open: false,
      symbol: "",
      marketType: "SPOT",
      followerCount: 0,
    });

    const { data, error } = await $fetch({
      url: `/api/copy-trading/leader/market/${encodeURIComponent(symbol)}/toggle`,
      method: "PUT",
      body: { isActive: enable, marketType },
    });

    if (!error && data) {
      if (data.refundedAllocations > 0) {
        toast.success(
          t("market_disabled_follower_allocation_s_refunded", { symbol: String(symbol), refundedAllocations: String(data.refundedAllocations) })
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
      body:
        editingMarketSettings.marketType === "BINARY"
          ? {
              minQuote: editingMarketSettings.minQuote,
              marketType: "BINARY",
            }
          : {
              minBase: editingMarketSettings.minBase,
              minQuote: editingMarketSettings.minQuote,
              marketType: "SPOT",
            },
    });

    if (!error && data) {
      toast.success(t("market_settings_updated"));
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
    const [symbolBase, symbolQuote] = market.symbol.split("/");
    setEditingMarketSettings({
      open: true,
      symbol: market.symbol,
      marketType: market.marketType || "SPOT",
      baseCurrency: market.baseCurrency || symbolBase,
      quoteCurrency: market.quoteCurrency || symbolQuote,
      minBase: market.minBase || 0,
      minQuote: market.minQuote || 0,
    });
  };

  // Check if a market is enabled by the leader (per symbol + market type)
  const isMarketEnabled = (
    currency: string,
    pair: string,
    marketType: "SPOT" | "BINARY" = "SPOT"
  ) => {
    const symbol = `${currency}/${pair}`;
    return leaderMarkets.some(
      (m) =>
        m.symbol === symbol &&
        (m.marketType || "SPOT") === marketType &&
        m.isActive
    );
  };

  // Get follower count for a market (per symbol + market type)
  const getMarketFollowerCount = (
    currency: string,
    pair: string,
    marketType: "SPOT" | "BINARY" = "SPOT"
  ) => {
    const symbol = `${currency}/${pair}`;
    const market = leaderMarkets.find(
      (m) =>
        m.symbol === symbol && (m.marketType || "SPOT") === marketType
    );
    return market?.followerCount || 0;
  };

  // Get leader market data for a symbol (per symbol + market type)
  const getLeaderMarket = (
    currency: string,
    pair: string,
    marketType: "SPOT" | "BINARY" = "SPOT"
  ): LeaderMarket | undefined => {
    const symbol = `${currency}/${pair}`;
    return leaderMarkets.find(
      (m) =>
        m.symbol === symbol && (m.marketType || "SPOT") === marketType
    );
  };

  /*
    `if (isLoading) return <DashboardLoading/>` used to sit here — this route's
    own `loading.tsx`, re-rendered from inside the client, so a single
    navigation to /copy-trading/dashboard greyed the page out twice: once from
    Next during the transition, once from here.

    This route answers two questions at once — "are you a leader?" and "what are
    your numbers?" — and only the second is a value. The first decides WHICH
    layout renders, so the pending state has to commit to one of them: it
    commits to the dashboard, because that is what this route is (the
    apply-to-be-a-leader page below is the fallback for someone who has no
    dashboard yet), and because the route's `loading.tsx` is dashboard-shaped
    too, so the two now agree.

    `!leaderProfile` is therefore the RESOLVED "you are not a leader" answer and
    must not fire mid-fetch — unqualified it would flash the full marketing
    page at every existing leader before their dashboard arrived.
  */
  const profile = leaderProfile ?? PENDING_LEADER_PROFILE;
  /* Named, because the distinction IS the fix: "the request came back and you
     are not a leader", not "the request is still running". */
  const resolvedAsNonLeader = !isLoading && !leaderProfile;

  // Not a leader - show apply section with premium design
  if (resolvedAsNonLeader) {
    return (
      <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30 overflow-hidden">
        {/* Hero Section */}
        <div className="relative pt-28 pb-32">
          {/* Background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-warning/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
          </div>

          {/*
            Cross pattern. A `data:` URI is a SEPARATE DOCUMENT, so its `fill`
            can never read a page token — this one was `%23000`, a hard black no
            theme could reach. It is used as a MASK instead (a mask only reads
            alpha), and the colour is an ordinary `backgroundColor` token, which
            is how `components/sections/shared/InteractivePattern.tsx` solves the
            same problem.
          */}
          <div
            className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
            style={{
              maskImage: CROSS_PATTERN,
              WebkitMaskImage: CROSS_PATTERN,
              backgroundColor: "hsl(var(--foreground))",
            }}
          />

          <div className="container mx-auto relative">
            <m.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-4xl mx-auto"
            >
              {/* Floating badge */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Badge
                  variant="outline"
                  className="px-5 py-2.5 rounded-full mb-8 bg-warning/10 border-warning/30 backdrop-blur-sm"
                >
                  <Crown className="w-4 h-4 text-warning mr-2" />
                  <span className="text-sm font-semibold text-warning-ink">
                    {t("elite_leader_program")}
                  </span>
                </Badge>
              </m.div>

              <m.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8"
              >
                <span className="text-foreground">
                  {t("become_a")}
                </span>
                <br />
                <span className="bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {t("trading_legend")}
                </span>
              </m.h1>

              <m.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
              >
                {t("share_your_expertise_build_your_following")}
              </m.p>

              {/* Stats preview - Using real platform data */}
              <m.div
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
                    label: tExt("active_leaders"),
                  },
                  {
                    value: formatPlatformVolume(
                      platformStats.totalVolume,
                      platformStats.volumeCurrency
                    ),
                    label: tCommon("total_volume"),
                  },
                  {
                    // A dash, not "0%". null is "no leader has closed a trade",
                    // and the old `> 0` test additionally printed every NEGATIVE
                    // platform ROI as "0%" — a loss shown as flat.
                    value:
                      platformStats.avgRoi === null
                        ? "—"
                        : `${platformStats.avgRoi.toFixed(1)}%`,
                    label: t("avg_roi"),
                  },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-sm text-subtle-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </m.div>

              {/* The volume figure above is a LOWER BOUND whenever the backend
                  could not price a leader's quote asset: those amounts are left
                  out rather than folded in as zero, and without this line the
                  shortfall is invisible — a visitor reads an under-count as the
                  platform's whole volume. */}
              {platformStats.unpricedCurrencies.length > 0 && (
                <p className="mx-auto mb-12 flex w-fit items-center gap-1.5 text-[11px] text-warning-ink">
                  <Info className="h-3 w-3 shrink-0" />
                  {tExt("excludes_currencies_with_no_usd_rate", {
                    currencies: platformStats.unpricedCurrencies.join(", "),
                  })}
                </p>
              )}
            </m.div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="container mx-auto -mt-16 relative z-10">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
          >
            {[
              {
                icon: Users,
                title: t("build_your_empire"),
                description:
                  t("attract_thousands_of_traders_who_want"),
                gradient: "bg-primary",
                iconBg: "bg-primary",
                stats: "Up to 1000 followers",
              },
              {
                icon: DollarSign,
                title: t("earn_profit_share"),
                description:
                  t("set_your_commission_rate_5_50"),
                gradient: "bg-success",
                iconBg: "bg-success",
                stats: "5-50% commission",
              },
              {
                icon: Trophy,
                title: t("gain_recognition"),
                description:
                  t("climb_the_leaderboards_earn_badges_and"),
                gradient: "bg-warning",
                iconBg: "bg-warning",
                stats: "Verified status",
              },
            ].map((item, i) => (
              <m.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group"
              >
                <Card className="h-full border border-border bg-card overflow-hidden">
                  {/* Accent top border */}
                  <div className={`h-1.5 ${item.gradient}`} />

                  <CardContent className="p-8 relative">
                    {/* Icon */}
                    <m.div
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      className={`w-16 h-16 rounded-2xl ${item.iconBg} flex items-center justify-center mb-6 shadow-lg`}
                    >
                      <item.icon className="h-8 w-8 text-primary-foreground" />
                    </m.div>

                    <h3 className="font-bold text-xl mb-3 text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-subtle-foreground mb-4 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Stats badge */}
                    <Badge
                      variant="secondary"
                      className="bg-muted"
                    >
                      {item.stats}
                    </Badge>
                  </CardContent>
                </Card>
              </m.div>
            ))}
          </m.div>

          {/* Features grid */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="max-w-4xl mx-auto mb-20"
          >
            <div className="text-center mb-12">
              <Badge
                variant="outline"
                className="px-4 py-2 rounded-full mb-6 bg-primary/10 border-primary/20"
              >
                <Sparkles className="w-4 h-4 text-primary mr-2" />
                <span className="text-sm font-medium text-primary">
                  {t("premium_features")}
                </span>
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="text-foreground">
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
                <m.div
                  key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-muted dark:bg-muted/50 border border-border dark:border-border-strong/50 group cursor-default"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-all">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-medium text-muted-foreground">
                    {feature.text}
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </m.div>
              ))}
            </div>
          </m.div>

          {/* CTA Card */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="max-w-4xl mx-auto pb-20"
          >
            <div className="relative">
              <Card className="relative overflow-hidden border-0 bg-linear-to-r from-primary via-primary/70 to-primary bg-size-[200%_100%] animate-gradient-x">
                {/*
                  Same pattern, same fix as the hero above — the URI carried a
                  literal `%23fff` at 0.07. Masked, the colour is
                  `--primary-foreground`, which is the ink this warning/primary
                  band already pairs with below.
                */}
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    maskImage: CROSS_PATTERN,
                    WebkitMaskImage: CROSS_PATTERN,
                    backgroundColor: "hsl(var(--primary-foreground))",
                  }}
                />

                <CardContent className="relative p-10 md:p-16">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="text-center lg:text-left">
                      <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                        <Crown className="h-8 w-8 text-primary-foreground/90" />
                        <span className="text-primary-foreground/80 font-medium">
                          {t("start_your_journey")}
                        </span>
                      </div>
                      <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                        {t("ready_to_lead")}
                      </h3>
                      <p className="text-primary-foreground/80 max-w-lg text-lg">
                        {t("complete_your_application_now_and_start")}{" "}
                        {t("no_upfront_costs")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-4">
                      <Link href="/copy-trading/become-leader">
                        <Button
                          size="lg"
                          className="h-16 px-10 bg-card text-warning hover:bg-muted font-bold rounded-lg transition-all group text-lg"
                        >
                          <span className="flex items-center">
                            {t("apply_now")}
                            <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" />
                          </span>
                        </Button>
                      </Link>
                      <p className="text-primary-foreground/60 text-sm text-center">
                        Takes only 2 minutes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </m.div>
        </div>
      </div>
    );
  }

  // Leader dashboard with premium design
  const avatar = profile.avatar || profile.user?.avatar;
  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isPositiveRoi = profile.roi >= 0;
  const styleConfig =
    tradingStyleInfo[profile.tradingStyle] ||
    tradingStyleInfo.DAY_TRADING;
  // Unrecognised levels keep the old fallback to MEDIUM.
  const riskLevel = riskLevelLabel[profile.riskLevel]
    ? profile.riskLevel
    : "MEDIUM";
  const StyleIcon = styleConfig.icon;
  const spotsUsed =
    (profile.totalFollowers / profile.maxFollowers) * 100;
  const daysActive = Math.floor(
    (Date.now() - new Date(profile.createdAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const leaderTradingType = profile.tradingType || "SPOT";
  const showSpotSection =
    leaderTradingType === "SPOT" || leaderTradingType === "BOTH";
  const showBinarySection =
    leaderTradingType === "BINARY" || leaderTradingType === "BOTH";
  const enabledMarketsCount = leaderMarkets.filter(
    (m) =>
      m.isActive &&
      ((showSpotSection && (m.marketType || "SPOT") === "SPOT") ||
        (showBinarySection && m.marketType === "BINARY"))
  ).length;
  const totalAvailableMarketsCount =
    (showSpotSection ? availableMarkets.length : 0) +
    (showBinarySection ? binaryMarkets.length : 0);

  /**
   * `loading` skeletons the LABEL, not the pill: the chip's box and icon slot
   * are chrome, but the word inside it is a fact about the application, and a
   * pending profile must not assert "ACTIVE".
   */
  const getStatusBadge = (status: string, loading = false) => {
    const icon =
      status === "ACTIVE" ? (
        <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse" />
      ) : status === "PENDING" ? (
        <Clock className="h-3 w-3 mr-1.5" />
      ) : null;

    return (
      <StatusBadge
        status={status}
        icon={icon}
        // The only branch that was ever translated.
        label={
          loading ? (
            <Loadable loading placeholder="ACTIVE" />
          ) : status === "PENDING" ? (
            tCommon("pending_review")
          ) : undefined
        }
        className="px-3 py-1"
      />
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30 overflow-hidden">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden border-b border-border/50 pt-24 pb-8">
        {/* Background effects */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl" />

        <div className="container mx-auto relative">
          {/* Profile Header */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-12"
          >
            {/* Left side - Avatar and info */}
            <div className="flex items-center gap-6">
              <m.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="relative"
              >
                {/* Glow effect behind avatar */}
                <div
                  className={`absolute -inset-2 bg-linear-to-br ${styleConfig.gradient} rounded-3xl blur-xl opacity-40`}
                />

                {/* The Avatar element carries the box and the ring, so it
                    stays mounted in both states; Radix falls back when there is
                    no src, which is exactly the pending case. */}
                <Avatar className="h-24 w-24 md:h-28 md:w-28 ring-4 ring-card shadow-2xl relative">
                  <AvatarImage
                    src={isLoading ? undefined : avatar}
                    alt={profile.displayName}
                  />
                  <AvatarFallback
                    className={
                      isLoading
                        ? "animate-pulse bg-muted"
                        : `text-3xl bg-linear-to-br ${styleConfig.gradient} text-primary-foreground font-bold`
                    }
                  >
                    {isLoading ? null : initials}
                  </AvatarFallback>
                </Avatar>

                {/* Crown badge */}
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-warning rounded-xl flex items-center justify-center ring-4 ring-card shadow-lg"
                >
                  <Crown className="h-5 w-5 text-primary-foreground" />
                </m.div>
              </m.div>

              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    <Loadable loading={isLoading} placeholder={tExt("leader_name")}>
                      {profile.displayName}
                    </Loadable>
                  </h1>
                  {getStatusBadge(profile.status, isLoading)}
                </div>

                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <Badge
                    className={`${styleConfig.bg} ${styleConfig.color} border-0 px-3 py-1`}
                  >
                    <StyleIcon className="h-3.5 w-3.5 mr-1.5" />
                    <Loadable loading={isLoading} placeholder={tExt("day_trading")}>
                      {styleConfig.label}
                    </Loadable>
                  </Badge>
                  <Badge tone={statusTone(riskLevel)} className="px-3 py-1">
                    <Shield className="h-3.5 w-3.5 mr-1.5" />
                    <Loadable loading={isLoading} placeholder="Moderate">
                      {riskLevelLabel[riskLevel]}
                    </Loadable>{" "}
                    Risk
                  </Badge>
                  {!profile.isPublic && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                      <EyeOff className="h-3.5 w-3.5" />
                      Hidden
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-subtle-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <Loadable loading={isLoading} chars={3}>
                      {daysActive}
                    </Loadable>{" "}
                    {tCommon("days_active")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    ID{" "}
                    <Loadable loading={isLoading} chars={8}>
                      {profile.id.slice(0, 8)}
                    </Loadable>
                  </span>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <m.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3"
            >
              <Button
                variant="outline"
                onClick={handleToggleVisibility}
                className="gap-2 rounded-xl h-11 px-5 border-border"
              >
                {/* The button renders in both states — it is fixed-size chrome
                    in the header's action row — but its LABEL states whether the
                    profile is currently public, which is not known yet. A
                    pending profile must not say "Hide Profile" to someone whose
                    profile is already hidden. */}
                <EyeOff className={isLoading || profile.isPublic ? "h-4 w-4" : "hidden"} />
                <Eye className={!isLoading && !profile.isPublic ? "h-4 w-4" : "hidden"} />
                <Loadable loading={isLoading} placeholder={t("hide_profile")}>
                  {profile.isPublic ? t("hide_profile") : t("make_public")}
                </Loadable>
              </Button>
              <Link href={`/copy-trading/leader/${profile.id}`}>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-11 w-11 border-border"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </m.div>
          </m.div>

          {/* Key Metrics Cards */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {/* ROI Card */}
            <Card className="border border-border bg-card overflow-hidden">
              <div
                className={`h-1 ${isPositiveRoi ? "bg-success" : "bg-destructive"}`}
              />
              <CardContent className="p-5 h-[140px] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("total_roi")}
                  </span>
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm ${isPositiveRoi ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
                  >
                    {isPositiveRoi ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                  </span>
                </div>
                <div
                  className={`text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums ${isPositiveRoi ? "text-success" : "text-destructive"}`}
                >
                  <Loadable loading={isLoading} placeholder="+12.34%">
                    {`${isPositiveRoi ? "+" : ""}${profile.roi.toFixed(2)}%`}
                  </Loadable>
                </div>
                <div className="mt-auto text-[11px] text-subtle-foreground">
                  {t("all_time_performance")}
                </div>
              </CardContent>
            </Card>

            {/* Win Rate Card */}
            <Card className="border border-border bg-card overflow-hidden">
              <div className="h-1 bg-primary" />
              <CardContent className="p-5 h-[140px] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {tCommon("win_rate")}
                  </span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                    <Target className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                  <Loadable loading={isLoading} placeholder="67.5%">
                    {`${profile.winRate.toFixed(1)}%`}
                  </Loadable>
                </div>
                <div className="mt-auto">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <m.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(profile.winRate, 100)}%`,
                      }}
                      transition={{ delay: 0.5, duration: 1 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Followers Card */}
            <Card className="border border-border bg-card overflow-hidden">
              <div className="h-1 bg-primary" />
              <CardContent className="p-5 h-[140px] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Followers
                  </span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                  <Loadable loading={isLoading} chars={3}>
                    {profile.totalFollowers}
                  </Loadable>
                </div>
                <div className="mt-auto">
                  <div className="flex justify-between text-[11px] text-subtle-foreground mb-1.5">
                    <span>Capacity</span>
                    <span className="font-mono font-medium tabular-nums">
                      <Loadable loading={isLoading} placeholder="12/100">
                        {`${profile.totalFollowers}/${profile.maxFollowers}`}
                      </Loadable>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <m.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(spotsUsed, 100)}%` }}
                      transition={{ delay: 0.6, duration: 1 }}
                      className={`h-full rounded-full ${
                        spotsUsed > 90
                          ? "bg-destructive"
                          : spotsUsed > 70
                            ? "bg-warning"
                            : "bg-primary"
                      }`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Trades Card */}
            <Card className="border border-border bg-card overflow-hidden">
              <div className="h-1 bg-warning" />
              <CardContent className="p-5 h-[140px] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {tCommon("total_trades")}
                  </span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                  <Loadable loading={isLoading} chars={4}>
                    {profile.totalTrades.toLocaleString()}
                  </Loadable>
                </div>
                <div className="mt-auto text-[11px] text-subtle-foreground">
                  {t("executed_trades")}
                </div>
              </CardContent>
            </Card>
          </m.div>
        </div>
      </div>

      {/* Onboarding for new leaders - placed outside hero section */}
      {showOnboarding && (
        <div className="container mx-auto px-4 mt-8 mb-8">
          <LeaderOnboarding
            leaderProfile={{
              displayName: profile.displayName,
              totalTrades: profile.totalTrades,
              totalFollowers: profile.totalFollowers,
              markets: leaderMarkets,
              bio: profile.bio,
              isPublic: profile.isPublic,
            }}
            onDismiss={handleDismissOnboarding}
            onNavigateToTab={handleNavigateToTab}
          />
        </div>
      )}

      <div className="container mx-auto py-8">
        {/* Financial Overview */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          {/* Total Profit */}
          <Card className="border border-border bg-card overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {tCommon("total_profit")}
                  </p>
                  <div
                    className={`text-2xl font-semibold leading-tight tracking-tight ${profile.totalProfit >= 0 ? "text-up" : "text-down"}`}
                  >
                    <Loadable loading={isLoading} placeholder="+1,234.00 USDT">
                      <MoneyFigure
                        value={formatPnL(profile.totalProfit, "USDT").formatted}
                      />
                    </Loadable>
                  </div>
                </div>
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm ${profile.totalProfit >= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-subtle-foreground">
                    {t("all_time_earnings")}
                  </span>
                  <span className="text-muted-foreground font-medium">
                    <Loadable loading={isLoading} chars={4}>
                      {profile.totalTrades}
                    </Loadable>{" "}
                    trades
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Volume */}
          <Card className="border border-border bg-card overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {tCommon("total_volume")}
                  </p>
                  <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                    <Loadable loading={isLoading} placeholder="12,345.00 USDT">
                      <MoneyFigure
                        value={formatAllocation(profile.totalVolume, "USDT")}
                      />
                    </Loadable>
                  </div>
                </div>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                  <Wallet className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-subtle-foreground">
                    {t("avg_per_trade")}
                  </span>
                  <span className="text-foreground font-medium">
                    <Loadable loading={isLoading} placeholder="123.00 USDT">
                      <MoneyFigure
                        value={formatAllocation(
                          profile.totalVolume /
                            Math.max(profile.totalTrades, 1),
                          "USDT"
                        )}
                      />
                    </Loadable>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profit Share Settings */}
          <Card className="border border-border bg-card overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {tCommon("profit_share")}
                  </p>
                  <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                    <Loadable loading={isLoading} placeholder="20%">
                      {`${profile.profitSharePercent}%`}
                    </Loadable>
                  </div>
                </div>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                  <Percent className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-subtle-foreground">
                    {t("minimum_allocations")}
                  </span>
                  <span className="text-foreground font-medium">
                    {t("per_market") || t("per_market")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* Tabs Section */}
        <m.div
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
            <TabsList className="bg-muted/80 dark:bg-muted/50 p-1 rounded-lg backdrop-blur-sm border border-border/50 dark:border-border-strong/50">
              <TabsTrigger
                value="followers"
                className="rounded-lg px-6 py-1.5 data-[state=active]:bg-card dark:data-[state=active]:bg-muted transition-all"
              >
                <Users className="h-4 w-4 mr-2" />
                Followers
                {profile.followers &&
                  profile.followers.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {profile.followers.length}
                    </Badge>
                  )}
              </TabsTrigger>
              <TabsTrigger
                value="markets"
                className="rounded-lg px-6 py-1.5 data-[state=active]:bg-card dark:data-[state=active]:bg-muted transition-all"
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
                className="rounded-lg px-6 py-1.5 data-[state=active]:bg-card dark:data-[state=active]:bg-muted transition-all"
              >
                <LineChart className="h-4 w-4 mr-2" />
                Performance
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-lg px-6 py-1.5 data-[state=active]:bg-card dark:data-[state=active]:bg-muted transition-all"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="followers" className="space-y-4">
              <Card className="border border-border bg-card overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/50 dark:bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                        <Users className="h-3.5 w-3.5" />
                      </span>
                      {tExt("active_followers")}
                    </CardTitle>
                    <Badge variant="outline" className="px-3">
                      <Loadable loading={isLoading} placeholder="12 / 100">
                        {`${profile.totalFollowers} / ${profile.maxFollowers}`}
                      </Loadable>{" "}
                      spots
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* LOADING IS NOT EMPTY. `followers` is absent for the whole
                      fetch, so an unqualified check showed a `py-20` panel
                      reading "No followers yet — your followers will appear
                      here once..." to leaders who have followers, on every
                      visit, and then replaced it with the list. */}
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: PENDING_FOLLOWER_ROWS }, (_, i) => (
                        <div
                          key={`pending-follower-${i}`}
                          className="flex items-center justify-between p-4 bg-muted dark:bg-muted/50 rounded-2xl border border-border dark:border-border-strong/50"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 ring-2 ring-card">
                              <AvatarFallback className="animate-pulse bg-muted" />
                            </Avatar>
                            <div>
                              <div className="font-semibold text-foreground">
                                <Loadable loading placeholder={t("follower_name")} />
                              </div>
                              <div className="text-sm text-subtle-foreground flex items-center gap-2">
                                <Wallet className="h-3.5 w-3.5" />
                                <span>
                                  <Loadable loading placeholder="1,234.00 USDT" />
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span>
                                  <Loadable loading chars={1} /> markets
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span>
                                  <Loadable loading placeholder="proportional" />
                                </span>
                              </div>
                            </div>
                          </div>
                          <StatusBadge
                            status="ACTIVE"
                            label={<Loadable loading placeholder="ACTIVE" />}
                          />
                        </div>
                      ))}
                    </div>
                  ) : profile.followers &&
                  profile.followers.length > 0 ? (
                    <div className="space-y-3">
                      {profile.followers.map(
                        (follower: any, i: number) => (
                          <m.div
                            key={follower.id || `follower-${i}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between p-4 bg-muted dark:bg-muted/50 rounded-2xl border border-border dark:border-border-strong/50 hover:border-primary/30 transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 ring-2 ring-card">
                                <AvatarFallback className="bg-primary/50 text-primary-foreground font-medium">
                                  {(
                                    follower.user?.firstName?.[0] || "A"
                                  ).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-foreground">
                                  {follower.user?.firstName || tCommon("anonymous")}{" "}
                                  {follower.user?.lastName || ""}
                                </div>
                                <div className="text-sm text-subtle-foreground flex items-center gap-2">
                                  <Wallet className="h-3.5 w-3.5" />
                                  <span>
                                    <MoneyFigure
                                      value={formatAllocation(
                                        follower.totalAllocatedValueUSDT || 0,
                                        "USDT"
                                      )}
                                    />
                                  </span>
                                  <span className="text-muted-foreground">
                                    •
                                  </span>
                                  <span>
                                    {follower.allocations?.filter(a => a.isActive).length || 0} market{follower.allocations?.filter(a => a.isActive).length !== 1 ? 's' : ''}
                                  </span>
                                  <span className="text-muted-foreground">
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
                            <StatusBadge
                              status={follower.status}
                              icon={
                                follower.status === "ACTIVE" ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                                ) : null
                              }
                            />
                          </m.div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <m.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-20 h-20 mx-auto mb-6 bg-surface-3 rounded-lg flex items-center justify-center"
                      >
                        <Users className="h-10 w-10 text-muted-foreground" />
                      </m.div>
                      <h3 className="text-2xl font-semibold mb-3 text-foreground">
                        {tExt("no_followers_yet")}
                      </h3>
                      <p className="text-subtle-foreground max-w-md mx-auto mb-6">
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
              <Card className="border border-border bg-card overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/50 dark:bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                        <Coins className="h-3.5 w-3.5" />
                      </span>
                      {t("trading_markets")}
                    </CardTitle>
                    <Badge variant="outline" className="px-3">
                      <Loadable loading={isLoading} placeholder="3 of 12">
                        {t("of", { enabledMarketsCount: String(enabledMarketsCount), totalAvailableMarketsCount: String(totalAvailableMarketsCount) })}
                      </Loadable>{" "}
                      enabled
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-subtle-foreground mb-6">
                    {t("enable_markets_description") + ' ' + t("disable_market_refund_notice")}
                  </p>

                  {/* Spot Markets Grid */}
                  {showSpotSection && (
                  <div className={showBinarySection ? "mb-8" : undefined}>
                  {leaderTradingType === "BOTH" && (
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Coins className="h-4 w-4 text-warning" />
                      {t("spot_markets")}
                    </h4>
                  )}
                  {/* LOADING IS NOT EMPTY. The catalogue is `[]` for the whole
                      fetch, so an unqualified check dropped a dashed
                      "No markets available — there are no ecosystem markets
                      available" panel into the tab on every visit, and then
                      replaced it with the grid. */}
                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: PENDING_MARKET_TILES }, (_, i) => (
                        <div
                          key={`pending-spot-market-${i}`}
                          className="p-4 rounded-lg border border-border bg-card"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground">
                                <Loadable loading placeholder="BTC/USDT" />
                              </div>
                              <div className="text-xs text-subtle-foreground mt-1">
                                <Loadable loading chars={2} /> followers
                              </div>
                            </div>
                            <div className="h-6 w-11 shrink-0 rounded-full bg-surface-3 animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : availableMarkets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableMarkets.map((market) => {
                        const symbol = `${market.currency}/${market.pair}`;
                        const isEnabled = isMarketEnabled(
                          market.currency,
                          market.pair,
                          "SPOT"
                        );
                        const isToggling =
                          togglingMarket === `SPOT:${symbol}`;
                        const followerCount = getMarketFollowerCount(
                          market.currency,
                          market.pair,
                          "SPOT"
                        );
                        const leaderMarket = getLeaderMarket(
                          market.currency,
                          market.pair,
                          "SPOT"
                        );

                        return (
                          <m.div
                            key={market.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`relative p-4 rounded-2xl border-2 transition-all ${
                              isEnabled
                                ? "border-success/50 bg-success/50 dark:bg-success/10"
                                : "border-border bg-muted/50 dark:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    isEnabled
                                      ? "bg-success/20"
                                      : "bg-muted"
                                  }`}
                                >
                                  <Coins
                                    className={`h-5 w-5 ${
                                      isEnabled
                                        ? "text-success"
                                        : "text-subtle-foreground"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground flex items-center gap-2">
                                    {market.currency}/{market.pair}
                                    {leaderTradingType === "BOTH" && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        Spot
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span
                                      className={
                                        isEnabled
                                          ? "text-success"
                                          : "text-subtle-foreground"
                                      }
                                    >
                                      {isEnabled ? tCommon("enabled") : tCommon("disabled")}
                                    </span>
                                    {isEnabled && followerCount > 0 && (
                                      <>
                                        <span className="text-muted-foreground">
                                          •
                                        </span>
                                        <span className="flex items-center gap-1 text-primary">
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
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={(checked) =>
                                    handleToggleMarket(symbol, checked, "SPOT")
                                  }
                                  disabled={isToggling}
                                  className="data-[state=checked]:bg-success"
                                />
                              </div>
                            </div>

                            {/* Min Amounts Section - Only show for enabled markets */}
                            {isEnabled && leaderMarket && (
                              <div className="pt-3 border-t border-border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-subtle-foreground">
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
                                  <div className="p-2 rounded-lg bg-muted">
                                    <div className="text-subtle-foreground">
                                      Min {market.currency}
                                    </div>
                                    <div
                                      className={`font-medium text-foreground${
                                        leaderMarket.minBase > 0
                                          ? " font-mono tabular-nums"
                                          : ""
                                      }`}
                                    >
                                      {leaderMarket.minBase > 0
                                        ? parseFloat(Number(leaderMarket.minBase).toPrecision(8))
                                        : tCommon("not_set")}
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-lg bg-muted">
                                    <div className="text-subtle-foreground">
                                      Min {market.pair}
                                    </div>
                                    <div
                                      className={`font-medium text-foreground${
                                        leaderMarket.minQuote > 0
                                          ? " font-mono tabular-nums"
                                          : ""
                                      }`}
                                    >
                                      {leaderMarket.minQuote > 0
                                        ? parseFloat(Number(leaderMarket.minQuote).toPrecision(8))
                                        : tCommon("not_set")}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </m.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                      <m.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-16 h-16 mx-auto mb-4 bg-muted rounded-2xl flex items-center justify-center"
                      >
                        <Coins className="h-8 w-8 text-muted-foreground" />
                      </m.div>
                      <h4 className="text-lg font-semibold mb-2 text-foreground">
                        {tExt("no_markets_available")}
                      </h4>
                      <p className="text-sm text-subtle-foreground max-w-sm mx-auto">
                        {t("there_are_no_ecosystem_markets_available")}
                      </p>
                    </div>
                  )}
                  </div>
                  )}

                  {/* Binary Markets Grid */}
                  {showBinarySection && (
                  <div>
                  {leaderTradingType === "BOTH" && (
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      {tCommon("binary_markets")}
                    </h4>
                  )}
                  {/* LOADING IS NOT EMPTY. The catalogue is `[]` for the whole
                      fetch, so an unqualified check dropped a dashed
                      "No markets available — there are no ecosystem markets
                      available" panel into the tab on every visit, and then
                      replaced it with the grid. */}
                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: PENDING_MARKET_TILES }, (_, i) => (
                        <div
                          key={`pending-binary-market-${i}`}
                          className="p-4 rounded-lg border border-border bg-card"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground">
                                <Loadable loading placeholder="BTC/USDT" />
                              </div>
                              <div className="text-xs text-subtle-foreground mt-1">
                                <Loadable loading chars={2} /> followers
                              </div>
                            </div>
                            <div className="h-6 w-11 shrink-0 rounded-full bg-surface-3 animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : binaryMarkets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {binaryMarkets.map((market) => {
                        const symbol = `${market.currency}/${market.pair}`;
                        const isEnabled = isMarketEnabled(
                          market.currency,
                          market.pair,
                          "BINARY"
                        );
                        const isToggling =
                          togglingMarket === `BINARY:${symbol}`;
                        const followerCount = getMarketFollowerCount(
                          market.currency,
                          market.pair,
                          "BINARY"
                        );
                        const leaderMarket = getLeaderMarket(
                          market.currency,
                          market.pair,
                          "BINARY"
                        );

                        return (
                          <m.div
                            key={market.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`relative p-4 rounded-2xl border-2 transition-all ${
                              isEnabled
                                ? "border-success/50 bg-success/50 dark:bg-success/10"
                                : "border-border bg-muted/50 dark:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    isEnabled
                                      ? "bg-success/20"
                                      : "bg-muted"
                                  }`}
                                >
                                  <Zap
                                    className={`h-5 w-5 ${
                                      isEnabled
                                        ? "text-success"
                                        : "text-subtle-foreground"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground flex items-center gap-2">
                                    {market.currency}/{market.pair}
                                    {leaderTradingType === "BOTH" && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        Binary
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span
                                      className={
                                        isEnabled
                                          ? "text-success"
                                          : "text-subtle-foreground"
                                      }
                                    >
                                      {isEnabled ? tCommon("enabled") : tCommon("disabled")}
                                    </span>
                                    {isEnabled && followerCount > 0 && (
                                      <>
                                        <span className="text-muted-foreground">
                                          •
                                        </span>
                                        <span className="flex items-center gap-1 text-primary">
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
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={(checked) =>
                                    handleToggleMarket(
                                      symbol,
                                      checked,
                                      "BINARY"
                                    )
                                  }
                                  disabled={isToggling}
                                  className="data-[state=checked]:bg-success"
                                />
                              </div>
                            </div>

                            {/* Min Stake Section - Only show for enabled markets */}
                            {isEnabled && leaderMarket && (
                              <div className="pt-3 border-t border-border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-subtle-foreground">
                                    {tExt("minimum_stake")}
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
                                <div className="grid grid-cols-1 gap-2 text-xs">
                                  <div className="p-2 rounded-lg bg-muted">
                                    <div className="text-subtle-foreground">
                                      Min Stake ({market.pair})
                                    </div>
                                    <div
                                      className={`font-medium text-foreground${
                                        leaderMarket.minQuote > 0
                                          ? " font-mono tabular-nums"
                                          : ""
                                      }`}
                                    >
                                      {leaderMarket.minQuote > 0
                                        ? parseFloat(Number(leaderMarket.minQuote).toPrecision(8))
                                        : tCommon("not_set")}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </m.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                      <m.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-16 h-16 mx-auto mb-4 bg-muted rounded-2xl flex items-center justify-center"
                      >
                        <Zap className="h-8 w-8 text-muted-foreground" />
                      </m.div>
                      <h4 className="text-lg font-semibold mb-2 text-foreground">
                        {tExt("no_markets_available")}
                      </h4>
                      <p className="text-sm text-subtle-foreground max-w-sm mx-auto">
                        {t("there_are_no_binary_markets_available_to_enable")}
                      </p>
                    </div>
                  )}
                  </div>
                  )}

                  {leaderMarkets.filter((m) => m.isActive).length > 0 && (
                    <div className="mt-6 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 dark:border-primary/20">
                      <p className="text-sm text-primary">
                        <strong>{tExt("important")}</strong> {t("followers_can_only_copy_your_trades")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <Card className="border border-border bg-card overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/50 dark:bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                        <LineChart className="h-3.5 w-3.5" />
                      </span>
                      {tExt("performance_history")}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {[
                        { label: "7D", days: 7 },
                        { label: "30D", days: 30 },
                        { label: "90D", days: 90 },
                        { label: tCommon("all"), days: 0 },
                      ].map((r) => (
                        <Button
                          key={r.label}
                          variant="outline"
                          size="sm"
                          onClick={() => setPerfRange(r.days)}
                          className={`rounded-lg text-xs ${
                            perfRange === r.days
                              ? "bg-primary/10 border-primary/30 text-primary-ink"
                              : ""
                          }`}
                        >
                          {r.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* LOADING IS NOT EMPTY. `dailyStats` is absent for the whole
                      fetch, so an unqualified check told an established leader
                      "Your daily performance will appear here as you trade"
                      before their own history arrived. The pending shape is the
                      plot's own box, which is what the chart will fill. */}
                  {isLoading ? (
                    <div className="h-64 animate-pulse rounded-lg bg-muted" />
                  ) : profile?.dailyStats && profile.dailyStats.length > 0
                    ? (() => {
                        // Cumulative daily profit (USDT) for the selected range,
                        // drawn from the leader's stored daily stats.
                        const sorted = [...profile.dailyStats].sort(
                          (a: any, b: any) =>
                            String(a.date).localeCompare(String(b.date))
                        );
                        const windowed =
                          perfRange > 0 ? sorted.slice(-perfRange) : sorted;
                        let cum = 0;
                        const points = windowed.map((d: any) => {
                          cum += Number(d.profit) || 0;
                          return { date: d.date, cumulative: cum };
                        });
                        if (points.length === 0) {
                          return (
                            <div className="text-center py-20 text-subtle-foreground">
                              {tExt("performance_history")}
                            </div>
                          );
                        }
                        const maxAbs = Math.max(
                          1,
                          ...points.map((p) => Math.abs(p.cumulative))
                        );
                        return (
                          <div>
                            <div className="flex items-end justify-between h-56 gap-1 px-2">
                              {points.map((item, idx) => {
                                const height =
                                  (Math.abs(item.cumulative) / maxAbs) * 100;
                                const isPositive = item.cumulative >= 0;
                                return (
                                  <div
                                    key={idx}
                                    className="flex-1 flex flex-col items-center justify-end group cursor-pointer"
                                    title={`${item.date}: ${item.cumulative.toFixed(2)} USDT`}
                                  >
                                    <div
                                      className={`w-full rounded-t transition-all group-hover:opacity-80 ${
                                        isPositive
                                          ? "bg-success"
                                          : "bg-destructive"
                                      }`}
                                      style={{
                                        height: `${Math.max(height, 4)}%`,
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between mt-4 text-xs text-muted-foreground px-2">
                              <span>{points[0]?.date}</span>
                              <span>{points[points.length - 1]?.date}</span>
                            </div>
                          </div>
                        );
                      })()
                    : (
                      <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 bg-surface-3 rounded-lg flex items-center justify-center">
                          <BarChart3 className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-2xl font-semibold mb-3 text-foreground">
                          {tExt("performance_history")}
                        </h3>
                        <p className="text-subtle-foreground max-w-md mx-auto">
                          {t("your_daily_performance_will_appear_here")}
                        </p>
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="border border-border bg-card overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/50 dark:bg-muted/30">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                      <Settings className="h-3.5 w-3.5" />
                    </span>
                    {t("profile_settings")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Visibility */}
                  <div className="p-4 bg-muted dark:bg-muted/50 rounded-2xl border border-border dark:border-border-strong/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-subtle-foreground">
                        {tExt("profile_visibility")}
                      </span>
                      <Badge
                        variant={
                          profile.isPublic ? "default" : "secondary"
                        }
                      >
                        <Loadable loading={isLoading} placeholder="Public">
                          {profile.isPublic ? tCommon("public") : tCommon("hidden")}
                        </Loadable>
                      </Badge>
                    </div>
                    <p className="text-xs text-subtle-foreground mb-3">
                      {profile.isPublic
                        ? t("your_profile_is_visible_to_all_users")
                        : t("your_profile_is_hidden_from_the_leader_board")}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleVisibility}
                      className="w-full rounded-xl"
                    >
                      {profile.isPublic ? t("hide_profile") : t("make_public")}
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
                      placeholder={`${t(
                        "tell_followers_about_your_trading_strategy"
                      )}…`}
                      rows={3}
                      maxLength={500}
                      className="rounded-xl resize-none"
                    />
                    <p className="text-xs text-subtle-foreground">
                      {editForm.bio.length}/500 characters
                    </p>
                  </div>

                  {/* Profit Share */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        {t("profit_share_commission")}
                      </Label>
                      <span className="text-2xl font-semibold leading-tight tracking-tight text-primary font-mono tabular-nums">
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
                    <div className="flex justify-between text-xs text-subtle-foreground">
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
                    <p className="text-xs text-subtle-foreground">
                      {t("maximum_number_of_followers_allowed")}
                    </p>
                  </div>

                  {/* Info about per-market minimums */}
                  <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 dark:border-primary/20">
                    <p className="text-sm text-primary">
                      💡 {t("set_minimum_allocations_per_market_in_markets_tab") || t("set_minimum_allocation_requirements_for_each")}
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4 border-t border-border">
                    <Button
                      onClick={handleUpdateProfile}
                      loading={isSubmitting}
                      className="rounded-xl w-full md:w-auto"
                    >
                      {tCommon("save_changes")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </div>
        </m.div>

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
                  placeholder={`${t("tell_followers_about_your_trading_strategy")}…`}
                  rows={3}
                  maxLength={500}
                  className="rounded-xl resize-none"
                />
                <p className="text-xs text-subtle-foreground">
                  {editForm.bio.length}/500 characters
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t("profit_share_commission")}</Label>
                  <span className="text-2xl font-semibold leading-tight tracking-tight text-primary font-mono tabular-nums">
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
                <div className="flex justify-between text-xs text-subtle-foreground">
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
                <p className="text-xs text-subtle-foreground">
                  {t("set_per_market_minimums_in_markets_tab") || t("set_minimum_allocations_per_market_in")}
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
                loading={isSubmitting}
                className="rounded-xl"
              >
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
                <div className="p-2 rounded-xl bg-warning/10 dark:bg-warning/20">
                  <Coins className="h-5 w-5 text-warning" />
                </div>
                {tExtAdmin("market_settings")} {editingMarketSettings?.symbol}
              </DialogTitle>
              <DialogDescription>
                {t("set_minimum_allocation_amounts_for_followers")}
              </DialogDescription>
            </DialogHeader>
            {editingMarketSettings && (
              <div className="space-y-4 py-4">
                {editingMarketSettings.marketType === "BINARY" ? (
                  <div className="space-y-2">
                    <Label htmlFor="minStake">
                      Minimum stake ({editingMarketSettings.quoteCurrency})
                    </Label>
                    <Input
                      id="minStake"
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
                      placeholder={t("enter_minimum_stake", { quoteCurrency: String(editingMarketSettings.quoteCurrency) })}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-subtle-foreground">
                      Minimum {editingMarketSettings.quoteCurrency} {t("amount_a_follower_must_allocate")}
                    </p>
                  </div>
                ) : (
                  <>
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
                        placeholder={t("enter_minimum", { baseCurrency: String(editingMarketSettings.baseCurrency) })}
                        className="rounded-xl"
                      />
                      <p className="text-xs text-subtle-foreground">
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
                        placeholder={t("enter_minimum", { quoteCurrency: String(editingMarketSettings.quoteCurrency) })}
                        className="rounded-xl"
                      />
                      <p className="text-xs text-subtle-foreground">
                        Minimum {editingMarketSettings.quoteCurrency} {t("amount_a_follower_must_allocate")}
                      </p>
                    </div>
                  </>
                )}

                <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 dark:border-primary/20">
                  <p className="text-xs text-primary">
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
                loading={isSavingMarketSettings}
                className="rounded-xl"
              >
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
                <AlertTriangle className="h-5 w-5 text-warning" />
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
                  executeMarketToggle(
                    disableConfirmDialog.symbol,
                    false,
                    disableConfirmDialog.marketType
                  )
                }
                className="bg-destructive hover:bg-destructive text-destructive-foreground"
              >
                {togglingMarket ===
                `${disableConfirmDialog.marketType}:${disableConfirmDialog.symbol}` ? (
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
