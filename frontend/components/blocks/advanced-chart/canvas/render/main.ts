import type { CandleData, ChartType } from "../../types";
import { renderExpiryMarkers } from "./expiry-marker";
import { renderPositionMarkers } from "./position-marker";
import { renderGrid } from "./grid";
import { renderPriceAxis } from "./price-axis";
import {
  currentPriceRange,
  setGlobalCandleData,
  getVisibleDataWithBuffer,
  renderTopBlurGradient,
} from "../../utils";
import { renderCandlesticks } from "./chart-types/candlestick";
import { renderLine } from "./chart-types/line";
import { renderBars } from "./chart-types/bar";
import { renderArea } from "./chart-types/area";

// Export the currentPriceRange and setGlobalCandleData for external use
export { currentPriceRange, setGlobalCandleData };

// Update the renderChart function to account for the header height
export function renderChart(
  ctx: CanvasRenderingContext2D,
  data: CandleData[],
  chartType: ChartType,
  chartWidth: number,
  chartHeight: number,
  chartTop: number,
  priceRange: { min: number; max: number },
  candleWidth: number,
  spacing: number,
  darkMode: boolean,
  visibleRange?: { start: number; end: number }
) {
  // Calculate visible data without future candles
  const bufferedVisibleData = getVisibleDataWithBuffer(data, visibleRange);

  if (bufferedVisibleData.length === 0) return;

  // Calculate the position of each candle based on the visible range
  const totalVisibleRange = visibleRange
    ? visibleRange.end - visibleRange.start
    : data.length;
  const startOffset = visibleRange ? visibleRange.start : 0;

  switch (chartType) {
    case "candlestick":
      renderCandlesticks(
        ctx,
        bufferedVisibleData,
        chartWidth,
        chartHeight,
        chartTop,
        priceRange,
        candleWidth,
        spacing,
        darkMode,
        totalVisibleRange,
        startOffset
      );
      break;
    case "line":
      renderLine(
        ctx,
        bufferedVisibleData,
        chartWidth,
        chartHeight,
        chartTop,
        priceRange,
        darkMode,
        totalVisibleRange,
        startOffset
      );
      break;
    case "bar":
      renderBars(
        ctx,
        bufferedVisibleData,
        chartWidth,
        chartHeight,
        chartTop,
        priceRange,
        candleWidth,
        spacing,
        darkMode,
        totalVisibleRange,
        startOffset
      );
      break;
    case "area":
      renderArea(
        ctx,
        bufferedVisibleData,
        chartWidth,
        chartHeight,
        chartTop,
        priceRange,
        darkMode,
        totalVisibleRange,
        startOffset
      );
      break;
  }
}

