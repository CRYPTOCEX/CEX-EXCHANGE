"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart,
  Bar,
} from "recharts";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from "@/lib/ico/utils";
import { HelpCircle } from "lucide-react";
import type {
  MarketProjection,
  SimulatorState,
} from "@/lib/ico/token-simulator/types";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface ProjectionTabProps {
  marketProjections: MarketProjection[];
  initialPrice: number;
  growthRate: number;
  volatility: number;
  projectionMonths: number;
  onMarketParamsChange: (params: Partial<SimulatorState>) => void;
}

export function ProjectionTab({
  marketProjections,
  initialPrice,
  growthRate,
  volatility,
  projectionMonths,
  onMarketParamsChange,
}: ProjectionTabProps) {
  const t = useTranslations("ext");
  const [chartView, setChartView] = useState<
    "price" | "marketCap" | "combined"
  >("price");

  // Calculate projection highlights
  const projectionHighlights = [
    {
      label: "Initial Price",
      value: formatCurrency(initialPrice),
    },
    {
      label: "Projected Price (1 Year)",
      value: formatCurrency(marketProjections[12]?.price || 0),
    },
    {
      label: "Projected Market Cap (1 Year)",
      value: formatCurrency(marketProjections[12]?.marketCap || 0),
    },
    {
      label: "ROI from Initial Price (1 Year)",
      value: formatPercentage(
        ((marketProjections[12]?.price || 0) / initialPrice - 1) * 100
      ),
      isPositive: (marketProjections[12]?.price || 0) > initialPrice,
    },
  ];

  // Filter data for charts to avoid too many points
  const filteredData = marketProjections.filter(
    (_, i) => i % 3 === 0 || i === 0 || i === marketProjections.length - 1
  );

  // Find max values for scaling
  const maxPrice = Math.max(...marketProjections.map((d) => d.price)) * 1.1;
  const maxMarketCap =
    Math.max(...marketProjections.map((d) => d.marketCap)) * 1.1;
  const maxCirculatingSupply =
    Math.max(...marketProjections.map((d) => d.circulatingSupply)) * 1.1;

  // Custom tooltip formatter
  const priceTooltipFormatter = (value: number, name: string) => {
    if (name === "Price") return [`${formatCurrency(value)}`, name];
    return [value, name];
  };

  const marketCapTooltipFormatter = (value: number, name: string) => {
    if (name === "Market Cap") return [`${formatCurrency(value)}`, name];
    if (name === "Circulating Supply")
      return [`${formatNumber(value)} tokens`, name];
    return [value, name];
  };

  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-xs border rounded-md shadow-md p-4 text-sm">
          <p className="font-medium mb-2">
            {t("Month")}
            {label}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("price")}</span>
              <span className="font-medium">{formatCurrency(data.price)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("market_cap")}</span>
              <span className="font-medium">
                {formatCurrency(data.marketCap)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                {t("circulating_supply")}
              </span>
              <span className="font-medium">
                {formatNumber(data.circulatingSupply)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("%_released")}</span>
              <span className="font-medium">
                {formatPercentage(data.percentReleased)}
              </span>
            </div>
            {data.month >= 1 && (
              <div className="pt-2 border-t mt-2">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {t("monthly_change")}
                  </span>
                  <span
                    className={`font-medium ${
                      data.price >
                      (payload[0].payload.prevPrice || initialPrice)
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {formatPercentage(
                      (data.price / (data.prevPrice || initialPrice) - 1) * 100
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Add previous price to data for change calculation
  const dataWithPrevPrice = filteredData.map((item, index, array) => ({
    ...item,
    prevPrice: index > 0 ? array[index - 1].price : initialPrice,
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <div className="space-y-6">
        <h3 className="text-lg font-medium">{t("market_parameters")}</h3>

        <div className="grid gap-6">
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center">
              {t("monthly_growth_rate_(%)")}
              <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
            </label>
            <div className="flex items-center gap-3">
              <Slider
                value={[growthRate]}
                min={-10}
                max={20}
                step={0.5}
                onValueChange={(value) =>
                  onMarketParamsChange({ growthRate: value[0] })
                }
                className="w-full"
              />
              <Input
                type="number"
                value={growthRate}
                onChange={(e) =>
                  onMarketParamsChange({ growthRate: Number(e.target.value) })
                }
                min={-10}
                max={20}
                step={0.5}
                className="w-24 text-center"
                icon="mdi:percent"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center">
              {t("volatility_(%)")}
              <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
            </label>
            <div className="flex items-center gap-3">
              <Slider
                value={[volatility]}
                min={0}
                max={50}
                step={1}
                onValueChange={(value) =>
                  onMarketParamsChange({ volatility: value[0] })
                }
                className="w-full"
              />
              <Input
                type="number"
                value={volatility}
                onChange={(e) =>
                  onMarketParamsChange({ volatility: Number(e.target.value) })
                }
                min={0}
                max={50}
                className="w-24 text-center"
                icon="mdi:percent"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">
              {t("projection_period_(months)")}
            </label>
            <div className="flex items-center gap-3">
              <Slider
                value={[projectionMonths]}
                min={12}
                max={60}
                step={12}
                onValueChange={(value) =>
                  onMarketParamsChange({ projectionMonths: value[0] })
                }
                className="w-full"
              />
              <Input
                type="number"
                value={projectionMonths}
                onChange={(e) =>
                  onMarketParamsChange({
                    projectionMonths: Number(e.target.value),
                  })
                }
                min={12}
                max={60}
                step={12}
                className="w-24 text-center"
                icon="mdi:percent"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-4">
          <h4 className="font-medium">{t("projection_highlights")}</h4>

          <div className="grid gap-4">
            {projectionHighlights.map((highlight, index) => (
              <div key={index}>
                <p className="text-sm text-muted-foreground mb-1">
                  {highlight.label}
                </p>
                <p
                  className={`font-medium ${
                    highlight.isPositive !== undefined
                      ? highlight.isPositive
                        ? "text-green-500"
                        : "text-red-500"
                      : ""
                  }`}
                >
                  {highlight.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="xl:col-span-2 space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{t("market_projections")}</h3>
          <div className="flex bg-muted rounded-md p-1">
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartView === "price"
                  ? "bg-background shadow-2xs"
                  : "hover:bg-background/50"
              }`}
              onClick={() => setChartView("price")}
            >
              {t("Price")}
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartView === "marketCap"
                  ? "bg-background shadow-2xs"
                  : "hover:bg-background/50"
              }`}
              onClick={() => setChartView("marketCap")}
            >
              {t("market_cap")}
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartView === "combined"
                  ? "bg-background shadow-2xs"
                  : "hover:bg-background/50"
              }`}
              onClick={() => setChartView("combined")}
            >
              {t("Combined")}
            </button>
          </div>
        </div>

        <div className="aspect-2/1 w-full bg-card/50 border rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === "price" ? (
              <AreaChart data={dataWithPrevPrice}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.2}
                />
                <XAxis
                  dataKey="month"
                  label={{
                    value: "Month",
                    position: "insideBottom",
                    offset: -5,
                  }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value) => `$${value.toFixed(4)}`}
                  domain={[0, maxPrice]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine
                  y={initialPrice}
                  stroke="#6B7280"
                  strokeDasharray="3 3"
                  label={{
                    value: "Initial Price",
                    position: "insideBottomRight",
                    fill: "#6B7280",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#colorPrice)"
                  name="Price"
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            ) : chartView === "marketCap" ? (
              <AreaChart data={dataWithPrevPrice}>
                <defs>
                  <linearGradient
                    id="colorMarketCap"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.2}
                />
                <XAxis
                  dataKey="month"
                  label={{
                    value: "Month",
                    position: "insideBottom",
                    offset: -5,
                  }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value) => `$${formatNumber(value)}`}
                  domain={[0, maxMarketCap]}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => `${formatNumber(value)}`}
                  domain={[0, maxCirculatingSupply]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="marketCap"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#colorMarketCap)"
                  name="Market Cap"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="circulatingSupply"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  name="Circulating Supply"
                  dot={false}
                />
              </AreaChart>
            ) : (
              <ComposedChart data={dataWithPrevPrice}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.2}
                />
                <XAxis
                  dataKey="month"
                  label={{
                    value: "Month",
                    position: "insideBottom",
                    offset: -5,
                  }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="price"
                  tickFormatter={(value) => `$${value.toFixed(4)}`}
                  domain={[0, maxPrice]}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="marketCap"
                  orientation="right"
                  tickFormatter={(value) => `$${formatNumber(value)}`}
                  domain={[0, maxMarketCap]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="price"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#colorPrice)"
                  name="Price"
                />
                <Bar
                  yAxisId="marketCap"
                  dataKey="marketCap"
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="Market Cap"
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="percentReleased"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name="% Released"
                  dot={false}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">
                {t("peak_price")}
              </p>
              <p className="text-xl font-bold">
                {formatCurrency(
                  Math.max(...marketProjections.map((d) => d.price))
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("Month")}{" "}
                {marketProjections.findIndex(
                  (d) =>
                    d.price ===
                    Math.max(...marketProjections.map((p) => p.price))
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">
                {t("peak_market_cap")}
              </p>
              <p className="text-xl font-bold">
                {formatCurrency(
                  Math.max(...marketProjections.map((d) => d.marketCap))
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("Month")}{" "}
                {marketProjections.findIndex(
                  (d) =>
                    d.marketCap ===
                    Math.max(...marketProjections.map((p) => p.marketCap))
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">
                {t("max_roi_potential")}
              </p>
              <p className="text-xl font-bold text-green-500">
                {formatPercentage(
                  (Math.max(...marketProjections.map((d) => d.price)) /
                    initialPrice -
                    1) *
                    100
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("from_initial_price")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
