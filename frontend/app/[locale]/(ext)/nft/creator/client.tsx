"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { m, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
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
  MessageCircle,
  Rocket,
  AlertCircle,
  CheckCircle2,
  Copy,
  Sparkles,
  Award,
  Flame,
  Heart,
} from "lucide-react";
import { Twitter, Instagram } from "@/components/ui/brand-icons";
import Image from "next/image";
import { useUserStore } from "@/store/user";
import { $fetch } from "@/lib/api";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { AuthModal } from "@/components/auth/auth-modal";
import { CreatorOnboarding } from "@/app/[locale]/(ext)/nft/components/shared/creator-onboarding";
import { DeployCollectionModal } from "@/app/[locale]/(ext)/nft/components/shared/deploy-collection-modal";
import { toast } from "sonner";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import {
  ChainBadge,
  CurrencyIcon,
} from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import { CollectionAvatar } from "@/app/[locale]/(ext)/nft/components/shared/collection-avatar";

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

/**
 * PENDING ROW for the "Recent Sales" / "Top NFTs" lists.
 *
 * Same markup as a real row — same `p-3`, same 56px thumbnail, same two-line
 * text column — so the card's body height is produced by the same box model in
 * both states. It is NOT a `<Skeleton className="h-20"/>`: a row is 56px of
 * thumbnail plus 24px of padding, and any hand-typed height is a guess that
 * stops tracking the row the first time somebody changes the padding.
 */
function PendingListRow() {
  const t = useTranslations("ext_nft");
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl">
      <SkeletonBlock className="w-14 h-14 rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">
          <SkeletonText placeholder={t("pending_token_name")} />
        </p>
        <p className="text-xs text-muted-foreground">
          <SkeletonText placeholder="00/00/0000" />
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground">
          <SkeletonText placeholder="0.000" />
        </p>
      </div>
    </div>
  );
}

/**
 * PENDING CARD for the collections / NFTs grids.
 *
 * A grid has no knowable length, so the honest reservation is the CONTAINER
 * (which is already the real `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
 * grid) plus a fixed number of children. Only the child count settles when the
 * data lands; the column count, the gutters and the card frame never move.
 *
 * `media` mirrors the two shapes the real cards use: collections lead with a
 * 160px banner, tokens with a square. Passing the real class string rather than
 * inventing a height is the whole point of `SkeletonBlock`.
 */
