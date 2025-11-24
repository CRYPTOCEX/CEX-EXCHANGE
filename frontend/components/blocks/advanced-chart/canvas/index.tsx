"use client";

import type React from "react";
import { useEffect, useState, useRef, useCallback, memo } from "react";
import { useChart } from "../context/chart-context";
import {
  useCanvasSetup,
  useRenderState,
  useTouchInteractions,
  useTriggerRender,
  useOlderDataCheck,
} from "./hooks";
import { useMouseEvents } from "./events/mouse-events";
import { useTouchEvents } from "./events/touch-events";
import { useIndicatorPanelInteractions } from "./events/indicator-panel-events";
import { setupEventListeners } from "./events/setup-events";
import { useChartAnimation } from "./animation";
import Footer from "./render/footer";
import { ChartToolbar } from "./render/toolbar/chart-toolbar";
import { IndicatorPanel } from "./render/toolbar/indicator-panel";
import { SettingsPanel } from "./render/toolbar/settings-panel";
import { Order } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import { formatPrice } from "../utils";

// Define the MousePosition type to include candle
interface MousePosition {
  x: number;
  y: number;
  candle?: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    timestamp?: number;
  };
}

// Helper function to check if a point is in the main chart area
function isInMainChartArea(
  x: number,
  y: number,
  chartTop: number,
  chartHeight: number,
  chartWidth: number,
  priceScaleWidth: number
): boolean {
  return (
    x >= 0 &&
    x <= chartWidth - priceScaleWidth &&
    y >= chartTop &&
    y <= chartTop + chartHeight
  );
}

// Add positions to the props interface
interface ChartCanvasProps {
  positions?: any[]; // Add this line
}

