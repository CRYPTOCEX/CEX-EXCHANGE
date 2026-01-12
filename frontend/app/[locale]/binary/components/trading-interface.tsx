"use client";

import { useTradingMobile } from "../hooks/use-trading-mobile";
import MobileLayout from "./layout/mobile-layout";
import DesktopLayout from "./layout/desktop-layout";
import { useTheme } from "next-themes";
import {
  useBinaryStore,
  type TimeFrame,
  type OrderSide,
  extractBaseCurrency,
  extractQuoteCurrency,
} from "@/store/trade/use-binary-store";
import { useShallow } from "zustand/react/shallow";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { marketDataWs, type OHLCVData } from "@/services/market-data-ws";
import { tickersWs } from "@/services/tickers-ws";
import TutorialOverlay from "./tutorial/tutorial-overlay";
import { useTutorial } from "../hooks/use-tutorial";
import { useTradingSettingsStore } from "@/store/trade/use-trading-settings-store";
import { notifyTradeWin, notifyTradeLoss, ToastContainer } from "@/components/binary/notifications";
import { AudioFeedback, type IAudioFeedback } from "@/components/binary/audio-feedback";

export default function TradingInterface({
  currentSymbol: propCurrentSymbol,
  onSymbolChange,
}: {
  currentSymbol: string;
  onSymbolChange: (symbol: string) => void;
}) {
  const { isMobile } = useTradingMobile();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only update theme after mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use resolvedTheme which gives the actual theme (respects system preference)
  // Default to dark during SSR/hydration to match server render
  const currentTheme = mounted ? (resolvedTheme || theme || "dark") : "dark";

  // Get state values from binary store using shallow selector to prevent unnecessary re-renders
  // IMPORTANT: Using useShallow prevents the component from re-rendering when unrelated store values change
  const {
    currentSymbol: storeCurrentSymbol,
    currentPrice,
    balance,
    realBalance,
    demoBalance,
    netPL,
    activeMarkets,
    orders,
    completedOrders,
    tradingMode,
    selectedExpiryMinutes,
    isInSafeZone,
    timeFrame,
    isMarketSwitching,
    priceMovements,
    isLoadingWallet,
    candleData,
    binaryMarkets,
  } = useBinaryStore(
    useShallow((state) => ({
      currentSymbol: state.currentSymbol,
      currentPrice: state.currentPrice,
      balance: state.balance,
      realBalance: state.realBalance,
      demoBalance: state.demoBalance,
      netPL: state.netPL,
      activeMarkets: state.activeMarkets,
      orders: state.orders,
      completedOrders: state.completedOrders,
      tradingMode: state.tradingMode,
      selectedExpiryMinutes: state.selectedExpiryMinutes,
      isInSafeZone: state.isInSafeZone,
      timeFrame: state.timeFrame,
      isMarketSwitching: state.isMarketSwitching,
      priceMovements: state.priceMovements,
      isLoadingWallet: state.isLoadingWallet,
      candleData: state.candleData,
      binaryMarkets: state.binaryMarkets,
    }))
  );

  // Get stable action references from the store - these don't change between renders
  // Access actions via getState() to avoid creating subscriptions
  const setStoreCurrentSymbol = useCallback((symbol: string) => {
    useBinaryStore.getState().setCurrentSymbol(symbol);
  }, []);
  const addMarket = useCallback((symbol: string) => {
    useBinaryStore.getState().addMarket(symbol);
  }, []);
  const removeMarket = useCallback((symbol: string) => {
    useBinaryStore.getState().removeMarket(symbol);
  }, []);
  const setTradingMode = useCallback((mode: "demo" | "real") => {
    useBinaryStore.getState().setTradingMode(mode);
  }, []);
  const setSelectedExpiryMinutes = useCallback((minutes: number) => {
    useBinaryStore.getState().setSelectedExpiryMinutes(minutes);
  }, []);
  const setTimeFrame = useCallback((tf: TimeFrame) => {
    useBinaryStore.getState().setTimeFrame(tf);
  }, []);
  const placeOrder = useCallback(async (side: OrderSide, amount: number, expiryMinutes: number) => {
    return useBinaryStore.getState().placeOrder(side, amount, expiryMinutes);
  }, []);
  const setCurrentPrice = useCallback((price: number) => {
    useBinaryStore.getState().setCurrentPrice(price);
  }, []);
  const setCandleData = useCallback((data: any[]) => {
    useBinaryStore.getState().setCandleData(data);
  }, []);

  // Use the prop currentSymbol instead of store currentSymbol
  const currentSymbol = propCurrentSymbol;

  // Memoize timeframe durations to prevent recreation
  const timeframeDurations = useMemo(() => [
    { value: "1m" as TimeFrame, label: "1m" },
    { value: "3m" as TimeFrame, label: "3m" },
    { value: "5m" as TimeFrame, label: "5m" },
    { value: "15m" as TimeFrame, label: "15m" },
    { value: "30m" as TimeFrame, label: "30m" },
    { value: "1h" as TimeFrame, label: "1h" },
    { value: "4h" as TimeFrame, label: "4h" },
    { value: "1d" as TimeFrame, label: "1d" },
  ], []);

  // Chart context ref for chart interactions
  const chartContextRef = useRef(null);
  const setChartContextRef = useCallback((ref: any) => {
    chartContextRef.current = ref;
  }, []);

  // WebSocket subscription cleanup refs
  const unsubscribeTickerRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile-specific state with proper initialization
  const [mobileState, setMobileState] = useState(() => ({
    activePanel: "chart" as "chart" | "order" | "positions",
    showMobileOrderPanel: false,
    showMobilePositions: false,
    showQuickTradeButtons: true,
  }));

  // Memoized mobile state handlers to prevent recreation
  const mobileHandlers = useMemo(() => ({
    setActivePanel: (panel: "chart" | "order" | "positions") =>
      setMobileState(prev => ({ ...prev, activePanel: panel })),
    toggleMobileOrderPanel: () =>
      setMobileState(prev => ({ ...prev, showMobileOrderPanel: !prev.showMobileOrderPanel })),
    toggleMobilePositions: () =>
      setMobileState(prev => ({ ...prev, showMobilePositions: !prev.showMobilePositions })),
    toggleQuickTradeButtons: () =>
      setMobileState(prev => ({ ...prev, showQuickTradeButtons: !prev.showQuickTradeButtons })),
    setShowMobileOrderPanel: (show: boolean) =>
      setMobileState(prev => ({ ...prev, showMobileOrderPanel: show })),
    setShowMobilePositions: (show: boolean) =>
      setMobileState(prev => ({ ...prev, showMobilePositions: show })),
  }), []);

  // Tutorial hook for interactive onboarding
  const tutorial = useTutorial({
    tutorialId: "binary-trading-intro",
    autoStart: true,
    autoStartDelay: 2000,
  });

  // Tutorial callback
  const handleTutorialClick = useCallback(() => {
    tutorial.startTutorial();
  }, [tutorial]);

  // Audio feedback for trade results - uses global settings store
  const audioConfig = useTradingSettingsStore((state) => state.audio);
  const audioFeedbackRef = useRef<IAudioFeedback | null>(null);
  // Track order IDs we've already sent notifications for (persists across re-renders)
  const notifiedOrderIdsRef = useRef<Set<string>>(new Set());
  // Track if initial data has loaded (to avoid notifying for historical orders)
  const isInitializedRef = useRef<boolean>(false);
  // Track the last symbol we were initialized for
  const lastInitializedSymbolRef = useRef<string | null>(null);

  // Initialize audio feedback
  useEffect(() => {
    audioFeedbackRef.current = new AudioFeedback(audioConfig);
    return () => {
      audioFeedbackRef.current?.dispose();
    };
  }, []);

  // Sync audio config when it changes
  useEffect(() => {
    if (audioFeedbackRef.current) {
      audioFeedbackRef.current.setConfig(audioConfig);
    }
  }, [audioConfig]);

  // Play sounds and show notifications when trades complete
  useEffect(() => {
    // If symbol changed, reset the initialization state
    // This prevents notifications for existing orders when switching markets
    if (lastInitializedSymbolRef.current !== currentSymbol) {
      isInitializedRef.current = false;
      lastInitializedSymbolRef.current = currentSymbol;
      // Clear notified IDs since we're switching to a new symbol
      notifiedOrderIdsRef.current.clear();
    }

    // If not initialized yet, mark all current orders as "already notified"
    // This prevents showing notifications for historical orders on page load or market switch
    if (!isInitializedRef.current) {
      // Add all current completed order IDs to the notified set
      for (const order of completedOrders) {
        notifiedOrderIdsRef.current.add(order.id);
      }
      // Mark as initialized after a short delay to allow initial fetch to complete
      // This handles the case where completedOrders updates multiple times during init
      const initTimeout = setTimeout(() => {
        // Only mark as initialized if we're still on the same symbol
        if (lastInitializedSymbolRef.current === currentSymbol) {
          isInitializedRef.current = true;
        }
      }, 2000); // 2 second delay to allow initial data to settle
      return () => clearTimeout(initTimeout);
    }

    // After initialization, check for new orders we haven't notified about
    for (const order of completedOrders) {
      // Skip if we've already notified about this order
      if (notifiedOrderIdsRef.current.has(order.id)) {
        continue;
      }

      // Mark as notified immediately to prevent duplicate notifications
      notifiedOrderIdsRef.current.add(order.id);

      if (order.status === "WIN") {
        // Play win sound
        audioFeedbackRef.current?.playWin();

        // Show notification - profit is positive for wins
        const profit = order.profit || 0;
        notifyTradeWin({
          orderId: order.id,
          symbol: order.symbol,
          side: order.side,
          amount: order.amount,
          profit: profit,
          profitPercentage: profit > 0 ? (profit / order.amount) * 100 : 0,
        });
      } else if (order.status === "LOSS") {
        // Play loss sound
        audioFeedbackRef.current?.playLoss();

        // Show notification - profit should be negative for losses
        // Display the loss amount as negative
        const lossAmount = -order.amount;
        notifyTradeLoss({
          orderId: order.id,
          symbol: order.symbol,
          side: order.side,
          amount: order.amount,
          profit: lossAmount, // Negative value for loss
          profitPercentage: -100, // -100% means total loss
        });
      }
    }

    // Clean up old order IDs from the set to prevent memory leak
    // Keep only IDs that are still in completedOrders
    const currentIds = new Set(completedOrders.map(o => o.id));
    for (const id of notifiedOrderIdsRef.current) {
      if (!currentIds.has(id)) {
        notifiedOrderIdsRef.current.delete(id);
      }
    }
  }, [completedOrders, currentSymbol]);

  // Memoized computed values to prevent unnecessary recalculations
  const computedValues = useMemo(() => {
    const activePositionsCount = orders.filter(order => order.status === "PENDING").length;
    const completedPositionsCount = completedOrders.length;
    const darkMode = currentTheme === "dark";
    const showExpiry = true;
    // Extract quote currency from symbol (e.g., "BTC/USDT" -> "USDT")
    const currency = extractQuoteCurrency(currentSymbol, binaryMarkets) || "USD";

    return {
      activePositionsCount,
      completedPositionsCount,
      darkMode,
      showExpiry,
      currency,
    };
  }, [completedOrders.length, orders, currentTheme, currentSymbol, binaryMarkets]);

  // Chart order type for combined active and completed orders
  type ChartOrderStatus = "PENDING" | "WIN" | "LOSS";
  interface ChartOrder {
    id: string;
    symbol: string;
    side: OrderSide;
    amount: number;
    entryPrice: number;
    entryTime: number;
    expiryTime: number;
    closePrice?: number;
    status: ChartOrderStatus;
    profit?: number;
    profitPercentage?: number;
    isDemo?: boolean;
    // Type-specific fields for different order types
    type?: "RISE_FALL" | "HIGHER_LOWER" | "TOUCH_NO_TOUCH" | "CALL_PUT" | "TURBO";
    barrier?: number;
    strikePrice?: number;
    payoutPerPoint?: number;
  }

  // Memoized combined orders for the chart (both active and completed)
  // This ensures completed orders show on the chart with their results
  const chartOrders = useMemo((): ChartOrder[] => {
    // Map active orders to chart format
    const activeChartOrders: ChartOrder[] = orders.map(order => ({
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      amount: order.amount,
      entryPrice: order.entryPrice,
      entryTime: order.createdAt,
      expiryTime: order.expiryTime,
      closePrice: order.closePrice,
      status: (order.status === "PENDING" ? "PENDING" : order.status === "win" ? "WIN" : "LOSS") as ChartOrderStatus,
      profit: order.profit,
      profitPercentage: order.profitPercentage,
      isDemo: order.mode === "demo",
      // Include type-specific fields for proper chart rendering
      type: order.type,
      barrier: order.barrier,
      strikePrice: order.strikePrice,
      payoutPerPoint: order.payoutPerPoint,
    }));

    // Map completed orders to chart format
    const completedChartOrders: ChartOrder[] = completedOrders.map(order => ({
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      amount: order.amount,
      entryPrice: order.entryPrice,
      entryTime: new Date(order.entryTime).getTime(),
      expiryTime: new Date(order.expiryTime).getTime(),
      closePrice: order.closePrice,
      status: order.status as ChartOrderStatus,
      profit: order.profit,
      profitPercentage: order.profitPercentage,
      // Include type-specific fields for proper chart rendering
      type: order.type,
      barrier: order.barrier,
      strikePrice: order.strikePrice,
      payoutPerPoint: order.payoutPerPoint,
    }));

    // FIXED: Use Set for O(n) uniqueness instead of O(n²) filter with findIndex
    // This significantly improves performance with large order lists
    const seenIds = new Set<string>();
    const uniqueOrders: ChartOrder[] = [];

    for (const order of activeChartOrders) {
      if (!seenIds.has(order.id)) {
        seenIds.add(order.id);
        uniqueOrders.push(order);
      }
    }

    for (const order of completedChartOrders) {
      if (!seenIds.has(order.id)) {
        seenIds.add(order.id);
        uniqueOrders.push(order);
      }
    }

    return uniqueOrders;
  }, [orders, completedOrders]);

  // Memoized position markers to prevent recreation
  const positionMarkers = useMemo(() => {
    return orders
      .filter(order => order.status === "PENDING" && order.symbol === currentSymbol)
      .map(order => ({
        id: order.id,
        entryTime: Math.floor(new Date(order.createdAt).getTime() / 1000),
        entryPrice: order.entryPrice,
        expiryTime: Math.floor(new Date(order.expiryTime).getTime() / 1000),
        type: order.side,
        amount: order.amount,
      }));
  }, [orders, currentSymbol]);

  // Optimized cleanup function with proper error handling
  const cleanupSubscriptions = useCallback(() => {
    try {
      if (unsubscribeTickerRef.current) {
        unsubscribeTickerRef.current();
        unsubscribeTickerRef.current = null;
      }
      
      // Clear any cached chart data
      if (chartContextRef.current && typeof (chartContextRef.current as any).clearSymbolCache === 'function') {
        const currentStoreSymbol = useBinaryStore.getState().currentSymbol;
        if (currentStoreSymbol) {
          (chartContextRef.current as any).clearSymbolCache(currentStoreSymbol);
        }
      }
      
      // Ensure WebSocket subscriptions are properly cleaned up
      if (currentSymbol) {
        // Force unsubscribe from any existing subscriptions for this symbol
        tickersWs.unsubscribeFromSymbol(currentSymbol);
      }
    } catch (error) {
      console.warn("Error during subscription cleanup:", error);
    }
  }, [currentSymbol]);

  // Enhanced symbol change handler with debouncing and proper cleanup
  const handleSymbolChange = useCallback((symbol: string) => {
    // Prevent unnecessary changes
    if (symbol === currentSymbol) {
      return;
    }
    
    // Clear any pending cleanup timeout
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
    
    // Convert symbol format: change - to /
    const formattedSymbol = symbol.replace('-', '/');
    
    // Clean up current subscriptions before switching
    cleanupSubscriptions();
    
    // Clear current chart data to show loading state immediately
    setCurrentPrice(0);
    
    // Clear any cached chart data for the old symbol (if chart context is available)
    if (chartContextRef.current && typeof (chartContextRef.current as any).clearSymbolCache === 'function') {
      (chartContextRef.current as any).clearSymbolCache(currentSymbol);
    }
    
    // Set market switching flag to true to prevent duplicate subscriptions
    useBinaryStore.getState().isMarketSwitching = true;
    
    // Debounced update to prevent rapid symbol changes
    cleanupTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        // Update store symbol (this will trigger wallet fetch and other updates)
        setStoreCurrentSymbol(formattedSymbol);
        
        // Update URL and component state (this will trigger the useEffect for WebSocket subscriptions)
        onSymbolChange(formattedSymbol);
        
        // Add the new market to active markets
        addMarket(formattedSymbol);
        
        // Reset market switching flag after a short delay to allow subscriptions to settle
        setTimeout(() => {
          if (isMountedRef.current) {
            useBinaryStore.getState().isMarketSwitching = false;
          }
        }, 300);
      }
    }, 100); // Small delay to ensure cleanup completes
  }, [currentSymbol, cleanupSubscriptions, setStoreCurrentSymbol, onSymbolChange, addMarket, setCurrentPrice]);

  // Memoized market selection handler
  const handleMarketSelect = useCallback((symbol: string) => {
    // Prevent unnecessary changes
    if (symbol === currentSymbol) {
      return;
    }

    // Process the market switch
    handleSymbolChange(symbol);
  }, [currentSymbol, handleSymbolChange]);

  // Memoized positions change handler
  const handlePositionsChange = useCallback((positions: any[]) => {
    // This could be used to update chart markers or other position-related UI
    // For now, it's a placeholder for future position management features
  }, []);

  // Set up component lifecycle management with proper cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initialize market data service
    marketDataWs.initialize();
    
    return () => {
      isMountedRef.current = false;
      
      // Clear any pending timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
      
      // Clean up subscriptions
      cleanupSubscriptions();
      
      // Reset market switching flag
      useBinaryStore.getState().isMarketSwitching = false;
    };
  }, [cleanupSubscriptions]);

  // Optimized symbol synchronization with store
  useEffect(() => {
    // Only run when symbols actually change to prevent unnecessary updates
    if (storeCurrentSymbol && storeCurrentSymbol !== currentSymbol) {
      // Use requestAnimationFrame to defer state updates and prevent setState during render
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          onSymbolChange(storeCurrentSymbol);
          addMarket(storeCurrentSymbol);
        }
      });
    } else if (currentSymbol && currentSymbol !== "" && !storeCurrentSymbol) {
      // Use requestAnimationFrame to defer state updates
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setStoreCurrentSymbol(currentSymbol);
          addMarket(currentSymbol);
        }
      });
    }
  }, [storeCurrentSymbol, currentSymbol, onSymbolChange, addMarket, setStoreCurrentSymbol]);

  // Optimized market data subscription with proper cleanup and error handling
  useEffect(() => {
    // Skip if no symbol, component unmounted, or market is currently switching
    if (!currentSymbol || currentSymbol === "" || !isMountedRef.current || useBinaryStore.getState().isMarketSwitching) {
      return;
    }

    // Debounced subscription to prevent rapid re-subscriptions
    const subscriptionTimeout = setTimeout(() => {
      if (!isMountedRef.current || !currentSymbol) {
        return;
      }

      // Clean up previous subscriptions first
      cleanupSubscriptions();

      try {
        // Subscribe to ticker data for real-time price updates with optimized callback
        const unsubscribeTicker = tickersWs.subscribeToSpotData((data) => {
          if (!isMountedRef.current) return;
          
          // Validate that we're still subscribed to the same symbol
          const currentStoreSymbol = useBinaryStore.getState().currentSymbol;
          if (currentStoreSymbol !== currentSymbol) {
            return;
          }

          // Try different symbol formats to find the price
          let price = data[currentSymbol]?.last;

          // If not found, try alternative formats
          if (typeof price !== "number") {
            // Try with / separator
            const symbolWithSlash = currentSymbol.includes('/') 
              ? currentSymbol 
              : currentSymbol.replace(/([A-Z]+)([A-Z]{3,4})$/, '$1/$2');
            price = data[symbolWithSlash]?.last;

            // Additional fallback: try common format variations
            if (typeof price !== "number") {
              const baseCurrency = extractBaseCurrency(currentSymbol);
              const quoteCurrency = extractQuoteCurrency(currentSymbol);
              
              // Try various combinations using extracted base/quote
              const variations = [
                `${baseCurrency}${quoteCurrency}`,          // BTCUSDT
                `${baseCurrency}/${quoteCurrency}`,         // BTC/USDT
                `${baseCurrency}-${quoteCurrency}`,         // BTC-USDT
                `${baseCurrency}_${quoteCurrency}`,         // BTC_USDT
                currentSymbol.toUpperCase(),                // Original uppercase
                currentSymbol.toLowerCase(),                // Original lowercase
                // Also try with reversed case
                `${baseCurrency.toLowerCase()}${quoteCurrency.toLowerCase()}`,
                `${baseCurrency.toUpperCase()}/${quoteCurrency.toUpperCase()}`,
                `${baseCurrency.toUpperCase()}-${quoteCurrency.toUpperCase()}`,
                `${baseCurrency.toLowerCase()}/${quoteCurrency.toLowerCase()}`,
                `${baseCurrency.toLowerCase()}-${quoteCurrency.toLowerCase()}`,
              ];
              
              for (const variation of variations) {
                price = data[variation]?.last;
                if (typeof price === "number") {
                  break;
                }
              }
            }
          }

          if (typeof price === "number") {
            // Use requestAnimationFrame to defer price updates and prevent setState during render
            requestAnimationFrame(() => {
              if (isMountedRef.current) {
                setCurrentPrice(price);
              }
            });
          }
        });

        // Store the unsubscribe function
        unsubscribeTickerRef.current = unsubscribeTicker;
      } catch (error) {
        console.error("Error setting up market data subscription:", error);
      }
    }, 50); // Small debounce delay

    // Cleanup function
    return () => {
      clearTimeout(subscriptionTimeout);
    };
  }, [currentSymbol, cleanupSubscriptions, setCurrentPrice, isMarketSwitching]);

  // No bottom padding needed - trading history moved to analytics overlay
  const desktopBottomPadding = 0;

  // Render the appropriate layout
  return (
    <>
      {isMobile ? (
        <MobileLayout
          balance={balance}
          netPL={netPL}
          activeMarkets={activeMarkets}
          symbol={currentSymbol}
          handleSymbolChange={handleSymbolChange}
          addMarket={addMarket}
          removeMarket={removeMarket}
          orders={orders}
          chartOrders={chartOrders}
          currentPrice={currentPrice}
          tradingMode={tradingMode}
          handleTradingModeChange={setTradingMode}
          isLoadingWallet={isLoadingWallet}
          handlePositionsChange={handlePositionsChange}
          completedPositionsCount={computedValues.completedPositionsCount}
          activePositionsCount={computedValues.activePositionsCount}
          placeOrder={placeOrder}
          handleExpiryChange={setSelectedExpiryMinutes}
          selectedExpiryMinutes={selectedExpiryMinutes}
          isInSafeZone={isInSafeZone}
          candleData={candleData}
          priceMovements={priceMovements}
          activePanel={mobileState.activePanel}
          setActivePanel={mobileHandlers.setActivePanel}
          showMobileOrderPanel={mobileState.showMobileOrderPanel}
          setShowMobileOrderPanel={mobileHandlers.setShowMobileOrderPanel}
          showMobilePositions={mobileState.showMobilePositions}
          setShowMobilePositions={mobileHandlers.setShowMobilePositions}
          showQuickTradeButtons={mobileState.showQuickTradeButtons}
          toggleMobileOrderPanel={mobileHandlers.toggleMobileOrderPanel}
          toggleMobilePositions={mobileHandlers.toggleMobilePositions}
          toggleQuickTradeButtons={mobileHandlers.toggleQuickTradeButtons}
          setChartContextRef={setChartContextRef}
          isMarketSwitching={isMarketSwitching}
          timeFrame={timeFrame}
          handleTimeFrameChange={setTimeFrame}
          timeframeDurations={timeframeDurations}
          showExpiry={computedValues.showExpiry}
          positionMarkers={positionMarkers}
          darkMode={computedValues.darkMode}
          onDarkModeChange={() => {}}
          handleMarketSelect={handleMarketSelect}
          currency={computedValues.currency}
        />
      ) : (
        <DesktopLayout
          balance={balance}
          realBalance={realBalance}
          demoBalance={demoBalance}
          netPL={netPL}
          activeMarkets={activeMarkets}
          symbol={currentSymbol}
          handleSymbolChange={handleSymbolChange}
          addMarket={addMarket}
          removeMarket={removeMarket}
          orders={orders}
          chartOrders={chartOrders}
          currentPrice={currentPrice}
          tradingMode={tradingMode}
          handleTradingModeChange={setTradingMode}
          isLoadingWallet={isLoadingWallet}
          handlePositionsChange={handlePositionsChange}
          completedPositionsCount={computedValues.completedPositionsCount}
          activePositionsCount={computedValues.activePositionsCount}
          placeOrder={placeOrder}
          handleExpiryChange={setSelectedExpiryMinutes}
          selectedExpiryMinutes={selectedExpiryMinutes}
          isInSafeZone={isInSafeZone}
          candleData={candleData}
          priceMovements={priceMovements}
          setChartContextRef={setChartContextRef}
          isMarketSwitching={isMarketSwitching}
          timeFrame={timeFrame}
          timeframeDurations={timeframeDurations}
          showExpiry={computedValues.showExpiry}
          positionMarkers={positionMarkers}
          handleMarketSelect={handleMarketSelect}
          bottomSpacing={desktopBottomPadding}
          currency={computedValues.currency}
          // Tutorial callback - education overlays are now handled in DesktopLayout
          onTutorialClick={handleTutorialClick}
        />
      )}

      {/* Interactive Tutorial Overlay */}
      <TutorialOverlay
        isOpen={tutorial.isOpen}
        onClose={tutorial.closeTutorial}
        onComplete={tutorial.completeTutorial}
        currentStep={tutorial.currentStep}
        setCurrentStep={tutorial.setCurrentStep}
        steps={tutorial.steps}
        allowSkip={true}
      />

      {/* Toast Container for trading notifications */}
      <ToastContainer darkMode={computedValues.darkMode} />
    </>
  );
}
