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
import { RankedBar } from "./charts/ranked";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  getResponsiveGridClasses,
  getResponsiveItemClasses,
  getSectionGridClasses,
} from "./utils/responsive-layout";

/* The analytics tab mounts at rest, for the same reason the table does. The
   four variant sets that used to live here nested their delays — a 0.2s lead on
   the page, 0.1s per section, 0.08s per KPI tile, and `sectionIndex * 0.15 +
   i * 0.1` per chart — so the last chart on a multi-section page began its
   0.7s slide from `y: 40` roughly a second after the grid it sits in had
   already been laid out. The tiles and charts render their OWN pending states
   while data loads, so there is nothing left for an entrance to cover.
   Chart-internal animation (Recharts drawing a series) is untouched. */

/**
 * Tile tints, in ramp order. Six slots, not four: the old
 * `["success","info","warning","danger"][i % 4]` repeated itself inside any
 * group larger than four, and several pages ship groups of eight.
 */
const KPI_TILES = [
  "info",
  "success",
  "warning",
  "danger",
  "secondary",
  "muted",
] as const;

export const Analytics: React.FC = () => {
  const t = useTranslations("components_blocks");
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

  const renderAnalyticsItem = (item: any, index: number, sectionIndex: number) => {
    if (item.type === "kpi") {
      // Use responsive grid classes
      const gridClasses = getResponsiveGridClasses(
        item.responsive,
        item.layout?.cols
      );
      const itemClasses = getResponsiveItemClasses(item.responsive);

      return (
        <div
          key={`kpi-${sectionIndex}-${index}`}
          className={cn(gridClasses, itemClasses)}
        >
          {item.items.map((kpiConfig: any, i: number) => {
            const kpiData = analyticsData?.kpis?.find(
              (k: any) => k.id === kpiConfig.id
            );
            return (
              <div key={kpiConfig.id}>
                <KpiCard
                  id={kpiConfig.id}
                  title={kpiConfig.title}
                  icon={kpiConfig.icon}
                  value={kpiData?.value}
                  change={kpiData?.change}
                  trend={kpiData?.trend || []}
                  /**
                   * The tile tint is IDENTITY, not meaning — it says "this is
                   * the third card", nothing more. It indexes the full ramp
                   * rather than `% 4`, which collided cards 1&5, 2&6, 3&7 in
                   * the eight-card groups on `finance/profit` and `nft/token`.
                   * Meaning lives in the delta chip, via `invert`.
                   */
                  variant={KPI_TILES[i % KPI_TILES.length]}
                  format={kpiConfig.format ?? kpiData?.format}
                  currency={kpiConfig.currency ?? kpiData?.currency}
                  invert={kpiConfig.invert ?? kpiData?.invert}
                  error={kpiData?.error}
                  unpriced={kpiData?.unpriced}
                  index={i}
                  loading={analyticsLoading}
                  timeframe={timeframe}
                />
              </div>
            );
          })}
        </div>
      );
    } else if (item.type === "chart") {
      const itemClasses = getResponsiveItemClasses(item.responsive);

      return item.items.map((chartConfig: any) => {
        const chartElement = (() => {
          /**
           * A ranked breakdown is decided by `config.groupBy`, not by `type`.
           * The backend returns the pie envelope for both, so a config can pick
           * the donut for three or four categories where part-of-whole is the
           * point, and the ranked bar for a genuine top-N — which cannot be
           * read as a ring once it has more than about five slices.
           */
          if (chartConfig.config?.groupBy && chartConfig.type !== "pie") {
            return (
              <RankedBar
                key={chartConfig.id}
                chartKey={chartConfig.id}
                config={chartConfig}
                data={analyticsData?.[chartConfig.id] || []}
                className="h-full"
                loading={analyticsLoading}
              />
            );
          }
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
        })();

        return (
          <div key={chartConfig.id} className={itemClasses}>
            {chartElement}
          </div>
        );
      });
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <AnalyticsHeader timeframe={timeframe} onTimeframeChange={setTimeframe} />
      <div className="grid gap-6">
        {analyticsConfig.map((section: any, index: number) => {
          const isArray = Array.isArray(section);
          const sectionGridClasses = getSectionGridClasses(isArray);

          return (
            <div key={index} className={sectionGridClasses}>
              {isArray
                ? section.map((subItem: any, subIndex: number) =>
                    renderAnalyticsItem(subItem, subIndex, index)
                  )
                : renderAnalyticsItem(section, index, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
