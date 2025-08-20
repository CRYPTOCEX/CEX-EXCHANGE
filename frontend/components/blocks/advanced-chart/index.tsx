"use client";

import React from "react";

import { useEffect, useCallback, useState, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { ChartProvider } from "./context/chart-context";
import { ChartIndicatorsProvider } from "./context/chart-indicators";
import ChartCanvas from "./canvas";
import type { Order, Symbol, TimeFrame } from "@/store/trade/use-binary-store";

// Create a stable memo function that doesn't change on rerenders
const stableEquals = (a: any, b: any) => a === b;

// Create a React.memo wrapper with custom comparison
const MemoizedChartCanvas = React.memo(ChartCanvas, (prevProps, nextProps) => {
  // Always return true to prevent rerenders from props
  return true;
});

interface AdvancedChartProps {
  symbol: Symbol;
  timeFrame: TimeFrame;
  orders?: Order[];
  expiryMinutes?: number;
  showExpiry?: boolean;
  timeframeDurations?: Array<{ value: TimeFrame; label: string }>;
  positions?: any[];
  isMarketSwitching?: boolean;
  onChartContextReady?: (context: any) => void;
  marketType?: "spot" | "eco" | "futures";
}

export default function AdvancedChart({
  symbol,
  timeFrame,
  orders = [],
  expiryMinutes = 5,
  showExpiry = true,
  timeframeDurations,
  positions,
  isMarketSwitching = false,
  onChartContextReady,
  marketType = "spot",
}: AdvancedChartProps) {
  // Get theme from next-themes
  const { resolvedTheme } = useTheme();

  // Determine if dark mode is active and memoize it
  const isDarkMode = useMemo(() => resolvedTheme === "dark", [resolvedTheme]);

  // Ref to track previous theme to prevent unnecessary updates
  const prevThemeRef = useRef(isDarkMode);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Internal state for price updates
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [internalTimeFrame, setInternalTimeFrame] =
    useState<TimeFrame>(timeFrame);

  // Update internal timeframe when prop changes
  useEffect(() => {
    if (isMountedRef.current) {
      setInternalTimeFrame(timeFrame);
    }
  }, [timeFrame]);

  // Handle internal timeframe changes
  const handleInternalTimeFrameChange = useCallback(
    (newTimeFrame: TimeFrame) => {
      if (isMountedRef.current) {
        setInternalTimeFrame(newTimeFrame);
      }
    },
    []
  );

  // Memoize context values to prevent unnecessary rerenders
  const contextValues = useMemo(
    () => ({
      expiryIntervalMinutes: showExpiry ? expiryMinutes : 0,
      currentPrice,
      timeFrame: internalTimeFrame,
      theme: isDarkMode ? "dark" : "light",
    }),
    [expiryMinutes, currentPrice, internalTimeFrame, isDarkMode, showExpiry]
  );

  // Update the useEffect to properly handle expiryMinutes changes
  useEffect(() => {
    if (!isMountedRef.current) return;

    // If we have a chart context reference, update it directly
    if (onChartContextReady) {
      onChartContextReady(contextValues);
    }
  }, [contextValues, onChartContextReady]);

  // Use useCallback to memoize the onChartContextReady callback
  const handleChartContextReady = useCallback(
    (context: any) => {
      if (!isMountedRef.current) return;

      if (onChartContextReady) {
        // Add price and timeframe to the context
        const enhancedContext = {
          ...context,
          currentPrice,
          timeFrame: internalTimeFrame,
        };
        onChartContextReady(enhancedContext);
      }
    },
    [onChartContextReady, currentPrice, internalTimeFrame]
  );

  // Handle price updates internally
  const handlePriceUpdate = useCallback((price: number) => {
    if (!isMountedRef.current) return;
    setCurrentPrice(price);
  }, []);

  // Listen for theme changes - optimized to prevent unnecessary rerenders
  useEffect(() => {
    if (!isMountedRef.current) return;

    // Only proceed if theme actually changed
    if (prevThemeRef.current !== isDarkMode) {
      prevThemeRef.current = isDarkMode;

      // If we have a chart context reference, update it directly
      if (onChartContextReady) {
        onChartContextReady({
          expiryIntervalMinutes: showExpiry ? expiryMinutes : 0,
          currentPrice,
          timeFrame: internalTimeFrame,
          theme: isDarkMode ? "dark" : "light",
        });
      }
    }
  }, [
    isDarkMode,
    expiryMinutes,
    onChartContextReady,
    currentPrice,
    internalTimeFrame,
    showExpiry,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Only pass orders if showExpiry is true
  const filteredOrders = useMemo(
    () => (showExpiry ? orders : []),
    [showExpiry, orders]
  );

  // Add this to the AdvancedChart component to prevent unnecessary rerenders
  const memoizedSymbol = useMemo(() => symbol, [symbol]);
  const memoizedTimeFrame = useMemo(
    () => internalTimeFrame,
    [internalTimeFrame]
  );
  const memoizedExpiryMinutes = useMemo(
    () => (showExpiry ? expiryMinutes : 0),
    [showExpiry, expiryMinutes]
  );
  const memoizedPositions = useMemo(() => positions, [positions]);
  const memoizedIsMarketSwitching = useMemo(
    () => isMarketSwitching,
    [isMarketSwitching]
  );
  const memoizedMarketType = useMemo(() => marketType, [marketType]);

  // Update the ChartProvider props to use memoized values
  return (
    <ChartIndicatorsProvider>
      <ChartProvider
        symbol={memoizedSymbol}
        timeFrame={memoizedTimeFrame}
        onPriceUpdate={handlePriceUpdate}
        onTimeFrameChange={handleInternalTimeFrameChange}
        darkMode={isDarkMode}
        orders={filteredOrders}
        expiryMinutes={memoizedExpiryMinutes}
        isMarketSwitching={memoizedIsMarketSwitching}
        onChartContextReady={handleChartContextReady}
        marketType={memoizedMarketType}
      >
        <div className="relative w-full h-full min-h-[400px]" style={{ height: "100%" }}>
          <MemoizedChartCanvas positions={memoizedPositions} />
        </div>
      </ChartProvider>
    </ChartIndicatorsProvider>
  );
}
