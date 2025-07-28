"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  ArrowUpRight,
  CoinsIcon,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PositionDetailsDialog } from "./position-details-dialog";
import { userStakingStore } from "@/store/staking/user";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTranslations } from "next-intl";

interface PositionCardProps {
  position: StakingPosition;
}

export function PositionCard({ position }: PositionCardProps) {
  const t = useTranslations("ext");
  const withdraw = userStakingStore((state) => state.withdraw);
  const claimRewards = userStakingStore((state) => state.claimRewards);

  // Build a safe position object including computed values.
  const safePosition = {
    ...position,
    pendingRewards: position.earnings?.unclaimed ?? 0,
    rewardTokenSymbol: position.pool?.symbol || "",
    tokenSymbol: position.pool?.symbol || "",
    lockPeriodEnd: position.endDate,
    apr: position.pool?.apr || 0,
    poolName: position.pool?.name || "",
  };

  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // State for confirmation dialogs
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showClaimConfirm, setShowClaimConfirm] = useState(false);

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      await withdraw(position.id);
    } catch (error) {
      console.error("Withdraw failed:", error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleClaimRewards = async () => {
    setIsClaiming(true);
    try {
      await claimRewards(position.id);
    } catch (error) {
      console.error("Claim rewards failed:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  // Calculate progress percentage for lock period
  const calculateProgress = () => {
    if (!safePosition.lockPeriodEnd) return 100;

    const start = new Date(position.createdAt!).getTime();
    const end = new Date(safePosition.lockPeriodEnd).getTime();
    const now = Date.now();

    if (now >= end) return 100;
    if (now <= start) return 0;

    return Math.floor(((now - start) / (end - start)) * 100);
  };

  const progress = calculateProgress();

  // Format time remaining in lock period
  const getTimeRemaining = () => {
    if (!safePosition.lockPeriodEnd) return "No lock period";

    const end = new Date(safePosition.lockPeriodEnd);
    if (Date.now() >= end.getTime()) return "Lock period ended";

    return formatDistanceToNow(end, { addSuffix: true });
  };

  const getStatusBadgeColor = () => {
    switch (position.status) {
      case "ACTIVE":
        return "bg-green-500/20 text-green-600 hover:bg-green-500/30";
      case "PENDING_WITHDRAWAL":
        return "bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30";
      case "COMPLETED":
        return "bg-blue-500/20 text-blue-600 hover:bg-blue-500/30";
      case "CANCELLED":
        return "bg-red-500/20 text-red-600 hover:bg-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-600 hover:bg-gray-500/30";
    }
  };

  return (
    <>
      <Card className="overflow-hidden transition-all hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <Badge
              variant="outline"
              className={cn("capitalize", getStatusBadgeColor())}
            >
              {(position.status || "Unknown").replace("_", " ")}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowDetails(true)}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span className="sr-only">View details</span>
            </Button>
          </div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <span>
              {position.amount} {safePosition.tokenSymbol}
            </span>
          </CardTitle>
          <CardDescription className="flex items-center gap-1">
            <Link
              href={`/staking/pool/${position.poolId}`}
              className="text-primary hover:underline flex items-center gap-1"
            >
              {safePosition.poolName}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("staked_on")}</p>
              <p className="flex items-center gap-1 text-sm font-medium">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {position.createdAt
                  ? new Date(position.createdAt).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("APR")}</p>
              <p className="flex items-center gap-1 text-sm font-medium">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                {safePosition.apr}%
              </p>
            </div>
          </div>

          {position.status === "ACTIVE" && safePosition.lockPeriodEnd && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {t("lock_period")}
                </span>
                <span className="font-medium">{getTimeRemaining()}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="bg-muted/50 rounded-md p-3 space-y-1">
            <p className="text-xs text-muted-foreground">
              {t("pending_rewards")}
            </p>
            <p className="text-lg font-semibold flex items-center gap-1">
              <CoinsIcon className="h-4 w-4 text-yellow-500" />
              {safePosition.pendingRewards.toFixed(4)}{" "}
              {safePosition.rewardTokenSymbol}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 pt-0">
          {position.status === "ACTIVE" && (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={isWithdrawing || progress < 100}
                onClick={() => setShowWithdrawConfirm(true)}
              >
                {isWithdrawing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {progress < 100 ? "Locked" : "Withdraw"}
              </Button>
              <Button
                variant="default"
                className="flex-1"
                disabled={isClaiming || safePosition.pendingRewards <= 0}
                onClick={() => setShowClaimConfirm(true)}
              >
                {isClaiming ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {t("Claim")}
              </Button>
            </>
          )}
          {position.status === "PENDING_WITHDRAWAL" && (
            <Button variant="outline" className="w-full" disabled>
              <Calendar className="h-4 w-4 mr-2" />
              {t("processing_withdrawal")}
            </Button>
          )}
          {(position.status === "COMPLETED" ||
            position.status === "CANCELLED") && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowDetails(true)}
            >
              {t("view_details")}
            </Button>
          )}
        </CardFooter>
      </Card>

      <PositionDetailsDialog
        position={position}
        open={showDetails}
        onOpenChange={setShowDetails}
        onWithdraw={position.status === "ACTIVE" ? handleWithdraw : undefined}
        onClaimRewards={
          position.status === "ACTIVE" && safePosition.pendingRewards > 0
            ? handleClaimRewards
            : undefined
        }
        isWithdrawing={isWithdrawing}
        isClaiming={isClaiming}
      />

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showWithdrawConfirm}
        onOpenChange={setShowWithdrawConfirm}
        title="Confirm Withdraw"
        description="Are you sure you want to withdraw your funds?"
        onConfirm={handleWithdraw}
      />
      <ConfirmDialog
        open={showClaimConfirm}
        onOpenChange={setShowClaimConfirm}
        title="Confirm Claim Rewards"
        description="Are you sure you want to claim your rewards?"
        onConfirm={handleClaimRewards}
      />
    </>
  );
}
