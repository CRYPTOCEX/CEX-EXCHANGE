"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTheme } from "next-themes";
import ChartContainer from "../chart/chart-container";
import OrderPanel from "../order/order-panel";
import ActivePositions from "../positions/active-positions";
import type {
  Symbol,
  TimeFrame,
  OrderSide,
  PriceMovement,
} from "@/store/trade/use-binary-store";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import Header from "../header/header";
import { TradingSettingsOverlay } from "../settings/trading-settings-overlay";
import { AnalyticsOverlay } from "../modals/analytics-overlay";
import { useOneClickTrading } from "../settings/one-click-toggle";
import { useMartingale } from "../settings/martingale-settings";
import PatternLibrary from "../education/pattern-library";
import Leaderboard from "../education/leaderboard";
import DemoChallenges from "../education/demo-challenges";

import type { Order } from "@/store/trade/use-binary-store";

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

interface DesktopLayoutProps {
  balance: number;
  realBalance: number | null;
  demoBalance: number;
  netPL: number;
  activeMarkets: Array<{ symbol: Symbol; price: number; change: number }>;
  symbol: Symbol;
  handleSymbolChange: (symbol: Symbol) => void;
  addMarket: (symbol: Symbol) => void;
  removeMarket: (symbol: Symbol) => void;
  orders: Order[]; // Active orders for header/positions components
  chartOrders: ChartOrder[]; // Combined orders for the chart
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
  priceMovements: Record<Symbol, PriceMovement>;
  setChartContextRef: (ref: any) => void;
  isMarketSwitching: boolean;
  timeFrame: TimeFrame;
  timeframeDurations: Array<{ value: TimeFrame; label: string }>;
  showExpiry: boolean;
  positionMarkers: any[];
  handleMarketSelect?: (marketSymbol: string) => void;
  bottomSpacing?: number;
  currency?: string; // Currency for displaying amounts (e.g., "USDT", "USD")
  // Tutorial callback (education overlays are handled locally)
  onTutorialClick?: () => void;
}

