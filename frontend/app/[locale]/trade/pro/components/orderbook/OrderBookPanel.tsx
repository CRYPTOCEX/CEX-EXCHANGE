"use client";

import React, { memo, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "../../utils/cn";
import { OrderBookHeader } from "./OrderBookHeader";
import { OrderBookTable } from "./OrderBookTable";
import { OrderBookHorizontal } from "./OrderBookHorizontal";
import { DepthChart } from "./DepthChart";
import { TradesPanel } from "./TradesPanel";
import { SpreadIndicator } from "./SpreadIndicator";
import { OrderBookSkeleton } from "./OrderBookSkeleton";
import type { MarketType } from "../../types/common";
import {
  marketDataWs,
  type OrderbookData as WSOrderbookData,
  type TradeData as WSTradeData,
  type TickerData,
  type MarketType as WSMarketType,
} from "@/services/market-data-ws";

// Height threshold for switching to horizontal layout (in pixels)
const HORIZONTAL_LAYOUT_THRESHOLD = 350;

interface MarketMetadata {
  precision?: {
    price?: number;
    amount?: number;
  };
  limits?: {
    amount?: { min?: number; max?: number };
    price?: { min?: number; max?: number };
    cost?: { min?: number; max?: number };
  };
}

interface OrderBookPanelProps {
  symbol: string;
  marketType: MarketType;
  className?: string;
  compact?: boolean;
  metadata?: MarketMetadata;
}

interface OrderBookData {
  bids: [number, number][]; // [price, amount]
  asks: [number, number][];
  timestamp: number;
}

interface TradeData {
  id: string;
  price: number;
  amount: number;
  side: "buy" | "sell";
  timestamp: number;
}

type DisplayMode = "both" | "bids" | "asks";
type TabType = "orderbook" | "trades" | "depth";

// Maximum items to display
const MAX_ORDERBOOK_ITEMS = 25;
const MAX_TRADES = 50;

export const OrderBookPanel = memo(function OrderBookPanel({
  symbol,
  marketType,
  className,
  compact = false,
  metadata,
}: OrderBookPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("orderbook");
  const [orderbook, setOrderbook] = useState<OrderBookData | null>(null);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("both");
  const [showCumulative, setShowCumulative] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [useHorizontalLayout, setUseHorizontalLayout] = useState(false);

  // Refs for cleanup
  const isMountedRef = useRef(true);
  const orderbookUnsubscribeRef = useRef<(() => void) | null>(null);
  const tradesUnsubscribeRef = useRef<(() => void) | null>(null);
  const tickerUnsubscribeRef = useRef<(() => void) | null>(null);
  const asksContainerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Convert Trading Pro market type to WebSocket service market type
  const wsMarketType: WSMarketType = useMemo(() => {
    if (marketType === "futures") return "futures";
    if (marketType === "eco") return "eco";
    return "spot";
  }, [marketType]);

  // Clean up subscriptions
  const cleanupSubscriptions = useCallback(() => {
    if (orderbookUnsubscribeRef.current) {
      orderbookUnsubscribeRef.current();
      orderbookUnsubscribeRef.current = null;
    }
    if (tradesUnsubscribeRef.current) {
      tradesUnsubscribeRef.current();
      tradesUnsubscribeRef.current = null;
    }
    if (tickerUnsubscribeRef.current) {
      tickerUnsubscribeRef.current();
      tickerUnsubscribeRef.current = null;
    }
  }, []);

  // Subscribe to real market data via WebSocket
  useEffect(() => {
    if (!symbol) return;

    isMountedRef.current = true;
    setIsLoading(true);
    setOrderbook(null);
    setTrades([]);

    // Initialize WebSocket service
    marketDataWs.initialize();

    // Clean up previous subscriptions
    cleanupSubscriptions();

    // Subscribe to ticker for last price
    const unsubscribeTicker = marketDataWs.subscribe<TickerData>(
      {
        symbol,
        type: "ticker",
        marketType: wsMarketType,
      },
      (data) => {
        if (isMountedRef.current && data?.last) {
          setPrevPrice((prev) => prev);
          setLastPrice((prev) => {
            if (prev !== null) {
              setPrevPrice(prev);
            }
            return data.last;
          });
        }
      }
    );
    tickerUnsubscribeRef.current = unsubscribeTicker;

    // Subscribe to orderbook
    const unsubscribeOrderbook = marketDataWs.subscribe<WSOrderbookData>(
      {
        symbol,
        type: "orderbook",
        marketType: wsMarketType,
        limit: MAX_ORDERBOOK_ITEMS,
      },
      (data) => {
        if (isMountedRef.current) {
          setIsLoading(false);
          if (data && data.bids && data.asks) {
            setOrderbook({
              bids: data.bids.slice(0, MAX_ORDERBOOK_ITEMS),
              asks: data.asks.slice(0, MAX_ORDERBOOK_ITEMS),
              timestamp: data.timestamp || Date.now(),
            });
          }
        }
      }
    );
    orderbookUnsubscribeRef.current = unsubscribeOrderbook;

    // Subscribe to trades
    const unsubscribeTrades = marketDataWs.subscribe<WSTradeData[]>(
      {
        symbol,
        type: "trades",
        marketType: wsMarketType,
      },
      (data) => {
        if (isMountedRef.current && data && Array.isArray(data)) {
          const formattedTrades: TradeData[] = data.slice(0, MAX_TRADES).map((trade) => ({
            id: String(trade.id),
            price: trade.price,
            amount: trade.amount,
            side: trade.side,
            timestamp: trade.timestamp,
          }));
          setTrades(formattedTrades);
        }
      }
    );
    tradesUnsubscribeRef.current = unsubscribeTrades;

    // Timeout for loading state
    const timeout = setTimeout(() => {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      isMountedRef.current = false;
      cleanupSubscriptions();
      clearTimeout(timeout);
    };
  }, [symbol, wsMarketType, cleanupSubscriptions]);

  // Listen for market switching cleanup events
  useEffect(() => {
    const handleMarketSwitchingCleanup = () => {
      cleanupSubscriptions();
      setOrderbook(null);
      setTrades([]);
      setLastPrice(null);
      setPrevPrice(null);
      setIsLoading(true);
    };

    window.addEventListener("market-switching-cleanup", handleMarketSwitchingCleanup);

    return () => {
      window.removeEventListener("market-switching-cleanup", handleMarketSwitchingCleanup);
    };
  }, [cleanupSubscriptions]);

  // Handle click on price (set order price)
  const handlePriceClick = useCallback((price: number) => {
    window.dispatchEvent(
      new CustomEvent("tp-set-order-price", {
        detail: { price },
      })
    );
  }, []);

  // Calculate spread
  const spread = useMemo(() => {
    if (!orderbook || !orderbook.asks[0] || !orderbook.bids[0]) return null;
    const value = orderbook.asks[0][0] - orderbook.bids[0][0];
    const percentage = (value / orderbook.asks[0][0]) * 100;
    return { value, percentage };
  }, [orderbook]);

  // Calculate max volume for depth bar
  const maxVolume = useMemo(() => {
    if (!orderbook) return 1;
    const askVolumes = orderbook.asks.slice(0, 15).map(([, amt]) => amt);
    const bidVolumes = orderbook.bids.slice(0, 15).map(([, amt]) => amt);
    return Math.max(...askVolumes, ...bidVolumes, 1);
  }, [orderbook]);

  // Determine price direction
  const priceDirection = useMemo(() => {
    if (!lastPrice || !prevPrice) return "neutral" as const;
    if (lastPrice > prevPrice) return "up" as const;
    if (lastPrice < prevPrice) return "down" as const;
    return "neutral" as const;
  }, [lastPrice, prevPrice]);

  // Get precision from metadata or fallback to smart precision based on price
  const pricePrecision = useMemo(() => {
    // Use metadata precision if available
    if (metadata?.precision?.price !== undefined) {
      return metadata.precision.price;
    }
    // Fallback to smart precision based on price value
    if (!lastPrice) return 2;
    if (lastPrice >= 1000) return 2;
    if (lastPrice >= 1) return 4;
    return 8;
  }, [metadata?.precision?.price, lastPrice]);

  // Note: We use flex-col-reverse on the asks container which naturally
  // positions content at the bottom and scroll works correctly without manual scrolling

  // ResizeObserver to detect panel height and switch to horizontal layout when space is limited
  useEffect(() => {
    if (!panelRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        // Switch to horizontal layout when height is below threshold
        setUseHorizontalLayout(height < HORIZONTAL_LAYOUT_THRESHOLD);
      }
    });

    observer.observe(panelRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Show skeleton while loading - but don't early return to maintain hooks order
  if (isLoading && !orderbook) {
    return (
      <div ref={panelRef} className={cn("tp-orderbook-panel flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
        <OrderBookSkeleton />
      </div>
    );
  }

  return (
    <div ref={panelRef} className={cn("tp-orderbook-panel flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Header with options - hide some options in compact/horizontal mode */}
      <OrderBookHeader
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        showCumulative={showCumulative}
        onShowCumulativeChange={setShowCumulative}
        compact={useHorizontalLayout}
      />

      {/* Tabs */}
      <div className="flex border-b border-[var(--tp-border)]">
        <TabButton
          active={activeTab === "orderbook"}
          onClick={() => setActiveTab("orderbook")}
        >
          Order Book
        </TabButton>
        <TabButton
          active={activeTab === "trades"}
          onClick={() => setActiveTab("trades")}
        >
          Trades
        </TabButton>
        {!useHorizontalLayout && (
          <TabButton
            active={activeTab === "depth"}
            onClick={() => setActiveTab("depth")}
          >
            Depth
          </TabButton>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "orderbook" && orderbook && (
          useHorizontalLayout ? (
            // Horizontal side-by-side layout when height is limited
            <OrderBookHorizontal
              bids={orderbook.bids.slice(0, MAX_ORDERBOOK_ITEMS)}
              asks={orderbook.asks.slice(0, MAX_ORDERBOOK_ITEMS)}
              showCumulative={showCumulative}
              onPriceClick={handlePriceClick}
              maxVolume={maxVolume}
              pricePrecision={pricePrecision}
              lastPrice={lastPrice}
              spread={spread}
              priceDirection={priceDirection}
            />
          ) : (
            // Vertical stacked layout (default)
            <div className="h-full flex flex-col">
              {/* Column Headers */}
              <div className="grid grid-cols-3 gap-2 px-2 py-1 text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide border-b border-[var(--tp-border-subtle)] shrink-0">
                <span>Price</span>
                <span className="text-right">Amount</span>
                <span className="text-right">{showCumulative ? "Total" : "Sum"}</span>
              </div>

              {/* Asks (sells) - reversed so best ask (lowest price) is at bottom near the spread */}
              {(displayMode === "both" || displayMode === "asks") && (
                <div
                  ref={asksContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse scrollbar-none"
                >
                  <OrderBookTable
                    data={[...orderbook.asks.slice(0, MAX_ORDERBOOK_ITEMS)].reverse()}
                    side="ask"
                    showCumulative={showCumulative}
                    onPriceClick={handlePriceClick}
                    maxVolume={maxVolume}
                    pricePrecision={pricePrecision}
                  />
                </div>
              )}

              {/* Spread indicator */}
              {displayMode === "both" && spread && (
                <SpreadIndicator
                  spread={spread.value}
                  percentage={spread.percentage}
                  lastPrice={lastPrice}
                  priceDirection={priceDirection}
                  pricePrecision={pricePrecision}
                />
              )}

              {/* Bids (buys) */}
              {(displayMode === "both" || displayMode === "bids") && (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                  <OrderBookTable
                    data={orderbook.bids.slice(0, MAX_ORDERBOOK_ITEMS)}
                    side="bid"
                    showCumulative={showCumulative}
                    onPriceClick={handlePriceClick}
                    maxVolume={maxVolume}
                    pricePrecision={pricePrecision}
                  />
                </div>
              )}
            </div>
          )
        )}

        {activeTab === "trades" && (
          <TradesPanel
            trades={trades}
            pricePrecision={pricePrecision}
          />
        )}

        {activeTab === "depth" && orderbook && !useHorizontalLayout && (
          <DepthChart
            bids={orderbook.bids}
            asks={orderbook.asks}
          />
        )}
      </div>
    </div>
  );
});

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5",
        "text-xs font-medium",
        "transition-colors",
        "border-b-2 -mb-px",
        active
          ? "text-[var(--tp-text-primary)] border-[var(--tp-blue)]"
          : "text-[var(--tp-text-muted)] border-transparent hover:text-[var(--tp-text-secondary)]"
      )}
    >
      {children}
    </button>
  );
}

export default OrderBookPanel;
