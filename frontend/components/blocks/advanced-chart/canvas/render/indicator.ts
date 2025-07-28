"use client";

import { CandleData } from "../../types";
import type { Indicator } from "../render/toolbar/indicators/registry";
import { indicatorRegistry } from "../render/toolbar/indicators/registry";

// Cache for indicator data to prevent recalculation
const indicatorDataCache = new Map<
  string,
  {
    data: number[];
    timestamp: number;
    candleDataLength: number;
  }
>();

// Cache for rendered indicator paths to prevent re-rendering
const renderedPathCache = new Map<
  string,
  {
    path: Path2D;
    timestamp: number;
    color: string;
    lineWidth: number;
    lineStyle: string;
  }
>();

// Cache for rendered indicator panel paths to prevent re-rendering
const renderedPanelCache = new Map<
  string,
  {
    paths: Path2D[];
    timestamp: number;
    colors: string[];
    data: number[];
  }
>();

// Modify the getVisibleIndicatorData function to always use the latest data, not just during dragging
function getVisibleIndicatorData(
  indicator: any,
  visibleData: CandleData[],
  globalCandleData: CandleData[]
): number[] {
  if (!visibleData.length || !indicator.data || !indicator.data.length)
    return [];

  // Generate a cache key based on indicator id and data length
  const cacheKey = `${indicator.id}-${visibleData[0].time}-${visibleData[visibleData.length - 1].time}`;

  // Check if we have a valid cached result - ALWAYS USE CACHE REGARDLESS OF DRAGGING STATE
  const cachedResult = indicatorDataCache.get(cacheKey);
  if (
    cachedResult &&
    cachedResult.candleDataLength === globalCandleData.length
  ) {
    return cachedResult.data;
  }

  // If we don't have global data, return the full indicator data
  if (!globalCandleData.length) return indicator.data;

  // Find the start and end indices in the full dataset
  const startTime = visibleData[0].time;
  const endTime = visibleData[visibleData.length - 1].time;

  const startIndex = globalCandleData.findIndex(
    (candle) => candle.time === startTime
  );
  const endIndex = globalCandleData.findIndex(
    (candle) => candle.time === endTime
  );

  let result: number[] = [];

  if (startIndex === -1 || endIndex === -1) {
    console.warn("Could not find exact time matches for indicator alignment");
    // Fallback to proportional slicing
    const startRatio =
      visibleData[0].time / globalCandleData[globalCandleData.length - 1].time;
    const endRatio =
      visibleData[visibleData.length - 1].time /
      globalCandleData[globalCandleData.length - 1].time;

    const start = Math.floor(startRatio * indicator.data.length);
    const end = Math.ceil(endRatio * indicator.data.length);

    result = indicator.data.slice(start, end);
  } else {
    // Return the slice of indicator data that corresponds to the visible candles
    // Make sure we don't go out of bounds
    const start = Math.max(0, startIndex);
    const end = Math.min(indicator.data.length, endIndex + 1);

    result = indicator.data.slice(start, end);
  }

  // Cache the result
  indicatorDataCache.set(cacheKey, {
    data: result,
    timestamp: Date.now(),
    candleDataLength: globalCandleData.length,
  });

  return result;
}

