import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Coins,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Percent,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface AnalyticsCardsProps {
  analytics: stakingAnalyticsAttributes | null;
  isLoading?: boolean;
  timeRange?: "day" | "week" | "month" | "year";
}

export function AnalyticsCards({
  analytics,
  isLoading = false,
  timeRange = "month",
}: AnalyticsCardsProps) {
  const t = useTranslations("ext");
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  // Calculate percentage changes with default values
  const stakedChangePercent = analytics.stakedChangePercent || 0;
  const usersChangePercent = analytics.usersChangePercent || 0;
  const rewardsChangePercent = analytics.rewardsChangePercent || 0;

  // Get active pools count with default value
  const activePoolsCount = analytics.activePoolsCount || 0;

  // Format the average APR with default value
  const avgAPR =
    analytics.averageAPR !== undefined
      ? `${analytics.averageAPR.toFixed(2)}%`
      : "0.00%";

  // Format the time range text
  const timeRangeText = `from last ${timeRange}`;

  // Use default value for totalRewardsDistributed
  const totalRewardsDistributed = analytics.totalRewardsDistributed || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_staked")}
          </CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.totalStaked.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stakedChangePercent > 0 ? (
              <span className="text-green-500 inline-flex items-center">
                <TrendingUp className="mr-1 h-3 w-3" />+
                {stakedChangePercent.toFixed(1)}%
              </span>
            ) : stakedChangePercent < 0 ? (
              <span className="text-red-500 inline-flex items-center">
                <ArrowDownRight className="mr-1 h-3 w-3" />
                {stakedChangePercent.toFixed(1)}%
              </span>
            ) : (
              <span>{t("no_change")}</span>
            )}{" "}
            {timeRangeText}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_users")}
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.totalUsers.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {usersChangePercent > 0 ? (
              <span className="text-green-500 inline-flex items-center">
                <ArrowUpRight className="mr-1 h-3 w-3" />+
                {usersChangePercent.toFixed(1)}%
              </span>
            ) : usersChangePercent < 0 ? (
              <span className="text-red-500 inline-flex items-center">
                <ArrowDownRight className="mr-1 h-3 w-3" />
                {usersChangePercent.toFixed(1)}%
              </span>
            ) : (
              <span>{t("no_change")}</span>
            )}{" "}
            {timeRangeText}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("average_apr")}
          </CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgAPR}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {activePoolsCount > 0
              ? `Across ${activePoolsCount} active ${activePoolsCount === 1 ? "pool" : "pools"}`
              : "No active pools"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_rewards")}
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalRewardsDistributed.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {rewardsChangePercent > 0 ? (
              <span className="text-green-500 inline-flex items-center">
                <TrendingUp className="mr-1 h-3 w-3" />+
                {rewardsChangePercent.toFixed(1)}%
              </span>
            ) : rewardsChangePercent < 0 ? (
              <span className="text-red-500 inline-flex items-center">
                <ArrowDownRight className="mr-1 h-3 w-3" />
                {rewardsChangePercent.toFixed(1)}%
              </span>
            ) : (
              <span>{t("no_change")}</span>
            )}{" "}
            {timeRangeText}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
