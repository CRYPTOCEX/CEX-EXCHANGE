"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Clock,
  Coins,
  DollarSign,
  FileText,
  GanttChart,
  Info,
  Percent,
  Shield,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorDisplay } from "@/components/ui/error-display";
import { useStakingAdminPoolsStore } from "@/store/staking/admin/pool";
import { useTranslations } from "next-intl";

interface PoolDetailsTabProps {
  poolId: string;
}

export function PoolDetailsTab({ poolId }: PoolDetailsTabProps) {
  const t = useTranslations("ext");
  const getPoolById = useStakingAdminPoolsStore((state) => state.getPoolById);
  const error = useStakingAdminPoolsStore((state) => state.error);
  const isLoading = useStakingAdminPoolsStore((state) => state.isLoading);

  const [pool, setPool] = useState<StakingPool | null>(null);
  const [utilizationPercentage, setUtilizationPercentage] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchPoolDetails = async () => {
      const poolData = await getPoolById(poolId);
      if (poolData) {
        setPool(poolData);
        // Calculate utilization percentage
        const utilization =
          ((poolData.totalStaked ?? 0) / poolData.availableToStake) * 100;
        setUtilizationPercentage(utilization);
      }
    };

    fetchPoolDetails();
  }, [poolId, getPoolById, retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  if (isLoading) {
    return <PoolDetailsTabSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRetry} />;
  }

  if (!pool) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-lg font-medium">{t("pool_not_found")}</h3>
        <p className="text-muted-foreground mt-2">
          {t("the_requested_pool_been_deleted")}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Information */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                {t("APR")}
              </span>
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {pool.earningFrequency}
              </Badge>
            </CardTitle>
            <CardDescription>{t("annual_percentage_rate")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <div className="text-3xl font-bold">{pool.apr}%</div>
              <div className="text-sm text-muted-foreground">{t("APR")}</div>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("admin_fee")}</span>
              <span className="font-medium">{pool.adminFeePercentage}%</span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("Earnings")}</span>
              <span className="font-medium">{pool.earningFrequency}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                {t("lock_period")}
              </span>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                {t("fixed_term")}
              </Badge>
            </CardTitle>
            <CardDescription>{t("required_staking_duration")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <div className="text-3xl font-bold">{pool.lockPeriod}</div>
              <div className="text-sm text-muted-foreground">{t("days")}</div>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("early_withdrawal_fee")}
              </span>
              <span className="font-medium">{pool.earlyWithdrawalFee}%</span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("Auto-compound")}
              </span>
              <span
                className={cn(
                  "font-medium",
                  pool.autoCompound ? "text-green-500" : "text-muted-foreground"
                )}
              >
                {pool.autoCompound ? "Enabled" : "Disabled"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-green-500" />
                {t("staking_limits")}
              </span>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-500"
              >
                {t("Limits")}
              </Badge>
            </CardTitle>
            <CardDescription>{t("min_and_max_stake_amounts")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  {t("minimum_stake")}
                </div>
                <div className="text-xl font-semibold">
                  {pool.minStake} {pool.symbol}
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  {t("maximum_stake")}
                </div>
                <div className="text-xl font-semibold">
                  {pool.maxStake ?? "Unlimited"}{" "}
                  {pool.maxStake ? pool.symbol : ""}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                {t("pool_capacity")}
              </span>
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-500"
              >
                {t("Utilization")}
              </Badge>
            </CardTitle>
            <CardDescription>{t("current_pool_utilization")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mb-2">
              <div className="text-2xl font-bold">
                {utilizationPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {t("utilized")}
              </div>
            </div>
            <Progress
              value={utilizationPercentage}
              className={cn(
                "h-2",
                utilizationPercentage > 90
                  ? "bg-red-500"
                  : utilizationPercentage > 75
                    ? "bg-amber-500"
                    : "bg-green-500"
              )}
            />
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-muted-foreground">{t("total_staked")}</div>
                <div className="font-medium">
                  {pool.totalStaked} {pool.symbol}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("Available")}</div>
                <div className="font-medium">
                  {pool.availableToStake - (pool.totalStaked ?? 0)}{" "}
                  {pool.symbol}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description and Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("pool_description")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p
                className="text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: pool.description }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GanttChart className="h-5 w-5 text-primary" />
              {t("pool_timeline")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium">{t("Created")}</div>
                  <div className="text-sm text-muted-foreground">
                    {pool.createdAt
                      ? new Date(pool.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium">{t("last_updated")}</div>
                  <div className="text-sm text-muted-foreground">
                    {pool.updatedAt
                      ? new Date(pool.updatedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    pool.status === "ACTIVE"
                      ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                      : pool.status === "COMING_SOON"
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  )}
                >
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium">{t("current_status")}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {pool.status.toLowerCase().replace("_", " ")}
                    {pool.isPromoted && (
                      <Badge className="ml-2 bg-amber-500/10 text-amber-500 border-amber-500/30">
                        {t("Promoted")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rewards and Risks */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-green-500" />
              {t("rewards_structure")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
                <h4 className="font-medium text-green-700 dark:text-green-400 mb-1">
                  {t("earning_details")}
                </h4>
                <p className="text-sm text-green-600/80 dark:text-green-400/80">
                  {t("Earn")}
                  {pool.apr}
                  {t("%_apr_paid_out")} {pool.earningFrequency.toLowerCase()}
                  {t("in")}
                  {pool.symbol}
                  {pool.autoCompound &&
                    " Earnings are automatically compounded to maximize returns."}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">{t("base_apr")}</div>
                  <div>{pool.apr}%</div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">
                    {t("distribution_frequency")}
                  </div>
                  <div>{pool.earningFrequency}</div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">
                    {t("Auto-Compound")}
                  </div>
                  <div>{pool.autoCompound ? "Yes" : "No"}</div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">{t("admin_fee")}</div>
                  <div>{pool.adminFeePercentage}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("risk_factors")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-900/30">
                <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                  {t("important_notice")}
                </h4>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                  {t("market_volatility_may_staked_assets")}.{" "}
                  {t("please_review_all_risks_before_staking")}.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 dark:bg-red-900/30 dark:text-red-400 mt-0.5">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{t("market_risk")}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("cryptocurrency_prices_are_staking_period")}.
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 mt-0.5">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{t("lock-up_period")}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("funds_are_locked_for")}
                      {pool.lockPeriod}
                      {t("days")}. {t("early_withdrawal_incurs_a")}
                      {pool.earlyWithdrawalFee}
                      {t("%_penalty_fee")}.
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 mt-0.5">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{t("apr_variability")}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("The")}
                      {pool.apr}
                      {t("%_apr_is_market_conditions")}.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("terms_&_conditions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">{t("pool_terms")}</h4>
              <ul className="text-sm text-muted-foreground space-y-2 pl-5 list-disc">
                <li>
                  {t("minimum_stake_amount")}
                  {pool.minStake} {pool.symbol}
                </li>
                <li>
                  {t("maximum_stake_amount")}
                  {pool.maxStake ?? "Unlimited"}{" "}
                  {pool.maxStake ? pool.symbol : ""}
                </li>
                <li>
                  {t("lock_period")}
                  {pool.lockPeriod}
                  {t("days")}
                </li>
                <li>
                  {t("early_withdrawal_fee")}
                  {pool.earlyWithdrawalFee}%
                </li>
                <li>
                  {t("admin_fee")}
                  {pool.adminFeePercentage}
                  {t("%_of_earnings")}
                </li>
                <li>
                  {t("earnings_are_distributed")}
                  {pool.earningFrequency.toLowerCase()}
                </li>
                {pool.autoCompound && (
                  <li>{t("earnings_are_automatically_compounded")}</li>
                )}
                <li>{t("the_platform_reserves_market_conditions")}</li>
                <li>{t("users_are_responsible_staking_rewards")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PoolDetailsTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Key Information Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Description and Details Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array(2)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Rewards and Risks Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array(2)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-4 rounded-lg" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Terms and Conditions Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
