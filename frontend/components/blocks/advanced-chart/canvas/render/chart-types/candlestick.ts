import type { CandleData } from "../../../types";
import { globalCandleData } from "../../../utils";

// Update the candlestick renderer to use theme-based colors
export function renderCandlesticks(
  ctx: CanvasRenderingContext2D,
  data: CandleData[],
  chartWidth: number,
  chartHeight: number,
  chartTop: number,
  priceRange: { min: number; max: number },
  candleWidth: number,
  spacing: number,
  darkMode: boolean,
  totalVisibleRange: number,
  startOffset: number
) {
  // Use theme-appropriate colors
  const bullColor = darkMode ? "#22c55e" : "#16a34a"; // Green - slightly darker in light mode
  const bearColor = darkMode ? "#ef4444" : "#dc2626"; // Red - slightly darker in light mode
  const priceRangeDiff = priceRange.max - priceRange.min;

  // Use antialiasing for smoother rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  data.forEach((candle, i) => {
    // Calculate x position based on the candle's position in the full dataset
    // This ensures candles are positioned correctly when scrolling into future
    const dataIndex = data[i].time
      ? globalCandleData.findIndex((c) => c.time === data[i].time)
      : i;
    const adjustedIndex = dataIndex >= 0 ? dataIndex : i;

    // Calculate the x position, then center the candle on the grid line
    const x = ((adjustedIndex - startOffset) / totalVisibleRange) * chartWidth;
    // Offset by half the candle width to center on the grid line
    const centeredX = x - candleWidth / 2;

    // Skip if outside visible area or if it would overlap with the price scale
    if (centeredX < -candleWidth || centeredX > chartWidth - 1) return;

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

    // Draw wick with improved quality
    ctx.beginPath();
    ctx.strokeStyle = isBullish ? bullColor : bearColor;
    ctx.lineWidth = 1;

    // For light mode, avoid 0.5 offsets that can cause edge artifacts
    const centerX = darkMode ? Math.floor(x) + 0.5 : Math.floor(x);
    const wickHighY = darkMode ? Math.floor(highY) + 0.5 : Math.floor(highY);
    const wickLowY = darkMode ? Math.floor(lowY) + 0.5 : Math.floor(lowY);

    ctx.moveTo(centerX, wickHighY);
    ctx.lineTo(centerX, wickLowY);
    ctx.stroke();

    // Draw body with improved quality
    const bodyTop = darkMode
      ? Math.floor(isBullish ? closeY : openY) + 0.5
      : Math.floor(isBullish ? closeY : openY);
    const bodyBottom = darkMode
      ? Math.floor(isBullish ? openY : closeY) + 0.5
      : Math.floor(isBullish ? openY : closeY);
    const bodyHeight = Math.max(1, bodyBottom - bodyTop); // Ensure minimum height

    // Center the body around the grid line
    const bodyLeft = darkMode
      ? Math.floor(centeredX + spacing / 2) + 0.5
      : Math.floor(centeredX + spacing / 2);
    const bodyWidth = Math.max(1, Math.floor(candleWidth - spacing));

    ctx.fillStyle = isBullish ? bullColor : bearColor;
    ctx.fillRect(bodyLeft, bodyTop, bodyWidth, bodyHeight);

    // Add border to the candle body for better definition (only in dark mode to avoid artifacts)
    if (darkMode) {
      ctx.strokeStyle = isBullish
        ? "rgba(34, 197, 94, 0.8)"
        : "rgba(239, 68, 68, 0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(bodyLeft, bodyTop, bodyWidth, bodyHeight);
    }
  });
}
