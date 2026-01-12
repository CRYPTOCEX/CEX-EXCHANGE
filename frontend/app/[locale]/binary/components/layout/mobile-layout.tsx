"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import MobileHeader from "../header/mobile-header";
import ChartContainer from "../chart/chart-container";
import OrderPanel from "../order/order-panel";
import MobileNavigation from "../navigation/mobile-navigation";
import { useSwipe, triggerHapticFeedback } from "../../hooks/use-gestures";
import { TradingSettingsOverlay } from "../settings/trading-settings-overlay";
import { AnalyticsOverlay } from "../modals/analytics-overlay";
import PatternLibrary from "../education/pattern-library";
import Leaderboard from "../education/leaderboard";
import DemoChallenges from "../education/demo-challenges";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { useOneClickTrading } from "../settings/one-click-toggle";
import { useMartingale } from "../settings/martingale-settings";
import type {
  OrderSide,
  Symbol,
  TimeFrame,
  Order,
} from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

// Chart order type that combines both active and completed orders for the chart
interface ChartOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  amount: number;
  entryPrice: number;
  entryTime: number;
  expiryTime: number;
  closePrice?: number;
  status: "PENDING" | "WIN" | "LOSS";
  profit?: number;
  profitPercentage?: number;
  isDemo?: boolean;
}

