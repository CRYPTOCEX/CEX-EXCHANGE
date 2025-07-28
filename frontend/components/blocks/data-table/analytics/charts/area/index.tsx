import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StackedAreaContent } from "./content";
import { Legend } from "../line/legend";
import { ChartCardProps } from "../line/types";
import { useTranslations } from "next-intl";

export const StackedAreaChart: React.FC<ChartCardProps> = React.memo(
  ({
    chartKey,
    config,
    data,
    formatXAxis,
    width = "half",
    className,
    loading,
    timeframe,
  }) => {
    const t = useTranslations(
      "components/blocks/data-table/analytics/charts/area/index"
    );
    const hasData = Array.isArray(data) && data.length > 0;

    return (
      <Card
        className={cn("bg-transparent rounded-xl border relative", className)}
        aria-labelledby={`${chartKey}-title`}
      >
        <CardHeader>
          <CardTitle
            id={`${chartKey}-title`}
            className="text-xl font-semibold tracking-tight"
          >
            {config.title}
          </CardTitle>
          <p
            className="text-sm text-muted-foreground"
            id={`${chartKey}-description`}
          >
            {t("visualize_cumulative_user_over_time")}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="mt-6 h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !hasData ? (
            <div className="mt-6 h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">{t("no_data_available")}</p>
            </div>
          ) : (
            <div className="mt-6 h-[400px]">
              <StackedAreaContent
                chartKey={chartKey}
                config={config}
                data={data}
                formatXAxis={formatXAxis}
                timeframe={timeframe}
              />
            </div>
          )}
          {hasData && <Legend config={config} />}
        </CardContent>
      </Card>
    );
  }
);

StackedAreaChart.displayName = "StackedAreaChart";

export default StackedAreaChart;