// Modify the renderRSIPanel function to always render, not just during dragging
function renderRSIPanel(
  ctx: CanvasRenderingContext2D,
  indicator: any,
  data: any[],
  chartWidth: number,
  panelHeight: number,
  panelTop: number,
  priceScaleWidth: number,
  darkMode: boolean,
  globalCandleData: any[] = [],
  visibleRange: { start: number; end: number } = { start: 0, end: 0 },
  totalVisibleRange = 0,
  startOffset = 0,
  isDragging = false
) {
  // Make sure we have data to render
  if (!indicator.data || indicator.data.length === 0) {
    console.warn(`No data for ${indicator.type} indicator`);
    return;
  }

  // Use visibleData if available (provided by the renderer), otherwise use the full data
  const indicatorData = indicator.visibleData || indicator.data;

  // Define RSI range (typically 0-100)
  const rsiMin = 0;
  const rsiMax = 100;
  const rsiRange = rsiMax - rsiMin;

  // Define overbought and oversold levels
  const overbought = 70;
  const oversold = 30;

  // Draw overbought/oversold zones
  const overboughtY =
    panelTop + ((rsiMax - overbought) / rsiRange) * panelHeight;
  const oversoldY = panelTop + ((rsiMax - oversold) / rsiRange) * panelHeight;

  ctx.fillStyle = darkMode
    ? "rgba(255, 50, 50, 0.1)"
    : "rgba(255, 50, 50, 0.1)";
  ctx.fillRect(0, panelTop, chartWidth, overboughtY - panelTop);

  ctx.fillStyle = darkMode
    ? "rgba(50, 255, 50, 0.1)"
    : "rgba(50, 255, 50, 0.1)";
  ctx.fillRect(0, oversoldY, chartWidth, panelTop + panelHeight - oversoldY);

  // Draw center line (50)
  const centerY = panelTop + ((rsiMax - 50) / rsiRange) * panelHeight;
  ctx.beginPath();
  ctx.strokeStyle = darkMode
    ? "rgba(212, 212, 216, 0.2)"
    : "rgba(63, 63, 70, 0.2)";
  ctx.setLineDash([2, 2]);
  ctx.moveTo(0, centerY);
  ctx.lineTo(chartWidth, centerY);
  ctx.stroke();

  // Draw overbought/oversold lines
  ctx.beginPath();
  ctx.strokeStyle = darkMode
    ? "rgba(255, 50, 50, 0.5)"
    : "rgba(255, 50, 50, 0.5)";
  ctx.moveTo(0, overboughtY);
  ctx.lineTo(chartWidth, overboughtY);
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = darkMode
    ? "rgba(50, 255, 50, 0.5)"
    : "rgba(50, 255, 50, 0.5)";
  ctx.moveTo(0, oversoldY);
  ctx.lineTo(chartWidth, oversoldY);
  ctx.stroke();

  ctx.setLineDash([]); // Reset line dash

  // Generate a cache key for this panel rendering
  const cacheKey = `${indicator.id}-panel-${data[0]?.time}-${data[data.length - 1]?.time}-${chartWidth}-${panelHeight}`;

  // Only use cache during dragging for performance, always render fresh otherwise
  const cachedPanel = renderedPanelCache.get(cacheKey);
  const useCache =
    isDragging &&
    cachedPanel &&
    cachedPanel.timestamp > Date.now() - 2000 && // Cache valid for 2 seconds
    cachedPanel.data.length === indicatorData.length;

  if (useCache) {
    // Use the cached path during dragging
    ctx.strokeStyle = indicator.color;
    ctx.lineWidth = isDragging ? 1 : 2;
    ctx.stroke(cachedPanel.paths[0]);
    return;
  }

  // Draw RSI line
  const path = new Path2D();
  ctx.beginPath();
  ctx.strokeStyle = indicator.color;
  ctx.lineWidth = isDragging ? 1 : 2;

  let started = false;

  // Draw the RSI line with proper positioning for future candles
  for (let i = 0; i < data.length; i++) {
    const value = i < indicatorData.length ? indicatorData[i] : null;
    if (value === null || isNaN(value)) continue;

    // Calculate x position based on the candle's position in the full dataset
    // This ensures indicators are positioned correctly when scrolling
    const dataIndex = data[i].time
      ? globalCandleData.findIndex((c) => c.time === data[i].time)
      : i;
    const adjustedIndex = dataIndex >= 0 ? dataIndex : i;
    const x = ((adjustedIndex - startOffset) / totalVisibleRange) * chartWidth;

    // Skip if outside visible area
    if (x < 0 || x > chartWidth) continue;

    const y = panelTop + ((rsiMax - value) / rsiRange) * panelHeight;

    if (!started) {
      path.moveTo(x, y);
      started = true;
    } else {
      path.lineTo(x, y);
    }
  }

  // Cache the path for future use
  renderedPanelCache.set(cacheKey, {
    paths: [path],
    timestamp: Date.now(),
    colors: [indicator.color],
    data: [...indicatorData],
  });

  ctx.stroke(path);
}

