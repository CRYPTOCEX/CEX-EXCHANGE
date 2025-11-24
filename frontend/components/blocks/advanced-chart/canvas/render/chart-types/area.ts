import type { CandleData } from "../../../types";
import { globalCandleData } from "../../../utils";

// Update the area chart renderer to use theme-based colors
export function renderArea(
  ctx: CanvasRenderingContext2D,
  data: CandleData[],
  chartWidth: number,
  chartHeight: number,
  chartTop: number,
  priceRange: { min: number; max: number },
  darkMode: boolean,
  totalVisibleRange: number,
  startOffset: number
) {
  // Use theme-appropriate colors
  const areaColor = darkMode
    ? "rgba(74, 222, 128, 0.2)"
    : "rgba(34, 197, 94, 0.2)"; // Semi-transparent green
  const lineColor = darkMode ? "#4ade80" : "#22c55e"; // Solid green
  const priceRangeDiff = priceRange.max - priceRange.min;

  // Only proceed if we have data
  if (!data || data.length === 0) return;

  // Find the last valid x-coordinate to properly close the path
  let lastValidX = 0;
  let lastValidY = 0;

  // Draw area
  ctx.beginPath();

  // Start at the bottom left of the first valid data point
  const firstDataIndex = data[0].time
    ? globalCandleData.findIndex((c) => c.time === data[0].time)
    : 0;
  const firstAdjustedIndex = firstDataIndex >= 0 ? firstDataIndex : 0;
  const firstX =
    ((firstAdjustedIndex - startOffset) / totalVisibleRange) * chartWidth;

  // Start at the bottom of the chart for the first x position
  ctx.moveTo(firstX, chartTop + chartHeight);

  // Draw the line connecting all data points
  data.forEach((candle, i) => {
    // Calculate x position based on the candle's position in the full dataset
    const dataIndex = data[i].time
      ? globalCandleData.findIndex((c) => c.time === data[i].time)
      : i;
    const adjustedIndex = dataIndex >= 0 ? dataIndex : i;
    const x = ((adjustedIndex - startOffset) / totalVisibleRange) * chartWidth;

    // Skip if outside visible area
    if (x < 0 || x > chartWidth) return;

    const y =
      chartTop +
      ((priceRange.max - candle.close) / priceRangeDiff) * chartHeight;
    ctx.lineTo(x, y);

    // Keep track of the last valid point
    lastValidX = x;
    lastValidY = y;
  });

  // Complete the path by going down to the bottom right of the last valid data point
  // and then back to the starting point
  ctx.lineTo(lastValidX, chartTop + chartHeight);
  ctx.lineTo(firstX, chartTop + chartHeight);
  ctx.closePath();

  // Fill the area
  ctx.fillStyle = areaColor;
  ctx.fill();

  // Draw the line on top
  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;

  data.forEach((candle, i) => {
    // Calculate x position based on the candle's position in the full dataset
    const dataIndex = data[i].time
      ? globalCandleData.findIndex((c) => c.time === data[i].time)
      : i;
    const adjustedIndex = dataIndex >= 0 ? dataIndex : i;
    const x = ((adjustedIndex - startOffset) / totalVisibleRange) * chartWidth;

    // Skip if outside visible area
    if (x < 0 || x > chartWidth) return;

    const y =
      chartTop +
      ((priceRange.max - candle.close) / priceRangeDiff) * chartHeight;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
}
