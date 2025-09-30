"use client";

import React from "react";

import { useState, useEffect, memo, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PanelGroup } from "./panel/panel-group";
import { Panel } from "./panel/panel";
import { ResizeHandle } from "./panel/resize-handle";
import { LayoutProvider, useLayout } from "./layout/layout-context";
import TradingHeader from "./header/trading-header";
import MobileLayout from "./layout/mobile-layout";
import StatusBar from "./status/status-bar";
import { LineChart, ClipboardList, DollarSign, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapseButton } from "./panel/collapse-button";
import { CollapsedPanel } from "./panel/collapsed-panel";
// Add at the top of imports
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/routing";

// Import individual panel components
import MarketsPanel from "./markets/markets-panel";
import ChartPanel from "./chart/chart-panel";
import OrderBookPanel from "./orderbook/orderbook-panel";
import TradingFormPanel from "./trading/trading-form-panel";
import OrdersPanel from "./orders/orders-panel";
import AlertsPanel from "./alerts/alerts-panel";
// import TradesPanel from "./trades/trades-panel"
// Update the Symbol import at the top
import type { Symbol } from "@/store/trade/use-binary-store";

// Add import for AI investment store
import { initializeAiInvestmentStore } from "@/store/ai/investment/use-ai-investment-store";

// Add import for $fetch at the top
import { $fetch } from "@/lib/api";

// First, let's add a component mapping at the top of the file, after the imports
// This will map panel IDs to their corresponding components

// Add this import at the top of the file
import { marketDataWs } from "@/services/market-data-ws";
import { marketService } from "@/services/market-service";
import { useTranslations } from "next-intl";

// Replace the existing memoized component declarations with this component registry
const PanelComponentRegistry = {
  markets: memo(MarketsPanel),
  chart: memo(ChartPanel),
  orderbook: memo(OrderBookPanel),
  trading: memo(TradingFormPanel),
  orders: memo(OrdersPanel),
  alerts: memo(AlertsPanel),
  // Add any other panel components here
};

