"use client";
import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useWebSocketStore } from "@/store/websocket-store";
import LineChart from "./line-chart";
import { Link } from "@/i18n/routing";
import Marquee from "./marquee";
import { usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface MarketItem {
  symbol: string;
  currency: string;
  price: number;
  change: number;
  history: number[];
}

interface TrendingMarketsProps {
  element: {
    id: string;
    settings?: {
      apiEndpoint?: string;
      wsEndpoint?: string;
      maxItems?: number;
      autoScroll?: boolean;
      scrollSpeed?: number;
      showGradients?: boolean;
      scrollDirection?: "ltr" | "rtl";
      linkBaseUrl?: string;
      [key: string]: any;
    };
  };
}

// Memoized helper functions
const generateFakeHistory = (initialPrice: number, length = 15): number[] => {
  const history: number[] = [];
  let lastPrice = initialPrice;
  for (let i = 0; i < length; i++) {
    const variation = (Math.random() - 0.5) * 0.02;
    const price = lastPrice * (1 + variation);
    history.push(price);
    lastPrice = price;
  }
  return history;
};

// Mock data for builder/preview mode
const MOCK_MARKET_DATA = {
  "BTC/USDT": { last: 65000, change: 2.5 },
  "ETH/USDT": { last: 3500, change: -1.2 },
  "SOL/USDT": { last: 150, change: 5.3 },
  "ADA/USDT": { last: 0.45, change: 0.8 },
  "DOT/USDT": { last: 7.2, change: -0.5 },
};

// Memoized market item component
const MarketItemComponent = memo(
  ({ item, linkBaseUrl }: { item: MarketItem; linkBaseUrl: string }) => {
    const t = useTranslations("dashboard");
    const changeColor = useMemo(
      () => (item.change >= 0 ? "text-green-500" : "text-red-500"),
      [item.change]
    );

    const changeSymbol = useMemo(
      () => (item.change >= 0 ? "+" : ""),
      [item.change]
    );

    const formattedPrice = useMemo(
      () =>
        item.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        }),
      [item.price]
    );

    const formattedChange = useMemo(
      () => `${changeSymbol}${item.change.toFixed(2)}%`,
      [changeSymbol, item.change]
    );

    return (
      <div className="flex items-center space-x-4 min-w-max">
        <Link
          href={`${linkBaseUrl}/${item.symbol.replace("/", "")}`}
          className="flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-zinc-800 p-2 rounded-lg transition-colors group"
        >
          <div className="flex flex-col">
            <span className="font-medium text-sm group-hover:text-primary">
              {item.symbol}
            </span>
            <span className="text-xs text-gray-500">{item.currency}</span>
          </div>
          <div className="w-20 h-8">
            <LineChart values={item.history} width={80} height={32} />
          </div>
          <div className="flex flex-col items-end min-w-[80px]">
            <span className="font-medium text-sm">
              {'$'}
              {formattedPrice}
            </span>
            <span className={`text-xs ${changeColor}`}>{formattedChange}</span>
          </div>
        </Link>
      </div>
    );
  }
);

MarketItemComponent.displayName = "MarketItemComponent";

