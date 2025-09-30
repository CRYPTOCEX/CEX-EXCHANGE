"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  BarChart2,
  Clock,
  ChevronDown,
  ChevronUp,
  Percent,
} from "lucide-react";
import { Tabs, TabsList, TabTrigger, TabContent } from "../ui/custom-tabs";
import { cn } from "@/lib/utils";
import { useTheme as useNextTheme } from "next-themes";
import type { Symbol } from "@/store/trade/use-binary-store";
import {
  marketDataWs,
  type OrderbookData,
  type TradeData,
  type TickerData,
  type MarketType,
} from "@/services/market-data-ws";
import { ConnectionStatus } from "@/services/ws-manager";
import { useTranslations } from "next-intl";

interface OrderBookPanelProps {
  symbol?: Symbol;
  marketType?: MarketType;
  currency?: string;
  pair?: string;
}

type AggregationLevel = "0.01" | "0.1" | "1" | "10";

// Maximum number of trades to display
const MAX_TRADES = 15; // Reduced from 25

// Maximum number of orderbook items to display
const MAX_ORDERBOOK_ITEMS = 50; // Increased to show more orders

// Debounce delay for price updates
const PRICE_UPDATE_DEBOUNCE = 200; // Increased from 100

// Update throttling
const ORDERBOOK_UPDATE_THROTTLE = 100; // Throttle orderbook updates
const TRADES_UPDATE_THROTTLE = 500; // Throttle trades updates

