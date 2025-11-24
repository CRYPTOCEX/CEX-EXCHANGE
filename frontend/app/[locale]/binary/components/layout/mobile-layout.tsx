"use client";

import { useEffect } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import MobileHeader from "../header/mobile-header";
import ChartContainer from "../chart/chart-container";
import OrderPanel from "../order/order-panel";
import MobilePositionsPanel from "../positions/mobile-positions-panel";
import MobileNavigation from "../navigation/mobile-navigation";
import PriceIndicator from "../chart/price-indicator";
import type {
  OrderSide,
  Symbol,
  TimeFrame,
  Order,
} from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

interface MobileLayoutProps {
  balance: number;
  netPL: number;
  activeMarkets: Array<{ symbol: Symbol; price: number; change: number }>;
  symbol: Symbol;
  handleSymbolChange: (symbol: Symbol) => void;
  addMarket: (symbol: Symbol) => void;
  removeMarket: (symbol: Symbol) => void;
  orders: Order[];
  currentPrice: number;
  tradingMode: "demo" | "real";
  handleTradingModeChange: (mode: "demo" | "real") => void;
  isLoadingWallet: boolean;
  handlePositionsChange: (positions: any[]) => void;
  completedPositionsCount: number;
  activePositionsCount: number;
  placeOrder: (
    side: OrderSide,
    amount: number,
    expiryMinutes: number
  ) => Promise<boolean>;
  handleExpiryChange: (minutes: number) => void;
  selectedExpiryMinutes: number;
  isInSafeZone: boolean;
  candleData: any[];
  priceMovements: Record<
    Symbol,
    {
      direction: "up" | "down" | "neutral";
      percent: number;
      strength: "strong" | "medium" | "weak";
    }
  >;
  activePanel: "chart" | "order" | "positions";
  setActivePanel: (panel: "chart" | "order" | "positions") => void;
  showMobileOrderPanel: boolean;
  setShowMobileOrderPanel: (show: boolean) => void;
  showMobilePositions: boolean;
  setShowMobilePositions: (show: boolean) => void;
  showQuickTradeButtons: boolean;
  toggleMobileOrderPanel: () => void;
  toggleMobilePositions: () => void;
  toggleQuickTradeButtons: () => void;
  setChartContextRef: (ref: any) => void;
  isMarketSwitching: boolean;
  timeFrame: TimeFrame;
  handleTimeFrameChange: (timeFrame: TimeFrame) => void;
  timeframeDurations: Array<{ value: TimeFrame; label: string }>;
  showExpiry: boolean;
  positionMarkers: any[];
  darkMode?: boolean;
  onDarkModeChange?: (darkMode: boolean) => void;
  handleMarketSelect?: (marketSymbol: string) => void;
}

export default function MobileLayout({
  symbol,
  currentPrice,
  activeMarkets,
  handleSymbolChange,
  addMarket,
  removeMarket,
  activePanel,
  setActivePanel,
  handlePositionsChange,
  orders,
  completedPositionsCount,
  placeOrder,
  handleExpiryChange,
  selectedExpiryMinutes,
  isInSafeZone,
  candleData,
  priceMovements,
  balance,
  tradingMode,
  setChartContextRef,
  isMarketSwitching,
  timeFrame,
  handleTimeFrameChange,
  timeframeDurations,
  showExpiry,
  positionMarkers,
  darkMode = true,
  onDarkModeChange = () => {},
  handleMarketSelect,
}: MobileLayoutProps) {
  const t = useTranslations("binary/components/layout/mobile-layout");

  // Handle viewport height changes for mobile browsers
  useEffect(() => {
    const updateViewportHeight = () => {
      // Use the smaller of window.innerHeight and document.documentElement.clientHeight
      // to account for mobile browser UI elements
      const height = Math.min(window.innerHeight, document.documentElement.clientHeight);
      
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
  return (
    <div
      className={`flex flex-col w-full h-full overflow-hidden relative ${
        darkMode ? "bg-[#131722]" : "bg-white"
      }`}
    >
      {/* Mobile header with market selector */}
      <MobileHeader
        symbol={symbol}
        currentPrice={currentPrice}
        balance={balance}
        tradingMode={tradingMode}
        activeMarkets={activeMarkets}
        onSelectSymbol={handleSymbolChange}
        onAddMarket={addMarket}
        onRemoveMarket={removeMarket}
        handleMarketSelect={handleMarketSelect}
      />

      {/* Main content area with absolute positioning for panels */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Chart container - takes most of the space */}
        <div className="flex-1 relative">
          <ChartContainer
            key={`binary-mobile-chart-${symbol}-${timeFrame}-${isMarketSwitching ? 'switching' : 'stable'}`}
            symbol={symbol}
            timeFrame={timeFrame}
            orders={orders.filter((order) => order.symbol === symbol)}
            expiryMinutes={selectedExpiryMinutes}
            showExpiry={showExpiry}
            timeframeDurations={timeframeDurations}
            onChartContextReady={setChartContextRef}
            positions={positionMarkers}
            isMarketSwitching={isMarketSwitching}
            isMobile={true}
          />

          {/* Price indicator - removed from mobile for cleaner UI */}

          {/* Order panel - slide in from right */}
          <div
            className={`absolute inset-0 transform transition-transform duration-300 ease-in-out z-10 ${
              darkMode ? "bg-[#131722]" : "bg-white"
            } ${
              activePanel === "order" ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <OrderPanel
              currentPrice={currentPrice}
              symbol={symbol}
              onPlaceOrder={placeOrder}
              onExpiryChange={handleExpiryChange}
              balance={balance}
              candleData={candleData}
              priceMovement={
                priceMovements[symbol] || {
                  direction: "neutral",
                  percent: 0,
                  strength: "weak",
                }
              }
              isInSafeZone={isInSafeZone}
              tradingMode={tradingMode}
              isMobile={true}
              darkMode={darkMode}
            />
          </div>

          {/* Positions panel - slide in from right */}
          <div
            className={`absolute inset-0 transform transition-transform duration-300 ease-in-out z-10 ${
              darkMode ? "bg-[#131722]" : "bg-white"
            } ${
              activePanel === "positions" ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <MobilePositionsPanel
              orders={orders}
              currentPrice={currentPrice}
              onPositionsChange={handlePositionsChange}
              className="h-full"
              theme={darkMode ? "dark" : "light"}
            />
          </div>
        </div>

        {/* Quick trade buttons - shown below chart on chart tab */}
        {activePanel === "chart" && (
          <div
            className={`flex-shrink-0 p-4 border-t ${
              darkMode
                ? "bg-zinc-900/50 border-zinc-800"
                : "bg-zinc-50 border-zinc-200"
            }`}
          >
            <div className="flex gap-3">
              <button
                onClick={() => setActivePanel("order")}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-5 rounded-md flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowUp size={18} />
                <span>{t("RISE")}</span>
              </button>
              <button
                onClick={() => setActivePanel("order")}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-5 rounded-md flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowDown size={18} />
                <span>{t("FALL")}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile navigation footer - normal flow instead of fixed */}
      <MobileNavigation
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        activePositionsCount={
          orders.filter((order) => order.status === "PENDING").length
        }
        currentPrice={currentPrice}
        symbol={symbol}
        priceMovement={priceMovements[symbol]}
        balance={balance}
      />
    </div>
  );
}
