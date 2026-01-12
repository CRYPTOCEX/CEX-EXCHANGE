"use client";

import React, { memo, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { cn } from "../../utils/cn";
import { MarketSearch } from "./MarketSearch";
import { MarketList } from "./MarketList";
import type { MarketType } from "../../types/common";
import { marketService } from "@/services/market-service";
import { tickersWs } from "@/services/tickers-ws";
import { marketDataWs, type TickerData as MarketTickerData } from "@/services/market-data-ws";
import { wishlistService } from "@/services/wishlist-service";
import { useExtensionChecker } from "@/lib/extensions";


interface Market {
  symbol: string;
  displaySymbol?: string;
  currency: string;
  pair: string;
  price: number;
  change24h: number;
  volume24h: number;
  sparklineData?: number[];
  category?: string;
  isNew?: boolean;
  marketType: MarketType;
  isEco?: boolean;
  metadata?: any;
}

interface MarketsPanelProps {
  currentSymbol: string;
  marketType: MarketType;
  onSelectSymbol: (symbol: string, marketType?: MarketType) => void;
  className?: string;
}

type MarketTab = "watchlist" | "spot" | "futures";

// Note: Price formatting is now handled in MarketRow using metadata precision
// Just pass through raw price value

// Format volume
function formatVolume(volume: number): number {
  return volume;
}

export const MarketsPanel = memo(function MarketsPanel({
  currentSymbol,
  marketType: currentMarketType,
  onSelectSymbol,
  className,
}: MarketsPanelProps) {
  const { isExtensionAvailable, extensions } = useExtensionChecker();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<MarketTab>(
    currentMarketType === "futures" ? "futures" : "spot"
  );
  const [favorites, setFavorites] = useState<string[]>([]);

  // Raw market data from service
  const [spotMarkets, setSpotMarkets] = useState<any[]>([]);
  const [futuresMarkets, setFuturesMarkets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFuturesLoading, setIsFuturesLoading] = useState(true);

  // Ticker data
  const [spotData, setSpotData] = useState<Record<string, any>>({});
  const [ecoData, setEcoData] = useState<Record<string, any>>({});
  const [futuresData, setFuturesData] = useState<Record<string, any>>({});

  // Active market subscription
  const [activeMarketData, setActiveMarketData] = useState<MarketTickerData | null>(null);
  const activeMarketUnsubscribeRef = useRef<(() => void) | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<"symbol" | "price" | "change" | "volume">("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Subscribe to wishlist changes
  useEffect(() => {
    const unsubscribe = wishlistService.subscribe((items) => {
      setFavorites(items.map((item) => item.symbol));
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to market data
  useEffect(() => {
    setIsLoading(true);
    setIsFuturesLoading(true);

    // Initialize WebSocket
    tickersWs.initialize();

    // Subscribe to market lists
    const spotMarketsUnsubscribe = marketService.subscribeToSpotMarkets((markets) => {
      setSpotMarkets(markets);
      setIsLoading(false);
    });

    const futuresMarketsUnsubscribe = marketService.subscribeToFuturesMarkets((markets) => {
      setFuturesMarkets(markets);
      setIsFuturesLoading(false);
    });

    // Get cached data immediately if already fetched
    const cachedSpotMarkets = marketService.getCachedSpotMarkets();
    const cachedFuturesMarkets = marketService.getCachedFuturesMarkets();
    const spotDataFetched = marketService.isSpotDataFetched();
    const futuresDataFetched = marketService.isFuturesDataFetched();

    if (spotDataFetched) {
      setSpotMarkets(cachedSpotMarkets);
      setIsLoading(false);
    }

    if (futuresDataFetched) {
      setFuturesMarkets(cachedFuturesMarkets);
      setIsFuturesLoading(false);
    }

    // Fetch only if not already fetched
    if (!spotDataFetched) {
      marketService.getSpotMarkets().catch(() => setIsLoading(false));
    }

    if (!futuresDataFetched) {
      marketService.getFuturesMarkets().catch(() => setIsFuturesLoading(false));
    }

    // Subscribe to ticker data
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

    return () => {
      spotMarketsUnsubscribe();
      futuresMarketsUnsubscribe();
      spotUnsubscribe();
      ecoUnsubscribe();
      futuresUnsubscribe();
    };
  }, [isExtensionAvailable, extensions]);

  // Subscribe to active market data for higher frequency updates
  useEffect(() => {
    if (!currentSymbol) return;

    // Clean up previous subscription
    if (activeMarketUnsubscribeRef.current) {
      activeMarketUnsubscribeRef.current();
      activeMarketUnsubscribeRef.current = null;
    }

    // Subscribe to ticker for active market
    const unsubscribe = marketDataWs.subscribe<MarketTickerData>(
      {
        symbol: currentSymbol,
        type: "ticker",
        marketType: currentMarketType === "eco" ? "eco" : currentMarketType === "futures" ? "futures" : "spot",
      },
      (data) => {
        setActiveMarketData(data);
      }
    );

    activeMarketUnsubscribeRef.current = unsubscribe;

    return () => {
      if (activeMarketUnsubscribeRef.current) {
        activeMarketUnsubscribeRef.current();
        activeMarketUnsubscribeRef.current = null;
      }
    };
  }, [currentSymbol, currentMarketType]);

  // Format spot markets with ticker data
  const formattedSpotMarkets = useMemo((): Market[] => {
    return spotMarkets.map((market) => {
      const symbol = market.symbol;
      const isActiveMarket = symbol === currentSymbol && (currentMarketType === "spot" || currentMarketType === "eco");

      let tickerData: any;
      if (isActiveMarket && activeMarketData) {
        // activeMarketData from marketDataWs has 'percentage' for % change, 'change' for raw price change
        tickerData = {
          last: activeMarketData.last || activeMarketData.close,
          change: activeMarketData.percentage ?? activeMarketData.change ?? 0, // Prefer percentage
          quoteVolume: activeMarketData.quoteVolume || activeMarketData.baseVolume,
        };
      } else {
        // tickersWs returns 'change' as the percentage value
        tickerData = ecoData[symbol] || spotData[symbol] || { last: 0, change: 0, quoteVolume: 0 };
      }

      return {
        symbol,
        displaySymbol: symbol,
        currency: market.currency,
        pair: market.pair || "USDT",
        price: tickerData.last || 0,
        change24h: tickerData.change || 0,
        volume24h: formatVolume(tickerData.quoteVolume || 0),
        marketType: market.isEco ? "eco" : "spot",
        isEco: market.isEco,
        metadata: market.metadata,
      };
    });
  }, [spotMarkets, spotData, ecoData, activeMarketData, currentSymbol, currentMarketType]);

  // Format futures markets with ticker data
  const formattedFuturesMarkets = useMemo((): Market[] => {
    return futuresMarkets.map((market) => {
      const symbol = `${market.currency}/${market.pair}`;
      const isActiveMarket = symbol === currentSymbol && currentMarketType === "futures";

      let tickerData: any;
      if (isActiveMarket && activeMarketData) {
        // activeMarketData from marketDataWs has 'percentage' for % change, 'change' for raw price change
        tickerData = {
          last: activeMarketData.last || activeMarketData.close,
          change: activeMarketData.percentage ?? activeMarketData.change ?? 0, // Prefer percentage
          quoteVolume: activeMarketData.quoteVolume || activeMarketData.baseVolume,
        };
      } else {
        // tickersWs returns 'change' as the percentage value
        tickerData = futuresData[symbol] || { last: 0, change: 0, quoteVolume: 0 };
      }

      const metadata = typeof market.metadata === "string" ? JSON.parse(market.metadata) : market.metadata || {};

      return {
        symbol,
        displaySymbol: symbol,
        currency: market.currency,
        pair: market.pair,
        price: tickerData.last || 0,
        change24h: tickerData.change || 0,
        volume24h: formatVolume(tickerData.quoteVolume || 0),
        marketType: "futures",
        metadata,
      };
    });
  }, [futuresMarkets, futuresData, activeMarketData, currentSymbol, currentMarketType]);

  // Filter and sort markets based on active tab
  const filteredMarkets = useMemo(() => {
    let markets: Market[] = [];

    if (activeTab === "watchlist") {
      // Combine spot and futures watchlist
      markets = [
        ...formattedSpotMarkets.filter((m) => wishlistService.isInWishlist(m.symbol, "spot")),
        ...formattedFuturesMarkets.filter((m) => wishlistService.isInWishlist(m.symbol, "futures")),
      ];
    } else if (activeTab === "spot") {
      // Show all spot markets (including eco markets)
      markets = formattedSpotMarkets;
    } else if (activeTab === "futures") {
      markets = formattedFuturesMarkets;
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      markets = markets.filter(
        (m) =>
          m.symbol.toLowerCase().includes(searchLower) ||
          m.currency?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    markets.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "symbol":
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case "price":
          comparison = a.price - b.price;
          break;
        case "change":
          comparison = a.change24h - b.change24h;
          break;
        case "volume":
          comparison = a.volume24h - b.volume24h;
          break;
      }
      return sortDir === "asc" ? comparison : -comparison;
    });

    return markets;
  }, [activeTab, formattedSpotMarkets, formattedFuturesMarkets, search, sortBy, sortDir]);

  // Handle market selection
  const handleSelectMarket = useCallback(
    (symbol: string) => {
      let marketType: MarketType = "spot";

      // Determine market type
      if (activeTab === "futures") {
        marketType = "futures";
      } else if (activeTab === "watchlist") {
        // Check which list the symbol belongs to
        const isFutures = formattedFuturesMarkets.some((m) => m.symbol === symbol);
        const isEco = formattedSpotMarkets.find((m) => m.symbol === symbol)?.isEco;
        marketType = isFutures ? "futures" : isEco ? "eco" : "spot";
      } else {
        const market = formattedSpotMarkets.find((m) => m.symbol === symbol);
        if (market?.isEco) marketType = "eco";
      }

      onSelectSymbol(symbol, marketType);
    },
    [activeTab, formattedSpotMarkets, formattedFuturesMarkets, onSelectSymbol]
  );

  // Toggle favorite
  const handleToggleFavorite = useCallback(
    (symbol: string) => {
      const isFutures = activeTab === "futures" || formattedFuturesMarkets.some((m) => m.symbol === symbol);
      wishlistService.toggleWishlist(symbol, isFutures ? "futures" : "spot");
    },
    [activeTab, formattedFuturesMarkets]
  );

  // Handle sort
  const handleSort = useCallback(
    (by: "symbol" | "price" | "change" | "volume") => {
      if (sortBy === by) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(by);
        setSortDir("desc");
      }
    },
    [sortBy]
  );

  // Handle tab change
  const handleTabChange = useCallback((tab: MarketTab) => {
    setActiveTab(tab);
  }, []);

  const tabs: { id: MarketTab; label: string }[] = [
    { id: "watchlist", label: "★" },
    { id: "spot", label: "Spot" },
    { id: "futures", label: "Futures" },
  ];

  return (
    <div className={cn("tp-markets-panel flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Market Type Tabs - Compact without icons */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-[var(--tp-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "px-2 py-1",
              "text-[11px] font-medium",
              "rounded",
              "transition-colors",
              activeTab === tab.id
                ? "bg-[var(--tp-blue)]/20 text-[var(--tp-blue)]"
                : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-tertiary)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[var(--tp-border)]">
        <MarketSearch value={search} onChange={setSearch} />
      </div>

      {/* Market List */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MarketList
          markets={filteredMarkets}
          favorites={favorites}
          selectedSymbol={currentSymbol}
          onSelect={handleSelectMarket}
          onToggleFavorite={handleToggleFavorite}
          isLoading={activeTab === "futures" ? isFuturesLoading : isLoading}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>
    </div>
  );
});

export default MarketsPanel;
