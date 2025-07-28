"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import ChartSwitcher from "@/components/blocks/chart-switcher";
import type { Symbol, TimeFrame } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import type { MarketMetadata } from "@/lib/precision-utils";

interface ChartPanelProps {
  symbol: Symbol;
  onPriceUpdate?: (price: number) => void;
  metadata?: MarketMetadata;
}

export default function ChartPanel({ symbol, onPriceUpdate, metadata }: ChartPanelProps) {
  const t = useTranslations("trade/components/chart/chart-panel");
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>("1h");
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [chartKey, setChartKey] = useState<string>(`chart-${symbol}`);
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "spot";
  const marketType = type === "futures" ? "futures" : "spot";

  // Handle price updates from the chart
  useEffect(() => {
    if (currentPrice > 0 && onPriceUpdate) {
      onPriceUpdate(currentPrice);
    }
  }, [currentPrice, onPriceUpdate]);

  // Handle chart context ready
  const handleChartContextReady = (context: any) => {
    if (
      context &&
      typeof context.currentPrice === "number" &&
      context.currentPrice > 0
    ) {
      setCurrentPrice(context.currentPrice);
    }
  };

  // Handle symbol changes and force chart remount
  useEffect(() => {
    // Reset layout ready state when symbol changes to force remount
    setIsLayoutReady(false);
    
    // Update chart key to force complete remount
    setChartKey(`chart-${symbol}-${Date.now()}`);
    
    // Reset current price for new symbol
    setCurrentPrice(0);

    // Add a delay to allow the layout to settle
    const initTimer = setTimeout(() => {
      setIsLayoutReady(true);

      // Force window resize events to trigger chart sizing
      const resizeTimer = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));

        // Add another resize event after a short delay to ensure proper sizing
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
          window.dispatchEvent(new CustomEvent("chart-resize-requested"));
        }, 100);
      }, 200);

      return () => clearTimeout(resizeTimer);
    }, 300);

    return () => clearTimeout(initTimer);
  }, [symbol]);

  // Listen for market switching cleanup events
  useEffect(() => {
    const handleMarketSwitchingCleanup = (event: CustomEvent) => {
      const { oldSymbol, newSymbol } = event.detail;
      
      // Force chart remount by updating key and resetting layout
      setIsLayoutReady(false);
      setChartKey(`chart-${newSymbol}-${Date.now()}`);
      setCurrentPrice(0);
      
      // Re-enable layout after cleanup
      setTimeout(() => {
        setIsLayoutReady(true);
      }, 100);
    };

    window.addEventListener('market-switching-cleanup', handleMarketSwitchingCleanup as EventListener);
    
    return () => {
      window.removeEventListener('market-switching-cleanup', handleMarketSwitchingCleanup as EventListener);
    };
  }, []);

  // Listen for layout changes and trigger chart resize
  useEffect(() => {
    const handleLayoutChange = () => {
      // Delay the resize to allow layout to settle
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));
      }, 100);
    };

    // Listen for panel collapse/expand events
    const handlePanelToggle = () => {
      handleLayoutChange();
    };

    // Add event listeners for panel state changes
    window.addEventListener("panel-collapsed", handlePanelToggle);
    window.addEventListener("panel-expanded", handlePanelToggle);

    return () => {
      window.removeEventListener("panel-collapsed", handlePanelToggle);
      window.removeEventListener("panel-expanded", handlePanelToggle);
    };
  }, []);

  // If no symbol is provided, show an error message
  if (!symbol) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4 p-6 bg-gray-900 rounded-lg max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h3 className="text-xl font-bold">
            {t("no_trading_symbol_selected")}
          </h3>
          <p className="text-gray-400">
            {t("please_select_a_trading_symbol_to_view_the_chart")}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black">
      {isLayoutReady && (
        <ChartSwitcher
          key={chartKey}
          symbol={symbol}
          timeFrame={selectedTimeframe}
          onChartContextReady={handleChartContextReady}
          showExpiry={false}
          expiryMinutes={5}
          orders={[]}
          marketType={marketType}
          onPriceUpdate={onPriceUpdate}
          metadata={metadata}
        />
      )}
      {!isLayoutReady && (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
}
