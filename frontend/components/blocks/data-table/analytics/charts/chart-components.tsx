import React from "react";
import { cn } from "@/lib/utils";
import { formatChartDate } from "../../utils/chart";
import { KpiCard } from "../kpi";
import StatusDistribution from "./donut";
import ChartCard from "./line";
import { ChartTimeframe } from "../../types/chart";

type AnalyticsSection = {
  id: string;
  type: "kpi" | "status" | "chart";
  data: KpiConfig[] | any[]; // Assuming KpiConfig type is defined elsewhere
  config: ChartConfig;
  layout: {
    width: "half" | "full";
    cols?: number;
    rows?: number;
  };
};

interface ChartComponentProps {
  section: AnalyticsSection;
  analyticsData: Record<string, any>;
  timeframe?: ChartTimeframe;
}

const KpiSection: React.FC<ChartComponentProps> = ({
  section,
  analyticsData,
}) => (
  <div
    className={cn(
      "grid gap-4",
      section.layout.width === "half" ? "col-span-1" : "col-span-2",
      section.layout.cols &&
        section.layout.rows &&
        `grid-cols-${section.layout.cols} grid-rows-${section.layout.rows}`
    )}
  >
    {(section.data as KpiConfig[]).map((kpi, index) => {
      const kpiData = analyticsData?.kpis?.find((k: any) => k.id === kpi.id);
      if (!kpiData) return null;
      return (
        <KpiCard
          key={kpi.id}
          {...kpiData}
          variant={["emerald", "blue", "purple", "gold"][index % 4] as any}
        />
      );
    })}
  </div>
);

const StatusSection: React.FC<ChartComponentProps> = ({
  section,
  analyticsData,
}) => (
  <div
    className={cn(
      section.layout.width === "half" ? "col-span-1" : "col-span-2"
    )}
  >
    <StatusDistribution
      data={section.data as any[]}
      config={section.config as ChartConfig}
      className="h-full"
    />
  </div>
);

const ChartSection: React.FC<ChartComponentProps> = ({
  section,
  analyticsData,
  timeframe,
}) => {
  if (!timeframe) return null;

  return (
    <div
      className={cn(
        section.layout.width === "half" ? "col-span-1" : "col-span-2"
      )}
    >
      <ChartCard
        chartKey={section.id}
        config={section.config as ChartConfig}
        data={section.data}
        formatXAxis={(value) => formatChartDate(value, timeframe)}
        width={section.layout.width}
      />
    </div>
  );
};
export const renderSection = (
  section: AnalyticsSection,
  analyticsData: Record<string, any>,
  timeframe: ChartTimeframe
) => {
  switch (section.type) {
    case "kpi":
      return (
        <KpiSection
          key={section.id}
          section={section}
          analyticsData={analyticsData}
        />
      );
    case "status":
      return (
        <StatusSection
          key={section.id}
          section={section}
          analyticsData={analyticsData}
        />
      );
    case "chart":
      return (
        <ChartSection
          key={section.id}
          section={section}
          analyticsData={analyticsData}
          timeframe={timeframe}
        />
      );
    default:
      return null;
  }
};
