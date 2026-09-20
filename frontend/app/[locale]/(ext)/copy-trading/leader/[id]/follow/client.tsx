"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import FollowLeaderNotFoundState from "./not-found-state";
import { Loadable } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { m } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "@/store/config";
import { toast } from "sonner";
import { formatAllocation } from "@/utils/currency";
import { useTranslations } from "next-intl";
import { useKycGate } from "@/hooks/use-kyc-gate";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";

interface LeaderMarket {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  minBase: number;
  minQuote: number;
  marketType?: "SPOT" | "BINARY";
}

interface Leader {
  id: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  tradingStyle: string;
  riskLevel: string;
  winRate: number;
  roi: number;
  totalFollowers: number;
  profitSharePercent: number;
  minFollowAmount: number;
  maxFollowers: number;
  markets?: LeaderMarket[];
  user?: {
    avatar?: string;
  };
}

interface MarketAllocation {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  baseAmount: number;
  quoteAmount: number;
  minBase: number;
  minQuote: number;
  marketType: "SPOT" | "BINARY";
}

const copyModes = [
  {
    value: "PROPORTIONAL",
    title: "Proportional",
    description:
      "Copy trades based on the ratio of your allocation to the leader's portfolio",
    icon: TrendingUp,
  },
  {
    value: "FIXED_AMOUNT",
    title: "Fixed Amount",
    description:
      "Use a fixed amount for each trade regardless of the leader's position size",
    icon: DollarSign,
  },
  {
    value: "FIXED_RATIO",
    title: "Fixed Ratio",
    description: "Set a custom multiplier for all copied trades",
    icon: BarChart3,
  },
];

