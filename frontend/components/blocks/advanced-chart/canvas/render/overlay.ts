import { formatPrice } from "../../utils";
import { getCrosshairColors, getPriceLineColors } from "../../theme/colors";

// Update the overlay renderer to use theme-based colors
export function renderCrosshair(
  ctx: CanvasRenderingContext2D,
  mousePosition: { x: number; y: number },
  chartWidth: number,
  chartHeight: number,
  volumeHeight: number,
  priceRange: { min: number; max: number },
  priceScaleWidth: number,
  darkMode: boolean
) {
  // Use theme-appropriate colors from our centralized colors
  const crosshairColors = getCrosshairColors(darkMode);
  const crosshairColor = crosshairColors.line;
  const labelBgColor = crosshairColors.label.background;
  const labelTextColor = crosshairColors.label.text;

  ctx.strokeStyle = crosshairColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(0, mousePosition.y);
  ctx.lineTo(chartWidth, mousePosition.y);
  ctx.stroke();

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(mousePosition.x, 0);
  ctx.lineTo(mousePosition.x, chartHeight + volumeHeight);
  ctx.stroke();

  ctx.setLineDash([]);

  // Price at cursor
  const price =
    priceRange.max -
    (mousePosition.y / chartHeight) * (priceRange.max - priceRange.min);

  // Draw price label background
  ctx.fillStyle = labelBgColor;
  ctx.fillRect(chartWidth, mousePosition.y - 10, priceScaleWidth, 20);

  // Draw price label
  ctx.fillStyle = labelTextColor;
  ctx.textAlign = "right";
  ctx.font = "bold 10px Arial";
  ctx.fillText(
    formatPrice(price),
    chartWidth + priceScaleWidth - 5,
    mousePosition.y
  );
}

export const ChartOverlayRenderer = {
  render({
    ctx,
    candleData,
    mousePosition,
    hoverEffect,
    chartWidth,
    priceChartHeight,
    chartTop,
    theme,
    isDragging,
    priceScaleWidth,
    volumeHeight,
    priceRange,
  }: any) {
    if (!ctx || !candleData || candleData.length === 0) return;

    // We must use the provided priceRange from the main chart renderer
    if (
      !priceRange ||
      typeof priceRange.min !== "number" ||
      typeof priceRange.max !== "number"
    ) {
      console.warn("Price range not provided to overlay renderer");
      return;
    }

    const minPrice = priceRange.min;
    const maxPrice = priceRange.max;
    const darkMode = theme === "dark";

    // Draw current price line
    if (candleData.length > 0) {
      const currentPrice = candleData[candleData.length - 1].close;

      // Calculate the y position based on the visible price range
      const currentPriceY =
        chartTop +
        ((maxPrice - currentPrice) / (maxPrice - minPrice)) * priceChartHeight;

      // Determine price line color based on the latest candle
      const latestCandle = candleData[candleData.length - 1];
      const priceLineColors = getPriceLineColors(darkMode);

      let priceLineColor;
      if (latestCandle.close > latestCandle.open) {
        // Bullish candle - green
        priceLineColor = priceLineColors.bullish;
      } else if (latestCandle.close < latestCandle.open) {
        // Bearish candle - red
        priceLineColor = priceLineColors.bearish;
      } else {
        // Neutral candle - gray
        priceLineColor = priceLineColors.neutral;
      }

      // Draw the price line with the appropriate color - ONLY dashed line, no solid line
      ctx.beginPath();
      ctx.strokeStyle = priceLineColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.moveTo(0, currentPriceY);
      ctx.lineTo(chartWidth, currentPriceY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw current price label on the price scale (right side)
      ctx.fillStyle = priceLineColor;
      ctx.fillRect(chartWidth, currentPriceY - 10, priceScaleWidth, 20);

      // Draw price text
      ctx.fillStyle = "#ffffff"; // White text for better contrast
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(
        formatPrice(currentPrice),
        chartWidth + priceScaleWidth - 5,
        currentPriceY
      );
    }

    // Draw crosshair if mouse is over chart and not dragging
    if (
      mousePosition &&
      mousePosition.x < chartWidth &&
      mousePosition.y < priceChartHeight &&
      !isDragging
    ) {
      renderCrosshair(
        ctx,
        mousePosition,
        chartWidth,
        priceChartHeight,
        volumeHeight,
        { min: minPrice, max: maxPrice },
        priceScaleWidth,
        theme === "dark"
      );
    }

    // Draw hover effect if present
    if (hoverEffect) {
      ctx.beginPath();
      ctx.arc(hoverEffect.x, hoverEffect.y, hoverEffect.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fill();
    }
  },
};
