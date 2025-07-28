"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  BarChart,
  Clock,
  DollarSign,
  TrendingUp,
  BarChart2,
  ArrowUpDown,
  History,
  Search,
  Star,
  Zap,
} from "lucide-react";
import ChartSwitcher from "@/components/blocks/chart-switcher";
import type { Symbol, TimeFrame } from "@/store/trade/use-binary-store";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

// Import desktop components
import MarketsPanel from "../markets/markets-panel";
import TradingFormPanel from "../trading/trading-form-panel";
import OrdersPanel from "../orders/orders-panel";
import OrderBookPanel from "../orderbook/orderbook-panel";

interface MobileLayoutProps {
  currentSymbol?: Symbol;
  onSymbolChange?: (symbol: Symbol, marketType?: "spot" | "futures") => void;
}

export default function MobileLayout({
  currentSymbol = "BTCUSDT",
  onSymbolChange,
}: MobileLayoutProps) {
  const [activeTab, setActiveTab] = useState("chart");
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>("5m");
  const [mounted, setMounted] = useState(false);
  const [chartMounted, setChartMounted] = useState(false);
  const [tradingFormMounted, setTradingFormMounted] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "spot";
  const marketType = type === "futures" ? "futures" : "spot";
  const isFutures = marketType === "futures";
  const t = useTranslations("trade/components/layout/mobile-layout");

  useEffect(() => {
    setMounted(true);
    // Mount chart after a short delay to ensure smooth initial render
    const timer = setTimeout(() => {
      setChartMounted(true);
      setTradingFormMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle viewport height changes for mobile browsers
  useEffect(() => {
    const updateViewportHeight = () => {
      // Use the smaller of window.innerHeight and document.documentElement.clientHeight
      // to account for mobile browser UI elements
      const height = Math.min(window.innerHeight, document.documentElement.clientHeight);
      setViewportHeight(height);
      
      // Set CSS custom property for consistent height across components
      document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
    };

    updateViewportHeight();
    
    // Listen for resize events (including orientation changes)
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', () => {
      // Delay for orientation change to complete
      setTimeout(updateViewportHeight, 100);
    });

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
    };
  }, []);

  const handleChartContextReady = (context: any) => {
    // Handle chart context ready if needed
  };

  const handleMarketSelect = (
    symbol: Symbol,
    marketType?: "spot" | "futures"
  ) => {
    // Skip if selecting the same symbol
    if (symbol === currentSymbol) {
      return;
    }

    if (onSymbolChange) {
      onSymbolChange(symbol, marketType);
    }
    
    // Switch to chart tab after selecting a market
    setActiveTab("chart");
    
    // Force chart and trading form remount with proper cleanup for mobile
    setChartMounted(false);
    setTradingFormMounted(false);
    setTimeout(() => {
      setChartMounted(true);
      setTradingFormMounted(true);
    }, 100); // Slightly longer delay for mobile
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs
        defaultValue="chart"
        className="flex flex-col h-full min-h-0"
        onValueChange={setActiveTab}
      >
        <div className="flex-1 overflow-hidden relative min-h-0">
          {/* Chart - Always mounted but hidden when not active */}
          <div
            className={`absolute inset-0 ${activeTab === "chart" ? "block" : "hidden"}`}
          >
            {chartMounted && (
              <div className="h-full bg-black">
                <ChartSwitcher
                  key={`mobile-chart-${currentSymbol}-${marketType}`}
                  symbol={currentSymbol}
                  timeFrame={selectedTimeframe}
                  onChartContextReady={handleChartContextReady}
                  showExpiry={false}
                  expiryMinutes={5}
                  orders={[]}
                  marketType={marketType}
                />
              </div>
            )}
          </div>

          {/* Markets Tab Content */}
          <div
            className={`absolute inset-0 ${activeTab === "markets" ? "block" : "hidden"}`}
          >
            <div className="h-full bg-background dark:bg-zinc-950">
              <MarketsPanel
                onMarketSelect={handleMarketSelect}
                currentSymbol={currentSymbol}
                defaultMarketType={marketType}
              />
            </div>
          </div>

          {/* Trade Tab Content */}
          <div
            className={`absolute inset-0 ${activeTab === "trade" ? "block" : "hidden"}`}
          >
            <div className="h-full bg-background dark:bg-zinc-950">
              {tradingFormMounted && (
                <TradingFormPanel 
                  key={`mobile-trading-form-${currentSymbol}-${marketType}`}
                  symbol={currentSymbol} 
                  isFutures={isFutures} 
                />
              )}
            </div>
          </div>

          {/* Book Tab Content */}
          <div
            className={`absolute inset-0 ${activeTab === "book" ? "block" : "hidden"}`}
          >
            <div className="h-full bg-background dark:bg-zinc-950">
              <OrderBookPanel 
                key={`mobile-orderbook-${currentSymbol}-${marketType}`}
                symbol={currentSymbol} 
                marketType={marketType} 
              />
            </div>
          </div>

          {/* Orders Tab Content */}
          <div
            className={`absolute inset-0 ${activeTab === "orders" ? "block" : "hidden"}`}
          >
            <div className="h-full bg-background dark:bg-zinc-950">
              <OrdersPanel 
                key={`mobile-orders-${currentSymbol}`}
                symbol={currentSymbol} 
              />
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Fixed height with proper safe area handling */}
        <TabsList className="w-full grid grid-cols-5 h-16 sm:h-14 rounded-none bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0 pb-safe-or-2">
          <TabsTrigger
            value="chart"
            className="flex flex-col items-center justify-center gap-1 text-xs py-2 min-h-0"
          >
            <BarChart2 className="h-4 w-4 flex-shrink-0" />
            <span className="text-[10px] leading-none">{t("Chart")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="markets"
            className="flex flex-col items-center justify-center gap-1 text-xs py-2 min-h-0"
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="text-[10px] leading-none">{t("Markets")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="trade"
            className="flex flex-col items-center justify-center gap-1 text-xs py-2 min-h-0"
          >
            <TrendingUp className="h-4 w-4 flex-shrink-0" />
            <span className="text-[10px] leading-none">{t("Trade")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="book"
            className="flex flex-col items-center justify-center gap-1 text-xs py-2 min-h-0"
          >
            <ArrowUpDown className="h-4 w-4 flex-shrink-0" />
            <span className="text-[10px] leading-none">{t("Book")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="flex flex-col items-center justify-center gap-1 text-xs py-2 min-h-0"
          >
            <History className="h-4 w-4 flex-shrink-0" />
            <span className="text-[10px] leading-none">{t("Orders")}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
