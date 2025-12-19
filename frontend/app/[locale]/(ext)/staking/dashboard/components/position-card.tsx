"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { userStakingStore } from "@/store/staking/user";
import { Link } from "@/i18n/routing";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PositionCardProps {
  position: StakingPosition;
}

export default function PositionCard({ position }: PositionCardProps) {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  // Destructure needed store state and actions.
  const pool = userStakingStore((state) =>
    state.pools.find((p) => p.id === position.poolId)
  );
  const getPoolById = userStakingStore((state) => state.getPoolById);
  const withdraw = userStakingStore((state) => state.withdraw);
  const claimRewards = userStakingStore((state) => state.claimRewards);

  // Local state for UI feedback and confirmation dialogs.
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showClaimConfirm, setShowClaimConfirm] = useState(false);

  // Fetch pool data if not available.
  useEffect(() => {
    if (!pool) {
      getPoolById(position.poolId);
    }
  }, [pool, position.poolId, getPoolById]);

  // Calculate time progress.
  const startDate = new Date(position.startDate);
  const endDate = new Date(position.endDate);
  const currentDate = new Date();
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsedDuration = currentDate.getTime() - startDate.getTime();
  const progressPercentage = Math.min(
    100,
    Math.max(0, (elapsedDuration / totalDuration) * 100)
  );

  // Calculate days remaining until end date.
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  // Handle withdraw action.
  const handleWithdraw = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await withdraw(position.id);
      window.location.reload();
    } catch (err: any) {
      setError(
        err.message || "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsProcessing(false);
      setShowWithdrawConfirm(false);
    }
  }, [position.id, withdraw]);

  // Handle claim rewards action.
  const handleClaimRewards = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await claimRewards(position.id);
      window.location.reload();
    } catch (err: any) {
      setError(
        err.message || "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsProcessing(false);
      setShowClaimConfirm(false);
    }
  }, [position.id, claimRewards]);

  // Show a loading skeleton if pool data isn't loaded yet.
  if (!pool) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="h-24 bg-muted/50" />
        <CardContent className="h-48 bg-muted/30" />
        <CardFooter className="h-16 bg-muted/50" />
      </Card>
    );
  }

  // Use pool.rewards if available; default to 0 otherwise.
  const rewards = pool.rewards || 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 mr-3 flex items-center justify-center">
                {pool.icon ? (
                  <img src={pool.icon} alt={pool.name} className="w-6 h-6" />
                ) : (
                  <span className="font-bold text-primary">
                    {pool.symbol.substring(0, 1)}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold">{pool.name}</h3>
                <p className="text-sm text-muted-foreground">{pool.symbol}</p>
              </div>
            </div>
            <StatusBadge status={position.status} />
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {tCommon("staked_amount")}
              </span>
              <span className="text-xl font-bold">
                {position.amount} {pool.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {tCommon("rewards_earned")}
              </span>
              <span className="text-lg font-semibold text-green-500">
                {rewards} {pool.symbol}
              </span>
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {tExt("start_date")}
                </span>
                <span className="ml-auto">
                  {formatDate(position.startDate)}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">{tCommon("end_date")}</span>
                <span className="ml-auto">{formatDate(position.endDate)}</span>
              </div>
            </div>
            {position.status === "ACTIVE" && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{tCommon("progress")}</span>
                  <span>
                    {daysRemaining}
                    {tExt("days_remaining")}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}
            {position.status === "PENDING_WITHDRAWAL" && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200/50 dark:border-amber-800/30 text-sm">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {tCommon("withdrawal_pending")}
                    </p>
                    <p className="text-amber-600 dark:text-amber-400">
                      {tCommon("your_withdrawal_request_is_being_processed")}.{" "}
                      {tCommon("this_typically_takes_24_48_hours")}.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {position.status === "COMPLETED" && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200/50 dark:border-green-800/30 text-sm">
                <div className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      {tCommon("position_completed")}
                    </p>
                    <p className="text-green-600 dark:text-green-400">
                      {tExt("this_staking_position_your_wallet")}.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-md border border-red-200/50 dark:border-red-800/30">
                {error}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          {position.status === "ACTIVE" && (
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => setShowWithdrawConfirm(true)}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Withdraw"}
              </Button>
              <Button
                onClick={() => setShowClaimConfirm(true)}
                disabled={isProcessing || Number(rewards) <= 0}
              >
                {isProcessing ? "Processing..." : "Claim Rewards"}
              </Button>
            </div>
          )}
          {position.status === "PENDING_WITHDRAWAL" && (
            <Link href="/staking/pool" className="w-full">
              <Button variant="outline">
                {tCommon("stake_more")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
          {position.status === "COMPLETED" && (
            <Link href="/staking/pool" className="w-full">
              <Button>
                {tCommon("stake_again")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showWithdrawConfirm}
        onOpenChange={setShowWithdrawConfirm}
        title={tExt("confirm_withdraw")}
        description={tExt("are_you_sure_you_want_to_withdraw_your_funds")}
        onConfirm={handleWithdraw}
      />
      <ConfirmDialog
        open={showClaimConfirm}
        onOpenChange={setShowClaimConfirm}
        title={tExt("confirm_claim_rewards")}
        description={tExt("are_you_sure_you_want_to_claim_your_rewards")}
        onConfirm={handleClaimRewards}
      />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tCommon = useTranslations("common");
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30">
          <Clock className="h-3 w-3 mr-1" />
          {tCommon("active")}
        </Badge>
      );
    case "PENDING_WITHDRAWAL":
      return (
        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30">
          <TrendingUp className="h-3 w-3 mr-1" />
          {tCommon("pending")}
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {tCommon("completed")}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
