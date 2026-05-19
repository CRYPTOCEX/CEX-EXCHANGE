"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  BarChart3,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  X,
  DollarSign,
  Ban,
} from "lucide-react";
import type { Order } from "@/store/trade/use-binary-store";
import { tickersWs } from "@/services/tickers-ws";
import type { TickerData } from "@/app/[locale]/trade/components/markets/types";
import {
  extractQuoteCurrency,
  extractBaseCurrency,
  useBinaryStore,
} from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import { CancelOrderModal } from "../modals/cancel-order-modal";
import { CashOutModal } from "../modals/cash-out-modal";
import { getAudioFeedback } from "@/components/binary/audio-feedback";
import { useTradingSettingsStore } from "@/store/trade/use-trading-settings-store";
import type { OrderSide } from "@/types/binary-trading";

// Helper function to determine if an order side is bullish (upward direction)
function isBullishSide(side: OrderSide | string): boolean {
  return side === "RISE" || side === "HIGHER" || side === "TOUCH" || side === "CALL" || side === "UP";
}

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
  const t = useTranslations("common");
  const tBinaryComponents = useTranslations("binary_components");
  
  // State management with proper initialization
  const [timeLeft, setTimeLeft] = useState<Record<string, string>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [profitLossData, setProfitLossData] = useState<Record<string, number[]>>({});
  const [animateProfit, setAnimateProfit] = useState<Record<string, boolean>>({});
  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});

  // Modal state for cancel and cash out
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cashOutModalOrder, setCashOutModalOrder] = useState<Order | null>(null);

  // Get store actions
  const cancelOrder = useBinaryStore((state) => state.cancelOrder);
  const closeOrderEarly = useBinaryStore((state) => state.closeOrderEarly);

  // Refs for cleanup and optimization
  const isMountedRef = useRef(true);
  const prevPriceRef = useRef<number>(0);
  const activeOrdersRef = useRef<Order[]>([]);
  const animationStateRef = useRef<Record<string, boolean>>({});
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickerUnsubscribeRef = useRef<(() => void) | null>(null);
  const animationTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Ref to track which seconds have been played for countdown sounds (per order)
  const lastPlayedSecondRef = useRef<Record<string, number>>({});

  // Get audio settings from store
  const audioConfig = useTradingSettingsStore((state) => state.audio);

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
    bgClass: theme === "dark" ? "bg-zinc-950" : "bg-white",
    panelBgClass: theme === "dark" ? "bg-zinc-950" : "bg-white",
    textClass: theme === "dark" ? "text-white" : "text-black",
    secondaryTextClass: theme === "dark" ? "text-zinc-500" : "text-zinc-600",
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

  // Memoized profit/loss calculation - supports all order types
  const calculateProfitLoss = useCallback((order: Order, symbolPrice: number): number => {
    const profitPercentage = order.profitPercentage || 85; // Use order's profit percentage or default to 85
    const potentialProfit = (order.amount * profitPercentage) / 100;
    const potentialLoss = -order.amount;

    // Determine if currently winning based on order type and side
    let isWinning: boolean;

    switch (order.type) {
      case "HIGHER_LOWER":
        // HIGHER wins if price > barrier, LOWER wins if price < barrier
        if (order.barrier) {
          isWinning = order.side === "HIGHER"
            ? symbolPrice > order.barrier
            : symbolPrice < order.barrier;
        } else {
          isWinning = isBullishSide(order.side)
            ? symbolPrice > order.entryPrice
            : symbolPrice < order.entryPrice;
        }
        break;
      case "TOUCH_NO_TOUCH":
        // TOUCH wins if price is near barrier, NO_TOUCH wins if price stays away
        if (order.barrier) {
          const distance = Math.abs(symbolPrice - order.barrier);
          const distancePercent = (distance / order.barrier) * 100;
          const isTouching = distancePercent < 0.1; // Within 0.1% of barrier
          isWinning = order.side === "TOUCH" ? isTouching : !isTouching;
        } else {
          isWinning = false;
        }
        break;
      case "CALL_PUT":
        // CALL wins if price > strike, PUT wins if price < strike
        if (order.strikePrice) {
          isWinning = order.side === "CALL"
            ? symbolPrice > order.strikePrice
            : symbolPrice < order.strikePrice;
        } else {
          isWinning = isBullishSide(order.side)
            ? symbolPrice > order.entryPrice
            : symbolPrice < order.entryPrice;
        }
        break;
      case "TURBO":
        // UP wins if price > barrier, DOWN wins if price < barrier
        if (order.barrier) {
          isWinning = order.side === "UP"
            ? symbolPrice > order.barrier
            : symbolPrice < order.barrier;
        } else {
          isWinning = isBullishSide(order.side)
            ? symbolPrice > order.entryPrice
            : symbolPrice < order.entryPrice;
        }
        break;
      default:
        // RISE_FALL: RISE wins if price > entry, FALL wins if price < entry
        isWinning = isBullishSide(order.side)
          ? symbolPrice > order.entryPrice
          : symbolPrice < order.entryPrice;
    }

    return isWinning ? potentialProfit : potentialLoss;
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

            // Animate if profit is increasing for bullish sides or decreasing for bearish sides
            if (
              (isBullishSide(order.side) && isIncreasing) ||
              (!isBullishSide(order.side) && !isIncreasing)
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

    // FIXED: Clear any existing interval before creating new one
    // This prevents timer stacking when effect dependencies change
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

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

  // Optimized time left updates with countdown tick sounds
  useEffect(() => {
    if (activeOrders.length === 0) {
      setTimeLeft({});
      // Clean up played seconds tracker when no orders
      lastPlayedSecondRef.current = {};
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

          // Calculate remaining seconds for countdown tick sounds
          const remainingMs = order.expiryTime - now;
          const remainingSeconds = Math.ceil(remainingMs / 1000);

          // Check if countdown tick sounds are enabled
          if (audioConfig.enabled && audioConfig.sounds.countdown_tick) {
            const lastPlayed = lastPlayedSecondRef.current[order.id];

            // Only play if we haven't played for this second already
            if (lastPlayed !== remainingSeconds) {
              // Play countdown tick for seconds 5, 4, 3, 2 (not 1 - that's final)
              if (remainingSeconds <= 5 && remainingSeconds > 1) {
                getAudioFeedback(audioConfig).playCountdownTick();
                lastPlayedSecondRef.current[order.id] = remainingSeconds;
              }
              // Play final countdown sound at 1 second
              else if (remainingSeconds === 1) {
                getAudioFeedback(audioConfig).playCountdownFinal();
                lastPlayedSecondRef.current[order.id] = remainingSeconds;
              }
            }
          }
        } else {
          // Order has expired, show 00:00 briefly before it's removed
          newTimeLeft[order.id] = "00:00";
          // Clean up played seconds tracker for expired orders
          delete lastPlayedSecondRef.current[order.id];
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
  }, [activeOrders.length, formatTimeLeft, audioConfig]);

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

  // Extract currency from symbol (e.g., "BTC/USDT" -> "USDT")
  const getCurrency = useCallback((symbol: string) => {
    const parts = symbol.split("/");
    return parts[1] || "USDT"; // Default to USDT if parsing fails
  }, []);

  // Modal handlers
  const handleOpenCancelModal = useCallback((order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setCancelModalOrder(order);
  }, []);

  const handleOpenCashOutModal = useCallback((order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setCashOutModalOrder(order);
  }, []);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    const result = await cancelOrder(orderId);
    return result.success;
  }, [cancelOrder]);

  const handleCashOutOrder = useCallback(async (orderId: string) => {
    const result = await closeOrderEarly(orderId);
    return {
      success: result.success,
      cashoutAmount: result.cashoutAmount,
      penalty: result.penalty,
    };
  }, [closeOrderEarly]);

  // Check if an order can be cancelled (> 10 seconds to expiry)
  const canCancelOrder = useCallback((order: Order) => {
    const timeUntilExpiry = order.expiryTime - Date.now();
    return timeUntilExpiry > 10000;
  }, []);

  // Check if an order can be cashed out (> 30s from entry, > 10s to expiry)
  const canCashOutOrder = useCallback((order: Order) => {
    const timeFromEntry = Date.now() - order.createdAt;
    const timeUntilExpiry = order.expiryTime - Date.now();
    return timeFromEntry >= 30000 && timeUntilExpiry >= 10000;
  }, []);

  // Render empty state if no active orders
  if (activeOrders.length === 0) {
    return (
      <div className={`${className} ${themeClasses.panelBgClass} flex items-center justify-center`}>
        <div className={`text-center ${themeClasses.secondaryTextClass}`}>
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("no_active_positions")}</p>
        </div>
      </div>
    );
  }

  return (
    <div data-tutorial="active-positions" className={`${className} ${themeClasses.panelBgClass} ${themeClasses.borderClass} border-r flex flex-col transition-all duration-200 ${isCollapsed ? 'w-16' : 'w-80'}`}>
      {/* Header */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} ${themeClasses.borderClass} border-b flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all duration-200`}>
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <h3 className={`font-medium ${themeClasses.textClass}`}>
              {`${t("active_positions")} •`} ({activeOrders.length})
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
                      {isBullishSide(order.side) ? (
                        <ArrowUpCircle className={`w-4 h-4 ${themeClasses.riseColorClass}`} />
                      ) : (
                        <ArrowDownCircle className={`w-4 h-4 ${themeClasses.fallColorClass}`} />
                      )}
                      <span className={`font-medium ${themeClasses.textClass}`}>
                        {order.symbol}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        isBullishSide(order.side)
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
                      <span className={themeClasses.secondaryTextClass}>{tBinaryComponents("entry")}:</span>
                      <span className={`ml-1 ${themeClasses.textClass}`}>
                        {order.entryPrice.toFixed(2)} {getCurrency(order.symbol)}
                      </span>
                    </div>
                    <div>
                      <span className={themeClasses.secondaryTextClass}>{t("current")}:</span>
                      <span className={`ml-1 ${themeClasses.textClass}`}>
                        {symbolPrice.toFixed(2)} {getCurrency(order.symbol)}
                      </span>
                    </div>
                    <div>
                      <span className={themeClasses.secondaryTextClass}>{t("amount")}:</span>
                      <span className={`ml-1 ${themeClasses.textClass}`}>
                        {order.amount.toFixed(2)} {getCurrency(order.symbol)}
                      </span>
                    </div>
                    <div>
                      <span className={themeClasses.secondaryTextClass}>P/L:</span>
                      <span className={`ml-1 font-medium ${
                        isProfitable ? themeClasses.profitColorClass : themeClasses.lossColorClass
                      }`}>
                        {isProfitable ? '+' : ''}{profitLoss.toFixed(2)} {getCurrency(order.symbol)}
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

                  {/* Action Buttons */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => handleOpenCashOutModal(order, e)}
                      disabled={!canCashOutOrder(order)}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all
                        ${canCashOutOrder(order)
                          ? isProfitable
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                          : "bg-zinc-700/30 text-zinc-500 cursor-not-allowed"
                        }`}
                    >
                      <DollarSign className="w-3 h-3" />
                      {tBinaryComponents("cash_out") || "Cash Out"}
                    </button>
                    <button
                      onClick={(e) => handleOpenCancelModal(order, e)}
                      disabled={!canCancelOrder(order)}
                      className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all
                        ${canCancelOrder(order)
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-zinc-700/30 text-zinc-500 cursor-not-allowed"
                        }`}
                    >
                      <Ban className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      <CancelOrderModal
        order={cancelModalOrder}
        isOpen={cancelModalOrder !== null}
        onClose={() => setCancelModalOrder(null)}
        onConfirm={handleCancelOrder}
      />

      {/* Cash Out Modal */}
      <CashOutModal
        order={cashOutModalOrder}
        isOpen={cashOutModalOrder !== null}
        onClose={() => setCashOutModalOrder(null)}
        onConfirm={handleCashOutOrder}
        currentPrice={currentPrice}
      />
    </div>
  );
}

export { ActivePositions };
