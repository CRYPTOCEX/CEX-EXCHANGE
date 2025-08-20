"use client";

// Extend Window interface to include chartGridPositions
declare global {
  interface Window {
    chartGridPositions?: Array<{ x: number; y: number }>;
  }
}

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useChart } from "../context/chart-context";
import RenderManager from "./performance/render-manager";
import MemoryManager from "./performance/memory-manager";
import DataCache from "./performance/data-cache";
import VirtualRenderer, {
  getVirtualCandles,
  calculateLevelOfDetail,
} from "./performance/virtual-renderer";
import {
  ChartMainRenderer,
  setGlobalCandleData,
  currentPriceRange,
} from "./render/main";
import { ChartVolumeRenderer } from "./render/volume";
import { ChartOverlayRenderer } from "./render/overlay";
import { renderFooter } from "./render/footer/index";
import {
  type ExpiryMarker,
  calculateNextExpiryTime,
  renderExpiryMarkers,
} from "./render/expiry-marker";
import { getChartSynchronizedTime } from "@/utils/time-sync";
import { ChartIndicatorRenderer } from "./render/indicator";
import { renderPositionMarkers } from "./render/position-marker";
import { renderPriceAxis } from "./render/price-axis";
import { renderGrid } from "./render/grid";
import type { Order as BinaryOrder } from "@/store/trade/use-binary-store";

// Update the PositionMarker interface to match the one in position-marker.ts
// Replace the existing PositionMarker interface with:
interface PositionMarker {
  id: string;
  entryTime: number; // Unix timestamp in seconds
  entryPrice: number;
  expiryTime: number; // Unix timestamp in seconds
  type: "CALL" | "PUT";
  amount: number;
  status?: "ACTIVE" | "COMPLETED" | "EXPIRED";
  result?: "WIN" | "LOSS" | null;
  createdAt?: number; // For animation timing
  side?: "RISE" | "FALL"; // For compatibility with binary store
}

// Update the adapter function to create objects with the correct property names
// Replace the existing adaptOrdersToPositionMarkers function with:
function adaptOrdersToPositionMarkers(orders: BinaryOrder[]): PositionMarker[] {
  const currentTimeMs = Date.now();
  const currentTimeSec = currentTimeMs / 1000;
  
  return orders
    .filter((order) => {
      // Filter out invalid orders
      if (!order || !order.entryPrice || order.entryPrice <= 0) return false;
      
      // Convert expiryTime from milliseconds to seconds for comparison
      const orderExpiryTimeSec = order.expiryTime / 1000;
      const isExpired = orderExpiryTimeSec < currentTimeSec;
      
      // For PENDING orders, show them until they expire
      if (order.status === "PENDING") {
        return !isExpired;
      }
      
      // For completed orders, show them briefly after expiry for animation
      if (order.status === "COMPLETED" || order.status === "WIN" || order.status === "LOSS") {
        // Show completed orders for up to 5 seconds after expiry
        return !isExpired || (currentTimeSec - orderExpiryTimeSec < 5);
      }
      
      // Default: don't show unknown status orders
      return false;
    })
    .map((order) => ({
      id: order.id || `order-${Math.random().toString(36).substring(2, 9)}`,
      entryTime:
        typeof order.createdAt === "number"
          ? order.createdAt / 1000  // Convert from ms to seconds
          : Date.now() / 1000,
      entryPrice: order.entryPrice,
      expiryTime: order.expiryTime / 1000,  // Convert from ms to seconds
      type: order.side === "RISE" ? "CALL" : "PUT",
      amount: order.amount || 0,
      status: order.status === "PENDING" ? "ACTIVE" : order.status as "ACTIVE" | "COMPLETED" | "EXPIRED" | undefined,
      result: order.status === "WIN" ? "WIN" : order.status === "LOSS" ? "LOSS" : null,
      createdAt: order.createdAt,  // Keep in milliseconds for animation timing
      side: order.side,
    }));
}

// Update the generateExpiryMarkers function to use the provided expiryMinutes
const generateExpiryMarkers = (
  expiryMinutes: number,
  currentTime: Date
): ExpiryMarker[] => {
  const nextExpiryTime = calculateNextExpiryTime(currentTime, expiryMinutes);
  const nextExpiryTimestamp = Math.floor(nextExpiryTime.getTime() / 1000);

  const newMarker: ExpiryMarker = {
    timestamp: nextExpiryTimestamp,
    label: "", // Empty label since we're not showing it anymore
    color: "#ffcc00", // Yellow color for expiry
  };

  return [newMarker];
};

