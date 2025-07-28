import React, { useEffect, useState } from "react";
import { useTableStore } from "../store";
import { AnalyticsHeader } from "./header";
import { ErrorState } from "./error-state";
import { KpiCard } from "./kpi";
import { StatusDistribution } from "./charts/donut";
import ChartCard from "./charts/line";
import BarChart from "./charts/bar";
import StackedBarChart from "./charts/stacked-bar";
import StackedAreaChart from "./charts/area";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export const Analytics: React.FC = () => {
  const t = useTranslations("components/blocks/data-table/analytics/index");
  const {
    analyticsConfig,
    analyticsData,
    analyticsLoading,
    analyticsError,
    fetchAnalyticsData,
    setAnalyticsError,
    initializeAnalyticsConfig,
  } = useTableStore();

  const [timeframe, setTimeframe] = useState("1y") as any;

  useEffect(() => {
    const initializeAndFetch = async () => {
      if (!analyticsConfig) {
        await initializeAnalyticsConfig();
      }
      if (!analyticsConfig) {
        setAnalyticsError("Failed to initialize analytics configuration");
        return;
      }
      try {
        await fetchAnalyticsData(timeframe);
      } catch (error) {
        console.error("Error in fetchData:", error);
        setAnalyticsError(
          error instanceof Error
            ? error.message
            : "Failed to fetch analytics data"
        );
      }
    };
    initializeAndFetch();
  }, [
    timeframe,
    fetchAnalyticsData,
    setAnalyticsError,
    analyticsConfig,
    initializeAnalyticsConfig,
  ]);

  if (!analyticsConfig || analyticsConfig.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <p className="text-destructive">
            {t("no_analytics_configuration_available")}
          </p>
          <button
            onClick={() => initializeAnalyticsConfig()}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {t("initialize_analytics")}
          </button>
        </div>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <ErrorState
        error={analyticsError}
        onRetry={() => fetchAnalyticsData(timeframe)}
      />
    );
  }

  const renderAnalyticsItem = (item: any, index: number) => {
    if (item.type === "kpi") {
      return (
        <div
          key={index}
          className={cn(
            "grid gap-4",
            item.layout?.cols && `grid-cols-${item.layout.cols}`,
            item.layout?.rows && `grid-rows-${item.layout.rows}`
          )}
        >
          {item.items.map((kpiConfig: any, i: number) => {
            const kpiData = analyticsData?.kpis?.find(
              (k: any) => k.id === kpiConfig.id
            );
            return (
              <KpiCard
                key={kpiConfig.id}
                id={kpiConfig.id}
                title={kpiConfig.title}
                icon={kpiConfig.icon}
                value={kpiData?.value}
                change={kpiData?.change}
                trend={kpiData?.trend || []}
                variant={["success", "info", "warning", "danger"][i % 4] as any}
                loading={analyticsLoading}
                timeframe={timeframe}
              />
            );
          })}
        </div>
      );
    } else if (item.type === "chart") {
      return item.items.map((chartConfig: any, i: number) => {
        switch (chartConfig.type) {
          case "pie":
            return (
              <StatusDistribution
                key={chartConfig.id}
                data={analyticsData?.[chartConfig.id] || []}
                config={chartConfig}
                className="h-full"
                loading={analyticsLoading}
              />
            );
          case "bar":
            return (
              <BarChart
                key={chartConfig.id}
                chartKey={chartConfig.id}
                config={chartConfig}
                data={analyticsData?.[chartConfig.id] || []}
                formatXAxis={(value) => value}
                width="full"
                loading={analyticsLoading}
                timeframe={timeframe}
              />
            );
          case "stackedBar":
            return (
              <StackedBarChart
                key={chartConfig.id}
                chartKey={chartConfig.id}
                config={chartConfig}
                data={analyticsData?.[chartConfig.id] || []}
                formatXAxis={(value) => value}
                width="full"
                loading={analyticsLoading}
                timeframe={timeframe}
              />
            );
          case "stackedArea":
            return (
              <StackedAreaChart
                key={chartConfig.id}
                chartKey={chartConfig.id}
                config={chartConfig}
                data={analyticsData?.[chartConfig.id] || []}
                formatXAxis={(value) => value}
                width="full"
                loading={analyticsLoading}
                timeframe={timeframe}
              />
            );
          default:
            return (
              <ChartCard
                key={chartConfig.id}
                chartKey={chartConfig.id}
                config={chartConfig}
                data={analyticsData?.[chartConfig.id] || []}
                formatXAxis={(value) => value}
                width="full"
                loading={analyticsLoading}
                timeframe={timeframe}
              />
            );
        }
      });
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <AnalyticsHeader timeframe={timeframe} onTimeframeChange={setTimeframe} />
      <div className="grid gap-6">
        {analyticsConfig.map((section: any, index: number) => (
          <div
            key={index}
            className={cn(
              "grid gap-6",
              Array.isArray(section)
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1"
            )}
          >
            {Array.isArray(section)
              ? section.map((subItem: any, subIndex: number) => (
                  <div key={subIndex}>
                    {renderAnalyticsItem(subItem, subIndex)}
                  </div>
                ))
              : renderAnalyticsItem(section, index)}
          </div>
        ))}
      </div>
    </div>
  );
};
