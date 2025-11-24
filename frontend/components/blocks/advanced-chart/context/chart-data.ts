"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CandleData, TimeFrame } from "../types";
import type { Symbol } from "@/store/trade/use-binary-store";
import { marketDataWs, type OHLCVData } from "@/services/market-data-ws";
import { extractBaseCurrency, extractQuoteCurrency } from "@/store/trade/use-binary-store";

// Debug logging
const isProduction = process.env.NODE_ENV === "production";
const log = isProduction ? () => {} : console.log;
const error = isProduction ? () => {} : console.error;

// Types for the chart data manager
interface ChartDataState {
  candleData: CandleData[];
  loading: boolean;
  error: string | null;
  lastUpdateTime: number;
  dataInitialized: boolean;
  dataReady: boolean;
  isLoadingOlderData: boolean;
  hasReachedOldestData: boolean;
  oldestLoadedTimestamp: number | null;
  newestLoadedTimestamp: number | null;
  price: number;
  marketType?: "spot" | "eco" | "futures";
}

// Configuration constants
const CONFIG = {
  MIN_API_CALL_INTERVAL: 15000,
  INITIAL_CANDLE_COUNT: 500,
  VISIBLE_CANDLE_COUNT: 100,
  OLDER_DATA_FETCH_COUNT: 200,
  PRICE_UPDATE_THRESHOLD: 0.0001,
} as const;

// Timeframe to milliseconds mapping
const TIMEFRAME_MS: Record<TimeFrame, number> = {
  "1m": 60 * 1000,
  "3m": 3 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
};

// Timeframe to API interval mapping
const TIMEFRAME_TO_INTERVAL: Record<TimeFrame, string> = {
  "1m": "1m",
  "3m": "3m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "2h": "2h",
  "4h": "4h",
  "6h": "6h",
  "8h": "8h",
  "12h": "12h",
  "1d": "1d",
  "3d": "3d",
  "1w": "1w",
  "1M": "1M",
};

// Utility functions - Using proper base/quote extraction logic
const formatSymbolForAPI = (symbol: string): string => {
  // Add safety check for undefined/null symbol
  if (!symbol || typeof symbol !== 'string') {
    console.warn("Invalid symbol provided to formatSymbolForAPI:", symbol);
    return "BTC/USDT"; // Default fallback
  }
  
  // Handle delimiter-based formats first: BTC/USDT, BTC-USDT, BTC_USDT
  if (symbol.includes("/")) {
    return symbol; // Already in API format
  }
  if (symbol.includes("-")) {
    return symbol.replace("-", "/");
  }
  if (symbol.includes("_")) {
    return symbol.replace("_", "/");
  }

  // For symbols without delimiters (like BTCUSDT), use the proper extraction logic
  const baseCurrency = extractBaseCurrency(symbol);
  const quoteCurrency = extractQuoteCurrency(symbol);
  return `${baseCurrency}/${quoteCurrency}`;
};

const formatCandleData = (rawData: number[]): CandleData => {
  // Add safety checks for invalid data
  if (!Array.isArray(rawData) || rawData.length < 6) {
    console.warn("Invalid candle data received:", rawData);
    const now = Date.now();
    return {
      time: now,
      timestamp: new Date(now).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: new Date(now).toLocaleDateString([], { month: "short", day: "numeric" }),
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0,
      color: "#26a69a",
    };
  }
  
  const [timestamp, open, high, low, close, volume] = rawData;
  
  // Ensure all values are valid numbers
  const safeTimestamp = Number(timestamp) || Date.now();
  const safeOpen = Number(open) || 0;
  const safeHigh = Number(high) || 0;
  const safeLow = Number(low) || 0;
  const safeClose = Number(close) || 0;
  const safeVolume = Number(volume) || 0;
  
  const date = new Date(safeTimestamp);
  const isBullish = safeClose >= safeOpen;

  return {
    time: safeTimestamp,
    timestamp: date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    date: date.toLocaleDateString([], { month: "short", day: "numeric" }),
    open: safeOpen,
    high: safeHigh,
    low: safeLow,
    close: safeClose,
    volume: safeVolume,
    color: isBullish ? "#26a69a" : "#ef5350",
  };
};

const getCurrentCandleTimestamp = (timeFrame: TimeFrame): number => {
  const now = Date.now();
  const intervalMs = TIMEFRAME_MS[timeFrame];
  return Math.floor(now / intervalMs) * intervalMs;
};