export default function OrderBookPanel({
  symbol = "BTCUSDT",
  marketType = "spot",
  currency,
  pair,
}: OrderBookPanelProps) {
  const t = useTranslations("trade/components/orderbook/orderbook-panel");
  const { theme } = useNextTheme();
  const [currentSymbol, setCurrentSymbol] = useState<Symbol>(symbol);
  const [currentMarketType, setCurrentMarketType] =
    useState<MarketType>(marketType);
  const [aggregationLevel, setAggregationLevel] =
    useState<AggregationLevel>("0.01");
  const [showCumulativeVolume, setShowCumulativeVolume] = useState(true);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChangeDirection, setPriceChangeDirection] = useState<
    "up" | "down" | null
  >(null);
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);

  // State for orderbook and trades data
  const [orderbookData, setOrderbookData] = useState<OrderbookData | null>(
    null
  );
  const [tradesData, setTradesData] = useState<TradeData[]>([]);
  const [isOrderbookLoading, setIsOrderbookLoading] = useState(true);
  const [isTradesLoading, setIsTradesLoading] = useState(true);

  // Track highlighted trade
  const [highlightedTrade, setHighlightedTrade] = useState<number | null>(null);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll asks to bottom on mobile to show best ask price (only on initial load)
  useEffect(() => {
    if (isMobile && orderbookData && asksScrollRef.current && !hasInitialScrolled) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (asksScrollRef.current) {
          asksScrollRef.current.scrollTop = asksScrollRef.current.scrollHeight;
          setHasInitialScrolled(true);
        }
      }, 100);
    }
  }, [isMobile, orderbookData, hasInitialScrolled]);

  // Refs for cleanup and performance optimization
  const isMountedRef = useRef(true);
  const prevPriceRef = useRef<number | null>(null);
  const priceIndicatorRef = useRef<HTMLDivElement>(null);
  const lastPriceUpdateRef = useRef<number>(0);
  const orderbookUnsubscribeRef = useRef<(() => void) | null>(null);
  const tradesUnsubscribeRef = useRef<(() => void) | null>(null);
  const tickerUnsubscribeRef = useRef<(() => void) | null>(null);
  const connectionStatusUnsubscribeRef = useRef<(() => void) | null>(null);
  const priceDirectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const priceUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const orderbookTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tradesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const asksScrollRef = useRef<HTMLDivElement>(null);
  
  // Throttling refs
  const orderbookUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tradesUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastOrderbookUpdateRef = useRef<number>(0);
  const lastTradesUpdateRef = useRef<number>(0);
  const pendingOrderbookDataRef = useRef<OrderbookData | null>(null);
  const pendingTradesDataRef = useRef<TradeData[]>([]);

  // Memoized callbacks to prevent unnecessary re-renders
  const handlePriceHover = useCallback((price: number) => {
    setHoveredPrice(price);
  }, []);

  const handlePriceLeave = useCallback(() => {
    setHoveredPrice(null);
  }, []);

  // Get the quote currency from pair prop
  const quoteCurrency = pair || '';

  // Optimized price formatting with memoization
  const formatPrice = useCallback((price: number): string => {
    if (price > 1000)
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    if (price > 1)
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      });
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 6,
      maximumFractionDigits: 8,
    });
  }, []);

  // Clean up all timers
  const cleanupTimers = useCallback(() => {
    if (priceDirectionTimerRef.current) {
      clearTimeout(priceDirectionTimerRef.current);
      priceDirectionTimerRef.current = null;
    }
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    if (priceUpdateTimerRef.current) {
      clearTimeout(priceUpdateTimerRef.current);
      priceUpdateTimerRef.current = null;
    }
    if (orderbookUpdateTimerRef.current) {
      clearTimeout(orderbookUpdateTimerRef.current);
      orderbookUpdateTimerRef.current = null;
    }
    if (tradesUpdateTimerRef.current) {
      clearTimeout(tradesUpdateTimerRef.current);
      tradesUpdateTimerRef.current = null;
    }
    if (orderbookTimeoutRef.current) {
      clearTimeout(orderbookTimeoutRef.current);
      orderbookTimeoutRef.current = null;
    }
    if (tradesTimeoutRef.current) {
      clearTimeout(tradesTimeoutRef.current);
      tradesTimeoutRef.current = null;
    }
  }, []);

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
    if (connectionStatusUnsubscribeRef.current) {
      connectionStatusUnsubscribeRef.current();
      connectionStatusUnsubscribeRef.current = null;
    }
  }, []);

  // Optimized price update function with debouncing
  const updateLastPrice = useCallback((price: number) => {
    if (!isMountedRef.current) return;

    // Clear existing timer
    if (priceUpdateTimerRef.current) {
      clearTimeout(priceUpdateTimerRef.current);
    }

    // Debounce price updates to reduce CPU usage
    priceUpdateTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      const timeSinceLastUpdate = now - lastPriceUpdateRef.current;

      // Only update if significant time has passed
      if (timeSinceLastUpdate > PRICE_UPDATE_DEBOUNCE) {
        // Determine price change direction
        if (prevPriceRef.current !== null) {
          const newDirection = price > prevPriceRef.current ? "up" : 
                               price < prevPriceRef.current ? "down" : null;
          
          if (newDirection) {
            setPriceChangeDirection(newDirection);

            // Clear existing direction timer
            if (priceDirectionTimerRef.current) {
              clearTimeout(priceDirectionTimerRef.current);
            }

            // Reset direction after animation
            priceDirectionTimerRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                setPriceChangeDirection(null);
              }
            }, 1000);
          }
        }

        // Update price
        setLastPrice(price);
        prevPriceRef.current = price;
        lastPriceUpdateRef.current = now;
      }
    }, PRICE_UPDATE_DEBOUNCE);
  }, []);

  // Throttled orderbook update function
  const updateOrderbookData = useCallback((data: OrderbookData) => {
    if (!isMountedRef.current) return;

    pendingOrderbookDataRef.current = data;

    if (orderbookUpdateTimerRef.current) return; // Already scheduled

    const now = Date.now();
    const timeSinceLastUpdate = now - lastOrderbookUpdateRef.current;

    if (timeSinceLastUpdate >= ORDERBOOK_UPDATE_THROTTLE) {
      // Update immediately
      const limitedData = {
        ...data,
        bids: data.bids.slice(0, MAX_ORDERBOOK_ITEMS),
        asks: data.asks.slice(0, MAX_ORDERBOOK_ITEMS),
      };
      setOrderbookData(limitedData);
      setIsOrderbookLoading(false);
      lastOrderbookUpdateRef.current = now;
    } else {
      // Schedule update
      orderbookUpdateTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && pendingOrderbookDataRef.current) {
          const limitedData = {
            ...pendingOrderbookDataRef.current,
            bids: pendingOrderbookDataRef.current.bids.slice(0, MAX_ORDERBOOK_ITEMS),
            asks: pendingOrderbookDataRef.current.asks.slice(0, MAX_ORDERBOOK_ITEMS),
          };
          setOrderbookData(limitedData);
          setIsOrderbookLoading(false);
          lastOrderbookUpdateRef.current = Date.now();
          pendingOrderbookDataRef.current = null;
        }
        orderbookUpdateTimerRef.current = null;
      }, ORDERBOOK_UPDATE_THROTTLE - timeSinceLastUpdate);
    }
  }, []);

  // Throttled trades update function
  const updateTradesData = useCallback((data: TradeData[]) => {
    if (!isMountedRef.current || !data?.length || !Array.isArray(data)) return;

    pendingTradesDataRef.current = data;

    if (tradesUpdateTimerRef.current) return; // Already scheduled

    const now = Date.now();
    const timeSinceLastUpdate = now - lastTradesUpdateRef.current;

    if (timeSinceLastUpdate >= TRADES_UPDATE_THROTTLE) {
      // Update immediately - with array validation
      setTradesData((prevTrades) => {
        const newTrades = [...data]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_TRADES);
        
        // Combine with existing trades, remove duplicates, and limit
        const combinedTrades = [...newTrades, ...prevTrades]
          .filter((trade, index, arr) => 
            arr.findIndex(t => t.id === trade.id) === index
          )
          .slice(0, MAX_TRADES);
        
        return combinedTrades;
      });
      setIsTradesLoading(false);
      lastTradesUpdateRef.current = now;
    } else {
      // Schedule update
      tradesUpdateTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && pendingTradesDataRef.current.length > 0) {
          const pendingData = pendingTradesDataRef.current;
          setTradesData((prevTrades) => {
            const newTrades = [...pendingData]
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, MAX_TRADES);
            
            const combinedTrades = [...newTrades, ...prevTrades]
              .filter((trade, index, arr) => 
                arr.findIndex(t => t.id === trade.id) === index
              )
              .slice(0, MAX_TRADES);
            
            return combinedTrades;
          });
          setIsTradesLoading(false);
          lastTradesUpdateRef.current = Date.now();
          pendingTradesDataRef.current = [];
        }
        tradesUpdateTimerRef.current = null;
      }, TRADES_UPDATE_THROTTLE - timeSinceLastUpdate);
    }
  }, []);

  // Subscribe to market data with proper cleanup
  const subscribeToMarketData = useCallback(() => {
    if (!currentSymbol) return;

    // Clean up previous subscriptions first
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

    // Set a timeout to clear loading state if no data is received
    orderbookTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsOrderbookLoading(false);
        setOrderbookData({ asks: [], bids: [], timestamp: Date.now(), symbol: currentSymbol });
      }
    }, 5000); // 5 second timeout

    tradesTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsTradesLoading(false);
        setTradesData([]);
      }
    }, 5000); // 5 second timeout

    // Subscribe to ticker data
    const unsubscribeTicker = marketDataWs.subscribe<TickerData>(
      {
        symbol: currentSymbol,
        type: "ticker",
        marketType: currentMarketType,
      },
      (data) => {
        if (isMountedRef.current && data?.last) {
          setTickerData(data);
          // Update last price with direction detection inline
          const newPrice = data.last;
          if (prevPriceRef.current !== null && prevPriceRef.current !== newPrice) {
            setLastPrice(newPrice);
            setPriceChangeDirection(newPrice > prevPriceRef.current ? "up" : "down");
            
            // Clear direction after animation
            setTimeout(() => {
              if (isMountedRef.current) {
                setPriceChangeDirection(null);
              }
            }, 1000);
          } else if (prevPriceRef.current === null) {
            setLastPrice(newPrice);
          }
          
          prevPriceRef.current = newPrice;
        }
      }
    );
    tickerUnsubscribeRef.current = unsubscribeTicker;

    // Subscribe to orderbook data with throttling
    const unsubscribeOrderbook = marketDataWs.subscribe<OrderbookData>(
      {
        symbol: currentSymbol,
        type: "orderbook",
        marketType: currentMarketType,
        limit: MAX_ORDERBOOK_ITEMS,
      },
      (data) => {
        if (isMountedRef.current) {
          // Clear timeout since we received data
          if (orderbookTimeoutRef.current) {
            clearTimeout(orderbookTimeoutRef.current);
            orderbookTimeoutRef.current = null;
          }
          // Always set loading to false once we receive a response, even if empty
          setIsOrderbookLoading(false);
          if (data) {
            setOrderbookData(data);
          } else {
            // Set empty orderbook data to show empty state
            setOrderbookData({ asks: [], bids: [], timestamp: Date.now(), symbol: currentSymbol });
          }
        }
      }
    );
    orderbookUnsubscribeRef.current = unsubscribeOrderbook;

    // Subscribe to trades data with throttling
    const unsubscribeTrades = marketDataWs.subscribe<TradeData[]>(
      {
        symbol: currentSymbol,
        type: "trades",
        marketType: currentMarketType,
      },
      (data) => {
        if (isMountedRef.current) {
          // Clear timeout since we received data
          if (tradesTimeoutRef.current) {
            clearTimeout(tradesTimeoutRef.current);
            tradesTimeoutRef.current = null;
          }
          
          if (data && Array.isArray(data) && data.length > 0) {
            setTradesData(data);
            setIsTradesLoading(false);

            // Highlight new trades with cleanup
            setHighlightedTrade(0);
            
            if (highlightTimerRef.current) {
              clearTimeout(highlightTimerRef.current);
            }
            
            highlightTimerRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                setHighlightedTrade(null);
              }
            }, 800);
          } else {
            // Empty trades data received
            setIsTradesLoading(false);
            setTradesData([]);
          }
        }
      }
    );
    tradesUnsubscribeRef.current = unsubscribeTrades;

    // Return cleanup function for timeouts
    return () => {
      if (orderbookTimeoutRef.current) {
        clearTimeout(orderbookTimeoutRef.current);
        orderbookTimeoutRef.current = null;
      }
      if (tradesTimeoutRef.current) {
        clearTimeout(tradesTimeoutRef.current);
        tradesTimeoutRef.current = null;
      }
    };
  }, [currentSymbol, currentMarketType]);

  // Listen for market switching cleanup events
  useEffect(() => {
    const handleMarketSwitchingCleanup = (event: CustomEvent) => {
      const { oldSymbol, newSymbol, oldMarketType, newMarketType } = event.detail;
      
      // Clean up all subscriptions immediately
      cleanupSubscriptions();
      cleanupTimers();
      
      // Reset all data to prevent contamination
      setOrderbookData(null);
      setTradesData([]);
      setTickerData(null);
      setLastPrice(null);
      setPriceChangeDirection(null);
      setHoveredPrice(null);
      setHighlightedTrade(null);
      setIsOrderbookLoading(true);
      setIsTradesLoading(true);
      setHasInitialScrolled(false);
      
      // Clear price reference
      prevPriceRef.current = null;
      
      // Clear pending data
      pendingOrderbookDataRef.current = null;
      pendingTradesDataRef.current = [];
    };

    window.addEventListener('market-switching-cleanup', handleMarketSwitchingCleanup as EventListener);
    
    return () => {
      window.removeEventListener('market-switching-cleanup', handleMarketSwitchingCleanup as EventListener);
    };
  }, [cleanupSubscriptions, cleanupTimers]);

  // Initialize WebSocket connection
  useEffect(() => {
    isMountedRef.current = true;
    marketDataWs.initialize();

    return () => {
      isMountedRef.current = false;
      cleanupSubscriptions();
      cleanupTimers();
    };
  }, [cleanupSubscriptions, cleanupTimers]);

  // Setup connection status subscription and initial market data subscription
  useEffect(() => {
    if (!currentSymbol) return;

    // Subscribe to connection status updates
    const unsubscribeStatus = marketDataWs.subscribeToConnectionStatus(
      (status) => {
        if (isMountedRef.current) {
          setConnectionStatus(status);
        }
      },
      currentMarketType
    );
    connectionStatusUnsubscribeRef.current = unsubscribeStatus;

    // Initial subscription
    subscribeToMarketData();

    return () => {
      if (connectionStatusUnsubscribeRef.current) {
        connectionStatusUnsubscribeRef.current();
        connectionStatusUnsubscribeRef.current = null;
      }
    };
  }, [currentSymbol, currentMarketType, subscribeToMarketData]);

  // Handle symbol or market type changes
  useEffect(() => {
    const symbolChanged = symbol !== currentSymbol;
    const marketTypeChanged = marketType !== currentMarketType;

    if (symbolChanged || marketTypeChanged) {
      // Clean up existing subscriptions and timers
      cleanupSubscriptions();
      cleanupTimers();

      // Update state
      if (symbolChanged) {
        setCurrentSymbol(symbol);
        setPriceChangeDirection(null);
        setLastPrice(null);
        prevPriceRef.current = null;
        setHasInitialScrolled(false); // Reset scroll flag for new symbol
      }

      if (marketTypeChanged) {
        setCurrentMarketType(marketType);
        setConnectionStatus(marketDataWs.getConnectionStatus(marketType));
      }

      // Reset data
      setOrderbookData(null);
      setTradesData([]);
      setTickerData(null);
      setIsOrderbookLoading(true);
      setIsTradesLoading(true);
      setHoveredPrice(null);
      setHighlightedTrade(null);

      // Subscribe to new data
      subscribeToMarketData();
    }
  }, [symbol, marketType, subscribeToMarketData]);

  // Note: Aggregation level changes don't require resubscription since it's client-side processing

  // Stable key generation for DOM nodes
  const generateStableKey = useCallback((price: number, side: "bid" | "ask", index: number): string => {
    // Round price to avoid floating point precision issues
    const roundedPrice = Math.round(price * 100000) / 100000;
    return `${side}-${roundedPrice}-${index}`;
  }, []);

  // Aggregate orderbook data with performance optimization
  const aggregatedOrderbook = useMemo(() => {
    if (!orderbookData) return null;

    const aggregationValue = Number.parseFloat(aggregationLevel);

    const aggregateEntries = (entries: Array<[number, number]>) => {
      const aggregated = new Map<string, number>();

      for (let i = 0; i < Math.min(entries.length, MAX_ORDERBOOK_ITEMS); i++) {
        const [price, amount] = entries[i];
        const roundedPrice = Math.floor(price / aggregationValue) * aggregationValue;
        const key = roundedPrice.toString();
        aggregated.set(key, (aggregated.get(key) || 0) + amount);
      }

      return Array.from(aggregated.entries())
        .map(([price, amount]) => [Number.parseFloat(price), amount] as [number, number])
        .slice(0, MAX_ORDERBOOK_ITEMS);
    };

    return {
      ...orderbookData,
      bids: aggregateEntries(orderbookData.bids).sort((a, b) => b[0] - a[0]),
      asks: aggregateEntries(orderbookData.asks).sort((a, b) => a[0] - b[0]),
    };
  }, [orderbookData, aggregationLevel]);

  // Process orderbook with cumulative volumes and max amount calculation
  const processedOrderbook = useMemo(() => {
    if (!aggregatedOrderbook) return null;

    let bidsCumulative = 0;
    let asksCumulative = 0;
    const maxItems = MAX_ORDERBOOK_ITEMS; // Use the full limit

    const processedBids = aggregatedOrderbook.bids
      .slice(0, maxItems)
      .map(([price, amount]) => {
        bidsCumulative += amount;
        return [price, amount, bidsCumulative] as [number, number, number];
      });

    const processedAsks = aggregatedOrderbook.asks
      .slice(0, maxItems)
      .map(([price, amount]) => {
        asksCumulative += amount;
        return [price, amount, asksCumulative] as [number, number, number];
      });

    // Calculate max cumulative for cumulative volume display
    const maxCumulative = Math.max(
      processedBids.length > 0 ? processedBids[processedBids.length - 1][2] : 0,
      processedAsks.length > 0 ? processedAsks[processedAsks.length - 1][2] : 0
    );

    // Calculate max individual amount for proper depth bar visualization
    const maxBidAmount = processedBids.length > 0 ? Math.max(...processedBids.map(([, amount]) => amount)) : 0;
    const maxAskAmount = processedAsks.length > 0 ? Math.max(...processedAsks.map(([, amount]) => amount)) : 0;
    const maxAmount = Math.max(maxBidAmount, maxAskAmount);

    return {
      bids: processedBids,
      asks: processedAsks,
      maxCumulative,
      maxAmount, // Add max individual amount for proper depth bars
    };
  }, [aggregatedOrderbook]);

  // Get price indicator color
  const getPriceIndicatorColor = useCallback(() => {
    if (priceChangeDirection === "up") {
      return theme === "dark"
        ? "border-green-500 bg-green-500/10 text-green-500"
        : "border-green-600 bg-green-100/10 text-green-700";
    } else if (priceChangeDirection === "down") {
      return theme === "dark"
        ? "border-red-500 bg-red-500/10 text-red-500"
        : "border-red-600 bg-red-100/10 text-red-700";
    } else {
      return theme === "dark"
        ? "border-zinc-600 bg-zinc-800/30 text-zinc-400"
        : "border-zinc-300 bg-zinc-100/30 text-zinc-600";
    }
  }, [priceChangeDirection, theme]);

  // Mobile order book layout
  const renderMobileOrderbook = () => {
    if (!processedOrderbook) return null;

    const maxDisplayItems = 15; // Show more items like desktop
    const asks = processedOrderbook.asks.slice(0, maxDisplayItems).reverse(); // Reverse asks to show highest first
    const bids = processedOrderbook.bids.slice(0, maxDisplayItems);

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-xs flex-shrink-0">
          <div className="text-zinc-600 dark:text-zinc-400 text-left font-medium">
            Price ({quoteCurrency})
          </div>
          <div className="text-zinc-600 dark:text-zinc-400 text-center font-medium">
            Amount
          </div>
          <div className="text-zinc-600 dark:text-zinc-400 text-right font-medium">
            {showCumulativeVolume ? "Total" : "Value"}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Asks Section - Top */}
          <div 
            ref={asksScrollRef}
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600 min-h-0"
          >
            {asks.map(([price, amount, cumulative], index) => {
              const depth = (amount / processedOrderbook.maxAmount) * 100;
              const isHighlighted = hoveredPrice === price;

              return (
                <div
                  key={generateStableKey(price, "ask", index)}
                  className={cn(
                    "grid grid-cols-3 py-2 px-2 hover:bg-red-50 dark:hover:bg-red-500/5 border-b border-zinc-100 dark:border-zinc-900 relative",
                    isHighlighted && "bg-red-50 dark:bg-red-500/10"
                  )}
                  onMouseEnter={() => handlePriceHover(price)}
                  onMouseLeave={handlePriceLeave}
                >
                  <div
                    className="absolute inset-y-0 right-0 bg-red-100/50 dark:bg-red-500/10"
                    style={{ width: `${depth}%` }}
                  />
                  <div className="text-sm font-medium text-red-600 dark:text-red-500 relative z-10">
                    {formatPrice(price)}
                  </div>
                  <div className="text-sm text-zinc-800 dark:text-zinc-300 relative z-10 text-center">
                    {amount.toFixed(4)}
                  </div>
                  <div className="text-sm text-zinc-800 dark:text-zinc-300 relative z-10 text-right">
                    {showCumulativeVolume
                      ? cumulative.toFixed(4)
                      : (price * amount).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ticker Price Section - Middle */}
          {lastPrice && (
            <div className={cn(
              "border-y px-4 py-3 text-center flex-shrink-0 transition-all duration-300",
              getPriceIndicatorColor()
            )}>
              <div className="flex items-center justify-center space-x-2">
                {priceChangeDirection === "up" && (
                  <ChevronUp className="h-4 w-4" />
                )}
                {priceChangeDirection === "down" && (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="text-lg font-bold">
                  {formatPrice(lastPrice)}
                </span>
              </div>
            </div>
          )}

          {/* Bids Section - Bottom */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600 min-h-0">
            {bids.map(([price, amount, cumulative], index) => {
              const depth = (amount / processedOrderbook.maxAmount) * 100;
              const isHighlighted = hoveredPrice === price;

              return (
                <div
                  key={generateStableKey(price, "bid", index)}
                  className={cn(
                    "grid grid-cols-3 py-2 px-2 hover:bg-green-50 dark:hover:bg-green-500/5 border-b border-zinc-100 dark:border-zinc-900 relative",
                    isHighlighted && "bg-green-50 dark:bg-green-500/10"
                  )}
                  onMouseEnter={() => handlePriceHover(price)}
                  onMouseLeave={handlePriceLeave}
                >
                  <div
                    className="absolute inset-y-0 right-0 bg-green-100/50 dark:bg-green-500/10"
                    style={{ width: `${depth}%` }}
                  />
                  <div className="text-sm font-medium text-green-600 dark:text-green-500 relative z-10">
                    {formatPrice(price)}
                  </div>
                  <div className="text-sm text-zinc-800 dark:text-zinc-300 relative z-10 text-center">
                    {amount.toFixed(4)}
                  </div>
                  <div className="text-sm text-zinc-800 dark:text-zinc-300 relative z-10 text-right">
                    {showCumulativeVolume
                      ? cumulative.toFixed(4)
                      : (price * amount).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="orderbook" className="flex flex-col h-full">
        <TabsList className="w-full grid grid-cols-2 flex-shrink-0">
          <TabTrigger
            value="orderbook"
            icon={<BarChart2 className="h-3 w-3" />}
          >
            {t("order_book")}
          </TabTrigger>
          <TabTrigger value="trades" icon={<Clock className="h-3 w-3" />}>
            {t("recent_trades")}
          </TabTrigger>
        </TabsList>

        <TabContent
          value="orderbook"
          className="flex flex-col flex-grow overflow-hidden"
        >
          <div className="flex items-center justify-between px-1 py-0.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex-shrink-0">
            <div className="flex items-center">
              <button
                onClick={() => setShowCumulativeVolume(!showCumulativeVolume)}
                className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-primary flex items-center p-0.5 rounded"
              >
                <Percent className="h-3 w-3 mr-0.5" />
                <span className="text-[10px]">
                  {showCumulativeVolume ? "Total" : "Amount"}
                </span>
              </button>
            </div>

            <div className="flex items-center">
              <span className="text-[10px] text-zinc-600 dark:text-zinc-400 mr-0.5">
                {t("group")}
              </span>
              <select
                value={aggregationLevel}
                onChange={(e) =>
                  setAggregationLevel(e.target.value as AggregationLevel)
                }
                className={cn(
                  "text-[10px] border rounded px-0.5 py-0 focus:outline-none focus:ring-1 focus:ring-primary",
                  theme === "dark"
                    ? "bg-zinc-800 border-zinc-700 text-zinc-200 focus:ring-zinc-600"
                    : "bg-transparent border-zinc-200 text-zinc-800"
                )}
                style={{
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='${theme === "dark" ? "%23888" : "%23666"}' strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: "right 0.2rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1rem 1rem",
                  paddingRight: "1.5rem",
                }}
              >
                <option
                  value="0.01"
                  className={
                    theme === "dark" ? "bg-zinc-800 text-zinc-200" : ""
                  }
                >
                  0.01
                </option>
                <option
                  value="0.1"
                  className={
                    theme === "dark" ? "bg-zinc-800 text-zinc-200" : ""
                  }
                >
                  0.1
                </option>
                <option
                  value="1"
                  className={
                    theme === "dark" ? "bg-zinc-800 text-zinc-200" : ""
                  }
                >
                  1
                </option>
                <option
                  value="10"
                  className={
                    theme === "dark" ? "bg-zinc-800 text-zinc-200" : ""
                  }
                >
                  10
                </option>
              </select>
            </div>
          </div>

          {isOrderbookLoading ? (
            <div className="flex items-center justify-center flex-grow">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary dark:border-green-500"></div>
            </div>
          ) : !processedOrderbook || (processedOrderbook.bids.length === 0 && processedOrderbook.asks.length === 0) ? (
            <div className="flex items-center justify-center flex-grow text-zinc-500 dark:text-zinc-500">
              <div className="text-center">
                <BarChart2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium mb-1">{t("no_orderbook_data")}</p>
                <p className="text-xs opacity-75">{t("waiting_for_market_data")}</p>
              </div>
            </div>
          ) : isMobile ? (
            // Mobile layout: asks top, ticker middle, bids bottom
            renderMobileOrderbook()
          ) : (
            // Desktop layout: side by side
            <div className="relative grid grid-cols-2 flex-grow overflow-hidden">
              {/* Last price indicator */}
              {lastPrice && (
                <div
                  ref={priceIndicatorRef}
                  className={cn(
                    "absolute inset-x-0 top-0 z-10 border-y px-2 py-0.5 text-xs font-medium flex justify-center transition-all duration-300 pointer-events-none",
                    getPriceIndicatorColor()
                  )}
                >
                  <div className="flex items-center">
                    {priceChangeDirection === "up" && (
                      <ChevronUp className="h-3 w-3 mr-1" />
                    )}
                    {priceChangeDirection === "down" && (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    )}
                    {formatPrice(lastPrice)}
                  </div>
                </div>
              )}

              {/* Bids */}
              <div className="border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full overflow-hidden">
                <div className="grid grid-cols-3 p-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-[10px] flex-shrink-0">
                  <div className="text-zinc-600 dark:text-zinc-400 text-center font-medium">
                    {t("Price")} ({quoteCurrency})
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400 text-center font-medium">
                    {t("Amount")}
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400 text-center font-medium">
                    {showCumulativeVolume ? "Total" : "Value"}
                  </div>
                </div>
                <div className="overflow-y-auto flex-grow scrollbar-none">
                  {processedOrderbook.bids.map(
                    ([price, amount, cumulative], index) => {
                      const depth =
                        (amount / processedOrderbook.maxAmount) * 100;
                      const isHighlighted = hoveredPrice === price;

                      return (
                        <div
                          key={generateStableKey(price, "bid", index)}
                          className={cn(
                            "grid grid-cols-3 py-1 px-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 border-b border-zinc-100 dark:border-zinc-900 relative",
                            isHighlighted && "bg-zinc-100 dark:bg-zinc-800/70"
                          )}
                          onMouseEnter={() => handlePriceHover(price)}
                          onMouseLeave={handlePriceLeave}
                        >
                          <div
                            className="absolute inset-y-0 right-0 bg-green-100/50 dark:bg-green-500/10"
                            style={{ width: `${depth}%` }}
                          />
                          <div className="text-[10px] font-medium text-green-600 dark:text-green-500 relative z-10 text-center">
                            {formatPrice(price)}
                          </div>
                          <div className="text-[10px] text-zinc-800 dark:text-zinc-300 relative z-10 text-center">
                            {amount.toFixed(4)}
                          </div>
                          <div className="text-[10px] text-zinc-800 dark:text-zinc-300 relative z-10 text-center">
                            {showCumulativeVolume
                              ? cumulative.toFixed(4)
                              : (price * amount).toFixed(2)}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Asks */}
              <div className="flex flex-col h-full overflow-hidden">
                <div className="grid grid-cols-3 p-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-[10px] flex-shrink-0">
                  <div className="text-zinc-600 dark:text-zinc-400 text-center font-medium">
                    {t("Price")} ({quoteCurrency})
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400 text-center font-medium">
                    {t("Amount")}
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400 text-center font-medium">
                    {showCumulativeVolume ? "Total" : "Value"}
                  </div>
                </div>
                <div className="overflow-y-auto flex-grow scrollbar-none">
                  {processedOrderbook.asks.map(
                    ([price, amount, cumulative], index) => {
                      const depth =
                        (amount / processedOrderbook.maxAmount) * 100;
                      const isHighlighted = hoveredPrice === price;

                      return (
                        <div
                          key={generateStableKey(price, "ask", index)}
                          className={cn(
                            "grid grid-cols-3 py-1 px-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 border-b border-zinc-100 dark:border-zinc-900 relative",
                            isHighlighted && "bg-zinc-100 dark:bg-zinc-800/70"
                          )}
                          onMouseEnter={() => handlePriceHover(price)}
                          onMouseLeave={handlePriceLeave}
                        >
                          <div
                            className="absolute inset-y-0 left-0 bg-red-100/50 dark:bg-red-500/10"
                            style={{ width: `${depth}%` }}
                          />
                          <div className="text-[10px] font-medium text-red-600 dark:text-red-500 relative z-10 text-center">
                            {formatPrice(price)}
                          </div>
                          <div className="text-[10px] text-zinc-800 dark:text-zinc-300 relative z-10 text-center">
                            {amount.toFixed(4)}
                          </div>
                          <div className="text-[10px] text-zinc-800 dark:text-zinc-300 relative z-10 text-center">
                            {showCumulativeVolume
                              ? cumulative.toFixed(4)
                              : (price * amount).toFixed(2)}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          )}
        </TabContent>

        <TabContent
          value="trades"
          className="flex flex-col flex-grow overflow-hidden"
        >
          <div className="grid grid-cols-3 p-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex-shrink-0">
            <div className="text-[10px] text-zinc-600 dark:text-zinc-400 text-center font-medium">
              {t("Price")} ({quoteCurrency})
            </div>
            <div className="text-[10px] text-zinc-600 dark:text-zinc-400 text-center font-medium">
              {t("Amount")}
            </div>
            <div className="text-[10px] text-zinc-600 dark:text-zinc-400 text-center font-medium">
              {t("Time")}
            </div>
          </div>
          <div className="overflow-y-auto flex-grow scrollbar-none">
            {isTradesLoading || !tradesData || tradesData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-zinc-500 dark:text-zinc-500">
                <div className="text-center">
                  <Clock className="h-5 w-5 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{t("no_recent_trades")}</p>
                </div>
              </div>
            ) : (
              tradesData.slice(0, MAX_TRADES).map((trade, index) => {
                const tradeTime = new Date(
                  trade.timestamp
                ).toLocaleTimeString();
                const isBuy = trade.side === "buy";

                return (
                  <div
                    key={`trade-${trade.id}-${trade.timestamp}`}
                    className={cn(
                      "grid grid-cols-3 py-1.5 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 transition-colors",
                      highlightedTrade === index &&
                        "bg-zinc-50 dark:bg-zinc-800/70"
                    )}
                  >
                    <div
                      className={`text-xs font-medium ${!isBuy ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500"} text-center`}
                    >
                      {formatPrice(trade.price)}
                    </div>
                    <div className="text-xs text-zinc-800 dark:text-zinc-300 text-center">
                      {trade.amount.toFixed(4)}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-500 text-center">
                      {tradeTime}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabContent>
      </Tabs>
    </div>
  );
}