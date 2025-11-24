"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
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
  const t = useTranslations("ext");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();
  const router = useRouter();
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the stake action from the store
  const stake = userStakingStore((state) => state.stake);

  const numericAmount = Number.parseFloat(amount || "0");
  const isValidAmount =
    !isNaN(numericAmount) &&
    numericAmount >= pool.minStake &&
    (pool.maxStake === null || numericAmount <= pool.maxStake);

  // Calculate estimated rewards
  const dailyReward = numericAmount * (pool.apr / 100 / 365);
  const totalReward = dailyReward * pool.lockPeriod;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidAmount) {
      return;
    }

    setIsSubmitting(true);

    try {
      await stake({ poolId: pool.id, amount: numericAmount });
      router.push("/staking/position");
    } catch (error) {
      console.error("Error during staking:", error);
    } finally {
      setIsSubmitting(false);
    }
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
          {t("Stake")}
          {pool.symbol}
        </CardTitle>
        <CardDescription>
          {t("enter_the_amount_you_want_to_stake")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                {t("amount_(")}
                {pool.symbol}
                )
              </Label>
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
                  {numericAmount < pool.minStake
                    ? `Minimum stake is ${pool.minStake} ${pool.symbol}`
                    : `Maximum stake is ${pool.maxStake} ${pool.symbol}`}
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
                    {t("total_reward_(")}
                    {pool.lockPeriod}
                    {t("days)")}
                  </span>
                  <span>
                    {totalReward.toFixed(6)} {pool.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("APR")}</span>
                  <span className="text-green-500">{pool.apr}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("lock_period")}
                </span>
                <span>
                  {pool.lockPeriod}
                  {t("days")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("early_withdrawal_fee")}
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
            disabled={!isValidAmount || isSubmitting}
          >
            {isSubmitting ? "Processing..." : `Stake ${pool.symbol}`}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col text-xs text-muted-foreground border-t pt-6">
        <p>{t("by_staking_you_staking_pool")}.</p>
      </CardFooter>
    </Card>
  );
}