const shouldUpdateCandle = (
  existingCandle: CandleData,
  newCandle: CandleData
): boolean => {
  // Check if this is the current candle (more recent timestamp)
  const now = Date.now();
  const isCurrentCandle = Math.abs(newCandle.time - now) < 5 * 60 * 1000; // Within 5 minutes
  
  // For current candles, use a more sensitive threshold
  const threshold = isCurrentCandle ? 0.000001 : CONFIG.PRICE_UPDATE_THRESHOLD;
  
  return (
    Math.abs(existingCandle.open - newCandle.open) >= threshold ||
    Math.abs(existingCandle.high - newCandle.high) >= threshold ||
    Math.abs(existingCandle.low - newCandle.low) >= threshold ||
    Math.abs(existingCandle.close - newCandle.close) >= threshold ||
    Math.abs(existingCandle.volume - newCandle.volume) >= threshold ||
    // Always update if the new candle has different OHLC values
    existingCandle.open !== newCandle.open ||
    existingCandle.high !== newCandle.high ||
    existingCandle.low !== newCandle.low ||
    existingCandle.close !== newCandle.close ||
    existingCandle.volume !== newCandle.volume
  );
};

// Global state for active subscriptions
const activeSubscriptions = new Map<string, boolean>();

// Main chart data hook
export function useChartData(
  symbol: Symbol,
  timeFrame: TimeFrame,
  onPriceUpdate: (price: number) => void,
  state: any
) {
  const {
    setVisibleRange: setStateVisibleRange,
    setWsStatus,
    setApiStatus,
    setLastError,
    setReconnectAttempt,
    isInteractingRef,
    marketType,
  } = state;

  const [chartState, setChartState] = useState<ChartDataState>({
    candleData: [],
    loading: true,
    error: null,
    lastUpdateTime: 0,
    dataInitialized: false,
    dataReady: false,
    isLoadingOlderData: false,
    hasReachedOldestData: false,
    oldestLoadedTimestamp: null,
    newestLoadedTimestamp: null,
    price: 0,
  });

  // Use a ref to track if the component is mounted
  const isMountedRef = useRef(true);
  const currentSymbolRef = useRef(symbol);
  const currentTimeFrameRef = useRef(timeFrame);
  const isInitialLoadRef = useRef(true);
  const lastFetchTimeRef = useRef(0);
  const dataCache = useRef<Map<string, CandleData[]>>(new Map());
  const visibleRangeRef = useRef<{ start: number; end: number }>({
    start: 0,
    end: CONFIG.VISIBLE_CANDLE_COUNT,
  });
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const subscriptionKeyRef = useRef<string>("");

  // Update refs when props change
  useEffect(() => {
    currentSymbolRef.current = symbol;
    currentTimeFrameRef.current = timeFrame;
  }, [symbol, timeFrame]);

  // Set mounted flag to true on mount
  useEffect(() => {
    isMountedRef.current = true;

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;

      // Remove from active subscriptions
      if (subscriptionKeyRef.current) {
        activeSubscriptions.delete(subscriptionKeyRef.current);
      }

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  const getCacheKey = useCallback(
    (sym: Symbol, tf: TimeFrame) => `${sym}_${tf}`,
    []
  );

  const fetchHistoricalData = useCallback(
    async (
      isInitial = false,
      isOlderData = false,
      endTime?: number
    ): Promise<boolean> => {
      if (!isMountedRef.current) return false;

      const now = Date.now();
      if (
        !isInitial &&
        !isOlderData &&
        now - lastFetchTimeRef.current < CONFIG.MIN_API_CALL_INTERVAL
      ) {
        return false;
      }

      try {
        if (isInitial) {
          setChartState((prev) => ({
            ...prev,
            loading: true,
            error: null,
            dataReady: false,
          }));
          setApiStatus("connecting");
        } else if (isOlderData) {
          setChartState((prev) => ({ ...prev, isLoadingOlderData: true }));
        }

        const formattedSymbol = formatSymbolForAPI(currentSymbolRef.current);
        const interval = TIMEFRAME_TO_INTERVAL[currentTimeFrameRef.current];
        const candleCount = isOlderData
          ? CONFIG.OLDER_DATA_FETCH_COUNT
          : CONFIG.INITIAL_CANDLE_COUNT;

        const intervalMs = TIMEFRAME_MS[currentTimeFrameRef.current];
        const to = endTime || Date.now();
        const from = to - candleCount * intervalMs;

        const url = new URL("/api/exchange/chart", window.location.origin);
        url.searchParams.set("symbol", formattedSymbol);
        url.searchParams.set("interval", interval);
        url.searchParams.set("from", from.toString());
        url.searchParams.set("to", to.toString());
        url.searchParams.set("duration", intervalMs.toString());

        log(`📊 Fetching ${isOlderData ? "older" : "initial"} OHLCV data:`, {
          symbol: formattedSymbol,
          interval,
          from: new Date(from).toISOString(),
          to: new Date(to).toISOString(),
          count: candleCount,
        });

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const rawData = await response.json();
        
        // Handle empty data gracefully instead of throwing an error
        if (!Array.isArray(rawData)) {
          throw new Error("Invalid data format received from API");
        }
        
        // If no data is available, set empty state but don't throw error
        if (rawData.length === 0) {
          log(`📊 No data available for ${formattedSymbol} ${interval}`);
          
          if (isMountedRef.current) {
            setChartState((prev) => ({
              ...prev,
              candleData: [],
              loading: false,
              error: null,
              dataInitialized: true,
              dataReady: true,
              isLoadingOlderData: isOlderData ? false : prev.isLoadingOlderData,
              oldestLoadedTimestamp: null,
              newestLoadedTimestamp: null,
              lastUpdateTime: now,
              price: 0,
            }));
            
            setApiStatus("connected");
            setLastError(null);
            lastFetchTimeRef.current = now;
          }
          
          return true; // Return success even with empty data
        }

        const formattedData = rawData.map(formatCandleData);

        if (isInitial) {
          const currentCandleTime = getCurrentCandleTimestamp(
            currentTimeFrameRef.current
          );
          const hasCurrentCandle = formattedData.some(
            (candle) => candle.time === currentCandleTime
          );

          if (!hasCurrentCandle && formattedData.length > 0) {
            const lastCandle = formattedData[formattedData.length - 1];
            const currentCandle = formatCandleData([
              currentCandleTime,
              lastCandle.close,
              lastCandle.close,
              lastCandle.close,
              lastCandle.close,
              0,
            ]);
            formattedData.push(currentCandle);
          }

          // Calculate consistent visible range based on timeframe
          const getOptimalCandleCount = (tf: TimeFrame) => {
            const timeframeCandleCounts: Record<TimeFrame, number> = {
              "1m": 100,
              "3m": 80,
              "5m": 70,
              "15m": 60,
              "30m": 50,
              "1h": 48,
              "2h": 36,
              "4h": 24,
              "6h": 20,
              "8h": 18,
              "12h": 14,
              "1d": 30,
              "3d": 20,
              "1w": 12,
              "1M": 12,
            };
            return timeframeCandleCounts[tf] || 50;
          };

          const optimalCount = getOptimalCandleCount(
            currentTimeFrameRef.current
          );
          const visibleCount = Math.min(optimalCount, formattedData.length);

          // Always show the most recent data with 20% future space
          const futureSpace = Math.floor(visibleCount * 0.2);
          const newRange = {
            start: Math.max(
              0,
              formattedData.length - visibleCount + futureSpace
            ),
            end: formattedData.length + futureSpace,
          };

          setStateVisibleRange(newRange);
          visibleRangeRef.current = newRange;
        }

        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setChartState((prev) => {
            let newCandleData: CandleData[];

            if (isInitial) {
              newCandleData = formattedData;
            } else if (isOlderData) {
              const existingTimes = new Set(prev.candleData.map((c) => c.time));
              const uniqueOlderData = formattedData.filter(
                (c) => !existingTimes.has(c.time)
              );
              newCandleData = [...uniqueOlderData, ...prev.candleData].sort(
                (a, b) => a.time - b.time
              );

              const offset = uniqueOlderData.length;
              if (offset > 0) {
                setStateVisibleRange((prevRange: any) => ({
                  start: prevRange.start + offset,
                  end: prevRange.end + offset,
                }));
              }
            } else {
              const existingMap = new Map(
                prev.candleData.map((c) => [c.time, c])
              );
              formattedData.forEach((newCandle) => {
                existingMap.set(newCandle.time, newCandle);
              });
              newCandleData = Array.from(existingMap.values()).sort(
                (a, b) => a.time - b.time
              );
            }

            const oldestTimestamp =
              newCandleData.length > 0 ? newCandleData[0].time : null;
            const newestTimestamp =
              newCandleData.length > 0
                ? newCandleData[newCandleData.length - 1].time
                : null;

            if (newCandleData.length > 0) {
              const latestPrice = newCandleData[newCandleData.length - 1].close;
              onPriceUpdate(latestPrice);
            }

            return {
              ...prev,
              candleData: newCandleData,
              loading: false, // Always set loading to false on successful data fetch
              dataInitialized: true,
              dataReady: true,
              isLoadingOlderData: isOlderData ? false : prev.isLoadingOlderData,
              oldestLoadedTimestamp: oldestTimestamp,
              newestLoadedTimestamp: newestTimestamp,
              lastUpdateTime: now,
              price:
                newCandleData.length > 0
                  ? newCandleData[newCandleData.length - 1].close
                  : prev.price,
            };
          });

          const cacheKey = getCacheKey(
            currentSymbolRef.current,
            currentTimeFrameRef.current
          );
          dataCache.current.set(cacheKey, formattedData);

          if (isInitial) {
            const newRange = {
              start: Math.max(
                0,
                formattedData.length - CONFIG.VISIBLE_CANDLE_COUNT
              ),
              end: formattedData.length,
            };
            setStateVisibleRange(newRange);
            visibleRangeRef.current = newRange;
          }

          setApiStatus("connected");
          setLastError(null);
          lastFetchTimeRef.current = now;
        }

        return true;
      } catch (err: any) {
        error("❌ Error fetching OHLCV data:", err);

        if (isMountedRef.current) {
          setChartState((prev) => ({
            ...prev,
            loading: isInitial ? false : prev.loading,
            isLoadingOlderData: isOlderData ? false : prev.isLoadingOlderData,
            error: err.message,
          }));

          setApiStatus("error");
          setLastError(err.message);
        }

        return false;
      }
    },
    [
      onPriceUpdate,
      setApiStatus,
      setLastError,
      setStateVisibleRange,
      getCacheKey,
    ]
  );

  // Create a stable callback that doesn't depend on component state
  // This is crucial for WebSocket callbacks that might be called after unmount
  const updateCandleData = useCallback(
    (data: OHLCVData) => {
      // Add safety checks for invalid data
      if (!data || typeof data !== 'object') {
        console.warn("Invalid OHLCV data received:", data);
        return;
      }
      
      // Additional safety check for stream property
      if (!data.stream || typeof data.stream !== 'string') {
        console.warn("Invalid OHLCV stream data received:", data);
        return;
      }
      
      // Check if data array exists and has content
      if (!Array.isArray(data.data) || data.data.length === 0) {
        console.warn("Empty or invalid OHLCV data array received:", data);
        return;
      }
      
      // Check if this subscription is still active - use formatted symbol
      const formattedSymbol = formatSymbolForAPI(currentSymbolRef.current);
      const subscriptionKey = `ohlcv:${formattedSymbol}:${currentTimeFrameRef.current}`;
      if (!activeSubscriptions.has(subscriptionKey)) {
        return;
      }

      // Additional validation: ensure the stream matches current symbol
      const expectedStreamPrefix = `ohlcv:${TIMEFRAME_TO_INTERVAL[currentTimeFrameRef.current]}:${formattedSymbol}`;
      const symbolPart = formattedSymbol.replace('/', '');
      const intervalPart = TIMEFRAME_TO_INTERVAL[currentTimeFrameRef.current];
      
      // Check if the stream is for the correct symbol and interval
      // Handle both formats: ohlcv:interval and ohlcv:interval:symbol
      if (data.stream && typeof data.stream === 'string') {
        const streamParts = data.stream.split(':');
        const streamType = streamParts[0]; // Should be 'ohlcv'
        const streamInterval = streamParts[1]; // Should be the interval
        const streamSymbol = streamParts[2]; // Optional symbol part
        
        // Validate that it's an OHLCV stream for the correct interval
        if (streamType !== 'ohlcv' || streamInterval !== intervalPart) {
          return;
        }
        
        // If stream includes symbol, validate it matches
        if (streamSymbol && typeof streamSymbol === 'string' && !streamSymbol.includes(symbolPart)) {
          return;
        }
      }

      try {
        if (
          data.stream &&
          typeof data.stream === 'string' &&
          data.stream.startsWith("ohlcv:") &&
          Array.isArray(data.data) &&
          data.data.length > 0
        ) {
          data.data.forEach((rawCandle: number[]) => {
            if (rawCandle.length >= 6) {
              const newCandle = formatCandleData(rawCandle);

              // Only update state if component is still mounted
              if (isMountedRef.current) {
                setChartState((prev) => {
                  const existingIndex = prev.candleData.findIndex(
                    (c) => c.time === newCandle.time
                  );
                  let newCandleData: CandleData[];

                  if (existingIndex >= 0) {
                    const existingCandle = prev.candleData[existingIndex];
                    if (shouldUpdateCandle(existingCandle, newCandle)) {
                      newCandleData = [...prev.candleData];
                      newCandleData[existingIndex] = newCandle;
                    } else {
                      return prev;
                    }
                  } else {
                    newCandleData = [...prev.candleData, newCandle].sort(
                      (a, b) => a.time - b.time
                    );

                    if (!isInteractingRef.current) {
                      setStateVisibleRange((prevRange: any) => ({
                        start: prevRange.start + 1,
                        end: prevRange.end + 1,
                      }));
                    }
                  }

                  // Always update price
                  onPriceUpdate(newCandle.close);

                  return {
                    ...prev,
                    candleData: newCandleData,
                    lastUpdateTime: Date.now(),
                    newestLoadedTimestamp: newCandle.time,
                    price: newCandle.close,
                  };
                });
              }
            }
          });
        }
      } catch (err: any) {
        console.error("❌ Error processing OHLCV data:", err);
      }
    },
    [onPriceUpdate, setStateVisibleRange, isInteractingRef]
  );

  const subscribeToOHLCV = useCallback(() => {
    // Always unsubscribe from any existing subscription first
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Clear any existing subscription key
    if (subscriptionKeyRef.current) {
      activeSubscriptions.delete(subscriptionKeyRef.current);
    }

    const formattedSymbol = formatSymbolForAPI(currentSymbolRef.current);
    const interval = TIMEFRAME_TO_INTERVAL[currentTimeFrameRef.current];

    // Create a unique subscription key using formatted symbol
    const subscriptionKey = `ohlcv:${formattedSymbol}:${interval}`;
    subscriptionKeyRef.current = subscriptionKey;

    log("📡 Subscribing to OHLCV stream:", {
      symbol: formattedSymbol,
      interval,
      subscriptionKey,
    });

    // Mark this subscription as active
    activeSubscriptions.set(subscriptionKey, true);

    setWsStatus("connecting");
    setReconnectAttempt(true);

    // Use the stable callback that doesn't depend on component state
    const unsubscribe = marketDataWs.subscribe(
      {
        symbol: formattedSymbol,
        type: "ohlcv",
        marketType,
        interval: interval,
      },
      updateCandleData
    );

    unsubscribeRef.current = () => {
      log("🔌 Chart Data: Unsubscribing from OHLCV stream:", subscriptionKey);
      activeSubscriptions.delete(subscriptionKey);
      unsubscribe();
    };

    const statusUnsubscribe = marketDataWs.subscribeToConnectionStatus(
      (status) => {
        if (isMountedRef.current) {
          log("📡 OHLCV WebSocket status:", status);
          setWsStatus(
            status === "connected"
              ? "connected"
              : status === "connecting"
                ? "connecting"
                : "disconnected"
          );
          setReconnectAttempt(
            status === "connecting" || status === "reconnecting"
          );
        }
      },
      "spot"
    );

    return () => {
      activeSubscriptions.delete(subscriptionKey);
      unsubscribe();
      statusUnsubscribe();
    };
  }, [updateCandleData, setWsStatus, setReconnectAttempt]);

  // Direct timeframe change function - this is what we'll expose
  const changeTimeFrameDirectly = useCallback(
    async (newTimeFrame: TimeFrame) => {
      log("🔄 Direct timeframe change to:", newTimeFrame);

      // Update the timeframe ref immediately
      currentTimeFrameRef.current = newTimeFrame;

      // 1. Unsubscribe from current stream
      if (unsubscribeRef.current) {
        log("🔌 Unsubscribing from current stream");
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Clear subscription tracking
      if (subscriptionKeyRef.current) {
        activeSubscriptions.delete(subscriptionKeyRef.current);
        subscriptionKeyRef.current = "";
      }

      // 2. Clear current data immediately
      log("🧹 Clearing chart data for new timeframe");
      setChartState((prev) => ({
        ...prev,
        candleData: [],
        loading: true,
        error: null,
        dataInitialized: false,
        dataReady: false,
        oldestLoadedTimestamp: null,
        newestLoadedTimestamp: null,
        hasReachedOldestData: false,
        price: 0,
      }));

      // 3. Clear cache for this timeframe
      const cacheKey = getCacheKey(currentSymbolRef.current, newTimeFrame);
      dataCache.current.delete(cacheKey);

      // 4. Reset visible range to default for consistency
      const defaultRange = {
        start: 0,
        end: CONFIG.VISIBLE_CANDLE_COUNT,
      };
      setStateVisibleRange(defaultRange);
      visibleRangeRef.current = defaultRange;

      // 5. Fetch new data with new timeframe
      log("📡 Fetching data for new timeframe:", newTimeFrame);
      const success = await fetchHistoricalData(true);

      // 6. Subscribe to new stream
      if (success && isMountedRef.current) {
        log("✅ Data fetched, subscribing to new stream");
        setTimeout(subscribeToOHLCV, 500);
      }

      return success;
    },
    [fetchHistoricalData, subscribeToOHLCV, getCacheKey, setStateVisibleRange]
  );

  const fetchOlderData = useCallback(async () => {
    if (
      chartState.isLoadingOlderData ||
      chartState.hasReachedOldestData ||
      !chartState.oldestLoadedTimestamp
    ) {
      return;
    }

    const success = await fetchHistoricalData(
      false,
      true,
      chartState.oldestLoadedTimestamp
    );
    if (!success && isMountedRef.current) {
      setChartState((prev) => ({ ...prev, hasReachedOldestData: true }));
    }
  }, [
    chartState.isLoadingOlderData,
    chartState.hasReachedOldestData,
    chartState.oldestLoadedTimestamp,
    fetchHistoricalData,
  ]);

  // Market switching cleanup effect
  useEffect(() => {
    const handleMarketSwitchingCleanup = (event: CustomEvent) => {
      const { oldSymbol, newSymbol, oldMarketType, newMarketType } = event.detail;
      
      // Clean up subscriptions for old symbol
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      // Clear subscription tracking
      if (subscriptionKeyRef.current) {
        activeSubscriptions.delete(subscriptionKeyRef.current);
        subscriptionKeyRef.current = "";
      }
      
      // Clear all cached data to prevent contamination
      dataCache.current.clear();
      
      // Reset chart state completely
      if (isMountedRef.current) {
        setChartState({
          candleData: [],
          loading: true,
          error: null,
          lastUpdateTime: 0,
          dataInitialized: false,
          dataReady: false,
          isLoadingOlderData: false,
          hasReachedOldestData: false,
          oldestLoadedTimestamp: null,
          newestLoadedTimestamp: null,
          price: 0,
          marketType: newMarketType,
        });
      }
    };

    // Listen for market switching cleanup events
    window.addEventListener('market-switching-cleanup', handleMarketSwitchingCleanup as EventListener);
    
    return () => {
      window.removeEventListener('market-switching-cleanup', handleMarketSwitchingCleanup as EventListener);
    };
  }, []);

  // Initial load effect - only for symbol changes and first load
  useEffect(() => {
    if (!symbol || !timeFrame) return;

    const symbolChanged = currentSymbolRef.current !== symbol;
    const isFirstLoad = isInitialLoadRef.current;

    if (symbolChanged || isFirstLoad) {
      log("🔄 Initial load for", symbol, timeFrame, {
        symbolChanged,
        isFirstLoad,
      });

      // Always unsubscribe from previous subscription when changing symbol
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Clear subscription key when changing
      if (subscriptionKeyRef.current) {
        activeSubscriptions.delete(subscriptionKeyRef.current);
        subscriptionKeyRef.current = "";
      }

      // Clear data when symbol changes
      if (symbolChanged) {
        log("🧹 Clearing chart data due to symbol change");
        setChartState((prev) => ({
          ...prev,
          candleData: [],
          loading: true,
          error: null,
          dataInitialized: false,
          dataReady: false,
          oldestLoadedTimestamp: null,
          newestLoadedTimestamp: null,
          hasReachedOldestData: false,
          price: 0,
        }));
      }

      // Update current refs
      currentSymbolRef.current = symbol;
      currentTimeFrameRef.current = timeFrame;

      const cacheKey = getCacheKey(symbol, timeFrame);
      const cachedData = dataCache.current.get(cacheKey);

      if (cachedData && cachedData.length > 0 && !symbolChanged) {
        log("📦 Using cached OHLCV data");
        setChartState((prev) => ({
          ...prev,
          candleData: cachedData,
          loading: false,
          dataInitialized: true,
          dataReady: true,
          oldestLoadedTimestamp: cachedData[0].time,
          newestLoadedTimestamp: cachedData[cachedData.length - 1].time,
          price: cachedData[cachedData.length - 1].close,
        }));

        const newRange = {
          start: Math.max(0, cachedData.length - CONFIG.VISIBLE_CANDLE_COUNT),
          end: cachedData.length,
        };
        setStateVisibleRange(newRange);

        setTimeout(subscribeToOHLCV, 500);
      } else {
        log("📡 Fetching fresh historical data");
        fetchHistoricalData(true).then((success) => {
          if (success && isMountedRef.current) {
            log("✅ Historical data fetched, subscribing to OHLCV stream");
            setTimeout(subscribeToOHLCV, 1000);
          }
        });
      }

      isInitialLoadRef.current = false;
    }
  }, [
    symbol,
    subscribeToOHLCV,
    fetchHistoricalData,
    getCacheKey,
    setStateVisibleRange,
  ]);

  const refreshData = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < CONFIG.MIN_API_CALL_INTERVAL) {
      const waitTime = Math.ceil(
        (CONFIG.MIN_API_CALL_INTERVAL - (now - lastFetchTimeRef.current)) / 1000
      );
      setLastError(`Please wait ${waitTime} more seconds before refreshing.`);
      return;
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    fetchHistoricalData(false).then((success) => {
      if (success && isMountedRef.current) {
        setTimeout(subscribeToOHLCV, 1000);
      }
    });
  }, [fetchHistoricalData, subscribeToOHLCV, setLastError]);

  const clearCurrentData = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (isMountedRef.current) {
      setChartState({
        candleData: [],
        loading: false,
        error: null,
        lastUpdateTime: 0,
        dataInitialized: false,
        dataReady: false,
        isLoadingOlderData: false,
        hasReachedOldestData: false,
        oldestLoadedTimestamp: null,
        newestLoadedTimestamp: null,
        price: 0,
      });
    }

    dataCache.current.clear();
  }, []);

  return {
    candleData: chartState.candleData,
    loading: chartState.loading,
    error: chartState.error,
    refreshData,
    setGlobalCandleData: (data: CandleData[]) => {
      if (typeof window !== "undefined") {
        (window as any).globalCandleData = data;
      }
    },
    fetchOlderData,
    requestOlderData: fetchOlderData,
    isLoadingOlderData: chartState.isLoadingOlderData,
    hasReachedOldestData: chartState.hasReachedOldestData,
    timeFrame,
    oldestLoadedTimestamp: chartState.oldestLoadedTimestamp,
    newestLoadedTimestamp: chartState.newestLoadedTimestamp,
    viewportCandleCapacity: CONFIG.VISIBLE_CANDLE_COUNT,
    calculateViewportCapacity: () => {},
    dataReady: chartState.dataReady,
    shouldFetchOlderData: () =>
      !chartState.isLoadingOlderData && !chartState.hasReachedOldestData,
    isMarketSwitching: chartState.loading && !chartState.dataInitialized,
    clearSymbolCache: (sym: string) => {
      const keysToDelete = Array.from(dataCache.current.keys()).filter((key) =>
        key.startsWith(sym)
      );
      keysToDelete.forEach((key) => dataCache.current.delete(key));
    },
    clearCurrentData,
    price: chartState.price,
    saveCurrentVisibleRange: (range: { start: number; end: number }) => {
      visibleRangeRef.current = range;
    },
    getCurrentVisibleRange: (dataLength: number) => {
      if (visibleRangeRef.current.end <= dataLength) {
        return visibleRangeRef.current;
      }
      return {
        start: Math.max(0, dataLength - CONFIG.VISIBLE_CANDLE_COUNT),
        end: dataLength,
      };
    },
    // Expose the direct timeframe change function
    changeTimeFrameDirectly,
  };
}