function PendingGridCard({ media }: { media: "banner" | "square" }) {
  const t = useTranslations("ext_nft");
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <SkeletonBlock
        className={cn(
          "w-full rounded-none",
          media === "banner" ? "h-40" : "aspect-square"
        )}
      />
      <div className="p-5">
        <h3 className="font-bold text-lg mb-1 truncate">
          <SkeletonText placeholder={t("pending_collection")} />
        </h3>
        <p className="text-xs text-muted-foreground mb-4 font-medium">
          <SkeletonText placeholder="SYMBOL" />
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-4 border-b">
          <SkeletonText placeholder="000" className="font-mono tabular-nums" />
          <SkeletonText placeholder="ERC721" />
        </div>
        <SkeletonBlock className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
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
  /**
   * The FETCH failed — which is not the same thing as "there is no data yet".
   *
   * This page used to decide it had failed by testing `!dashboardData`, and
   * that test is true for the entire pending window as well. It only looked
   * right because a full-viewport spinner returned above it and hid the page
   * until the fetch settled. With the spinner gone the two states have to be
   * told apart explicitly, or the first paint of every visit is the words
   * "Failed to load dashboard".
   */
  const [loadError, setLoadError] = useState(false);
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
      setLoadError(true);
    } else {
      setLoadError(false);
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
      toast.error(t("dashboard_data_not_loaded"));
      return;
    }

    const collection = dashboardData.collections.find((c: any) => c.id === collectionId);
    if (!collection) {
      toast.error(t("collection_not_found"));
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
    toast.success(tCommon("copied_to_clipboard"));
  };

  /*
    THE SPINNER THAT USED TO BE HERE
    ================================
    `if (loading) return <div className="min-h-screen ..."><LoadingSpinner/></div>`
    threw the entire dashboard away for the duration of three parallel fetches
    and put a centred 40px spinner on a full-viewport ground in its place. Every
    pixel of the page below — a 320px hero with a 96px avatar, a four-up stat
    row, two summary cards, a tab bar and a grid — arrived as shift, and the
    document height went from one viewport to several thousand pixels in one
    frame, so the scrollbar appeared and the whole thing reflowed again.

    None of that layout depends on the response. The hero, the tab bar, the card
    frames and every label are knowable before the request is sent; only the
    figures inside them are not. So the page renders, and `loading` is threaded
    down to the VALUES.

    The `!user` gate below is now `!loading && !user` on purpose. `user` is
    populated by an effect in the root provider, so it is null on the first
    client render even for a signed-in user — the old spinner was what covered
    that window, and without the extra condition a logged-in creator would see
    the "please sign in" prompt flash before their own dashboard.
  */
  /** Auth RESOLVED and nobody is signed in — a login problem, not a wait. */
  const mustSignIn = !loading && !user;

  if (mustSignIn) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen px-4 bg-linear-to-b from-primary/5 via-primary/5 to-background`}>
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className={`mx-auto w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center`}>
            <Crown className="h-10 w-10 text-primary" />
          </div>
          <h1 className={`text-4xl font-bold bg-linear-to-r from-foreground via-primary to-primary bg-clip-text text-transparent`}>
            {tCommon("creator_dashboard")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("please_sign_in_to_access_your_creator_dashboard")}
          </p>
          <Button
            size="lg"
            onClick={() => setIsAuthModalOpen(true)}
            className={`bg-primary hover:bg-primary/90 shadow-xl`}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {tCommon("sign_in")}
          </Button>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialView="login"
          />
        </m.div>
      </div>
    );
  }

  /* Error, not emptiness: see `loadError` above. `!dashboardData` on its own
     was true throughout the pending window too. */
  if (loadError && !dashboardData) {
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

  /**
   * The profile call RESOLVED and this creator has not made one yet.
   *
   * Named rather than written inline, because `!loading && !creatorProfile` in
   * the middle of JSX reads as a pending-state gate and it is the opposite: it
   * can only be true after the fetch settles. See the note at the Profile tab.
   */
  const showCreateProfileCta = !loading && !creatorProfile;

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

  /*
    `change` is UNDEFINED while loading, and `changeLabel` is always set on the
    two cards that carry a delta.

    Both halves matter. Left as it was, `volumeChange` defaults to 0 before the
    stats call lands, so the card would paint a confident "0.0%" chip and then
    replace it with the real figure — a number that was never data. And a chip
    that simply disappears while loading is the other half of the same bug: the
    delta row is the last line of the card, so withholding it makes the card
    ~17px shorter than it is about to be, and in a `grid` of `h-full` cards that
    is not one card resizing, it is the whole row re-measuring against its
    tallest member.

    `StatsCard` reserves the chip's box exactly when `change` is absent and
    `changeLabel` is present — that pairing is its signal for "a delta is
    coming" — so passing the (static, already-known) period label is what keeps
    the row at its final height from the first frame.
  */
  const stats = [
    {
      label: tCommon("total_volume"),
      value: (overview.totalVolume || 0).toLocaleString(),
      change: loading ? undefined : `${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(1)}%`,
      changeLabel: "30d",
      trend: volumeChange > 0 ? "up" : volumeChange < 0 ? "down" : "neutral",
      icon: DollarSign,
      color: "blue"
    },
    {
      label: t("collections"),
      value: overview.totalCollections || 0,
      icon: Package,
      color: "purple"
    },
    {
      label: tExt("total_nfts"),
      value: overview.totalTokens || 0,
      icon: ImageIcon,
      color: "amber"
    },
    {
      label: tCommon("total_views"),
      value: (overview.totalViews || 0).toLocaleString(),
      change: loading ? undefined : `${viewsChange > 0 ? '+' : ''}${viewsChange.toFixed(1)}%`,
      changeLabel: "30d",
      trend: viewsChange > 0 ? "up" : viewsChange < 0 ? "down" : "neutral",
      icon: Eye,
      color: "rose"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <section ref={heroRef} className={`relative pt-20 pb-12 overflow-hidden bg-linear-to-b from-primary/5 via-primary/5 to-background border-b-2`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-8"
          >
            {/* Profile Section */}
            <div className="flex items-center gap-6">
              <m.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={heroInView ? { scale: 1, opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-xl ring-4 ring-primary/10">
                  <AvatarImage src={user?.avatar || undefined} />
                  <AvatarFallback className={`text-2xl bg-primary text-primary-foreground`}>
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </m.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className={`text-3xl lg:text-4xl font-bold bg-linear-to-r from-foreground via-primary to-primary bg-clip-text text-transparent`}>
                    {/* `dashboardData?.` and not `dashboardData.`: the guard
                        that used to make this non-null was the `!dashboardData`
                        bail-out, and that now only fires on a real error. The
                        display name falls back to the signed-in user's own
                        name, which the store already has, so this line has real
                        text in both states — no placeholder needed. */}
                    {dashboardData?.creator?.displayName || `${user?.firstName} ${user?.lastName}`}
                  </h1>
                  {dashboardData?.creator?.verificationTier === 'VERIFIED' && (
                    <m.div
                      initial={{ scale: 0 }}
                      animate={heroInView ? { scale: 1 } : {}}
                      transition={{ type: "spring", delay: 0.4 }}
                    >
                      <Verified className="h-7 w-7 text-primary flex-shrink-0" />
                    </m.div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Badge className="bg-primary/10 text-primary-ink border-primary/30">
                    <Crown className="w-3 h-3 mr-1" />
                    Creator
                  </Badge>
                  <span>
                    {/* The label is static; only the date waits. It also has to
                        tolerate `user` being null for the first render — the
                        store is populated by an effect in the root provider —
                        or this prints the literal string "Invalid Date". */}
                    {t("creator_since")}{" "}
                    <Loadable loading={loading} placeholder="00/00/0000">
                      {new Date(
                        dashboardData?.creator?.createdAt || user?.createdAt || Date.now()
                      ).toLocaleDateString()}
                    </Loadable>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <m.div
              initial={{ opacity: 0, x: 20 }}
              animate={heroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center gap-3"
            >
              <Link href="/nft/create">
                <Button size="lg" className={`bg-primary hover:bg-primary/90 shadow-xl`}>
                  <Plus className="h-5 w-5 mr-2" />
                  {t("create_nft")}
                </Button>
              </Link>
              <Link href="/nft/creator/profile">
                <Button size="lg" variant="outline" className="border-2">
                  <Edit3 className="h-5 w-5 mr-2" />
                  {tCommon("edit_profile")}
                </Button>
              </Link>
            </m.div>
          </m.div>

          {/* Stats Grid */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {stats.map((stat, index) => (
              <m.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.3, delay: 0.25 + index * 0.05 }}
                className="h-full"
              >
                <StatsCard
                  label={stat.label}
                  value={stat.value}
                  icon={stat.icon}
                  change={stat.change}
                  changeLabel={stat.changeLabel}
                  loading={loading}
                  {...(statsCardColors[
                    stat.color as keyof typeof statsCardColors
                  ] ?? statsCardColors.neutral)}
                />
              </m.div>
            ))}
          </m.div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Onboarding Guide */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* `loading` here is not decoration. Every flag below is derived from
              the response, so while it is in flight they are all false and the
              banner reads "you have done nothing yet" — then vanishes entirely
              for the established creators who are most of this page's traffic,
              because it self-hides once all three steps are complete. That is a
              ~450px card appearing and collapsing on the majority of visits.
              Its PRESENCE is data, not chrome, so the only honest pending state
              is not to assert one; see the note in `creator-onboarding.tsx`. */}
          <CreatorOnboarding
            loading={loading}
            hasCollections={hasCollections}
            hasDeployedCollections={hasDeployedCollections}
            hasNFTs={hasNFTs}
            totalCollections={collections.length}
            deployedCount={deployedCollections.length}
            undeployedCount={undeployedCollections.length}
            totalNFTs={overview.totalTokens}
          />
        </m.div>

        {/* Secondary Stats */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                  <Wallet className="h-3.5 w-3.5" />
                </span>
                {t("earnings_overview")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-2 rounded-md">
                <span className="text-xs font-medium text-muted-foreground">{t("royalty_earnings")}</span>
                {/* The `<Loadable>` goes INSIDE the figure span, not around it:
                    the placeholder is then measured by this exact
                    `text-lg font-mono tabular-nums` box, and follows it if the
                    typography ever changes. A sibling `h-6 w-16` block would
                    not. */}
                <span className="font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground">
                  <Loadable loading={loading} placeholder="1,234">
                    {(overview.totalRoyaltyEarnings || 0).toLocaleString()}
                  </Loadable>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-2 rounded-md">
                <span className="text-xs font-medium text-muted-foreground">{t("avg_sale_price")}</span>
                <span className="font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground">
                  <Loadable loading={loading} placeholder="1,234">
                    {(overview.averageSalePrice || 0).toLocaleString()}
                  </Loadable>
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                  <Target className="h-3.5 w-3.5" />
                </span>
                {tCommon("performance_metrics")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-2 rounded-md">
                <span className="text-xs font-medium text-muted-foreground">{tCommon("success_rate")}</span>
                <span className="font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground">
                  <Loadable loading={loading} placeholder="00%">
                    {overview.totalTokens > 0 ? Math.round((recentSales.length / overview.totalTokens) * 100) : 0}%
                  </Loadable>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-2 rounded-md">
                <span className="text-xs font-medium text-muted-foreground">{tCommon("total_sales")}</span>
                <span className="font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground">
                  <Loadable loading={loading} placeholder="000">
                    {recentSales.length}
                  </Loadable>
                </span>
              </div>
            </CardContent>
          </Card>
        </m.div>

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
                {/* The WORD is known now; only the count is not. Skeletoning the
                    whole trigger label would have made the tab bar re-measure
                    and slide the underline. */}
                Collections (<Loadable loading={loading} placeholder="0" radius="rounded-xs">{collections.length}</Loadable>)
              </TabsTrigger>
              <TabsTrigger
                value="nfts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-4 text-base"
              >
                <ImageIcon className="h-5 w-5 mr-2" />
                NFTs (<Loadable loading={loading} placeholder="0" radius="rounded-xs">{topTokens.length}</Loadable>)
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
                <m.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                          <Flame className="h-3.5 w-3.5" />
                        </span>
                        {tExt("recent_sales")}
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="gap-1">
                        {tCommon("view_all")}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {/*
                        LOADING AND EMPTY ARE DIFFERENT STATES.

                        This was `recentSales.length > 0 ? list : emptyState`,
                        and `recentSales` is `[]` for the whole pending window —
                        so every visit rendered the 224px "No sales yet" panel
                        (80px circle, two lines, `py-16`) and then replaced it
                        with a list of rows, which for five sales is ~400px. The
                        card grew by ~180px at the moment the data landed, and
                        the sibling card beside it in the same `lg:grid-cols-2`
                        row moved with it.

                        Three states now, in the order they can be decided:
                        pending, then empty, then populated.
                      */}
                      {loading ? (
                        <div className="space-y-4">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <PendingListRow key={i} />
                          ))}
                        </div>
                      ) : recentSales.length > 0 ? (
                        <div className="space-y-4">
                          {recentSales.slice(0, 5).map((sale: any, index: number) => (
                            <m.div
                              key={sale.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                            >
                              <div className={`w-14 h-14 bg-primary/20 rounded-xl flex-shrink-0 overflow-hidden`}>
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
                                <p className="font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground flex items-center justify-end gap-1.5">
                                  <CurrencyIcon currency={sale.currency} size={16} />
                                  {sale.price}{" "}
                                  <span className="text-xs font-sans font-medium text-muted-foreground">{sale.currency}</span>
                                </p>
                                {sale.royaltyFee > 0 && (
                                  <p className="text-[11px] text-warning">
                                    <span className="font-mono tabular-nums">+{sale.royaltyFee}</span> royalty
                                  </p>
                                )}
                              </div>
                            </m.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 mx-auto mb-4 bg-surface-3 rounded-full flex items-center justify-center">
                            <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">{t("no_sales_yet")}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t("your_sales_will_appear_here")}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </m.div>

                {/* Top NFTs */}
                <m.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                          <Award className="h-3.5 w-3.5" />
                        </span>
                        {t("top_nfts")}
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="gap-1">
                        {tCommon("view_all")}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {/* Same three-state split as Recent Sales above. */}
                      {loading ? (
                        <div className="space-y-4">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <PendingListRow key={i} />
                          ))}
                        </div>
                      ) : topTokens.length > 0 ? (
                        <div className="space-y-4">
                          {topTokens.slice(0, 5).map((token: any, index: number) => (
                            <Link key={token.id} href={`/nft/token/${token.id}`}>
                              <m.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                              >
                                <div className={`w-14 h-14 bg-primary/20 rounded-xl flex-shrink-0 overflow-hidden`}>
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
                                  <span className="font-mono text-sm font-semibold tabular-nums">{token.views || 0}</span>
                                </div>
                              </m.div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 mx-auto mb-4 bg-surface-3 rounded-full flex items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">{t("no_nfts_yet")}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t("create_your_first_nft_to_get_started")}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </m.div>
              </div>
            </TabsContent>

            <TabsContent value="collections" className="mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{t("my_collections")}</h2>
                  <p className="text-muted-foreground">
                    {t("manage_and_track_your_nft_collections")}
                  </p>
                </div>
                <Link href="/nft/collection/create">
                  <Button size="lg" className={`bg-primary hover:bg-primary/90 shadow-xl`}>
                    <Plus className="h-5 w-5 mr-2" />
                    {t("create_collection")}
                  </Button>
                </Link>
              </div>

              {/*
                The grid CONTAINER is the same element in all three states —
                same `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, same
                `gap-6` — so the columns and gutters are fixed before the fetch
                returns and only the number of children settles. Previously an
                empty `collections` meant the `py-20` empty-state card rendered
                first (about 420px tall), then was replaced by rows of ~430px
                cards; on a four-collection account that is a jump of a full
                viewport with the tab content and everything under it moving.
              */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PendingGridCard key={i} media="banner" />
                  ))}
                </div>
              ) : collections.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {collections.map((collection: any, index: number) => (
                    <m.div
                      key={collection.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all">
                        {/* Banner */}
                        <div className={`relative h-40 bg-primary/20`}>
                          {collection.bannerImage ? (
                            <Image
                              src={collection.bannerImage}
                              alt={collection.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : collection.logoImage ? (
                            <div className="flex items-center justify-center h-full">
                              <CollectionAvatar
                                src={collection.logoImage}
                                name={collection.name}
                                size={96}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Package className="h-16 w-16 text-primary/40" />
                            </div>
                          )}

                          {/* Status Badge */}
                          <StatusBadge
                            status={collection.status || 'PENDING'}
                            appearance="solid"
                            className="absolute top-3 right-3 text-xs font-semibold"
                          />

                          {/* Logo overlay - positioned at bottom left overlapping banner */}
                          {collection.logoImage && collection.bannerImage && (
                            <div className="absolute -bottom-8 left-4 w-16 h-16 rounded-xl border-4 border-card bg-card overflow-hidden shadow-lg">
                              <CollectionAvatar
                                src={collection.logoImage}
                                name={collection.name}
                                size={56}
                                className="w-full h-full rounded-none"
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
                            <div className="mb-4 p-3 bg-success/5 dark:bg-success/20 border-2 border-success/20 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-4 w-4 text-success" />
                                <span className="text-sm font-bold text-success">Deployed</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs text-success truncate flex-1 font-mono">
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
                            <div className="mb-4 p-3 bg-warning/5 dark:bg-warning/20 border-2 border-warning/20 rounded-xl">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-warning" />
                                <span className="text-sm font-bold text-warning">{tExt("not_deployed")}</span>
                              </div>
                            </div>
                          )}

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-4 border-b">
                            <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums">
                              <Package className="h-4 w-4" />
                              {collection.tokenCount || 0}
                            </span>
                            <ChainBadge chain={collection.chain || 'BSC'} variant="outline" className="text-xs font-semibold" />
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
                                className={`w-full bg-primary hover:bg-primary/90 shadow-lg h-10`}
                                onClick={() => handleDeployCollection(collection.id)}
                              >
                                <Rocket className="h-4 w-4 mr-2" />
                                {t("deploy_to_blockchain")}
                              </Button>
                              <div className="flex gap-2">
                                <Link href={`/nft/collection/${collection.id}`} className="flex-1">
                                  <Button size="sm" variant="outline" className="w-full font-semibold">View</Button>
                                </Link>
                                <Link href={`/nft/collection/${collection.id}/edit`}>
                                  <Button size="sm" variant="outline" className="w-9 p-0">
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </m.div>
                  ))}
                </div>
              ) : (
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardContent className="text-center py-20">
                      <div className={`w-24 h-24 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center`}>
                        <Package className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{t("no_collections_yet")}</h3>
                      <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-lg">
                        {t("start_your_creative_journey_by_creating")}
                      </p>
                      <Link href="/nft/collection/create">
                        <Button size="lg" className={`bg-primary hover:bg-primary/90 shadow-xl h-12`}>
                          <Plus className="h-5 w-5 mr-2" />
                          {t("create_collection")}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </m.div>
              )}
            </TabsContent>

            <TabsContent value="nfts" className="mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{t("my_nfts")}</h2>
                  <p className="text-muted-foreground">
                    {t("all_nfts_youve_created")}
                  </p>
                </div>
                <Link href="/nft/create">
                  <Button size="lg" className={`bg-primary hover:bg-primary/90 shadow-xl`}>
                    <Plus className="h-5 w-5 mr-2" />
                    {t("create_nft")}
                  </Button>
                </Link>
              </div>

              {/* Same three-state split as the collections grid above; the
                  token card leads with a square image rather than a banner. */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PendingGridCard key={i} media="square" />
                  ))}
                </div>
              ) : topTokens.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {topTokens.map((token: any, index: number) => (
                    <m.div
                      key={token.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link href={`/nft/token/${token.id}`} className="block">
                        <div className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all">
                          {/* Image */}
                          <div className={`relative aspect-square overflow-hidden bg-primary/20`}>
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
                            <div className="absolute inset-0 bg-overlay/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
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
                                className={`rounded-full bg-primary`}
                                onClick={(e) => {
                                  e.preventDefault();
                                }}
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Status Badge */}
                            {token.status && (
                              // This badge is absolutely positioned OVER the
                              // token artwork, so its ground is an arbitrary
                              // image — no tint can be measured against it, and
                              // over the /20 placeholder tile it measured
                              // 3.32:1. An opaque fill is the only ground-
                              // independent answer, and the solid pairing is
                              // contrast-checked by construction (5.16 / 6.34).
                              <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border border-primary">
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
                                  <span className="text-[8px] text-primary-foreground">✓</span>
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
                                <div className="text-xs font-medium text-muted-foreground">
                                  Status
                                </div>
                                <div className="text-sm font-semibold text-foreground">
                                  {token.status || tCommon("draft")}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1 font-mono tabular-nums">
                                  <Eye className="w-3 h-3" />
                                  {token.views || 0}
                                </span>
                                <span className="flex items-center gap-1 font-mono tabular-nums">
                                  <Heart className="w-3 h-3" />
                                  {token.likeCount || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </m.div>
                  ))}
                </div>
              ) : (
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardContent className="text-center py-20">
                      <div className={`w-24 h-24 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center`}>
                        <ImageIcon className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{t("no_nfts_yet")}</h3>
                      <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-lg">
                        {t("create_your_first_nft_and_start")}
                      </p>
                      <Link href="/nft/create">
                        <Button size="lg" className={`bg-primary hover:bg-primary/90 shadow-xl h-12`}>
                          <Plus className="h-5 w-5 mr-2" />
                          {t("create_nft")}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </m.div>
              )}
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              {/*
                `!creatorProfile` alone was true while the profile call was in
                flight, so a creator who deep-links `?tab=profile` was told
                "No Creator Profile Yet" — a 480px centred call-to-action — and
                then had it replaced by their own 900px profile card. Wrong
                content, and a full-viewport reflow to correct it.

                The `else` tree below already reads every field through
                `creatorProfile?.…`, so it renders unchanged against a null
                profile; only the VALUES inside it need placeholders. That is
                why this is `!loading && !creatorProfile` rather than a third
                copy of the profile layout.
              */}
              {showCreateProfileCta ? (
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mx-auto"
                >
                  <Card>
                    <CardContent className="p-16 text-center">
                      <div className={`mx-auto w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-8`}>
                        <User className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="text-3xl font-bold mb-4">{t("no_creator_profile_yet")}</h3>
                      <p className="text-muted-foreground mb-10 max-w-md mx-auto text-lg">
                        {t("create_your_creator_profile_to_showcase")}
                      </p>
                      <Link href="/nft/creator/profile">
                        <Button size="lg" className={`bg-primary hover:bg-primary/90 shadow-xl h-12`}>
                          <Edit3 className="h-5 w-5 mr-2" />
                          {t("create_your_profile")}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </m.div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Keep existing profile content */}
                  <Card>
                    <CardContent className="p-0">
                      {/* Banner */}
                      {creatorProfile?.banner ? (
                        <div className={`relative w-full h-56 bg-primary rounded-t-xl overflow-hidden`}>
                          <Image
                            src={creatorProfile.banner}
                            alt={t("profile_banner")}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`w-full h-56 bg-primary rounded-t-xl`} />
                      )}

                      {/* Profile Info */}
                      <div className="p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 -mt-24 mb-6">
                          <Avatar className="h-40 w-40 border-4 border-background shadow-2xl ring-4 ring-primary/20">
                            <AvatarImage src={user?.avatar || undefined} />
                            <AvatarFallback className={`text-4xl bg-primary text-primary-foreground`}>
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 mt-16 sm:mt-0">
                            <div className="flex items-center gap-3 mb-3">
                              <h2 className="text-3xl font-bold">
                                {creatorProfile?.displayName || `${user?.firstName} ${user?.lastName}`}
                              </h2>
                              {creatorProfile?.isVerified && (
                                <Verified className="h-7 w-7 text-primary" />
                              )}
                            </div>
                            <p className="text-muted-foreground mb-6 text-lg">
                              <Loadable loading={loading} chars={48}>
                                {creatorProfile?.bio || t("no_bio_added_yet")}
                              </Loadable>
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
                              {tCommon("edit_profile")}
                            </Button>
                          </Link>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t">
                          <div className="text-center">
                            <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums mb-1">
                              <Loadable loading={loading} placeholder="12">{overview.totalCollections || 0}</Loadable>
                            </p>
                            <p className="text-xs font-medium text-muted-foreground">Collections</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums mb-1">
                              <Loadable loading={loading} placeholder="12">{overview.totalTokens || 0}</Loadable>
                            </p>
                            <p className="text-xs font-medium text-muted-foreground">{tExt("nfts_created")}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums mb-1">
                              <Loadable loading={loading} placeholder="12,345">{(overview.totalVolume || 0).toLocaleString()}</Loadable>
                            </p>
                            <p className="text-xs font-medium text-muted-foreground">{tCommon("total_volume")}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums mb-1">
                              <Loadable loading={loading} placeholder="12,345">{overview.totalViews || 0}</Loadable>
                            </p>
                            <p className="text-xs font-medium text-muted-foreground">{tCommon("total_views")}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Profile Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">{t("account_information")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-surface-2 rounded-md">
                          <span className="text-xs font-medium text-muted-foreground">Email</span>
                          <span className="text-sm font-semibold">{user?.email}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-surface-2 rounded-md">
                          <span className="text-xs font-medium text-muted-foreground">{tCommon("member_since")}</span>
                          <span className="font-mono text-sm font-semibold tabular-nums">
                            {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-surface-2 rounded-md">
                          <span className="text-xs font-medium text-muted-foreground">{t("profile_status")}</span>
                          <Badge variant={creatorProfile?.profilePublic ? "default" : "secondary"} className="font-semibold">
                            {creatorProfile?.profilePublic ? tCommon("public") : tCommon("private")}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-surface-2 rounded-md">
                          <span className="text-xs font-medium text-muted-foreground">Verification</span>
                          {creatorProfile?.isVerified ? (
                            <Badge className="bg-primary text-primary-foreground font-semibold">
                              <Verified className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="font-semibold">Unverified</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">{t("creator_earnings")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-surface-2 rounded-md">
                          <span className="text-xs font-medium text-muted-foreground">{tCommon("total_sales")}</span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                            <Loadable loading={loading} placeholder="000">{recentSales.length}</Loadable>
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-surface-2 rounded-md">
                          <span className="text-xs font-medium text-muted-foreground">{t("sales_volume")}</span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                            <Loadable loading={loading} placeholder="1,234">{(overview.totalVolume || 0).toLocaleString()}</Loadable>
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-surface-2 rounded-md">
                          <span className="text-xs font-medium text-muted-foreground">{t("royalty_earnings")}</span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                            <Loadable loading={loading} placeholder="1,234">{(overview.totalRoyaltyEarnings || 0).toLocaleString()}</Loadable>
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-surface-2 rounded-md">
                          <span className="text-xs font-medium text-muted-foreground">{t("avg_sale_price")}</span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                            <Loadable loading={loading} placeholder="1,234">{(overview.averageSalePrice || 0).toLocaleString()}</Loadable>
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