// Update the renderToOffscreenCanvas function to properly handle indicator panels and their axes
export function renderToOffscreenCanvas({
  offscreenCanvas,
  dimensions,
  renderQuality,
  theme,
  visibleRange,
  candleData,
  indicators,
  chartWidth,
  chartHeight,
  priceChartHeight,
  volumeHeight,
  chartTop,
  volumeTop,
  showGrid,
  isLoadingOlderData,
  showVolume,
  priceScaleWidth,
  timeScaleHeight,
  chartType,
  showVolumeProfile,
  isDragging,
  drawingTools,
  priceToY,
  yToPrice,
  priceAlerts,
  mousePosition,
  hoverEffect,
  orders,
  expiryMinutes,
  expiryMarkers,
  panelHeights,
  collapsedPanels,
}: any) {
  if (!offscreenCanvas) return null;

  // Set canvas dimensions with proper scaling
  const pixelRatio = window.devicePixelRatio || 1;
  offscreenCanvas.width = dimensions.width * pixelRatio;
  offscreenCanvas.height = dimensions.height * pixelRatio;
  const ctx = offscreenCanvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  // Scale the context to account for the device pixel ratio
  ctx.scale(pixelRatio, pixelRatio);

  // Enable crisp edges for better grid and line rendering
  ctx.imageSmoothingEnabled = false;

  // Translate by 0.5px to ensure crisp lines (only in dark mode to avoid artifacts in light mode)
  if (theme === "dark") {
    ctx.translate(0.5, 0.5);
  }

  // Clear canvas with background color (use slight padding in light mode to avoid edge artifacts)
  ctx.fillStyle = theme === "dark" ? "#000000" : "#ffffff";
  if (theme === "dark") {
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);
  } else {
    // In light mode, clear a slightly smaller area to avoid edge artifacts
    ctx.fillRect(1, 1, dimensions.width - 2, dimensions.height - 2);
    // Fill the edges with white to ensure no artifacts
    ctx.fillRect(0, 0, dimensions.width, 1); // Top edge
    ctx.fillRect(0, 0, 1, dimensions.height); // Left edge
    ctx.fillRect(0, dimensions.height - 1, dimensions.width, 1); // Bottom edge
    ctx.fillRect(dimensions.width - 1, 0, 1, dimensions.height); // Right edge
  }

  // Update global candle data reference for time-based calculations
  setGlobalCandleData(candleData);

  // Calculate space needed for separate indicator panels
  const visibleIndicators = indicators
    ? indicators.filter((i: any) => i && i.visible)
    : [];
  const separatePanelIndicators = visibleIndicators.filter(
    (i: any) => i && i.separatePanel
  );

  // Calculate total height of indicator panels including headers
  let indicatorPanelsHeight = 0;
  separatePanelIndicators.forEach((indicator: any) => {
    if (!indicator || !indicator.id) return;

    // Get panel height from state or use default
    const panelHeight =
      indicator.id && panelHeights ? panelHeights[indicator.id] || 100 : 100;
    const isCollapsed =
      indicator.id && collapsedPanels
        ? collapsedPanels[indicator.id] || false
        : false;

    // Add header height (24px) to panel height
    indicatorPanelsHeight += isCollapsed ? 30 : panelHeight + 24;
  });

  // Adjust chart dimensions to make room for indicator panels
  const adjustedChartHeight = chartHeight - indicatorPanelsHeight;

  // Calculate price chart height and volume height based on adjusted chart height
  let adjustedPriceChartHeight, adjustedVolumeHeight, adjustedVolumeTop;

  if (showVolume) {
    // If volume is shown, allocate 80% to price chart and 20% to volume
    adjustedPriceChartHeight = adjustedChartHeight * 0.8;
    adjustedVolumeHeight = adjustedChartHeight * 0.2;
    adjustedVolumeTop = chartTop + adjustedPriceChartHeight;
  } else {
    // If volume is hidden, allocate 100% to price chart
    adjustedPriceChartHeight = adjustedChartHeight;
    adjustedVolumeHeight = 0;
    adjustedVolumeTop = chartTop + adjustedPriceChartHeight;
  }

  // Get current time for expiry calculations
  const currentTime = new Date();

  // Generate expiry markers if needed
  let markersToUse = expiryMarkers;
  if (
    (!markersToUse || markersToUse.length === 0) &&
    expiryMinutes &&
    expiryMinutes > 0
  ) {
    markersToUse = generateExpiryMarkers(expiryMinutes, currentTime);
  }

  // Calculate indicator panel positions
  const currentPanelTop =
    chartTop + adjustedPriceChartHeight + adjustedVolumeHeight;

  // 1) Render main chart
  ChartMainRenderer.render({
    ctx,
    candleData,
    visibleRange,
    chartWidth,
    priceChartHeight: adjustedPriceChartHeight,
    chartTop,
    chartHeight: adjustedChartHeight,
    showGrid: false, // Don't render grid in main renderer
    theme: theme === "dark" ? "dark" : "light",
    chartType,
    isDragging,
    priceScaleWidth,
    timeScaleHeight,
    volumeHeight: adjustedVolumeHeight,
    volumeTop: adjustedVolumeTop,
    expiryMarkers: [], // Don't render expiry markers here anymore
    expiryMinutes: expiryMinutes || 5, // Ensure we have a default value
    currentTime: currentTime.getTime(),
  });

  // 1.5) Render grid separately (this is a key change!)
  if (showGrid) {
    renderGrid(
      ctx,
      chartWidth,
      adjustedPriceChartHeight,
      adjustedVolumeHeight,
      chartTop,
      adjustedVolumeTop,
      theme === "dark",
      theme === "dark" ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.07)",
      candleData,
      visibleRange
    );
  }

  // 2) Render volume if enabled
  if (showVolume) {
    ChartVolumeRenderer.render({
      ctx,
      candleData,
      visibleRange,
      chartWidth,
      volumeHeight: adjustedVolumeHeight,
      volumeTop: adjustedVolumeTop,
      theme,
      isDragging,
    });
  }

  // 3) Render overlays (crosshair, price line, etc.) - BUT NOT ORDERS OR EXPIRY MARKERS
  ChartOverlayRenderer.render({
    ctx,
    candleData,
    mousePosition,
    hoverEffect,
    orders: [], // Pass empty array to prevent duplicate rendering
    chartWidth,
    priceChartHeight: adjustedPriceChartHeight,
    chartTop,
    theme: theme === "dark" ? "dark" : "light",
    isDragging,
    priceScaleWidth,
    volumeHeight: adjustedVolumeHeight,
    visibleRange,
    priceRange: currentPriceRange, // Pass the price range from the main renderer
  });

  // 4) Render indicators AFTER overlays so they're not cleared
  ChartIndicatorRenderer.render({
    ctx,
    candleData,
    indicators: indicators || [],
    visibleRange: visibleRange || { start: 0, end: candleData.length },
    chartWidth,
    priceChartHeight: adjustedPriceChartHeight,
    chartTop,
    chartHeight: adjustedChartHeight,
    theme,
    isDragging,
    renderQuality,
    showVolumeProfile,
    priceAlerts: priceAlerts || [],
    volumeHeight: adjustedVolumeHeight,
    volumeTop: adjustedVolumeTop,
    priceScaleWidth,
    panelTop: currentPanelTop, // Now currentPanelTop is defined
    panelHeights,
    collapsedPanels,
  });

  // 5) Render expiry markers separately
  if (markersToUse && markersToUse.length > 0) {
    renderExpiryMarkers(
      ctx,
      markersToUse,
      candleData,
      chartWidth,
      adjustedPriceChartHeight,
      chartTop,
      visibleRange,
      currentTime.getTime(),
      true // Pass showExpiry parameter explicitly
    );
  }

  // 6) Render position markers if available - THIS IS THE ONLY PLACE WE RENDER ORDERS
  if (orders && orders.length > 0) {
    renderPositionMarkers(
      ctx,
      adaptOrdersToPositionMarkers(orders),
      candleData,
      chartWidth,
      adjustedPriceChartHeight,
      chartTop,
      visibleRange || { start: 0, end: candleData.length },
      currentPriceRange, // Pass the price range object instead of a function
      Date.now()
    );
  }

  // 7) Render price axis AFTER everything else to ensure it covers grid lines
  renderPriceAxis(
    ctx,
    chartWidth,
    adjustedPriceChartHeight,
    adjustedVolumeHeight,
    chartTop,
    adjustedVolumeTop,
    currentPriceRange,
    { min: 0, max: 1000000 }, // Default volume range
    priceScaleWidth,
    timeScaleHeight,
    theme === "dark",
    candleData
  );

  // 8) Make sure the footer is rendered with the correct dimensions
  renderFooter({
    ctx,
    chartWidth,
    chartHeight: dimensions.height - timeScaleHeight,
    timeScaleHeight,
    priceScaleWidth,
    theme: theme === "dark" ? "dark" : "light",
    data: candleData,
    visibleRange: visibleRange || { start: 0, end: candleData.length },
    isLoadingOlderData,
  });

  // Before returning, reset the translation
  ctx.translate(-0.5, -0.5);

  return offscreenCanvas;
}

