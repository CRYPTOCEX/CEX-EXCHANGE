// Import the color utilities
import { getGridColor } from "../../theme/colors";

// Render grid with optimized performance and consistent spacing
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  chartWidth: number,
  chartHeight: number,
  volumeHeight: number,
  chartTop: number,
  volumeTop: number,
  darkMode: boolean,
  gridColor?: string,
  candleData: any[] = [],
  visibleRange: { start: number; end: number } = { start: 0, end: 0 }
) {
  // Skip rendering if no data or invalid dimensions
  if (
    !candleData ||
    candleData.length === 0 ||
    chartWidth <= 0 ||
    chartHeight <= 0
  )
    return;

  // Use theme-appropriate grid color from our centralized colors
  const themeGridColor = gridColor || getGridColor(darkMode);

  // Performance optimization: Use a single path for all grid lines
  ctx.beginPath();
  ctx.strokeStyle = themeGridColor;
  ctx.lineWidth = 1;

  // Calculate visible data range with bounds checking
  const start = Math.max(0, Math.floor(visibleRange.start));
  const end = Math.min(candleData.length, Math.ceil(visibleRange.end));

  // Skip if no visible data
  if (start >= end) return;

  const visibleData = candleData.slice(start, end);
  if (visibleData.length === 0) return;

  // Calculate price range with padding
  let minPrice = Math.min(...visibleData.map((d: any) => d.low));
  let maxPrice = Math.max(...visibleData.map((d: any) => d.high));
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.1;
  minPrice = Math.max(0, minPrice - pricePadding);
  maxPrice = maxPrice + pricePadding;

  // Store grid positions for price axis synchronization
  const gridPositionsY: { y: number; price: number }[] = [];

  // Horizontal grid lines for price chart - draw in a single path
  const priceGridCount = Math.min(8, Math.floor(chartHeight / 40)); // Adaptive grid count based on height
  for (let i = 0; i <= priceGridCount; i++) {
    // For light mode, don't add the 0.5 offset to avoid edge artifacts
    const y = darkMode
      ? Math.floor(chartTop + (i / priceGridCount) * chartHeight) + 0.5
      : Math.floor(chartTop + (i / priceGridCount) * chartHeight);
    const price = maxPrice - (i / priceGridCount) * (maxPrice - minPrice);

    // Store grid position and corresponding price for price axis
    gridPositionsY.push({ y, price });

    // Don't draw grid lines at the very top and left edges in light mode
    if (!darkMode && (y <= chartTop + 1 || i === 0)) {
      continue;
    }

    ctx.moveTo(1, y); // Start slightly inward in light mode
    ctx.lineTo(chartWidth - 1, y); // End slightly inward in light mode
  }

  // First, determine the time range of the visible data
  const firstCandleTime = visibleData[0].time * 1000; // Convert to milliseconds
  const lastCandleTime = visibleData[visibleData.length - 1].time * 1000;

  // Calculate average candle time interval
  let avgCandleTimeMs = 60000; // Default to 1 minute
  if (visibleData.length > 1) {
    avgCandleTimeMs =
      (lastCandleTime - firstCandleTime) / (visibleData.length - 1);
  }

  // Determine appropriate time interval for grid lines based on zoom level
  const visibleTimeRangeMs = lastCandleTime - firstCandleTime;
  const visibleMinutes = visibleTimeRangeMs / 60000;

  // Choose grid interval based on visible time range
  let gridIntervalMinutes = 1; // Default to 1 minute

  if (visibleMinutes > 1440) {
    // > 24 hours
    gridIntervalMinutes = 240; // 4 hours
  } else if (visibleMinutes > 720) {
    // > 12 hours
    gridIntervalMinutes = 120; // 2 hours
  } else if (visibleMinutes > 360) {
    // > 6 hours
    gridIntervalMinutes = 60; // 1 hour
  } else if (visibleMinutes > 120) {
    // > 2 hours
    gridIntervalMinutes = 30; // 30 minutes
  } else if (visibleMinutes > 60) {
    // > 1 hour
    gridIntervalMinutes = 15; // 15 minutes
  } else if (visibleMinutes > 30) {
    // > 30 minutes
    gridIntervalMinutes = 5; // 5 minutes
  } else if (visibleMinutes > 15) {
    // > 15 minutes
    gridIntervalMinutes = 2; // 2 minutes
  }

  // Convert to milliseconds
  const gridIntervalMs = gridIntervalMinutes * 60 * 1000;

  // Find the first grid line time (round down to nearest interval)
  const firstGridTime =
    Math.floor(firstCandleTime / gridIntervalMs) * gridIntervalMs;

  // Calculate how many grid lines we need
  // Increase the number of future grid lines to ensure they extend across the chart
  const gridLinesNeeded =
    Math.ceil((lastCandleTime - firstGridTime) / gridIntervalMs) + 30; // Add more extra lines for future

  // Store grid positions for export to be used by footer
  const gridPositions: { time: number; x: number }[] = [];

  // Calculate the minimum pixel distance between grid lines based on chart width
  // This ensures we don't have too many grid lines when zoomed out
  const minGridSpacing = Math.max(60, chartWidth / 12); // At least 60px or 1/12 of chart width

  // Calculate the future space
  // This is critical: we need to know how much of the chart width is allocated to future time
  const dataRangeWidth = visibleRange.end - visibleRange.start;
  const futureRangeWidth = Math.max(0, visibleRange.end - candleData.length);
  const futureSpacePercentage = futureRangeWidth / dataRangeWidth;
  const futureSpaceWidth = chartWidth * futureSpacePercentage;

  // Calculate the width of one candle in pixels
  const candleWidthInPixels = chartWidth / dataRangeWidth;

  // Generate grid lines at fixed time intervals
  for (let i = -5; i <= gridLinesNeeded; i++) {
    const gridTime = firstGridTime + i * gridIntervalMs;

    // Find the x position for this time
    let x = -1;

    // If this time is before the first candle, extrapolate backwards
    if (gridTime < firstCandleTime) {
      const timeDiff = firstCandleTime - gridTime;
      const candlesBack = timeDiff / avgCandleTimeMs;
      x = Math.round(0 - candlesBack * candleWidthInPixels);
    }
    // If this time is after the last candle, calculate position in future space
    else if (gridTime > lastCandleTime) {
      // Calculate how far into the future this grid line is
      const timeDiff = gridTime - lastCandleTime;
      const candlesForward = timeDiff / avgCandleTimeMs;

      // Calculate the position based on the last candle's position plus the future offset
      const lastCandleIndex = candleData.length - 1;
      const lastCandlePosition =
        ((lastCandleIndex - visibleRange.start) / dataRangeWidth) * chartWidth;

      // Position in future space
      x = Math.round(lastCandlePosition + candlesForward * candleWidthInPixels);
    }
    // Otherwise, find the closest candle and interpolate
    else {
      // Find the closest candle to this time
      let closestIndex = 0;
      let closestDiff = Math.abs(visibleData[0].time * 1000 - gridTime);

      for (let j = 1; j < visibleData.length; j++) {
        const diff = Math.abs(visibleData[j].time * 1000 - gridTime);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = j;
        }
      }

      // Calculate the position based on the closest candle
      const relativeIndex = start + closestIndex;
      const relativePosition =
        (relativeIndex - visibleRange.start) / dataRangeWidth;
      x = Math.round(relativePosition * chartWidth);
    }

    // Only draw if within extended chart bounds (include more margin for future grid lines)
    // Extend the right boundary significantly to ensure future grid lines are included
    if (x >= -100 && x <= chartWidth + 500) {
      // Store grid position for footer synchronization
      gridPositions.push({ time: gridTime, x });
    }
  }

  // Filter positions to avoid overcrowding based on dynamic spacing
  const filteredPositions: typeof gridPositions = [];
  let lastX = Number.NEGATIVE_INFINITY;

  for (const pos of gridPositions) {
    if (pos.x - lastX >= minGridSpacing) {
      filteredPositions.push(pos);
      lastX = pos.x;

      // Draw the grid line for this filtered position
      // Ensure the line extends through the chart height but stops at chartWidth
      // In light mode, avoid drawing at the very left edge
      if (!darkMode && pos.x <= 1) {
        continue;
      }

      const startY = darkMode ? chartTop : chartTop + 1; // Start slightly down in light mode
      ctx.moveTo(pos.x, startY);
      ctx.lineTo(pos.x, chartTop + chartHeight + volumeHeight);
    }
  }

  // Draw all grid lines at once (much more efficient)
  ctx.stroke();

  // Store filtered grid positions in a global variable for footer to access
  if (typeof window !== "undefined") {
    (window as any).chartGridPositions = filteredPositions;
    // Store the grid interval for label formatting
    (window as any).chartGridInterval = gridIntervalMinutes;
    // Store the Y grid positions for price axis to access
    (window as any).chartGridPositionsY = gridPositionsY;
  }
}