// Create a component that doesn't rerender when theme changes
const ChartCanvasInner: React.FC<ChartCanvasProps> = ({ positions }) => {
  const t = useTranslations("components/blocks/advanced-chart/canvas/index");
  const context = useChart();
  const {
    candleData,
    dimensions,
    visibleRange,
    chartType,
    indicators,
    drawingTools,
    orders = [],
    mousePosition,
    showVolume,
    showGrid,
    priceScaleWidth,
    timeScaleHeight,
    darkMode,
    isDragging,
    activeDrawingTool,
    calculateSeparatePanelsHeight,
    priceToY,
    yToPrice,
    setTooltip,
    setMousePosition,
    setIsDragging,
    setDragStart,
    isDrawing,
    currentDrawing,
    dragStart,
    setVisibleRange,
    showVolumeProfile,
    priceAlerts,
    showPatternRecognition,
    theme,
    fetchOlderData,
    shouldFetchOlderData,
    isLoadingOlderData,
    hasReachedOldestData,
    timeFrame,
    expiryIntervalMinutes,
    setShowIndicatorPanel,
    setActiveIndicatorId,
    toggleIndicator,
    panelHeights,
    setPanelHeights,
    collapsedPanels,
    setCollapsedPanels,
    isDraggingPanel,
    setIsDraggingPanel,
    setShowTimeframeSelector,
    setShowSettingsPanel,
    symbol,
    dataReady,
    showIndicatorPanel,
    showSettingsPanel,
    isMarketSwitching,
    loading,
    isChangingTimeframe,
  } = context;

  // Access chartDimensions with type assertion
  const chartDimensions = (context as any).chartDimensions;

  // Use a ref to track the last mouse move time to throttle events
  const lastMouseMoveRef = useRef(0);

  // Use a ref to track the last touch event time to throttle events
  const lastTouchMoveRef = useRef(0);

  // Add state for current time
  const [currentTime, setCurrentTime] = useState(new Date());

  // Use a ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Add a ref to track if we've already set up the canvas
  const hasSetupCanvasRef = useRef(false);

  // Add this near the other useRef declarations
  const lastMousePositionRef = useRef({ x: 0, y: 0 });

  // Add state for timeframe selector visibility
  const [showTimeframeSelector, setShowTimeframeSelectorState] =
    useState(false);

  // Add a ref for the wheel event handler - initialize with null
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMountedRef.current) {
        setCurrentTime(new Date());
      }
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Use our custom hooks
  const { canvasRef, offscreenCanvasRef, animationFrameIdRef } =
    useCanvasSetup(dimensions);
  const {
    isThrottled,
    hoverEffect,
    renderQuality,
    needsRenderRef,
    lastRenderTimeRef,
    lastVisibleRangeRef,
    setHoverEffect,
    throttle,
  } = useRenderState();
  const {
    touchStartX,
    touchStartY,
    lastTouchDistance,
    setTouchStartX,
    setTouchStartY,
    setLastTouchDistance,
  } = useTouchInteractions();

  // Get the trigger render function
  const triggerRender = useTriggerRender(needsRenderRef);

  // Check if we need to load older data
  useOlderDataCheck(
    candleData,
    visibleRange,
    isLoadingOlderData,
    hasReachedOldestData,
    fetchOlderData
  );

  // Calculate the main chart area dimensions
  const chartTop = 0; // Start from the top of the canvas

  // Safely calculate priceChartHeight using calculateSeparatePanelsHeight
  const separatePanelsHeight =
    typeof calculateSeparatePanelsHeight === "function"
      ? calculateSeparatePanelsHeight()
      : 0;

  const priceChartHeight =
    dimensions.height - timeScaleHeight - separatePanelsHeight;

  // Set up mouse event handlers
  const {
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
  } = useMouseEvents({
    mousePosition,
    isDrawing,
    currentDrawing,
    isDragging,
    dragStart,
    dimensions,
    visibleRange,
    candleData,
    setVisibleRange,
    setDragStart,
    setMousePosition,
    setIsDragging,
    isThrottled,
    triggerRender,
    priceScaleWidth,
    throttle,
    setHoverEffect,
    chartTop,
    priceChartHeight,
  });

  // Touch events are now handled by setupEventListeners in useEffect
  // Commenting out this hook to avoid conflicts with canvas event listeners
  // const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchEvents({
  //   setTouchStartX,
  //   setTouchStartY,
  //   setLastTouchDistance,
  //   touchStartX,
  //   touchStartY,
  //   lastTouchDistance,
  //   setDragStart,
  //   setIsDragging,
  //   dimensions,
  //   visibleRange,
  //   candleData,
  //   setVisibleRange,
  //   triggerRender,
  //   priceScaleWidth,
  //   chartTop,
  //   priceChartHeight,
  // });

  // Placeholder touch handlers (events are handled by setupEventListeners)
  const handleTouchStart = () => {};
  const handleTouchMove = () => {};
  const handleTouchEnd = () => {};

  // Set up indicator panel interactions with proper null checks
  const {
    handleIndicatorPanelClick,
    handleIndicatorPanelMouseMove,
    handleIndicatorPanelMouseUp,
  } = useIndicatorPanelInteractions({
    indicators: indicators || [], // Ensure indicators is always an array
    dimensions,
    visibleRange,
    candleData,
    showVolume,
    priceChartHeight,
    chartTop,
    priceScaleWidth,
    panelHeights,
    setPanelHeights,
    collapsedPanels,
    setCollapsedPanels,
    isDraggingPanel,
    setIsDraggingPanel,
    setShowIndicatorPanel,
    setActiveIndicatorId,
    toggleIndicator,
    theme,
  });

  // Determine if chart should render (declare before useChartAnimation)
  const shouldRenderChart = dataReady && !isMarketSwitching && candleData.length > 0 && dimensions.width > 0 && dimensions.height > 0;

  // Set up animation only when chart should render
  useChartAnimation({
    canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
    offscreenCanvasRef:
      offscreenCanvasRef as React.RefObject<HTMLCanvasElement>,
    animationFrameIdRef,
    needsRenderRef,
    lastRenderTimeRef,
    dimensions,
    renderQuality,
    theme,
    visibleRange,
    candleData,
    indicators: indicators as any[], // Type assertion for indicators
    showGrid,
    isLoadingOlderData,
    showVolume,
    priceScaleWidth,
    timeScaleHeight,
    chartType: chartType as any, // Type assertion for chartType
    showVolumeProfile,
    isDragging,
    drawingTools,
    priceToY,
    yToPrice,
    priceAlerts,
    mousePosition,
    hoverEffect,
    orders,
    dataReady: shouldRenderChart, // Use shouldRenderChart instead of dataReady
    isMarketSwitching,
    expiryIntervalMinutes,
    expiryMarkers: [],
  });

  // Set cursor style for main chart area
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;

      // Add a mousemove listener just for cursor style
      const handleCursorStyle = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if in main chart area
        if (
          isInMainChartArea(
            x,
            y,
            chartTop,
            priceChartHeight,
            dimensions.width,
            priceScaleWidth
          )
        ) {
          canvas.style.cursor = isDragging ? "grabbing" : "grab";
        } else {
          canvas.style.cursor = "default";
        }
      };

      canvas.addEventListener("mousemove", handleCursorStyle);

      return () => {
        canvas.removeEventListener("mousemove", handleCursorStyle);
      };
    }
  }, [dimensions, isDragging, chartTop, priceChartHeight, priceScaleWidth]);

  // Set up advanced event listeners with proper touch handling
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // Create chart object with all necessary properties for setupEventListeners
    const chartProps = {
      setMousePosition,
      setIsDragging,
      setDragStart,
      visibleRange,
      setVisibleRange,
      candleData,
      dimensions,
      priceScaleWidth,
      chartTop,
      priceChartHeight,
      shouldFetchOlderData,
      fetchOlderData,
      isDragging,
      dragStart,
      needsRenderRef,
    };

    // Set up all event listeners with proper passive handling
    const cleanup = setupEventListeners(canvas, chartProps);

    return cleanup;
  }, [
    // Key dependencies that require re-setup of event listeners
    dimensions.width,
    dimensions.height,
    priceScaleWidth,
    chartTop,
    priceChartHeight,
  ]);

  // Initialize chart with 30% future space but allow dragging up to 75%
  useEffect(() => {
    if (candleData.length > 0 && !lastVisibleRangeRef.current.initialized) {
      // Calculate a better initial zoom level based on device width
      // For smaller screens, show fewer candles to make them more visible
      const screenWidth =
        typeof window !== "undefined" ? window.innerWidth : 1200;

      // Adjust visible candle count based on screen size
      let visibleCount;
      if (screenWidth <= 480) {
        // Mobile
        visibleCount = Math.min(30, candleData.length);
      } else if (screenWidth <= 768) {
        // Tablet
        visibleCount = Math.min(50, candleData.length);
      } else {
        // Desktop
        visibleCount = Math.min(70, candleData.length);
      }

      // Set initial visible range to show candles in the left 70% of the chart
      // and leave the right 30% empty for future
      const futureSpace = visibleCount * 0.43; // 30% of the visible area (0.3/0.7 = 0.43)
      const end = candleData.length + futureSpace;
      const start = end - visibleCount - futureSpace;

      setVisibleRange({ start, end });
      lastVisibleRangeRef.current.initialized = true;
    }
  }, [candleData.length, setVisibleRange, lastVisibleRangeRef]);

  // Initialize chart with consistent positioning based on timeframe
  useEffect(() => {
    if (
      candleData.length > 0 &&
      (!lastVisibleRangeRef.current.initialized || isChangingTimeframe)
    ) {
      // Calculate timeframe-specific visible count
      const getTimeframeVisibleCount = (tf: string, screenWidth: number) => {
        const baseCount =
          screenWidth <= 480 ? 30 : screenWidth <= 768 ? 50 : 70;

        // Adjust based on timeframe - higher timeframes show more candles
        const timeframeMultipliers: Record<string, number> = {
          "1m": 1.0,
          "3m": 0.9,
          "5m": 0.8,
          "15m": 0.7,
          "30m": 0.6,
          "1h": 0.6,
          "2h": 0.5,
          "4h": 0.4,
          "6h": 0.4,
          "8h": 0.4,
          "12h": 0.3,
          "1d": 0.4,
          "3d": 0.3,
          "1w": 0.2,
          "1M": 0.2,
        };

        const multiplier = timeframeMultipliers[tf] || 0.7;
        return Math.min(Math.floor(baseCount * multiplier), candleData.length);
      };

      const screenWidth =
        typeof window !== "undefined" ? window.innerWidth : 1200;
      const visibleCount = getTimeframeVisibleCount(timeFrame, screenWidth);

      // Set consistent positioning - always show latest data with 20% future space
      const futureSpace = Math.floor(visibleCount * 0.2);
      const end = candleData.length + futureSpace;
      const start = Math.max(0, candleData.length - visibleCount + futureSpace);

      setVisibleRange({ start, end });
      lastVisibleRangeRef.current.initialized = true;

      // Only log in development mode to prevent production spam
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Set visible range for ${timeFrame}:`, {
          start,
          end,
          visibleCount,
          dataLength: candleData.length,
        });
      }
    }
  }, [
    candleData.length,
    timeFrame,
    isChangingTimeframe,
    setVisibleRange,
    lastVisibleRangeRef,
  ]);

  // Update the useEffect hook that handles canvas rendering to ensure proper dimensions:
  useEffect(() => {
    if (!canvasRef.current || !chartDimensions || hasSetupCanvasRef.current)
      return;

    hasSetupCanvasRef.current = true;

    // Set canvas dimensions with proper scaling
    const canvas = canvasRef.current;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = chartDimensions.width * pixelRatio;
    canvas.height = chartDimensions.height * pixelRatio;

    // Get the rendering context
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale the context to account for the device pixel ratio
    ctx.scale(pixelRatio, pixelRatio);

    // Clear the canvas
    ctx.clearRect(0, 0, chartDimensions.width, chartDimensions.height);

    // Set the canvas style dimensions to match the container
    canvas.style.width = `${chartDimensions.width}px`;
    canvas.style.height = `${chartDimensions.height}px`;

    // Ensure the canvas is properly aligned to pixel boundaries
    canvas.style.transform = "translate3d(0, 0, 0)";
  }, [chartDimensions, canvasRef]);

  // Add this helper function with proper typing
  const throttleTouchEvent = (
    callback: (event: React.TouchEvent<HTMLCanvasElement>) => void,
    event: React.TouchEvent<HTMLCanvasElement>
  ) => {
    // Prevent processing touch moves when switching markets to avoid state updates
    if (isMarketSwitching) return;

    // More aggressive throttling for touch events
    const now = Date.now();
    if (now - lastTouchMoveRef.current < 24) {
      // Increased from 16ms to 24ms for better performance
      event.preventDefault(); // Still prevent default to stop scrolling
      return;
    }
    lastTouchMoveRef.current = now;

    callback(event);
  };

  // Create a throttled mouse move handler to prevent too many state updates
  const throttledMouseMoveHandler = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Prevent processing mouse moves when switching markets to avoid state updates
      if (isMarketSwitching) return;

      // Throttle mouse move events to prevent excessive state updates
      const now = Date.now();
      if (now - lastMouseMoveRef.current < 16) {
        // Limit to ~60fps
        return;
      }
      lastMouseMoveRef.current = now;

      // Get mouse coordinates
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Only process if position has changed significantly
      const lastPos = mousePosition || { x: 0, y: 0 };
      if (
        !mousePosition ||
        Math.abs(lastPos.x - x) > 2 ||
        Math.abs(lastPos.y - y) > 2
      ) {
        // Call the handlers but don't update state directly here
        handleMouseMove(e);

        // Only call panel mouse move if we're actually resizing a panel
        if (isDraggingPanel && Object.values(isDraggingPanel).some(Boolean)) {
          handleIndicatorPanelMouseMove(e);
        }
      }
    },
    [
      mousePosition,
      isMarketSwitching,
      handleMouseMove,
      isDraggingPanel,
      handleIndicatorPanelMouseMove,
    ]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Cancel any animation frames
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  // Set up non-passive wheel event listener
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // Create a wheel event handler that can be removed later
    wheelHandlerRef.current = (e: WheelEvent) => {
      e.preventDefault();

      // Convert to a React-like event object
      const syntheticEvent = {
        currentTarget: canvas,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        nativeEvent: e,
        clientX: e.clientX,
        clientY: e.clientY,
        deltaY: e.deltaY,
        deltaMode: e.deltaMode,
      } as unknown as React.WheelEvent<HTMLCanvasElement>;

      handleWheel(syntheticEvent);
    };

    // Add the wheel event listener with passive: false
    if (wheelHandlerRef.current) {
      canvas.addEventListener("wheel", wheelHandlerRef.current, {
        passive: false,
      });
    }

    // Clean up
    return () => {
      if (wheelHandlerRef.current) {
        canvas.removeEventListener("wheel", wheelHandlerRef.current);
      }
    };
  }, [handleWheel]);

  // Determine the loading state and message
  const isLoading = loading || isMarketSwitching || isChangingTimeframe;
  const isEmpty = !isLoading && dataReady && candleData.length === 0;
  const getLoadingMessage = () => {
    if (isMarketSwitching) {
      return "Switching Market";
    } else if (isChangingTimeframe) {
      return "Changing Timeframe";
    } else {
      return "Loading Chart";
    }
  };

  const getLoadingSubMessage = () => {
    if (isMarketSwitching) {
      return `Loading ${symbol} data...`;
    } else if (isChangingTimeframe) {
      return `Switching to ${timeFrame} interval...`;
    } else if (candleData.length === 0) {
      return "Fetching historical data...";
    } else {
      return "Updating chart data...";
    }
  };

  // Update the return statement to use the floating toolbar
  return (
    <div className="chart-container">
      <canvas
        ref={canvasRef}
        className="chart-canvas"
        onMouseMove={throttledMouseMoveHandler}
        onMouseDown={(e) => {
          // First check if we're interacting with an indicator panel
          if (!handleIndicatorPanelClick(e)) {
            // If not, handle regular chart interactions
            handleMouseDown(e);
          }
        }}
        onMouseUp={(e) => {
          handleMouseUp(e);
          handleIndicatorPanelMouseUp();
        }}
        onMouseLeave={handleMouseLeave}
        // Touch events are handled by setupEventListeners with proper passive: false
        // Removing React touch handlers to avoid conflicts
        style={{
          backgroundColor: theme === "dark" ? "#000000" : "#ffffff",
          imageRendering: theme === "dark" ? "auto" : "crisp-edges",
        }}
        onClick={handleIndicatorPanelClick}
      />

      {/* TradingView-style Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-900/90 flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-4">
            {/* Animated Chart Icon */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-zinc-800 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-zinc-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>

            {/* Loading Text */}
            <div className="text-center">
              <div className="text-zinc-100 text-lg font-medium mb-1">
                {getLoadingMessage()}
              </div>
              <div className="text-zinc-400 text-sm">
                {getLoadingSubMessage()}
              </div>
            </div>

            {/* Progress Dots */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse"></div>
              <div
                className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State Overlay */}
      {isEmpty && (
        <div className="absolute inset-0 bg-zinc-900/50 flex items-center justify-center z-40">
          <div className="flex flex-col items-center space-y-4">
            {/* Chart Icon */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-zinc-700 rounded-lg flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>

                         {/* Empty State Text */}
             <div className="text-center">
               <div className="text-zinc-100 text-lg font-medium mb-1">
                 {t("no_chart_data_available")}
               </div>
               <div className="text-zinc-400 text-sm">
                 {t("no_trading_data_available")}
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Add subtle blur shade at the top of the chart for depth */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "96px",
          background:
            "linear-gradient(to bottom, rgba(19, 23, 34, 0.8) 0%, rgba(19, 23, 34, 0.4) 50%, rgba(19, 23, 34, 0) 100%)",
          backdropFilter: "blur(1.5px)",
          zIndex: -1, // Ensure it's below all chart elements including expiry markers
        }}
      />

      {/* Floating Chart Toolbar */}
      <ChartToolbar
        symbol={symbol}
        onTimeframeClick={() =>
          setShowTimeframeSelectorState(!showTimeframeSelector)
        }
        onIndicatorsClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
        onSettingsClick={() => setShowSettingsPanel(!showSettingsPanel)}
      />

      {/* Candle details tooltip when hovering */}
      {mousePosition && candleData.length > 0 && (
        <div
          className="absolute pointer-events-none bg-[#1A1D29] border border-gray-800 rounded p-2 text-xs"
          style={{
            left: mousePosition.x + 20,
            top: mousePosition.y + 20,
            display: (mousePosition as MousePosition).candle ? "block" : "none",
          }}
        >
          {(mousePosition as MousePosition).candle && (
            <>
              <div className="flex justify-between gap-4">
                <span>{t("open")}</span>
                <span>
                  {formatPrice((mousePosition as MousePosition).candle?.open || 0)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("high")}</span>
                <span>
                  {formatPrice((mousePosition as MousePosition).candle?.high || 0)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("low")}</span>
                <span>
                  {formatPrice((mousePosition as MousePosition).candle?.low || 0)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("close")}</span>
                <span>
                  {formatPrice((mousePosition as MousePosition).candle?.close || 0)}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Indicator Panel */}
      {showIndicatorPanel && (
        <div className="absolute left-4 z-20">
          <IndicatorPanel />
        </div>
      )}

      {/* Settings Panel */}
      {showSettingsPanel && (
        <div className="absolute left-4 z-20">
          <SettingsPanel />
        </div>
      )}

      {/* Footer component */}
      <div className="absolute bottom-0 left-0 right-0 h-[30px] pointer-events-none">
        <Footer />
      </div>
    </div>
  );
};

// Use React.memo to prevent unnecessary rerenders
const ChartCanvas = memo(ChartCanvasInner, () => true);

// Add default export as well for backward compatibility
export default ChartCanvas;
