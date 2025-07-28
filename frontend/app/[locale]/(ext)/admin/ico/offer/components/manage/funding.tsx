"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { useAdminOfferStore } from "@/store/ico/admin/admin-offer-store";
import { useTranslations } from "next-intl";

export function OfferingFundingChart() {
  const t = useTranslations("ext");
  const { offering, fundingData, fetchFundingChart, offerMetrics } =
    useAdminOfferStore();

  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">(
    "30d"
  );

  const offeringId = offering?.id;

  useEffect(() => {
    if (offeringId) {
      fetchFundingChart(offeringId, timeRange);
    }
  }, [offeringId, timeRange, fetchFundingChart]);

  if (!offering || !fundingData) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <p>{t("loading_chart_data")}.</p>
      </div>
    );
  }

  const targetAmount = offering.targetAmount;
  const currentRaised = offerMetrics?.currentRaised || 0;
  const filteredData = fundingData; // Already filtered from backend

  const progressPercentage = Math.min(
    Math.round((currentRaised / targetAmount) * 100),
    100
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <Tabs
          defaultValue="30d"
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as any)}
        >
          <TabsList>
            <TabsTrigger value="7d">{t("7_days")}</TabsTrigger>
            <TabsTrigger value="30d">{t("30_days")}</TabsTrigger>
            <TabsTrigger value="90d">{t("90_days")}</TabsTrigger>
            <TabsTrigger value="all">{t("all_time")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button
            variant={chartType === "area" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("area")}
            className="h-8"
          >
            {t("Area")}
          </Button>
          <Button
            variant={chartType === "bar" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("bar")}
            className="h-8"
          >
            {t("Bar")}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorValid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
              />
              <RechartsTooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                }}
              />
              <Legend />
              {/* Cumulative Series */}
              <Area
                type="monotone"
                dataKey="totalCumulative"
                name="Total Raised"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorTotal)"
                strokeWidth={2}
                activeDot={{ r: 6 }}
              />
              <Area
                type="monotone"
                dataKey="validCumulative"
                name="Valid Raised"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorValid)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="rejectedCumulative"
                name="Rejected Raised"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorRejected)"
                strokeWidth={2}
              />
              {/* Daily Series */}
              <Area
                type="monotone"
                dataKey="totalAmount"
                name="Daily Total"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorDaily)"
                strokeWidth={2}
              />
              {/* Optionally, you can add areas for daily valid and rejected amounts */}
              {/* 
              <Area
                type="monotone"
                dataKey="validAmount"
                name="Daily Valid"
                stroke="#34d399"
                fillOpacity={1}
                fill="url(#colorValid)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="rejectedAmount"
                name="Daily Rejected"
                stroke="#f87171"
                fillOpacity={1}
                fill="url(#colorRejected)"
                strokeWidth={2}
              /> 
              */}
            </AreaChart>
          ) : (
            <BarChart
              data={filteredData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
              />
              <RechartsTooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                }}
              />
              <Legend />
              <Bar
                dataKey="totalAmount"
                name="Daily Total"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
              {/* Similarly, you can add bars for validAmount and rejectedAmount */}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-600 font-medium">
                {t("current_raised")}
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(currentRaised)}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-green-600 font-medium">
                {t("Progress")}
              </p>
              <p className="text-2xl font-bold">{progressPercentage}%</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-4 border-green-600 flex items-center justify-center">
                <div
                  className="h-6 w-6 bg-green-600 rounded-full"
                  style={{
                    clipPath: `polygon(0 0, 100% 0, 100% ${progressPercentage}%, 0 ${progressPercentage}%)`,
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