// Update the ChartMainRenderer.render function to ensure proper chart sizing
export const ChartMainRenderer = {
  render({
    ctx,
    candleData,
    visibleRange,
    chartWidth,
    priceChartHeight,
    chartTop,
    chartHeight,
    showGrid,
    theme,
    chartType,
    isDragging,
    priceScaleWidth,
    timeScaleHeight,
    volumeHeight,
    volumeTop,
    expiryMarkers,
    expiryMinutes,
    currentTime,
    positions,
    renderOnlyBackground,
    showExpiry, // Added showExpiry parameter
    timeFrame, // Added timeFrame parameter
  }: any) {
    if (!ctx || !candleData || candleData.length === 0) {
      return;
    }

    // Set global candle data for reference in other components
    setGlobalCandleData(candleData);

    // Calculate visible data
    const bufferedVisibleData = getVisibleDataWithBuffer(
      candleData,
      visibleRange
    );

    if (bufferedVisibleData.length === 0) {
      return;
    }

    // Calculate price range with padding
    let minPrice = Math.min(...bufferedVisibleData.map((d: any) => d.low));
    let maxPrice = Math.max(...bufferedVisibleData.map((d: any) => d.high));
    const priceRange = maxPrice - minPrice;

    // Use dynamic padding based on price range and chart height
    // For larger price ranges or smaller charts, use less padding
    const heightFactor = Math.min(1, priceChartHeight / 400);
    const pricePadding = priceRange * 0.1 * heightFactor;

    minPrice = Math.max(0, minPrice - pricePadding);
    maxPrice = maxPrice + pricePadding;

    // Update the exported price range
    currentPriceRange.min = minPrice;
    currentPriceRange.max = maxPrice;

    // Define grid color based on the theme
    const gridColor =
      theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

    // Draw grid with theme-based styling
    if (showGrid) {
      renderGrid(
        ctx,
        chartWidth,
        priceChartHeight,
        volumeHeight,
        chartTop,
        volumeTop,
        theme === "dark",
        theme === "dark" ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.07)",
        candleData,
        visibleRange
      );
    }

    // Draw axes with theme-based styling
    renderPriceAxis(
      ctx,
      chartWidth,
      priceChartHeight,
      volumeHeight,
      chartTop,
      volumeTop,
      { min: minPrice, max: maxPrice },
      {
        min: 0,
        max: Math.max(...bufferedVisibleData.map((d: any) => d.volume)) * 1.1,
      },
      priceScaleWidth,
      timeScaleHeight,
      theme === "dark",
      candleData // Pass the full candle data to access the current price
    );

    if (renderOnlyBackground) {
      return;
    }

    // Calculate candle width and spacing
    const totalCandleWidth =
      chartWidth / (visibleRange.end - visibleRange.start);
    const candleWidth = Math.max(1, totalCandleWidth * 0.8);
    const spacing = totalCandleWidth * 0.2;

    // Add clipping to prevent drawing outside the chart area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, chartTop, chartWidth, chartHeight);
    ctx.clip();

    // Render the selected chart type
    renderChart(
      ctx,
      candleData,
      chartType,
      chartWidth,
      priceChartHeight,
      chartTop,
      { min: minPrice, max: maxPrice },
      candleWidth,
      spacing,
      theme === "dark",
      visibleRange
    );

    // Render the top blur gradient AFTER the chart but BEFORE the expiry markers
    if (theme === "dark") {
      // Update the top blur gradient to use black instead of dark gray
      renderTopBlurGradient(ctx, chartWidth, chartHeight, chartTop);
    }

    // Remove clipping
    ctx.restore();

    // Generate and render expiry markers in one place - SINGLE SOURCE OF TRUTH
    if (
      expiryMinutes > 0 &&
      expiryMarkers &&
      expiryMarkers.length > 0 &&
      showExpiry
    ) {
      // Added showExpiry condition
      const now = currentTime ? new Date(currentTime) : new Date();
      try {
        // Save context for expiry markers
        ctx.save();
        renderExpiryMarkers(
          ctx,
          expiryMarkers,
          candleData,
          chartWidth,
          chartHeight,
          chartTop,
          visibleRange,
          now.getTime(),
          showExpiry // Added showExpiry parameter
        );
        ctx.restore();
      } catch (error) {
        console.error("Failed to render expiry markers:", error);
      }
    }

    // Render position markers if available
    if (positions && positions.length > 0) {
      const now = currentTime ? new Date(currentTime) : new Date();
      ctx.save();
      renderPositionMarkers(
        ctx,
        positions,
        candleData,
        chartWidth,
        priceChartHeight,
        chartTop,
        visibleRange,
        { min: minPrice, max: maxPrice },
        now.getTime()
      );
      ctx.restore();
    }
  },

  // Add this priceToY function to convert price to Y coordinate
  priceToY(
    price: number,
    priceRange: { min: number; max: number },
    chartHeight: number,
    chartTop: number
  ): number {
    if (
      !priceRange ||
      priceRange.min === undefined ||
      priceRange.max === undefined
    ) {
      return 0;
    }

    const { min, max } = priceRange;
    if (max === min) return chartTop + chartHeight / 2;

    // Calculate the Y position based on price and chart dimensions
    return chartTop + ((max - price) / (max - min)) * chartHeight;
  },
};
