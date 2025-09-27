"use client";

import type React from "react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Tabs, TabsList, TabTrigger, TabContent } from "../ui/custom-tabs";
import { Star, BarChart2, Zap } from "lucide-react";
import { ConnectionStatus } from "@/services/ws-manager";
import type { Symbol } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { marketService } from "@/services/market-service";
import { tickersWs } from "@/services/tickers-ws";
import { marketDataWs, MarketDataSubscription, TickerData as MarketTickerData } from "@/services/market-data-ws";
import { wishlistService } from "@/services/wishlist-service";
import { useExtensionChecker } from "@/lib/extensions";

// Import components
import { SearchBar } from "./search-bar";
import { ColumnHeaders } from "./column-headers";
import { MarketList } from "./market-list";
import { WatchlistEmptyState } from "./watchlist-empty-state";
import { WatchlistHeader } from "./watchlist-header";

// Import types and utils
import type {
  MarketsPanelProps,
  SortField,
  SortDirection,
  Market,
  FuturesMarket,
  TickerData,
} from "./types";
import { formatPrice, formatVolume } from "./utils";

export default function MarketsPanel({
  onMarketSelect,
  currentSymbol = "BTC/USDT",
  defaultMarketType = "spot",
}: MarketsPanelProps) {
  const t = useTranslations("trade/components/markets/markets-panel");
  const pathname = usePathname();
  const { isExtensionAvailable, extensions } = useExtensionChecker();
  const [searchQuery, setSearchQuery] = useState("");
  const [spotSelectedMarket, setSpotSelectedMarket] =
    useState<Symbol>(currentSymbol);
  const [futuresSelectedMarket, setFuturesSelectedMarket] =
    useState<Symbol>(currentSymbol);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("markets");
  const [marketType, setMarketType] = useState<"spot" | "futures">(
    defaultMarketType
  );
  const [markets, setMarkets] = useState<any[]>([]);
  const [futuresMarkets, setFuturesMarkets] = useState<FuturesMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFuturesLoading, setIsFuturesLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );

  // Ticker data states
  const [spotData, setSpotData] = useState<Record<string, TickerData>>({});
  const [ecoData, setEcoData] = useState<Record<string, TickerData>>({});
  const [futuresData, setFuturesData] = useState<Record<string, TickerData>>(
    {}
  );

  // Advanced market data for active market (like trading header)
  const [activeMarketData, setActiveMarketData] = useState<MarketTickerData | null>(null);
  const activeMarketUnsubscribeRef = useRef<(() => void) | null>(null);

  // Replace the single sort field and direction with an array of sort criteria
  const [sortCriteria, setSortCriteria] = useState<
    Array<{ field: SortField; direction: SortDirection }>
  >([{ field: "name", direction: "asc" }]);

  // Note: Service instances are imported as singletons

  // Update selected market when currentSymbol prop changes
  useEffect(() => {
    if (currentSymbol) {
      // Update the appropriate selected market based on the current market type
      if (marketType === "spot") {
        setSpotSelectedMarket(currentSymbol);
      } else {
        setFuturesSelectedMarket(currentSymbol);
      }
    }
  }, [currentSymbol, marketType]);

  // Update the useEffect at the beginning to check for market type in URL
  useEffect(() => {
    // Check URL for market parameters on component mount
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get("type");
    const symbolParam = urlParams.get("symbol");

    // If no query parameters, set defaults and update URL
    if (!typeParam && !symbolParam && window.location.pathname === "/trade") {
      // Set defaults - changed to "spot" as default
      setMarketType("spot");
      setActiveTab("markets");
      setSpotSelectedMarket("BTC/USDT");

      // Update URL with defaults, preserving locale
      const url = `${pathname}?symbol=BTC-USDT&type=spot`;
      window.history.replaceState({ path: url }, "", url);

      if (onMarketSelect) {
        onMarketSelect("BTC/USDT", "spot");
      }
    }
    // Otherwise use parameters from URL if available
    else {
      // Set market type if present in URL
      if (typeParam === "spot" || typeParam === "futures") {
        setMarketType(typeParam);
        setActiveTab(typeParam === "spot" ? "markets" : "futures");
      } else {
        // If no type parameter, default to spot
        setMarketType("spot");
        setActiveTab("markets");
      }

      // Set selected market if present in URL
      if (symbolParam) {
        // Symbol format is XXX-YYY, we need to convert to XXX/YYY for internal use
        const [currency, pair] = symbolParam.split("-");
        if (currency && pair) {
          const fullSymbol = `${currency}/${pair}` as Symbol;

          // Update the appropriate selected market based on the market type
          if (typeParam === "spot" || !typeParam) {
            setSpotSelectedMarket(fullSymbol);
          } else if (typeParam === "futures") {
            setFuturesSelectedMarket(fullSymbol);
          }
        }
      }
    }
  }, [onMarketSelect]);

  // Ensure the useEffect for wishlist subscription is properly implemented
  useEffect(() => {
    const unsubscribe = wishlistService.subscribe((items) => {
      setWatchlist(items.map((item) => item.symbol));
    });

    return () => unsubscribe();
  }, []);

  // Listen for market switching cleanup events
  useEffect(() => {
    const handleMarketSwitchingCleanup = (event: CustomEvent) => {
      const { oldSymbol, newSymbol, oldMarketType, newMarketType } = event.detail;
      
      // Clean up active market data
      setActiveMarketData(null);
      
      // Clean up current subscription
      if (activeMarketUnsubscribeRef.current) {
        activeMarketUnsubscribeRef.current();
        activeMarketUnsubscribeRef.current = null;
      }
      
      // Clear ticker data for old market type to prevent contamination
      if (oldMarketType === "spot") {
        setSpotData(prev => {
          const newData = { ...prev };
          delete newData[oldSymbol];
          return newData;
        });
      } else if (oldMarketType === "futures") {
        setFuturesData(prev => {
          const newData = { ...prev };
          delete newData[oldSymbol];
          return newData;
        });
      }
    };

    window.addEventListener('market-switching-cleanup', handleMarketSwitchingCleanup as EventListener);
    
    return () => {
      window.removeEventListener('market-switching-cleanup', handleMarketSwitchingCleanup as EventListener);
    };
  }, []);

  // Format futures markets - Advanced: Use market data WS for active market
  const formattedFuturesMarkets = useMemo((): Market[] => {

    
    return futuresMarkets.map((market) => {
      // Use consistent currency/pair format for both symbol and ticker key
      const symbol = `${market.currency}/${market.pair}` as Symbol;
      const tickerKey = symbol;
      

      
      // Check if this is the currently active futures market
      const isActiveMarket = symbol === futuresSelectedMarket && marketType === "futures";
      
      let tickerData: any;

      if (isActiveMarket && activeMarketData) {
        // ⚡ Use high-frequency market data for active futures market
        tickerData = {
          last: activeMarketData.last || activeMarketData.close,
          change: activeMarketData.change,
          percentage: activeMarketData.percentage,
          quoteVolume: activeMarketData.quoteVolume || activeMarketData.baseVolume,
          fundingRate: futuresData[tickerKey]?.fundingRate || 0, // Get funding rate from futures ticker
        };
      } else {
        // Use regular futures ticker data for non-active markets
        tickerData = futuresData[tickerKey] || {
          last: 0,
          change: 0,
          quoteVolume: 0,
          fundingRate: 0,
        };
      }

      // For futures markets, show the market even if no trading activity (last = 0)
      // This allows users to see and select markets that don't have trades yet
      const hasData = !!tickerData.last || tickerData.symbol === symbol;
      const metadata =
        typeof market.metadata === "string"
          ? JSON.parse(market.metadata)
          : market.metadata || { precision: { price: 2, amount: 2 } };

      // Parse leverage from metadata - handle both string and object formats
      let maxLeverage = 1;
      if (metadata.limits?.leverage) {
        if (typeof metadata.limits.leverage === "string") {
          // Handle string format like "1,20,50,125"
          const leverageOptions = metadata.limits.leverage.split(",").map(Number);
          maxLeverage = Math.max(...leverageOptions);
        } else if (typeof metadata.limits.leverage === "object" && metadata.limits.leverage.max) {
          // Handle object format with max property
          maxLeverage = metadata.limits.leverage.max;
        } else if (typeof metadata.limits.leverage === "number") {
          // Handle direct number
          maxLeverage = metadata.limits.leverage;
        }
      }

      return {
        symbol,
        displaySymbol: `${market.currency}/${market.pair}`,
        currency: market.currency,
        pair: market.pair,
        price: tickerData.last ? formatPrice(tickerData.last, metadata) : "0.00",
        rawPrice: tickerData.last || 0,
        change: tickerData.last ? (tickerData.change || 0).toFixed(2) + "%" : "0.00%",
        rawChange: tickerData.change || 0,
        volume: tickerData.last ? formatVolume(tickerData.quoteVolume || 0) : "0.00",
        rawVolume: tickerData.quoteVolume || 0,
        isPositive: (tickerData.change || 0) >= 0,
        isTrending: market.isTrending || false,
        isHot: market.isHot || false,
        metadata,
        hasData,
        fundingRate: (tickerData.fundingRate || 0).toFixed(4) + "%",
        rawFundingRate: Number(tickerData.fundingRate || 0),
        leverage: maxLeverage,
      };
    });
  }, [futuresMarkets, futuresData, activeMarketData, futuresSelectedMarket, marketType]);

  // Format markets with live data - Advanced: Use market data WS for active market
  const formattedMarkets = useMemo((): Market[] => {
    return markets.map((market) => {
      // Use symbol from market data (already in currency/pair format)
      const symbol = market.symbol;
      const tickerKey = symbol;
      
      // Check if this is the currently active market
      const isActiveMarket = symbol === (marketType === "spot" ? spotSelectedMarket : futuresSelectedMarket) && marketType === "spot";
      
      let tickerData: any;
      let isEco = false;

      if (isActiveMarket && activeMarketData) {
        // ⚡ Use high-frequency market data for active market
        tickerData = {
          last: activeMarketData.last || activeMarketData.close,
          change: activeMarketData.change,
          percentage: activeMarketData.percentage,
          quoteVolume: activeMarketData.quoteVolume || activeMarketData.baseVolume,
          high: activeMarketData.high,
          low: activeMarketData.low,
          bid: activeMarketData.bid,
          ask: activeMarketData.ask,
        };
      } else {
        // Use regular ticker data for non-active markets
        // Eco tickers have higher priority over spot tickers
        tickerData = ecoData[tickerKey] || spotData[tickerKey] || {
          last: 0,
          change: 0,
          quoteVolume: 0,
        };
        // Use the isEco flag from the market data (set by the backend)
        isEco = market.isEco || false;
      }

      const hasData = !!tickerData.last;

      return {
        symbol: symbol,
        displaySymbol: market.displaySymbol,
        currency: market.currency,
        pair: market.pair || "USDT",
        price: hasData ? formatPrice(tickerData.last!, market.metadata) : null,
        rawPrice: tickerData.last || 0,
        change: hasData ? (tickerData.change || 0).toFixed(2) + "%" : null,
        rawChange: tickerData.change || 0,
        volume: hasData ? formatVolume(tickerData.quoteVolume || 0) : null,
        rawVolume: tickerData.quoteVolume || 0,
        isPositive: (tickerData.change || 0) >= 0,
        isTrending: market.isTrending || false,
        isHot: market.isHot || false,
        isEco,
        metadata: market.metadata || { precision: { price: 2, amount: 2 } },
        hasData,
      };
    });
  }, [markets, spotData, ecoData, activeMarketData, spotSelectedMarket, marketType]);

  // Subscribe to market data for active market (exactly like trading header)
  useEffect(() => {
    const currentActiveSymbol = marketType === "spot" ? spotSelectedMarket : futuresSelectedMarket;
    
    if (!currentActiveSymbol) return;

    // Clean up previous subscription
    if (activeMarketUnsubscribeRef.current) {
      activeMarketUnsubscribeRef.current();
      activeMarketUnsubscribeRef.current = null;
    }

    // Determine the correct market type based on the current context
    // Only subscribe to futures data when we're actually on the futures tab AND have a futures market selected
    const subscriptionMarketType = (marketType === "futures" && currentActiveSymbol === futuresSelectedMarket) ? "futures" : "spot";

    // Additional validation: Check if the symbol exists in the appropriate market list
    let isValidSubscription = false;
    if (subscriptionMarketType === "futures") {
      // For futures, check if the symbol exists in futures markets
      isValidSubscription = futuresMarkets.some(m => `${m.currency}/${m.pair}` === currentActiveSymbol);
    } else {
      // For spot, check if the symbol exists in spot markets
      isValidSubscription = markets.some(m => m.symbol === currentActiveSymbol);
    }

    if (!isValidSubscription) {
      console.warn(`[Markets Panel] Skipping subscription for ${currentActiveSymbol} on ${subscriptionMarketType} - symbol not found in ${subscriptionMarketType} markets`);
      return;
    }

    // Subscribe to ticker data for active market
    const unsubscribe = marketDataWs.subscribe<MarketTickerData>(
      {
        symbol: currentActiveSymbol,
        type: "ticker",
        marketType: subscriptionMarketType,
      },
      (tickerData) => {
        setActiveMarketData(tickerData);
      }
    );

    activeMarketUnsubscribeRef.current = unsubscribe;

    return () => {
      if (activeMarketUnsubscribeRef.current) {
        activeMarketUnsubscribeRef.current();
        activeMarketUnsubscribeRef.current = null;
      }
    };
  }, [spotSelectedMarket, futuresSelectedMarket, marketType, markets, futuresMarkets]);

  // Handle market selection
  const handleMarketSelect = useCallback(
    (symbol: Symbol) => {
      // Get current selected market for comparison
      const currentSelectedMarket = marketType === "spot" ? spotSelectedMarket : futuresSelectedMarket;
      
      // Skip if selecting the same market
      if (symbol === currentSelectedMarket) {
        return;
      }

      // Clean up active market data immediately to prevent showing old data
      setActiveMarketData(null);
      
      // Clean up current market subscription
      if (activeMarketUnsubscribeRef.current) {
        activeMarketUnsubscribeRef.current();
        activeMarketUnsubscribeRef.current = null;
      }

      // Update the appropriate selected market based on the current market type
      if (marketType === "spot") {
        setSpotSelectedMarket(symbol);
      } else {
        setFuturesSelectedMarket(symbol);
      }

      if (onMarketSelect) {
        onMarketSelect(symbol, marketType);
      }

      // Find the current market to get currency and pair
      let currency = "";
      let pair = "";

      if (marketType === "spot") {
        const market = markets.find((m) => m.symbol === symbol);
        if (market) {
          currency = market.currency;
          pair = market.pair || "USDT";
        }
      } else {
        const market = futuresMarkets.find((m) => `${m.currency}/${m.pair}` === symbol);
        if (market) {
          currency = market.currency;
          pair = market.pair;
        }
      }

      if (currency && pair) {
        // Update URL with currency-pair format and market type, preserving locale
        const url = `${pathname}?symbol=${currency}-${pair}&type=${marketType}`;
        window.history.pushState({ path: url }, "", url);
      }
    },
    [marketType, onMarketSelect, markets, futuresMarkets, spotSelectedMarket, futuresSelectedMarket]
  );

  // Toggle watchlist
  const toggleWatchlist = useCallback(
    (symbol: string, marketType: "spot" | "futures", e: React.MouseEvent) => {
      e.stopPropagation();
      wishlistService.toggleWishlist(symbol, marketType);
    },
    []
  );

  useEffect(() => {
    setIsLoading(true);
    setIsFuturesLoading(true);

    // Initialize the WebSocket manager
    tickersWs.initialize();

    // Subscribe to market data
    const spotMarketsUnsubscribe = marketService.subscribeToSpotMarkets(
      (markets) => {
        setMarkets(markets);
        setIsLoading(false);
      }
    );

    const futuresMarketsUnsubscribe = marketService.subscribeToFuturesMarkets(
      (markets) => {
        setFuturesMarkets(markets);
        setIsFuturesLoading(false);
      }
    );

    // Try to get cached data immediately
    const cachedSpotMarkets = marketService.getCachedSpotMarkets();
    const cachedFuturesMarkets = marketService.getCachedFuturesMarkets();

    if (cachedSpotMarkets.length > 0) {
      setMarkets(cachedSpotMarkets);
      setIsLoading(false);
    }

    if (cachedFuturesMarkets.length > 0) {
      setFuturesMarkets(cachedFuturesMarkets);
      setIsFuturesLoading(false);
    }

    // If no cached data, fetch from service
    if (cachedSpotMarkets.length === 0) {
      marketService.getSpotMarkets().catch((error) => {
        console.error("Error getting spot markets:", error);
        setIsLoading(false);
      });
    }

    if (cachedFuturesMarkets.length === 0) {
      marketService.getFuturesMarkets().catch((error) => {
        console.error("Error getting futures markets:", error);
        setIsFuturesLoading(false);
      });
    }

        // Subscribe to WebSocket data - use direct updates to avoid unnecessary re-renders
    const spotUnsubscribe = tickersWs.subscribeToSpotData((data) => {
      setSpotData(data);
    });

    // Only subscribe to eco data if ecosystem extension is available
    const ecoUnsubscribe = isExtensionAvailable("ecosystem") 
      ? tickersWs.subscribeToEcoData((data) => {
          setEcoData(data);
        })
      : () => {}; // No-op unsubscribe function

    // Only subscribe to futures data if futures extension is available
    const futuresUnsubscribe = isExtensionAvailable("futures")
      ? tickersWs.subscribeToFuturesData((data) => {
          setFuturesData(data);
        })
      : () => {}; // No-op unsubscribe function
    
    const connectionStatusUnsubscribe =
      tickersWs.subscribeToConnectionStatus(setConnectionStatus);

    // Cleanup function
    return () => {
      spotMarketsUnsubscribe();
      futuresMarketsUnsubscribe();
      spotUnsubscribe();
      ecoUnsubscribe();
      futuresUnsubscribe();
      connectionStatusUnsubscribe();
    };
  }, [isExtensionAvailable]);

  // Handle sort toggle with support for multiple criteria
  const handleSort = (field: SortField) => {
    setSortCriteria((prevCriteria) => {
      // Check if this field is already in the criteria
      const existingIndex = prevCriteria.findIndex((c) => c.field === field);

      if (existingIndex >= 0) {
        // Field exists, toggle direction or remove if it's not the primary sort
        const newCriteria = [...prevCriteria];
        if (existingIndex === 0) {
          // Primary sort, toggle direction
          newCriteria[0] = {
            ...newCriteria[0],
            direction: newCriteria[0].direction === "asc" ? "desc" : "asc",
          };
        } else {
          // Secondary sort, remove it
          newCriteria.splice(existingIndex, 1);
        }
        return newCriteria;
      } else {
        // Field doesn't exist in criteria, add it as primary and keep others as secondary
        return [
          { field, direction: "asc" },
          ...prevCriteria.filter((c) => c.field !== field),
        ];
      }
    });
  };

  // Apply multiple sorting criteria to markets
  const sortMarkets = useCallback(
    (markets: Market[]) => {
      return [...markets].sort((a, b) => {
        // Apply each sort criterion in order until we find a difference
        for (const { field, direction } of sortCriteria) {
          const multiplier = direction === "asc" ? 1 : -1;
          let comparison = 0;

          switch (field) {
            case "name":
              comparison = a.displaySymbol.localeCompare(b.displaySymbol);
              break;
            case "price":
              comparison = (a.rawPrice || 0) - (b.rawPrice || 0);
              break;
            case "change":
              comparison = (a.rawChange || 0) - (b.rawChange || 0);
              break;
            case "volume":
              comparison = (a.rawVolume || 0) - (b.rawVolume || 0);
              break;
            case "funding":
              comparison = (a.rawFundingRate || 0) - (b.rawFundingRate || 0);
              break;
          }

          if (comparison !== 0) {
            return multiplier * comparison;
          }
        }

        // If all criteria are equal, default to name
        return a.displaySymbol.localeCompare(b.displaySymbol);
      });
    },
    [sortCriteria]
  );

  // Filter markets based on search query and market type
  const getFilteredMarkets = useCallback(() => {
    const marketsToFilter =
      marketType === "spot" ? formattedMarkets : formattedFuturesMarkets;

    const filtered = marketsToFilter.filter(
      (market) =>
        market.displaySymbol
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        market.currency.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return sortMarkets(filtered);
  }, [
    marketType,
    formattedMarkets,
    formattedFuturesMarkets,
    searchQuery,
    sortMarkets,
  ]);

  const filteredMarkets = getFilteredMarkets();

  // Update the watchlist markets to include both spot and futures markets
  const watchlistMarkets = useMemo(() => {
    return sortMarkets([
      ...formattedMarkets
        .filter((market) => wishlistService.isInWishlist(market.symbol, "spot"))
        .map((market) => ({ ...market, type: "spot" as const })),
      ...formattedFuturesMarkets
        .filter((market) =>
          wishlistService.isInWishlist(market.symbol, "futures")
        )
        .map((market) => ({ ...market, type: "futures" as const })),
    ]);
  }, [formattedMarkets, formattedFuturesMarkets, sortMarkets]);

  // Update the handleTabChange function to also update market type
  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Clean up active market data when switching tabs to prevent stale data
    setActiveMarketData(null);
    
    // Clean up active market subscription when switching tabs
    if (activeMarketUnsubscribeRef.current) {
      activeMarketUnsubscribeRef.current();
      activeMarketUnsubscribeRef.current = null;
    }

    // Update market type based on tab selection
    if (value === "markets") {
      setMarketType("spot");
    } else if (value === "futures") {
      setMarketType("futures");
    }

    // Don't update URL here - only update URL when a market is explicitly selected
  };

  // Get the currently selected market based on the active tab
  const getSelectedMarket = () => {
    return marketType === "spot" ? spotSelectedMarket : futuresSelectedMarket;
  };

  return (
    <div className="h-full flex flex-col bg-background dark:bg-zinc-950 overflow-hidden">
      <Tabs
        value={activeTab}
        className="w-full flex flex-col h-full overflow-hidden"
        onValueChange={handleTabChange}
      >
        <TabsList className="w-full grid grid-cols-3">
          <TabTrigger value="watchlist" icon={<Star className="h-3 w-3" />}>
            {t("Watchlist")}
          </TabTrigger>
          <TabTrigger value="markets" icon={<BarChart2 className="h-3 w-3" />}>
            {t("Spot")}
          </TabTrigger>
          <TabTrigger value="futures" icon={<Zap className="h-3 w-3" />}>
            {t("Futures")}
          </TabTrigger>
        </TabsList>

        <TabContent
          value="markets"
          className="flex flex-col flex-1 overflow-hidden"
        >
          <SearchBar
            placeholder="Search markets..."
            value={searchQuery}
            onChange={setSearchQuery}
          />

          <ColumnHeaders
            leftColumn={{ label: "Symbol", sortField: "name" }}
            rightColumn={{ label: "24h Change", sortField: "change" }}
            sortCriteria={sortCriteria}
            onSort={handleSort}
          />

          <div className="overflow-y-auto flex-1 min-h-0 scrollbar-none">
            <MarketList
              markets={filteredMarkets}
              isLoading={isLoading}
              selectedMarket={spotSelectedMarket}
              onMarketSelect={handleMarketSelect}
              onToggleWatchlist={toggleWatchlist}
              marketType="spot"
              onSortVolume={() => handleSort("volume")}
              onSortPrice={() => handleSort("price")}
            />
          </div>
        </TabContent>

        <TabContent
          value="futures"
          className="flex flex-col flex-1 overflow-hidden"
        >
          <SearchBar
            placeholder="Search futures..."
            value={searchQuery}
            onChange={setSearchQuery}
          />

          <ColumnHeaders
            leftColumn={{ label: "Symbol", sortField: "name" }}
            rightColumn={{ label: "Funding Rate", sortField: "funding" }}
            sortCriteria={sortCriteria}
            onSort={handleSort}
          />

          <div className="overflow-y-auto flex-1 min-h-0 scrollbar-none">
            <MarketList
              markets={filteredMarkets}
              isLoading={isFuturesLoading}
              selectedMarket={futuresSelectedMarket}
              onMarketSelect={handleMarketSelect}
              onToggleWatchlist={toggleWatchlist}
              marketType="futures"
              onSortVolume={() => handleSort("volume")}
              onSortPrice={() => handleSort("price")}
            />
          </div>
        </TabContent>

        <TabContent
          value="watchlist"
          className="flex flex-col flex-1 overflow-hidden"
        >
          {watchlistMarkets.length === 0 ? (
            <WatchlistEmptyState />
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <WatchlistHeader
                marketCount={watchlistMarkets.length}
                sortCriteria={sortCriteria}
                onSort={handleSort}
              />

              <div className="overflow-y-auto flex-1 min-h-0 scrollbar-none">
                <MarketList
                  markets={watchlistMarkets}
                  isLoading={false}
                  selectedMarket={getSelectedMarket()}
                  onMarketSelect={(symbol) => {
                    const market = watchlistMarkets.find(
                      (m) => m.symbol === symbol
                    );
                    if (market && market.type) {
                      setMarketType(market.type);
                      handleMarketSelect(symbol);
                    }
                  }}
                  onToggleWatchlist={toggleWatchlist}
                  marketType={marketType}
                />
              </div>
            </div>
          )}
        </TabContent>
      </Tabs>
    </div>
  );
}
