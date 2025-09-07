"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  DollarSign,
  BarChart3,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  X,
} from "lucide-react";
import type { Order } from "@/store/trade/use-binary-store";
import { tickersWs } from "@/services/tickers-ws";
import type { TickerData } from "@/app/[locale]/trade/components/markets/types";
import {
  extractQuoteCurrency,
  extractBaseCurrency,
} from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

interface ActivePositionsProps {
  orders: Order[];
  currentPrice: number;
  onPositionsChange?: (positions: any[]) => void;
  className?: string;
  isMobile?: boolean;
  hasCompletedPositions?: boolean;
  theme?: "dark" | "light";
}

export default function ActivePositions({
  orders,
  currentPrice,
  onPositionsChange,
  className = "",
  isMobile = false,
  hasCompletedPositions = false,
  theme = "dark",
}: ActivePositionsProps) {
  const t = useTranslations("binary/components/positions/active-positions");
  
  // State management with proper initialization
  const [timeLeft, setTimeLeft] = useState<Record<string, string>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [profitLossData, setProfitLossData] = useState<Record<string, number[]>>({});
  const [animateProfit, setAnimateProfit] = useState<Record<string, boolean>>({});
  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});

  // Refs for cleanup and optimization
  const isMountedRef = useRef(true);
  const prevPriceRef = useRef<number>(0);
  const activeOrdersRef = useRef<Order[]>([]);
  const animationStateRef = useRef<Record<string, boolean>>({});
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickerUnsubscribeRef = useRef<(() => void) | null>(null);
  const animationTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Memoized active orders to prevent unnecessary recalculations
  const activeOrders = useMemo(() => {
    const now = Date.now();
    return orders.filter((order) => {
      // Only show PENDING orders that haven't expired yet
      if (order.status === "PENDING") {
        // Check if the order has expired
        return order.expiryTime > now;
      }
      return false;
    });
  }, [orders]);

  // Memoized position markers for chart
  const positions = useMemo(() => {
    return activeOrders.map((order) => ({
      id: order.id,
      entryTime: Math.floor(order.createdAt / 1000), // createdAt is already in ms
      entryPrice: order.entryPrice,
      expiryTime: Math.floor(order.expiryTime / 1000), // expiryTime is already in ms
      type: order.side,
      amount: order.amount,
    }));
  }, [activeOrders]);

  // Memoized theme classes to prevent recreation
  const themeClasses = useMemo(() => ({
    bgClass: theme === "dark" ? "bg-black" : "bg-white",
    panelBgClass: theme === "dark" ? "bg-zinc-950" : "bg-white",
    textClass: theme === "dark" ? "text-white" : "text-black",
    secondaryTextClass: theme === "dark" ? "text-zinc-400" : "text-zinc-600",
    borderClass: theme === "dark" ? "border-zinc-800" : "border-zinc-200",
    hoverBgClass: theme === "dark" ? "hover:bg-zinc-900" : "hover:bg-zinc-100",
    riseColorClass: "text-green-500",
    fallColorClass: "text-red-500",
    profitColorClass: "text-green-400",
    lossColorClass: "text-red-400",
  }), [theme]);

  // Optimized price getter with memoization
  const getCurrentPrice = useCallback((symbol: string): number => {
    // Try different symbol formats to find the price
    let price = tickerData[symbol]?.last;

    if (typeof price !== "number") {
      // Try with / separator
      const symbolWithSlash = symbol.includes('/') 
        ? symbol 
        : symbol.replace(/([A-Z]+)([A-Z]{3,4})$/, '$1/$2');
      price = tickerData[symbolWithSlash]?.last;

      // Additional fallback: try common format variations
      if (typeof price !== "number") {
        const baseCurrency = extractBaseCurrency(symbol);
        const quoteCurrency = extractQuoteCurrency(symbol);
        
        const variations = [
          `${baseCurrency}${quoteCurrency}`,
          `${baseCurrency}/${quoteCurrency}`,
          `${baseCurrency}-${quoteCurrency}`,
          `${baseCurrency}_${quoteCurrency}`,
          symbol.toUpperCase(),
          symbol.toLowerCase(),
        ];
        
        for (const variation of variations) {
          price = tickerData[variation]?.last;
          if (typeof price === "number") {
            break;
          }
        }
      }
    }

    return typeof price === "number" ? price : currentPrice;
  }, [tickerData, currentPrice]);

  // Memoized profit/loss calculation
  const calculateProfitLoss = useCallback((order: Order, symbolPrice: number): number => {
    return order.side === "RISE"
      ? symbolPrice > order.entryPrice
        ? (order.amount * 87) / 100
        : -order.amount
      : symbolPrice < order.entryPrice
        ? (order.amount * 87) / 100
        : -order.amount;
  }, []);

  // Memoized time formatting
  const formatTimeLeft = useCallback((expiryTime: number): string => {
    const now = Date.now();
    const timeLeft = Math.max(0, expiryTime - now);
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // Component lifecycle management
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initialize WebSocket connection
    tickersWs.initialize();

    return () => {
      isMountedRef.current = false;
      
      // Clean up all intervals and timeouts
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }

      // Clean up animation timeouts
      animationTimeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      animationTimeoutsRef.current.clear();

      // Clean up ticker subscription
      if (tickerUnsubscribeRef.current) {
        tickerUnsubscribeRef.current();
        tickerUnsubscribeRef.current = null;
      }
    };
  }, []);

  // Update active orders ref when orders change
  useEffect(() => {
    activeOrdersRef.current = activeOrders;
  }, [activeOrders]);

  // Optimized ticker data subscription with proper cleanup
  useEffect(() => {
    // Clean up previous subscription
    if (tickerUnsubscribeRef.current) {
      tickerUnsubscribeRef.current();
      tickerUnsubscribeRef.current = null;
    }

    // Subscribe to ticker data with optimized callback
    const unsubscribe = tickersWs.subscribeToSpotData((data) => {
      if (!isMountedRef.current) return;

      // Use requestAnimationFrame to defer ticker data updates
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setTickerData(data);
        }
      });
    });

    tickerUnsubscribeRef.current = unsubscribe;

    return () => {
      if (tickerUnsubscribeRef.current) {
        tickerUnsubscribeRef.current();
        tickerUnsubscribeRef.current = null;
      }
    };
  }, []);

  // Optimized profit/loss tracking with throttling
  useEffect(() => {
    if (activeOrders.length === 0) {
      // Clear data when no active orders
      setProfitLossData({});
      setAnimateProfit({});
      return;
    }

    // Throttled update function
    const updateProfitLossData = () => {
      if (!isMountedRef.current) return;

      const newAnimateProfit: Record<string, boolean> = {};

      setProfitLossData((prevData) => {
        const newProfitLossData = { ...prevData };

        activeOrdersRef.current.forEach((order) => {
          if (!newProfitLossData[order.id]) {
            newProfitLossData[order.id] = [];
          }

          // Get the latest price for this symbol from ticker data
          const symbolPrice = getCurrentPrice(order.symbol);

          // Calculate profit/loss using the symbol-specific price
          const profitLoss = calculateProfitLoss(order, symbolPrice);

          // Keep only the last 20 data points for performance
          if (newProfitLossData[order.id].length >= 20) {
            newProfitLossData[order.id].shift();
          }

          newProfitLossData[order.id].push(profitLoss);

          // Check if profit is increasing or decreasing
          const dataPoints = newProfitLossData[order.id];
          if (dataPoints.length >= 2) {
            const isIncreasing =
              dataPoints[dataPoints.length - 1] > dataPoints[dataPoints.length - 2];

            // Animate if profit is increasing for RISE or decreasing for FALL
            if (
              (order.side === "RISE" && isIncreasing) ||
              (order.side === "FALL" && !isIncreasing)
            ) {
              newAnimateProfit[order.id] = true;
            }
          }
        });

        return newProfitLossData;
      });

      // Handle animation states outside of the state update
      if (Object.keys(newAnimateProfit).length > 0) {
        setAnimateProfit(newAnimateProfit);

        // Clear animations after 1 second with proper cleanup
        Object.keys(newAnimateProfit).forEach((id) => {
          // Clear any existing timeout for this order
          const existingTimeout = animationTimeoutsRef.current.get(id);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Set new timeout
          const timeout = setTimeout(() => {
            if (isMountedRef.current) {
              setAnimateProfit((prev) => {
                const updated = { ...prev };
                delete updated[id];
                return updated;
              });
            }
            animationTimeoutsRef.current.delete(id);
          }, 1000);

          animationTimeoutsRef.current.set(id, timeout);
        });
      }
    };

    // Set up throttled interval
    updateIntervalRef.current = setInterval(updateProfitLossData, 1000);

    // Initial update
    updateProfitLossData();

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [activeOrders.length, getCurrentPrice, calculateProfitLoss]);

  // Optimized time left updates
  useEffect(() => {
    if (activeOrders.length === 0) {
      setTimeLeft({});
      return;
    }

    const updateTimeLeft = () => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      const newTimeLeft: Record<string, string> = {};
      
      activeOrdersRef.current.forEach((order) => {
        // Only show time for orders that haven't expired
        if (order.expiryTime > now) {
          newTimeLeft[order.id] = formatTimeLeft(order.expiryTime);
        } else {
          // Order has expired, show 00:00 briefly before it's removed
          newTimeLeft[order.id] = "00:00";
        }
      });

      setTimeLeft(newTimeLeft);
    };

    // Update immediately
    updateTimeLeft();

    // Set up interval for time updates
    const timeInterval = setInterval(updateTimeLeft, 1000);

    return () => {
      clearInterval(timeInterval);
    };
  }, [activeOrders.length, formatTimeLeft]);

  // Memoized positions change handler
  const handlePositionsChange = useCallback(() => {
    if (onPositionsChange) {
      onPositionsChange(positions);
    }
  }, [positions, onPositionsChange]);

  // Update positions only when they actually change
  useEffect(() => {
    handlePositionsChange();
  }, [handlePositionsChange]);

  // Memoized handlers to prevent recreation
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  const selectOrder = useCallback((orderId: string) => {
    setSelectedOrder(selectedOrder === orderId ? null : orderId);
  }, [selectedOrder]);

  // Don't render if no active orders
  if (activeOrders.length === 0) {
    return null;
  }

  return (
    <div className={`${className} ${themeClasses.panelBgClass} ${themeClasses.borderClass} border-r flex flex-col transition-all duration-200 ${isCollapsed ? 'w-16' : 'w-80'}`}>
      {/* Header */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} ${themeClasses.borderClass} border-b flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all duration-200`}>
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <h3 className={`font-medium ${themeClasses.textClass}`}>
              Active Positions ({activeOrders.length})
            </h3>
          </div>
        )}
        {isCollapsed && (
          <div className="flex flex-col items-center space-y-1">
            <BarChart3 className="w-4 h-4" />
            <span className={`text-xs ${themeClasses.secondaryTextClass}`}>
              {activeOrders.length}
            </span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className={`${isCollapsed ? 'absolute top-2 right-2' : ''} p-1 rounded ${themeClasses.hoverBgClass} transition-all duration-200`}
        >
          <ChevronLeft 
            className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
          />
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-2">
            {activeOrders.map((order) => {
              const symbolPrice = getCurrentPrice(order.symbol);
              const profitLoss = calculateProfitLoss(order, symbolPrice);
              const isProfitable = profitLoss > 0;
              const timeLeftForOrder = timeLeft[order.id] || "00:00";
              const isSelected = selectedOrder === order.id;
              const isAnimating = animateProfit[order.id];

              return (
                <div
                  key={order.id}
                  onClick={() => selectOrder(order.id)}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-all duration-200
                    ${themeClasses.borderClass}
                    ${isSelected ? themeClasses.hoverBgClass : 'hover:' + themeClasses.hoverBgClass.replace('hover:', '')}
                    ${isAnimating ? 'animate-pulse' : ''}
                  `}
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {order.side === "RISE" ? (
                        <ArrowUpCircle className={`w-4 h-4 ${themeClasses.riseColorClass}`} />
                      ) : (
                        <ArrowDownCircle className={`w-4 h-4 ${themeClasses.fallColorClass}`} />
                      )}
                      <span className={`font-medium ${themeClasses.textClass}`}>
                        {order.symbol}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        order.side === "RISE" 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {order.side}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span className={`text-xs ${themeClasses.secondaryTextClass}`}>
                        {timeLeftForOrder}
                      </span>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className={themeClasses.secondaryTextClass}>Entry:</span>
                      <span className={`ml-1 ${themeClasses.textClass}`}>
                        ${order.entryPrice.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className={themeClasses.secondaryTextClass}>Current:</span>
                      <span className={`ml-1 ${themeClasses.textClass}`}>
                        ${symbolPrice.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className={themeClasses.secondaryTextClass}>Amount:</span>
                      <span className={`ml-1 ${themeClasses.textClass}`}>
                        ${order.amount.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className={themeClasses.secondaryTextClass}>P/L:</span>
                      <span className={`ml-1 font-medium ${
                        isProfitable ? themeClasses.profitColorClass : themeClasses.lossColorClass
                      }`}>
                        {isProfitable ? '+' : ''}${profitLoss.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Mini Chart */}
                  {profitLossData[order.id] && profitLossData[order.id].length > 1 && (
                    <div className="mt-2 h-10">
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 100 40"
                        preserveAspectRatio="none"
                      >
                        {
                          (() => {
                            const data = profitLossData[order.id].slice(-20);
                            if (data.length < 2) return null;
                            
                            const maxValue = Math.max(...data.map(Math.abs));
                            const minValue = -maxValue;
                            const range = maxValue - minValue;
                            
                            // Create path data for the line
                            const pathData = data
                              .map((value, index) => {
                                const x = (index / (data.length - 1)) * 100;
                                const y = 40 - ((value - minValue) / range) * 40;
                                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                              })
                              .join(' ');
                            
                            // Create area path (filled area under the line)
                            const areaPath = pathData + ` L 100 ${40 - ((0 - minValue) / range) * 40} L 0 ${40 - ((0 - minValue) / range) * 40} Z`;
                            
                            const currentValue = data[data.length - 1];
                            const lineColor = currentValue > 0 ? '#10b981' : '#ef4444';
                            const fillColor = currentValue > 0 ? '#10b981' : '#ef4444';
                            
                            return (
                              <>
                                {/* Zero line */}
                                <line
                                  x1="0"
                                  y1={40 - ((0 - minValue) / range) * 40}
                                  x2="100"
                                  y2={40 - ((0 - minValue) / range) * 40}
                                  stroke={theme === 'dark' ? '#3f3f46' : '#d4d4d8'}
                                  strokeWidth="0.5"
                                  strokeDasharray="2,2"
                                />
                                
                                {/* Filled area */}
                                <path
                                  d={areaPath}
                                  fill={fillColor}
                                  fillOpacity="0.1"
                                />
                                
                                {/* Line */}
                                <path
                                  d={pathData}
                                  fill="none"
                                  stroke={lineColor}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                
                                {/* Current value dot */}
                                <circle
                                  cx="100"
                                  cy={40 - ((currentValue - minValue) / range) * 40}
                                  r="2"
                                  fill={lineColor}
                                />
                              </>
                            );
                          })()
                        }
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { ActivePositions };
