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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortfolioPerformanceStore } from "@/store/ico/portfolio/performance-store";
import { formatCurrency, formatPercentage } from "@/lib/ico/utils";
import { useTranslations } from "next-intl";

export function PortfolioPerformance() {
  const t = useTranslations("ext");
  const {
    performanceData,
    metrics,
    timeframe,
    isLoading,
    fetchPerformanceData,
    setTimeframe,
  } = usePortfolioPerformanceStore();

  useEffect(() => {
    fetchPerformanceData(timeframe);
  }, [fetchPerformanceData, timeframe]);

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="animate-pulse bg-muted h-6 w-32 rounded" />
          <div className="animate-pulse bg-muted h-10 w-64 rounded" />
        </div>
        <div className="h-[300px] animate-pulse bg-muted rounded-md" />
      </div>
    );
  }

  // Calculate if the overall trend is positive or negative
  const isPositive = metrics.percentageChange >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">
            {t("portfolio_performance")}
            <span
              className={`ml-2 ${
                isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {isPositive ? "↑" : "↓"}{" "}
              {formatPercentage(metrics.percentageChange)}
            </span>
          </h3>
          <p className="text-sm text-muted-foreground">
            {timeframe === "1W"
              ? "Past week"
              : timeframe === "1M"
                ? "Past month"
                : timeframe === "3M"
                  ? "Past 3 months"
                  : timeframe === "1Y"
                    ? "Past year"
                    : "All time"}
          </p>
        </div>
        <div className="flex space-x-1 bg-muted p-1 rounded-md">
          {["1W", "1M", "3M", "1Y", "ALL"].map((period) => (
            <Button
              key={period}
              variant={timeframe === period ? "default" : "ghost"}
              size="sm"
              onClick={() => handleTimeframeChange(period)}
              className="text-xs"
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={performanceData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              opacity={0.1}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
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
              y={metrics.initialValue}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {t("initial_value")}
            </p>
            <p className="text-xl font-bold">
              {formatCurrency(metrics.initialValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {t("current_value")}
            </p>
            <p className="text-xl font-bold">
              {formatCurrency(metrics.currentValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("Profit_Loss")}</p>
            <p
              className={`text-xl font-bold ${
                isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {isPositive ? "+" : ""}
              {formatCurrency(metrics.absoluteChange)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">{t("Performance")}</TabsTrigger>
          <TabsTrigger value="comparison">{t("market_comparison")}</TabsTrigger>
          <TabsTrigger value="allocation">{t("asset_allocation")}</TabsTrigger>
        </TabsList>
        <TabsContent value="performance" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("best_day")}</p>
              <p className="font-medium">{metrics.bestDay.date}</p>
              <p className="text-sm text-green-500">
                +{formatPercentage(metrics.bestDay.change)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("worst_day")}</p>
              <p className="font-medium">{metrics.worstDay.date}</p>
              <p className="text-sm text-red-500">
                {formatPercentage(metrics.worstDay.change)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("Volatility")}</p>
              <p className="font-medium">
                {formatPercentage(metrics.volatility)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("sharpe_ratio")}
              </p>
              <p className="font-medium">{metrics.sharpeRatio.toFixed(2)}</p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="comparison" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("vs")}. {t("Bitcoin")}
              </p>
              <p
                className={`font-medium ${
                  metrics.marketComparison.btc >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {metrics.marketComparison.btc >= 0 ? "+" : ""}
                {formatPercentage(metrics.marketComparison.btc)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("vs")}. {t("Ethereum")}
              </p>
              <p
                className={`font-medium ${
                  metrics.marketComparison.eth >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {metrics.marketComparison.eth >= 0 ? "+" : ""}
                {formatPercentage(metrics.marketComparison.eth)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("vs")}. {t("crypto_index")}
              </p>
              <p
                className={`font-medium ${
                  metrics.marketComparison.index >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {metrics.marketComparison.index >= 0 ? "+" : ""}
                {formatPercentage(metrics.marketComparison.index)}
              </p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="allocation" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">{t("by_token")}</p>
              <div className="space-y-2">
                {metrics.allocation.byToken.map((token, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getColorByIndex(index) }}
                      />
                      <span className="text-sm">{token.name}</span>
                    </div>
                    <span className="text-sm">
                      {formatPercentage(token.percentage)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* <div>
              <p className="text-sm font-medium mb-2">By Status</p>
              <div className="space-y-2">
                {metrics.allocation.byStatus.map((status, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getStatusColor(status.name) }}
                      />
                      <span className="text-sm">{status.name}</span>
                    </div>
                    <span className="text-sm">
                      {formatPercentage(status.percentage)}
                    </span>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to get a color based on index
function getColorByIndex(index: number): string {
  const colors = [
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // amber
    "#6366F1", // indigo
    "#EC4899", // pink
    "#8B5CF6", // purple
    "#14B8A6", // teal
    "#F43F5E", // rose
  ];
  return colors[index % colors.length];
}

// Helper function to get color based on status
function getStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "#3B82F6"; // blue
    case "Completed":
      return "#10B981"; // green
    case "Pending":
      return "#F59E0B"; // amber
    default:
      return "#6B7280"; // gray
  }
}
