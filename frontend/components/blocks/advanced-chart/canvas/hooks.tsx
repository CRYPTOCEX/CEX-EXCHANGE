"use client";

import type React from "react";
import { useState, useRef, useCallback, useEffect } from "react";

// Hook for managing touch interactions
export function useTouchInteractions() {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(
    null
  );

  return {
    touchStartX,
    touchStartY,
    lastTouchDistance,
    setTouchStartX,
    setTouchStartY,
    setLastTouchDistance,
  };
}

// Hook for managing rendering state
export function useRenderState() {
  const [hoverEffect, setHoverEffect] = useState<{
    x: number;
    y: number;
    radius: number;
  } | null>(null);
  const [renderQuality, setRenderQuality] = useState<"high" | "low">("high");

  // Use refs for values that shouldn't trigger re-renders
  const isThrottledRef = useRef(false);
  const needsRenderRef = useRef<boolean>(true);
  const lastRenderTimeRef = useRef<number>(0);
  const lastVisibleRangeRef = useRef({
    start: 0,
    end: 100,
    initialized: false,
  });

  // Throttle function that doesn't use state updates
  const throttle = useCallback(
    (callback: () => void) => {
      if (!isThrottledRef.current) {
        isThrottledRef.current = true;

        // Execute the callback
        callback();

        // Reset throttle after a delay
        setTimeout(
          () => {
            isThrottledRef.current = false;
          },
          renderQuality === "high" ? 8 : 16
        );
      }
    },
    [renderQuality]
  );

  // Detect device performance and set render quality
  useEffect(() => {
    // Check if device is high-end by measuring FPS
    let frameCount = 0;
    const startTimestamp = performance.now();
    let testDuration = 0;

    const checkPerformance = (timestamp: number) => {
      frameCount++;
      testDuration = timestamp - startTimestamp;

      if (testDuration >= 1000) {
        // Test for 1 second
        const fps = (frameCount * 1000) / testDuration;
        setRenderQuality(fps >= 50 ? "high" : "low");
        return;
      }

      requestAnimationFrame(checkPerformance);
    };

    requestAnimationFrame(checkPerformance);
  }, []);

  return {
    isThrottled: isThrottledRef.current,
    hoverEffect,
    renderQuality,
    needsRenderRef,
    lastRenderTimeRef,
    lastVisibleRangeRef,
    setHoverEffect,
    throttle,
  };
}

// Hook for managing canvas and offscreen canvas
export function useCanvasSetup(dimensions: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Create an offscreen canvas for double buffering
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      dimensions.width > 0 &&
      dimensions.height > 0
    ) {
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width * (window.devicePixelRatio || 1);
      canvas.height = dimensions.height * (window.devicePixelRatio || 1);
      offscreenCanvasRef.current = canvas;
    }

    return () => {
      offscreenCanvasRef.current = null;
    };
  }, [dimensions.width, dimensions.height]);

  // Add CSS for hardware acceleration
  useEffect(() => {
    // Add a style tag for hardware acceleration
    const style = document.createElement("style");
    style.innerHTML = `
      .chart-container {
        will-change: transform;
      }
      .chart-container.dragging {
        will-change: transform;
        transform: translateZ(0);
      }
      .chart-container canvas {
        transform: translateZ(0);
        backface-visibility: hidden;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return {
    canvasRef,
    offscreenCanvasRef,
    animationFrameIdRef,
  };
}

// Hook to trigger renders when needed
export function useTriggerRender(
  needsRenderRef: React.MutableRefObject<boolean>
) {
  const triggerRender = useCallback(() => {
    needsRenderRef.current = true;
  }, [needsRenderRef]);

  // Add this effect to listen for the chartZoom custom event
  useEffect(() => {
    // Listen for custom zoom events
    const handleChartZoom = () => {
      // Force an immediate render
      needsRenderRef.current = true;
    };

    window.addEventListener("chartZoom", handleChartZoom);

    return () => {
      window.removeEventListener("chartZoom", handleChartZoom);
    };
  }, [needsRenderRef]);

  return triggerRender;
}

// Update the useOlderDataCheck hook to be more conservative about when to fetch
export function useOlderDataCheck(
  candleData: any[],
  visibleRange: { start: number; end: number },
  isLoadingOlderData: boolean,
  hasReachedOldestData: boolean,
  fetchOlderData: () => void
) {
  // Use a ref to track the last checked range to prevent excessive calls
  const lastCheckedRangeRef = useRef({ start: -1, end: -1 });
  // Track if the user is actively scrolling back
  const isScrollingBackRef = useRef(false);
  // Track the last time we fetched older data
  const lastFetchTimeRef = useRef(0);
  // Minimum time between fetches (3 seconds)
  const MIN_FETCH_INTERVAL = 3000;

  useEffect(() => {
    // Detect if user is scrolling back by comparing with previous range
    if (lastCheckedRangeRef.current.start > visibleRange.start) {
      isScrollingBackRef.current = true;
    } else if (lastCheckedRangeRef.current.start < visibleRange.start) {
      // User is scrolling forward
      isScrollingBackRef.current = false;
    }

    // Only check if the visible range has changed significantly
    if (
      Math.abs(lastCheckedRangeRef.current.start - visibleRange.start) > 5 ||
      Math.abs(lastCheckedRangeRef.current.end - visibleRange.end) > 5
    ) {
      // Update the last checked range
      lastCheckedRangeRef.current = { ...visibleRange };

      // Only fetch if:
      // 1. User is scrolling back
      // 2. We're near the beginning of available data (first 20 candles)
      // 3. We're not already loading
      // 4. We haven't reached the oldest data
      // 5. It's been at least MIN_FETCH_INTERVAL since the last fetch
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;

      if (
        isScrollingBackRef.current &&
        visibleRange.start < 20 &&
        !isLoadingOlderData &&
        !hasReachedOldestData &&
        candleData.length > 0 &&
        timeSinceLastFetch > MIN_FETCH_INTERVAL
      ) {
        console.log(
          "Near the beginning of available data, fetching older data..."
        );
        lastFetchTimeRef.current = now;
        fetchOlderData();
      }
    }
  }, [
    visibleRange,
    candleData.length,
    isLoadingOlderData,
    hasReachedOldestData,
    fetchOlderData,
  ]);
}
