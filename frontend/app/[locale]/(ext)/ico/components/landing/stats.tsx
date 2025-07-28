"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStatsStore } from "@/store/ico/stats-store";
import { formatCurrency, formatNumber } from "@/lib/ico/utils";
import { useTranslations } from "next-intl";

export function Stats() {
  const t = useTranslations("ext");
  const { stats, fetchStats } = useStatsStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchStats();
      setIsLoading(false);
    };

    loadData();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium animate-pulse bg-muted h-4 w-24 rounded" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold animate-pulse bg-muted h-8 w-32 rounded" />
              <p className="text-xs text-muted-foreground animate-pulse bg-muted h-3 w-20 rounded mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_raised")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stats.totalRaised)}
          </div>
          <p className="text-xs text-muted-foreground">
            +{stats.raisedGrowth}
            {t("%_from_last_month")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("successful_offerings")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.successfulOfferings}</div>
          <p className="text-xs text-muted-foreground">
            +{stats.offeringsGrowth}
            {t("%_from_last_month")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_investors")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(stats.totalInvestors)}
          </div>
          <p className="text-xs text-muted-foreground">
            +{stats.investorsGrowth}
            {t("%_from_last_month")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("average_roi")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageROI}%</div>
          <p className="text-xs text-muted-foreground">
            +{stats.roiGrowth}
            {t("%_from_last_month")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
