"use client";

import { useState, useEffect, useRef } from "react";
import {
  websocketService,
  type MarketTickerData,
  type OrderbookData,
  type TradeData,
} from "@/services/websocket-service";

// Define the stream types
export type StreamType = "ticker" | "orderbook" | "trade";

// Define the return type based on stream type
export type StreamDataType<T extends StreamType> = T extends "ticker"
  ? MarketTickerData
  : T extends "orderbook"
    ? OrderbookData
    : T extends "trade"
      ? TradeData[]
      : never;

export function useWebSocketStream<T extends StreamType>(
  streamType: T,
  symbol: string
): {
  data: StreamDataType<T> | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<StreamDataType<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep track of the previous symbol to handle unsubscription
  const prevSymbolRef = useRef<string | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    // If we have a previous symbol and it's different from the current one,
    // unsubscribe from the previous symbol's stream
    if (
      prevSymbolRef.current &&
      prevSymbolRef.current !== symbol &&
      unsubscribeRef.current
    ) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;

      // Reset data when switching symbols
      setData(null);
    }

    try {
      let unsubscribe: () => void = () => {};

      // Subscribe based on stream type
      if (streamType === "ticker") {
        unsubscribe = websocketService.subscribeTicker(
          symbol,
          (sym, price, change) => {
            if (!isMountedRef.current) return;

            const tickerData: MarketTickerData = {
              symbol: sym,
              price,
              change: 0,
              changePercent: change,
              lastUpdated: Date.now(),
            };
            setData(tickerData as StreamDataType<T>);
            setIsLoading(false);
          }
        );

        // Initialize with existing data if available
        const existingData = websocketService.getMarketTickerData(symbol);
        if (existingData) {
          setData(existingData as StreamDataType<T>);
          setIsLoading(false);
        }
      } else if (streamType === "orderbook") {
        unsubscribe = websocketService.subscribeOrderbook(
          symbol,
          (sym, orderbookData) => {
            if (!isMountedRef.current) return;

            setData(orderbookData as StreamDataType<T>);
            setIsLoading(false);
          }
        );

        // Initialize with existing data if available
        const existingData = websocketService.getOrderbookData(symbol);
        if (existingData) {
          setData(existingData as StreamDataType<T>);
          setIsLoading(false);
        }
      } else if (streamType === "trade") {
        unsubscribe = websocketService.subscribeTrades(
          symbol,
          (sym, tradeData) => {
            if (!isMountedRef.current) return;

            // For trades, we want to maintain an array of recent trades
            setData((prevData) => {
              const existingTrades = (prevData as TradeData[] | null) || [];
              const newTrades = [tradeData, ...existingTrades.slice(0, 49)];
              return newTrades as StreamDataType<T>;
            });
            setIsLoading(false);
          }
        );

        // Initialize with existing data if available
        const existingData = websocketService.getTradeData(symbol);
        if (existingData) {
          setData(existingData as StreamDataType<T>);
          setIsLoading(false);
        }
      }

      // Store the unsubscribe function
      unsubscribeRef.current = unsubscribe;

      // Update the previous symbol ref for next time
      prevSymbolRef.current = symbol;
    } catch (err) {
      if (isMountedRef.current) {
        setError(
          err instanceof Error ? err : new Error("Unknown error occurred")
        );
        setIsLoading(false);
      }
    }

    // Cleanup: unsubscribe when component unmounts or symbol changes
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [symbol, streamType]);

  return { data, isLoading, error };
}