const ChartRenderer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get performance managers (singletons)
  const renderManager = RenderManager.getInstance();
  const memoryManager = MemoryManager.getInstance();
  const dataCache = DataCache.getInstance();
  const virtualRenderer = VirtualRenderer.getInstance();

  // Get the chart context
  const context = useChart();

  // Extract known properties
  const {
    candleData,
    chartType,
    visibleRange,
    mousePosition,
    priceAlerts,
    indicators,
    showVolumeProfile,
    theme,
    showGrid,
    showVolume,
    setShowIndicatorPanel,
    setActiveIndicatorId,
    toggleIndicator,
    panelHeights,
    setPanelHeights,
    collapsedPanels,
    setCollapsedPanels,
    expiryIntervalMinutes,
    isDragging,
    orders,
    isDraggingPanel,
    setIsDraggingPanel,
    timeFrame,
  } = context;

  // Use type assertion for properties not in the type definition
  const hoverEffect = (context as any).hoverEffect;

  // Add local state for expiry markers - only update when needed
  const [expiryMarkers, setExpiryMarkers] = useState<ExpiryMarker[]>([]);
  const lastUpdateRef = useRef<number>(0);

  // Add animation frame request ID for cleanup
  const animationFrameRef = useRef<number | null>(null);

  // Add throttling for expiry marker updates
  const lastExpiryUpdateRef = useRef<number>(0);

  // Add a ref to hold the current expiry markers
  const expiryMarkersRef = useRef<ExpiryMarker[]>([]);

  // Initialize expiry markers immediately
  useEffect(() => {
    if (expiryIntervalMinutes > 0) {
      const currentTime = getChartSynchronizedTime();
      const nextExpiryTime = calculateNextExpiryTime(
        currentTime,
        expiryIntervalMinutes
      );
      const nextExpiryTimestamp = Math.floor(nextExpiryTime.getTime() / 1000);

      const initialMarker: ExpiryMarker = {
        timestamp: nextExpiryTimestamp,
        label: `${nextExpiryTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        color: "#ffcc00",
      };

      expiryMarkersRef.current = [initialMarker];
      setExpiryMarkers([initialMarker]);
    }
  }, [expiryIntervalMinutes]);

  // Add a ref to store the last render timestamp to limit frame rate
  const lastRenderTimeRef = useRef<number>(0);

  // Add a ref to store the last grid render timestamp to prevent grid recalculation
  const lastGridRenderTimeRef = useRef<number>(0);

  // Get chart dimensions with default values to prevent undefined errors
  const chartDimensions = useChart().dimensions || {
    width: 800,
    height: 600,
  };

  const priceScaleWidth = 60;
  const timeScaleHeight = 30;

  // Calculate total canvas height including indicator panels
  const calculateTotalHeight = useCallback(() => {
    const height = chartDimensions?.height || 600;
    const separatePanelIndicators = indicators
      ? indicators.filter((ind) => ind && ind.separatePanel && ind.visible)
      : [];

    // Calculate total height of all indicator panels including their headers
    let additionalHeight = 0;

    separatePanelIndicators.forEach((indicator) => {
      if (!indicator || !indicator.id) return;

      // Get panel height from state or use default
      const isCollapsed = collapsedPanels?.[indicator.id] || false;
      const paneHeight = panelHeights?.[indicator.id] || 100;

      // Use collapsed height (just header) or full height
      additionalHeight += isCollapsed ? 30 : paneHeight + 24; // 24px for header
    });

    return height + additionalHeight;
  }, [chartDimensions?.height, indicators, collapsedPanels, panelHeights]);

  // Memoize the expiry markers to prevent unnecessary re-renders
  const memoizedExpiryMarkers = useMemo(() => {
    // Use cache to avoid recalculating expiry markers frequently
    const cacheKey = `expiry_markers_${expiryIntervalMinutes}`;
    const cached = dataCache.get<ExpiryMarker[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Only update markers once per second to reduce performance impact
    const now = getChartSynchronizedTime();
    const currentTime = now.getTime();

    // Skip updates if less than 1 second has passed
    if (currentTime - lastUpdateRef.current < 1000) {
      return expiryMarkers;
    }

    lastUpdateRef.current = currentTime;

    // Calculate the next expiry interval
    const nextExpiryTime = calculateNextExpiryTime(
      now,
      expiryIntervalMinutes || 5
    );
    const nextExpiryTimestamp = Math.floor(nextExpiryTime.getTime() / 1000);

    // Create the expiry marker
    const newMarker: ExpiryMarker = {
      timestamp: nextExpiryTimestamp,
      label: `${nextExpiryTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      color: "#ffcc00", // Yellow color for expiry
    };

    const markers = [newMarker];

    // Cache for 1 second
    dataCache.set(cacheKey, markers);

    return markers;
  }, [expiryIntervalMinutes, lastUpdateRef.current, expiryMarkers, dataCache]);

  // Update expiry markers - use chart synchronized time with throttling
  useEffect(() => {
    if (!candleData || candleData.length === 0) return;

    const updateExpiryMarkers = () => {
      const now = Date.now();
      // Only update every 1000ms to reduce CPU usage
      if (now - lastExpiryUpdateRef.current < 1000) {
        return;
      }

      lastExpiryUpdateRef.current = now;

      // Get the current time
      const currentTime = getChartSynchronizedTime();

      // Calculate the next expiry interval using the current expiryIntervalMinutes
      const nextExpiryTime = calculateNextExpiryTime(
        currentTime,
        expiryIntervalMinutes || 5
      );
      const nextExpiryTimestamp = Math.floor(nextExpiryTime.getTime() / 1000);

      // Create the expiry marker
      const newMarker: ExpiryMarker = {
        timestamp: nextExpiryTimestamp,
        label: `${nextExpiryTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        color: "#ffcc00", // Yellow color for expiry
      };

      // Update the ref instead of state to prevent re-renders
      expiryMarkersRef.current = [newMarker];

      // Only update state if needed for other components
      // but not for rendering
      setExpiryMarkers([newMarker]);
    };

    // Initial update
    updateExpiryMarkers();

    // Set up interval with requestAnimationFrame instead of setInterval for better performance
    const tick = () => {
      updateExpiryMarkers();
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [candleData, expiryIntervalMinutes]);

  // Add resize event handling for performance optimized rendering
  useEffect(() => {
    const handleDimensionChange = () => {
      // Use the specialized resize render method
      renderManager.forceRenderForResize(() => {
        // Clear cache to ensure fresh render
        dataCache.clear();

        // Trigger re-render by updating canvas state
        const canvas = canvasRef.current;
        if (canvas) {
          // Force canvas to re-evaluate its dimensions
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width * (window.devicePixelRatio || 1);
          canvas.height = rect.height * (window.devicePixelRatio || 1);

          // Force immediate redraw
          setTimeout(() => {
            canvas.dispatchEvent(new Event("resize"));
          }, 0);
        }
      });
    };

    const handleResizeRequest = () => {
      // Handle resize requests from resize handles
      renderManager.forceRenderForResize(() => {
        // Clear render cache
        dataCache.clear();

        // Force canvas dimension recalculation
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width * (window.devicePixelRatio || 1);
          canvas.height = rect.height * (window.devicePixelRatio || 1);
        }
      });
    };

    window.addEventListener("chart-dimensions-changed", handleDimensionChange);
    window.addEventListener("chart-resize-requested", handleResizeRequest);

    return () => {
      window.removeEventListener(
        "chart-dimensions-changed",
        handleDimensionChange
      );
      window.removeEventListener("chart-resize-requested", handleResizeRequest);
    };
  }, [renderManager, dataCache]);

  // UNIFIED RENDERING APPROACH - Single useEffect for all rendering with optimizations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candleData || candleData.length === 0) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Set up sizes with proper scaling
    const pixelRatio = window.devicePixelRatio || 1;
    const width = chartDimensions?.width || 800;
    const totalHeight = calculateTotalHeight();

    // Only resize canvas when dimensions change to avoid performance hit
    if (
      canvas.width !== width * pixelRatio ||
      canvas.height !== totalHeight * pixelRatio
    ) {
      canvas.width = width * pixelRatio;
      canvas.height = totalHeight * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${totalHeight}px`;
    }

    // Create a render function that can be called by requestAnimationFrame
    const renderFrame = () => {
      if (!canvasRef.current || !chartDimensions) return;

      // Calculate virtual viewport and visible candles only
      const virtualChartWidth = chartDimensions.width - priceScaleWidth;
      const virtualData = getVirtualCandles(
        candleData,
        visibleRange,
        virtualChartWidth
      );

      // Determine level of detail based on zoom
      const levelOfDetail = calculateLevelOfDetail(
        visibleRange,
        virtualChartWidth
      );

      // Skip rendering if no visible candles
      if (virtualData.candles.length === 0 && !isDragging) {
        animationFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      // Update memory manager with virtual rendering stats
      memoryManager.updateVirtualRenderingMetrics(
        virtualData.candles.length,
        candleData.length
      );

      // Use optimized render manager with virtual data
      const renderData = {
        candleData: virtualData.candles, // Use only visible candles
        visibleRange,
        mousePosition,
        chartType,
        indicators,
        theme,
        isDragging,
        virtualHash: virtualData.hash,
        levelOfDetail,
      };

      // Check if render is needed with high priority for dragging
      const shouldRender = renderManager.shouldRender(renderData, {
        forceRender: isDragging,
        highPriority: isDragging,
      });

      if (!shouldRender && !isDragging) {
        // Schedule next frame
        animationFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      // 1) Clear & fill background - ONLY ONCE (avoid edge artifacts in light mode)
      ctx.fillStyle = theme === "dark" ? "#000000" : "#ffffff";
      if (theme === "dark") {
        ctx.fillRect(0, 0, width, totalHeight);
      } else {
        // In light mode, clear a slightly smaller area to avoid edge artifacts
        ctx.fillRect(1, 1, width - 2, totalHeight - 2);
        // Fill the edges with white to ensure no artifacts
        ctx.fillRect(0, 0, width, 1); // Top edge
        ctx.fillRect(0, 0, 1, totalHeight); // Left edge
        ctx.fillRect(0, totalHeight - 1, width, 1); // Bottom edge
        ctx.fillRect(width - 1, 0, 1, totalHeight); // Right edge
      }

      // Update global candle data for indicator rendering
      setGlobalCandleData(candleData);

      // Calculate dimensions for sub-regions
      const chartWidth = width - priceScaleWidth;
      const baseChartHeight = chartDimensions?.height || 600;
      const chartHeight = baseChartHeight - timeScaleHeight;
      const chartTop = 0;

      // Calculate space needed for separate indicator panels
      const visibleIndicators = indicators
        ? indicators.filter((i: any) => i && i.visible)
        : [];
      const separatePanelIndicators = visibleIndicators.filter(
        (i: any) => i && i.separatePanel
      );

      // Calculate total height of indicator panels including headers
      let indicatorPanelsHeight = 0;
      separatePanelIndicators.forEach((indicator: any) => {
        if (!indicator || !indicator.id) return;

        // Get panel height from state or use default
        const panelHeight =
          indicator.id && panelHeights
            ? panelHeights[indicator.id] || 100
            : 100;
        const isCollapsed = collapsedPanels
          ? collapsedPanels[indicator.id] || false
          : false;

        // Add header height (24px) to panel height
        indicatorPanelsHeight += isCollapsed ? 30 : panelHeight + 24;
      });

      // Adjust chart dimensions to make room for indicator panels
      const adjustedChartHeight = chartHeight - indicatorPanelsHeight;

      // Calculate price chart height and volume height based on adjusted chart height
      let priceChartHeight, volumeHeight, volumeTop;

      if (showVolume) {
        // If volume is shown, allocate 80% to price chart and 20% to volume
        priceChartHeight = adjustedChartHeight * 0.8;
        volumeHeight = adjustedChartHeight * 0.2;
        volumeTop = chartTop + priceChartHeight;
      } else {
        // If volume is hidden, allocate 100% to price chart
        priceChartHeight = adjustedChartHeight;
        volumeHeight = 0;
        volumeTop = chartTop + priceChartHeight;
      }

      // Calculate indicator panel positions
      const panelTop = chartTop + priceChartHeight + volumeHeight;

      // Enable crisp edges for better grid and line rendering
      ctx.imageSmoothingEnabled = false;

      // For light mode, don't translate to avoid black lines at edges
      // For dark mode, use small translate for crisp lines
      if (theme === "dark") {
        ctx.translate(0.5, 0.5);
      }

      // 2) Render main chart with virtual data
      ChartMainRenderer.render({
        ctx,
        candleData: virtualData.candles, // Use only visible candles
        visibleRange: visibleRange || { start: 0, end: candleData.length },
        chartWidth,
        priceChartHeight,
        chartTop,
        chartHeight: adjustedChartHeight,
        showGrid: false, // Don't render grid in main renderer
        theme: theme === "dark" ? "dark" : "light",
        chartType,
        isDragging,
        priceScaleWidth,
        timeScaleHeight,
        volumeHeight,
        volumeTop,
        expiryMarkers: [], // Don't render expiry markers here anymore
        expiryMinutes: expiryIntervalMinutes || 5,
        currentTime: Date.now(),
        timeFrame: timeFrame,
        levelOfDetail, // Pass level of detail for adaptive rendering
        virtualViewport: virtualData.viewport, // Pass viewport info
      });

      // 2.5) Render grid separately with candleData and visibleRange
      // CRITICAL FIX: Only recalculate grid every 5 seconds or when dragging/zooming
      const now = performance.now();
      const shouldUpdateGrid =
        isDragging ||
        now - lastGridRenderTimeRef.current > 5000 ||
        !window.chartGridPositions;

      if (showGrid) {
        if (shouldUpdateGrid) {
          lastGridRenderTimeRef.current = now;
          renderGrid(
            ctx,
            chartWidth,
            priceChartHeight,
            volumeHeight,
            chartTop,
            volumeTop,
            theme === "dark",
            theme === "dark"
              ? "rgba(255, 255, 255, 0.07)"
              : "rgba(0, 0, 0, 0.07)",
            candleData,
            visibleRange || { start: 0, end: candleData.length }
          );
        } else {
          // Re-use the existing grid positions but redraw them
          // This prevents the grid from shifting every second
          ctx.beginPath();
          ctx.strokeStyle =
            theme === "dark"
              ? "rgba(255, 255, 255, 0.07)"
              : "rgba(0, 0, 0, 0.07)";
          ctx.lineWidth = 1;

          // Draw horizontal grid lines
          const priceGridCount = Math.min(8, Math.floor(priceChartHeight / 40));
          for (let i = 0; i <= priceGridCount; i++) {
            const y =
              Math.floor(chartTop + (i / priceGridCount) * priceChartHeight) +
              0.5;
            ctx.moveTo(0, y);
            ctx.lineTo(chartWidth, y);
          }

          // Draw vertical grid lines using cached positions
          const gridPositions = window.chartGridPositions || [];
          for (const pos of gridPositions) {
            if (pos.x >= -50 && pos.x <= chartWidth + 50) {
              ctx.moveTo(pos.x, chartTop);
              ctx.lineTo(pos.x, chartTop + priceChartHeight + volumeHeight);
            }
          }

          // Draw all grid lines at once
          ctx.stroke();
        }
      }

      // 3) Render volume if enabled with virtual data
      if (showVolume) {
        ChartVolumeRenderer.render({
          ctx,
          candleData: virtualData.candles, // Use only visible candles
          visibleRange: visibleRange || { start: 0, end: candleData.length },
          chartWidth,
          volumeHeight,
          volumeTop,
          theme,
          isDragging,
          levelOfDetail, // Pass level of detail
          virtualViewport: virtualData.viewport, // Pass viewport info
        });
      }

      // 4) Render overlays (crosshair, price line, etc.) - BUT NOT ORDERS OR EXPIRY MARKERS
      ChartOverlayRenderer.render({
        ctx,
        candleData,
        mousePosition,
        hoverEffect,
        orders: [], // Pass empty array to prevent duplicate rendering
        chartWidth,
        priceChartHeight,
        chartTop,
        theme: theme === "dark" ? "dark" : "light",
        isDragging,
        priceScaleWidth,
        volumeHeight,
        visibleRange: visibleRange || { start: 0, end: candleData.length },
        priceRange: currentPriceRange, // Pass the price range from the main renderer
      });

      // 5) Render indicators AFTER overlays so they're not cleared with virtual data
      ChartIndicatorRenderer.render({
        ctx,
        candleData: virtualData.candles, // Use only visible candles
        indicators: indicators || [],
        visibleRange: visibleRange || { start: 0, end: candleData.length },
        chartWidth,
        priceChartHeight,
        chartTop,
        chartHeight: adjustedChartHeight,
        theme,
        isDragging,
        renderQuality:
          levelOfDetail === "high"
            ? "high"
            : levelOfDetail === "medium"
              ? "medium"
              : "low", // Adaptive quality
        showVolumeProfile,
        priceAlerts: priceAlerts || [],
        volumeHeight,
        volumeTop,
        priceScaleWidth,
        panelTop, // Pass the starting position for indicator panels
        setShowIndicatorPanel,
        setActiveIndicatorId,
        toggleIndicator,
        panelHeights,
        setPanelHeights,
        collapsedPanels,
        setCollapsedPanels,
        isDraggingPanel,
        setIsDraggingPanel,
        levelOfDetail, // Pass level of detail
        virtualViewport: virtualData.viewport, // Pass viewport info
      });

      // 6) Render expiry markers separately - use virtual data for better performance
      const currentExpiryMarkers = expiryMarkersRef.current;
      if (
        currentExpiryMarkers &&
        currentExpiryMarkers.length > 0 &&
        expiryIntervalMinutes > 0
      ) {
        ctx.save();
        renderExpiryMarkers(
          ctx,
          currentExpiryMarkers,
          candleData, // Keep full data for timestamp calculations
          chartWidth,
          priceChartHeight,
          chartTop,
          visibleRange || { start: 0, end: candleData.length },
          Date.now(),
          true // Pass showExpiry parameter explicitly
        );
        ctx.restore();
      }

      // 7) Render position markers if available - use virtual data for better performance
      if (orders && orders.length > 0) {
        renderPositionMarkers(
          ctx,
          adaptOrdersToPositionMarkers(orders),
          candleData, // Keep full data for timestamp calculations
          chartWidth,
          priceChartHeight,
          chartTop,
          visibleRange || { start: 0, end: candleData.length },
          currentPriceRange,
          Date.now()
        );
      }

      // 8) Render price axis AFTER everything else to ensure it covers grid lines
      renderPriceAxis(
        ctx,
        chartWidth,
        priceChartHeight,
        volumeHeight,
        chartTop,
        volumeTop,
        currentPriceRange,
        { min: 0, max: 1000000 }, // Default volume range
        priceScaleWidth,
        timeScaleHeight,
        theme === "dark",
        candleData
      );

      // 9) Render footer with time axis
      renderFooter({
        ctx,
        chartWidth,
        chartHeight: baseChartHeight - timeScaleHeight,
        timeScaleHeight,
        priceScaleWidth,
        theme: theme === "dark" ? "dark" : "light",
        data: candleData,
        visibleRange: visibleRange || { start: 0, end: candleData.length },
        isLoadingOlderData: false,
      });

      // Reset transformations - only if we applied translate
      if (theme === "dark") {
        ctx.translate(-0.5, -0.5);
      }
      ctx.restore();

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    // Start the render loop
    animationFrameRef.current = requestAnimationFrame(renderFrame);

    // Cleanup function
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Cleanup performance managers
      renderManager.cleanup();
      memoryManager.cleanup();
      virtualRenderer.cleanup();
    };
  }, [
    // Include dependencies that actually affect rendering and remove ones that cause unnecessary re-renders
    candleData,
    chartType,
    visibleRange,
    chartDimensions,
    mousePosition,
    priceAlerts,
    indicators,
    showVolumeProfile,
    theme,
    showGrid,
    showVolume,
    panelHeights,
    collapsedPanels,
    isDraggingPanel,
    hoverEffect,
    isDragging,
    orders,
    // REMOVED: expiryMarkers - this changes every second causing constant re-renders
    expiryIntervalMinutes,
    calculateTotalHeight,
    timeFrame,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={chartDimensions?.width || 800}
      height={calculateTotalHeight()}
      style={{
        backgroundColor: theme === "dark" ? "#000000" : "#ffffff",
        border: "none",
        display: "block", // This prevents any default spacing
      }}
    />
  );
};

export default ChartRenderer;
