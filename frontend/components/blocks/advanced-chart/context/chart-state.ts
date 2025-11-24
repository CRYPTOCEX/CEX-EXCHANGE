"use client";

import { useCallback } from "react";

import { useState, useRef, useEffect } from "react";
import type { ChartType, MousePosition, PriceAlert } from "../types";

// Hook to manage the chart's state
export function useChartState(darkMode: boolean) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInteractingRef = useRef(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recalcTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to track previous theme to prevent unnecessary updates
  const prevThemeRef = useRef(darkMode);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Chart display state
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [mousePosition, setMousePosition] = useState<MousePosition | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    candle: any;
  } | null>(null);
  const [showVolume, setShowVolume] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [priceScaleWidth, setPriceScaleWidth] = useState(60);
  const [timeScaleHeight, setTimeScaleHeight] = useState(24);
  const [chartReady, setChartReady] = useState(false);

  // Memoize theme to prevent unnecessary rerenders
  const [theme, setTheme] = useState(darkMode ? "dark" : "light");

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Chart features state
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(false);
  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [showPatternRecognition, setShowPatternRecognition] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);

  // Add these to the state
  const [wsStatus, setWsStatus] = useState<
    "connected" | "connecting" | "disconnected" | "error"
  >("disconnected");
  const [apiStatus, setApiStatus] = useState<
    "connected" | "connecting" | "disconnected" | "error"
  >("disconnected");
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);

  // Track if we've already set the theme
  const hasSetThemeRef = useRef(false);

  // Update theme only when darkMode prop changes and only once
  useEffect(() => {
    if (prevThemeRef.current !== darkMode && !hasSetThemeRef.current) {
      prevThemeRef.current = darkMode;
      setTheme(darkMode ? "dark" : "light");
      hasSetThemeRef.current = true;
    }
  }, [darkMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Add a global style to prevent text selection and add theme transition
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
    .chart-container * {
      user-select: none !important;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .chart-container canvas {
      animation: fadeIn 0.3s ease-in-out;
    }
    
    .theme-transition {
      transition: background-color 0.3s ease-in-out;
    }
    
    .chart-container {
      transition: background-color 0.3s ease-in-out;
    }
  `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Get container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current && isMountedRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Ensure dimensions are never zero
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);

        if (width !== dimensions.width || height !== dimensions.height) {
          setDimensions({ width, height });
        }
      }
    };

    updateDimensions();

    // Debounced resize handler
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          updateDimensions();
        }
      }, 100);
    };

    window.addEventListener("resize", handleResize);

    // Add a resize observer for more responsive updates
    const resizeObserver = new ResizeObserver((entries) => {
      if (!isMountedRef.current) return;

      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Force a redraw after a short delay to ensure proper sizing
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        updateDimensions();
        setChartReady(true);
      }
    }, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, []);

  // Optimize the interval check to run less frequently
  useEffect(() => {
    // Update dimensions on a regular interval to ensure chart fills available space
    // But only check every 2 seconds instead of every second
    const intervalId = setInterval(() => {
      if (containerRef.current && isMountedRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (
          Math.abs(width - dimensions.width) > 5 ||
          Math.abs(height - dimensions.height) > 5
        ) {
          setDimensions({ width, height });
        }
      }
    }, 2000); // Changed from 1000 to 2000ms

    return () => clearInterval(intervalId);
  }, [dimensions]);

  // Toggle chart features
  const toggleVolume = useCallback(() => {
    if (isMountedRef.current) {
      setShowVolume((prev) => !prev);
    }
  }, []);

  const toggleGrid = useCallback(() => {
    if (isMountedRef.current) {
      setShowGrid((prev) => !prev);
    }
  }, []);

  const toggleVolumeProfile = useCallback(() => {
    if (isMountedRef.current) {
      setShowVolumeProfile((prev) => !prev);
    }
  }, []);

  const togglePatternRecognition = useCallback(() => {
    if (isMountedRef.current) {
      setShowPatternRecognition((prev) => !prev);
    }
  }, []);

  // Memoize the toggleTheme function to prevent unnecessary rerenders
  const toggleTheme = useCallback(() => {
    if (isMountedRef.current) {
      setTheme((prev) => {
        const newTheme = prev === "dark" ? "light" : "dark";
        return newTheme;
      });
    }
  }, []);

  // Price alerts
  const addPriceAlert = useCallback((alert: Omit<PriceAlert, "id">) => {
    if (isMountedRef.current) {
      setPriceAlerts((prev) => [
        ...prev,
        { ...alert, id: Math.random().toString(36).substring(2, 9) },
      ]);
    }
  }, []);

  const removePriceAlert = useCallback((id: string) => {
    if (isMountedRef.current) {
      setPriceAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }
  }, []);

  // Custom setVisibleRange that marks interaction
  const setVisibleRangeWithInteraction = useCallback(
    (
      range:
        | { start: number; end: number }
        | ((prev: { start: number; end: number }) => {
            start: number;
            end: number;
          })
    ) => {
      if (isMountedRef.current) {
        isInteractingRef.current = true;
        setVisibleRange(range);
      }
    },
    []
  );

  return {
    // Refs
    containerRef,
    wsRef,
    reconnectTimeoutRef,
    isInteractingRef,
    resizeTimeoutRef,
    recalcTimeoutRef,
    isMountedRef,

    // State
    dimensions,
    mousePosition,
    isDragging,
    dragStart,
    visibleRange,
    tooltip,
    showVolume,
    showGrid,
    priceScaleWidth,
    timeScaleHeight,
    chartReady,
    theme,
    chartType,
    showIndicatorPanel,
    showDrawingToolbar,
    showVolumeProfile,
    showPatternRecognition,
    priceAlerts,
    showSettingsPanel,
    wsStatus,
    apiStatus,
    lastError,
    reconnectAttempt,
    reconnectCount,

    // Setters
    setDimensions,
    setMousePosition,
    setIsDragging,
    setDragStart,
    setVisibleRange,
    setTooltip,
    setShowVolume,
    setShowGrid,
    setPriceScaleWidth,
    setTimeScaleHeight,
    setChartReady,
    setTheme,
    setChartType,
    setShowIndicatorPanel,
    setShowDrawingToolbar,
    setShowVolumeProfile,
    setShowPatternRecognition,
    setPriceAlerts,
    setShowSettingsPanel,
    setWsStatus,
    setApiStatus,
    setLastError,
    setReconnectAttempt,
    setReconnectCount,

    // Actions
    toggleVolume,
    toggleGrid,
    toggleVolumeProfile,
    togglePatternRecognition,
    toggleTheme,
    addPriceAlert,
    removePriceAlert,
    setVisibleRangeWithInteraction,
  };
}