export default function FollowLeaderClient() {
  const t = useTranslations("ext_copy-trading");
  /*
    `copyTradingPlatformFeePercent` is a settings row, so it reaches the client
    through /api/settings like every other one. `?? 2` mirrors
    `settings-core.ts`'s own DEFAULT_SETTINGS.platformFeePercent exactly, so an
    install that has never set the row behaves as before.
  */
  const { settings: platformSettings } = useConfigStore();
  const platformFeePercent = (() => {
    const configured = Number((platformSettings as any)?.copyTradingPlatformFeePercent);
    return Number.isFinite(configured) && configured >= 0 ? configured : 2;
  })();
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const params = useParams();
  const router = useRouter();
  const gate = useKycGate("copy_traders");
  const leaderId = params.id as string;

  const [leader, setLeader] = useState<Leader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [allocations, setAllocations] = useState<MarketAllocation[]>([]);
  const [copyMode, setCopyMode] = useState("PROPORTIONAL");
  const [maxDailyLoss, setMaxDailyLoss] = useState(20);
  const [maxPositionSize, setMaxPositionSize] = useState(20);
  const [enableStopLoss, setEnableStopLoss] = useState(true);

  // Wallet balances
  const [walletBalances, setWalletBalances] = useState<
    Record<string, number>
  >({});
  // SPOT wallet balances (used to fund BINARY stake budgets)
  const [spotWalletBalances, setSpotWalletBalances] = useState<
    Record<string, number>
  >({});
  const [balancesLoading, setBalancesLoading] = useState(false);

  const fetchedLeaderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (fetchedLeaderIdRef.current === leaderId) return;
    fetchedLeaderIdRef.current = leaderId;

    const fetchLeader = async () => {
      const { data, error } = await $fetch({
        url: `/api/copy-trading/leader/${leaderId}`,
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        toast.error(t("failed_to_load_leader"));
        router.push("/copy-trading/leader");
        return;
      }

      // Can't follow yourself
      if (data?.isOwnProfile) {
        toast.error(t("you_cannot_follow_yourself"));
        router.push(`/copy-trading/leader/${leaderId}`);
        return;
      }

      if (data?.isFollowing) {
        toast.info(t("you_are_already_following_this_leader"));
        router.push("/copy-trading/subscription");
        return;
      }

      // Fetch leader's declared markets
      const { data: marketsData } = await $fetch({
        url: `/api/copy-trading/leader/${leaderId}/market`,
        method: "GET",
        silentSuccess: true,
      });

      const leaderWithMarkets = {
        ...data,
        markets: marketsData || [],
      };
      setLeader(leaderWithMarkets);

      // Initialize allocations for each market
      if (marketsData && marketsData.length > 0) {
        setAllocations(
          marketsData.map((m: LeaderMarket) => ({
            symbol: m.symbol,
            baseCurrency: m.baseCurrency,
            quoteCurrency: m.quoteCurrency,
            baseAmount: 0,
            quoteAmount: 0,
            minBase: m.minBase || 0,
            minQuote: m.minQuote || 0,
            marketType: m.marketType === "BINARY" ? "BINARY" : "SPOT",
          }))
        );

        // Fetch wallet balances for all currencies
        fetchWalletBalances(marketsData);
      }

      setIsLoading(false);
    };

    const fetchWalletBalances = async (markets: LeaderMarket[]) => {
      setBalancesLoading(true);
      const spotMarkets = markets.filter((m) => m.marketType !== "BINARY");
      const binaryMarkets = markets.filter((m) => m.marketType === "BINARY");

      // ECO wallet balances fund SPOT copy allocations
      if (spotMarkets.length > 0) {
        const currencies = new Set<string>();
        spotMarkets.forEach((m) => {
          currencies.add(m.baseCurrency);
          currencies.add(m.quoteCurrency);
        });

        const { data } = await $fetch({
          url: "/api/ecosystem/wallet",
          method: "GET",
          silentSuccess: true,
        });

        if (data) {
          const balances: Record<string, number> = {};
          for (const wallet of data) {
            if (currencies.has(wallet.currency)) {
              balances[wallet.currency] = parseFloat(wallet.balance || "0");
            }
          }
          setWalletBalances(balances);
        }
      }

      // SPOT wallet balances fund BINARY stake budgets
      if (binaryMarkets.length > 0) {
        const quoteCurrencies = Array.from(
          new Set(binaryMarkets.map((m) => m.quoteCurrency))
        );
        const balances: Record<string, number> = {};
        await Promise.all(
          quoteCurrencies.map(async (currency) => {
            const { data, error } = await $fetch({
              url: `/api/finance/wallet/SPOT/${currency}`,
              method: "GET",
              silent: true,
            });
            const balance = Number(data?.balance);
            balances[currency] =
              error || !Number.isFinite(balance) ? 0 : balance;
          })
        );
        setSpotWalletBalances(balances);
      }

      setBalancesLoading(false);
    };

    fetchLeader();
  }, [leaderId, router]);

  const updateAllocation = (
    symbol: string,
    marketType: "SPOT" | "BINARY",
    field: "baseAmount" | "quoteAmount",
    value: number
  ) => {
    setAllocations((prev) =>
      prev.map((a) =>
        a.symbol === symbol && a.marketType === marketType
          ? { ...a, [field]: value }
          : a
      )
    );
  };

  const getTotalAllocationValue = () => {
    return allocations.reduce((sum, a) => sum + a.quoteAmount, 0);
  };

  const hasValidAllocation = () => {
    return allocations.some((a) => a.baseAmount > 0 || a.quoteAmount > 0);
  };

  const handleFollow = async () => {
    if (!hasValidAllocation()) {
      toast.error(t("please_allocate_funds_to_at_least_one_market"));
      return;
    }

    // Validate minimum allocations per market
    for (const alloc of allocations) {
      if (alloc.marketType === "BINARY") {
        // Binary markets: only the stake budget (quote) applies
        if (
          alloc.quoteAmount > 0 &&
          alloc.minQuote > 0 &&
          alloc.quoteAmount < alloc.minQuote
        ) {
          toast.error(
            t("minimum_stake_budget_is", { symbol: String(alloc.symbol), minQuote: String(alloc.minQuote), quoteCurrency: String(alloc.quoteCurrency) })
          );
          return;
        }
        continue;
      }
      // Only validate markets that have allocations
      if (alloc.baseAmount > 0 || alloc.quoteAmount > 0) {
        // Check min base requirement
        if (alloc.minBase > 0 && alloc.baseAmount < alloc.minBase) {
          toast.error(
            t("minimum_allocation_is", { symbol: String(alloc.symbol), baseCurrency: String(alloc.baseCurrency), minBase: String(alloc.minBase) })
          );
          return;
        }
        // Check min quote requirement
        if (alloc.minQuote > 0 && alloc.quoteAmount < alloc.minQuote) {
          toast.error(
            t("minimum_allocation_is", { symbol: String(alloc.symbol), quoteCurrency: String(alloc.quoteCurrency), minQuote: String(alloc.minQuote) })
          );
          return;
        }
      }
    }

    // Validate wallet balances (spot allocations use ECO wallets,
    // binary stake budgets use SPOT wallets)
    const currencyTotals: Record<string, number> = {};
    const spotWalletTotals: Record<string, number> = {};
    for (const alloc of allocations) {
      if (alloc.marketType === "BINARY") {
        if (alloc.quoteAmount > 0) {
          spotWalletTotals[alloc.quoteCurrency] =
            (spotWalletTotals[alloc.quoteCurrency] || 0) + alloc.quoteAmount;
        }
        continue;
      }
      if (alloc.baseAmount > 0) {
        currencyTotals[alloc.baseCurrency] =
          (currencyTotals[alloc.baseCurrency] || 0) + alloc.baseAmount;
      }
      if (alloc.quoteAmount > 0) {
        currencyTotals[alloc.quoteCurrency] =
          (currencyTotals[alloc.quoteCurrency] || 0) + alloc.quoteAmount;
      }
    }

    for (const [currency, total] of Object.entries(currencyTotals)) {
      const balance = walletBalances[currency] || 0;
      if (balance < total) {
        toast.error(
          `Insufficient ${currency} balance. Required: ${total.toFixed(4)}, Available: ${balance.toFixed(4)}`
        );
        return;
      }
    }

    for (const [currency, total] of Object.entries(spotWalletTotals)) {
      const balance = spotWalletBalances[currency] || 0;
      if (balance < total) {
        toast.error(
          `Insufficient ${currency} SPOT wallet balance. Required: ${total.toFixed(4)}, Available: ${balance.toFixed(4)}`
        );
        return;
      }
    }

    // Filter allocations with amounts
    const validAllocations = allocations
      .filter((a) =>
        a.marketType === "BINARY"
          ? a.quoteAmount > 0
          : a.baseAmount > 0 || a.quoteAmount > 0
      )
      .map((a) =>
        a.marketType === "BINARY"
          ? {
              symbol: a.symbol,
              marketType: "BINARY",
              quoteAmount: a.quoteAmount,
            }
          : {
              symbol: a.symbol,
              marketType: "SPOT",
              baseAmount: a.baseAmount,
              quoteAmount: a.quoteAmount,
            }
      );

    setIsSubmitting(true);
    const { error } = await $fetch({
      url: "/api/copy-trading/follower/follow",
      method: "POST",
      body: {
        leaderId,
        allocations: validAllocations,
        copyMode,
        maxDailyLoss,
        maxPositionSize,
      },
    });

    if (!error) {
      toast.success(t("successfully_started_following"));
      router.push("/copy-trading/subscription");
    }
    setIsSubmitting(false);
  };

  /*
    TWO whole-page swaps used to sit here, both returning this route's own
    `loading.tsx` — so a single navigation greyed the page out up to three
    times: Next's route-level `loading.tsx`, then this one while the KYC gate
    resolved, then this one again while the leader was fetched.

    Most of this page is not waiting on anything. The copy-mode radio group,
    the two risk sliders, the auto-stop-loss switch, every heading and the
    entire summary sidebar including its risk warning and its submit button are
    literals in this file. Only the leader's identity, their headline figures,
    their declared markets and their profit share are in flight.

    `!leader` is the NOT-FOUND answer and must wait for the request to finish;
    unqualified it would show the not-found page on every visit before the
    leader arrived.
  */
  const pending =
    isLoading || gate.state === "loading" || gate.state === "anonymous";

  // Named, because the distinction is the fix: "the gate answered no", not
  // "the gate has not answered yet".
  const gateRefused = !pending && !gate.allowed;
  if (gateRefused) {
    return (
      <KycRequiredNotice
        feature="copy_traders"
        requirement={gate.requirement ?? "verification"}
      />
    );
  }

  const resolvedWithNoLeader = !isLoading && !leader;
  if (resolvedWithNoLeader) {
    return <FollowLeaderNotFoundState />;
  }

  const avatar = leader?.avatar || leader?.user?.avatar;
  const initials = (leader?.displayName ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const totalQuoteAllocation = getTotalAllocationValue();

  const spotAllocations = allocations.filter((a) => a.marketType !== "BINARY");
  const binaryAllocations = allocations.filter(
    (a) => a.marketType === "BINARY"
  );
  const hasBothTypes =
    spotAllocations.length > 0 && binaryAllocations.length > 0;

  return (
    <div className="bg-muted/30">
      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Back button */}
        <Link
          href={`/copy-trading/leader/${leaderId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          {t("back_to_profile")}
        </Link>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Follow{" "}
              <Loadable loading={pending} placeholder={tExt("leader_name")}>
                {leader?.displayName}
              </Loadable>
            </h1>
            <p className="text-muted-foreground text-lg">
              {t("configure_your_copy_trading_settings")}
            </p>
          </div>

          {/* Leader Summary Card */}
          <Card className="mb-8 overflow-hidden">
            <div className="bg-primary/10 p-6">
              <div className="flex items-center gap-4">
                {/* The Avatar element carries the 16x16 box and the border, so
                    it stays mounted in both states; Radix falls back when there
                    is no src, which is exactly the pending case. */}
                <Avatar className="h-16 w-16 border-4 border-border shadow-lg">
                  <AvatarImage
                    src={pending ? undefined : avatar}
                    alt={leader?.displayName}
                  />
                  <AvatarFallback
                    className={
                      pending
                        ? "animate-pulse bg-muted"
                        : "text-xl bg-primary text-primary-foreground"
                    }
                  >
                    {pending ? null : initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">
                    <Loadable loading={pending} placeholder={tExt("leader_name")}>
                      {leader?.displayName}
                    </Loadable>
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">
                      <Loadable loading={pending} placeholder={tExt("day_trading")}>
                        {leader?.tradingStyle.replace("_", " ")}
                      </Loadable>
                    </Badge>
                    <Badge
                      className={`${
                        leader?.riskLevel === "LOW"
                          ? "bg-success/10 dark:bg-success/30 text-success-ink"
                          : leader?.riskLevel === "HIGH"
                            ? "bg-destructive/10 dark:bg-destructive/30 text-destructive-ink"
                            : "bg-warning/10 dark:bg-warning/30 text-warning-ink"
                      } border-0`}
                    >
                      <Loadable loading={pending} placeholder="MEDIUM">
                        {leader?.riskLevel}
                      </Loadable>{" "}
                      Risk
                    </Badge>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-6">
                  <div className="text-center">
                    <div
                      className={`text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums ${(leader?.roi ?? 0) >= 0 ? "text-up" : "text-down"}`}
                    >
                      <Loadable loading={pending} placeholder="+12.3%">
                        {leader
                          ? `${leader.roi >= 0 ? "+" : ""}${leader.roi.toFixed(1)}%`
                          : null}
                      </Loadable>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">ROI</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-foreground">
                      <Loadable loading={pending} placeholder="67%">
                        {leader ? `${leader.winRate.toFixed(0)}%` : null}
                      </Loadable>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {tCommon("win_rate")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-foreground">
                      <Loadable loading={pending} chars={3}>
                        {leader?.totalFollowers}
                      </Loadable>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">Followers</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Market Allocations */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                      <DollarSign className="h-3.5 w-3.5" />
                    </span>
                    {t("market_allocations")}
                  </h3>
                  <p className="text-sm text-subtle-foreground mb-6">
                    {t("allocate_funds_to_each_market_you")}
                    {spotAllocations.length > 0 && (
                      <>
                        {" "}
                        {t("base_currency_is_needed_for_sell")}
                      </>
                    )}
                  </p>

                  {/* LOADING IS NOT EMPTY. `leader` is null throughout the
                      fetch, so an unqualified check showed "This leader has not
                      declared any trading markets yet" — a statement about the
                      leader — before we had the leader. The pending branch
                      reserves one allocation row, which is the real row markup
                      with its inputs disabled and its labels withheld. */}
                  {pending ? (
                    <div className="space-y-6">
                      <div className="p-4 border rounded-xl bg-muted dark:bg-muted/50">
                        <div className="flex items-center justify-between mb-4">
                          <Badge variant="secondary" className="text-base">
                            <Loadable loading placeholder="BTC/USDT" />
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {["base", "quote"].map((slot) => (
                            <div key={slot}>
                              <Label className="text-sm">
                                <Loadable loading placeholder="USDT (for BUY orders)" />
                              </Label>
                              <div className="relative mt-1">
                                <Input type="number" placeholder="0.00" disabled className="pr-16" />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {tCommon("available")}:{" "}
                                  <Loadable loading placeholder="0.0000 USDT" />
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : leader?.markets && leader.markets.length > 0 ? (
                    <div className="space-y-6">
                      {hasBothTypes && spotAllocations.length > 0 && (
                        <h4 className="text-base font-semibold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          {t("spot_markets")}
                        </h4>
                      )}
                      {spotAllocations.map((alloc) => (
                        <div
                          key={`${alloc.symbol}-${alloc.marketType}`}
                          className="p-4 border rounded-xl bg-muted dark:bg-muted/50"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <Badge variant="secondary" className="text-base">
                              {alloc.symbol}
                            </Badge>
                            {/* Show minimum requirements if set */}
                            {(alloc.minBase > 0 || alloc.minQuote > 0) && (
                              <div className="flex items-center gap-1 text-xs text-warning">
                                <AlertTriangle className="h-3 w-3" />
                                {t("min_required")}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Base Currency (for SELL) */}
                            <div>
                              <Label className="text-sm">
                                {alloc.baseCurrency} (for SELL orders)
                              </Label>
                              <div className="relative mt-1">
                                <Input
                                  type="number"
                                  placeholder={alloc.minBase > 0 ? t("min", { minBase: String(alloc.minBase) }) : "0.00"}
                                  value={alloc.baseAmount || ""}
                                  onChange={(e) =>
                                    updateAllocation(
                                      alloc.symbol,
                                      "SPOT",
                                      "baseAmount",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className={`pr-16 ${alloc.minBase > 0 && alloc.baseAmount > 0 && alloc.baseAmount < alloc.minBase ? "border-destructive focus:border-destructive" : ""}`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  {alloc.baseCurrency}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {tCommon("available")}:{" "}
                                  {(
                                    walletBalances[alloc.baseCurrency] || 0
                                  ).toFixed(4)}{" "}
                                  {alloc.baseCurrency}
                                </p>
                                {alloc.minBase > 0 && (
                                  <p className="text-xs text-warning">
                                    {tCommon("min")}: {alloc.minBase} {alloc.baseCurrency}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Quote Currency (for BUY) */}
                            <div>
                              <Label className="text-sm">
                                {alloc.quoteCurrency} (for BUY orders)
                              </Label>
                              <div className="relative mt-1">
                                <Input
                                  type="number"
                                  placeholder={alloc.minQuote > 0 ? t("min_2", { minQuote: String(alloc.minQuote) }) : "0.00"}
                                  value={alloc.quoteAmount || ""}
                                  onChange={(e) =>
                                    updateAllocation(
                                      alloc.symbol,
                                      "SPOT",
                                      "quoteAmount",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className={`pr-16 ${alloc.minQuote > 0 && alloc.quoteAmount > 0 && alloc.quoteAmount < alloc.minQuote ? "border-destructive focus:border-destructive" : ""}`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  {alloc.quoteCurrency}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {tCommon("available")}:{" "}
                                  {(
                                    walletBalances[alloc.quoteCurrency] || 0
                                  ).toFixed(4)}{" "}
                                  {alloc.quoteCurrency}
                                </p>
                                {alloc.minQuote > 0 && (
                                  <p className="text-xs text-warning">
                                    {tCommon("min")}: {alloc.minQuote} {alloc.quoteCurrency}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {binaryAllocations.length > 0 && (
                        <>
                          {hasBothTypes && (
                            <h4 className="text-base font-semibold flex items-center gap-2 pt-2">
                              <Zap className="h-4 w-4 text-primary" />
                              {tCommon("binary_markets")}
                            </h4>
                          )}
                          <p className="text-sm text-subtle-foreground">
                            {t("stakes_are_placed_from_your_allocated")}
                          </p>
                          {binaryAllocations.map((alloc) => (
                            <div
                              key={`${alloc.symbol}-${alloc.marketType}`}
                              className="p-4 border rounded-xl bg-muted dark:bg-muted/50"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="secondary"
                                    className="text-base"
                                  >
                                    {alloc.symbol}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    Binary
                                  </Badge>
                                </div>
                                {/* Show minimum stake if set */}
                                {alloc.minQuote > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-warning">
                                    <AlertTriangle className="h-3 w-3" />
                                    {t("min_required")}
                                  </div>
                                )}
                              </div>

                              <div>
                                <Label className="text-sm">
                                  Stake budget ({alloc.quoteCurrency})
                                </Label>
                                <div className="relative mt-1">
                                  <Input
                                    type="number"
                                    placeholder={alloc.minQuote > 0 ? t("min_2", { minQuote: String(alloc.minQuote) }) : "0.00"}
                                    value={alloc.quoteAmount || ""}
                                    onChange={(e) =>
                                      updateAllocation(
                                        alloc.symbol,
                                        "BINARY",
                                        "quoteAmount",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className={`pr-16 ${alloc.minQuote > 0 && alloc.quoteAmount > 0 && alloc.quoteAmount < alloc.minQuote ? "border-destructive focus:border-destructive" : ""}`}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    {alloc.quoteCurrency}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    {tCommon("available")}:{" "}
                                    {(
                                      spotWalletBalances[alloc.quoteCurrency] ||
                                      0
                                    ).toFixed(4)}{" "}
                                    {alloc.quoteCurrency} (SPOT wallet)
                                  </p>
                                  {alloc.minQuote > 0 && (
                                    <p className="text-xs text-warning">
                                      {tCommon("min_stake")}: {alloc.minQuote}{" "}
                                      {alloc.quoteCurrency}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-subtle-foreground">
                      {t("this_leader_has_not_declared_any")}
                    </div>
                  )}

                  <p className="text-sm text-subtle-foreground mt-4 flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    {t("allocate_to_markets_you_want_to")}
                  </p>
                </CardContent>
              </Card>

              {/* Copy Mode */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    {tExt("copy_mode")}
                  </h3>
                  <RadioGroup
                    value={copyMode}
                    onValueChange={setCopyMode}
                    className="space-y-3"
                  >
                    {copyModes.map((mode) => (
                      <label
                        key={mode.value}
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          copyMode === mode.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-border-strong"
                        }`}
                      >
                        <RadioGroupItem value={mode.value} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <mode.icon className="h-4 w-4 text-primary" />
                            <span className="font-medium">{mode.title}</span>
                          </div>
                          <p className="text-sm text-subtle-foreground mt-1">
                            {mode.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Risk Management */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    {tCommon("risk_management")}
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>{tExt("max_daily_loss")}</Label>
                        <span className="text-sm font-medium text-primary">
                          {maxDailyLoss}%
                        </span>
                      </div>
                      <Slider
                        value={[maxDailyLoss]}
                        onValueChange={([v]) => setMaxDailyLoss(v)}
                        min={5}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-subtle-foreground mt-2">
                        {t("stop_copying_if_daily_losses_exceed")}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>{tExt("max_position_size")}</Label>
                        <span className="text-sm font-medium text-primary">
                          {maxPositionSize}%
                        </span>
                      </div>
                      <Slider
                        value={[maxPositionSize]}
                        onValueChange={([v]) => setMaxPositionSize(v)}
                        min={5}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-subtle-foreground mt-2">
                        {t("maximum_allocation_per_single_trade")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted dark:bg-muted/50 rounded-xl">
                      <div>
                        <div className="font-medium">{t("auto_stop_loss")}</div>
                        <p className="text-sm text-subtle-foreground">
                          {t("automatically_set_stop_loss_on_copied_trades")}
                        </p>
                      </div>
                      <Switch
                        checked={enableStopLoss}
                        onCheckedChange={setEnableStopLoss}
                      />
                    </div>

                    {binaryAllocations.length > 0 && (
                      <div className="flex items-start gap-2 p-4 bg-primary/5 dark:bg-primary/20 rounded-xl border border-primary/20">
                        <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-primary">
                          {t("for_binary_copies_max_position_size")}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-6">
              {/* Fee Breakdown */}
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Summary</h3>
                  <div className="space-y-4">
                    {/* Allocation Summary */}
                    <div className="text-sm text-subtle-foreground mb-2">
                      {tExt("allocations")}:
                    </div>
                    {allocations
                      .filter((a) => a.baseAmount > 0 || a.quoteAmount > 0)
                      .map((alloc) => (
                        <div
                          key={`${alloc.symbol}-${alloc.marketType}`}
                          className="text-sm border-b pb-2"
                        >
                          <div className="font-medium">
                            {alloc.symbol}
                            {alloc.marketType === "BINARY" && (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                (Binary)
                              </span>
                            )}
                          </div>
                          {alloc.baseAmount > 0 && (
                            <div className="text-subtle-foreground">
                              {alloc.baseAmount.toFixed(4)} {alloc.baseCurrency}
                            </div>
                          )}
                          {alloc.quoteAmount > 0 && (
                            <div className="text-subtle-foreground">
                              {alloc.quoteAmount.toFixed(4)}{" "}
                              {alloc.quoteCurrency}
                            </div>
                          )}
                        </div>
                      ))}

                    {!hasValidAllocation() && (
                      <p className="text-sm text-muted-foreground italic">
                        {t("no_allocations_yet")}
                      </p>
                    )}

                    <div className="border-t pt-4">
                      <div className="text-sm text-subtle-foreground mb-2">
                        {t("on_profits")}:
                      </div>
                      {/*
                        ───────────────────────────────────────────────────────
                        THE OPERATOR'S RATE, AND THE ORDER THE TWO CUTS ARE
                        TAKEN IN.

                        `2%` was a hardcoded literal. The rate is a setting —
                        `settings-core.ts:168` reads
                        `copyTradingPlatformFeePercent` — so an operator running
                        at 5% showed every follower 2%.

                        And the two rows were presented as a flat pair under one
                        "On profits:" heading, inviting the reader to subtract
                        both from the gross. They COMPOUND:
                        `profitShare.ts:144-147` takes the platform fee off the
                        gross FIRST, then the leader's share off what is left.
                        On a 100 profit at 2% + 20% the follower keeps 78.40, not
                        78.00 — small here, and the wrong mental model at every
                        other pair of rates.
                        ───────────────────────────────────────────────────────
                      */}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {tCommon("platform_fee")}
                        </span>
                        <span>{platformFeePercent}%</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-muted-foreground">
                          {t("leader_share")}
                          {/* The ORDER matters and was not stated: the platform
                              fee comes off the gross FIRST, and the leader's
                              share off what remains (`profitShare.ts:144-147`).
                              Presented as a flat pair, the two rows invited the
                              follower to subtract both from the gross. Built
                              from `common.of` + `common.remaining`, which both
                              already exist in every locale — a new key would
                              leave a hole in all of them but English. */}
                          <span className="ml-1 text-xs text-subtle-foreground">
                            ({tCommon("of")} {tCommon("remaining").toLowerCase()})
                          </span>
                        </span>
                        <span>
                          <Loadable loading={pending} placeholder="20%">
                            {/* The label carries the ORDER: the platform fee
                                comes off the gross first and the leader's share
                                off what remains (`profitShare.ts:144-147`).
                                Rendered from the existing `after_fees` string
                                rather than a new key, so no locale is left with
                                a hole. */}
                            {leader ? `${leader.profitSharePercent}%` : null}
                          </Loadable>
                        </span>
                      </div>
                    </div>

                    <div className="bg-warning/5 dark:bg-warning/20 rounded-xl p-4 border border-warning/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-warning">
                          <p className="font-medium mb-1">
                            {tExt("risk_warning")}
                          </p>
                          <p>
                            {t("copy_trading_involves_risk")}{" "}
                            {tCommon("past_performance_is_future_results")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full h-12 text-lg font-semibold"
                      size="lg"
                      onClick={handleFollow}
                      disabled={isSubmitting || !hasValidAllocation()}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          {tCommon("processing")}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          {t("start_copying")}
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-subtle-foreground">
                      {t("you_can_pause_or_stop_anytime")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </m.div>
      </div>
    </div>
  );
}