// Render indicators
export function renderIndicators(
  ctx: CanvasRenderingContext2D,
  indicators: any[],
  data: CandleData[],
  chartWidth: number,
  chartHeight: number,
  chartTop: number,
  priceRange: { min: number; max: number },
  visibleRange: { start: number; end: number },
  totalVisibleRange: number,
  startOffset: number,
  globalCandleData: CandleData[],
  isDragging = false
) {
  // Filter visible indicators - only render indicators that are explicitly set to visible
  const visibleIndicators = indicators.filter(
    (indicator) => indicator && indicator.visible === true
  );

  // If no visible indicators, return early
  if (visibleIndicators.length === 0) return;

  // Use simpler rendering during dragging for better performance
  const lineWidth = isDragging ? 1.0 : 1.5;
  const useGlow = !isDragging;

  // Render each indicator
  visibleIndicators.forEach((indicator) => {
    // Skip if no data
    if (!indicator.data || indicator.data.length === 0) return;

    // Generate a cache key for this indicator's rendered path
    const cacheKey = `${indicator.id}-${data[0]?.time}-${data[data.length - 1]?.time}-${chartWidth}-${chartHeight}-${priceRange.min}-${priceRange.max}`;

    // Check if we have a cached path that we can reuse
    const cachedPath = renderedPathCache.get(cacheKey);
    if (
      cachedPath &&
      cachedPath.timestamp > Date.now() - 2000 && // Cache valid for 2 seconds
      cachedPath.color === indicator.color &&
      cachedPath.lineWidth === lineWidth &&
      cachedPath.lineStyle === (indicator.lineStyle || "solid")
    ) {
      // Use the cached path
      ctx.strokeStyle = indicator.color || "#3b82f6";
      ctx.lineWidth = lineWidth;

      // Apply line style if specified
      if (indicator.lineStyle === "dashed") {
        ctx.setLineDash([5, 3]);
      } else if (indicator.lineStyle === "dotted") {
        ctx.setLineDash([2, 2]);
      } else {
        ctx.setLineDash([]);
      }

      // Add subtle glow effect only when not dragging
      if (useGlow) {
        ctx.shadowColor = indicator.color || "#3b82f6";
        ctx.shadowBlur = 2;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.stroke(cachedPath.path);
      ctx.shadowBlur = 0;

      return;
    }

    // Get visible portion of indicator data that aligns with visible candles
    const visibleIndicatorData = getVisibleIndicatorData(
      indicator,
      data,
      globalCandleData
    );

    // Skip if no visible data
    if (visibleIndicatorData.length === 0) return;

    // Create a new Path2D object for the indicator line
    const path = new Path2D();

    // Set line style
    ctx.strokeStyle = indicator.color || "#3b82f6";
    ctx.lineWidth = 1.5;

    // Apply line style if specified
    if (indicator.lineStyle === "dashed") {
      ctx.setLineDash([5, 3]);
    } else if (indicator.lineStyle === "dotted") {
      ctx.setLineDash([2, 2]);
    } else {
      ctx.setLineDash([]);
    }

    let started = false;

    // Draw indicator line
    for (
      let i = 0;
      i < Math.min(data.length, visibleIndicatorData.length);
      i++
    ) {
      const value = visibleIndicatorData[i];
      if (isNaN(value)) continue;

      // Calculate x position based on the candle's position in the full dataset
      // This ensures indicators are positioned correctly when scrolling
      const dataIndex = data[i].time
        ? globalCandleData.findIndex((c) => c.time === data[i].time)
        : i;
      const adjustedIndex = dataIndex >= 0 ? dataIndex : i;
      const x =
        ((adjustedIndex - startOffset) / totalVisibleRange) * chartWidth;

      // Skip if outside visible area
      if (x < 0 || x > chartWidth) continue;

      // Calculate y position based on indicator value
      const y =
        chartTop +
        ((priceRange.max - value) / (priceRange.max - priceRange.min)) *
          chartHeight;

      if (!started) {
        path.moveTo(x, y);
        started = true;
      } else {
        path.lineTo(x, y);
      }
    }

    // Cache the path for future use
    renderedPathCache.set(cacheKey, {
      path,
      timestamp: Date.now(),
      color: indicator.color || "#3b82f6",
      lineWidth: 1.5,
      lineStyle: indicator.lineStyle || "solid",
    });

    // Add subtle glow effect
    ctx.shadowColor = indicator.color || "#3b82f6";
    ctx.shadowBlur = 2;
    ctx.stroke(path);
    ctx.shadowBlur = 0;
  });
}

// Keep the renderTechnicalIndicatorPanes function as is, but add caching for panel rendering
export function renderTechnicalIndicatorPanes(
  ctx: CanvasRenderingContext2D,
  indicators: any[],
  visibleData: CandleData[],
  chartWidth: number,
  chartTop: number,
  priceChartHeight: number,
  volumeHeight: number,
  priceScaleWidth: number,
  theme: string,
  setShowIndicatorPanel: ((show: boolean) => void) | undefined,
  setActiveIndicatorId: ((id: string | null) => void) | undefined,
  toggleIndicator: ((id: string) => void) | undefined,
  paneHeights: Record<string, number> = {},
  setPanelHeights: ((heights: Record<string, number>) => void) | undefined,
  collapsedPanels: Record<string, boolean> = {},
  setCollapsedPanels:
    | ((collapsed: Record<string, boolean>) => void)
    | undefined,
  isDraggingPanel: Record<string, boolean> = {},
  setIsDraggingPanel: ((dragging: Record<string, boolean>) => void) | undefined,
  globalCandleData: CandleData[] = [],
  visibleRange: { start: number; end: number } = { start: 0, end: 0 },
  totalVisibleRange = 0,
  startOffset = 0,
  isDragging = false
) {
  // Ensure indicators is an array and filter for visible indicators that should be in separate panes
  const safeIndicators = Array.isArray(indicators) ? indicators : [];
  const separatePanelIndicators = safeIndicators.filter(
    (i) => i && i.visible && i.separatePanel
  );

  if (separatePanelIndicators.length === 0)
    return {
      paneTop: chartTop + priceChartHeight + volumeHeight,
      handlePaneClick: () => false,
      handlePaneResize: () => {},
    };

  let paneTop = chartTop + priceChartHeight + volumeHeight;

  // Ensure paneHeights and collapsedPanels are objects
  const safePaneHeights = paneHeights || {};
  const safeCollapsedPanels = collapsedPanels || {};

  // Render each indicator pane
  separatePanelIndicators.forEach((indicator, index) => {
    // Skip if indicator doesn't have an id
    if (!indicator || !indicator.id) return;

    // Get pane height from state or use default
    const paneHeight = safePaneHeights[indicator.id] || 100;
    const isCollapsed = safeCollapsedPanels[indicator.id] || false;
    // Include the header height in the total panel height calculation
    const headerHeight = 0; // Changed from 24 to remove the header
    const actualPaneHeight = isCollapsed
      ? 6 // only 6px high when collapsed
      : safePaneHeights[indicator.id] || 100; // same as configured paneHeight

    // Draw pane background - semi-transparent
    ctx.fillStyle =
      theme === "dark" ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.7)";
    ctx.fillRect(0, paneTop, chartWidth, actualPaneHeight);

    // Draw pane border (only in dark mode to avoid black artifacts in light mode)
    if (theme === "dark") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, paneTop, chartWidth, actualPaneHeight);
    }

    // Draw title bar (smaller height, no separate header)
    const titleHeight = 24;

    // Only draw header if headerHeight > 0
    if (headerHeight > 0) {
      // Draw title bar
      ctx.fillStyle =
        theme === "dark" ? "rgba(26, 28, 39, 0.8)" : "rgba(240, 241, 245, 0.8)";
      ctx.fillRect(0, paneTop, chartWidth, titleHeight);

      // Draw indicator name in the title bar
      const indicatorName =
        indicator.type.toUpperCase() +
        (indicator.params?.period ? ` (${indicator.params.period})` : "");
      ctx.fillStyle =
        theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)";
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(indicatorName, 10, paneTop + titleHeight / 2);
    }

    // If not collapsed, render the indicator content
    if (!isCollapsed) {
      // Get the indicator definition from the registry
      const indicatorDef = indicatorRegistry[indicator.type];

      // Update contentTop and contentHeight
      const contentTop = paneTop; // No header offset
      const contentHeight = actualPaneHeight;

      // Draw Y-axis labels for the indicator pane
      ctx.fillStyle =
        theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)";
      ctx.font = "10px Arial";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      // Determine min/max values for the indicator
      let minValue = 0;
      let maxValue = 100;

      // For RSI, use 0-100 scale
      if (indicator.type === "rsi") {
        minValue = 0;
        maxValue = 100;

        // Draw standard RSI levels (30, 50, 70)
        const contentHeight = actualPaneHeight - titleHeight;
        const contentTop = paneTop + titleHeight;

        // Draw overbought line (70)
        const overboughtY = contentTop + (30 / 100) * contentHeight;
        ctx.strokeStyle =
          theme === "dark"
            ? "rgba(255, 100, 100, 0.3)"
            : "rgba(255, 0, 0, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, overboughtY);
        ctx.lineTo(chartWidth, overboughtY);
        ctx.stroke();
        ctx.fillText("70", chartWidth + priceScaleWidth - 5, overboughtY);

        // Draw middle line (50)
        const middleY = contentTop + (50 / 100) * contentHeight;
        ctx.strokeStyle =
          theme === "dark"
            ? "rgba(212, 212, 216, 0.2)"
            : "rgba(63, 63, 70, 0.2)";
        ctx.beginPath();
        ctx.moveTo(0, middleY);
        ctx.lineTo(chartWidth, middleY);
        ctx.stroke();
        ctx.fillText("50", chartWidth + priceScaleWidth - 5, middleY);

        // Draw oversold line (30)
        const oversoldY = contentTop + (70 / 100) * contentHeight;
        ctx.strokeStyle =
          theme === "dark"
            ? "rgba(100, 255, 100, 0.3)"
            : "rgba(0, 255, 0, 0.2)";
        ctx.beginPath();
        ctx.moveTo(0, oversoldY);
        ctx.lineTo(chartWidth, oversoldY);
        ctx.stroke();
        ctx.fillText("30", chartWidth + priceScaleWidth - 5, oversoldY);

        // Only draw the min/max values if they're not too close to the other values
        const topY = contentTop + 5;
        const bottomY = contentTop + contentHeight - 5;

        // Only draw 100 if it's not too close to 70
        if (Math.abs(topY - overboughtY) > 15) {
          ctx.fillText("100", chartWidth + priceScaleWidth - 5, topY);
        }

        // Only draw 0 if it's not too close to 30
        if (Math.abs(bottomY - oversoldY) > 15) {
          ctx.fillText("0", chartWidth + priceScaleWidth - 5, bottomY);
        }
      }
      // For other indicators, calculate min/max from data
      else if (indicator.data && indicator.data.length > 0) {
        const visibleIndicatorData = getVisibleIndicatorData(
          indicator,
          visibleData,
          globalCandleData
        );
        if (visibleIndicatorData.length > 0) {
          minValue = Math.min(...visibleIndicatorData.filter((v) => !isNaN(v)));
          maxValue = Math.max(...visibleIndicatorData.filter((v) => !isNaN(v)));

          // Add some padding
          const range = maxValue - minValue;
          minValue = Math.max(0, minValue - range * 0.1);
          maxValue = maxValue + range * 0.1;

          // Draw min/max and middle values
          const contentHeight = actualPaneHeight - titleHeight;
          const contentTop = paneTop + titleHeight;

          ctx.fillText(
            maxValue.toFixed(2),
            chartWidth + priceScaleWidth - 5,
            contentTop + 10
          );
          ctx.fillText(
            ((maxValue + minValue) / 2).toFixed(2),
            chartWidth + priceScaleWidth - 5,
            contentTop + contentHeight / 2
          );
          ctx.fillText(
            minValue.toFixed(2),
            chartWidth + priceScaleWidth - 5,
            contentTop + contentHeight - 10
          );
        }
      }

      if (indicatorDef && indicatorDef.renderPanel) {
        try {
          // Get visible portion of indicator data that aligns with visible candles
          const visibleIndicatorData = getVisibleIndicatorData(
            indicator,
            visibleData,
            globalCandleData
          );

          // Create a modified indicator with aligned data for rendering
          const alignedIndicator = {
            ...indicator,
            visibleData: visibleIndicatorData,
          };

          // ALWAYS render the indicator panel, even during dragging
          // Call the indicator's renderPanel function with proper parameters
          indicatorDef.renderPanel(
            ctx,
            alignedIndicator,
            visibleData,
            chartWidth,
            actualPaneHeight - titleHeight, // Subtract title height
            paneTop + titleHeight, // Add title height to top
            priceScaleWidth,
            theme === "dark",
            globalCandleData,
            visibleRange,
            totalVisibleRange,
            startOffset,
            isDragging // Pass the isDragging parameter
          );
        } catch (error) {
          console.error(
            `Error rendering panel for indicator ${indicator.type}:`,
            error
          );

          // Draw error message
          ctx.fillStyle =
            theme === "dark"
              ? "rgba(255, 100, 100, 0.8)"
              : "rgba(220, 50, 50, 0.8)";
          ctx.font = "12px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            `Error rendering ${indicator.type}`,
            chartWidth / 2,
            paneTop + titleHeight + (actualPaneHeight - titleHeight) / 2
          );
        }
      } else {
        // Draw message for missing renderer
        ctx.fillStyle =
          theme === "dark" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)";
        ctx.font = "12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          `No renderer available for ${indicator.type}`,
          chartWidth / 2,
          paneTop + titleHeight + (actualPaneHeight - titleHeight) / 2
        );
      }
    }

    // Move to the next pane position
    paneTop += actualPaneHeight;
  });

  return {
    paneTop, // Return the final position after all panes
    handlePaneClick: (x: number, y: number) => {
      // Check if click is within any pane
      let currentTop = chartTop + priceChartHeight + volumeHeight;

      for (const indicator of separatePanelIndicators) {
        // Skip if indicator doesn't have an id
        if (!indicator || !indicator.id) continue;

        const paneHeight = safePaneHeights[indicator.id] || 100;
        const isCollapsed = safeCollapsedPanels[indicator.id] || false;
        const actualPaneHeight = isCollapsed ? 30 : paneHeight;
        const titleHeight = 24;

        // Check if click is within the title bar
        if (y >= currentTop && y <= currentTop + titleHeight) {
          // Toggle indicator visibility when clicking on title bar
          if (toggleIndicator) {
            toggleIndicator(indicator.id);
          }
          return true;
        }

        currentTop += actualPaneHeight;
      }

      return false;
    },
    handlePaneResize: () => {
      // Resizing functionality removed as requested
    },
  };
}

