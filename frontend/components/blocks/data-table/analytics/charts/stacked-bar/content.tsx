import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ChartContentProps } from "../line/types";
import { variants, formatNumber } from "../line/utils";

export const StackedBarContent: React.FC<ChartContentProps> = React.memo(
  ({ chartKey, config, data, formatXAxis, timeframe }) => {
    const parsedData = useMemo(() => {
      return data
        .map((item) => ({
          ...item,
          date: typeof item.date === "string" ? parseISO(item.date) : item.date,
        }))
        .filter(
          (item) => item.date instanceof Date && !isNaN(item.date.getTime())
        );
    }, [data]);

    const getColorForMetric = (index: number) =>
      variants[["info", "success", "warning", "danger"][index] || "default"];

    const formatDate = (date: Date) => {
      return timeframe === "24h"
        ? format(date, "HH:mm")
        : format(date, "MMM dd");
    };

    const renderTooltipContent = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="rounded-lg border bg-background/95 backdrop-blur-xs supports-backdrop-filter:bg-background/85 p-4 shadow-xl">
            <div className="text-sm font-medium mb-2 text-muted-foreground">
              {formatDate(label)}
            </div>
            {payload.map((entry: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between gap-8 text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-medium tabular-nums text-foreground">
                  {formatNumber(entry.value)}
                </span>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };

    if (!parsedData.length) return null;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={parsedData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.1}
            horizontal
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            axisLine={false}
            tickLine={false}
            dy={10}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            interval={timeframe === "24h" ? 2 : "preserveStartEnd"}
            aria-label="Date"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            dx={-10}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={formatNumber}
            width={45}
            aria-label="Value"
          />
          <Tooltip
            content={renderTooltipContent}
            cursor={{ fill: "hsl(var(--muted-foreground))", opacity: 0.1 }}
          />
          {config.metrics?.map((metric: string, index: number) => (
            <Bar
              key={metric}
              dataKey={metric}
              name={config.labels?.[metric] || metric}
              fill={getColorForMetric(index).stroke}
              stackId="a"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }
);

StackedBarContent.displayName = "StackedBarContent";
