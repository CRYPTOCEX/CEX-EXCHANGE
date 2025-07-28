"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CoinsIcon, TrendingUp, Clock, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

interface PositionsSummaryProps {
  positions: StakingPosition[];
}

export function PositionsSummary({ positions }: PositionsSummaryProps) {
  const t = useTranslations("ext");
  const summary = useMemo(() => {
    // Separate positions by status
    const activePositions = positions.filter((p) => p.status === "ACTIVE");
    const pendingWithdrawals = positions.filter(
      (p) => p.status === "PENDING_WITHDRAWAL"
    );

    // 1. Total staked among active positions
    const totalStaked = activePositions.reduce((sum, p) => sum + p.amount, 0);

    // 2. Total unclaimed among active positions
    const totalPendingRewards = activePositions.reduce((sum, p) => {
      return sum + (p.earnings?.unclaimed || 0);
    }, 0);

    // 3. Total claimed = sum of (total - unclaimed) across all positions
    const totalClaimedRewards = positions.reduce((sum, p) => {
      const total = p.earnings?.total || 0;
      const unclaimed = p.earnings?.unclaimed || 0;
      return sum + (total - unclaimed);
    }, 0);

    // 4. Amount pending withdrawal
    const pendingWithdrawalAmount = pendingWithdrawals.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    return {
      totalStaked,
      totalPendingRewards,
      totalClaimedRewards,
      activePositionsCount: activePositions.length,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalAmount,
    };
  }, [positions]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Staked */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("total_staked")}
              </p>
              <p className="text-2xl font-bold">
                {summary.totalStaked.toFixed(2)}
              </p>
            </div>
            <div className="bg-primary/10 p-2 rounded-full">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("Across")}
            {summary.activePositionsCount}
            {t("active_positions")}
          </p>
        </CardContent>
      </Card>

      {/* Pending Rewards */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("pending_rewards")}
              </p>
              <p className="text-2xl font-bold">
                {summary.totalPendingRewards.toFixed(2)}
              </p>
            </div>
            <div className="bg-yellow-500/10 p-2 rounded-full">
              <CoinsIcon className="h-5 w-5 text-yellow-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("ready_to_claim")}
          </p>
        </CardContent>
      </Card>

      {/* Total Earned */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("total_earned")}
              </p>
              <p className="text-2xl font-bold">
                {(
                  summary.totalPendingRewards + summary.totalClaimedRewards
                ).toFixed(2)}
              </p>
            </div>
            <div className="bg-green-500/10 p-2 rounded-full">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {summary.totalClaimedRewards.toFixed(2)}
            {t("already_claimed")}
          </p>
        </CardContent>
      </Card>

      {/* Pending Withdrawals */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("pending_withdrawals")}
              </p>
              <p className="text-2xl font-bold">
                {summary.pendingWithdrawalAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-blue-500/10 p-2 rounded-full">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {summary.pendingWithdrawalsCount}
            {t("withdrawal")}
            {summary.pendingWithdrawalsCount !== 1 ? "s" : ""}
            {t("in_progress")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
