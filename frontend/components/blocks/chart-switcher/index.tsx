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
  
  // Wait for settings to be initialized before deciding which chart to load
  if (!settingsFetched && isLoading) {
    return (
      <div className="w-full h-full bg-background dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading chart settings...</p>
        </div>
      </div>
    );
  }
  
  // Default to native chart if setting is not configured
  const chartType = settings?.chartType || "NATIVE";
  
  const useTradingView = chartType === "TRADINGVIEW" && isTradingViewLoaded && !tradingViewError;

  if (useTradingView) {
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

  // Default to native chart
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