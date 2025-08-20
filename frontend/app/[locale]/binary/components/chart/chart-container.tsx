"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import type { Symbol, TimeFrame, Order } from "@/store/trade/use-binary-store";
import ChartSwitcher from "@/components/blocks/chart-switcher";
import { useTranslations } from "next-intl";

interface ChartContainerProps {
  symbol: Symbol;
  timeFrame?: TimeFrame;
  orders?: Order[];
  expiryMinutes?: number;
  showExpiry?: boolean;
  timeframeDurations?: Array<{ value: TimeFrame; label: string }>;
  onChartContextReady?: (context: any) => void;
  positions?: any[];
  isMarketSwitching?: boolean;
  isMobile?: boolean;
  onPriceUpdate?: (price: number) => void;
}

export function ChartContainer({
  symbol,
  timeFrame = "1m",
  orders = [],
  expiryMinutes = 5,
  showExpiry = true,
  timeframeDurations,
  onChartContextReady,
  positions = [],
  isMarketSwitching = false,
  isMobile = false,
  onPriceUpdate,
}: ChartContainerProps) {
  const t = useTranslations("binary/components/chart/chart-container");
  
  // State management with proper initialization
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [isChartMounted, setIsChartMounted] = useState(false);

  // Refs for cleanup and optimization
  const isMountedRef = useRef(true);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chartContextRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Memoized chart props to prevent unnecessary re-renders
  const chartProps = useMemo(() => ({
    symbol,
    timeFrame,
    orders: orders.filter((order) => order.symbol === symbol),
    expiryMinutes,
    showExpiry,
    timeframeDurations,
    positions,
    isMarketSwitching,
    marketType: "spot" as const,
  }), [symbol, timeFrame, orders, expiryMinutes, showExpiry, timeframeDurations, positions, isMarketSwitching]);

  // Memoized loading state check
  const shouldShowLoading = useMemo(() => {
    return !symbol || symbol === "" || isMarketSwitching;
  }, [symbol, isMarketSwitching]);

  // Optimized chart context handler with proper cleanup
  const handleChartContextReady = useCallback((context: any) => {
    if (!isMountedRef.current) return;

    chartContextRef.current = context;

    // Extract price if available
    if (context && typeof context.currentPrice === "number" && context.currentPrice > 0) {
      setCurrentPrice(context.currentPrice);
      
      // Notify parent component of price update
      if (onPriceUpdate) {
        onPriceUpdate(context.currentPrice);
      }
    }

    // Call the original callback if provided
    if (onChartContextReady) {
      onChartContextReady(context);
    }
  }, [onPriceUpdate, onChartContextReady]);

  // Optimized resize handler with debouncing
  const handleResize = useCallback(() => {
    if (!isMountedRef.current) return;

    // Clear existing timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // Debounce resize events
    resizeTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && isLayoutReady) {
        // Dispatch resize events for chart
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));
      }
    }, 100);
  }, [isLayoutReady]);

  // Component lifecycle management
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      
      // Clean up all timeouts
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }

      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }

      // Clean up resize observer
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      // Clean up chart context
      chartContextRef.current = null;
    };
  }, []);

  // Simplified layout initialization
  useEffect(() => {
    if (!symbol || symbol === "" || !isMountedRef.current) {
      setIsLayoutReady(false);
      setIsChartMounted(false);
      return;
    }

    // Clear any existing timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }

    // Reset states
    setIsLayoutReady(false);
    setIsChartMounted(false);

    // Immediate initialization for better performance
    setIsLayoutReady(true);
    
    // Short delay for chart mounting to allow DOM to settle
    initTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsChartMounted(true);
        
        // Trigger resize events after chart is mounted
        requestAnimationFrame(() => {
          if (isMountedRef.current) {
            window.dispatchEvent(new Event("resize"));
            window.dispatchEvent(new CustomEvent("chart-resize-requested"));
          }
        });
      }
    }, 100);

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
    };
  }, [symbol]);

  // Setup resize observer for responsive chart sizing
  useEffect(() => {
    if (!isLayoutReady || !isMountedRef.current) return;

    // Clean up existing observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    // Create new resize observer
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        if (!isMountedRef.current) return;
        
        // Debounce resize handling
        handleResize();
      });

      // Observe the document body for size changes
      resizeObserverRef.current.observe(document.body);
    }

    // Listen for panel state changes
    const handlePanelToggle = () => {
      if (isMountedRef.current) {
        handleResize();
      }
    };

    // Add event listeners for panel state changes
    window.addEventListener("panel-collapsed", handlePanelToggle);
    window.addEventListener("panel-expanded", handlePanelToggle);

    return () => {
      // Clean up resize observer
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      // Remove event listeners
      window.removeEventListener("panel-collapsed", handlePanelToggle);
      window.removeEventListener("panel-expanded", handlePanelToggle);
    };
  }, [isLayoutReady, handleResize]);

  // Render loading state
  if (shouldShowLoading) {
    return (
      <div className="w-full h-full bg-[#131722] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4 p-6 bg-zinc-900 rounded-lg max-w-md text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <h3 className="text-xl font-bold">
            {isMarketSwitching ? t("switching_market") : t("loading_trading_interface")}
          </h3>
          <p className="text-zinc-400">
            {isMarketSwitching 
              ? t("updating_chart_data") 
              : t("setting_up_markets_and_chart_data")
            }.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${isMobile ? "z-0" : ""}`} style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Chart loading state */}
      {(!isLayoutReady || !isChartMounted) && (
        <div className="absolute inset-0 bg-[#131722] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-sm text-zinc-400">Initializing chart...</span>
          </div>
        </div>
      )}

      {/* Actual chart - now supports both Native and TradingView */}
      {isLayoutReady && isChartMounted && (
        <div className="absolute inset-0">
          <ChartSwitcher
            {...chartProps}
            onChartContextReady={handleChartContextReady}
            onPriceUpdate={onPriceUpdate}
          />
        </div>
      )}
    </div>
  );
}

export default ChartContainer;
