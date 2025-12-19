"use client";

import React, { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Coins,
  DollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  MinusCircle,
  Scale,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Loader2,
  WalletCards,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface PoolManagementProps {
  marketId: string;
  pool: any;
  onRefresh: () => void;
  quoteCurrency?: string;
  baseCurrency?: string;
}

interface BalanceCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  gradient: string;
  trend?: "up" | "down";
  currency?: string;
}

function BalanceCard({ label, value, subValue, icon: IconComponent, gradient, trend, currency }: BalanceCardProps) {
  // Cards with gradient backgrounds don't need borders as they are visually distinct
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1 mr-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold text-foreground truncate">
              {value}
            </p>
            {currency && (
              <p className="text-xs text-muted-foreground">{currency}</p>
            )}
            {subValue && (
              <div className="flex items-center gap-1">
                {trend === "up" && <ArrowUpRight className="w-3 h-3 text-green-500" />}
                {trend === "down" && <ArrowDownRight className="w-3 h-3 text-red-500" />}
                <span className={`text-sm ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                  {subValue}
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg shrink-0`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  children: React.ReactNode;
}

function ActionCard({ title, description, icon: IconComponent, gradient, children }: ActionCardProps) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg dark:border dark:border-slate-700">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              {title}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  );
}

interface WalletBalances {
  base: { currency: string; balance: number; walletId: string | null };
  quote: { currency: string; balance: number; walletId: string | null };
}

export const PoolManagement: React.FC<PoolManagementProps> = ({
  marketId,
  pool,
  onRefresh,
  quoteCurrency = "",
  baseCurrency = "",
}) => {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositCurrency, setDepositCurrency] = useState<"BASE" | "QUOTE">("QUOTE");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawCurrency, setWithdrawCurrency] = useState<"BASE" | "QUOTE">("QUOTE");
  const [rebalanceRatio, setRebalanceRatio] = useState([50]);
  const [loading, setLoading] = useState<string | null>(null);
  const [walletBalances, setWalletBalances] = useState<WalletBalances | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const fetchWalletBalances = useCallback(async () => {
    try {
      setLoadingWallet(true);
      const response = await $fetch({
        url: `/api/admin/ai/market-maker/pool/${marketId}/wallet`,
        method: "GET",
        silent: true,
      });
      if (response.data) {
        setWalletBalances(response.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch wallet balances:", err);
      // Show user-friendly error for non-silent failures
      if (err.message && !err.message.includes("unauthorized")) {
        toast.error("Unable to load wallet balances");
      }
    } finally {
      setLoadingWallet(false);
    }
  }, [marketId]);

  useEffect(() => {
    fetchWalletBalances();
  }, [fetchWalletBalances]);

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      setLoading("deposit");
      await $fetch({
        url: `/api/admin/ai/market-maker/pool/${marketId}/deposit`,
        method: "POST",
        body: {
          currency: depositCurrency,
          amount: Number(depositAmount),
        },
      });
      toast.success("Deposit successful");
      setDepositAmount("");
      onRefresh();
      fetchWalletBalances();
    } catch (err: any) {
      toast.error(err.message || "Deposit failed");
    } finally {
      setLoading(null);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      setLoading("withdraw");
      await $fetch({
        url: `/api/admin/ai/market-maker/pool/${marketId}/withdraw`,
        method: "POST",
        body: {
          currency: withdrawCurrency,
          amount: Number(withdrawAmount),
        },
      });
      toast.success("Withdrawal successful");
      setWithdrawAmount("");
      onRefresh();
      fetchWalletBalances();
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
    } finally {
      setLoading(null);
    }
  };

  const handleRebalance = async () => {
    if (!confirm("Are you sure you want to rebalance the pool?")) return;
    try {
      setLoading("rebalance");
      await $fetch({
        url: `/api/admin/ai/market-maker/pool/${marketId}/rebalance`,
        method: "POST",
        body: {
          targetRatio: rebalanceRatio[0] / 100,
        },
      });
      toast.success("Pool rebalanced successfully");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Rebalance failed");
    } finally {
      setLoading(null);
    }
  };

  const baseBalance = Number(pool?.baseCurrencyBalance || pool?.baseBalance || 0);
  const quoteBalance = Number(pool?.quoteCurrencyBalance || pool?.quoteBalance || 0);
  const tvl = Number(pool?.totalValueLocked || 0);
  const realizedPnL = Number(pool?.realizedPnL || 0);
  const unrealizedPnL = Number(pool?.unrealizedPnL || 0);
  const totalPnL = realizedPnL + unrealizedPnL;

  // Check if pool is empty (both balances are 0)
  const isPoolEmpty = baseBalance === 0 && quoteBalance === 0;

  // Calculate percentages based on TVL (value in quote currency)
  // If pool is empty, show 0% for both
  const baseValuePercent = isPoolEmpty ? 0 : (tvl > 0 ? (baseBalance * Number(pool?.basePrice || 1) / tvl) * 100 : 0);
  const quoteValuePercent = isPoolEmpty ? 0 : (tvl > 0 ? (quoteBalance / tvl) * 100 : 0);

  return (
    <div className="space-y-6">
      {/* Your Wallet Balance (Source of Funds) */}
      <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 text-white dark:from-slate-800 dark:to-slate-700">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur">
              <WalletCards className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{tExt("your_wallet_balance")}</h3>
              <p className="text-xs text-white/70">{t("available_funds_to_deposit_into_the_pool")}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchWalletBalances}
              disabled={loadingWallet}
              className="ml-auto text-white/70 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className={`w-4 h-4 ${loadingWallet ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-white/60 mb-1">{t("base")}{walletBalances?.base?.currency || baseCurrency || ""})</p>
              <p className="text-xl font-bold">
                {loadingWallet ? (
                  <span className="text-white/50">{tCommon('loading')}</span>
                ) : (
                  `${(walletBalances?.base?.balance || 0).toFixed(8)}`
                )}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-white/60 mb-1">{t("quote")}{walletBalances?.quote?.currency || quoteCurrency || ""})</p>
              <p className="text-xl font-bold">
                {loadingWallet ? (
                  <span className="text-white/50">{tCommon('loading')}</span>
                ) : (
                  `${(walletBalances?.quote?.balance || 0).toLocaleString()}`
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pool Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard
          label={t("base_balance")}
          value={baseBalance.toFixed(6)}
          currency={baseCurrency}
          icon={Coins}
          gradient="from-purple-500 to-purple-600"
        />
        <BalanceCard
          label={t("quote_balance")}
          value={quoteBalance.toLocaleString()}
          currency={quoteCurrency}
          icon={DollarSign}
          gradient="from-green-500 to-green-600"
        />
        <BalanceCard
          label={tCommon("total_value_locked")}
          value={tvl.toLocaleString()}
          currency={quoteCurrency}
          icon={Wallet}
          gradient="from-purple-500 to-purple-600"
        />
        <BalanceCard
          label={tCommon("total_p_l")}
          value={`${totalPnL >= 0 ? "+" : ""}${Math.abs(totalPnL).toFixed(2)}`}
          currency={quoteCurrency}
          subValue={`${totalPnL >= 0 ? "+" : ""}${tvl > 0 ? ((totalPnL / tvl) * 100).toFixed(2) : 0}%`}
          icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
          gradient={totalPnL >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600"}
          trend={totalPnL >= 0 ? "up" : "down"}
        />
      </div>

      {/* Pool Composition Visualization */}
      <Card className="border-0 shadow-lg overflow-hidden dark:border dark:border-slate-700">
        <CardHeader className="bg-gradient-to-r from-secondary/50 to-secondary">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
              <PieChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                {t("pool_composition")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("current_distribution_of_assets_in_the_pool")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Visual Bar */}
            <div className="relative">
              {isPoolEmpty ? (
                <div className="h-8 rounded-xl overflow-hidden flex bg-secondary shadow-inner items-center justify-center">
                  <span className="text-xs text-muted-foreground">{t("pool_is_empty_deposit_funds_to_start")}</span>
                </div>
              ) : (
                <div className="h-8 rounded-xl overflow-hidden flex bg-secondary shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 flex items-center justify-center transition-all duration-500"
                    style={{ width: `${baseValuePercent}%` }}
                  >
                    {baseValuePercent > 15 && (
                      <span className="text-xs font-bold text-white drop-shadow">
                        {baseValuePercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center transition-all duration-500"
                    style={{ width: `${quoteValuePercent}%` }}
                  >
                    {quoteValuePercent > 15 && (
                      <span className="text-xs font-bold text-white drop-shadow">
                        {quoteValuePercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-purple-400 shadow ${isPoolEmpty ? "opacity-30" : ""}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("base_asset")}</p>
                    <p className="text-xs text-muted-foreground">{baseBalance.toFixed(4)} {baseCurrency}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 shadow ${isPoolEmpty ? "opacity-30" : ""}`} />
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{t("quote_asset")}</p>
                    <p className="text-xs text-muted-foreground">{quoteBalance.toFixed(2)} {quoteCurrency}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deposit */}
        <ActionCard
          title="Deposit"
          description={t("add_funds_to_the_liquidity_pool")}
          icon={PlusCircle}
          gradient="from-green-500 to-green-600"
        >
          <div className="space-y-4">
            {/* Currency Toggle */}
            <div className="flex gap-2 p-1 bg-secondary rounded-xl">
              <button
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  depositCurrency === "BASE"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setDepositCurrency("BASE")}
              >
                Base
              </button>
              <button
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  depositCurrency === "QUOTE"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setDepositCurrency("QUOTE")}
              >
                Quote
              </button>
            </div>

            {/* Available Balance */}
            <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
              {tCommon("available")} {" "}
              <span className="font-medium text-foreground">
                {depositCurrency === "BASE"
                  ? `${(walletBalances?.base?.balance || 0).toFixed(8)} ${walletBalances?.base?.currency || baseCurrency || ""}`
                  : `${(walletBalances?.quote?.balance || 0).toLocaleString()} ${walletBalances?.quote?.currency || quoteCurrency || ""}`
                }
              </span>
              <button
                className="ml-2 text-xs text-primary hover:underline"
                onClick={() => setDepositAmount(
                  depositCurrency === "BASE"
                    ? String(walletBalances?.base?.balance || 0)
                    : String(walletBalances?.quote?.balance || 0)
                )}
              >
                MAX
              </button>
            </div>

            {/* Amount Input */}
            <div className="relative">
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder={t("enter_amount")}
                className="h-12 pr-16"
                aria-label={`Deposit amount in ${depositCurrency === "BASE" ? baseCurrency : quoteCurrency}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {depositCurrency === "BASE" ? baseCurrency : quoteCurrency}
              </span>
            </div>

            {/* Deposit Button */}
            <Button
              className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
              onClick={handleDeposit}
              disabled={loading === "deposit"}
            >
              {loading === "deposit" ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <PlusCircle className="w-5 h-5 mr-2" />
              )}
              {tExt("deposit_funds")}
            </Button>
          </div>
        </ActionCard>

        {/* Withdraw */}
        <ActionCard
          title="Withdraw"
          description={t("remove_funds_from_the_pool")}
          icon={MinusCircle}
          gradient="from-red-500 to-red-600"
        >
          <div className="space-y-4">
            {/* Currency Toggle */}
            <div className="flex gap-2 p-1 bg-secondary rounded-xl">
              <button
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  withdrawCurrency === "BASE"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setWithdrawCurrency("BASE")}
              >
                Base
              </button>
              <button
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  withdrawCurrency === "QUOTE"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setWithdrawCurrency("QUOTE")}
              >
                Quote
              </button>
            </div>

            {/* Pool Balance */}
            <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
              {t("pool_balance")} {" "}
              <span className="font-medium text-foreground">
                {withdrawCurrency === "BASE"
                  ? `${baseBalance.toFixed(8)} ${baseCurrency}`
                  : `${quoteBalance.toLocaleString()} ${quoteCurrency}`
                }
              </span>
              <button
                className="ml-2 text-xs text-primary hover:underline"
                onClick={() => setWithdrawAmount(
                  withdrawCurrency === "BASE"
                    ? String(baseBalance)
                    : String(quoteBalance)
                )}
              >
                MAX
              </button>
            </div>

            {/* Amount Input */}
            <div className="relative">
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={t("enter_amount")}
                className="h-12 pr-16"
                aria-label={`Withdrawal amount in ${withdrawCurrency === "BASE" ? baseCurrency : quoteCurrency}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {withdrawCurrency === "BASE" ? baseCurrency : quoteCurrency}
              </span>
            </div>

            {/* Withdraw Button */}
            <Button
              variant="outline"
              className="w-full h-12 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              onClick={handleWithdraw}
              disabled={loading === "withdraw"}
            >
              {loading === "withdraw" ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <MinusCircle className="w-5 h-5 mr-2" />
              )}
              {tCommon("withdraw_funds")}
            </Button>
          </div>
        </ActionCard>

        {/* Rebalance */}
        <ActionCard
          title="Rebalance"
          description={t("adjust_pool_asset_distribution")}
          icon={Scale}
          gradient="from-purple-500 to-purple-600"
        >
          <div className="space-y-4">
            {/* Ratio Display */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{rebalanceRatio[0]}%</p>
                <p className="text-xs text-muted-foreground">Base</p>
              </div>
              <Scale className="w-8 h-8 text-purple-500/50" />
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{100 - rebalanceRatio[0]}%</p>
                <p className="text-xs text-muted-foreground">Quote</p>
              </div>
            </div>

            {/* Slider */}
            <div className="py-2">
              <Slider
                value={rebalanceRatio}
                onValueChange={setRebalanceRatio}
                min={10}
                max={90}
                step={1}
                className="cursor-pointer"
                aria-label={t("pool_rebalance_ratio_percentage_of_base_asset")}
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{t("more_quote")}</span>
                <span>50/50</span>
                <span>{t("more_base")}</span>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-secondary border border-border">
              <p className="text-xs text-muted-foreground">
                {t("this_will_adjust_the_pool_to")} <span className="font-semibold text-foreground">{rebalanceRatio[0]}%</span> {t("base")} <span className="font-semibold text-foreground">{100 - rebalanceRatio[0]}%</span> {t("quote_by_market_selling_buying")}
              </p>
            </div>

            {/* Rebalance Button */}
            <Button
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg"
              onClick={handleRebalance}
              disabled={loading === "rebalance"}
            >
              {loading === "rebalance" ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5 mr-2" />
              )}
              {t("rebalance_pool")}
            </Button>
          </div>
        </ActionCard>
      </div>

      {/* P&L Breakdown */}
      <Card className="border-0 shadow-lg overflow-hidden dark:border dark:border-slate-700">
        <CardHeader className="bg-gradient-to-r from-secondary/50 to-secondary">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${totalPnL >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600"} shadow-lg`}>
              {totalPnL >= 0 ? <TrendingUp className="w-5 h-5 text-white" /> : <TrendingDown className="w-5 h-5 text-white" />}
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                {t("p_l_breakdown")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("profit_and_loss_analysis")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Realized P&L */}
            <div className={`relative overflow-hidden p-5 rounded-2xl ${realizedPnL >= 0 ? "bg-green-500/10 dark:bg-green-500/20" : "bg-red-500/10 dark:bg-red-500/20"}`}>
              <div className="relative z-10">
                <p className="text-sm text-muted-foreground mb-2">{t("realized_p_l")}</p>
                <div className="flex items-center gap-2">
                  {realizedPnL >= 0 ? (
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                  )}
                  <p className={`text-2xl font-bold ${realizedPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {realizedPnL >= 0 ? "+" : ""}{realizedPnL.toFixed(2)} {quoteCurrency}
                  </p>
                </div>
              </div>
              {realizedPnL >= 0 ? (
                <TrendingUp className="absolute -right-2 -bottom-2 w-16 h-16 text-green-500/10" />
              ) : (
                <TrendingDown className="absolute -right-2 -bottom-2 w-16 h-16 text-red-500/10" />
              )}
            </div>

            {/* Unrealized P&L */}
            <div className={`relative overflow-hidden p-5 rounded-2xl ${unrealizedPnL >= 0 ? "bg-green-500/10 dark:bg-green-500/20" : "bg-red-500/10 dark:bg-red-500/20"}`}>
              <div className="relative z-10">
                <p className="text-sm text-muted-foreground mb-2">{t("unrealized_p_l")}</p>
                <div className="flex items-center gap-2">
                  {unrealizedPnL >= 0 ? (
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                  )}
                  <p className={`text-2xl font-bold ${unrealizedPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {unrealizedPnL >= 0 ? "+" : ""}{unrealizedPnL.toFixed(2)} {quoteCurrency}
                  </p>
                </div>
              </div>
              {unrealizedPnL >= 0 ? (
                <TrendingUp className="absolute -right-2 -bottom-2 w-16 h-16 text-green-500/10" />
              ) : (
                <TrendingDown className="absolute -right-2 -bottom-2 w-16 h-16 text-red-500/10" />
              )}
            </div>

            {/* Total P&L */}
            <div className={`relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br ${totalPnL >= 0 ? "from-green-500/20 to-green-600/10" : "from-red-500/20 to-red-600/10"}`}>
              <div className="relative z-10">
                <p className="text-sm text-muted-foreground mb-2">{tCommon("total_p_l")}</p>
                <div className="flex items-center gap-2">
                  {totalPnL >= 0 ? (
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                  )}
                  <p className={`text-3xl font-bold ${totalPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)} {quoteCurrency}
                  </p>
                </div>
              </div>
              {totalPnL >= 0 ? (
                <TrendingUp className="absolute -right-2 -bottom-2 w-20 h-20 text-green-500/10" />
              ) : (
                <TrendingDown className="absolute -right-2 -bottom-2 w-20 h-20 text-red-500/10" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoolManagement;