export const ChartIndicatorRenderer = {
  render({
    ctx,
    candleData,
    indicators,
    visibleRange,
    chartWidth,
    priceChartHeight,
    chartTop,
    chartHeight,
    theme,
    isDragging,
    renderQuality,
    showVolumeProfile,
    priceAlerts,
    volumeHeight,
    volumeTop,
    priceScaleWidth,
    setShowIndicatorPanel,
    setActiveIndicatorId,
    toggleIndicator,
    panelHeights,
    setPanelHeights,
    collapsedPanels,
    setCollapsedPanels,
    isDraggingPanel,
    setIsDraggingPanel,
  }: any) {
    if (
      !ctx ||
      !candleData ||
      !Array.isArray(candleData) ||
      candleData.length === 0
    )
      return;

    // Ensure all parameters have default values
    const safeIndicators = Array.isArray(indicators) ? indicators : [];
    const safeVisibleRange = visibleRange || {
      start: 0,
      end: candleData.length,
    };
    const safePriceAlerts = Array.isArray(priceAlerts) ? priceAlerts : [];
    const safePanelHeights = panelHeights || {};
    const safeCollapsedPanels = collapsedPanels || {};
    const safeIsDraggingPanel = isDraggingPanel || {};

    // Calculate visible data
    const start = Math.max(0, Math.floor(safeVisibleRange.start));
    const end = Math.min(candleData.length, Math.ceil(safeVisibleRange.end));
    const visibleData = candleData.slice(start, end);

    // Add a buffer to prevent popping at edges
    const bufferSize = Math.min(20, Math.floor((end - start) * 0.1));
    const bufferedStart = Math.max(0, start - bufferSize);
    const bufferedEnd = Math.min(candleData.length, end + bufferSize);
    const bufferedVisibleData = candleData.slice(bufferedStart, bufferedEnd);

    if (bufferedVisibleData.length === 0) return;

    // Calculate price range with padding
    let minPrice = Math.min(...bufferedVisibleData.map((d: any) => d.low));
    let maxPrice = Math.max(...bufferedVisibleData.map((d: any) => d.high));
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.1;
    minPrice = Math.max(0, minPrice - pricePadding);
    maxPrice = maxPrice + pricePadding;

    // Calculate total visible range and start offset for proper positioning
    const totalVisibleRange = safeVisibleRange.end - safeVisibleRange.start;
    const startOffset = safeVisibleRange.start;

    // ALWAYS render indicators, but with simplified rendering during dragging
    // Only render indicators that should be on the main chart (not in separate panes)
    const visibleIndicators = safeIndicators.filter((i: any) => i && i.visible);
    const mainChartIndicators = visibleIndicators.filter(
      (i: any) => !i.separatePanel
    );

    // Use our renderIndicators function with isDragging parameter
    renderIndicators(
      ctx,
      mainChartIndicators,
      bufferedVisibleData,
      chartWidth,
      priceChartHeight,
      chartTop,
      { min: minPrice, max: maxPrice },
      safeVisibleRange,
      totalVisibleRange,
      startOffset,
      candleData,
      isDragging // Pass the isDragging parameter
    );

    // ALWAYS render technical indicator panels, even during dragging
    // Use the new function to render technical indicator sections
    return renderTechnicalIndicatorPanes(
      ctx,
      safeIndicators,
      bufferedVisibleData,
      chartWidth,
      chartTop,
      priceChartHeight,
      volumeHeight || 0,
      priceScaleWidth,
      theme,
      setShowIndicatorPanel,
      setActiveIndicatorId,
      toggleIndicator,
      safePanelHeights,
      setPanelHeights,
      safeCollapsedPanels,
      setCollapsedPanels,
      safeIsDraggingPanel,
      setIsDraggingPanel,
      candleData,
      safeVisibleRange,
      totalVisibleRange,
      startOffset,
      isDragging // Pass the isDragging parameter
    );
  },
};

