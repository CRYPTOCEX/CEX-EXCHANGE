"use client";

import React, { memo, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { cn } from "../../utils/cn";
import type { MarketType } from "../../types/common";
import { marketService } from "@/services/market-service";
import { tickersWs } from "@/services/tickers-ws";
import { wishlistService } from "@/services/wishlist-service";
import { useExtensionChecker } from "@/lib/extensions";
import { Star } from "lucide-react";

interface Market {
  symbol: string;
  currency: string;
  pair: string;
  price: number;
  change24h: number;
  volume24h?: number;
  isEco?: boolean;
  marketType: MarketType;
  metadata?: any;
}

interface MobileMarketSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (symbol: string, marketType: MarketType) => void;
  currentSymbol: string;
  currentMarketType: MarketType;
}

type TabType = "watchlist" | "spot" | "futures";

// Popular trading pairs to show at top
const POPULAR_PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT", "DOGE/USDT", "BNB/USDT"];

export const MobileMarketSelector = memo(function MobileMarketSelector({
  isOpen,
  onClose,
  onSelect,
  currentSymbol,
  currentMarketType,
}: MobileMarketSelectorProps) {
  const { isExtensionAvailable, extensions } = useExtensionChecker();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>(
    currentMarketType === "futures" ? "futures" : "spot"
  );
  const [spotMarkets, setSpotMarkets] = useState<any[]>([]);
  const [futuresMarkets, setFuturesMarkets] = useState<any[]>([]);
  const [spotData, setSpotData] = useState<Record<string, any>>({});
  const [ecoData, setEcoData] = useState<Record<string, any>>({});
  const [futuresData, setFuturesData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to wishlist
  useEffect(() => {
    const unsubscribe = wishlistService.subscribe((items) => {
      setFavorites(items.map((item) => item.symbol));
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to market data when opened
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    tickersWs.initialize();

    // Subscribe to market lists
    const spotMarketsUnsubscribe = marketService.subscribeToSpotMarkets((markets) => {
      setSpotMarkets(markets);
      setIsLoading(false);
    });

    const futuresMarketsUnsubscribe = marketService.subscribeToFuturesMarkets((markets) => {
      setFuturesMarkets(markets);
    });

    // Get cached data immediately if already fetched
    const cachedSpot = marketService.getCachedSpotMarkets();
    const cachedFutures = marketService.getCachedFuturesMarkets();
    const spotDataFetched = marketService.isSpotDataFetched();
    const futuresDataFetched = marketService.isFuturesDataFetched();

    if (spotDataFetched) {
      setSpotMarkets(cachedSpot);
      setIsLoading(false);
    }
    if (futuresDataFetched) {
      setFuturesMarkets(cachedFutures);
    }

    // Fetch only if not already fetched
    if (!spotDataFetched) {
      marketService.getSpotMarkets().catch(() => setIsLoading(false));
    }
    if (!futuresDataFetched) {
      marketService.getFuturesMarkets();
    }

    // Subscribe to ticker data
    const spotUnsubscribe = tickersWs.subscribeToSpotData(setSpotData);

    // Only subscribe to eco data if ecosystem extension is available
    const ecoUnsubscribe = isExtensionAvailable("ecosystem")
      ? tickersWs.subscribeToEcoData(setEcoData)
      : () => {}; // No-op unsubscribe function

    // Only subscribe to futures data if futures extension is available
    const futuresUnsubscribe = isExtensionAvailable("futures")
      ? tickersWs.subscribeToFuturesData(setFuturesData)
      : () => {}; // No-op unsubscribe function

    return () => {
      spotMarketsUnsubscribe();
      futuresMarketsUnsubscribe();
      spotUnsubscribe();
      ecoUnsubscribe();
      futuresUnsubscribe();
    };
  }, [isOpen, isExtensionAvailable, extensions]);

  // Format price helper - use metadata precision if available
  const formatPrice = (price: number, metadata?: any) => {
    const precision = metadata?.precision?.price;
    if (precision !== undefined) {
      return price.toFixed(precision);
    }
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
  };

  // Format volume helper
  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
    return vol.toFixed(0);
  };

  // Format spot markets (includes eco)
  const formattedSpotMarkets = useMemo((): Market[] => {
    return spotMarkets.map((market) => {
      const ticker = market.isEco
        ? (ecoData[market.symbol] || spotData[market.symbol] || { last: 0, change: 0, baseVolume: 0 })
        : (spotData[market.symbol] || { last: 0, change: 0, baseVolume: 0 });
      return {
        symbol: market.symbol,
        currency: market.currency,
        pair: market.pair || "USDT",
        price: ticker.last || 0,
        change24h: ticker.change || 0,
        volume24h: ticker.baseVolume || 0,
        isEco: market.isEco,
        marketType: market.isEco ? "eco" as MarketType : "spot" as MarketType,
        metadata: market.metadata,
      };
    });
  }, [spotMarkets, spotData, ecoData]);

  // Format futures markets
  const formattedFuturesMarkets = useMemo((): Market[] => {
    return futuresMarkets.map((market) => {
      const symbol = `${market.currency}/${market.pair}`;
      const ticker = futuresData[symbol] || { last: 0, change: 0, baseVolume: 0 };
      const metadata = typeof market.metadata === "string" ? JSON.parse(market.metadata) : market.metadata || {};
      return {
        symbol,
        currency: market.currency,
        pair: market.pair,
        price: ticker.last || 0,
        change24h: ticker.change || 0,
        volume24h: ticker.baseVolume || 0,
        marketType: "futures" as MarketType,
        metadata,
      };
    });
  }, [futuresMarkets, futuresData]);

  // Filter and combine markets based on active tab
  const formattedMarkets = useMemo((): Market[] => {
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

    // Sort: popular pairs first, then by volume
    markets.sort((a, b) => {
      const aPopular = POPULAR_PAIRS.indexOf(a.symbol);
      const bPopular = POPULAR_PAIRS.indexOf(b.symbol);

      // Both are popular - sort by their order in POPULAR_PAIRS
      if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular;
      // Only a is popular
      if (aPopular !== -1) return -1;
      // Only b is popular
      if (bPopular !== -1) return 1;
      // Neither popular - sort by volume
      return (b.volume24h || 0) - (a.volume24h || 0);
    });

    return markets;
  }, [activeTab, formattedSpotMarkets, formattedFuturesMarkets, search]);

  const handleSelect = useCallback(
    (market: Market) => {
      onSelect(market.symbol, market.marketType);
      onClose();
    },
    [onSelect, onClose]
  );

  // Toggle favorite
  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent, market: Market) => {
      e.stopPropagation();
      const isFutures = market.marketType === "futures";
      wishlistService.toggleWishlist(market.symbol, isFutures ? "futures" : "spot");
    },
    []
  );

  const clearSearch = useCallback(() => {
    setSearch("");
    searchInputRef.current?.focus();
  }, []);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string }[] = [
    { id: "watchlist", label: "★" },
    { id: "spot", label: "Spot" },
    { id: "futures", label: "Futures" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[var(--tp-bg-primary)] flex flex-col safe-area-inset">
      {/* Header with close button */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[var(--tp-bg-secondary)] border-b border-[var(--tp-border)]">
        <button
          onClick={onClose}
          className="p-1.5 -ml-1.5 rounded-full text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-tertiary)] transition-colors"
          aria-label="Close"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-[var(--tp-text-primary)]">Markets</h2>
      </div>

      {/* Search bar */}
      <div className="shrink-0 px-4 py-3 bg-[var(--tp-bg-secondary)]">
        <div className="relative">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tp-text-muted)]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or symbol..."
            className={cn(
              "w-full pl-10 pr-10 py-2.5",
              "bg-[var(--tp-bg-tertiary)]",
              "border border-[var(--tp-border)]",
              "rounded-xl",
              "text-[var(--tp-text-primary)]",
              "placeholder-[var(--tp-text-muted)]",
              "text-sm",
              "outline-none focus:border-[var(--tp-blue)] focus:ring-1 focus:ring-[var(--tp-blue)]/30"
            )}
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--tp-text-muted)] hover:text-[var(--tp-text-primary)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Market Type Tabs */}
      <div className="shrink-0 flex gap-2 px-4 py-2 bg-[var(--tp-bg-secondary)] border-b border-[var(--tp-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              tab.id === "watchlist" ? "px-4 py-2" : "flex-1 py-2 px-4",
              "text-sm font-semibold",
              "rounded-xl",
              "transition-all duration-200",
              activeTab === tab.id
                ? "bg-[var(--tp-blue)] text-white shadow-lg shadow-[var(--tp-blue)]/20"
                : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-tertiary)]/80"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Header */}
      <div className="shrink-0 flex items-center px-4 py-2 bg-[var(--tp-bg-primary)] border-b border-[var(--tp-border)] text-xs text-[var(--tp-text-muted)]">
        <div className="w-8"></div>
        <div className="flex-1">Pair</div>
        <div className="w-24 text-right">Price</div>
        <div className="w-20 text-right">24h %</div>
      </div>

      {/* Market List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-3 border-[var(--tp-blue)] border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-[var(--tp-text-muted)]">Loading markets...</p>
          </div>
        ) : formattedMarkets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--tp-text-muted)]">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <p className="text-base font-medium">
              {activeTab === "watchlist" ? "No favorites yet" : "No markets found"}
            </p>
            <p className="text-sm mt-1">
              {activeTab === "watchlist" ? "Tap the star to add favorites" : "Try a different search term"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--tp-border)]">
            {formattedMarkets.map((market) => {
              const isSelected = market.symbol === currentSymbol && market.marketType === currentMarketType;
              const isPositive = market.change24h >= 0;
              const isPopular = POPULAR_PAIRS.includes(market.symbol);
              const isFavorite = favorites.includes(market.symbol);

              return (
                <button
                  key={`${market.marketType}-${market.symbol}`}
                  onClick={() => handleSelect(market)}
                  className={cn(
                    "w-full flex items-center px-4 py-3",
                    "transition-colors active:bg-[var(--tp-bg-tertiary)]",
                    isSelected && "bg-[var(--tp-blue)]/8"
                  )}
                >
                  {/* Favorite star */}
                  <div className="w-8 flex-shrink-0">
                    <button
                      onClick={(e) => handleToggleFavorite(e, market)}
                      className={cn(
                        "p-1 -m-1 rounded-full transition-colors",
                        isFavorite
                          ? "text-[var(--tp-yellow)]"
                          : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
                      )}
                    >
                      <Star
                        size={16}
                        fill={isFavorite ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  {/* Symbol & Currency */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-semibold text-base",
                        isSelected ? "text-[var(--tp-blue)]" : "text-[var(--tp-text-primary)]"
                      )}>
                        {market.currency}
                      </span>
                      <span className="text-xs text-[var(--tp-text-muted)]">
                        /{market.pair}
                      </span>
                      {isPopular && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--tp-yellow)]/15 text-[var(--tp-yellow)] rounded">
                          HOT
                        </span>
                      )}
                      {market.isEco && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--tp-purple)]/15 text-[var(--tp-purple)] rounded">
                          ECO
                        </span>
                      )}
                    </div>
                    {market.volume24h ? (
                      <div className="text-xs text-[var(--tp-text-muted)] mt-0.5">
                        Vol: {formatVolume(market.volume24h)}
                      </div>
                    ) : null}
                  </div>

                  {/* Price */}
                  <div className="w-24 text-right">
                    <span className="font-mono text-sm text-[var(--tp-text-primary)]">
                      {market.price > 0 ? formatPrice(market.price, market.metadata) : "---"}
                    </span>
                  </div>

                  {/* Change */}
                  <div className="w-20 text-right">
                    <span
                      className={cn(
                        "inline-block px-2 py-1 rounded text-xs font-semibold font-mono",
                        isPositive
                          ? "bg-[var(--tp-green)]/12 text-[var(--tp-green)]"
                          : "bg-[var(--tp-red)]/12 text-[var(--tp-red)]"
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {market.change24h.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default MobileMarketSelector;
