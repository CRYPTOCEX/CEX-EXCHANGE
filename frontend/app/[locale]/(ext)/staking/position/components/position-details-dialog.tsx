"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { userStakingStore } from "@/store/staking/user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  CoinsIcon,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  BarChart3,
  History,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTranslations } from "next-intl";

// New StatusBadge component with proper styling.
function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: "Active", className: "bg-green-100 text-green-800" },
    PENDING_WITHDRAWAL: {
      label: "Pending Withdrawal",
      className: "bg-yellow-100 text-yellow-800",
    },
    COMPLETED: { label: "Completed", className: "bg-blue-100 text-blue-800" },
    CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-800" },
  };

  const { label, className } = statusMap[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800",
  };

  return (
    <Badge variant="outline" className={`${className} capitalize`}>
      {label}
    </Badge>
  );
}

interface PositionDetailsDialogProps {
  position: StakingPosition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWithdraw?: () => void;
  onClaimRewards?: () => void;
  isWithdrawing?: boolean;
  isClaiming?: boolean;
}

export function PositionDetailsDialog({
  position,
  open,
  onOpenChange,
  onWithdraw,
  onClaimRewards,
  isWithdrawing = false,
  isClaiming = false,
}: PositionDetailsDialogProps) {
  const t = useTranslations("ext");
  // Subscribe to earnings for this position from the store.
  const positionEarnings = userStakingStore((state) => state.positionEarnings);
  const earnings = positionEarnings[position.id] || [];
  const getPositionEarningsFromStore = userStakingStore(
    (state) => state.getPositionEarnings
  );

  // Local state for tracking earnings-specific loading.
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);

  const fetchEarnings = useCallback(async () => {
    setIsLoadingEarnings(true);
    try {
      await getPositionEarningsFromStore(position.id);
    } catch (error) {
      console.error("Failed to fetch earnings:", error);
    } finally {
      setIsLoadingEarnings(false);
    }
  }, [getPositionEarningsFromStore, position.id]);

  useEffect(() => {
    if (open) {
      fetchEarnings();
    }
  }, [open, fetchEarnings]);

  // Calculate progress percentage.
  const progress = useMemo(() => {
    if (!position.endDate) return 100;
    const start = new Date(position.createdAt!).getTime();
    const end = new Date(position.endDate).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.floor(((now - start) / (end - start)) * 100);
  }, [position.createdAt, position.endDate]);

  // Format time remaining.
  const timeRemaining = useMemo(() => {
    if (!position.endDate) return "No lock period";
    const end = new Date(position.endDate);
    if (Date.now() >= end.getTime()) return "Lock period ended";
    return formatDistanceToNow(end, { addSuffix: true });
  }, [position.endDate]);

  const pendingRewards = position.earnings?.unclaimed ?? 0;
  const totalEarnings = position.earnings?.total ?? 0;
  const totalClaimed = totalEarnings - pendingRewards;

  // Local state for confirmation dialogs
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showClaimConfirm, setShowClaimConfirm] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {t("position_details")}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
            <TabsTrigger value="earnings">{t("earnings_history")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t("position_id")}
                </p>
                <Link
                  href={`/staking/pool/${position.poolId}`}
                  className="text-primary hover:underline flex items-center gap-1 font-mono text-sm"
                >
                  <p>
                    {position.id.substring(0, 8)}
                    {position.id.substring(position.id.length - 4)}
                  </p>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("Status")}</p>
                <StatusBadge status={position.status} />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t("staking_details")}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {t("staked_amount")}
                  </p>
                  <p className="text-lg font-semibold">
                    {position.amount} {position.pool?.symbol || ""}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("APR")}</p>
                  <p className="text-lg font-semibold flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    {position.pool?.apr || 0}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {t("staked_on")}
                  </p>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(position.createdAt!), "PPP")}
                  </p>
                </div>
                {position.completedAt && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {t("completed_on")}
                    </p>
                    <p className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(position.completedAt), "PPP")}
                    </p>
                  </div>
                )}
              </div>

              {position.status === "ACTIVE" && position.endDate && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("lock_period")}
                    </span>
                    <span className="font-medium">{timeRemaining}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {position.createdAt
                        ? format(new Date(position.createdAt), "MMM d, yyyy")
                        : "Unknown"}
                    </span>
                    <span>
                      {format(new Date(position.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t("Rewards")}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {t("pending_rewards")}
                  </p>
                  <p className="text-lg font-semibold flex items-center gap-1">
                    <CoinsIcon className="h-4 w-4 text-yellow-500" />
                    {pendingRewards.toFixed(4)} {position.pool?.symbol || ""}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {t("total_claimed")}
                  </p>
                  <p className="text-lg font-semibold">
                    {totalClaimed.toFixed(4)} {position.pool?.symbol || ""}
                  </p>
                </div>
              </div>
            </div>

            {position.status === "ACTIVE" && (
              <>
                <Separator />
                <div className="flex gap-3">
                  {onWithdraw && (
                    <Button
                      variant="secondary"
                      className="flex-1"
                      disabled={isWithdrawing || progress < 100}
                      onClick={() => setShowWithdrawConfirm(true)}
                    >
                      {isWithdrawing && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      {t("Withdraw")}
                    </Button>
                  )}
                  {onClaimRewards && (
                    <Button
                      variant="default"
                      className="flex-1"
                      disabled={isClaiming || pendingRewards <= 0}
                      onClick={() => setShowClaimConfirm(true)}
                    >
                      {isClaiming && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      {t("claim_rewards")}
                    </Button>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6 pt-4">
            {isLoadingEarnings ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">
                  {t("loading_earnings_history")}.
                </p>
              </div>
            ) : earnings.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    {t("earnings_history")}
                  </h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <History className="h-3.5 w-3.5" />
                    {earnings.length}
                    {t("records")}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {earnings.map((earning) => (
                    <Card key={earning.id} className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {earning.amount.toFixed(4)}{" "}
                            {position.pool?.symbol || ""}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(earning.createdAt!), "PPP 'at' p")}
                          </p>
                        </div>
                        <Badge
                          variant={earning.isClaimed ? "outline" : "secondary"}
                        >
                          {earning.isClaimed ? "Claimed" : "Pending"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">
                  {t("no_earnings_records")}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {t("earnings_records_will_generating_rewards")}.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showWithdrawConfirm}
        onOpenChange={setShowWithdrawConfirm}
        title="Confirm Withdraw"
        description="Are you sure you want to withdraw your funds?"
        onConfirm={onWithdraw!}
      />
      <ConfirmDialog
        open={showClaimConfirm}
        onOpenChange={setShowClaimConfirm}
        title="Confirm Claim Rewards"
        description="Are you sure you want to claim your rewards?"
        onConfirm={onClaimRewards!}
      />
    </Dialog>
  );
}
