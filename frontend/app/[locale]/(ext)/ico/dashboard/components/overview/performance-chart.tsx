"use client";

import { useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/ico/utils";
import { usePortfolioPerformanceStore } from "@/store/ico/portfolio/performance-store";
import { useTranslations } from "next-intl";

export function PerformanceChart() {
  const t = useTranslations("ext");
  const { performanceData, metrics, fetchPerformanceData, timeframe, error } =
    usePortfolioPerformanceStore();

  // Fetch performance data on mount / when timeframe changes.
  useEffect(() => {
    fetchPerformanceData(timeframe);
  }, [fetchPerformanceData, timeframe]);

  if (error) {
    return (
      <div className="text-red-500">
        {t("failed_to_load_performance_data")}.
      </div>
    );
  }
  if (!performanceData.length || !metrics) {
    return <div>{t("no_performance_data_available")}.</div>;
  }

  const initialValue = metrics.initialValue;
  const currentValue = metrics.currentValue;
  const isPositive = currentValue > initialValue;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={performanceData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            domain={["dataMin - 100", "dataMax + 100"]}
          />
          <Tooltip
            formatter={(value) => [
              `${formatCurrency(Number(value))}`,
              "Portfolio Value",
            ]}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{
              backgroundColor: "rgba(17, 24, 39, 0.8)",
              border: "none",
              borderRadius: "4px",
              color: "#fff",
            }}
          />
          <ReferenceLine
            y={initialValue}
            stroke="#6B7280"
            strokeDasharray="3 3"
            label={{
              value: "Initial Investment",
              position: "insideBottomRight",
              fill: "#6B7280",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={isPositive ? "#10B981" : "#EF4444"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
