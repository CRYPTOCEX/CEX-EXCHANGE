"use client";

import React, { useState, useCallback, Suspense, useEffect } from "react";
import { useLayout } from "./providers/LayoutProvider";
import { useSettings } from "./providers/SettingsProvider";
import { useExtensionStatus } from "./providers/ExtensionStatusProvider";
import { WorkspaceContainer } from "./components/layout/WorkspaceContainer";
import { GridLayout } from "./components/layout/GridLayout";
import { Panel } from "./components/layout/Panel";
import { PanelSkeleton, HeaderSkeleton } from "./components/shared/Skeleton";
import { TradingHeader } from "./components/header/TradingHeader";
import { ChartPanel } from "./components/chart/ChartPanel";
import { OrderBookPanel } from "./components/orderbook/OrderBookPanel";
import { OrdersPanel } from "./components/orders/OrdersPanel";
import { TradingFormPanel } from "./components/trading/TradingFormPanel";
import { MarketsPanel } from "./components/markets/MarketsPanel";
import { SettingsModal } from "./components/settings/SettingsModal";
import { MobileTradingLayout } from "./components/mobile/MobileTradingLayout";
import { MobileMarketSelector } from "./components/mobile/MobileMarketSelector";
import TutorialOverlay from "./components/tutorial/TutorialOverlay";
import { useTutorial } from "./hooks/useTutorial";
import { useSearchParams } from "next/navigation";
import type { MarketType } from "./types/common";
import { marketDataWs, type TickerData } from "@/services/market-data-ws";
import { ordersWs } from "@/services/orders-ws";
import { tickersWs } from "@/services/tickers-ws";
import { useUserStore } from "@/store/user";
import { marketService } from "@/services/market-service";

// Responsive breakpoints
const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
};

type ScreenSize = "mobile" | "tablet" | "desktop";

function useScreenSize(): ScreenSize {
  // Initialize with a function to get correct initial value on client
  // This prevents a flash of wrong layout on tablets
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    if (typeof window === "undefined") return "desktop"; // SSR default
    const width = window.innerWidth;
    if (width < BREAKPOINTS.mobile) return "mobile";
    if (width < BREAKPOINTS.tablet) return "tablet";
    return "desktop";
  });

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.mobile) {
        setScreenSize("mobile");
      } else if (width < BREAKPOINTS.tablet) {
        setScreenSize("tablet");
      } else {
        setScreenSize("desktop");
      }
    };

    // Only update if different from initial to avoid unnecessary re-render
    const currentWidth = window.innerWidth;
    const currentSize =
      currentWidth < BREAKPOINTS.mobile ? "mobile" :
      currentWidth < BREAKPOINTS.tablet ? "tablet" : "desktop";

    if (currentSize !== screenSize) {
      setScreenSize(currentSize);
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);  

  return screenSize;
}

interface TradingProLayoutProps {
  initialSymbol?: string;
  marketType?: MarketType;
  chartProvider?: "tradingview" | "chart_engine";
}

// Positions panel for futures trading
function PositionsPanel({ symbol }: { symbol: string }) {
  return (
    <div className="h-full p-3 text-[var(--tp-text-secondary)] text-sm">
      <div className="text-xs text-[var(--tp-text-muted)] mb-2 uppercase tracking-wide">
        Open Positions
      </div>
      <div className="text-[var(--tp-text-muted)] text-xs">
        No open positions
      </div>
    </div>
  );
}

