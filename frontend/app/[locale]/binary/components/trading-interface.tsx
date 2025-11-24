"use client";

import { useIsMobile } from "../hooks/use-trading-mobile";
import MobileLayout from "./layout/mobile-layout";
import DesktopLayout from "./layout/desktop-layout";
import CompletedPositions from "./positions/completed-positions";
import { useTheme } from "next-themes";
import {
  useBinaryStore,
  type TimeFrame,
  extractBaseCurrency,
  extractQuoteCurrency,
  formatPairFromSymbol,
} from "@/store/trade/use-binary-store";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { marketDataWs, type OHLCVData } from "@/services/market-data-ws";
import { tickersWs } from "@/services/tickers-ws";

export default function TradingInterface({
  currentSymbol: propCurrentSymbol,
  onSymbolChange,
}: {
  currentSymbol: string;
  onSymbolChange: (symbol: string) => void;
}) {
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const currentTheme = theme === "system" ? "dark" : theme || "dark";
  const [completedPanelState, setCompletedPanelState] = useState({ isOpen: false, height: 500 });

  // Get all available properties and functions from the binary store
  const {
    currentSymbol: storeCurrentSymbol,
    setCurrentSymbol: setStoreCurrentSymbol,
    currentPrice,
    balance,
    realBalance,
    demoBalance,
    netPL,
    activeMarkets,
    addMarket,
    removeMarket,
    orders,
    completedOrders,
    tradingMode,
    setTradingMode,
    selectedExpiryMinutes,
    setSelectedExpiryMinutes,
    isInSafeZone,
    timeFrame,
    setTimeFrame,
    placeOrder,
    isMarketSwitching,
    priceMovements,
    isLoadingWallet,
    candleData,
    setCurrentPrice,
    setCandleData,
  } = useBinaryStore();

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

  // Memoized computed values to prevent unnecessary recalculations
  const computedValues = useMemo(() => {
    const hasCompletedPositions = completedOrders.length > 0;
    const activePositionsCount = orders.filter(order => order.status === "PENDING").length;
    const completedPositionsCount = completedOrders.length;
    const darkMode = currentTheme === "dark";
    const showExpiry = true;

    return {
      hasCompletedPositions,
      activePositionsCount,
      completedPositionsCount,
      darkMode,
      showExpiry,
    };
  }, [completedOrders.length, orders, currentTheme]);

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

  // Calculate bottom padding for desktop layout
  // Always add 40px when panel exists (for collapsed header), plus panel height when open
  const desktopBottomPadding = !isMobile && computedValues.hasCompletedPositions
    ? (completedPanelState.isOpen ? completedPanelState.height + 40 : 40)
    : 0;

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
        />
      )}

      {/* Completed positions panel - only render on desktop if there are completed positions */}
      {!isMobile && computedValues.hasCompletedPositions && (
        <CompletedPositions
          theme={computedValues.darkMode ? "dark" : "light"}
          onPanelStateChange={(isOpen, height) => {
            setCompletedPanelState({ isOpen, height });
          }}
        />
      )}
    </>
  );
}
