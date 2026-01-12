"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";
import { Search, Star, Clock, X } from "lucide-react";
import type { MarketType } from "../../types/common";
import type { MarketItem } from "../../types/market";
import { marketService } from "@/services/market-service";
import { tickersWs } from "@/services/tickers-ws";
import { wishlistService } from "@/services/wishlist-service";
import { useExtensionChecker } from "@/lib/extensions";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (symbol: string, marketType?: MarketType) => void;
  currentSymbol: string;
  currentMarketType: MarketType;
}

export const CommandPalette = memo(function CommandPalette({
  isOpen,
  onClose,
  onSelect,
  currentSymbol,
  currentMarketType,
}: CommandPaletteProps) {
  const { isExtensionAvailable, extensions } = useExtensionChecker();
  const [search, setSearch] = useState("");
  const [markets, setMarkets] = useState<MarketItem[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<MarketItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [spotData, setSpotData] = useState<Record<string, any>>({});
  const [ecoData, setEcoData] = useState<Record<string, any>>({});
  const [futuresData, setFuturesData] = useState<Record<string, any>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load markets from real API and subscribe to tickers
  useEffect(() => {
    if (!isOpen) return;

    // Initialize WebSocket
    tickersWs.initialize();

    const fetchMarkets = async () => {
      try {
        // Fetch spot and futures markets in parallel
        const [spotMarkets, futuresMarkets] = await Promise.all([
          marketService.getSpotMarkets().catch(() => []),
          marketService.getFuturesMarkets().catch(() => []),
        ]);

        // Convert to MarketItem format
        const allMarkets: MarketItem[] = [];

        // Process spot markets (includes eco markets)
        spotMarkets.forEach((m: any) => {
          allMarkets.push({
            symbol: m.symbol,
            currency: m.currency || m.symbol.split("/")[0],
            pair: m.pair || m.symbol.split("/")[1],
            marketType: m.isEco ? "eco" : "spot",
            price: 0, // Will be populated from tickers
            change: 0,
          });
        });

        // Process futures markets
        futuresMarkets.forEach((m: any) => {
          const symbol = `${m.currency}/${m.pair}`;
          allMarkets.push({
            symbol,
            currency: m.currency || symbol.split("/")[0],
            pair: m.pair || "USDT",
            marketType: "futures",
            price: 0, // Will be populated from tickers
            change: 0,
          });
        });

        setMarkets(allMarkets);
      } catch (err) {
        console.error("Failed to fetch markets:", err);
      }
    };

    fetchMarkets();

    // Subscribe to ticker data for live prices
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
      spotUnsubscribe();
      ecoUnsubscribe();
      futuresUnsubscribe();
    };
  }, [isOpen, isExtensionAvailable, extensions]);

  // Load recent from localStorage and subscribe to wishlist
  useEffect(() => {
    const recent = JSON.parse(
      localStorage.getItem("tp-recent-symbols") || "[]"
    );
    setRecentSymbols(recent);

    // Subscribe to wishlist service for synchronized favorites
    const unsubscribe = wishlistService.subscribe((items) => {
      setFavorites(items.map((item) => item.symbol));
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Helper to get ticker data for a market
  const getTickerData = useCallback(
    (market: MarketItem) => {
      const symbol = market.symbol;
      let tickerData: any = { last: 0, change: 0 };

      if (market.marketType === "futures") {
        tickerData = futuresData[symbol] || { last: 0, change: 0 };
      } else if (market.marketType === "eco") {
        tickerData = ecoData[symbol] || spotData[symbol] || { last: 0, change: 0 };
      } else {
        tickerData = spotData[symbol] || { last: 0, change: 0 };
      }

      return {
        price: tickerData.last || 0,
        change: tickerData.change || 0,
      };
    },
    [spotData, ecoData, futuresData]
  );

  // Filter markets based on search and merge with ticker data
  useEffect(() => {
    // Merge ticker data with markets
    const marketsWithPrices = markets.map((m) => {
      const ticker = getTickerData(m);
      return {
        ...m,
        price: ticker.price,
        change: ticker.change,
      };
    });

    if (!search.trim()) {
      // Show favorites and recent first
      const favMarkets = marketsWithPrices.filter((m) => favorites.includes(m.symbol));
      const recentMarkets = marketsWithPrices.filter(
        (m) => recentSymbols.includes(m.symbol) && !favorites.includes(m.symbol)
      );
      const otherMarkets = marketsWithPrices.filter(
        (m) =>
          !favorites.includes(m.symbol) && !recentSymbols.includes(m.symbol)
      );

      setFilteredMarkets(
        [...favMarkets, ...recentMarkets, ...otherMarkets].slice(0, 50)
      );
    } else {
      const searchLower = search.toLowerCase();
      const filtered = marketsWithPrices
        .filter(
          (m) =>
            m.symbol.toLowerCase().includes(searchLower) ||
            m.currency.toLowerCase().includes(searchLower)
        )
        .sort((a, b) => {
          // Prioritize exact matches
          const aExact = a.symbol.toLowerCase() === searchLower;
          const bExact = b.symbol.toLowerCase() === searchLower;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;

          // Then favorites
          const aFav = favorites.includes(a.symbol);
          const bFav = favorites.includes(b.symbol);
          if (aFav && !bFav) return -1;
          if (!aFav && bFav) return 1;

          return 0;
        })
        .slice(0, 50);

      setFilteredMarkets(filtered);
    }
    setSelectedIndex(0);
  }, [search, markets, favorites, recentSymbols, spotData, ecoData, futuresData, getTickerData]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearch("");
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredMarkets.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredMarkets[selectedIndex]) {
            handleSelect(filteredMarkets[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredMarkets, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (market: MarketItem) => {
      // Save to recent
      const recent = [
        market.symbol,
        ...recentSymbols.filter((s) => s !== market.symbol),
      ].slice(0, 10);
      localStorage.setItem("tp-recent-symbols", JSON.stringify(recent));

      onSelect(market.symbol, market.marketType);
    },
    [recentSymbols, onSelect]
  );

  const toggleFavorite = useCallback(
    (market: MarketItem, e: React.MouseEvent) => {
      e.stopPropagation();
      // Use wishlistService for synchronized favorites across all components
      wishlistService.toggleWishlist(
        market.symbol,
        market.marketType === "futures" ? "futures" : "spot"
      );
    },
    []
  );

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className={cn(
          "relative",
          "w-full max-w-xl mx-4",
          "bg-[var(--tp-bg-secondary)]",
          "border border-[var(--tp-border)]",
          "rounded-xl",
          "shadow-2xl",
          "overflow-hidden",
          "tp-animate-slide-in-top"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center px-4 border-b border-[var(--tp-border)]">
          <Search size={18} className="text-[var(--tp-text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search markets... (e.g., BTC, ETH)"
            className={cn(
              "flex-1",
              "px-3 py-4",
              "bg-transparent",
              "text-[var(--tp-text-primary)]",
              "placeholder:text-[var(--tp-text-muted)]",
              "outline-none",
              "text-base"
            )}
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto">
          {filteredMarkets.length === 0 ? (
            <div className="px-4 py-8 text-center text-[var(--tp-text-muted)]">
              No markets found
            </div>
          ) : (
            filteredMarkets.map((market, index) => {
              const isFavorite = favorites.includes(market.symbol);
              const isRecent = recentSymbols.includes(market.symbol);
              const isSelected = index === selectedIndex;
              const isCurrent =
                market.symbol === currentSymbol &&
                market.marketType === currentMarketType;

              return (
                <div
                  key={`${market.symbol}-${market.marketType}`}
                  onClick={() => handleSelect(market)}
                  className={cn(
                    "flex items-center justify-between",
                    "px-4 py-3",
                    "cursor-pointer",
                    "transition-colors",
                    isSelected && "bg-[var(--tp-bg-tertiary)]",
                    !isSelected && "hover:bg-[var(--tp-bg-tertiary)]/50",
                    isCurrent && "border-l-2 border-[var(--tp-blue)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Favorite button */}
                    <button
                      onClick={(e) => toggleFavorite(market, e)}
                      className={cn(
                        "p-1 rounded transition-colors",
                        isFavorite
                          ? "text-[var(--tp-yellow)]"
                          : "text-[var(--tp-text-muted)] hover:text-[var(--tp-yellow)]"
                      )}
                    >
                      <Star
                        size={14}
                        fill={isFavorite ? "currentColor" : "none"}
                      />
                    </button>

                    {/* Symbol info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--tp-text-primary)]">
                          {market.currency}/{market.pair}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded uppercase",
                            market.marketType === "futures" &&
                              "bg-[var(--tp-orange)]/20 text-[var(--tp-orange)]",
                            market.marketType === "spot" &&
                              "bg-[var(--tp-blue)]/20 text-[var(--tp-blue)]",
                            market.marketType === "eco" &&
                              "bg-[var(--tp-green)]/20 text-[var(--tp-green)]"
                          )}
                        >
                          {market.marketType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--tp-text-muted)]">
                        {isRecent && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> Recent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price info */}
                  {market.price !== undefined && (
                    <div className="text-right">
                      <div className="text-sm font-mono text-[var(--tp-text-primary)]">
                        {market.price.toFixed(2)}
                      </div>
                      {market.change !== undefined && (
                        <div
                          className={cn(
                            "text-xs font-mono",
                            market.change >= 0
                              ? "text-[var(--tp-green)]"
                              : "text-[var(--tp-red)]"
                          )}
                        >
                          {market.change >= 0 ? "+" : ""}
                          {market.change.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[var(--tp-border)] bg-[var(--tp-bg-tertiary)]">
          <div className="flex items-center justify-between text-xs text-[var(--tp-text-muted)]">
            <div className="flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
            <span>⌘K to search</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});
