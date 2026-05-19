"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import FollowLeaderLoading from "./loading";
import FollowLeaderNotFoundState from "./not-found-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
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
import { toast } from "sonner";
import { formatAllocation } from "@/utils/currency";
import { useTranslations } from "next-intl";

interface LeaderMarket {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  minBase: number;
  minQuote: number;
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
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const params = useParams();
  const router = useRouter();
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
        toast.error("Failed to load leader");
        router.push("/copy-trading/leader");
        return;
      }

      // Can't follow yourself
      if (data?.isOwnProfile) {
        toast.error("You cannot follow yourself");
        router.push(`/copy-trading/leader/${leaderId}`);
        return;
      }

      if (data?.isFollowing) {
        toast.info("You are already following this leader");
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
          }))
        );

        // Fetch wallet balances for all currencies
        fetchWalletBalances(marketsData);
      }

      setIsLoading(false);
    };

    const fetchWalletBalances = async (markets: LeaderMarket[]) => {
      setBalancesLoading(true);
      const currencies = new Set<string>();
      markets.forEach((m) => {
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
      setBalancesLoading(false);
    };

    fetchLeader();
  }, [leaderId, router]);

  const updateAllocation = (
    symbol: string,
    field: "baseAmount" | "quoteAmount",
    value: number
  ) => {
    setAllocations((prev) =>
      prev.map((a) => (a.symbol === symbol ? { ...a, [field]: value } : a))
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
      toast.error("Please allocate funds to at least one market");
      return;
    }

    // Validate minimum allocations per market
    for (const alloc of allocations) {
      // Only validate markets that have allocations
      if (alloc.baseAmount > 0 || alloc.quoteAmount > 0) {
        // Check min base requirement
        if (alloc.minBase > 0 && alloc.baseAmount < alloc.minBase) {
          toast.error(
            `${alloc.symbol}: Minimum ${alloc.baseCurrency} allocation is ${alloc.minBase}`
          );
          return;
        }
        // Check min quote requirement
        if (alloc.minQuote > 0 && alloc.quoteAmount < alloc.minQuote) {
          toast.error(
            `${alloc.symbol}: Minimum ${alloc.quoteCurrency} allocation is ${alloc.minQuote}`
          );
          return;
        }
      }
    }

    // Validate wallet balances
    const currencyTotals: Record<string, number> = {};
    for (const alloc of allocations) {
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

    // Filter allocations with amounts
    const validAllocations = allocations
      .filter((a) => a.baseAmount > 0 || a.quoteAmount > 0)
      .map((a) => ({
        symbol: a.symbol,
        baseAmount: a.baseAmount,
        quoteAmount: a.quoteAmount,
      }));

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
      toast.success("Successfully started following!");
      router.push("/copy-trading/subscription");
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <FollowLeaderLoading />;
  }

  if (!leader) {
    return <FollowLeaderNotFoundState />;
  }

  const avatar = leader.avatar || leader.user?.avatar;
  const initials = leader.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const totalQuoteAllocation = getTotalAllocationValue();

  return (
    <div className="bg-muted/30 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Back button */}
        <Link
          href={`/copy-trading/leader/${leaderId}`}
          className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-primary mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          {t("back_to_profile")}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              Follow {leader.displayName}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              {t("configure_your_copy_trading_settings")}
            </p>
          </div>

          {/* Leader Summary Card */}
          <Card className="mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10 p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-white dark:border-zinc-800 shadow-lg">
                  <AvatarImage src={avatar} alt={leader.displayName} />
                  <AvatarFallback className="text-xl bg-gradient-to-br from-primary to-purple-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {leader.displayName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">
                      {leader.tradingStyle.replace("_", " ")}
                    </Badge>
                    <Badge
                      className={`${
                        leader.riskLevel === "LOW"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                          : leader.riskLevel === "HIGH"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                      } border-0`}
                    >
                      {leader.riskLevel} Risk
                    </Badge>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-6">
                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold ${leader.roi >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
                    >
                      {leader.roi >= 0 ? "+" : ""}
                      {leader.roi.toFixed(1)}%
                    </div>
                    <div className="text-xs text-zinc-500">ROI</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {leader.winRate.toFixed(0)}%
                    </div>
                    <div className="text-xs text-zinc-500">
                      {tCommon("win_rate")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {leader.totalFollowers}
                    </div>
                    <div className="text-xs text-zinc-500">Followers</div>
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
                    <DollarSign className="h-5 w-5 text-primary" />
                    Market Allocations
                  </h3>
                  <p className="text-sm text-zinc-500 mb-6">
                    Allocate funds to each market you want to copy trades on.
                    Base currency is needed for SELL orders, quote currency for
                    BUY orders.
                  </p>

                  {leader.markets && leader.markets.length > 0 ? (
                    <div className="space-y-6">
                      {allocations.map((alloc) => (
                        <div
                          key={alloc.symbol}
                          className="p-4 border rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <Badge variant="secondary" className="text-base">
                              {alloc.symbol}
                            </Badge>
                            {/* Show minimum requirements if set */}
                            {(alloc.minBase > 0 || alloc.minQuote > 0) && (
                              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3" />
                                Min required
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
                                  placeholder={alloc.minBase > 0 ? `Min: ${alloc.minBase}` : "0.00"}
                                  value={alloc.baseAmount || ""}
                                  onChange={(e) =>
                                    updateAllocation(
                                      alloc.symbol,
                                      "baseAmount",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className={`pr-16 ${alloc.minBase > 0 && alloc.baseAmount > 0 && alloc.baseAmount < alloc.minBase ? "border-red-500 focus:border-red-500" : ""}`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                                  {alloc.baseCurrency}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-zinc-400">
                                  Available:{" "}
                                  {(
                                    walletBalances[alloc.baseCurrency] || 0
                                  ).toFixed(4)}{" "}
                                  {alloc.baseCurrency}
                                </p>
                                {alloc.minBase > 0 && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Min: {alloc.minBase} {alloc.baseCurrency}
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
                                  placeholder={alloc.minQuote > 0 ? `Min: ${alloc.minQuote}` : "0.00"}
                                  value={alloc.quoteAmount || ""}
                                  onChange={(e) =>
                                    updateAllocation(
                                      alloc.symbol,
                                      "quoteAmount",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className={`pr-16 ${alloc.minQuote > 0 && alloc.quoteAmount > 0 && alloc.quoteAmount < alloc.minQuote ? "border-red-500 focus:border-red-500" : ""}`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                                  {alloc.quoteCurrency}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-zinc-400">
                                  Available:{" "}
                                  {(
                                    walletBalances[alloc.quoteCurrency] || 0
                                  ).toFixed(4)}{" "}
                                  {alloc.quoteCurrency}
                                </p>
                                {alloc.minQuote > 0 && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Min: {alloc.minQuote} {alloc.quoteCurrency}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      This leader has not declared any trading markets yet.
                    </div>
                  )}

                  <p className="text-sm text-zinc-500 mt-4 flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    Allocate to markets you want to participate in. You can
                    skip markets you don&apos;t want to copy.
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
                            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                        }`}
                      >
                        <RadioGroupItem value={mode.value} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <mode.icon className="h-4 w-4 text-primary" />
                            <span className="font-medium">{mode.title}</span>
                          </div>
                          <p className="text-sm text-zinc-500 mt-1">
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
                      <p className="text-xs text-zinc-500 mt-2">
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
                      <p className="text-xs text-zinc-500 mt-2">
                        {t("maximum_allocation_per_single_trade")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                      <div>
                        <div className="font-medium">{t("auto_stop_loss")}</div>
                        <p className="text-sm text-zinc-500">
                          {t("automatically_set_stop_loss_on_copied_trades")}
                        </p>
                      </div>
                      <Switch
                        checked={enableStopLoss}
                        onCheckedChange={setEnableStopLoss}
                      />
                    </div>
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
                    <div className="text-sm text-zinc-500 mb-2">
                      Allocations:
                    </div>
                    {allocations
                      .filter((a) => a.baseAmount > 0 || a.quoteAmount > 0)
                      .map((alloc) => (
                        <div
                          key={alloc.symbol}
                          className="text-sm border-b pb-2"
                        >
                          <div className="font-medium">{alloc.symbol}</div>
                          {alloc.baseAmount > 0 && (
                            <div className="text-zinc-500">
                              {alloc.baseAmount.toFixed(4)} {alloc.baseCurrency}
                            </div>
                          )}
                          {alloc.quoteAmount > 0 && (
                            <div className="text-zinc-500">
                              {alloc.quoteAmount.toFixed(4)}{" "}
                              {alloc.quoteCurrency}
                            </div>
                          )}
                        </div>
                      ))}

                    {!hasValidAllocation() && (
                      <p className="text-sm text-zinc-400 italic">
                        No allocations yet
                      </p>
                    )}

                    <div className="border-t pt-4">
                      <div className="text-sm text-zinc-500 mb-2">
                        {t("on_profits")}:
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {tCommon("platform_fee")}
                        </span>
                        <span>2%</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {t("leader_share")}
                        </span>
                        <span>{leader.profitSharePercent}%</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
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

                    <p className="text-xs text-center text-zinc-500">
                      {t("you_can_pause_or_stop_anytime")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
