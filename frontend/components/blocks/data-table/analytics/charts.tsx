"use client";

import React, { useEffect } from "react";
import { useTableStore } from "../store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartTimeframe } from "../types/chart";
import { renderSection } from "./charts/chart-components";
import { LoadingState } from "./charts/loading-state";
import { ErrorState } from "./charts/error-state";
import { TIMEFRAME_OPTIONS } from "../utils/chart";
import { useTranslations } from "next-intl";

interface AnalyticsChartsProps {
  data: Record<string, any> | null;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data }) => {
  const t = useTranslations("components/blocks/data-table/analytics/charts");
  const {
    analyticsData,
    fetchAnalyticsData,
    analyticsLoading,
    analyticsError,
    analyticsConfig,
  } = useTableStore();
  const [timeframe, setTimeframe] = React.useState<ChartTimeframe>("m");

  useEffect(() => {
    fetchAnalyticsData(timeframe);
  }, [fetchAnalyticsData, timeframe]);

  if (analyticsLoading) {
    return <LoadingState />;
  }

  if (analyticsError || !analyticsData) {
    return (
      <ErrorState
        error={analyticsError || "No data available"}
        onRetry={() => fetchAnalyticsData(timeframe)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("analytics_dashboard")}
        </h2>
        <Select
          value={timeframe}
          onValueChange={(value) => setTimeframe(value as ChartTimeframe)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            {TIMEFRAME_OPTIONS.map((option: any) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {analyticsData.sections.map((section: any) =>
          renderSection(section, analyticsData, timeframe)
        )}
      </div>
    </div>
  );
};
