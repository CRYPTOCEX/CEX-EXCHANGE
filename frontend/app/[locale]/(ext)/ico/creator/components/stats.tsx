"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, DollarSign, Users, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreatorStore } from "@/store/ico/creator/creator-store";
import { useTranslations } from "next-intl";

export function CreatorStats() {
  const t = useTranslations("ext");
  const { stats, isLoadingStats, statsError, fetchStats } = useCreatorStore();

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoadingStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
      </div>
    );
  }

  if (statsError) {
    return (
      <Card className="p-4 border-red-200 bg-red-50">
        <p className="text-red-600">
          {t("error_loading_stats")}
          {statsError}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Raised */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("total_raised")}
          </CardTitle>
          <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            / $
            {stats.totalRaised.toLocaleString()}
          </div>
          <div className="flex items-center pt-1">
            {stats.raiseGrowth > 0 ? (
              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span
              className={
                stats.raiseGrowth > 0 ? "text-green-500" : "text-red-500"
              }
            >
              {stats.raiseGrowth > 0 ? "+" : ""}
              {stats.raiseGrowth}%
            </span>
            <span className="text-muted-foreground text-xs ml-1">
              {t("from_last_month")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Total Offerings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("total_offerings")}
          </CardTitle>
          <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.totalOfferings.toLocaleString()}
          </div>
          <div className="flex items-center pt-1">
            {stats.offeringGrowth > 0 ? (
              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span
              className={
                stats.offeringGrowth > 0 ? "text-green-500" : "text-red-500"
              }
            >
              {stats.offeringGrowth > 0 ? "+" : ""}
              {stats.offeringGrowth}%
            </span>
            <span className="text-muted-foreground text-xs ml-1">
              {t("growth_this_month")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Active Offerings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("active_offerings")}
          </CardTitle>
          <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.activeOfferings.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Success Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("success_rate")}
          </CardTitle>
          <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.successRate}%</div>
          <div className="flex items-center pt-1">
            {stats.successRateGrowth > 0 ? (
              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span
              className={
                stats.successRateGrowth > 0 ? "text-green-500" : "text-red-500"
              }
            >
              {stats.successRateGrowth > 0 ? "+" : ""}
              {stats.successRateGrowth}%
            </span>
            <span className="text-muted-foreground text-xs ml-1">
              {t("change_from_last_month")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
