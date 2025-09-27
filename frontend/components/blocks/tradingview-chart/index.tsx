"use client";

import { memo, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import { $fetch } from "@/lib/api";
import type { Symbol, TimeFrame } from "@/store/trade/use-binary-store";
import { extractBaseCurrency, extractQuoteCurrency } from "@/store/trade/use-binary-store";
import { useTradingViewLoader } from "./script-loader";
import { marketDataWs } from "@/services/market-data-ws";
import { getTradingViewPricescale, type MarketMetadata } from "@/lib/precision-utils";

// TradingView types (assuming they're available globally)
declare global {
  interface Window {
    TradingView: any;
  }
}

interface TradingViewChartProps {
  symbol: Symbol;
  timeFrame: TimeFrame;
  onChartContextReady?: (context: any) => void;
  showExpiry?: boolean;
  expiryMinutes?: number;
  orders?: any[];
  marketType?: "spot" | "eco" | "futures";
  onPriceUpdate?: (price: number) => void;
  metadata?: MarketMetadata;
  isMarketSwitching?: boolean;
}

interface Bar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: string;
}

// Resolution mapping for different providers
const resolutionMap: Record<string, string> = {
  "1m": "1",
  "3m": "3", 
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "4h": "240",
  "6h": "360",
  "8h": "480",
  "12h": "720",
  "1d": "1D",
  "3d": "3D",
  "1w": "1W",
  "1M": "1M",
};

const resolutionMapProvider: Record<string, Record<string, string>> = {
  binance: {
    "1m": "1m",
    "3m": "3m",
    "5m": "5m", 
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "4h": "4h",
    "6h": "6h",
    "8h": "8h",
    "12h": "12h",
    "1d": "1d",
    "3d": "3d",
    "1w": "1w",
    "1M": "1M",
  },
  kucoin: {
    "1m": "1min",
    "3m": "3min",
    "5m": "5min",
    "15m": "15min", 
    "30m": "30min",
    "1h": "1hour",
    "4h": "4hour",
    "6h": "6hour",
    "8h": "8hour",
    "12h": "12hour",
    "1d": "1day",
    "3d": "3day",
    "1w": "1week",
    "1M": "1month",
  },
};

const supportedResolutionsProvider: Record<string, string[]> = {
  binance: ["1", "3", "5", "15", "30", "60", "120", "240", "360", "480", "720", "1D", "3D", "1W", "1M"],
  kucoin: ["1", "3", "5", "15", "30", "60", "120", "240", "360", "480", "720", "1D", "3D", "1W", "1M"],
};

const intervals = ["1", "3", "5", "15", "30", "60", "120", "240", "360", "480", "720", "1D", "3D", "1W", "1M"];

const intervalDurations: Record<string, number> = {
  "1": 60000,
  "3": 180000,
  "5": 300000,
  "15": 900000,
  "30": 1800000,
  "60": 3600000,
  "120": 7200000,
  "240": 14400000,
  "360": 21600000,
  "480": 28800000,
  "720": 43200000,
  "1D": 86400000,
  "3D": 259200000,
  "1W": 604800000,
  "1M": 2629746000,
};

