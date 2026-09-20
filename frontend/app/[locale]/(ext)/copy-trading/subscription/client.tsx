"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Badge } from "@/components/ui/badge";
import { Loadable } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Progress } from "@/components/ui/progress";
import { m } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Pause,
  Play,
  StopCircle,
  Plus,
  Loader2,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Wallet,
  Target,
  Zap,
  Shield,
  ExternalLink,
  Clock,
  ArrowUpRight,
  Sparkles,
  Trophy,
  ChevronDown,
  ChevronUp,
  Coins,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatPnL, formatAllocation } from "@/utils/currency";
import { HeroSection } from "@/components/ui/hero-section";
import { useTranslations } from "next-intl";
import { MoneyFigure } from "@/components/ui/money-figure";

interface AllocationDetail {
  id: string;
  symbol: string;
  baseAmount: number;
  baseUsedAmount: number;
  quoteAmount: number;
  quoteUsedAmount: number;
  totalProfit: number;
  totalTrades: number;
  winRate: number;
  isActive: boolean;
  marketType?: "SPOT" | "BINARY";
}

interface Subscription {
  id: string;
  leaderId: string;
  copyMode: string;
  totalProfit: number;
  /**
   * The unit `totalProfit` is in, from `calculateFollowerStats`. It is the
   * follower's own quote currency while every closed trade shares one, and
   * "USD" once the backend has had to convert across denominations. Optional
   * only because a response cached before this shipped will not carry it.
   */
  profitCurrency?: string;
  /** Denominations excluded from `totalProfit` for want of a USD rate. */
  unpricedProfitCurrencies?: string[];
  totalTrades: number;
  winRate: number;
  roi: number;
  /**
   * False when the backend could not price part of this subscription's profit,
   * which leaves the ROI a ratio of two different portfolios. `roi` is 0 then —
   * a dash, not "0.00%", which a follower reads as flat.
   */
  roiAvailable?: boolean;
  status: string;
  createdAt: string;
  totalAllocatedUSDT?: number; // Calculated by backend using ECO prices
  allocations?: AllocationDetail[];
  leader?: {
    id: string;
    displayName: string;
    avatar?: string;
    tradingStyle: string;
    riskLevel: string;
    winRate: number;
    roi: number;
    user?: {
      avatar?: string;
    };
  };
}

