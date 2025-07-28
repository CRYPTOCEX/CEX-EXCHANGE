import type { CandleData } from "../../types";
import { formatPrice, formatLargeNumber } from "../../utils";
import { getAxisColors } from "../../theme/colors";

// Update the price axis renderer to align with grid lines and show current price
export function renderPriceAxis(
  ctx: CanvasRenderingContext2D,
  chartWidth: number,
  chartHeight: number,
  volumeHeight = 0,
  chartTop = 0,
  volumeTop = 0,
  priceRange: { min: number; max: number } = { min: 0, max: 0 },
  volumeRange: { min: number; max: number } = { min: 0, max: 0 },
  priceScaleWidth = 60,
  timeScaleHeight = 30,
  darkMode = true,
  data: CandleData[] = []
) {
  // Get theme-appropriate colors from our centralized colors
  const axisColors = getAxisColors(darkMode);
  const textColor = axisColors.price.text;
  const bgColor = axisColors.price.background;
  const tickColor = axisColors.price.tick;

  // Save current context state
  ctx.save();

  // Draw price scale background - make it fully opaque and wide enough to cover any grid lines
  ctx.fillStyle = bgColor;
  // Draw from 2px to the left of the chart boundary to ensure complete coverage
  ctx.fillRect(
    chartWidth - 2,
    0,
    priceScaleWidth + 4,
    chartHeight + volumeHeight
  );

  // Draw price labels
  ctx.fillStyle = textColor;
  ctx.font = "10px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  // Get current price from the last candle if available
  let currentPrice = 0;
  let isBullish = false;
  if (data && data.length > 0) {
    const lastCandle = data[data.length - 1];
    if (lastCandle) {
      currentPrice = lastCandle.close;
      // Determine if the candle is bullish (close > open)
      isBullish = lastCandle.close >= lastCandle.open;
    }
  }

  // Access the grid positions from the global variable set by renderGrid
  // This ensures perfect alignment between grid lines and price labels
  const gridPositionsY =
    typeof window !== "undefined"
      ? (window as any).chartGridPositionsY || []
      : [];

  if (gridPositionsY.length > 0) {
    // Use the grid positions to place price labels
    for (const { y, price } of gridPositionsY) {
      // Skip labels that would be outside the visible chart area
      if (y < chartTop || y > chartTop + chartHeight) continue;

      // Draw price label
      ctx.fillStyle = textColor;
      ctx.fillText(formatPrice(price), chartWidth + priceScaleWidth - 5, y);

      // Draw small tick
      ctx.beginPath();
      ctx.strokeStyle = tickColor;
      ctx.moveTo(chartWidth, y);
      ctx.lineTo(chartWidth + 4, y);
      ctx.stroke();
    }
  } else {
    // Fallback to the old method if grid positions aren't available
    // Calculate optimal number of price labels based on chart height
    const optimalLabelCount = Math.max(
      4,
      Math.min(10, Math.floor(chartHeight / 40))
    );
    const priceStep =
      (priceRange.max - priceRange.min) / (optimalLabelCount - 1);

    // Draw price labels at calculated intervals
    for (let i = 0; i < optimalLabelCount; i++) {
      const price = priceRange.max - i * priceStep;
      // Calculate y position as a proportion of the chart height
      const y = chartTop + (i / (optimalLabelCount - 1)) * chartHeight;

      // Skip labels that would be outside the visible chart area
      if (y < chartTop || y > chartTop + chartHeight) continue;

      // Draw price label
      ctx.fillStyle = textColor;
      ctx.fillText(formatPrice(price), chartWidth + priceScaleWidth - 5, y);

      // Draw small tick
      ctx.beginPath();
      ctx.strokeStyle = tickColor;
      ctx.moveTo(chartWidth, y);
      ctx.lineTo(chartWidth + 4, y);
      ctx.stroke();
    }
  }

  // Draw volume labels if volume is shown
  if (volumeHeight > 0) {
    // Calculate optimal number of volume labels based on volume panel height
    const volumeLabelCount = Math.max(
      2,
      Math.min(3, Math.floor(volumeHeight / 40))
    );

    // Add a smaller padding to the top volume label to prevent overlap with price labels
    const topPadding = 8; // Reduced from 15 to 8 pixels

    // Calculate positions for volume labels
    for (let i = 0; i < volumeLabelCount; i++) {
      // For the first label (top one), add padding to move it down slightly
      const yOffset = i === 0 ? topPadding : 0;

      // Calculate position with adjusted spacing
      const position = i / (volumeLabelCount - 1);
      const adjustedPosition =
        i === 0
          ? topPadding / volumeHeight +
            position * (1 - topPadding / volumeHeight)
          : position;

      const volumeValue =
        volumeRange.max -
        adjustedPosition * (volumeRange.max - volumeRange.min);
      const y = volumeTop + adjustedPosition * volumeHeight + yOffset;

      // Skip labels that would be outside the visible volume area
      if (y < volumeTop || y > volumeTop + volumeHeight - 5) continue;

      // Draw volume label
      ctx.fillStyle = textColor;
      ctx.fillText(
        formatLargeNumber(volumeValue),
        chartWidth + priceScaleWidth - 5,
        y
      );

      // Draw small tick for volume
      ctx.beginPath();
      ctx.strokeStyle = tickColor;
      ctx.moveTo(chartWidth, y);
      ctx.lineTo(chartWidth + 4, y);
      ctx.stroke();
    }

    // Only draw a "0" label at the bottom if the last label isn't already close to 0
    // and we're not already showing a label near the bottom
    const lastLabelValue = volumeRange.min;
    const lastLabelIsNearZero = lastLabelValue < volumeRange.max * 0.1;
    const bottomY = volumeTop + volumeHeight - 5;

    // Check if the last calculated label is already near the bottom
    const lastCalculatedY = volumeTop + volumeHeight - 5;
    const lastLabelIsNearBottom = Math.abs(lastCalculatedY - bottomY) < 20;

    // Only add the "0" label if it's not redundant
    if (volumeHeight > 30 && !lastLabelIsNearZero && !lastLabelIsNearBottom) {
      ctx.fillStyle = textColor;
      ctx.fillText("0", chartWidth + priceScaleWidth - 5, bottomY);
    }
  }

  // Draw current price label (TradingView style)
  if (
    currentPrice > 0 &&
    priceRange.min <= currentPrice &&
    currentPrice <= priceRange.max
  ) {
    // Calculate y position for current price
    const y =
      chartTop +
      ((priceRange.max - currentPrice) / (priceRange.max - priceRange.min)) *
        chartHeight;

    // Format the price text
    const priceText = formatPrice(currentPrice);

    // Measure text width for the background
    ctx.font = "bold 11px Arial";
    const textWidth = ctx.measureText(priceText).width;

    // Set colors based on candle direction
    const bullishColor = "#22c55e"; // Green for bullish candles
    const bearishColor = "#ef4444"; // Red for bearish candles
    const bgColor = isBullish ? bullishColor : bearishColor;
    const textColor = "#FFFFFF"; // White text for good contrast on both colors

    // Draw background rectangle with padding
    const padding = 6;
    const rectHeight = 20;
    ctx.fillStyle = bgColor;
    ctx.fillRect(
      chartWidth - 2,
      y - rectHeight / 2,
      textWidth + padding * 2,
      rectHeight
    );

    // Draw price text
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(priceText, chartWidth + padding - 2, y);
  }

  // Restore context state
  ctx.restore();
}
