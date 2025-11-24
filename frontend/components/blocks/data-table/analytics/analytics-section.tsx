import React from "react";
import { KpiCard } from "./kpi";
import StatusDistribution from "./charts/donut";
import { ChartCard } from "./charts/line";

interface AnalyticsSectionProps {
  item: AnalyticsItem;
  analyticsData: Record<string, any> | null;
  loading?: boolean;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  item,
  analyticsData,
  loading,
}) => {
  const { type, layout, items } = item;

  const gridClass = layout
    ? `grid grid-cols-${layout.cols || 1} grid-rows-${layout.rows || 1} gap-4`
    : "";

  // Remove this KPI rendering since it's already handled in Analytics component
  if (item.type === "chart") {
    return item.items.map((chart) => {
      const chartConfig = chart as ChartConfig;
      const chartData = analyticsData?.[chartConfig.id];

      if (chartConfig.type === "pie") {
        return (
          <StatusDistribution
            key={chartConfig.id}
            data={chartData || []}
            config={chartConfig}
            className="h-full"
            loading={loading}
          />
        );
      }

      return (
        <ChartCard
          key={chartConfig.id}
          chartKey={chartConfig.id}
          config={chartConfig}
          data={chartData || []}
          formatXAxis={(value) => value}
          width="full"
          loading={loading}
        />
      );
    });
  }

  if (type === "kpi") {
    return (
      <div className={gridClass}>
        {items.map((kpi, index) => {
          const kpiConfig = kpi as KpiConfig;
          const kpiData = analyticsData?.kpis?.find(
            (k: any) => k.id === kpiConfig.id
          );
          return (
            <KpiCard
              key={kpiConfig.id}
              id={kpiConfig.id}
              title={kpiConfig.title} // Static from config
              icon={kpiConfig.icon} // Static from config
              value={kpiData?.value}
              change={kpiData?.change}
              trend={kpiData?.trend || []}
              variant={
                ["success", "info", "warning", "danger"][index % 4] as any
              }
              loading={loading}
            />
          );
        })}
      </div>
    );
  }

  return null;
};
