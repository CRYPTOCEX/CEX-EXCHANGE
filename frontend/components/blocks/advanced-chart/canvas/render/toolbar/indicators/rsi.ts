"use client";

import { Activity } from "lucide-react";
import type { CandleData, IndicatorDefinition } from "./registry";

// Calculate RSI
export function calculateRSI(
  data: CandleData[],
  params: Record<string, any>
): number[] {
  const period = typeof params.period === "number" ? params.period : 14;
  const source = typeof params.source === "string" ? params.source : "close";
  const result: number[] = [];

  if (data.length < period + 1) {
    return Array(data.length).fill(50);
  }

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const currentPrice = data[i][source as keyof CandleData] as number;
    const previousPrice = data[i - 1][source as keyof CandleData] as number;
    changes.push(currentPrice - previousPrice);
  }

  // Calculate initial average gain and loss
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Calculate RSI for the first point
  let rs = avgGain / (avgLoss || 1); // Avoid division by zero
  let rsi = 100 - 100 / (1 + rs);

  // Fill in initial values with 50 (neutral)
  for (let i = 0; i < period; i++) {
    result.push(50);
  }

  result.push(rsi);

  // Calculate RSI for the rest of the points using smoothed method
  for (let i = period + 1; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgGain / (avgLoss || 1); // Avoid division by zero
    rsi = 100 - 100 / (1 + rs);

    result.push(rsi);
  }

  // Make sure the result array has the same length as the input data array
  if (result.length < data.length) {
    // Duplicate the last RSI value so result.length === data.length
    result.push(result[result.length - 1]);
  }

  return result;
}

// RSI Indicator Definition
export const RSIIndicator: IndicatorDefinition = {
  defaultSettings: {
    id: "rsi-default",
    type: "rsi",
    name: "RSI",
    description: "Relative Strength Index",
    params: {
      period: 14,
      source: "close",
    },
    visible: false,
    color: "#8b5cf6", // Purple
    lineStyle: "solid",
    separatePanel: true,
    category: "momentum",
  },
  calculate: calculateRSI,
  renderPanel: (
    ctx,
    indicator,
    data,
    chartWidth,
    chartHeight,
    chartTop,
    priceScaleWidth,
    isDarkTheme,
    globalCandleData,
    visibleRange,
    totalVisibleRange,
    startOffset
  ) => {
    if (!indicator.data || indicator.data.length === 0) return;

    const { start, end } = visibleRange;
    const visibleData = indicator.data.slice(start, end + 1);

    if (visibleData.length === 0) return;

    // Set styles based on theme
    const textColor = isDarkTheme
      ? "rgba(255, 255, 255, 0.8)"
      : "rgba(0, 0, 0, 0.8)";
    const gridColor = isDarkTheme
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";
    const lineColor = indicator.color || (isDarkTheme ? "#8b5cf6" : "#7c3aed");

    // Draw panel background - transparent
    ctx.fillStyle = isDarkTheme
      ? "rgba(0, 0, 0, 0.5)"
      : "rgba(255, 255, 255, 0.5)";
    ctx.fillRect(0, chartTop, chartWidth, chartHeight);

    // Draw overbought zone (70-100)
    ctx.fillStyle = isDarkTheme
      ? "rgba(255, 50, 50, 0.1)"
      : "rgba(255, 50, 50, 0.1)";
    const overboughtY = chartTop + chartHeight * 0.3; // 70% from bottom = 30% from top
    ctx.fillRect(0, chartTop, chartWidth, overboughtY - chartTop);

    // Draw oversold zone (0-30)
    ctx.fillStyle = isDarkTheme
      ? "rgba(50, 255, 50, 0.1)"
      : "rgba(50, 255, 50, 0.1)";
    const oversoldY = chartTop + chartHeight * 0.7; // 30% from bottom = 70% from top
    ctx.fillRect(0, oversoldY, chartWidth, chartTop + chartHeight - oversoldY);

    // Draw horizontal grid lines for RSI at 30, 50, and 70 levels
    const levels = [30, 50, 70];

    levels.forEach((level) => {
      const y = chartTop + chartHeight - (level / 100) * chartHeight;

      // Draw grid line
      ctx.beginPath();
      ctx.strokeStyle =
        level === 50
          ? isDarkTheme
            ? "rgba(255, 255, 255, 0.15)"
            : "rgba(0, 0, 0, 0.15)"
          : level === 70
            ? isDarkTheme
              ? "rgba(255, 100, 100, 0.3)"
              : "rgba(255, 0, 0, 0.2)"
            : isDarkTheme
              ? "rgba(100, 255, 100, 0.3)"
              : "rgba(0, 255, 0, 0.2)";

      ctx.lineWidth = 1;

      // Use dashed line for 50 level
      if (level === 50) {
        ctx.setLineDash([2, 2]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth - priceScaleWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw level labels
      ctx.fillStyle = textColor;
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(level.toString(), chartWidth - 5, y - 3);
    });

    // Draw RSI line with improved styling
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < visibleData.length; i++) {
      const value = visibleData[i];
      if (isNaN(value)) continue;

      // Calculate x position correctly - this matches how the main chart calculates x
      const globalIdx = visibleRange.start + i;
      // Subtract startOffset so x=0 at the left edge of the panel
      const x = ((globalIdx - startOffset) / totalVisibleRange) * chartWidth;

      const y = chartTop + chartHeight - (value / 100) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Add shadow/glow effect for better visibility
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw RSI title with improved styling
    ctx.fillStyle = textColor;
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`RSI (${indicator.params.period})`, 8, chartTop + 16);

    // Draw current RSI value with improved styling
    const currentRSI = visibleData[visibleData.length - 1];
    if (currentRSI !== undefined) {
      // Determine color based on RSI value
      let valueColor = lineColor;
      if (currentRSI > 70) {
        valueColor = isDarkTheme ? "#ef4444" : "#dc2626"; // Red for overbought
      } else if (currentRSI < 30) {
        valueColor = isDarkTheme ? "#22c55e" : "#16a34a"; // Green for oversold
      }

      ctx.fillStyle = valueColor;
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(currentRSI.toFixed(2), 80, chartTop + 16);
    }
  },
  getSettings: () => [
    {
      name: "period",
      label: "Period",
      type: "number",
      min: 2,
      max: 50,
      step: 1,
      default: 14,
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
      ],
    },
  ],
  icon: Activity,
  getLightThemeColor: () => "#7c3aed", // Slightly darker purple for light theme
  getDarkThemeColor: () => "#8b5cf6", // Original purple for dark theme
};
