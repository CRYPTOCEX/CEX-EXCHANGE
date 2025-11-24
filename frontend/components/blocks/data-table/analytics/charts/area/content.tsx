import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ChartContentProps } from "../line/types";
import { variants, formatNumber } from "../line/utils";

export const StackedAreaContent: React.FC<ChartContentProps> = React.memo(
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
      variants[["info", "success", "warning"][index] || "default"];

    const formatDate = (date: Date) => {
      if (timeframe === "24h") {
        return format(date, "HH:mm");
      }
      return format(date, "MMM dd");
    };

    const renderTooltipContent = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="rounded-lg border bg-background/95 backdrop-blur-xs supports-backdrop-filter:bg-background/85 p-4 shadow-xl">
            <div className="text-sm font-medium mb-2 text-muted-foreground">
              {formatDate(label)}
            </div>
            {payload.reverse().map((entry: any, index: number) => (
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

    if (!parsedData.length) {
      return null;
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={parsedData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.1}
            horizontal={true}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            axisLine={false}
            tickLine={false}
            dy={10}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            interval="preserveStartEnd"
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
            cursor={{
              stroke: "hsl(var(--muted-foreground))",
              strokeWidth: 1,
              strokeDasharray: "4 4",
              opacity: 0.15,
            }}
          />
          {config.metrics?.map((metric, index) => (
            <Area
              key={metric}
              type="monotone"
              dataKey={metric}
              name={config.labels?.[metric] || metric}
              stroke={getColorForMetric(index).stroke}
              fill={getColorForMetric(index).fill}
              stackId="1"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }
);

StackedAreaContent.displayName = "StackedAreaContent";
