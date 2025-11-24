"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowUpRight, Users, Percent, Coins } from "lucide-react";
import { useTranslations } from "next-intl";

interface KeyMetricsProps {
  analytics: any;
  activePositions: number;
}

export default function KeyMetrics({
  analytics,
  activePositions,
}: KeyMetricsProps) {
  const t = useTranslations("ext");
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_staked")}
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics?.totalStaked?.toLocaleString() || "0"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-green-500 inline-flex items-center">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              {analytics?.stakedChangePercent !== undefined
                ? `${analytics.stakedChangePercent.toFixed(1)}%`
                : "0%"}
            </span>{" "}
            {t("from_last_month")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("active_positions")}
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activePositions}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-green-500 inline-flex items-center">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              {analytics?.usersChangePercent !== undefined
                ? `${analytics.usersChangePercent.toFixed(1)}%`
                : "0%"}
            </span>{" "}
            {t("from_last_month")}
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
          <div className="text-2xl font-bold">
            {analytics?.averageAPR?.toFixed(2) || "0.00"}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("across_all_active_pools")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_rewards")}
          </CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics?.totalRewardsDistributed?.toLocaleString() || "0"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-green-500 inline-flex items-center">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              {analytics?.rewardsChangePercent !== undefined
                ? `${analytics.rewardsChangePercent.toFixed(1)}%`
                : "0%"}
            </span>{" "}
            {t("from_last_month")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
