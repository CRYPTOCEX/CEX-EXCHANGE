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
import { CommandPalette } from "./components/header/CommandPalette";
// Replaces a local stub that rendered a permanent "No open positions" message, so
// futures traders on Pro had no positions view even when positions existed.
import { PositionsPanel } from "./components/positions/PositionsPanel";
import { useUIStore } from "./stores/ui-store";
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
import { useTranslations } from "next-intl";

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

export function TradingProLayout({
  initialSymbol,
  marketType: initialMarketType,
  chartProvider,
}: TradingProLayoutProps) {
  const t = useTranslations("common");
  const { layout, layoutMode } = useLayout();
  const { settings: userSettings } = useSettings();
  const { settings: adminSettings, isLoading: settingsLoading } =
    useExtensionStatus();
  const searchParams = useSearchParams();
  const screenSize = useScreenSize();

  // Responsive panel visibility
  const isMobile = screenSize === "mobile";
  const isTablet = screenSize === "tablet";
  const isDesktop = screenSize === "desktop";

  // Tutorial for new users - started by the user, never by us. A tour that
  // fires on a first visit reaches people before they are stuck and gets
  // dismissed reflexively; the same tour opened from the Help control (or by
  // the support assistant, on request) is the same content when it is wanted.
  const tutorial = useTutorial({
    tutorialId: "trading-pro-intro",
    autoStart: false,
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

  // Keep marketType in sync with the market actually resolved for the current
  // symbol. marketType is otherwise only set on explicit selection or from the
  // initial URL, so it can drift out of sync with the pair — e.g. a shared link
  // without a ?type param, or selecting a pair before market data finished
  // loading. That drift made eco-only UI (notably the hiding of unsupported
  // advanced order types) flip on/off for the SAME pair, which read as the
  // "advanced order types disappearing randomly on some pairs" bug. Reconciling
  // from the resolved market (eco markets are de-duped to take priority for
  // overlapping symbols) makes it deterministic. Futures resolve via their own
  // list, so they're left untouched here.
  useEffect(() => {
    if (marketType === "futures") return;
    if (!currentMarket || currentMarket.symbol !== currentSymbol) return;
    const resolved: MarketType = currentMarket.isEco ? "eco" : "spot";
    if (resolved !== marketType) {
      setMarketType(resolved);
    }
  }, [currentMarket, currentSymbol, marketType]);

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
      (data) => {
        /*
         * FORWARD THE ORDER, NOT JUST THE FACT THAT ONE CHANGED.
         *
         * This callback receives the changed order(s) and used to throw them
         * away, dispatching a bare event whose only listener answered it by
         * re-requesting BOTH order lists over HTTP with a loading state — which
         * blanks the orders table and the balance figures while it runs.
         *
         * At one frame per order that is invisible. At the rate a trading bot
         * re-quotes a ladder it is the flicker customers report: the table
         * emptying to skeleton rows and refilling several times a second.
         *
         * The payload is the whole fix. OrdersPanel merges it in place (see
         * ./components/orders/wire.ts) and only falls back to a snapshot — rate
         * limited, and without the loading state — for the lists it cannot
         * derive from a single order.
         */
        window.dispatchEvent(new CustomEvent("tp-order-updated", { detail: data }));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, marketType]);

  const isCommandPaletteOpen = useUIStore((s) => s.isCommandPaletteOpen);
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);

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

  /**
   * The ONE thing on this screen that must not be guessed.
   *
   * `TradingPro` no longer holds the whole terminal behind the settings fetch
   * (see the note there — the setting is already in localStorage on every load
   * but one). What it cannot do is mount a chart on a guess: `chartProvider`
   * chooses between the TradingView widget and the in-house engine, and those
   * are different component trees with different data sources, so picking the
   * default and correcting it a beat later means mounting an iframe, pulling
   * candles, and throwing both away.
   *
   * So the chart — and only the chart — waits, inside a `Panel` whose size
   * comes from `layout.panels.chart.size` and is therefore already fixed. The
   * cell does not resize when the real chart lands; its contents change.
   *
   * Every other panel renders immediately: the order book, the trading form
   * and the orders table all take a `symbol` and a `marketType` that are known
   * from the URL, and their own contents fill in from their own sockets.
   */
  const chartProviderResolved = !settingsLoading || Boolean(chartProvider);

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
                {chartProviderResolved ? (
                  <ChartPanel
                    symbol={currentSymbol}
                    marketType={marketType}
                    chartProvider={activeChartProvider}
                    metadata={currentMarket?.metadata}
                  />
                ) : (
                  <PanelSkeleton />
                )}
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
            resizeEdge="right"
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
              {chartProviderResolved ? (
                <ChartPanel
                  symbol={currentSymbol}
                  marketType={marketType}
                  chartProvider={activeChartProvider}
                  metadata={currentMarket?.metadata}
                />
              ) : (
                <PanelSkeleton />
              )}
            </Suspense>
          </Panel>
        )}

        {/* Order Book Panel */}
        {showOrderbookPanel && (
          <Panel
            id="orderbook"
            title={t("order_book")}
            collapsible
            defaultSize={panels.orderbook.size}
            position="right"
            data-tutorial="orderbook-panel"
            resizeEdge="left"
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
            resizeEdge="left"
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
            maximizable
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
            maximizable
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

      {/*
        The mod+k hotkey and the isCommandPaletteOpen flag were already live in
        HotkeysProvider/ui-store, but nothing rendered the palette — pressing Cmd+K
        flipped a flag no component read. This is that missing renderer.
      */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        onSelect={(symbol, type) => {
          handleSymbolChange(symbol, type);
          closeCommandPalette();
        }}
        currentSymbol={currentSymbol}
        currentMarketType={marketType}
      />

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
