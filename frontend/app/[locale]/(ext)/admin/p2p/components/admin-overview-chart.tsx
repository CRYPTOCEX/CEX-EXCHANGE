"use client";

import { useEffect } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Bar,
  ComposedChart,
  Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboardStore } from "@/store/p2p/admin-dashboard-store";

export function AdminOverviewChart() {
  const { platformActivity, isLoadingActivity, fetchPlatformActivity } =
    useAdminDashboardStore();

  useEffect(() => {
    fetchPlatformActivity();
  }, [fetchPlatformActivity]);

  if (isLoadingActivity) {
    return (
      <div className="w-full space-y-2">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={platformActivity}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <defs>
            <linearGradient id="colorTrades" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.4}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(var(--foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "hsl(var(--foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            domain={[0, "auto"]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "hsl(var(--foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            domain={[0, "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              borderColor: "hsl(var(--border))",
              borderRadius: "6px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            }}
            itemStyle={{ padding: "4px 0" }}
            labelStyle={{ fontWeight: "bold", marginBottom: "8px" }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            wrapperStyle={{ paddingTop: "10px" }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="trades"
            name="Active Trades"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: "#3b82f6" }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
          <Bar
            yAxisId="right"
            dataKey="volume"
            name="Trading Volume ($K)"
            barSize={20}
            fill="#93c5fd"
            fillOpacity={0.7}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="revenue"
            name="Revenue ($K)"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: "#10b981" }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
