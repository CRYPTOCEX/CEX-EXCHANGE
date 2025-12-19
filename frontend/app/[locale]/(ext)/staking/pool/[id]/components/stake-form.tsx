"use client";

import { useState, useEffect } from "react";
import { Calculator, AlertCircle, Wallet, Loader2 } from "lucide-react";
import { $fetch } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/routing";
import { userStakingStore } from "@/store/staking/user";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";

interface StakeFormProps {
  pool: StakingPool;
}

export default function StakeForm({ pool }: StakeFormProps) {
  const t = useTranslations("ext_staking");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();
  const router = useRouter();
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  // Get the stake action from the store
  const stake = userStakingStore((state) => state.stake);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      setIsLoadingBalance(true);
      const { data, error } = await $fetch<{ balance: number }>({
        url: `/api/finance/wallet/${pool.walletType}/${pool.token}`,
        silentSuccess: true,
        silent: true,
      });
      if (!error && data) {
        setWalletBalance(data.balance ?? 0);
      } else {
        setWalletBalance(0);
      }
      setIsLoadingBalance(false);
    };
    fetchWalletBalance();
  }, [pool.walletType, pool.token]);

  const numericAmount = Number.parseFloat(amount || "0");
  const hasEnoughBalance = walletBalance !== null && numericAmount <= walletBalance;
  const isValidAmount =
    !isNaN(numericAmount) &&
    numericAmount >= pool.minStake &&
    (pool.maxStake === null || numericAmount <= pool.maxStake) &&
    hasEnoughBalance;

  // Calculate max stakeable amount (considering balance and pool max)
  const maxStakeable = walletBalance !== null
    ? (pool.maxStake !== null ? Math.min(walletBalance, pool.maxStake) : walletBalance)
    : 0;

  const handleSetMax = () => {
    if (maxStakeable > 0) {
      setAmount(maxStakeable.toString());
    }
  };

  // Calculate estimated rewards
  const dailyReward = numericAmount * (pool.apr / 100 / 365);
  const totalReward = dailyReward * pool.lockPeriod;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidAmount) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await stake({ poolId: pool.id, amount: numericAmount });

    if (result.success) {
      router.push("/staking/position");
    } else {
      setError(result.error || "Failed to stake. Please try again.");
    }

    setIsSubmitting(false);
  };

  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const canInvestStaking = hasKyc() && canAccessFeature("invest_staking");

  if (kycEnabled && !canInvestStaking) {
    return <KycRequiredNotice feature="invest_staking" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {tExt("stake")} {pool.symbol}
        </CardTitle>
        <CardDescription>
          {t("enter_the_amount_you_want_to_stake")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            {/* Wallet Balance Display */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{tCommon("available_balance")}</span>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingBalance ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <span className="font-medium">
                    {walletBalance?.toLocaleString(undefined, { maximumFractionDigits: 8 }) ?? "0"} {pool.symbol}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">
                  {tCommon("amount")} ({pool.symbol})
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950"
                  onClick={handleSetMax}
                  disabled={isLoadingBalance || maxStakeable <= 0}
                >
                  {tCommon("max")}
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder={`Min: ${pool.minStake}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="any"
                  min={pool.minStake}
                  max={pool.maxStake || undefined}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {pool.symbol}
                </span>
              </div>
              {numericAmount > 0 && !isValidAmount && (
                <p className="text-sm text-red-500">
                  {!hasEnoughBalance && walletBalance !== null
                    ? `${t("insufficient_balance")}. ${tCommon("available")}: ${walletBalance} ${pool.symbol}`
                    : numericAmount < pool.minStake
                      ? `${t("minimum_stake_is")} ${pool.minStake} ${pool.symbol}`
                      : `${t("maximum_stake_is")} ${pool.maxStake} ${pool.symbol}`}
                </p>
              )}
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center mb-2">
                <Calculator className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">{t("reward_estimate")}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("daily_reward")}
                  </span>
                  <span>
                    {dailyReward.toFixed(6)} {pool.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("total_reward")} ({pool.lockPeriod} {tCommon("days")})
                  </span>
                  <span>
                    {totalReward.toFixed(6)} {pool.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tCommon("apr")}</span>
                  <span className="text-green-500">{pool.apr}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {tCommon("lock_period")}
                </span>
                <span>
                  {pool.lockPeriod} {tCommon("days")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {tExt("early_withdrawal_fee")}
                </span>
                <span>{pool.earlyWithdrawalFee}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("rewards_paid")}
                </span>
                <span className="capitalize">{pool.earningFrequency}</span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-6"
            disabled={!isValidAmount || isSubmitting || isLoadingBalance}
          >
            {isSubmitting ? tCommon("processing") + "..." : `${tExt("stake")} ${pool.symbol}`}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col text-xs text-muted-foreground border-t pt-6">
        <p>{t("by_staking_you_staking_pool")}.</p>
      </CardFooter>
    </Card>
  );
}