export function TradingProLayout({
  initialSymbol,
  marketType: initialMarketType,
  chartProvider,
}: TradingProLayoutProps) {
  const { layout, layoutMode } = useLayout();
  const { settings: userSettings } = useSettings();
  const { settings: adminSettings } = useExtensionStatus();
  const searchParams = useSearchParams();
  const screenSize = useScreenSize();

  // Responsive panel visibility
  const isMobile = screenSize === "mobile";
  const isTablet = screenSize === "tablet";
  const isDesktop = screenSize === "desktop";

  // Tutorial for new users - only auto-start on non-mobile screens
  const tutorial = useTutorial({
    tutorialId: "trading-pro-intro",
    autoStart: !isMobile, // Don't auto-start on mobile - different layout
    autoStartDelay: 2000,
  });

  // Parse initial symbol - convert from URL format (BTC-USDT or BTC_USDT) to internal format (BTC/USDT)
  const normalizeSymbol = (symbol: string | undefined): string => {
    if (!symbol) return "BTC/USDT";
    // Handle both hyphen and underscore formats
    if (symbol.includes("-")) return symbol.replace("-", "/");
    if (symbol.includes("_")) return symbol.replace("_", "/");
    return symbol;
  };

  // Parse market type from URL - convert spot-eco to eco
  const normalizeMarketType = (type: string | null): MarketType => {
    if (type === "spot-eco") return "eco";
    if (type === "futures") return "futures";
    if (type === "eco") return "eco";
    return "spot";
  };

  // State
  const [currentSymbol, setCurrentSymbol] = useState(
    normalizeSymbol(initialSymbol)
  );
  const [marketType, setMarketType] = useState<MarketType>(
    initialMarketType || normalizeMarketType(searchParams?.get("type"))
  );
  const [showMobileMarketSelector, setShowMobileMarketSelector] = useState(false);
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [currentMarket, setCurrentMarket] = useState<any>(null);

  // Get user for orders WebSocket
  const { user } = useUserStore();

  // Subscribe to market data to get metadata for current symbol
  // This also triggers the initial fetch so market data is available on page load
  useEffect(() => {
    const subscribeToMarkets = () => {
      // Subscribe to spot markets
      const unsubscribeSpot = marketService.subscribeToSpotMarkets((markets) => {
        if (marketType !== "futures") {
          const market = markets.find(m => m.symbol === currentSymbol);
          if (market) {
            setCurrentMarket(market);
          }
        }
      });

      // Subscribe to futures markets
      const unsubscribeFutures = marketService.subscribeToFuturesMarkets((markets) => {
        if (marketType === "futures") {
          const market = markets.find(m => m.symbol === currentSymbol);
          if (market) {
            setCurrentMarket(market);
          }
        }
      });

      return () => {
        unsubscribeSpot();
        unsubscribeFutures();
      };
    };

    // Initialize tickers WebSocket for live price updates
    tickersWs.initialize();

    // Trigger initial fetch if not already fetched
    // This ensures market data is available on page load for all screen sizes
    if (!marketService.isSpotDataFetched()) {
      marketService.getSpotMarkets();
    }
    if (!marketService.isFuturesDataFetched()) {
      marketService.getFuturesMarkets();
    }

    const unsubscribe = subscribeToMarkets();
    return () => unsubscribe();
  }, [currentSymbol, marketType]);

  // Subscribe to ticker data for mobile header
  useEffect(() => {
    if (!isMobile) return;

    marketDataWs.initialize();

    const wsMarketType = marketType === "futures" ? "futures" : marketType === "eco" ? "eco" : "spot";

    const unsubscribe = marketDataWs.subscribe<TickerData>(
      {
        symbol: currentSymbol,
        type: "ticker",
        marketType: wsMarketType,
      },
      (data) => {
        if (data) {
          setTicker(data);
        }
      }
    );

    return () => unsubscribe();
  }, [currentSymbol, marketType, isMobile]);

  // Initialize orders WebSocket for real-time order updates
  useEffect(() => {
    if (!user?.id) return;

    // Initialize orders WebSocket service
    ordersWs.initialize();

    // Determine the market type for orders WS
    const ordersMarketType = marketType === "futures" ? "futures" : marketType === "eco" ? "eco" : "spot";

    // Subscribe to keep connection alive and dispatch events for order updates
    const unsubscribe = ordersWs.subscribe(
      {
        userId: user.id,
        marketType: ordersMarketType,
      },
      () => {
        // Dispatch event to notify OrdersPanel of updates
        window.dispatchEvent(new CustomEvent("tp-order-updated"));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, marketType]);

  // Handle symbol change
  const handleSymbolChange = useCallback(
    (symbol: string, type?: MarketType) => {
      setCurrentSymbol(symbol);
      if (type) {
        setMarketType(type);
      }

      // Update URL - use hyphen format for consistency with old layout
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        // Convert symbol from BTC/USDT to BTC-USDT format for URL
        const urlSymbol = symbol.replace("/", "-");
        url.searchParams.set("symbol", urlSymbol);
        if (type) {
          // Convert market type for URL (eco -> spot-eco for consistency)
          const urlType = type === "eco" ? "spot-eco" : type;
          url.searchParams.set("type", urlType);
        }
        window.history.pushState({}, "", url.toString());
      }
    },
    []
  );

  // Panel visibility based on layout and admin settings
  // Admin can disable panels globally, layout controls user's view
  const panels = layout.panels;

  // Check if panel is enabled by admin
  const isPanelEnabled = (panelId: string) => {
    switch (panelId) {
      case "markets":
        return adminSettings.marketsPanelEnabled;
      case "orders":
        return adminSettings.ordersPanelEnabled;
      case "positions":
        return adminSettings.positionsPanelEnabled;
      default:
        return true;
    }
  };

  // Use chartProvider from props or admin settings
  const activeChartProvider = chartProvider || adminSettings.chartProvider;

  // Determine which panels to show based on screen size
  // Mobile: use dedicated mobile app layout
  // Tablet: chart, trading, orderbook, orders
  // Desktop: all panels
  const showMarketsPanel = isDesktop && panels.markets?.visible && isPanelEnabled("markets");
  const showOrderbookPanel = panels.orderbook?.visible;
  const showOrdersPanel = panels.orders?.visible && isPanelEnabled("orders");

  // On tablet/smaller screens without markets panel, symbol should be clickable to open market selector
  const symbolClickable = !showMarketsPanel;

  // Mobile gets dedicated app-like experience
  if (isMobile) {
    return (
      <>
        <MobileTradingLayout
          symbol={currentSymbol}
          marketType={marketType}
          currentPrice={ticker?.last}
          priceChange24h={ticker?.percentage}
          high24h={ticker?.high}
          low24h={ticker?.low}
          volume24h={ticker?.baseVolume}
          onSymbolSelect={() => setShowMobileMarketSelector(true)}
          pricePrecision={currentMarket?.metadata?.precision?.price}
        >
          {{
            chart: (
              <Suspense fallback={<PanelSkeleton />}>
                <ChartPanel
                  symbol={currentSymbol}
                  marketType={marketType}
                  chartProvider={activeChartProvider}
                  metadata={currentMarket?.metadata}
                />
              </Suspense>
            ),
            orderbook: (
              <Suspense fallback={<PanelSkeleton />}>
                <OrderBookPanel
                  symbol={currentSymbol}
                  marketType={marketType}
                  compact={true}
                  metadata={currentMarket?.metadata}
                />
              </Suspense>
            ),
            trade: (
              <Suspense fallback={<PanelSkeleton />}>
                <TradingFormPanel
                  symbol={currentSymbol}
                  marketType={marketType}
                  compact={true}
                  metadata={currentMarket?.metadata}
                />
              </Suspense>
            ),
            orders: (
              <Suspense fallback={<PanelSkeleton />}>
                <OrdersPanel
                  symbol={currentSymbol}
                  marketType={marketType}
                  compact={true}
                  metadata={currentMarket?.metadata}
                />
              </Suspense>
            ),
            positions: marketType === "futures" ? (
              <Suspense fallback={<PanelSkeleton />}>
                <PositionsPanel symbol={currentSymbol} />
              </Suspense>
            ) : undefined,
          }}
        </MobileTradingLayout>

        {/* Mobile Market Selector Modal */}
        <MobileMarketSelector
          isOpen={showMobileMarketSelector}
          onClose={() => setShowMobileMarketSelector(false)}
          onSelect={handleSymbolChange}
          currentSymbol={currentSymbol}
          currentMarketType={marketType}
        />
      </>
    );
  }

  // Tablet and Desktop use grid layout
  return (
    <WorkspaceContainer>
      {/* Header - Always visible, responsive height */}
      <div className="shrink-0 w-full">
        <Suspense fallback={<HeaderSkeleton />}>
          <TradingHeader
            symbol={currentSymbol}
            marketType={marketType}
            onSymbolChange={handleSymbolChange}
            onSymbolClick={symbolClickable ? () => setShowMobileMarketSelector(true) : undefined}
            isMobile={false}
            metadata={currentMarket?.metadata}
          />
        </Suspense>
      </div>

      {/* Main Grid Layout */}
      <GridLayout layout={layout} mode={layoutMode} className="flex-1 min-h-0">
        {/* Markets Panel - Desktop only */}
        {showMarketsPanel && (
          <Panel
            id="markets"
            title="Markets"
            collapsible
            minSize={180}
            defaultSize={panels.markets.size}
            position="left"
            data-tutorial="markets-panel"
          >
            <Suspense fallback={<PanelSkeleton />}>
              <MarketsPanel
                currentSymbol={currentSymbol}
                marketType={marketType}
                onSelectSymbol={handleSymbolChange}
              />
            </Suspense>
          </Panel>
        )}

        {/* Chart Panel - Always visible */}
        {panels.chart?.visible && (
          <Panel
            id="chart"
            title="Chart"
            collapsible={false}
            hideHeader
            defaultSize={panels.chart.size}
            data-tutorial="chart-panel"
          >
            <Suspense fallback={<PanelSkeleton />}>
              <ChartPanel
                symbol={currentSymbol}
                marketType={marketType}
                chartProvider={activeChartProvider}
                metadata={currentMarket?.metadata}
              />
            </Suspense>
          </Panel>
        )}

        {/* Order Book Panel */}
        {showOrderbookPanel && (
          <Panel
            id="orderbook"
            title="Order Book"
            collapsible
            defaultSize={panels.orderbook.size}
            position="right"
            data-tutorial="orderbook-panel"
          >
            <Suspense fallback={<PanelSkeleton />}>
              <OrderBookPanel
                symbol={currentSymbol}
                marketType={marketType}
                compact={isTablet}
                metadata={currentMarket?.metadata}
              />
            </Suspense>
          </Panel>
        )}

        {/* Trading Form Panel - Always visible */}
        {panels.trading?.visible && (
          <Panel
            id="trading"
            title="Trade"
            collapsible
            minSize={280}
            defaultSize={panels.trading.size}
            position="right"
            data-tutorial="trading-panel"
          >
            <Suspense fallback={<PanelSkeleton />}>
              <TradingFormPanel
                symbol={currentSymbol}
                marketType={marketType}
                compact={isTablet}
                metadata={currentMarket?.metadata}
              />
            </Suspense>
          </Panel>
        )}

        {/* Orders Panel - Bottom */}
        {showOrdersPanel && (
          <Panel
            id="orders"
            title="Orders"
            collapsible
            position="bottom"
            defaultSize={panels.orders.size}
            data-tutorial="orders-panel"
          >
            <Suspense fallback={<PanelSkeleton />}>
              <OrdersPanel
                symbol={currentSymbol}
                marketType={marketType}
                compact={isTablet}
                metadata={currentMarket?.metadata}
              />
            </Suspense>
          </Panel>
        )}

        {/* Positions Panel - Bottom (for futures) */}
        {marketType === "futures" && panels.positions?.visible && isPanelEnabled("positions") && (
          <Panel
            id="positions"
            title="Positions"
            collapsible
            position="bottom"
            defaultSize={panels.positions?.size || 25}
          >
            <Suspense fallback={<PanelSkeleton />}>
              <PositionsPanel symbol={currentSymbol} />
            </Suspense>
          </Panel>
        )}
      </GridLayout>

      {/* Settings Modal */}
      <SettingsModal />

      {/* Tutorial Overlay for new users - only on tablet/desktop */}
      {!isMobile && (
        <TutorialOverlay
          isOpen={tutorial.isOpen}
          onClose={tutorial.closeTutorial}
          onComplete={tutorial.completeTutorial}
          currentStep={tutorial.currentStep}
          setCurrentStep={tutorial.setCurrentStep}
          steps={tutorial.steps}
        />
      )}

      {/* Market Selector Modal - for tablet/screens without markets panel */}
      {symbolClickable && (
        <MobileMarketSelector
          isOpen={showMobileMarketSelector}
          onClose={() => setShowMobileMarketSelector(false)}
          onSelect={handleSymbolChange}
          currentSymbol={currentSymbol}
          currentMarketType={marketType}
        />
      )}
    </WorkspaceContainer>
  );
}
