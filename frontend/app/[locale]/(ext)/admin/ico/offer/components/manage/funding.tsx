"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Activity, TrendingUp, DollarSign, Target } from "lucide-react";
import { useAdminOfferStore } from "@/store/ico/admin/admin-offer-store";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function OfferingFundingChart() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const { offering, fundingData, fetchFundingChart, offerMetrics, isLoadingFunding } =
    useAdminOfferStore();

  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [activeMetric, setActiveMetric] = useState<"totalCumulative" | "validCumulative" | "totalAmount">("totalCumulative");

  const offeringId = offering?.id;
  const currency = offering?.purchaseWalletCurrency || "USD";

  useEffect(() => {
    if (offeringId) {
      fetchFundingChart(offeringId, timeRange);
    }
  }, [offeringId, timeRange, fetchFundingChart]);

  const targetAmount = offering?.targetAmount || 0;
  const currentRaised = offerMetrics?.currentRaised || 0;
  const progressPercentage = targetAmount > 0
    ? Math.min(Math.round((currentRaised / targetAmount) * 100), 100)
    : 0;

  const formatCurrency = (value: number) =>
    `${value.toLocaleString()} ${currency}`;

  const formatAxisValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  const metrics = [
    { key: "totalCumulative", label: "Total Raised", color: "#3b82f6" },
    { key: "validCumulative", label: "Valid Raised", color: "#10b981" },
    { key: "totalAmount", label: "Daily", color: "#f59e0b" },
  ];

  const timeRanges = [
    { key: "7d", label: `7 ${tCommon("days")}` },
    { key: "30d", label: `30 ${tCommon("days")}` },
    { key: "90d", label: `90 ${tCommon("days")}` },
    { key: "all", label: tCommon("all_time") },
  ];

  // Loading state
  if (isLoadingFunding && !fundingData) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="flex-1 min-h-[280px] rounded-xl" />
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  // No data state
  if (!offering || !fundingData || fundingData.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-[280px] flex items-center justify-center">
          <div className="text-center">
            <Activity className="h-10 w-10 mx-auto mb-2 opacity-40 text-muted-foreground" />
            <p className="text-muted-foreground">{tCommon("no_data_available")}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-500 font-medium">{t("current_raised")}</p>
                <p className="text-2xl font-bold">{formatCurrency(currentRaised)}</p>
              </div>
              <div className="h-12 w-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-green-500 font-medium">{tCommon("progress")}</p>
                <p className="text-2xl font-bold">{progressPercentage}%</p>
              </div>
              <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Target className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeColor = metrics.find(m => m.key === activeMetric)?.color || "#3b82f6";

  return (
    <div className="h-full flex flex-col">
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        {/* Time Range Selector */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range.key}
              onClick={() => setTimeRange(range.key as any)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                timeRange === range.key
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Chart Type Toggle */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setChartType("area")}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              chartType === "area"
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            {tCommon("area")}
          </button>
          <button
            onClick={() => setChartType("bar")}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              chartType === "bar"
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            {t("bar")}
          </button>
        </div>
      </div>

      {/* Metric Toggle */}
      <div className="flex items-center gap-2 mb-4">
        {metrics.map((metric) => (
          <button
            key={metric.key}
            onClick={() => setActiveMetric(metric.key as any)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeMetric === metric.key
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: metric.color }}
              />
              {metric.label}
            </span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart data={fundingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fundingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={activeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={formatAxisValue}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                formatter={(value: number) => [
                  formatCurrency(value),
                  metrics.find(m => m.key === activeMetric)?.label
                ]}
              />
              <Area
                type="monotone"
                dataKey={activeMetric}
                stroke={activeColor}
                strokeWidth={2.5}
                fill="url(#fundingGradient)"
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            </AreaChart>
          ) : (
            <BarChart data={fundingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={formatAxisValue}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                formatter={(value: number) => [
                  formatCurrency(value),
                  metrics.find(m => m.key === activeMetric)?.label
                ]}
              />
              <Bar
                dataKey={activeMetric}
                fill={activeColor}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Stats Cards */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-500 font-medium">{t("current_raised")}</p>
              <p className="text-2xl font-bold">{formatCurrency(currentRaised)}</p>
            </div>
            <div className="h-12 w-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-green-500 font-medium">{tCommon("progress")}</p>
              <p className="text-2xl font-bold">{progressPercentage}%</p>
            </div>
            <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <div className="relative">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-green-500/20"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${progressPercentage * 0.88} 88`}
                    strokeLinecap="round"
                    className="text-green-500"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