interface MobileLayoutProps {
  balance: number;
  netPL: number;
  activeMarkets: Array<{ symbol: Symbol; price: number; change: number }>;
  symbol: Symbol;
  handleSymbolChange: (symbol: Symbol) => void;
  addMarket: (symbol: Symbol) => void;
  removeMarket: (symbol: Symbol) => void;
  orders: Order[]; // Active orders for positions panel
  chartOrders: ChartOrder[]; // Combined orders for chart
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
  currency?: string; // Currency for displaying amounts (e.g., "USDT", "USD")
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
  chartOrders = [],
  completedPositionsCount,
  placeOrder,
  handleExpiryChange,
  selectedExpiryMinutes,
  isInSafeZone,
  candleData,
  priceMovements,
  balance,
  tradingMode,
  handleTradingModeChange,
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
  currency = "USD",
}: MobileLayoutProps) {
  const tCommon = useTranslations("common");

  // Default order amount for limit order alerts
  const defaultOrderAmount = 1000;

  // Overlay states (same as desktop)
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [showAnalyticsOverlay, setShowAnalyticsOverlay] = useState(false);
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);

  // Get completed orders for analytics
  const { completedOrders } = useBinaryStore();

  // One-click trading hook
  const oneClickTrading = useOneClickTrading(balance * 0.5);

  // Martingale hook
  const martingale = useMartingale(defaultOrderAmount);

  // Calculate trading stats from completed orders
  const tradingStats = useMemo(() => {
    if (completedOrders.length === 0) {
      return { winRate: 55, avgProfit: 0, avgLoss: 0 };
    }
    const wins = completedOrders.filter(o => o.status === "WIN");
    const losses = completedOrders.filter(o => o.status === "LOSS");
    return {
      winRate: (wins.length / completedOrders.length) * 100,
      avgProfit: wins.length > 0 ? wins.reduce((sum, o) => sum + (o.profit || 0), 0) / wins.length : 0,
      avgLoss: losses.length > 0 ? Math.abs(losses.reduce((sum, o) => sum + (o.profit || 0), 0) / losses.length) : 0,
    };
  }, [completedOrders]);

  // Helper to close all overlays
  const closeAllOverlays = useCallback(() => {
    setShowSettingsOverlay(false);
    setShowAnalyticsOverlay(false);
    setShowPatternLibrary(false);
    setShowLeaderboard(false);
    setShowChallenges(false);
  }, []);

  // Check if any parent overlay is open (to close chart internal overlays)
  const isAnyOverlayOpen = showSettingsOverlay || showAnalyticsOverlay || showPatternLibrary || showLeaderboard || showChallenges;

  // Wrap setActivePanel to close overlays when switching to chart/order/positions
  const handleSetActivePanel = useCallback((panel: "chart" | "order" | "positions") => {
    closeAllOverlays();
    setActivePanel(panel);
  }, [closeAllOverlays, setActivePanel]);

  // Overlay handlers - all overlays are mutually exclusive and toggle on/off
  // Always close all overlays first, then open the new one if it wasn't already open
  const handleSettingsClick = useCallback(() => {
    const wasOpen = showSettingsOverlay;
    // Close ALL overlays first
    setShowSettingsOverlay(false);
    setShowAnalyticsOverlay(false);
    setShowPatternLibrary(false);
    setShowLeaderboard(false);
    setShowChallenges(false);
    // Open this one only if it wasn't already open
    if (!wasOpen) {
      setShowSettingsOverlay(true);
    }
  }, [showSettingsOverlay]);

  const handleAnalyticsClick = useCallback(() => {
    const wasOpen = showAnalyticsOverlay;
    setShowSettingsOverlay(false);
    setShowAnalyticsOverlay(false);
    setShowPatternLibrary(false);
    setShowLeaderboard(false);
    setShowChallenges(false);
    if (!wasOpen) {
      setShowAnalyticsOverlay(true);
    }
  }, [showAnalyticsOverlay]);

  const handlePatternLibraryClick = useCallback(() => {
    const wasOpen = showPatternLibrary;
    setShowSettingsOverlay(false);
    setShowAnalyticsOverlay(false);
    setShowPatternLibrary(false);
    setShowLeaderboard(false);
    setShowChallenges(false);
    if (!wasOpen) {
      setShowPatternLibrary(true);
    }
  }, [showPatternLibrary]);

  const handleLeaderboardClick = useCallback(() => {
    const wasOpen = showLeaderboard;
    setShowSettingsOverlay(false);
    setShowAnalyticsOverlay(false);
    setShowPatternLibrary(false);
    setShowLeaderboard(false);
    setShowChallenges(false);
    if (!wasOpen) {
      setShowLeaderboard(true);
    }
  }, [showLeaderboard]);

  const handleChallengesClick = useCallback(() => {
    const wasOpen = showChallenges;
    setShowSettingsOverlay(false);
    setShowAnalyticsOverlay(false);
    setShowPatternLibrary(false);
    setShowLeaderboard(false);
    setShowChallenges(false);
    if (!wasOpen) {
      setShowChallenges(true);
    }
  }, [showChallenges]);

  // Tab order for swipe navigation
  const tabOrder: Array<"chart" | "order" | "positions"> = ["chart", "order", "positions"];

  // Navigate to next/previous tab
  const navigateTab = useCallback((direction: "left" | "right") => {
    const currentIndex = tabOrder.indexOf(activePanel);
    let newIndex: number;

    if (direction === "left") {
      // Swipe left = go to next tab (right)
      newIndex = Math.min(currentIndex + 1, tabOrder.length - 1);
    } else {
      // Swipe right = go to previous tab (left)
      newIndex = Math.max(currentIndex - 1, 0);
    }

    if (newIndex !== currentIndex) {
      triggerHapticFeedback("selection");
      setActivePanel(tabOrder[newIndex]);
    }
  }, [activePanel, setActivePanel, tabOrder]);

  // Swipe handlers
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => navigateTab("left"),
    onSwipeRight: () => navigateTab("right"),
  }, {
    threshold: 50,
    velocityThreshold: 0.3,
    preventDefaultOnHorizontal: true,
  });

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

  // Note: Removed landscape layout for 600-1024px - using standard mobile layout instead
  return (
    <div
      className={`flex flex-col w-full h-full overflow-hidden relative ${
        darkMode ? "bg-black" : "bg-white"
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
        onTradingModeChange={handleTradingModeChange}
      />

      {/* Main content area with swipe gesture support */}
      <div
        className="flex-1 relative overflow-hidden flex flex-col min-h-0"
        {...swipeHandlers}
      >
        {/* Chart container - takes most of the space */}
        <div className="flex-1 relative min-h-0">
          <ChartContainer
            key={`binary-mobile-chart-${symbol}-${isMarketSwitching ? 'switching' : 'stable'}`}
            symbol={symbol}
            timeFrame={timeFrame}
            orders={chartOrders.filter((order) => order.symbol === symbol)}
            expiryMinutes={selectedExpiryMinutes}
            showExpiry={showExpiry}
            timeframeDurations={timeframeDurations}
            onChartContextReady={setChartContextRef}
            positions={positionMarkers}
            isMarketSwitching={isMarketSwitching}
            isMobile={true}
            currency={currency}
            defaultOrderAmount={defaultOrderAmount}
            onPlaceOrder={placeOrder}
            onCloseParentOverlays={closeAllOverlays}
            closeInternalOverlays={isAnyOverlayOpen}
          />

          {/* Order panel - slide in from right */}
          <div
            className={`absolute inset-0 transform transition-transform duration-300 ease-in-out z-10 ${
              darkMode ? "bg-black" : "bg-white"
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

          {/* Overlay components - positioned within main content area (between header and footer) */}
          <TradingSettingsOverlay
            isOpen={showSettingsOverlay}
            onClose={() => setShowSettingsOverlay(false)}
            darkMode={darkMode}
            balance={balance}
            currentPrice={currentPrice}
            symbol={symbol}
            winRate={tradingStats.winRate}
            avgProfit={tradingStats.avgProfit}
            avgLoss={tradingStats.avgLoss}
            oneClickEnabled={oneClickTrading.enabled}
            onOneClickChange={oneClickTrading.setEnabled}
            oneClickMaxAmount={oneClickTrading.maxAmount}
            martingaleState={martingale.state}
            onMartingaleChange={martingale.setState}
            currentAmount={defaultOrderAmount}
            onPlaceOrder={placeOrder}
            onSetAmount={() => {}}
            isMobile={true}
          />

          <AnalyticsOverlay
            isOpen={showAnalyticsOverlay}
            onClose={() => setShowAnalyticsOverlay(false)}
            theme={darkMode ? "dark" : "light"}
            isMobile={true}
          />

          {showPatternLibrary && (
            <PatternLibrary
              isOpen={showPatternLibrary}
              onClose={() => setShowPatternLibrary(false)}
              isMobile={true}
            />
          )}

          {showLeaderboard && (
            <Leaderboard
              isOpen={showLeaderboard}
              onClose={() => setShowLeaderboard(false)}
              isMobile={true}
            />
          )}

          {showChallenges && tradingMode === "demo" && (
            <DemoChallenges
              isOpen={showChallenges}
              onClose={() => setShowChallenges(false)}
              isMobile={true}
            />
          )}
        </div>

      </div>

      {/* Mobile navigation footer with all features */}
      <MobileNavigation
        activePanel={activePanel}
        setActivePanel={handleSetActivePanel}
        activePositionsCount={
          orders.filter((order) => order.status === "PENDING").length
        }
        currentPrice={currentPrice}
        symbol={symbol}
        priceMovement={priceMovements[symbol]}
        balance={balance}
        tradingMode={tradingMode}
        // Overlay callbacks
        onAnalyticsClick={handleAnalyticsClick}
        onPatternLibraryClick={handlePatternLibraryClick}
        onLeaderboardClick={handleLeaderboardClick}
        onChallengesClick={handleChallengesClick}
        onSettingsClick={handleSettingsClick}
        // Active states
        isAnalyticsOpen={showAnalyticsOverlay}
        isPatternLibraryOpen={showPatternLibrary}
        isLeaderboardOpen={showLeaderboard}
        isChallengesOpen={showChallenges}
        isSettingsOpen={showSettingsOverlay}
        completedTradesCount={completedOrders.length}
      />
    </div>
  );
}
