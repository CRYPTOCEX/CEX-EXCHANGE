"use client";

import { useConfigStore } from "@/store/config";
import AdvancedChart from "@/components/blocks/advanced-chart";
import { TradingViewChart } from "@/components/blocks/tradingview-chart";
import { useTradingViewLoader } from "@/components/blocks/tradingview-chart/script-loader";
import type { Symbol, TimeFrame } from "@/store/trade/use-binary-store";
import type { MarketMetadata } from "@/lib/precision-utils";

interface ChartSwitcherProps {
  symbol: Symbol;
  timeFrame: TimeFrame;
  orders?: any[];
  expiryMinutes?: number;
  showExpiry?: boolean;
  timeframeDurations?: Array<{ value: TimeFrame; label: string }>;
  positions?: any[];
  isMarketSwitching?: boolean;
  onChartContextReady?: (context: any) => void;
  marketType?: "spot" | "eco" | "futures";
  onPriceUpdate?: (price: number) => void;
  metadata?: MarketMetadata;
}

export default function ChartSwitcher({
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
  onPriceUpdate,
  metadata,
}: ChartSwitcherProps) {
  const { settings, settingsFetched, isLoading } = useConfigStore();
  const { isLoaded: isTradingViewLoaded, isLoading: isTradingViewLoading, error: tradingViewError } = useTradingViewLoader();
  
  // Wait for settings to be fetched before deciding which chart to load
  // This prevents loading the default chart and then switching to TradingView
  if (!settingsFetched) {
    return (
      <div className="w-full h-full bg-background dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading chart settings...</p>
        </div>
      </div>
    );
  }
  
  // Only decide chart type after settings are fetched
  const chartType = settings?.chartType || "NATIVE";
  
  // If TradingView is selected but not loaded yet, show loading state
  if (chartType === "TRADINGVIEW") {
    // Show loading while TradingView script is loading
    if (isTradingViewLoading || (!isTradingViewLoaded && !tradingViewError)) {
      return (
        <div className="w-full h-full bg-background dark:bg-zinc-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground text-sm">Loading TradingView chart...</p>
          </div>
        </div>
      );
    }
    
    // Show error state if TradingView failed to load
    if (tradingViewError) {
      console.error("TradingView failed to load, falling back to native chart:", tradingViewError);
      // Fall back to native chart on error
    } else if (isTradingViewLoaded) {
      // TradingView is loaded and ready
      return (
        <TradingViewChart
          key={`tradingview-${symbol}-${marketType}`}
          symbol={symbol}
          timeFrame={timeFrame}
          orders={orders}
          expiryMinutes={expiryMinutes}
          showExpiry={showExpiry}
          onChartContextReady={onChartContextReady}
          marketType={marketType}
          onPriceUpdate={onPriceUpdate}
          metadata={metadata}
          isMarketSwitching={isMarketSwitching}
        />
      );
    }
  }

  // Use native chart if selected or as fallback
  return (
    <AdvancedChart
      symbol={symbol}
      timeFrame={timeFrame}
      orders={orders}
      expiryMinutes={expiryMinutes}
      showExpiry={showExpiry}
      timeframeDurations={timeframeDurations}
      positions={positions}
      isMarketSwitching={isMarketSwitching}
      onChartContextReady={onChartContextReady}
      marketType={marketType}
    />
  );
} 