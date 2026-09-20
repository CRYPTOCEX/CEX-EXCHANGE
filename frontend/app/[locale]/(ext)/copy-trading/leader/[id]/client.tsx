"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyFigure } from "@/components/ui/money-figure";
import { Loadable } from "@/components/ui/skeleton";
import { SeriesChart } from "@/components/ui/chart/series-chart";
import { m } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  ArrowLeft,
  Loader2,
  DollarSign,
  Activity,
  Target,
  Shield,
  Zap,
  Trophy,
  Clock,
  CheckCircle2,
  Star,
  Calendar,
  ArrowUpRight,
  Flame,
  Award,
  Percent,
  Wallet,
  LineChart,
  PieChart,
  TrendingDown as TrendDown,
  AlertTriangle,
  Sparkles,
  Copy,
  Share2,
  Eye,
  Settings,
  Edit3,
  BarChart2,
  Coins,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { formatPnL, formatAllocation, formatFiat } from "@/utils/currency";
import LeaderNotFoundState from "./not-found-state";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";

interface LeaderMarket {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  isActive: boolean;
  marketType?: "SPOT" | "BINARY";
  minBase?: number;
  minQuote?: number;
}

interface Leader {
  id: string;
  userId: string;
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
  avgTradeProfit?: number;
  avgTradeDuration?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  currency?: string;
  createdAt?: string;
  tradingType?: "SPOT" | "BINARY" | "BOTH";
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  isFollowing?: boolean;
  followerId?: string;
  followerStatus?: "ACTIVE" | "PAUSED" | null;
  dailyStats?: any[];
  markets?: LeaderMarket[];
  recentTrades?: Array<{
    id: string;
    symbol: string;
    side: string;
    amount: number;
    price: number;
    profit?: number;
    profitPercent?: number;
    profitCurrency?: string;
    status: string;
    createdAt: string;
    closedAt?: string;
    marketType?: "SPOT" | "BINARY";
    binaryResult?: "WIN" | "LOSS" | "DRAW" | null;
    expiresAt?: string;
  }>;
}

const tradingStyleConfig: Record<
  string,
  { icon: any; color: string; bg: string; description: string }
> = {
  SCALPING: {
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
    description: "Quick trades, small profits",
  },
  DAY_TRADING: {
    icon: BarChart3,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
    description: "Intraday positions",
  },
  SWING: {
    icon: TrendingUp,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
    description: "Multi-day holds",
  },
  POSITION: {
    icon: Shield,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
    description: "Long-term strategy",
  },
};

const riskConfig: Record<
  string,
  { color: string; bg: string; gradient: string; label: string }
> = {
  LOW: {
    color: "text-success",
    bg: "bg-success/10 dark:bg-success/30",
    gradient: "bg-success",
    label: "Conservative",
  },
  MEDIUM: {
    color: "text-warning",
    bg: "bg-warning/10 dark:bg-warning/30",
    gradient: "bg-warning",
    label: "Moderate",
  },
  HIGH: {
    color: "text-destructive",
    bg: "bg-destructive/10 dark:bg-destructive/30",
    gradient: "from-destructive to-primary",
    label: "Aggressive",
  },
};

const tradingTypeConfig: Record<
  string,
  { icon: any; color: string; bg: string; label: string }
> = {
  SPOT: {
    icon: Coins,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
    label: "Spot",
  },
  BINARY: {
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
    label: "Binary",
  },
  BOTH: {
    icon: Sparkles,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
    label: "Spot + Binary",
  },
};

const BULLISH_BINARY_SIDES = ["RISE", "HIGHER", "TOUCH", "CALL", "UP"];

const isBullishSide = (side?: string) =>
  side === "BUY" || BULLISH_BINARY_SIDES.includes(side || "");

/**
 * The leader shape the page renders BEFORE the fetch resolves.
 *
 * None of these values is ever painted — every one is behind a `Loadable` in
 * the tree below — so what this actually does is let the ONE profile layout
 * render in both states instead of the page keeping a second, hand-maintained
 * copy of itself as a skeleton. `markets` and `recentTrades` carry one entry
 * each so the market grid and the trade list reserve a row rather than showing
 * their resolved empty states mid-fetch.
 */
/** Trade rows / market tiles to reserve while the profile is in flight. */
const PENDING_TRADE_ROWS = 4;
const PENDING_MARKET_TILES = 4;