const tradingStyleInfo: Record<string, { icon: any; color: string; bg: string }> = {
  SCALPING: { icon: Zap, color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/20' },
  DAY_TRADING: { icon: BarChart3, color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/20' },
  SWING: { icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/20' },
  POSITION: { icon: Shield, color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/20' },
};

/** LOW/MEDIUM/HIGH are rungs in the central `STATUS_TONE` table. */
const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"];

/**
 * Subscription rows to reserve while the list is in flight, and the row shape
 * that feeds them.
 *
 * These objects are NEVER READ AS VALUES — every field they carry is behind a
 * `Loadable` in the card below, so what they actually do is let the ONE card
 * body render in both states instead of the page keeping a second copy of a
 * 270-line card as a "skeleton". `allocations` is a single empty entry so the
 * market-allocations toggle bar (~44px, present on every real subscription)
 * is reserved rather than appearing when the data lands.
 */
const PENDING_SUBSCRIPTION_COUNT = 2;

const PENDING_SUBSCRIPTIONS: Subscription[] = Array.from(
  { length: PENDING_SUBSCRIPTION_COUNT },
  (_, i) => ({
    id: `pending-${i}`,
    leaderId: `pending-${i}`,
    copyMode: "FIXED_AMOUNT",
    totalProfit: 0,
    totalTrades: 0,
    winRate: 0,
    roi: 0,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    allocations: [],
    leader: {
      id: `pending-${i}`,
      displayName: "",
      tradingStyle: "DAY_TRADING",
      riskLevel: "MEDIUM",
      winRate: 0,
      roi: 0,
    },
  })
);

export default function SubscriptionClient() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "pause" | "resume" | "stop";
    subscription: Subscription;
  } | null>(null);
  const [expandedAllocations, setExpandedAllocations] = useState<Set<string>>(new Set());

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchSubscriptions = async () => {
      try {
        const { data } = await $fetch({
          url: "/api/copy-trading/follower",
          method: "GET",
          silentSuccess: true,
        });
        setSubscriptions(data || []);
      } catch (error) {
        console.error("Failed to fetch subscriptions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const refetchSubscriptions = async () => {
    const { data } = await $fetch({
      url: "/api/copy-trading/follower",
      method: "GET",
      silentSuccess: true,
    });
    setSubscriptions(data || []);
  };

  const handleAction = async (
    action: "pause" | "resume" | "stop",
    subscriptionId: string
  ) => {
    setActionLoading(subscriptionId);
    const { error } = await $fetch({
      url: `/api/copy-trading/follower/${subscriptionId}/${action}`,
      method: "POST",
    });

    if (!error) {
      refetchSubscriptions();
    }
    setActionLoading(null);
    setConfirmAction(null);
  };

  const toggleAllocations = (subscriptionId: string) => {
    setExpandedAllocations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subscriptionId)) {
        newSet.delete(subscriptionId);
      } else {
        newSet.add(subscriptionId);
      }
      return newSet;
    });
  };

  const statusIcons: Record<string, ReactNode> = {
    ACTIVE: (
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
    ),
    PAUSED: <Pause className="h-3 w-3 mr-1" />,
    STOPPED: <StopCircle className="h-3 w-3 mr-1" />,
    PENDING: <Clock className="h-3 w-3 mr-1" />,
  };

  /**
   * `loading` skeletons the LABEL rather than the pill.
   *
   * The pill is chrome — same box, same icon slot — but the word inside it is a
   * fact about the subscription, and the pending row's placeholder status would
   * otherwise assert "ACTIVE" for something that may be paused or stopped.
   */
  const getStatusBadge = (status: string, loading = false) => (
    <StatusBadge
      status={status}
      icon={statusIcons[status]}
      label={loading ? <Loadable loading placeholder="ACTIVE" /> : undefined}
    />
  );

  // Calculate totals
  const totalMarkets = subscriptions.reduce((sum, s) => sum + (s.allocations?.filter(a => a.isActive).length || 0), 0);

  /**
   * TOTAL PROFIT, ONE FIGURE PER UNIT.
   *
   * This was `subscriptions.reduce((sum, s) => sum + s.totalProfit)` printed
   * through `formatPnL(total, "USDT")`. Every term in it was a different kind
   * of money: a follower copying one leader on BTC/USDT and another on NEO/ETH
   * had 300 USDT of gains and 0.4 ETH of gains added together and labelled
   * "+300.40 USDT" — off by roughly $1,300, and in a direction that changed
   * whenever ETH moved.
   *
   * `profitCurrency` is what the backend converted each subscription into, and
   * the only figures that may be added are the ones that agree on it. A single
   * unit — what nearly every account has — still renders as one line; two or
   * more render as two lines rather than as one wrong one.
   */
  const profitByCurrency = subscriptions.reduce<Record<string, number>>((acc, s) => {
    const amount = s.totalProfit ?? 0;
    // A subscription that has realised nothing has no unit yet — the backend
    // labels it "USD" by default — and bucketing that zero gave an account that
    // has only ever held USDT a "$0.00" line of its own.
    if (!amount) return acc;
    const unit = s.profitCurrency || "USD";
    acc[unit] = (acc[unit] || 0) + amount;
    return acc;
  }, {});
  const profitUnits = Object.keys(profitByCurrency);
  // The card's OWN tone: every unit up. Each line below carries its own sign.
  const profitIsUp = profitUnits.every((unit) => profitByCurrency[unit] >= 0);

  /**
   * Denominations the backend could not price into any total. Saying so is the
   * difference between a figure that is incomplete and one that is wrong —
   * folding them in as zero would quietly under-report the follower's profit.
   */
  const unpricedProfit = Array.from(
    new Set(subscriptions.flatMap((s) => s.unpricedProfitCurrencies ?? []))
  );

  const activeCount = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const totalTrades = subscriptions.reduce((sum, s) => sum + (s.totalTrades ?? 0), 0);
  // A withheld ROI arrives as 0, which is not an ROI of zero: averaging it in
  // halved the headline percentage of a follower whose other leader is up 40%.
  const roiSamples = subscriptions.filter((s) => s.roiAvailable !== false);
  const avgRoi = roiSamples.length > 0
    ? roiSamples.reduce((sum, s) => sum + (s.roi ?? 0), 0) / roiSamples.length
    : 0;
  const avgWinRate = subscriptions.length > 0
    ? subscriptions.reduce((sum, s) => sum + (s.winRate ?? 0), 0) / subscriptions.length
    : 0;

  // Calculate total allocated in USDT
  // Backend calculates this using ECO prices (getEcoPriceInUSD) for accurate conversion
  const totalAllocated = subscriptions.reduce((sum, s) => {
    return sum + (s.totalAllocatedUSDT || 0);
  }, 0);

  /*
    `if (isLoading) return <SubscriptionLoading/>` used to sit here — the
    route's own `loading.tsx`, rendered a second time from inside the client, so
    one navigation to /copy-trading/subscription greyed the page out twice.

    The hero, its "Follow new leader" button, the six summary KPIs and every
    card's frame, labels and action buttons are all structure. Below, the same
    card body renders in both states over `displayedSubscriptions`; only the
    figures inside it wait.
  */
  const displayedSubscriptions = isLoading
    ? PENDING_SUBSCRIPTIONS
    : subscriptions;

  return (
    /* Nothing paints on this root. The `HeroSection` below brings
       `WorkspaceGround` with it, and an opaque root is drawn after the
       `-z-10` ground, not behind it — the grid and the accent stop were being
       composited and never reached the screen. `min-h-screen` is load-bearing:
       the ground is `fixed`, so the page still has to fill the viewport. */
    <div className="min-h-screen">
      {/* Hero Header */}
      <HeroSection
        badge={{
          icon: <Users className="h-3.5 w-3.5" />,
          text: "My Subscriptions",
        }}
        title={tExt("active_subscriptions")}
        description={t("monitor_and_manage_your_copy_trading")}
        layout="split"
        rightContent={
          <div className="lg:mt-8">
            <Link href="/copy-trading/leader">
              <Button size="lg" className="rounded-xl w-full sm:w-auto">
                <Plus className="mr-2 h-5 w-5" />
                {t("follow_new_leader")}
              </Button>
            </Link>
          </div>
        }
      />

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards.
            Gated on the RESOLVED list as well as the pending one: a row of six
            KPI cards is ~130px, and appearing only after the fetch pushed the
            whole subscription list down by that much. An account with genuinely
            no subscriptions still collapses it. */}
        {(isLoading || subscriptions.length > 0) && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8"
          >
            {/* Total Allocated */}
            <StatsCard
              label={tExt("total_allocated")}
              value={
                <MoneyFigure value={formatAllocation(totalAllocated, "USDT")} />
              }
              icon={Wallet}
              loading={isLoading}
              {...statsCardColors.primary}
            />

            {/* Total Profit — one line per unit, never a cross-currency sum. */}
            <StatsCard
              label={tCommon("total_profit")}
              value={
                <span
                  className={cn(
                    // Two units is two figures. Only then does the tile need to
                    // stack them, and it steps the type down so a second line
                    // fits the card instead of growing the whole KPI row.
                    profitUnits.length > 1 &&
                      "flex flex-col items-start gap-0.5 text-lg leading-tight"
                  )}
                >
                  {profitUnits.length === 0 ? (
                    <span className="text-success">
                      <MoneyFigure value="0.00" />
                    </span>
                  ) : (
                    // Per LINE, not per card: one colour across every unit
                    // painted "+120 USDT" and "-0.4 BTC" the same green.
                    profitUnits.map((unit) => (
                      <span
                        key={unit}
                        className={
                          profitByCurrency[unit] >= 0
                            ? "text-success"
                            : "text-destructive"
                        }
                      >
                        <MoneyFigure
                          value={formatPnL(profitByCurrency[unit], unit).formatted}
                        />
                      </span>
                    ))
                  )}
                </span>
              }
              description={
                unpricedProfit.length > 0
                  ? `Excludes ${unpricedProfit.join(", ")} — no exchange rate`
                  : undefined
              }
              icon={profitIsUp ? TrendingUp : TrendingDown}
              loading={isLoading}
              {...(profitIsUp
                ? statsCardColors.success
                : statsCardColors.red)}
            />

            {/* Avg ROI */}
            <StatsCard
              label={t("avg_roi")}
              value={
                <span
                  className={`font-mono tabular-nums ${
                    avgRoi >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {avgRoi >= 0 ? "+" : ""}
                  {(avgRoi ?? 0).toFixed(2)}%
                </span>
              }
              icon={Target}
              loading={isLoading}
              {...(avgRoi >= 0 ? statsCardColors.success : statsCardColors.red)}
            />

            {/* Active Count */}
            <StatsCard
              label="Active"
              value={activeCount}
              icon={Users}
              loading={isLoading}
              {...statsCardColors.primary}
            />

            {/* Total Trades */}
            <StatsCard
              label={tCommon("total_trades")}
              value={totalTrades.toLocaleString()}
              icon={Activity}
              loading={isLoading}
              {...statsCardColors.warning}
            />

            {/* Avg Win Rate */}
            <StatsCard
              label={tCommon('avg_win_rate')}
              value={`${(avgWinRate ?? 0).toFixed(1)}%`}
              icon={Trophy}
              loading={isLoading}
              {...statsCardColors.primary}
            />
          </m.div>
        )}

        {/* Subscriptions List */}
        {/* LOADING IS NOT EMPTY. `subscriptions` is `[]` for the whole fetch,
            so an unqualified check here would show "No subscriptions yet — you
            haven't subscribed to any leaders" to every existing subscriber
            before their list arrived. */}
        {displayedSubscriptions.length > 0 ? (
          <div className="space-y-4">
            {displayedSubscriptions.map((subscription, idx) => {
              const leader = subscription.leader;
              if (!leader) return null;

              const avatar = leader.avatar || leader.user?.avatar;
              const initials = leader.displayName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              const styleInfo = tradingStyleInfo[leader.tradingStyle] || tradingStyleInfo.DAY_TRADING;
              const StyleIcon = styleInfo.icon;
              // Unrecognised levels keep the old fallback to MEDIUM.
              const riskLevel = RISK_LEVELS.includes(leader.riskLevel)
                ? leader.riskLevel
                : "MEDIUM";
              const isPositiveRoi = (subscription.roi ?? 0) >= 0;
              // No ROI at all: an up-arrow in green over a withheld figure is
              // the same lie as printing 0.00% for it.
              const roiKnown = subscription.roiAvailable !== false;

              return (
                <m.div
                  key={subscription.id || `subscription-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Leader Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="relative">
                            {/* The Avatar element carries the 16x16 box and the
                                ring, so it stays mounted; only what it holds
                                waits. Radix falls back when there is no src. */}
                            <Avatar className="h-16 w-16 ring-2 ring-card shadow-lg">
                              <AvatarImage
                                src={isLoading ? undefined : avatar}
                                alt={leader.displayName}
                              />
                              <AvatarFallback
                                className={
                                  isLoading
                                    ? "animate-pulse bg-muted"
                                    : "bg-primary text-primary-foreground text-lg font-bold"
                                }
                              >
                                {isLoading ? null : initials}
                              </AvatarFallback>
                            </Avatar>
                            {subscription.status === "ACTIVE" && (
                              <span className="absolute bottom-0 right-0 w-4 h-4 bg-success border-2 border-border rounded-full" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Link href={`/copy-trading/leader/${leader.id}`}>
                                <h3 className="font-bold text-lg hover:text-primary transition-colors flex items-center gap-1.5 text-foreground">
                                  <Loadable loading={isLoading} placeholder={tExt("leader_name")}>
                                    {leader.displayName}
                                  </Loadable>
                                  <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                                </h3>
                              </Link>
                              {getStatusBadge(subscription.status, isLoading)}
                            </div>

                            <div className="flex items-center flex-wrap gap-2">
                              <Badge className={`${styleInfo.bg} ${styleInfo.color} border-0`}>
                                <StyleIcon className="h-3 w-3 mr-1" />
                                <Loadable loading={isLoading} placeholder={tExt("day_trading")}>
                                  {leader.tradingStyle.replace("_", " ")}
                                </Loadable>
                              </Badge>
                              <StatusBadge
                                status={riskLevel}
                                label={
                                  <Loadable loading={isLoading} placeholder="MEDIUM">
                                    {leader.riskLevel}
                                  </Loadable>
                                }
                              />
                              <Badge variant="outline" className="text-subtle-foreground border-border">
                                <Target className="h-3 w-3 mr-1" />
                                <Loadable loading={isLoading} placeholder={tCommon("fixed_amount")}>
                                  {subscription.copyMode.replace("_", " ")}
                                </Loadable>
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Since{" "}
                                <Loadable loading={isLoading} placeholder="01/01/2026">
                                  {new Date(subscription.createdAt).toLocaleDateString()}
                                </Loadable>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
                          <div className="text-center p-3 rounded-lg bg-muted dark:bg-muted/50">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Markets</div>
                            <div className="text-lg font-semibold tracking-tight text-foreground font-mono tabular-nums">
                              <Loadable loading={isLoading} chars={2}>
                                {subscription.allocations?.filter(a => a.isActive).length || 0}
                              </Loadable>
                            </div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted dark:bg-muted/50">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Profit</div>
                            <div
                              className={`text-lg font-semibold tracking-tight ${
                                (subscription.totalProfit ?? 0) >= 0
                                  ? 'text-success'
                                  : 'text-destructive'
                              }`}
                            >
                              {/* The unit is the one the backend converted this
                                  subscription's profit into, not a literal
                                  "USDT": a follower copying an ETH-quoted
                                  leader had their ETH profit labelled USDT. */}
                              <Loadable loading={isLoading} placeholder="+1,234.00 USDT">
                                <MoneyFigure
                                  value={
                                    formatPnL(
                                      subscription.totalProfit ?? 0,
                                      subscription.profitCurrency || "USD"
                                    ).formatted
                                  }
                                />
                              </Loadable>
                            </div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted dark:bg-muted/50">
                            <div className="text-xs font-medium text-muted-foreground mb-1">ROI</div>
                            <div
                              className={`text-lg font-semibold tracking-tight font-mono tabular-nums flex items-center justify-center gap-1 ${
                                !roiKnown
                                  ? 'text-muted-foreground'
                                  : isPositiveRoi
                                  ? 'text-success'
                                  : 'text-destructive'
                              }`}
                            >
                              {roiKnown &&
                                (isPositiveRoi ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                ))}
                              <Loadable loading={isLoading} placeholder="12.34%">
                                {/* Withheld, not zero: part of this
                                    subscription's profit has no exchange rate,
                                    so the ratio would count a portfolio the
                                    numerator does not. */}
                                {subscription.roiAvailable === false
                                  ? "—"
                                  : `${(subscription.roi ?? 0).toFixed(2)}%`}
                              </Loadable>
                            </div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted dark:bg-muted/50">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Trades</div>
                            <div className="text-lg font-semibold tracking-tight text-foreground font-mono tabular-nums">
                              <Loadable loading={isLoading} chars={3}>
                                {subscription.totalTrades ?? 0}
                              </Loadable>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 lg:border-l lg:pl-6 lg:border-border dark:lg:border-border-strong">
                          {subscription.status !== "STOPPED" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="rounded-xl">
                                  {actionLoading === subscription.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreVertical className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {subscription.status === "ACTIVE" ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setConfirmAction({
                                        type: "pause",
                                        subscription,
                                      })
                                    }
                                    className="gap-2"
                                  >
                                    <Pause className="h-4 w-4" />
                                    {t("pause_copying")}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setConfirmAction({
                                        type: "resume",
                                        subscription,
                                      })
                                    }
                                    className="gap-2"
                                  >
                                    <Play className="h-4 w-4" />
                                    {t("resume_copying")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive gap-2"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "stop",
                                      subscription,
                                    })
                                  }
                                >
                                  <StopCircle className="h-4 w-4" />
                                  {t("stop_subscription")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <Link href={`/copy-trading/leader/${leader.id}`}>
                            <Button
                              variant="outline"
                              className="rounded-xl gap-2 hover:bg-primary/5 hover:border-primary"
                            >
                              {tExt("view_leader")}
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Market Allocations Section */}
                      {/* Reserved while pending: this toggle bar is ~44px and
                          every real subscription has at least one allocation, so
                          skipping it made each card that much shorter than the
                          one it was about to become. */}
                      {(isLoading ||
                        (subscription.allocations && subscription.allocations.length > 0)) && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <button
                            onClick={() => toggleAllocations(subscription.id)}
                            className="flex items-center justify-between w-full text-left hover:bg-muted dark:hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Coins className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm text-muted-foreground">
                                {t("market_allocations")}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                <Loadable loading={isLoading} chars={1}>
                                  {subscription.allocations?.length}
                                </Loadable>{" "}
                                markets
                              </Badge>
                            </div>
                            {expandedAllocations.has(subscription.id) ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>

                          {expandedAllocations.has(subscription.id) && (
                            <m.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 space-y-3"
                            >
                              {(subscription.allocations ?? []).map((alloc) => {
                                const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");
                                const baseAvailable = (alloc.baseAmount ?? 0) - (alloc.baseUsedAmount ?? 0);
                                const quoteAvailable = (alloc.quoteAmount ?? 0) - (alloc.quoteUsedAmount ?? 0);
                                const baseUsedPercent = (alloc.baseAmount ?? 0) > 0
                                  ? ((alloc.baseUsedAmount ?? 0) / (alloc.baseAmount ?? 0)) * 100
                                  : 0;
                                const quoteUsedPercent = (alloc.quoteAmount ?? 0) > 0
                                  ? ((alloc.quoteUsedAmount ?? 0) / (alloc.quoteAmount ?? 0)) * 100
                                  : 0;

                                return (
                                  <div
                                    key={alloc.id}
                                    className={`p-4 rounded-xl border ${
                                      alloc.isActive
                                        ? "bg-muted dark:bg-muted/30 border-border"
                                        : "bg-muted dark:bg-muted/50 border-border-strong opacity-60"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-foreground">
                                          {alloc.symbol}
                                        </span>
                                        {alloc.marketType === "BINARY" && (
                                          <Badge className="bg-primary/10 dark:bg-primary/20 text-primary-ink border-0 text-xs">
                                            Binary
                                          </Badge>
                                        )}
                                        {!alloc.isActive && (
                                          <Badge variant="outline" className="text-xs text-subtle-foreground">
                                            Inactive
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4 text-sm">
                                        <span className="text-subtle-foreground">
                                          {alloc.totalTrades ?? 0} trades
                                        </span>
                                        <span className="text-subtle-foreground">
                                          {(alloc.winRate ?? 0).toFixed(1)}% win rate
                                        </span>
                                        <span
                                          className={`font-medium ${
                                            (alloc.totalProfit ?? 0) >= 0
                                              ? "text-success"
                                              : "text-destructive"
                                          }`}
                                        >
                                          {(alloc.totalProfit ?? 0) >= 0 ? "+" : ""}
                                          {(alloc.totalProfit ?? 0).toFixed(2)} {quoteCurrency}
                                        </span>
                                      </div>
                                    </div>

                                    {alloc.marketType === "BINARY" ? (
                                      /* Binary Stake Budget (quote only) */
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-subtle-foreground">
                                            Stake budget ({quoteCurrency})
                                          </span>
                                          <span className="text-muted-foreground">
                                            {quoteAvailable.toFixed(2)} / {(alloc.quoteAmount ?? 0).toFixed(2)}
                                          </span>
                                        </div>
                                        <Progress value={quoteUsedPercent} className="h-1.5" />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                          <span>{tExt("used")}: {(alloc.quoteUsedAmount ?? 0).toFixed(2)}</span>
                                          <span>{quoteUsedPercent.toFixed(1)}%</span>
                                        </div>
                                      </div>
                                    ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                      {/* Base Currency Allocation */}
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-subtle-foreground">
                                            {baseCurrency} (for SELL)
                                          </span>
                                          <span className="text-muted-foreground">
                                            {baseAvailable.toFixed(6)} / {(alloc.baseAmount ?? 0).toFixed(6)}
                                          </span>
                                        </div>
                                        <Progress value={baseUsedPercent} className="h-1.5" />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                          <span>{tExt("used")}: {(alloc.baseUsedAmount ?? 0).toFixed(6)}</span>
                                          <span>{baseUsedPercent.toFixed(1)}%</span>
                                        </div>
                                      </div>

                                      {/* Quote Currency Allocation */}
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-subtle-foreground">
                                            {quoteCurrency} (for BUY)
                                          </span>
                                          <span className="text-muted-foreground">
                                            {quoteAvailable.toFixed(2)} / {(alloc.quoteAmount ?? 0).toFixed(2)}
                                          </span>
                                        </div>
                                        <Progress value={quoteUsedPercent} className="h-1.5" />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                          <span>{tExt("used")}: {(alloc.quoteUsedAmount ?? 0).toFixed(2)}</span>
                                          <span>{quoteUsedPercent.toFixed(1)}%</span>
                                        </div>
                                      </div>
                                    </div>
                                    )}
                                  </div>
                                );
                              })}
                            </m.div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </m.div>
              );
            })}
          </div>
        ) : (
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card>
              <CardContent className="py-20 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-surface-3 rounded-lg flex items-center justify-center">
                  <Users className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-foreground">{t("no_subscriptions_yet")}</h3>
                <p className="text-subtle-foreground mb-8 max-w-md mx-auto">
                  {t("you_havent_subscribed_to_any_leaders_yet")} {t("start_following_top_traders_to_automatically")}
                </p>
                <Link href="/copy-trading/leader">
                  <Button size="lg">
                    <Sparkles className="h-5 w-5" />
                    {t("explore_leaders")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </m.div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmAction?.type === "pause" && <Pause className="h-5 w-5 text-warning" />}
              {confirmAction?.type === "resume" && <Play className="h-5 w-5 text-success" />}
              {confirmAction?.type === "stop" && <StopCircle className="h-5 w-5 text-destructive" />}
              {confirmAction?.type === "pause"
                ? t("pause_subscription")
                : confirmAction?.type === "resume"
                ? t("resume_subscription")
                : t("stop_subscription")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "stop"
                ? t("this_will_permanently_stop_copying_trades")
                : confirmAction?.type === "pause"
                ? t("pausing_will_temporarily_stop_copying_trades")
                : t("resume_copying_trades_from_this_leader")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmAction &&
                handleAction(confirmAction.type, confirmAction.subscription.id)
              }
              className={`rounded-xl ${
                confirmAction?.type === "stop"
                  ? "bg-destructive hover:bg-destructive"
                  : confirmAction?.type === "resume"
                  ? "bg-success hover:bg-success"
                  : ""
              }`}
            >
              {confirmAction?.type === "pause" && tCommon("pause")}
              {confirmAction?.type === "resume" && tCommon("resume")}
              {confirmAction?.type === "stop" && t("stop_subscription")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