export default function DesktopLayout({
  balance = 0,
  realBalance = null,
  demoBalance = 10000,
  netPL = 0,
  activeMarkets = [],
  symbol,
  handleSymbolChange = () => {},
  addMarket = () => {},
  removeMarket = () => {},
  orders = [],
  chartOrders = [],
  currentPrice = 0,
  tradingMode = "demo",
  handleTradingModeChange = () => {},
  isLoadingWallet = false,
  handlePositionsChange = () => {},
  completedPositionsCount = 0,
  activePositionsCount = 0,
  placeOrder = async () => false,
  handleExpiryChange = () => {},
  selectedExpiryMinutes = 1,
  isInSafeZone = true,
  candleData = [],
  priceMovements = {},
  setChartContextRef = () => {},
  isMarketSwitching = false,
  timeFrame = "1m",
  timeframeDurations = [],
  showExpiry = true,
  positionMarkers = [],
  handleMarketSelect,
  bottomSpacing = 0,
  currency = "USD",
  onTutorialClick,
}: DesktopLayoutProps) {
  // Get theme from next-themes with hydration-safe handling
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only update after mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to dark mode during SSR/hydration, then use resolved theme after mount
  const isDarkMode = mounted ? resolvedTheme === "dark" : true;

  // Overlay states
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [showAnalyticsOverlay, setShowAnalyticsOverlay] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<"trading" | "protection" | "sizing" | "sounds" | "notifications">("trading");

  // Education overlay states
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);

  // Get completed orders for trading stats - use selector to prevent re-renders from other store changes
  const completedOrders = useBinaryStore((state) => state.completedOrders);

  // One-click trading hook
  const oneClickTrading = useOneClickTrading(balance * 0.5);

  // Martingale hook - use a default starting amount
  const defaultAmount = 1000;
  const martingale = useMartingale(defaultAmount);

  // Calculate trading stats for settings
  const tradingStats = useMemo(() => {
    const wins = completedOrders.filter(o => o.status === "WIN");
    const losses = completedOrders.filter(o => o.status === "LOSS");
    const winRate = completedOrders.length > 0 ? (wins.length / completedOrders.length) * 100 : 55;
    const avgProfit = wins.length > 0 ? wins.reduce((sum, o) => sum + (o.profit || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, o) => sum + Math.abs(o.profit || 0), 0) / losses.length : 0;
    return { winRate, avgProfit, avgLoss };
  }, [completedOrders]);

  // Get chart type setting from binary settings store
  // Use specific selector to only subscribe to chartType changes, not the entire settings object
  const binaryChartType = useBinaryStore((state) => state.binarySettings?.display?.chartType) || "CHART_ENGINE";

  // Hide sidebar when using Chart Engine as orders are displayed directly on the chart
  // with P/L zones, entry markers, and countdown timers. Show sidebar for other chart types.
  const useChartEngine = binaryChartType === "CHART_ENGINE";
  const showPositionsSidebar = !useChartEngine;

  // Default price movement if not available for the current symbol
  const defaultPriceMovement = {
    direction: "neutral" as const,
    percent: 0,
    strength: "weak" as const,
  };

  // Helper to close all overlays
  const closeAllOverlays = useCallback(() => {
    setShowSettingsOverlay(false);
    setShowAnalyticsOverlay(false);
    setShowPatternLibrary(false);
    setShowLeaderboard(false);
    setShowChallenges(false);
    setSettingsInitialTab("trading");
  }, []);

  // Check if any parent overlay is open (to close chart internal overlays)
  const isAnyOverlayOpen = showSettingsOverlay || showAnalyticsOverlay || showPatternLibrary || showLeaderboard || showChallenges;

  // Settings overlay handlers - toggle behavior, close all others when opening settings
  const handleToggleSettings = useCallback(() => {
    setShowSettingsOverlay((prev) => {
      if (!prev) {
        // Opening settings, close all others
        setShowAnalyticsOverlay(false);
        setShowPatternLibrary(false);
        setShowLeaderboard(false);
        setShowChallenges(false);
      }
      return !prev;
    });
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettingsOverlay(false);
    // Reset to default tab when closing
    setSettingsInitialTab("trading");
  }, []);

  // Open settings with a specific tab (used by chart for notification settings)
  const handleOpenSettingsWithTab = useCallback((tab: "trading" | "protection" | "sizing" | "sounds" | "notifications") => {
    setSettingsInitialTab(tab);
    setShowSettingsOverlay(true);
    // Close all other overlays
    setShowAnalyticsOverlay(false);
    setShowPatternLibrary(false);
    setShowLeaderboard(false);
    setShowChallenges(false);
  }, []);

  // Analytics overlay handlers - toggle behavior, close all others when opening analytics
  const handleToggleAnalytics = useCallback(() => {
    setShowAnalyticsOverlay((prev) => {
      if (!prev) {
        // Opening analytics, close all others
        setShowSettingsOverlay(false);
        setShowPatternLibrary(false);
        setShowLeaderboard(false);
        setShowChallenges(false);
        setSettingsInitialTab("trading");
      }
      return !prev;
    });
  }, []);

  const handleCloseAnalytics = useCallback(() => {
    setShowAnalyticsOverlay(false);
  }, []);

  // Education overlay handlers - toggle behavior, close all others when opening
  const handlePatternLibraryClick = useCallback(() => {
    setShowPatternLibrary((prev) => {
      if (!prev) {
        // Opening, close all others
        setShowSettingsOverlay(false);
        setShowAnalyticsOverlay(false);
        setShowLeaderboard(false);
        setShowChallenges(false);
        setSettingsInitialTab("trading");
      }
      return !prev;
    });
  }, []);

  const handleLeaderboardClick = useCallback(() => {
    setShowLeaderboard((prev) => {
      if (!prev) {
        // Opening, close all others
        setShowSettingsOverlay(false);
        setShowAnalyticsOverlay(false);
        setShowPatternLibrary(false);
        setShowChallenges(false);
        setSettingsInitialTab("trading");
      }
      return !prev;
    });
  }, []);

  const handleChallengesClick = useCallback(() => {
    setShowChallenges((prev) => {
      if (!prev) {
        // Opening, close all others
        setShowSettingsOverlay(false);
        setShowAnalyticsOverlay(false);
        setShowPatternLibrary(false);
        setShowLeaderboard(false);
        setSettingsInitialTab("trading");
      }
      return !prev;
    });
  }, []);

  // Handler to close all parent overlays - used by chart's internal overlays (like notification center)
  const handleCloseParentOverlays = useCallback(() => {
    closeAllOverlays();
  }, [closeAllOverlays]);

  return (
    <div className="flex flex-col" style={{ height: `calc(var(--vh, 1vh) * 100 - ${bottomSpacing}px)`, transition: 'height 0.3s ease-in-out' }}>
      <Header
        balance={balance}
        realBalance={realBalance}
        demoBalance={demoBalance}
        netPL={netPL}
        activeMarkets={activeMarkets}
        currentSymbol={symbol}
        onSelectSymbol={handleSymbolChange}
        onAddMarket={addMarket}
        onRemoveMarket={removeMarket}
        orders={orders}
        currentPrice={currentPrice}
        isMobile={false}
        tradingMode={tradingMode}
        onTradingModeChange={handleTradingModeChange}
        isLoadingWallet={isLoadingWallet}
        handleMarketSelect={handleMarketSelect}
        onSettingsClick={handleToggleSettings}
        onAnalyticsClick={handleToggleAnalytics}
        completedTradesCount={completedOrders.length}
        onTutorialClick={onTutorialClick}
        onPatternLibraryClick={handlePatternLibraryClick}
        onLeaderboardClick={handleLeaderboardClick}
        onChallengesClick={handleChallengesClick}
        // Pass overlay open states for active button styling
        isSettingsOpen={showSettingsOverlay}
        isAnalyticsOpen={showAnalyticsOverlay}
        isPatternLibraryOpen={showPatternLibrary}
        isLeaderboardOpen={showLeaderboard}
        isChallengesOpen={showChallenges}
      />

      <div className="flex flex-1 min-h-0 w-full overflow-hidden h-full">
        {/* Active positions sidebar - shown for TradingView and other chart types,
            hidden for Chart Engine as orders are displayed directly on the chart
            with P/L zones, entry markers, and countdown timers.
            Always show the sidebar when using TradingView (even if no active positions)
            since TradingView can't visualize orders on the chart */}
        {showPositionsSidebar && (
          <ActivePositions
            orders={(orders || []).filter(
              (order) => order.status === "PENDING"
            )}
            currentPrice={currentPrice}
            onPositionsChange={handlePositionsChange}
            className="relative z-40 h-full"
            hasCompletedPositions={completedPositionsCount > 0}
            theme={isDarkMode ? "dark" : "light"}
          />
        )}

        {/* Chart area */}
        <div className="flex-1 min-w-0 relative z-0 h-full">
          <ChartContainer
            key={`binary-desktop-chart-${symbol}-${isMarketSwitching ? 'switching' : 'stable'}`}
            symbol={symbol}
            timeFrame={timeFrame}
            orders={(chartOrders || []).filter((order) => order.symbol === symbol)}
            expiryMinutes={selectedExpiryMinutes}
            showExpiry={showExpiry}
            timeframeDurations={timeframeDurations}
            onChartContextReady={setChartContextRef}
            positions={positionMarkers}
            isMarketSwitching={isMarketSwitching}
            currency={currency}
            defaultOrderAmount={defaultAmount}
            onPlaceOrder={placeOrder}
            onOpenNotificationSettings={() => handleOpenSettingsWithTab("notifications")}
            onCloseParentOverlays={handleCloseParentOverlays}
            closeInternalOverlays={isAnyOverlayOpen}
          />

          {/* Trading Settings Overlay */}
          <TradingSettingsOverlay
            isOpen={showSettingsOverlay}
            onClose={handleCloseSettings}
            darkMode={isDarkMode}
            initialTab={settingsInitialTab}
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
            currentAmount={defaultAmount}
            onPlaceOrder={placeOrder}
            onSetAmount={() => {}}
          />

          {/* Analytics Overlay */}
          <AnalyticsOverlay
            isOpen={showAnalyticsOverlay}
            onClose={handleCloseAnalytics}
            theme={isDarkMode ? "dark" : "light"}
          />

          {/* Pattern Library Overlay */}
          <PatternLibrary
            isOpen={showPatternLibrary}
            onClose={() => setShowPatternLibrary(false)}
          />

          {/* Leaderboard Overlay */}
          <Leaderboard
            isOpen={showLeaderboard}
            onClose={() => setShowLeaderboard(false)}
          />

          {/* Demo Challenges Overlay */}
          <DemoChallenges
            isOpen={showChallenges}
            onClose={() => setShowChallenges(false)}
          />
        </div>

        {/* Order panel - fixed width on desktop with full height */}
        <div className="h-full">
          <OrderPanel
            currentPrice={currentPrice}
            symbol={symbol}
            onPlaceOrder={placeOrder}
            onExpiryChange={handleExpiryChange}
            balance={balance}
            candleData={candleData}
            priceMovement={
              priceMovements && symbol in priceMovements
                ? priceMovements[symbol]
                : defaultPriceMovement
            }
            isInSafeZone={isInSafeZone}
            tradingMode={tradingMode}
            darkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
}