const PENDING_LEADER: Leader = {
  id: "",
  userId: "",
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
  tradingType: "SPOT",
  markets: [],
  recentTrades: [],
  dailyStats: [],
};

export default function LeaderDetailPage() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const params = useParams();
  const leaderId = params.id as string;
  const { user } = useUserStore();

  const [leader, setLeader] = useState<Leader | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchedLeaderIdRef = useRef<string | null>(null);

  // Determine if this is the user's own profile by comparing user store id with leader's userId
  const isOwnProfile = !!(user?.id && leader?.userId && user.id === leader.userId);

  useEffect(() => {
    if (fetchedLeaderIdRef.current === leaderId) return;
    fetchedLeaderIdRef.current = leaderId;

    const fetchLeader = async () => {
      const { data } = await $fetch({
        url: `/api/copy-trading/leader/${leaderId}`,
        method: "GET",
        silentSuccess: true,
      });
      setLeader(data);
      setIsLoading(false);
    };

    fetchLeader();
  }, [leaderId]);

  /*
    THE WHOLE PROFILE USED TO BE REPLACED BY A GREY COPY OF ITSELF.

    `if (isLoading) return <LeaderDetailLoading/>` re-rendered this route's own
    `loading.tsx` from inside the client, so a single navigation to a leader
    profile flashed a full-page skeleton twice — once from Next during the
    transition, once from here.

    Everything structural on this page is knowable before the fetch: the back
    link, the hero frame, the CTA panel and its buttons, the four KPI cards,
    the performance card's labels, the tab bar and every column heading under
    it. `leaderData` below is what lets the ONE tree render in both states —
    its values are never painted, every one of them is behind a `Loadable`.

    `!leader` is the NOT-FOUND answer and must wait for the request to finish;
    unqualified it would show the 404 page on every visit before the profile
    arrived.
  */
  const resolvedWithNoLeader = !isLoading && !leader;
  if (resolvedWithNoLeader) {
    return <LeaderNotFoundState />;
  }

  const leaderData = leader ?? PENDING_LEADER;

  const avatar = leaderData.avatar || leaderData.user?.avatar;
  const initials = leaderData.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isPositiveRoi = leaderData.roi >= 0;
  const styleInfo =
    tradingStyleConfig[leaderData.tradingStyle] || tradingStyleConfig.DAY_TRADING;
  const risk = riskConfig[leaderData.riskLevel] || riskConfig.MEDIUM;
  const StyleIcon = styleInfo.icon;
  const tradeTypeInfo =
    tradingTypeConfig[leaderData.tradingType || "SPOT"] || tradingTypeConfig.SPOT;
  const TradeTypeIcon = tradeTypeInfo.icon;
  const spotMarkets = (leaderData.markets || []).filter(
    (m) => m.marketType !== "BINARY"
  );
  const binaryMarkets = (leaderData.markets || []).filter(
    (m) => m.marketType === "BINARY"
  );
  const spotsLeft = leaderData.maxFollowers - leaderData.totalFollowers;
  const spotsPercent = (leaderData.totalFollowers / leaderData.maxFollowers) * 100;
  const isTopPerformer = leaderData.roi > 30;
  const avgProfit =
    leaderData.avgTradeProfit ||
    leaderData.totalProfit / Math.max(leaderData.totalTrades, 1);

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30">
      {/* Hero Banner */}
      <div className="pt-header relative overflow-hidden border-b border-border/50">
        {/* Gradient background */}
        <div
          className={`absolute inset-0 bg-linear-to-br ${risk.gradient} opacity-10`}
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-transparent" />

        {/* Decorative elements */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-20 -left-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative py-8 md:py-12">
          {/* Main layout: two columns on desktop */}
          <div className="flex flex-col lg:flex-row lg:gap-8">
            {/* Left column: Back button + Profile */}
            <div className="flex-1 min-w-0">
              {/* Back button */}
              <Link
                href="/copy-trading/leader"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group mb-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
                {t("back_to_leaders")}
              </Link>

              {/* Profile header */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-5">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-4 ring-card shadow-xl">
                      {/* The Avatar element carries the box and the ring, so it
                          stays mounted; Radix falls back when there is no src,
                          which is exactly the pending case. */}
                      <AvatarImage
                        src={isLoading ? undefined : avatar}
                        alt={leaderData.displayName}
                      />
                      <AvatarFallback
                        className={
                          isLoading
                            ? "animate-pulse bg-muted"
                            : "text-2xl md:text-3xl bg-primary text-primary-foreground font-bold"
                        }
                      >
                        {isLoading ? null : initials}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-success border-2 border-border rounded-full" />

                    {/* Top performer badge */}
                    {isTopPerformer && (
                      <div className="absolute -top-1 -right-1">
                        <div className="w-7 h-7 rounded-full bg-warning flex items-center justify-center shadow-lg">
                          <Trophy className="h-3.5 w-3.5 text-warning-foreground" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Name and badges */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        <Loadable loading={isLoading} placeholder={tExt("leader_name")}>
                          {leaderData.displayName}
                        </Loadable>
                      </h1>
                      {isOwnProfile && (
                        <Badge className="bg-warning/10 text-warning-ink border-0">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          {tExt("your_profile")}
                        </Badge>
                      )}
                      {leaderData.isFollowing && !isOwnProfile && (
                        <Badge className="bg-primary/10 text-primary-ink border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Following
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center flex-wrap gap-2 mb-3">
                      <Badge
                        className={`${styleInfo.bg} ${styleInfo.color} border-0`}
                      >
                        <StyleIcon className="h-3 w-3 mr-1" />
                        <Loadable loading={isLoading} placeholder={tExt("day_trading")}>
                          {leaderData.tradingStyle.replace("_", " ")}
                        </Loadable>
                      </Badge>
                      <Badge className={`${risk.bg} ${risk.color} border-0`}>
                        <Shield className="h-3 w-3 mr-1" />
                        <Loadable loading={isLoading} placeholder={t("medium_risk")}>
                          {risk.label}
                        </Loadable>
                      </Badge>
                      <Badge
                        className={`${tradeTypeInfo.bg} ${tradeTypeInfo.color} border-0`}
                      >
                        <TradeTypeIcon className="h-3 w-3 mr-1" />
                        <Loadable loading={isLoading} placeholder="Spot">
                          {tradeTypeInfo.label}
                        </Loadable>
                      </Badge>
                      {(isLoading || leaderData.createdAt) && (
                        <Badge
                          variant="outline"
                          className="text-subtle-foreground border-border-strong"
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Since{" "}
                          <Loadable loading={isLoading} placeholder={t("jan") + " 2026"}>
                            {leaderData.createdAt
                              ? new Date(leaderData.createdAt).toLocaleDateString(
                                  "en-US",
                                  { month: "short", year: "numeric" }
                                )
                              : null}
                          </Loadable>
                        </Badge>
                      )}
                    </div>

                    {/* Reserved while pending: the bio sits directly above the
                        hero's bottom edge, so an absent line moved everything
                        below the hero by its own height when it arrived. */}
                    {(isLoading || leaderData.bio) && (
                      <p className="text-muted-foreground text-sm md:text-base max-w-xl">
                        <Loadable
                          loading={isLoading}
                          placeholder={t("a_short_description_of_this_leaders")}
                        >
                          {leaderData.bio}
                        </Loadable>
                      </p>
                    )}
                  </div>
                </div>
              </m.div>
            </div>

            {/* Right column: CTA Card */}
            <m.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 lg:mt-0 lg:w-80 shrink-0"
            >
              {/*
                This panel is deliberately dark in BOTH themes (it was
                `from-zinc-900 via-zinc-900 to-zinc-800`, duplicated behind
                `dark:`). The palette migration mapped the ground to `surface-2`
                but left the ink on `--primary-foreground`, and both tokens flip:
                in light mode that is white ink (100% L) on a 98.4% L ground, so
                every number, label and outline button in this card was invisible
                on the default theme.

                Fixed the way `ecommerce/components/category-card.tsx` fixes it:
                scope the subtree with `dark`, which pins the tokens to their
                dark values. `--surface-2`/`--muted` are then the near-black
                ground the design asked for and `--foreground` is the light ink
                that ground needs — no literal colour anywhere, and the whole
                panel still moves when the palette does.
              */}
              <Card className="dark relative overflow-hidden bg-surface-2">
                {/* Decorative accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />

                {/*
                  Dot pattern. The literal `white` here was the last painted
                  off-token colour in this file; under the `dark` scope above,
                  `--foreground` IS the light dot this needs.
                */}
                <div className="absolute inset-0 opacity-5" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
                  backgroundSize: '24px 24px'
                }} />

                <CardContent className="relative">
                  {isOwnProfile ? (
                    /* Owner View */
                    <>
                      {/* Header for owner */}
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 text-warning-ink text-xs font-medium mb-3">
                          <Star className="h-3 w-3 fill-current" />
                          {t("your_leader_profile")}
                        </div>
                        <p className="text-lg text-muted-foreground mt-2">
                          {t("manage_your_copy_trading_profile")}
                        </p>
                      </div>

                      {/* Stats Grid for owner */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-foreground/5 rounded-lg p-3 text-center">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Followers</p>
                          <p className="text-xl font-semibold tracking-tight text-foreground font-mono tabular-nums">
                            <Loadable loading={isLoading} chars={3}>
                              {leaderData.totalFollowers}
                            </Loadable>
                          </p>
                        </div>
                        <div className="bg-foreground/5 rounded-lg p-3 text-center">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{tCommon("profit_share")}</p>
                          <p className="text-xl font-semibold tracking-tight text-foreground font-mono tabular-nums">
                            <Loadable loading={isLoading} placeholder="20%">
                              {`${leaderData.profitSharePercent}%`}
                            </Loadable>
                          </p>
                        </div>
                      </div>

                      {/* Capacity for owner */}
                      <div className="mb-6">
                        <div className="flex justify-between text-xs text-subtle-foreground mb-2">
                          <span>{tCommon("follower_capacity")}</span>
                          <span>
                            <Loadable loading={isLoading} placeholder="12 / 100">
                              {`${leaderData.totalFollowers} / ${leaderData.maxFollowers}`}
                            </Loadable>
                          </span>
                        </div>
                        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warning rounded-full transition-all duration-500"
                            style={{ width: `${spotsPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Owner Action Buttons */}
                      <div className="space-y-3">
                        <Link href="/copy-trading/dashboard" className="block">
                          <Button className="w-full h-12 gap-2 bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-lg">
                            <BarChart2 className="h-4 w-4" />
                            {tCommon("view_dashboard")}
                          </Button>
                        </Link>
                        <Link href="/copy-trading/dashboard?tab=settings" className="block">
                          <Button
                            variant="outline"
                            className="w-full h-11 gap-2 bg-foreground/10 border-foreground/20 text-foreground hover:bg-foreground/20 hover:text-foreground"
                          >
                            <Settings className="h-4 w-4" />
                            {tCommon("edit_profile")}
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    /* Visitor View */
                    <>
                      {/* Profit Share Header */}
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/10 text-muted-foreground text-xs font-medium mb-3">
                          <Percent className="h-3 w-3" />
                          {tCommon("profit_share")}
                        </div>
                        <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                          <Loadable loading={isLoading} placeholder="20%">
                            {`${leaderData.profitSharePercent}%`}
                          </Loadable>
                        </p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-foreground/5 rounded-lg p-3 text-center">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t("min_investment_1")}</p>
                          <p className="text-sm font-semibold text-foreground">
                            <Loadable loading={isLoading} placeholder="100.00 USDT">
                              <MoneyFigure
                                value={formatAllocation(leaderData.minFollowAmount, "USDT")}
                              />
                            </Loadable>
                          </p>
                        </div>
                        <div className="bg-foreground/5 rounded-lg p-3 text-center">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t("available_spots")}</p>
                          <p className={`text-sm font-semibold font-mono tabular-nums ${spotsLeft <= 10 ? "text-warning" : "text-foreground"}`}>
                            <Loadable loading={isLoading} placeholder="88 / 100">
                              {`${spotsLeft} / ${leaderData.maxFollowers}`}
                            </Loadable>
                          </p>
                        </div>
                      </div>

                      {/* Spots Progress */}
                      <div className="mb-6">
                        <div className="flex justify-between text-xs text-subtle-foreground mb-2">
                          <span>Capacity</span>
                          <span>
                            <Loadable loading={isLoading} placeholder="12%">
                              {`${Math.round(spotsPercent)}%`}
                            </Loadable>{" "}
                            filled
                          </span>
                        </div>
                        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${spotsPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* CTA Button */}
                      {leaderData.isFollowing ? (
                        <div className="space-y-2">
                          <Link href="/copy-trading/subscription" className="block">
                            <Button
                              variant="outline"
                              className="w-full h-12 gap-2 bg-foreground/10 border-foreground/20 text-foreground hover:bg-foreground/20 hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                              {tExt("view_subscription")}
                            </Button>
                          </Link>
                          {leaderData.followerStatus === "PAUSED" && (
                            <div className="text-xs text-center text-warning">
                              {t("your_subscription_is_currently_paused")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={`/copy-trading/leader/${leaderData.id}/follow`}
                          className="block"
                        >
                          <Button className="w-full h-12 gap-2 bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-lg">
                            <Copy className="h-4 w-4" />
                            {t("start_copying")}
                          </Button>
                        </Link>
                      )}

                      {/* Urgency Message */}
                      {spotsLeft <= 10 && spotsLeft > 0 && (
                        <div className="mt-4 flex items-center justify-center gap-1.5 text-warning">
                          <Flame className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">
                            Only {spotsLeft} {t("spots_remaining")}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </m.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Main Stats Grid */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {/* ROI Card */}
          <StatsCard
            label={t("total_roi")}
            value={
              <span
                className={`font-mono tabular-nums ${
                  isPositiveRoi ? "text-success" : "text-destructive"
                }`}
              >
                {isPositiveRoi ? "+" : ""}
                <Loadable loading={isLoading} placeholder="+12.34%">
                  {`${leaderData.roi.toFixed(2)}%`}
                </Loadable>
              </span>
            }
            icon={isPositiveRoi ? TrendingUp : TrendingDown}
            description={t("all_time_return")}
            loading={isLoading}
            {...(isPositiveRoi ? statsCardColors.success : statsCardColors.red)}
          />

          {/* Win Rate Card */}
          <StatsCard
            label={tCommon("win_rate")}
            value={`${leaderData.winRate.toFixed(1)}%`}
            icon={Target}
            description={tCommon("success_rate")}
            loading={isLoading}
            {...statsCardColors.primary}
          />

          {/* Followers Card */}
          <StatsCard
            label="Followers"
            value={leaderData.totalFollowers}
            icon={Users}
            progress={spotsPercent}
            description={t("capacity", { totalFollowers: String(leaderData.totalFollowers), maxFollowers: String(leaderData.maxFollowers) })}
            loading={isLoading}
            {...statsCardColors.primary}
          />

          {/* Total Trades Card */}
          <StatsCard
            label={tCommon("total_trades")}
            value={leaderData.totalTrades.toLocaleString()}
            icon={Activity}
            description={tExt("completed_trades")}
            loading={isLoading}
            {...statsCardColors.warning}
          />
        </m.div>

        {/* Performance Metrics */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Detailed Stats Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                  <BarChart3 className="h-3.5 w-3.5" />
                </span>
                {tCommon("performance_metrics")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted dark:bg-muted/50">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success mx-auto mb-2">
                    <DollarSign className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xl font-semibold tracking-tight text-success">
                    <Loadable loading={isLoading} placeholder="1,234.00 USDT">
                      <MoneyFigure
                        value={formatAllocation(leaderData.totalProfit || 0, "USDT")}
                      />
                    </Loadable>
                  </p>
                  <p className="text-[11px] text-subtle-foreground mt-1">
                    {tCommon("total_profit")}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted dark:bg-muted/50">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mx-auto mb-2">
                    <Wallet className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xl font-semibold tracking-tight text-foreground">
                    <Loadable loading={isLoading} placeholder="$12.3K">
                      <>
                        <MoneyFigure value={formatFiat((leaderData.totalVolume || 0) / 1000, "USD", 1)} />K
                      </>
                    </Loadable>
                  </p>
                  <p className="text-[11px] text-subtle-foreground mt-1">
                    {tCommon("total_volume")}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted dark:bg-muted/50">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mx-auto mb-2">
                    <LineChart className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xl font-semibold tracking-tight text-foreground">
                    <Loadable loading={isLoading} placeholder="12.34 USDT">
                      <MoneyFigure value={formatAllocation(avgProfit, "USDT")} />
                    </Loadable>
                  </p>
                  <p className="text-[11px] text-subtle-foreground mt-1">
                    {t("avg_profit_trade")}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted dark:bg-muted/50">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning mx-auto mb-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </span>
                  {/* "N/A" is prose — it carries no digits to keep aligned, and
                      a 20px monospace "N/A" reads as broken. Mono only when a
                      drawdown was actually measured. */}
                  <p
                    className={`text-xl font-semibold tracking-tight text-foreground${
                      leaderData.maxDrawdown ? " font-mono tabular-nums" : ""
                    }`}
                  >
                    <Loadable loading={isLoading} placeholder="12.3%">
                      {leaderData.maxDrawdown
                        ? `${leaderData.maxDrawdown.toFixed(1)}%`
                        : "N/A"}
                    </Loadable>
                  </p>
                  <p className="text-[11px] text-subtle-foreground mt-1">
                    {tCommon("max_drawdown")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                {tExt("quick_info")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StyleIcon className={`h-4 w-4 ${styleInfo.color}`} />
                  <span className="text-sm text-muted-foreground">
                    Style
                  </span>
                </div>
                <span className="text-sm font-medium">
                  <Loadable loading={isLoading} placeholder={tExt("day_trading")}>
                    {leaderData.tradingStyle.replace("_", " ")}
                  </Loadable>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className={`h-4 w-4 ${risk.color}`} />
                  <span className="text-sm text-muted-foreground">
                    {tCommon("risk_level")}
                  </span>
                </div>
                <span className={`text-sm font-medium ${risk.color}`}>
                  <Loadable loading={isLoading} placeholder={t("medium_risk")}>
                    {risk.label}
                  </Loadable>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {tCommon("profit_share")}
                  </span>
                </div>
                <span className="text-sm font-medium font-mono tabular-nums">
                  <Loadable loading={isLoading} placeholder="20%">
                    {`${leaderData.profitSharePercent}%`}
                  </Loadable>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-success" />
                  <span className="text-sm text-muted-foreground">
                    {t("min_investment_1")}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  <Loadable loading={isLoading} placeholder="100.00 USDT">
                    <MoneyFigure
                      value={formatAllocation(leaderData.minFollowAmount, "USDT")}
                    />
                  </Loadable>
                </span>
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* Tabs Section */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs defaultValue="trades" className="space-y-6">
            <TabsList className="bg-muted dark:bg-muted/50 p-1 rounded-xl">
              <TabsTrigger
                value="trades"
                className="rounded-lg data-[state=active]:bg-card dark:data-[state=active]:bg-muted data-[state=active]:shadow"
              >
                <Activity className="h-4 w-4 mr-2" />
                {tCommon("recent_trades")}
              </TabsTrigger>
              <TabsTrigger
                value="markets"
                className="rounded-lg data-[state=active]:bg-card dark:data-[state=active]:bg-muted data-[state=active]:shadow"
              >
                <Coins className="h-4 w-4 mr-2" />
                Markets
                {(isLoading ||
                  (leaderData.markets && leaderData.markets.length > 0)) && (
                  <Badge variant="secondary" className="ml-2">
                    <Loadable loading={isLoading} chars={1}>
                      {leaderData.markets?.length}
                    </Loadable>
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                className="rounded-lg data-[state=active]:bg-card dark:data-[state=active]:bg-muted data-[state=active]:shadow"
              >
                <LineChart className="h-4 w-4 mr-2" />
                Performance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trades">
              <Card>
                <CardContent className="p-6">
                  {/* LOADING IS NOT EMPTY. `recentTrades` is absent for the
                      whole fetch, so an unqualified check told every visitor
                      "This leader hasn't completed any trades yet" — a claim
                      about the leader — before the profile had arrived. */}
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: PENDING_TRADE_ROWS }, (_, idx) => (
                        <div
                          key={`pending-trade-${idx}`}
                          className="flex items-center justify-between p-4 rounded-xl bg-muted dark:bg-muted/50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-surface-3 animate-pulse" />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground">
                                  <Loadable loading placeholder="BTC/USDT" />
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-subtle-foreground">
                                <Clock className="h-3 w-3" />
                                <Loadable loading placeholder="01/01/2026" />
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold tracking-tight">
                              <Loadable loading placeholder="+123.00 USDT" />
                            </p>
                            <p className="text-sm">
                              <Loadable loading placeholder="+12.34%" />
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : leaderData.recentTrades && leaderData.recentTrades.length > 0 ? (
                    <div className="space-y-3">
                      {leaderData.recentTrades.map((trade: any, idx: number) => {
                        const isBinaryTrade =
                          trade.marketType === "BINARY" ||
                          !["BUY", "SELL"].includes(trade.side);
                        const bullish = isBullishSide(trade.side);

                        return (
                        <m.div
                          key={trade.id || `trade-${idx}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-xl bg-muted dark:bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                                bullish
                                  ? "bg-success/10 text-success-ink"
                                  : "bg-destructive/10 text-destructive-ink"
                              }`}
                            >
                              {isBinaryTrade ? (
                                bullish ? (
                                  <TrendingUp className="h-5 w-5" />
                                ) : (
                                  <TrendingDown className="h-5 w-5" />
                                )
                              ) : trade.side === "BUY" ? (
                                "B"
                              ) : (
                                "S"
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground">
                                  {trade.symbol}
                                </p>
                                {isBinaryTrade && trade.binaryResult && (
                                  <Badge
                                    className={`border-0 text-xs ${
                                      trade.binaryResult === "WIN"
                                        ? "bg-success/10 dark:bg-success/20 text-success-ink"
                                        : trade.binaryResult === "LOSS"
                                          ? "bg-destructive/10 dark:bg-destructive/20 text-destructive-ink"
                                          : "bg-warning/10 dark:bg-warning/20 text-warning-ink"
                                    }`}
                                  >
                                    {trade.binaryResult}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-subtle-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(
                                  trade.closedAt || trade.createdAt
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-lg font-semibold tracking-tight ${
                                (trade.profit || 0) >= 0
                                  ? "text-success"
                                  : "text-destructive"
                              }`}
                            >
                              <MoneyFigure
                                value={
                                  formatPnL(
                                    trade.profit || 0,
                                    trade.profitCurrency || "USDT"
                                  ).formatted
                                }
                              />
                            </p>
                            <p
                              className={`text-sm ${
                                (trade.profitPercent || 0) >= 0
                                  ? "text-success"
                                  : "text-destructive"
                              }`}
                            >
                              {(trade.profitPercent || 0) >= 0 ? "+" : ""}
                              {(trade.profitPercent || 0).toFixed(2)}%
                            </p>
                          </div>
                        </m.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <Activity className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {tCommon("no_recent_trades")}
                      </h3>
                      <p className="text-subtle-foreground">
                        {t("this_leader_hasnt_completed_any_trades_yet")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="markets">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Coins className="h-5 w-5 text-primary" />
                    {t("trading_markets")}
                  </CardTitle>
                  <p className="text-sm text-subtle-foreground">
                    {t("markets_this_leader_actively_trades_on")}
                  </p>
                </CardHeader>
                <CardContent>
                  {/* Same split as the trades tab: "No markets declared" is a
                      statement about the leader and must not be shown before we
                      have one. */}
                  {isLoading ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Array.from({ length: PENDING_MARKET_TILES }, (_, idx) => (
                          <div
                            key={`pending-market-${idx}`}
                            className="p-4 rounded-xl bg-muted dark:bg-muted/50 border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-surface-3 animate-pulse" />
                              <div>
                                <p className="font-semibold text-foreground">
                                  <Loadable loading placeholder="BTC/USDT" />
                                </p>
                                <p className="text-xs text-subtle-foreground">
                                  <Loadable loading placeholder="BTC / USDT" />
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : leaderData.markets && leaderData.markets.length > 0 ? (
                    <div className="space-y-6">
                      {(spotMarkets.length > 0 && binaryMarkets.length > 0
                        ? [
                            { label: tCommon("spot"), items: spotMarkets },
                            { label: tCommon("binary"), items: binaryMarkets },
                          ]
                        : [{ label: null, items: leaderData.markets }]
                      ).map((group) => (
                        <div key={group.label || "all"}>
                          {group.label && (
                            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                              {group.label}
                            </h4>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {group.items.map((market) => (
                              <div
                                key={market.id}
                                className="p-4 rounded-xl bg-muted dark:bg-muted/50 hover:bg-muted transition-colors border border-border"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">
                                      {(market.baseCurrency || market.symbol).slice(0, 3)}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-foreground">
                                      {market.symbol}
                                    </p>
                                    {market.marketType === "BINARY" ? (
                                      (market.minQuote ?? 0) > 0 && (
                                        <p className="text-xs text-subtle-foreground">
                                          {tCommon("min_stake")}: {market.minQuote}{" "}
                                          {market.quoteCurrency}
                                        </p>
                                      )
                                    ) : (
                                      <p className="text-xs text-subtle-foreground">
                                        {market.baseCurrency} / {market.quoteCurrency}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <Coins className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {t("no_markets_declared")}
                      </h3>
                      <p className="text-subtle-foreground">
                        {t("this_leader_hasnt_declared_any_trading_markets_yet")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <Card>
                <CardContent className="p-6">
                  {/* The plot area is a fixed `h-64`, so the pending state is
                      that same box rather than the "no data" panel, which is a
                      different height AND a claim about the leader's record. */}
                  {isLoading ? (
                    <div className="h-64 animate-pulse rounded-lg bg-muted" />
                  ) : leaderData.dailyStats && leaderData.dailyStats.length > 0 ? (
                    (() => {
                      // Cumulative daily profit (USDT) from the leader's stored
                      // daily stats — a real chart, matching the analytics page
                      // style, instead of a "coming soon" placeholder.
                      const series = [...leaderData.dailyStats].sort(
                        (a: any, b: any) =>
                          String(a.date).localeCompare(String(b.date))
                      );
                      let cum = 0;
                      const points = series.map((d: any) => {
                        cum += Number(d.profit) || 0;
                        return { date: d.date, cumulative: cum };
                      });
                      // Was a div bar chart scaled by `Math.abs(cumulative)`,
                      // so a leader who went underwater drew bars that grew
                      // UPWARD as the losses deepened — identical in height to
                      // the same figure in profit, distinguished only by fill.
                      // On a leaderboard where the whole point is judging a
                      // track record, that is the one thing it must not do.
                      return (
                        <div className="h-64">
                          <SeriesChart
                            data={points.slice(-30)}
                            series={[
                              {
                                key: "cumulative",
                                label: t("profit_over_time"),
                                // P&L is POLARITY, not identity: the bars this
                                // replaced were `bg-success`/`bg-destructive`
                                // by sign, so the track record keeps the
                                // direction-of-money tokens instead of taking a
                                // categorical ramp slot.
                                color:
                                  cum >= 0
                                    ? "hsl(var(--up))"
                                    : "hsl(var(--down))",
                              },
                            ]}
                            type="area"
                            xKey="date"
                            valueFormatter={(v) => `${v.toFixed(2)} USDT`}
                          />
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <LineChart className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {t("no_performance_data")}
                      </h3>
                      <p className="text-subtle-foreground">
                        {t("performance_history_will_appear_here_as")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </m.div>

        {/* Bottom CTA - Only show for visitors who aren't following */}
        {!leaderData.isFollowing && !isOwnProfile && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card className="bg-primary/10 overflow-hidden">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    {/*
                      This band is gated on `!isFollowing && !isOwnProfile`, and
                      BOTH of those are false while the profile is undefined —
                      so it renders during the fetch, which is correct for the
                      common case (a visitor who does not follow this leader)
                      and is why it is not withheld. But its two lines quote the
                      leader's NAME and MINIMUM, which were reading as an empty
                      name and a confident "0.00 USDT" — an offer to start
                      copying for nothing. Both wait.
                    */}
                    <h3 className="text-2xl font-bold mb-2">
                      {t("ready_to_follow")}{" "}
                      <Loadable loading={isLoading} placeholder={tExt("leader_name")}>
                        {leaderData.displayName}
                      </Loadable>
                      ?
                    </h3>
                    <p className="text-muted-foreground">
                      {t("start_copying_trades_with_as_little_as")}{" "}
                      <Loadable loading={isLoading} placeholder="100.00 USDT">
                        {formatAllocation(leaderData.minFollowAmount, "USDT")}
                      </Loadable>
                    </p>
                  </div>
                  <Link href={`/copy-trading/leader/${leaderData.id}/follow`}>
                    <Button size="lg" className="h-14 rounded-xl gap-2">
                      <Star className="h-5 w-5" />
                      {t("start_following")}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </m.div>
        )}
      </div>
    </div>
  );
}
