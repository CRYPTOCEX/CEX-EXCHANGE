"use client";

import { LineChart } from "lucide-react";
import type { CandleData, IndicatorDefinition } from "./registry";

// Calculate Simple Moving Average
export function calculateSMA(
  data: CandleData[],
  params: Record<string, any>
): number[] {
  const period: number = Number(params.period);
  const source: string = String(params.source);
  const result: number[] = [];

  // Fill with nulls for the first (period-1) points
  for (let i = 0; i < period - 1; i++) {
    result.push(Number.NaN);
  }

  // Calculate SMA for the rest of the points
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      const value = data[i - j][source as keyof CandleData];
      if (typeof value === "number") {
        sum += value;
      }
    }
    result.push(sum / period);
  }

  return result;
}

// SMA Indicator Definition
export const SMAIndicator: IndicatorDefinition = {
  defaultSettings: {
    id: "sma-default",
    type: "sma",
    name: "SMA",
    description: "Simple Moving Average",
    params: {
      period: 20,
      source: "close",
    },
    visible: false,
    color: "#3b82f6", // Blue
    lineStyle: "solid",
    separatePanel: false,
    category: "trend",
  },
  calculate: calculateSMA,
  render: (
    ctx,
    indicator,
    data,
    chartWidth,
    chartHeight,
    chartTop,
    priceRange
  ) => {
    if (!indicator.data || indicator.data.length === 0) return;

    const { min, max } = priceRange;
    const range = max - min;

    ctx.strokeStyle = indicator.color;
    ctx.lineWidth = 1.5;

    // Set line style
    if (indicator.lineStyle === "dashed") {
      ctx.setLineDash([5, 3]);
    } else if (indicator.lineStyle === "dotted") {
      ctx.setLineDash([2, 2]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();

    const barWidth = chartWidth / data.length;
    let firstPoint = true;

    for (let i = 0; i < indicator.data.length; i++) {
      const value = indicator.data[i];

      if (isNaN(value)) continue;

      const x = i * barWidth + barWidth / 2;
      const y = chartTop + chartHeight - ((value - min) / range) * chartHeight;

      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.setLineDash([]); // Reset line style
  },
  getSettings: () => [
    {
      name: "period",
      label: "Period",
      type: "number",
      min: 1,
      max: 200,
      step: 1,
      default: 20,
    },
    {
      name: "source",
      label: "Source",
      type: "select",
      default: "close",
      options: [
        { value: "close", label: "Close" },
        { value: "open", label: "Open" },
        { value: "high", label: "High" },
        { value: "low", label: "Low" },
        { value: "hl2", label: "HL2" },
        { value: "hlc3", label: "HLC3" },
        { value: "ohlc4", label: "OHLC4" },
      ],
    },
  ],
  icon: LineChart,
  getLightThemeColor: () => "#2563eb", // Slightly darker blue for light theme
  getDarkThemeColor: () => "#3b82f6", // Original blue for dark theme
};