export function renderIndicator(
  ctx: CanvasRenderingContext2D,
  candles: CandleData[],
  indicator: Indicator,
  visibleRange: { start: number; end: number },
  dimensions: { width: number; height: number },
  priceRange: { min: number; max: number },
  theme: string,
  separatePanelHeight?: number,
  separatePanelTop?: number,
  separatePanelPriceRange?: { min: number; max: number }
) {
  if (
    !indicator ||
    !indicator.visible ||
    !indicator.data ||
    indicator.data.length === 0
  )
    return;

  const isLightTheme = theme === "light";

  // Get the indicator definition from the registry
  const indicatorDef =
    indicatorRegistry[indicator.type as keyof typeof indicatorRegistry];

  // Use theme-specific color if available, otherwise use the indicator's color
  let color = indicator.color;
  if (isLightTheme && indicatorDef?.getLightThemeColor) {
    color = indicatorDef.getLightThemeColor();
  } else if (!isLightTheme && indicatorDef?.getDarkThemeColor) {
    color = indicatorDef.getDarkThemeColor();
  }

  // Set line style
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  // Set line dash based on lineStyle
  if (indicator.lineStyle === "dashed") {
    ctx.setLineDash([5, 3]);
  } else if (indicator.lineStyle === "dotted") {
    ctx.setLineDash([2, 2]);
  } else {
    ctx.setLineDash([]);
  }

  const startIdx = Math.max(0, Math.floor(visibleRange.start));
  const endIdx = Math.min(candles.length - 1, Math.ceil(visibleRange.end));

  // If the indicator is in a separate panel, use the separate panel dimensions
  const useHeight =
    indicator.separatePanel && separatePanelHeight
      ? separatePanelHeight
      : dimensions.height;
  const useTop =
    indicator.separatePanel && separatePanelTop !== undefined
      ? separatePanelTop
      : 0;
  const usePriceRange =
    indicator.separatePanel && separatePanelPriceRange
      ? separatePanelPriceRange
      : priceRange;

  // Begin drawing the line
  ctx.beginPath();

  // Calculate the width of each candle
  const candleWidth =
    dimensions.width / (visibleRange.end - visibleRange.start);

  // Move to the first point
  let firstValidIdx = -1;
  for (let i = startIdx; i <= endIdx; i++) {
    if (indicator.data[i] !== undefined && !isNaN(indicator.data[i])) {
      firstValidIdx = i;
      break;
    }
  }

  if (firstValidIdx === -1) return; // No valid data points

  // Calculate the x position of the first point
  const firstX = (firstValidIdx - visibleRange.start) * candleWidth;

  // Calculate the y position of the first point
  const firstY =
    useTop +
    useHeight -
    ((indicator.data[firstValidIdx] - usePriceRange.min) /
      (usePriceRange.max - usePriceRange.min)) *
      useHeight;

  ctx.moveTo(firstX, firstY);

  // Draw lines to each subsequent point
  for (let i = firstValidIdx + 1; i <= endIdx; i++) {
    if (indicator.data[i] === undefined || isNaN(indicator.data[i])) continue;

    // Calculate the x position of the current point
    const x = (i - visibleRange.start) * candleWidth;

    // Calculate the y position of the current point
    const y =
      useTop +
      useHeight -
      ((indicator.data[i] - usePriceRange.min) /
        (usePriceRange.max - usePriceRange.min)) *
        useHeight;

    ctx.lineTo(x, y);
  }

  // Stroke the path
  ctx.stroke();

  // Reset line dash
  ctx.setLineDash([]);
}
