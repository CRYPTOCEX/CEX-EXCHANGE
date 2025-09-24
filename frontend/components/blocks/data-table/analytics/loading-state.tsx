import React from "react";
import { AnalyticsHeader } from "./header";
import { KpiCardSkeleton } from "./kpi/skeleton";
import { ChartSkeleton } from "./charts/chart-skeleton";
import { DonutChartSkeleton } from "./charts/donut/skeleton";
import { cn } from "@/lib/utils";
import { AnalyticsConfig } from "../types/analytics";

interface LoadingStateProps {
  analyticsConfig: AnalyticsConfig | null;
  timeframe: string;
  onTimeframeChange: (value: string) => void;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  analyticsConfig,
  timeframe,
  onTimeframeChange,
}) => (
  <div className="space-y-6">
    <AnalyticsHeader
      timeframe={timeframe}
      onTimeframeChange={onTimeframeChange}
    />
    {analyticsConfig && (
      <div className="grid gap-6">
        {analyticsConfig.map((section, index) => (
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
              ? section.map((item, subIndex) => (
                  <div key={subIndex}>
                    {item.type === "kpi" && (
                      <div
                        className={cn(
                          "grid gap-4",
                          item.layout?.cols &&
                            item.layout?.rows &&
                            `grid-cols-${item.layout.cols} grid-rows-${item.layout.rows}`
                        )}
                      >
                        {Array(item.items.length)
                          .fill(0)
                          .map((_, i) => (
                            <KpiCardSkeleton key={i} />
                          ))}
                      </div>
                    )}
                    {item.type === "chart" &&
                      item.items.map((chart: any, i) =>
                        chart.type === "pie" ? (
                          <DonutChartSkeleton key={i} />
                        ) : (
                          <ChartSkeleton key={i} title={chart.title} />
                        )
                      )}
                  </div>
                ))
              : section.type === "chart" &&
                section.items.map((chart: any, i) => (
                  <ChartSkeleton key={i} title={chart.title} />
                ))}
          </div>
        ))}
      </div>
    )}
  </div>
);