// Main component with optimizations
export const TrendingMarketsElement = memo<TrendingMarketsProps>(
  ({ element }) => {
    const t = useTranslations("dashboard");
    const settings = element.settings || {};

    // Memoized settings
    const processedSettings = useMemo(
      () => ({
        apiEndpoint: settings.apiEndpoint || "/api/markets/ticker",
        wsEndpoint: settings.wsEndpoint || "/api/markets/ticker/ws",
        maxItems: settings.maxItems || 10,
        autoScroll: settings.autoScroll !== false,
        scrollSpeed: settings.scrollSpeed || 50,
        showGradients: settings.showGradients !== false,
        scrollDirection: settings.scrollDirection || ("rtl" as const),
        linkBaseUrl: settings.linkBaseUrl || "/trade",
      }),
      [settings]
    );

    const {
      createConnection,
      subscribe,
      unsubscribe,
      addMessageHandler,
      removeMessageHandler,
    } = useWebSocketStore();

    const pathname = usePathname();

    // Memoized builder detection
    const isInBuilder = useMemo(
      () => pathname?.includes("/admin/builder") ?? false,
      [pathname]
    );

    const [isMounted, setIsMounted] = useState(false);
    const [tickersFetched, setTickersFetched] = useState(false);
    const [marketItems, setMarketItems] = useState<MarketItem[]>([]);

    // Memoized utility functions
    const parseToNumber = useCallback((value: any): number => {
      const parsedValue =
        typeof value === "number" ? value : Number.parseFloat(value);
      return isNaN(parsedValue) ? 0 : parsedValue;
    }, []);

    const updateItem = useCallback(
      (existingItem: MarketItem, update: any): MarketItem => {
        const newPrice =
          update?.last !== undefined
            ? parseToNumber(update.last)
            : existingItem.price;

        return {
          ...existingItem,
          price: newPrice,
          change:
            update?.change !== undefined
              ? parseToNumber(update.change)
              : existingItem.change,
          history: [...existingItem.history, newPrice].slice(-15),
        };
      },
      [parseToNumber]
    );

    const updateItems = useCallback(
      (newData: any) => {
        setMarketItems((prevItems) => {
          // Group markets by base currency to avoid duplicates
          const marketsByBaseCurrency = new Map<string, MarketItem>();
          
          // Update existing items
          const updatedItems = prevItems.map((item) => {
            const update = newData[item.symbol];
            return update ? updateItem(item, update) : item;
          });

          // Process existing items by base currency
          updatedItems.forEach((item) => {
            const baseCurrency = item.currency;
            const existing = marketsByBaseCurrency.get(baseCurrency);
            
            // Keep the item with higher price or volume (using price as proxy)
            if (!existing || item.price > existing.price) {
              marketsByBaseCurrency.set(baseCurrency, item);
            }
          });

          // Add new markets, avoiding duplicates by base currency
          Object.keys(newData)
            .filter((key) => !prevItems.find((item) => item.symbol === key))
            .forEach((key) => {
              const baseCurrency = key.split("/")[0];
              const newItem = {
                symbol: key,
                currency: baseCurrency,
                price: parseToNumber(newData[key].last),
                change: parseToNumber(newData[key].change),
                history: generateFakeHistory(parseToNumber(newData[key].last)),
              };
              
              const existing = marketsByBaseCurrency.get(baseCurrency);
              
              // Only add if no existing item for this base currency, or if this one has higher price
              if (!existing || newItem.price > existing.price) {
                marketsByBaseCurrency.set(baseCurrency, newItem);
              }
            });

          // Convert map back to array and limit by maxItems
          return Array.from(marketsByBaseCurrency.values()).slice(
            0,
            processedSettings.maxItems
          );
        });
      },
      [processedSettings.maxItems, updateItem, parseToNumber]
    );

    // Memoized render content
    const renderContent = useMemo(() => {
      if (!isMounted || marketItems.length === 0) {
        return (
          <div className="flex items-center justify-center py-4">
            <div className="text-gray-500 text-sm">
              {t("loading_market_data")}.
            </div>
          </div>
        );
      }

      const marketItemElements = marketItems.map((item) => (
        <MarketItemComponent
          key={item.symbol}
          item={item}
          linkBaseUrl={processedSettings.linkBaseUrl}
        />
      ));

      if (processedSettings.autoScroll) {
        return (
          <Marquee
            speed={processedSettings.scrollSpeed}
            direction={processedSettings.scrollDirection}
            showGradients={processedSettings.showGradients}
          >
            {marketItemElements}
          </Marquee>
        );
      }

      return (
        <div className="flex space-x-6 overflow-x-auto py-2 scrollbar-hide">
          {marketItemElements}
        </div>
      );
    }, [
      isMounted,
      marketItems,
      processedSettings.linkBaseUrl,
      processedSettings.autoScroll,
      processedSettings.scrollSpeed,
      processedSettings.scrollDirection,
      processedSettings.showGradients,
    ]);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Fetch initial data - always use mock data in builder
    useEffect(() => {
      const fetchTickers = async () => {
        try {
          updateItems(MOCK_MARKET_DATA);
          setTickersFetched(true);
        } catch (error) {
          console.error("Error fetching tickers:", error);
        }
      };

      if (isMounted) {
        fetchTickers();
      }

      return () => {
        setTickersFetched(false);
      };
    }, [isMounted, updateItems]);

    // Setup WebSocket connection - only when not in builder
    useEffect(() => {
      if (tickersFetched && !isInBuilder) {
        try {
          createConnection("tickersConnection", processedSettings.wsEndpoint, {
            onOpen: () => {
              subscribe("tickersConnection", "tickers");
            },
            onError: (error) => {
              console.log("WebSocket connection error handled gracefully");
            },
          });

          return () => {
            unsubscribe("tickersConnection", "tickers");
          };
        } catch (error) {
          console.log(
            "Failed to create WebSocket connection, using mock data instead"
          );
        }
      }
    }, [
      tickersFetched,
      createConnection,
      subscribe,
      unsubscribe,
      processedSettings.wsEndpoint,
      isInBuilder,
    ]);

    // Handle WebSocket messages - only when not in builder
    useEffect(() => {
      if (tickersFetched && !isInBuilder) {
        const handleTickerMessage = (message: any) => {
          if (message?.data && typeof message.data === "object") {
            updateItems(message.data);
          }
        };

        const messageFilter = (message: any) =>
          message.stream && message.stream === "tickers";

        addMessageHandler(
          "tickersConnection",
          handleTickerMessage,
          messageFilter
        );

        return () => {
          removeMessageHandler("tickersConnection", handleTickerMessage);
        };
      }
    }, [
      tickersFetched,
      updateItems,
      addMessageHandler,
      removeMessageHandler,
      isInBuilder,
    ]);

    return (
      <div
        className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden"
        data-element-id={element.id}
        data-element-type="trending-markets"
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("trending_markets")}
          </h3>
        </div>
        <div className="px-4 py-2">{renderContent}</div>
      </div>
    );
  }
);

TrendingMarketsElement.displayName = "TrendingMarketsElement";

export default TrendingMarketsElement;