const TradingViewChartBase = ({
  symbol,
  timeFrame,
  onChartContextReady,
  showExpiry = false,
  expiryMinutes = 5,
  orders = [],
  marketType = "spot",
  onPriceUpdate,
  metadata,
}: TradingViewChartProps) => {
  const [chartReady, setChartReady] = useState(false);
  const [tvWidget, setTvWidget] = useState<any>(null);
  const [provider, setProvider] = useState<string>("binance");
  const [interval, setInterval] = useState<string | null>("1h");
  const subscribers = useRef<any>({});
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  // Use the TradingView script loader
  const { isLoaded: isTradingViewLoaded, isLoading: isTradingViewLoading, error: tradingViewError } = useTradingViewLoader();

  // Simple mobile detection using window width
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    switch (process.env.NEXT_PUBLIC_EXCHANGE) {
      case "bin":
        setProvider("binance");
        break;
      case "kuc":
        setProvider("kucoin");
        break;
      default:
        setProvider("binance");
        break;
    }
  }, []);

  // TradingView disabled and enabled features
  const disabled_features = [
    "header_compare",
    "symbol_search_hot_key",
    "header_symbol_search",
    "border_around_the_chart",
    "popup_hints",
    "timezone_menu",
  ];

  const enabled_features = [
    "save_chart_properties_to_local_storage",
    "use_localstorage_for_settings",
    "dont_show_boolean_study_arguments",
    "hide_last_na_study_output",
    "constraint_dialogs_movement",
    "countdown",
    "insert_indicator_dialog_shortcut",
    "shift_visible_range_on_new_bar",
    "hide_image_invalid_symbol",
    "pre_post_market_sessions",
    "use_na_string_for_not_available_values",
    "create_volume_indicator_by_default",
    "determine_first_data_request_size_using_visible_range",
    "end_of_period_timescale_marks",
    "secondary_series_extend_time_scale",
    "shift_visible_range_on_new_bar",
  ];

  if (isMobile) {
    disabled_features.push("left_toolbar");
    disabled_features.push("header_fullscreen_button");
    disabled_features.push("timeframes_toolbar");
  } else {
    enabled_features.push("chart_style_hilo");
    enabled_features.push("chart_style_hilo_last_price");
    enabled_features.push("side_toolbar_in_fullscreen_mode");
  }

  const DataFeed = useMemo(() => {
    if (!symbol) return null;

    const isEco = marketType === "eco";
    const historyPath = isEco ? `/api/ecosystem/chart` : `/api/exchange/chart`;
    const pricescale = getTradingViewPricescale(metadata);

    return {
      async onReady(callback: any) {
        setTimeout(() => {
          try {
            callback({
              exchanges: [],
              symbols_types: [],
              supported_resolutions: ["1", "3", "5", "15", "30", "60", "240", "360", "480", "720", "1D", "3D", "1W", "1M"],
            });
          } catch (error) {
            console.error("TradingView onReady callback error:", error);
          }
        }, 0);
      },

      async resolveSymbol(
        symbolName: string,
        onSymbolResolvedCallback: any,
        onResolveErrorCallback: any
      ) {
        setTimeout(() => {
          try {
            onSymbolResolvedCallback({
              data_status: "streaming",
              pricescale,
              name: symbolName,
              full_name: symbolName,
              description: symbolName,
              ticker: symbolName,
              type: "crypto",
              session: "24x7",
              format: "price",
              exchange: process.env.NEXT_PUBLIC_SITE_NAME,
              listed_exchange: process.env.NEXT_PUBLIC_SITE_NAME,
              timezone: "Etc/UTC",
              volume_precision: 8,
              supported_resolutions: ["1", "3", "5", "15", "30", "60", "240", "360", "480", "720", "1D", "3D", "1W", "1M"],
              minmov: 1,
              has_intraday: true,
              visible_plots_set: false,
            });
          } catch (error) {
            console.error("TradingView resolveSymbol callback error:", error);
            onResolveErrorCallback(error);
          }
        }, 0);
      },

      async getBars(
        symbolInfo: any,
        resolution: string,
        periodParams: any,
        onHistoryCallback: any,
        onErrorCallback: any
      ) {
        let from = periodParams.from * 1000; // Convert to milliseconds
        let to = periodParams.to * 1000; // Convert to milliseconds
        
        // Validate and clamp dates to prevent future date issues
        const now = Date.now();
        const maxHistoryDays = 365; // Maximum 1 year of history
        const minDate = now - (maxHistoryDays * 24 * 60 * 60 * 1000);
        
        // Clamp 'to' to current time if it's in the future
        if (to > now) {
          to = now;
        }
        
        // Clamp 'from' to minimum allowed date
        if (from < minDate) {
          from = minDate;
        }
        
        // Ensure from is before to
        if (from >= to) {
          from = to - (24 * 60 * 60 * 1000); // Set from to 1 day before to
        }
        
        // Map TradingView resolution to your API interval format
        const resolutionMap: Record<string, string> = {
          "1": "1m",
          "3": "3m", 
          "5": "5m",
          "15": "15m",
          "30": "30m",
          "60": "1h",
          "240": "4h",
          "360": "6h",
          "480": "8h",
          "720": "12h",
          "1D": "1d",
          "3D": "3d",
          "1W": "1w",
          "1M": "1M"
        };
        
        const interval = resolutionMap[resolution] || "1h";
        
        // Format symbol for API call using proper base/quote extraction
        const formatSymbolForAPI = (symbol: string): string => {
          // Add safety check for undefined/null symbol
          if (!symbol || typeof symbol !== 'string') {
            console.warn("Invalid symbol provided to TradingView formatSymbolForAPI:", symbol);
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
        
        const formattedSymbol = formatSymbolForAPI(symbol);
        

        try {
          // Determine API endpoint based on market type
          const apiEndpoint = marketType === "eco" 
            ? "/api/ecosystem/chart" 
            : marketType === "futures"
            ? "/api/futures/chart"
            : "/api/exchange/chart";

          // Define duration mapping for the main exchange API
          const intervalDurations: Record<string, number> = {
            "1m": 60 * 1000,
            "3m": 3 * 60 * 1000,
            "5m": 5 * 60 * 1000,
            "15m": 15 * 60 * 1000,
            "30m": 30 * 60 * 1000,
            "1h": 60 * 60 * 1000,
            "4h": 4 * 60 * 60 * 1000,
            "6h": 6 * 60 * 60 * 1000,
            "8h": 8 * 60 * 60 * 1000,
            "12h": 12 * 60 * 60 * 1000,
            "1d": 24 * 60 * 60 * 1000,
            "3d": 3 * 24 * 60 * 60 * 1000,
            "1w": 7 * 24 * 60 * 60 * 1000,
            "1M": 30 * 24 * 60 * 60 * 1000,
          };
          
          // Use $fetch with proper error handling
          const response = await $fetch({
            url: apiEndpoint,
            silent: true,
            params: {
              symbol: formattedSymbol,
              interval: interval,
              from: from,
              to: to,
              ...(apiEndpoint === "/api/exchange/chart" && {
                duration: intervalDurations[interval] || 60 * 60 * 1000
              })
            },
          });

          // Check if there was an error in the response
          if (response.error) {
            onHistoryCallback([], { noData: true });
            return;
          }

          // Parse the data from the response
          const data = response.data;

          // Check if data was returned
          if (!data || !Array.isArray(data) || data.length === 0) {
            onHistoryCallback([], { noData: true });
            return;
          }

          // Convert data to the format required by TradingView
          const bars = data.map((item: any[]) => ({
            time: item[0],
            open: item[1],
            high: item[2],
            low: item[3],
            close: item[4],
            volume: item[5],
          }));

          // Sort the bars by time
          bars.sort((a: any, b: any) => a.time - b.time);

          onHistoryCallback(bars);
        } catch (error) {
          console.error("TradingView getBars error:", error);
          // Return empty data instead of calling error callback to prevent TradingView errors
          onHistoryCallback([], { noData: true });
        }
      },

             subscribeBars(
         symbolInfo: any,
         resolution: string,
         onRealtimeCallback: any,
         subscribeUID: string,
         onResetCacheNeededCallback: any
       ) {
         // Map TradingView resolution to your API interval format
         const resolutionMap: Record<string, string> = {
           "1": "1m",
           "3": "3m", 
           "5": "5m",
           "15": "15m",
           "30": "30m",
           "60": "1h",
           "240": "4h",
           "360": "6h",
           "480": "8h",
           "720": "12h",
           "1D": "1d",
           "3D": "3d",
           "1W": "1w",
           "1M": "1M"
         };
         
         const interval = resolutionMap[resolution] || "1h";
         
         // Format symbol for WebSocket subscription using proper base/quote extraction
         const formatSymbolForAPI = (symbol: string): string => {
           // Add safety check for undefined/null symbol
           if (!symbol || typeof symbol !== 'string') {
             console.warn("Invalid symbol provided to TradingView WebSocket formatSymbolForAPI:", symbol);
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
         
         const formattedSymbol = formatSymbolForAPI(symbolInfo.ticker);

         // Store subscriber info for real-time updates
         const subscriberInfo = {
           callback: onRealtimeCallback,
           symbolInfo: symbolInfo,
           resolution: resolution,
           interval: interval,
           formattedSymbol: formattedSymbol,
           unsubscribe: null as (() => void) | null,
         };

         subscribers.current[subscribeUID] = subscriberInfo;

                    // Subscribe to real-time OHLCV data using your WebSocket service
           try {
             const unsubscribe = marketDataWs.subscribe(
               {
                 symbol: formattedSymbol,
                 type: "ohlcv",
                 marketType: marketType || "spot",
                 interval: interval,
               },
               (data: any) => {
                 // Add comprehensive validation for TradingView WebSocket data
                 if (!data || typeof data !== 'object') {
                   console.warn("Invalid TradingView WebSocket data received:", data);
                   return;
                 }
                 
                 // Validate stream property
                 if (!data.stream || typeof data.stream !== 'string') {
                   console.warn("Invalid TradingView WebSocket stream data:", data);
                   return;
                 }
                 
                 // Validate data array
                 if (!Array.isArray(data.data) || data.data.length === 0) {
                   console.warn("Empty or invalid TradingView OHLCV data array:", data);
                   return;
                 }
                 
                 const ohlcvData = data.data[0]; // Get the first (latest) candle
                 
                 // Validate individual candle data
                 if (!Array.isArray(ohlcvData) || ohlcvData.length < 6) {
                   console.warn("Invalid TradingView candle data format:", ohlcvData);
                   return;
                 }
                 
                 // Validate that all OHLCV values are numbers
                 const [timestamp, open, high, low, close, volume] = ohlcvData;
                 if (typeof timestamp !== 'number' || 
                     typeof open !== 'number' || 
                     typeof high !== 'number' || 
                     typeof low !== 'number' || 
                     typeof close !== 'number' || 
                     typeof volume !== 'number') {
                   console.warn("Invalid TradingView OHLCV data types:", ohlcvData);
                   return;
                 }
                 
                 const bar = {
                   time: timestamp,
                   open: open,
                   high: high,
                   low: low,
                   close: close,
                   volume: volume,
                 };
                 
                 // Wrap onRealtimeCallback in try-catch to prevent TradingView errors
                 try {
                   onRealtimeCallback(bar);
                 } catch (callbackError) {
                   console.error("TradingView onRealtimeCallback error:", callbackError);
                   // Don't propagate the error to prevent TradingView library issues
                 }
                 
                 // Update price callback if available
                 if (onPriceUpdate) {
                   onPriceUpdate(bar.close);
                 }
               }
             );
             
             subscriberInfo.unsubscribe = unsubscribe;
           } catch (error) {
             // Silently handle subscription errors
           }
       },

       unsubscribeBars(subscriberUID: string) {
         const subscriber = subscribers.current[subscriberUID];
         if (!subscriber) return;

         // Unsubscribe from WebSocket if available
         if (subscriber.unsubscribe) {
           subscriber.unsubscribe();
         }

         delete subscribers.current[subscriberUID];
       },
    };
  }, [symbol, marketType, onPriceUpdate]);

  const handleBarsMessage = (message: any) => {
    // Add comprehensive validation for TradingView message data
    if (!message || typeof message !== 'object') {
      console.warn("Invalid TradingView message received:", message);
      return;
    }
    
    const { data } = message;
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("Invalid or empty TradingView message data:", data);
      return;
    }

    const bar = data[0];
    if (!Array.isArray(bar) || bar.length < 6) {
      console.warn("Invalid TradingView bar data format:", bar);
      return;
    }
    
    // Validate that all OHLCV values are numbers
    const [timestamp, open, high, low, close, volume] = bar;
    if (typeof timestamp !== 'number' || 
        typeof open !== 'number' || 
        typeof high !== 'number' || 
        typeof low !== 'number' || 
        typeof close !== 'number' || 
        typeof volume !== 'number') {
      console.warn("Invalid TradingView bar data types:", bar);
      return;
    }

    const newBar: Bar = {
      time: timestamp.toString(), // Convert to string as required by Bar interface
      open: open,
      high: high,
      low: low,
      close: close,
      volume: volume,
    };

    // Update price callback
    if (onPriceUpdate) {
      onPriceUpdate(newBar.close);
    }

    // Update subscribers
    Object.keys(subscribers.current).forEach((key) => {
      const subscriber = subscribers.current[key];
      if (subscriber.callback) {
        subscriber.callback(newBar);
      }
    });
  };

  // Listen for market switching cleanup events
  useEffect(() => {
    const handleMarketSwitchingCleanup = (event: CustomEvent) => {
      const { oldSymbol, newSymbol, oldMarketType, newMarketType } = event.detail;
      
      // Unsubscribe all current subscribers
      Object.keys(subscribers.current).forEach((subscribeUID) => {
        const subscriber = subscribers.current[subscribeUID];
        if (subscriber && subscriber.unsubscribe) {
          subscriber.unsubscribe();
        }
        delete subscribers.current[subscribeUID];
      });
      
      // Clear subscribers
      subscribers.current = {};
    };

    window.addEventListener('market-switching-cleanup', handleMarketSwitchingCleanup as EventListener);
    
    return () => {
      window.removeEventListener('market-switching-cleanup', handleMarketSwitchingCleanup as EventListener);
    };
  }, []);

  // Track previous symbol to detect actual changes
  const prevSymbolRef = useRef<string>("");
  const prevMarketTypeRef = useRef<string>("");
  
  // Handle symbol changes - cleanup is handled by market-switching-cleanup event
  useEffect(() => {
    if (!symbol) return;
    
    // Update refs
    prevSymbolRef.current = symbol;
    prevMarketTypeRef.current = marketType;
    
  }, [symbol, marketType]);

  async function initTradingView() {
    // Cleanup existing widget
    if (tvWidget) {
      try {
        tvWidget.remove();
      } catch (error) {
        console.warn("Error removing existing TradingView widget:", error);
      }
      setTvWidget(null);
    }

    if (!symbol || typeof symbol !== 'string') {
      console.error("Valid symbol is required for TradingView");
      return;
    }

    // Check if TradingView is loaded
    if (!window.TradingView || !window.TradingView.widget) {
      console.error("TradingView library not loaded");
      return;
    }
    
    // Symbol format is handled by the formatSymbolForAPI function in datafeed

    const datafeed = DataFeed;
    if (!datafeed) return;

    const widgetOptions = {
      fullscreen: false,
      autosize: true,
      symbol: symbol,
      interval: "60",
      container: "tv_chart_container",
      datafeed: datafeed,
      library_path: "/lib/chart/charting_library/charting_library/",
      locale: "en",
      theme: isDark ? "Dark" : "Light",
      timezone: "Etc/UTC",
      client_id: "chart",
      disabled_features: disabled_features,
      enabled_features: enabled_features,
      overrides: {
        "mainSeriesProperties.showCountdown": true,
        "highLowAvgPrice.highLowPriceLinesVisible": true,
        "mainSeriesProperties.highLowAvgPrice.highLowPriceLabelsVisible": true,
        "mainSeriesProperties.showPriceLine": true,
        "paneProperties.background": isDark ? "#18181b" : "#ffffff",
        "paneProperties.backgroundType": "solid",
      },
      // custom_css_url: "/lib/chart/themed.css", // Commented out as file doesn't exist
    };

    try {
      const tv = new window.TradingView.widget(widgetOptions);
      setTvWidget(tv);

      tv.onChartReady(() => {
        try {
          setChartReady(true);
          if (onChartContextReady) {
            onChartContextReady({
              widget: tv,
              symbol,
              timeFrame,
              theme: isDark ? "dark" : "light",
            });
          }
        } catch (error) {
          console.error("TradingView onChartReady callback error:", error);
        }
      });
    } catch (error) {
      console.error("❌ Failed to create TradingView widget:", error);
    }
  }

  useEffect(() => {
    if (symbol && isTradingViewLoaded) {
      initTradingView();
    }
  }, [symbol, isTradingViewLoaded]);

  // Only change theme without reinitializing the entire widget
  useEffect(() => {
    if (
      chartReady &&
      tvWidget?._ready &&
      typeof tvWidget.changeTheme === "function"
    ) {
      tvWidget.changeTheme(isDark ? "Dark" : "Light");
    }
  }, [isDark, chartReady, tvWidget]);

  // Show loading state while TradingView is loading
  if (isTradingViewLoading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-sm">Loading TradingView...</p>
        </div>
      </div>
    );
  }

  // Show error state if TradingView failed to load
  if (tradingViewError) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="text-sm mb-2">Failed to load TradingView</p>
          <p className="text-xs text-gray-500">Falling back to native chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div id="tv_chart_container" className="w-full h-full"></div>
      {/* Show loading overlay if chart is not ready */}
      {!chartReady && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export const TradingViewChart = memo(TradingViewChartBase); 