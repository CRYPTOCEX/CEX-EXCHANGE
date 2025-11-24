import type { CandleData } from "../../../types";
import { globalCandleData } from "../../../utils";

// Render line chart
export function renderLine(
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
  const lineColor = darkMode ? "#4ade80" : "#22c55e"; // Lighter green in dark mode, darker in light mode
  const priceRangeDiff = priceRange.max - priceRange.min;

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

    // Skip if outside visible area or if it would overlap with the price scale
    if (x < 0 || x > chartWidth - 1) return;

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
