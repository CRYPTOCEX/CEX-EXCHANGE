import type { CandleData } from "../../../types";
import { globalCandleData } from "../../../utils";

// Update the bar chart renderer to use theme-based colors
export function renderBars(
  ctx: CanvasRenderingContext2D,
  data: CandleData[],
  chartWidth: number,
  chartHeight: number,
  chartTop: number,
  priceRange: { min: number; max: number },
  barWidth: number,
  spacing: number,
  darkMode: boolean,
  totalVisibleRange: number,
  startOffset: number
) {
  // Use theme-appropriate colors
  const bullColor = darkMode ? "#22c55e" : "#16a34a"; // Green - slightly darker in light mode
  const bearColor = darkMode ? "#ef4444" : "#dc2626"; // Red - slightly darker in light mode
  const priceRangeDiff = priceRange.max - priceRange.min;

  data.forEach((candle, i) => {
    // Calculate x position based on the candle's position in the full dataset
    const dataIndex = data[i].time
      ? globalCandleData.findIndex((c) => c.time === data[i].time)
      : i;
    const adjustedIndex = dataIndex >= 0 ? dataIndex : i;
    const x = ((adjustedIndex - startOffset) / totalVisibleRange) * chartWidth;

    // Skip if outside visible area or if it would overlap with the price scale
    if (x < -barWidth || x > chartWidth - 1) return;

    const isBullish = candle.close >= candle.open;

    // Calculate y positions
    const highY =
      chartTop +
      ((priceRange.max - candle.high) / priceRangeDiff) * chartHeight;
    const lowY =
      chartTop + ((priceRange.max - candle.low) / priceRangeDiff) * chartHeight;
    const openY =
      chartTop +
      ((priceRange.max - candle.open) / priceRangeDiff) * chartHeight;
    const closeY =
      chartTop +
      ((priceRange.max - candle.close) / priceRangeDiff) * chartHeight;

    // Draw vertical line (high to low)
    ctx.beginPath();
    ctx.strokeStyle = isBullish ? bullColor : bearColor;
    ctx.lineWidth = 1;
    ctx.moveTo(x + barWidth / 2, highY);
    ctx.lineTo(x + barWidth / 2, lowY);
    ctx.stroke();

    // Draw open tick
    ctx.beginPath();
    ctx.moveTo(x, openY);
    ctx.lineTo(x + barWidth / 2, openY);
    ctx.stroke();

    // Draw close tick
    ctx.beginPath();
    ctx.moveTo(x + barWidth / 2, closeY);
    ctx.lineTo(x + barWidth, closeY);
    ctx.stroke();
  });
}