// Replace the TradingInterface function with this new implementation
function TradingInterface({
  currentSymbol,
  onSymbolChange,
  isFutures = false,
  handleFuturesOrderSubmit,
  currentMarket,
}: {
  currentSymbol: Symbol;
  onSymbolChange: (symbol: Symbol, marketType?: "spot" | "futures") => void;
  isFutures?: boolean;
  handleFuturesOrderSubmit?: (orderData: any) => Promise<any>;
  currentMarket?: any;
}) {
  const t = useTranslations("trade/components/trading-layout");
  const {
    layoutConfig,
    getPanelConfig,
    getPanelGroupConfig,
    isPanelGroupCollapsed,
    togglePanelGroupCollapse,
  } = useLayout();
  const [mounted, setMounted] = useState(false);
  const [panelsLoaded, setPanelsLoaded] = useState(false);
  const [layoutApplied, setLayoutApplied] = useState(false);
  const [animatingPanels, setAnimatingPanels] = useState<
    Record<string, boolean>
  >({});
  const [collapsedPanels, setCollapsedPanels] = useState<
    Record<string, boolean>
  >({});

  // Use ref to track previous layout config to prevent unnecessary updates
  const prevLayoutConfigRef = useRef(layoutConfig);
  const layoutUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to get panels for a specific container
  const getPanelsForContainer = (container: string) => {
    return Object.entries(layoutConfig.panels)
      .filter(([_, panel]) => panel.container === container && panel.visible)
      .sort((a, b) => a[1].position - b[1].position)
      .map(([id]) => id);
  };

  // Get panels for each container
  const leftPanels = getPanelsForContainer("left");
  const centerPanels = getPanelsForContainer("center");
  const rightPanels = getPanelsForContainer("right");
  // Removed top panels (news panel)
  const bottomPanels = getPanelsForContainer("bottom");

  // Get data panels (nested in center)
  const dataPanels = Object.entries(layoutConfig.panels)
    .filter(([_, panel]) => panel.container === "data" && panel.visible)
    .sort((a, b) => a[1].position - b[1].position)
    .map(([id]) => id);

  // Handle expanding a collapsed panel group
  const handleExpandPanelGroup = useCallback(
    (groupId: string) => {
      // Set animating state
      setAnimatingPanels((prev) => ({ ...prev, [groupId]: true }));

      // Toggle the panel group collapse state
      togglePanelGroupCollapse(groupId);

      // Clear animation state after transition completes
      setTimeout(() => {
        setAnimatingPanels((prev) => ({ ...prev, [groupId]: false }));
      }, 300); // Match the CSS transition duration
    },
    [togglePanelGroupCollapse]
  );

  // Handle panel collapse
  const handlePanelCollapse = useCallback(
    (panelId: string, collapsed: boolean) => {
      setCollapsedPanels((prev) => ({
        ...prev,
        [panelId]: collapsed,
      }));
    },
    []
  );

  // Handle click on collapsed side to expand it
  const handleSideClick = useCallback(
    (groupId: string) => {
      // Set animating state
      setAnimatingPanels((prev) => ({ ...prev, [groupId]: true }));

      // Toggle the panel group collapse state
      togglePanelGroupCollapse(groupId);

      // Reset collapsed state for panels in this group
      const panelsInGroup = Object.entries(layoutConfig.panels)
        .filter(([_, panel]) => panel.container === groupId)
        .map(([id]) => id);

      setCollapsedPanels((prev) => {
        const newState = { ...prev };
        panelsInGroup.forEach((id) => {
          newState[id] = false;
        });
        return newState;
      });

      // Clear animation state after transition completes
      setTimeout(() => {
        setAnimatingPanels((prev) => ({ ...prev, [groupId]: false }));
      }, 300);
    },
    [layoutConfig.panels, togglePanelGroupCollapse]
  );

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // Delay panel animation to ensure smooth rendering
      const timer = setTimeout(() => {
        setPanelsLoaded(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (layoutUpdateTimeoutRef.current) {
        clearTimeout(layoutUpdateTimeoutRef.current);
      }
    };
  }, []);

  if (!mounted) return null;

  // Get panel group configs
  // Removed top group config (news panel)
  const bottomGroupConfig = getPanelGroupConfig("bottom");
  const leftGroupConfig = getPanelGroupConfig("left");
  const rightGroupConfig = getPanelGroupConfig("right");

  // Check if panel groups are collapsed
  const isLeftGroupCollapsed = isPanelGroupCollapsed("left");
  const isRightGroupCollapsed = isPanelGroupCollapsed("right");
  // Removed top group collapsed check (news panel)
  const isBottomGroupCollapsed = isPanelGroupCollapsed("bottom");

  // Calculate default sizes for resize handles
  const leftRightDefaultSizes: [number, number] = [
    layoutConfig.leftPanel,
    layoutConfig.centerPanel,
  ];
  const centerRightDefaultSizes: [number, number] = [
    layoutConfig.centerPanel,
    layoutConfig.rightPanel,
  ];
  const mainContentHeight = 100 - layoutConfig.bottomPanel; // Removed top panel from calculation
  const mainBottomDefaultSizes: [number, number] = [
    mainContentHeight,
    layoutConfig.bottomPanel,
  ];

  // Special check: only show group if it has content
  // Removed top content check (news panel)
  const hasBottomContent =
    bottomGroupConfig?.visible && layoutConfig.bottomPanel > 0;
  const hasLeftContent = leftGroupConfig?.visible && layoutConfig.leftPanel > 0;
  const hasRightContent =
    rightGroupConfig?.visible && layoutConfig.rightPanel > 0;

  // Helper function to render a panel based on its ID
  const renderPanel = (panelId: string) => {
    const panelConfig = getPanelConfig(panelId);
    if (!panelConfig || !panelConfig.visible) return null;

    // Pass the current symbol to relevant panels
    if (panelId === "markets") {
      return (
        <MarketsPanel
          onMarketSelect={onSymbolChange}
          currentSymbol={currentSymbol}
          defaultMarketType={isFutures ? "futures" : "spot"}
        />
      );
    } else if (panelId === "orderbook") {
      return <OrderBookPanel symbol={currentSymbol} marketType={isFutures ? "futures" : "spot"} currency={currentMarket?.currency} pair={currentMarket?.pair} />;
    } else if (panelId === "chart") {
      return <ChartPanel symbol={currentSymbol} metadata={currentMarket?.metadata} />;
    } else if (panelId === "trading") {
      return (
        <TradingFormPanel 
          symbol={currentSymbol} 
          isFutures={isFutures}
          isEco={currentMarket?.isEco || false}
          onOrderSubmit={isFutures ? handleFuturesOrderSubmit : undefined}
        />
      );
    } else if (panelId === "orders") {
      return <OrdersPanel pair={currentMarket?.pair} isEco={currentMarket?.isEco || false} symbol={currentSymbol} />;
    } else if (panelId === "alerts") {
      return <AlertsPanel />;
    }

    // Fallback for unknown panels
    console.warn(`No component found for panel ID: ${panelId}`);
    return (
      <div className="p-4 text-zinc-500">
        {t("no_component_for")}
        {panelId}
      </div>
    );
  };

  // Get group icons and titles
  const getGroupIcon = (groupId: string) => {
    switch (groupId) {
      case "left":
        return <LineChart size={14} />;
      case "right":
        return <DollarSign size={14} />;
      case "bottom":
        return <ClipboardList size={14} />;
      default:
        return <LineChart size={14} />;
    }
  };

  const getGroupTitle = (groupId: string) => {
    switch (groupId) {
      case "left":
        return "Markets";
      case "right":
        return "Trading";
      case "bottom":
        return "Orders";
      default:
        return "Panel";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        <PanelGroup direction="vertical" className="h-full">
          {/* Removed top panel group (news panel) */}

          {/* Main horizontal panel group */}
          <Panel
            defaultSize={mainContentHeight}
            className="flex"
            minSize={50} // Set minimum size for main content to allow bottom panel to grow
          >
            <PanelGroup
              direction="horizontal"
              className="w-full h-full"
              data-panel-group-id="main"
            >
              {/* Left sidebar */}
              {hasLeftContent && (
                <>
                  {isLeftGroupCollapsed ? (
                    <div
                      className="
      w-[30px]
      h-full
      flex flex-col
      items-center
      bg-background dark:bg-zinc-950
      border-r border-zinc-200 dark:border-zinc-800/50
      order-first
    "
                    >
                      <CollapsedPanel
                        title={getGroupTitle("left")}
                        icon={getGroupIcon("left")}
                        side="start"
                        isHovered={false}
                        onClick={() => handleExpandPanelGroup("left")}
                        direction="horizontal"
                      />
                    </div>
                  ) : (
                    <Panel
                      defaultSize={layoutConfig.leftPanel}
                      minSize={10}
                      maxSize={40}
                      collapsible={leftGroupConfig?.collapsible ?? true}
                      collapseSide="start"
                      title={getGroupTitle("left")}
                      icon={getGroupIcon("left")}
                      className={cn(
                        "bg-background dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/50 relative",
                        panelsLoaded && "panel-animate-in panel-slide-in-left",
                        animatingPanels.left && "panel-expanding"
                      )}
                      onCollapse={(collapsed) => {
                        // If this is the only panel in the left group, collapse the entire group
                        if (leftPanels.length <= 1) {
                          togglePanelGroupCollapse("left");
                        } else {
                          handlePanelCollapse(leftPanels[0], collapsed);
                        }
                      }}
                      defaultCollapsed={false}
                      panelId="left"
                    >
                      {leftPanels.length > 0 ? (
                        leftPanels.map((panelId) => (
                          <div key={panelId} className="h-full">
                            {renderPanel(panelId)}
                          </div>
                        ))
                      ) : (
                        <MarketsPanel
                          onMarketSelect={onSymbolChange}
                          currentSymbol={currentSymbol}
                          defaultMarketType={isFutures ? "futures" : "spot"}
                        />
                      )}
                      {leftGroupConfig?.collapsible && (
                        <CollapseButton groupId="left" />
                      )}
                    </Panel>
                  )}

                  {!isLeftGroupCollapsed && (
                    <ResizeHandle
                      defaultSizes={leftRightDefaultSizes}
                      panelType="leftCenter"
                    />
                  )}
                </>
              )}

              {/* Main content area */}
              <Panel
                defaultSize={
                  isLeftGroupCollapsed && isRightGroupCollapsed
                    ? 100
                    : isLeftGroupCollapsed
                      ? layoutConfig.leftPanel +
                        layoutConfig.centerPanel -
                        (24 / window.innerWidth) * 100
                      : isRightGroupCollapsed
                        ? layoutConfig.centerPanel +
                          layoutConfig.rightPanel -
                          (24 / window.innerWidth) * 100
                        : layoutConfig.centerPanel
                }
                className="flex flex-col h-full"
                collapsible={false}
                minSize={40} // Set minimum size for center content to allow bottom panel to grow
              >
                <PanelGroup direction="vertical" className="h-full">
                  {/* Chart area */}
                  <Panel
                    defaultSize={layoutConfig.chartPanel}
                    className={cn(
                      "bg-black h-full",
                      panelsLoaded &&
                        "panel-animate-in panel-slide-in-top panel-delay-100",
                      layoutConfig.chartPanel === 0 && "hidden"
                    )}
                    collapsible={true} // Explicitly set to true
                    collapseSide={
                      getPanelConfig(centerPanels[0])?.collapseSide ?? "top"
                    }
                    title="Chart"
                    icon={<LineChart className="h-3 w-3 mr-1.5" />}
                    onCollapse={(collapsed) => {
                      // For the chart panel, we want to collapse it to a small header
                      // We don't collapse the entire center group as it contains multiple panels
                      handlePanelCollapse(
                        centerPanels[0] || "chart",
                        collapsed
                      );
                    }}
                    defaultCollapsed={
                      getPanelConfig(centerPanels[0])?.defaultCollapsed
                    }
                    panelId={centerPanels[0] || "chart"}
                  >
                    {centerPanels.length > 0 ? (
                      renderPanel(centerPanels[0])
                    ) : (
                      <ChartPanel symbol={currentSymbol} metadata={currentMarket?.metadata} />
                    )}
                  </Panel>

                  {dataPanels.length > 0 && (
                    <>
                      <ResizeHandle
                        defaultSizes={[
                          layoutConfig.chartPanel,
                          layoutConfig.dataPanel,
                        ]}
                        panelType="chartData"
                      />

                      {/* Data panels (Orderbook and Trades) */}
                      <Panel
                        defaultSize={layoutConfig.dataPanel}
                        minSize={5} // Reduce minimum size to allow for better collapsing
                        className={cn(
                          "border-t border-zinc-200 dark:border-zinc-800",
                          panelsLoaded &&
                            "panel-animate-in panel-slide-in-bottom panel-delay-200",
                          layoutConfig.dataPanel === 0 && "hidden"
                        )}
                        collapsible={false}
                      >
                        <PanelGroup direction="vertical" className="h-full">
                          {dataPanels.map((panelId, index) => {
                            const panel = getPanelConfig(panelId);
                            const isCollapsed = collapsedPanels[panelId];

                            // For each data panel, like orderbook, we need to render either
                            // the collapsed version or the expanded version
                            return isCollapsed ? (
                              <div
                                key={panelId}
                                className="h-[30px] w-full flex justify-center bg-background dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800"
                              >
                                <CollapsedPanel
                                  title={
                                    panelId === "orderbook"
                                      ? "Orderbook"
                                      : panelId
                                  }
                                  icon={
                                    panelId === "orderbook" ? (
                                      <BookOpen className="h-3 w-3 mr-1.5" />
                                    ) : undefined
                                  }
                                  side="bottom"
                                  isHovered={false}
                                  onClick={() =>
                                    handlePanelCollapse(panelId, false)
                                  }
                                  direction="vertical"
                                />
                              </div>
                            ) : (
                              <React.Fragment key={panelId}>
                                {index > 0 &&
                                  !collapsedPanels[dataPanels[index - 1]] && (
                                    <ResizeHandle
                                      defaultSizes={[
                                        getPanelConfig(dataPanels[index - 1])
                                          ?.size || 50,
                                        panel?.size || 50,
                                      ]}
                                    />
                                  )}
                                <Panel
                                  defaultSize={panel?.size || 100}
                                  className={cn(
                                    "bg-background dark:bg-zinc-950",
                                    !panel?.visible && "hidden"
                                  )}
                                  collapsible={true}
                                  collapseSide={panel?.collapseSide || "bottom"}
                                  title={
                                    panelId === "orderbook"
                                      ? "Orderbook"
                                      : panelId
                                  }
                                  icon={
                                    panelId === "orderbook" ? (
                                      <BookOpen className="h-3 w-3 mr-1.5" />
                                    ) : undefined
                                  }
                                  onCollapse={(collapsed) =>
                                    handlePanelCollapse(panelId, collapsed)
                                  }
                                  defaultCollapsed={panel?.defaultCollapsed}
                                  panelId={panelId}
                                >
                                  {renderPanel(panelId)}
                                </Panel>
                              </React.Fragment>
                            );
                          })}
                        </PanelGroup>
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>

              {/* Right sidebar - Trading Form only */}
              {hasRightContent && (
                <>
                  {!isRightGroupCollapsed && (
                    <ResizeHandle
                      defaultSizes={centerRightDefaultSizes}
                      panelType="centerRight"
                    />
                  )}

                  {isRightGroupCollapsed ? (
                    <div
                      className="
      w-[30px]
      h-full
      flex flex-col
      items-center
      bg-background dark:bg-zinc-950
      border-l border-zinc-200 dark:border-zinc-800
      order-last
    "
                    >
                      <CollapsedPanel
                        title={getGroupTitle("right")}
                        icon={getGroupIcon("right")}
                        side="end"
                        isHovered={false}
                        onClick={() => handleExpandPanelGroup("right")}
                        direction="horizontal"
                      />
                    </div>
                  ) : (
                    <Panel
                      defaultSize={layoutConfig.rightPanel}
                      minSize={10}
                      maxSize={40}
                      className={cn(
                        "border-l border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out relative",
                        animatingPanels.right && "panel-expanding"
                      )}
                      collapsible={rightGroupConfig?.collapsible ?? true}
                      collapseSide="end"
                      title={getGroupTitle("right")}
                      icon={getGroupIcon("right")}
                      onCollapse={(collapsed) => {
                        // If this is the only panel in the right group, collapse the entire group
                        if (rightPanels.length <= 1) {
                          togglePanelGroupCollapse("right");
                        } else {
                          handlePanelCollapse("right", collapsed);
                        }
                      }}
                      panelId="right"
                    >
                      {/* Only render the trading form in the right panel */}
                      {rightPanels.includes("trading") && (
                        <div className="h-full">
                          <TradingFormPanel
                            symbol={currentSymbol}
                            isFutures={isFutures}
                          />
                        </div>
                      )}
                      {rightGroupConfig?.collapsible && (
                        <CollapseButton groupId="right" />
                      )}
                    </Panel>
                  )}
                </>
              )}
            </PanelGroup>
          </Panel>

          {/* Bottom panel group - Orders */}
          {hasBottomContent && (
            <>
              {!isBottomGroupCollapsed && (
                <ResizeHandle
                  defaultSizes={mainBottomDefaultSizes}
                  panelType="chartData"
                />
              )}

              {isBottomGroupCollapsed ? (
                <div
                  className="
      h-[30px]
      w-full
      flex justify-center
      bg-background dark:bg-zinc-950
      border-t border-zinc-200 dark:border-zinc-800
      order-last
    "
                >
                  <CollapsedPanel
                    title={getGroupTitle("bottom")}
                    icon={getGroupIcon("bottom")}
                    side="bottom"
                    isHovered={false}
                    onClick={() => handleExpandPanelGroup("bottom")}
                    direction="vertical"
                  />
                </div>
              ) : (
                <Panel
                  defaultSize={layoutConfig.bottomPanel}
                  minSize={5}
                  maxSize={50} // Set max size to 50% explicitly here
                  className={cn(
                    "bg-background dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 relative",
                    panelsLoaded && "panel-animate-in panel-slide-in-bottom",
                    animatingPanels.bottom && "panel-expanding"
                  )}
                  collapsible={bottomGroupConfig?.collapsible ?? true}
                  collapseSide="bottom"
                  title={getGroupTitle("bottom")}
                  icon={getGroupIcon("bottom")}
                  onCollapse={(collapsed) => {
                    // If this is the only panel in the bottom group, collapse the entire group
                    if (bottomPanels.length <= 1) {
                      togglePanelGroupCollapse("bottom");
                    } else {
                      handlePanelCollapse(bottomPanels[0], collapsed);
                    }
                  }}
                  defaultCollapsed={false}
                  panelId="bottom"
                >
                  {bottomPanels.map((panelId) => (
                    <div
                      key={panelId}
                      className="h-full overflow-y-auto scrollbar-hide"
                    >
                      {renderPanel(panelId)}
                    </div>
                  ))}
                  {bottomGroupConfig?.collapsible && (
                    <CollapseButton groupId="bottom" />
                  )}
                </Panel>
              )}
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}

// Inside the TradingLayout component, at the beginning:
export default function TradingLayout() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initialSymbol = searchParams.get("symbol");
  const type = searchParams.get("type");

  // Check if this is a futures market
  const isFutures = type === "futures";

  // State for market data
  const [spotMarkets, setSpotMarkets] = useState<any[]>([]);
  const [futuresMarkets, setFuturesMarkets] = useState<any[]>([]);
  const [currentMarket, setCurrentMarket] = useState<any>(null);

  // Parse initial symbol from URL parameters
  let parsedSymbol: string | null = null;
  if (initialSymbol && initialSymbol.includes("-")) {
    const [currency, pair] = initialSymbol.split("-");
    parsedSymbol = `${currency}${pair}`;
  } else if (initialSymbol) {
    parsedSymbol = initialSymbol;
  }

  const [currentSymbol, setCurrentSymbol] = useState<string>("");
  const [spotSymbol, setSpotSymbol] = useState<string>("");
  const [futuresSymbol, setFuturesSymbol] = useState<string>("");
  const [marketDataLoaded, setMarketDataLoaded] = useState(false);

  // Find current market data
  useEffect(() => {
    const markets = isFutures ? futuresMarkets : spotMarkets;
    const market = markets.find(m => 
      m.symbol === currentSymbol || 
      `${m.currency}${m.pair}` === currentSymbol
    );
    setCurrentMarket(market);
  }, [currentSymbol, isFutures, spotMarkets, futuresMarkets]);

  // Initialize symbol from market data once markets are loaded
  useEffect(() => {
    if (!marketDataLoaded || (!spotMarkets.length && !futuresMarkets.length)) return;
    
    // If we have a parsed symbol from URL, try to find it in markets
    if (parsedSymbol) {
      const markets = isFutures ? futuresMarkets : spotMarkets;
      const market = markets.find(m => 
        m.symbol === parsedSymbol || 
        `${m.currency}${m.pair}` === parsedSymbol
      );
      
      if (market) {
        const symbol = market.symbol || `${market.currency}${market.pair}`;
        setCurrentSymbol(symbol);
        if (isFutures) {
          setFuturesSymbol(symbol);
        } else {
          setSpotSymbol(symbol);
        }
        return;
      }
    }
    
    // If no symbol from URL or market not found, use first available market
    const markets = isFutures ? futuresMarkets : spotMarkets;
    if (markets.length > 0) {
      const firstMarket = markets[0];
      const symbol = firstMarket.symbol || `${firstMarket.currency}${firstMarket.pair}`;
      setCurrentSymbol(symbol);
      if (isFutures) {
        setFuturesSymbol(symbol);
      } else {
        setSpotSymbol(symbol);
      }
    }
  }, [marketDataLoaded, spotMarkets, futuresMarkets, isFutures, parsedSymbol]);

  // Add order submission handler for futures
  const handleFuturesOrderSubmit = async (orderData: any) => {
    try {
      // Only use current market data - no fallbacks
      if (!currentMarket) {
        throw new Error("Market data not available. Please select a valid market.");
      }

      const currency = currentMarket.currency;
      const pair = currentMarket.pair;

      if (!currency || !pair) {
        throw new Error("Invalid market data. Currency and pair are required.");
      }

      const payload = {
        currency,
        pair,
        type: orderData.type?.toUpperCase() || "MARKET",
        side: orderData.side?.toUpperCase() || "BUY",
        amount: Number(orderData.amount),
        price: orderData.price ? Number(orderData.price) : undefined,
        leverage: Number(orderData.leverage || 1),
        stopLossPrice: orderData.stopLoss ? Number(orderData.stopLoss) : undefined,
        takeProfitPrice: orderData.takeProfit ? Number(orderData.takeProfit) : undefined,
      };


      const response = await $fetch({
        url: "/api/futures/order",
        method: "POST",
        body: payload,
        silent: true,
      });

      if (response.data) {
        return response.data;
      } else {
        throw new Error(response.error || "Failed to submit futures order");
      }
    } catch (error) {
      console.error("Error submitting futures order:", error);
      throw error;
    }
  };

  // Update current symbol when switching between spot and futures
  useEffect(() => {
    // When switching market types, use the appropriate stored symbol
    setCurrentSymbol(isFutures ? futuresSymbol : spotSymbol);

    // Don't update URL here - only update URL when a market is explicitly selected
  }, [isFutures, spotSymbol, futuresSymbol]);

  // Add this inside the TradingLayout component, after the useState declarations
  // Initialize market data with the centralized service
  useEffect(() => {
    const initializeServices = async () => {
      try {

        // Initialize market service (this will fetch market data once)
        await marketService.initialize();

        // Load spot markets
        const spotMarketsData = await marketService.getSpotMarkets();
        setSpotMarkets(spotMarketsData);

        // Load futures markets
        const futuresMarketsData = await marketService.getFuturesMarkets();
        setFuturesMarkets(futuresMarketsData);

        // Initialize market data WebSocket
        marketDataWs.initialize();

        setMarketDataLoaded(true);
      } catch (error) {
        console.error("Error initializing trading services:", error);
        setMarketDataLoaded(true);
      }
    };

    initializeServices();

    // Initialize AI investment store
    initializeAiInvestmentStore();

    // Cleanup function
    return () => {
      // Clean up any resources if needed
      marketDataWs.cleanup();
    };
  }, []);

  // Handle symbol change
  const handleSymbolChange = (symbol: Symbol, marketType?: "spot" | "futures") => {
    // If marketType is provided, it means we're switching market types
    const targetMarketType = marketType || (isFutures ? "futures" : "spot");
    
    // Get current symbol for comparison
    const currentSymbolValue = targetMarketType === "futures" ? futuresSymbol : spotSymbol;
    
    // Skip if switching to the same symbol and market type
    if (symbol === currentSymbolValue && targetMarketType === (isFutures ? "futures" : "spot")) {
      return;
    }

    // STEP 1: Cleanup old market data and subscriptions
    if (currentSymbolValue && currentSymbolValue !== symbol) {
      
      // Cleanup market data WebSocket subscriptions for old symbol
      try {
        // Unsubscribe from all data types for the old symbol
        const oldMarketType = isFutures ? "futures" : "spot";
        
        // Unsubscribe from ticker data
        marketDataWs.unsubscribe({
          symbol: currentSymbolValue,
          type: "ticker",
          marketType: oldMarketType
        }, () => {});
        
        // Unsubscribe from orderbook data
        marketDataWs.unsubscribe({
          symbol: currentSymbolValue,
          type: "orderbook",
          marketType: oldMarketType
        }, () => {});
        
        // Unsubscribe from OHLCV data for all timeframes
        const timeframes = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"];
        timeframes.forEach(interval => {
          marketDataWs.unsubscribe({
            symbol: currentSymbolValue,
            type: "ohlcv",
            marketType: oldMarketType,
            interval
          }, () => {});
        });

      } catch (error) {
        console.warn(`[Trading Layout] Error cleaning up subscriptions for ${currentSymbolValue}:`, error);
      }
    }

    // STEP 2: Clear chart data cache
    try {
      // Trigger chart data cleanup via custom event
      window.dispatchEvent(new CustomEvent('market-switching-cleanup', {
        detail: { 
          oldSymbol: currentSymbolValue, 
          newSymbol: symbol,
          oldMarketType: isFutures ? "futures" : "spot",
          newMarketType: targetMarketType
        }
      }));

    } catch (error) {
      console.warn(`[Trading Layout] Error triggering chart cleanup:`, error);
    }

    // STEP 3: Update state variables
    // Update the appropriate symbol based on market type
    if (targetMarketType === "futures") {
      setFuturesSymbol(symbol);
    } else {
      setSpotSymbol(symbol);
    }

    // Always update current symbol for the active view
    setCurrentSymbol(symbol);
    
    // Reset current price to prevent showing old market price
    setCurrentPrice(0);

    // STEP 4: Update URL with new market info
    // Find the market data to get proper currency and pair
    const markets = targetMarketType === "futures" ? futuresMarkets : spotMarkets;
    const market = markets.find(m => 
      m.symbol === symbol || 
      `${m.currency}${m.pair}` === symbol
    );

    // Only update URL if we have valid market data
    if (market) {
      const formattedSymbol = `${market.currency}-${market.pair}`;
      const url = `${pathname}?symbol=${formattedSymbol}&type=${targetMarketType}`;
      window.history.pushState({ path: url }, "", url);
    } else {
      console.warn(`[Trading Layout] Market data not found for symbol: ${symbol}`);
    }

    // STEP 5: Force component remounts to ensure clean state
    setTimeout(() => {
      // Trigger resize events to ensure proper chart sizing after market switch
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new CustomEvent("chart-resize-requested"));
    }, 100);
  };

  // Continue with the rest of the component...
  const { isMobile } = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle price update
  const handlePriceUpdate = (price: number) => {
    setCurrentPrice(price);
  };

  if (!mounted) return null;

  if (isMobile) {
    return (
      <LayoutProvider>
        <div className="flex flex-col h-screen-mobile w-full bg-black overflow-hidden">
          <TradingHeader
            currentSymbol={currentSymbol}
            onSymbolChange={handleSymbolChange}
            marketType={isFutures ? "futures" : "spot"}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            <MobileLayout
              currentSymbol={currentSymbol}
              onSymbolChange={handleSymbolChange}
            />
          </div>
          <StatusBar />
        </div>
      </LayoutProvider>
    );
  }

  return (
    <LayoutProvider>
      <div className="flex flex-col h-screen w-full bg-black">
        <TradingHeader
          currentSymbol={currentSymbol}
          onSymbolChange={handleSymbolChange}
          marketType={isFutures ? "futures" : "spot"}
        />
        <div className="flex-1 overflow-hidden">
          <TradingInterface
            currentSymbol={currentSymbol}
            onSymbolChange={handleSymbolChange}
            isFutures={isFutures}
            handleFuturesOrderSubmit={handleFuturesOrderSubmit}
            currentMarket={currentMarket}
          />
        </div>
        <StatusBar />
      </div>
    </LayoutProvider>
  );
}
