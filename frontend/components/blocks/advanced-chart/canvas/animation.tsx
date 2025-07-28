"use client";

import type React from "react";

import { useEffect } from "react";

// Extend window type for warning throttling
declare global {
  interface Window {
    __chartWarnings?: Record<string, number>;
  }
}
import { renderToOffscreenCanvas } from "./renderer";
import { Order } from "@/store/trade/use-binary-store";

// Define types
interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Indicator {
  name: string;
  value: number;
}

type ChartType = "candle" | "line" | "area";

interface PriceAlert {
  price: number;
}

interface MousePosition {
  x: number;
  y: number;
}

// Hook to handle animation and rendering
export function useChartAnimation({
  canvasRef,
  offscreenCanvasRef,
  animationFrameIdRef,
  needsRenderRef,
  lastRenderTimeRef,
  dimensions,
  renderQuality,
  theme,
  visibleRange,
  candleData,
  indicators,
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
  dataReady,
  isMarketSwitching, // Add this parameter
  expiryIntervalMinutes,
  expiryMarkers,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  offscreenCanvasRef: React.RefObject<HTMLCanvasElement>;
  animationFrameIdRef: React.MutableRefObject<number | null>;
  needsRenderRef: React.MutableRefObject<boolean>;
  lastRenderTimeRef: React.MutableRefObject<number>;
  dimensions: { width: number; height: number };
  renderQuality: number | string; // Updated type to allow both number and string
  theme: string;
  visibleRange: { start: number; end: number };
  candleData: CandleData[];
  indicators: Indicator[];
  showGrid: boolean;
  isLoadingOlderData: boolean;
  showVolume: boolean;
  priceScaleWidth: number;
  timeScaleHeight: number;
  chartType: ChartType;
  showVolumeProfile: boolean;
  isDragging: boolean;
  drawingTools: any[];
  priceToY: (price: number) => number;
  yToPrice: (y: number) => number;
  priceAlerts: PriceAlert[];
  mousePosition: MousePosition | null;
  hoverEffect: { x: number; y: number } | null;
  orders: Order[];
  dataReady: boolean;
  isMarketSwitching?: boolean; // Add this type
  expiryIntervalMinutes: number;
  expiryMarkers: any[];
}) {
  // Add a check for dataReady and isMarketSwitching in the animation loop
  useEffect(() => {
    if (
      !canvasRef.current ||
      !offscreenCanvasRef.current ||
      !dataReady ||
      isMarketSwitching
    ) {
      // Clean up any existing animation frame when conditions aren't met
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    // Early exit if data is invalid - don't even set up the animation loop
    if (
      candleData.length === 0 ||
      dimensions.width <= 0 ||
      dimensions.height <= 0
    ) {
      // Throttle warning messages to prevent spam (max once per 5 seconds)
      const now = Date.now();
      const lastWarningKey = `chart-warning-${dimensions.width}-${dimensions.height}-${candleData.length}`;
      if (!window.__chartWarnings) {
        window.__chartWarnings = {};
      }
      if (!window.__chartWarnings[lastWarningKey] || now - window.__chartWarnings[lastWarningKey] > 5000) {
        console.warn("Skipping chart render due to invalid data or dimensions", {
          candleDataLength: candleData.length,
          dimensions: dimensions,
          dataReady,
          isMarketSwitching
        });
        window.__chartWarnings[lastWarningKey] = now;
      }
      
      // Clean up any existing animation frame
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    // Track if component is mounted to prevent memory leaks
    let isMounted = true;
    // Fix: Convert renderQuality to string for comparison or use a type guard
    const FRAME_RATE =
      renderQuality === "high" || renderQuality === 1 ? 60 : 30;
    const FRAME_INTERVAL = 1000 / FRAME_RATE;

    const renderChartCanvas = () => {
      const canvas = canvasRef.current;
      const offscreen = offscreenCanvasRef.current;
      if (!canvas || !offscreen) return;

      // Additional safety check - if data becomes invalid during animation, exit early
      if (candleData.length === 0 || dimensions.width <= 0 || dimensions.height <= 0) {
        return;
      }

      // Get current dimensions to avoid stale closure
      const currentDimensions = {
        width: canvas.offsetWidth || dimensions.width,
        height: canvas.offsetHeight || dimensions.height,
      };

      // Render to offscreen canvas first
      const offscreenCanvas = renderToOffscreenCanvas({
        offscreenCanvas: offscreen,
        dimensions: currentDimensions,
        renderQuality,
        theme,
        visibleRange,
        candleData,
        indicators,
        chartWidth: currentDimensions.width - priceScaleWidth,
        chartHeight: currentDimensions.height - timeScaleHeight,
        priceChartHeight: showVolume
          ? (currentDimensions.height - timeScaleHeight) * 0.8
          : currentDimensions.height - timeScaleHeight,
        volumeHeight: showVolume
          ? (currentDimensions.height - timeScaleHeight) * 0.2
          : 0,
        chartTop: 0,
        volumeTop: showVolume ? (currentDimensions.height - timeScaleHeight) * 0.8 : 0,
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
        expiryMinutes: expiryIntervalMinutes,
      });

      if (!offscreenCanvas) return;

      // Check if offscreen canvas has valid dimensions before drawing
      if (offscreenCanvas.width === 0 || offscreenCanvas.height === 0) {
        // Throttle warning messages to prevent spam (max once per 5 seconds)
        const now = Date.now();
        const warningKey = `offscreen-warning-${offscreenCanvas.width}-${offscreenCanvas.height}`;
        if (!window.__chartWarnings) {
          window.__chartWarnings = {};
        }
        if (!window.__chartWarnings[warningKey] || now - window.__chartWarnings[warningKey] > 5000) {
          console.warn("Offscreen canvas has invalid dimensions, skipping render", {
            offscreenDimensions: { width: offscreenCanvas.width, height: offscreenCanvas.height },
            currentDimensions
          });
          window.__chartWarnings[warningKey] = now;
        }
        return;
      }

      // Then copy to visible canvas (double buffering)
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      // Set canvas dimensions with higher resolution for better quality
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = currentDimensions.width * pixelRatio;
      canvas.height = currentDimensions.height * pixelRatio;
      canvas.style.width = `${currentDimensions.width}px`;
      canvas.style.height = `${currentDimensions.height}px`;

      // Draw the offscreen canvas to the visible canvas
      ctx.drawImage(offscreenCanvas, 0, 0);
    };

    const animate = (timestamp: number) => {
      if (!isMounted) return;

      // Only render if needed or if enough time has passed since last render
      const shouldRender =
        needsRenderRef.current ||
        timestamp - lastRenderTimeRef.current >= FRAME_INTERVAL;

      if (shouldRender) {
        renderChartCanvas();
        lastRenderTimeRef.current = timestamp;
        needsRenderRef.current = false;
      }

      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationFrameIdRef.current = requestAnimationFrame(animate);

    // Set up event listeners to trigger renders when needed
    const triggerRender = () => {
      needsRenderRef.current = true;
    };

    // These events should trigger a re-render
    window.addEventListener("resize", triggerRender);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", triggerRender);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      
      // Clean up old warning entries to prevent memory leaks
      if (window.__chartWarnings) {
        const now = Date.now();
        Object.keys(window.__chartWarnings).forEach(key => {
          if (now - window.__chartWarnings![key] > 60000) { // Remove entries older than 1 minute
            delete window.__chartWarnings![key];
          }
        });
      }
    };
  }, [
    // Only include stable dependencies that should trigger animation restart
    canvasRef,
    offscreenCanvasRef,
    dimensions.width,
    dimensions.height,
    renderQuality,
    theme,
    dataReady,
    isMarketSwitching,
    chartType,
    showVolume,
    showGrid,
    showVolumeProfile,
    priceScaleWidth,
    timeScaleHeight,
    expiryIntervalMinutes,
    // Remove frequently changing dependencies that don't require animation restart:
    // - visibleRange (changes during pan/zoom)
    // - candleData (changes with new data)
    // - indicators (changes with updates)
    // - mousePosition (changes constantly)
    // - hoverEffect (changes constantly)
    // - orders (changes with new orders)
    // - priceToY/yToPrice (functions that change on render)
    // - priceAlerts (changes with alerts)
    // - drawingTools (changes with tools)
    // - isDragging (changes during drag)
    // - isLoadingOlderData (changes during loading)
  ]);
}
