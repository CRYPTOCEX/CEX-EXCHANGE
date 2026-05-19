"use client";

import React, { memo, useEffect, useRef, useState, useCallback } from "react";
import { cn } from "../../utils/cn";
import ChartSwitcher from "@/components/blocks/chart-switcher";
import type { MarketType } from "../../types/common";
import type { TimeFrame } from "@/store/trade/use-binary-store";
import type { MarketMetadata } from "@/lib/precision-utils";

interface ChartPanelProps {
  symbol: string;
  marketType: MarketType;
  chartProvider?: "tradingview" | "chart_engine";
  onPriceUpdate?: (price: number) => void;
  metadata?: MarketMetadata;
}

export const ChartPanel = memo(function ChartPanel({
  symbol,
  marketType,
  onPriceUpdate,
  metadata,
}: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>("1m");
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [chartKey, setChartKey] = useState<string>(`tp-chart-${symbol}-${marketType}`);

  // Track if this is the first render to avoid unnecessary chart remounts
  const isFirstRender = useRef(true);
  const prevSymbolRef = useRef(symbol);
  const prevMarketTypeRef = useRef(marketType);

  // Convert Trading Pro market type to chart market type
  const chartMarketType = marketType === "futures" ? "futures" :
                          marketType === "eco" ? "eco" : "spot";

  // Handle chart context ready
  const handleChartContextReady = useCallback((context: any) => {
    if (context && typeof context.currentPrice === "number" && context.currentPrice > 0) {
      onPriceUpdate?.(context.currentPrice);
    }
  }, [onPriceUpdate]);

  // Initial layout ready - only runs once on mount
  // Use a slightly longer delay for tablets/slower devices to ensure container is sized
  useEffect(() => {
    const initTimer = setTimeout(() => {
      setIsLayoutReady(true);

      // Force window resize events to trigger chart sizing
      // Multiple resize events at increasing intervals to handle slower devices
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));
      }, 150);
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));
      }, 400);
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));
      }, 800);
    }, 150); // Slightly longer initial delay for tablets

    return () => clearTimeout(initTimer);
  }, []);

  // Handle symbol or marketType changes - just update the key, don't reset layout
  // IMPORTANT: Skip the first render to avoid double-mounting the chart
  useEffect(() => {
    // Skip on first render - the initial chartKey is already set correctly
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only update if symbol or marketType actually changed
    const symbolChanged = prevSymbolRef.current !== symbol;
    const marketChanged = prevMarketTypeRef.current !== marketType;

    if (symbolChanged || marketChanged) {
      // Update refs
      prevSymbolRef.current = symbol;
      prevMarketTypeRef.current = marketType;

      // Update chart key to force complete remount when symbol/market changes
      setChartKey(`tp-chart-${symbol}-${marketType}-${Date.now()}`);

      // Force resize after key change
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));
      }, 100);
    }
  }, [symbol, marketType]);

  // Handle chart actions from hotkeys
  useEffect(() => {
    const handleChartAction = (e: CustomEvent) => {
      const action = e.detail;
      switch (action) {
        case "timeframe1m":
          setSelectedTimeframe("1m");
          break;
        case "timeframe5m":
          setSelectedTimeframe("5m");
          break;
        case "timeframe1h":
          setSelectedTimeframe("1h");
          break;
        case "timeframe1d":
          setSelectedTimeframe("1d");
          break;
      }
    };

    window.addEventListener("tp-chart-action", handleChartAction as EventListener);
    return () => {
      window.removeEventListener("tp-chart-action", handleChartAction as EventListener);
    };
  }, []);

  // Listen for market switching cleanup events
  useEffect(() => {
    const handleMarketSwitchingCleanup = () => {
      // Just update the key to remount the chart, don't reset isLayoutReady
      setChartKey(`tp-chart-${symbol}-${Date.now()}`);

      // Force resize after remount
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));
      }, 100);
    };

    window.addEventListener("market-switching-cleanup", handleMarketSwitchingCleanup as EventListener);

    return () => {
      window.removeEventListener("market-switching-cleanup", handleMarketSwitchingCleanup as EventListener);
    };
  }, [symbol]);

  // Listen for layout changes and trigger chart resize
  useEffect(() => {
    const handleLayoutChange = () => {
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));
      }, 100);
    };

    window.addEventListener("panel-collapsed", handleLayoutChange);
    window.addEventListener("panel-expanded", handleLayoutChange);

    return () => {
      window.removeEventListener("panel-collapsed", handleLayoutChange);
      window.removeEventListener("panel-expanded", handleLayoutChange);
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-black overflow-hidden min-h-0">
      {/* Chart Container - TradingView has its own toolbar */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 relative w-full h-full",
          "min-h-0",
          "bg-black overflow-hidden",
          "flex flex-col"
        )}
      >
        {isLayoutReady ? (
          <ChartSwitcher
            key={chartKey}
            symbol={symbol}
            timeFrame={selectedTimeframe}
            onChartContextReady={handleChartContextReady}
            showExpiry={false}
            expiryMinutes={5}
            orders={[]}
            marketType={chartMarketType}
            onPriceUpdate={onPriceUpdate}
            metadata={metadata}
            isSpotContext={chartMarketType === "spot" || chartMarketType === "eco"}
            isFuturesContext={chartMarketType === "futures"}
          />
        ) : (
          <div className="w-full h-full bg-black flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
});

export default ChartPanel;
