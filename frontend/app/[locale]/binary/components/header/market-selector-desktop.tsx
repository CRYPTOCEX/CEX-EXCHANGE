/**
 * MarketSelector (Desktop Header Tabs)
 *
 * This component handles:
 * - Active market tabs in the header (scrollable)
 * - A "+" button that opens the unified MarketSelectorModal
 */
"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import Image from "next/image";
import { ChevronDown, Plus, X } from "lucide-react";
import { useTheme } from "next-themes";

import {
  useBinaryStore,
  type Symbol,
  type Order,
  extractBaseCurrency,
  extractQuoteCurrency,
} from "@/store/trade/use-binary-store";
import { tickersWs } from "@/services/tickers-ws";
import { getCryptoImageUrl, handleImageError } from "@/utils/image-fallback";
import type { TickerData } from "@/app/[locale]/trade/components/markets/types";
import { useTranslations } from "next-intl";
import MarketSelectorModal from "./market-selector";

// Maximum number of active market tabs allowed
const MAX_ACTIVE_MARKETS = 8;

// Memoized small crypto icon for active markets tabs
const SmallCryptoIcon = memo(({ currency }: { currency: string }) => {
  const imageUrl = useMemo(() => getCryptoImageUrl(currency || "generic"), [currency]);

  return (
    <Image
      src={imageUrl}
      alt={currency || "generic"}
      width={20}
      height={20}
      className="object-cover"
      onError={(e) => {
        handleImageError(e, '/img/crypto/generic.webp');
      }}
      loading="lazy"
      unoptimized={false}
    />
  );
});

SmallCryptoIcon.displayName = 'SmallCryptoIcon';

// Memoized active market tab component
const ActiveMarketTab = memo(({
  market,
  currentSymbol,
  wsData,
  onSelect,
  onRemove,
  isDarkTheme,
  canRemove,
}: {
  market: { symbol: Symbol; price: number; change: number };
  currentSymbol: string;
  wsData: TickerData | undefined;
  onSelect: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  isDarkTheme: boolean;
  canRemove: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const symbol = market.symbol;
  const baseCurrency = extractBaseCurrency(symbol);
  const quoteCurrency = extractQuoteCurrency(symbol);
  const isPositive = (wsData?.change || 0) >= 0;

  // Use WebSocket data if available, otherwise fall back to market price from store
  const displayPrice = wsData?.last || market.price || 0;

  const formatPrice = (price: number) => {
    if (price === 0) return "Loading...";
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(symbol);
  };

  return (
    <div
      className={`group relative flex items-center h-10 px-3 cursor-pointer transition-all border-r ${
        currentSymbol === symbol
          ? isDarkTheme
            ? "bg-zinc-900 text-white"
            : "bg-zinc-100 text-zinc-900"
          : isDarkTheme
            ? "text-zinc-400 hover:bg-zinc-900/50 hover:text-white"
            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      } ${isDarkTheme ? "border-zinc-800" : "border-zinc-200"}`}
      onClick={() => onSelect(symbol)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center">
        <div className="w-5 h-5 rounded-full flex items-center justify-center mr-2 overflow-hidden">
          <SmallCryptoIcon currency={baseCurrency} />
        </div>
        <div>
          <div className="text-xs font-medium flex items-center">
            {baseCurrency}/{quoteCurrency}
            <span
              className={`ml-1.5 text-[10px] ${
                isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {isPositive ? "+" : ""}
              {Math.abs(wsData?.change || 0).toFixed(2)}%
            </span>
          </div>
          <div className={`text-[10px] ${isDarkTheme ? "text-zinc-500" : "text-zinc-500"}`}>
            {formatPrice(displayPrice)}
          </div>
        </div>
      </div>
      {/* Remove button - only show on hover when more than 1 market */}
      {canRemove && isHovered && (
        <button
          onClick={handleRemove}
          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center transition-all z-10 ${
            isDarkTheme
              ? "bg-zinc-700 hover:bg-red-500 text-zinc-400 hover:text-white"
              : "bg-zinc-300 hover:bg-red-500 text-zinc-600 hover:text-white"
          }`}
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
});

ActiveMarketTab.displayName = 'ActiveMarketTab';

export interface MarketSelectorProps {
  onAddMarket?: (symbol: Symbol) => void;
  activeMarkets?: { symbol: Symbol; price: number; change: number }[];
  currentSymbol?: Symbol;
  onSelectSymbol?: (symbol: Symbol) => void;
  onRemoveMarket?: (symbol: Symbol) => void;
  orders?: Order[];
  currentPrice?: number;
  handleMarketSelect?: (marketSymbol: string) => void;
}

export default function MarketSelector({
  onAddMarket,
  activeMarkets: propActiveMarkets,
  currentSymbol: propCurrentSymbol,
  onSelectSymbol,
  onRemoveMarket,
  orders,
  currentPrice,
  handleMarketSelect,
}: MarketSelectorProps) {
  const t = useTranslations("common");

  const {
    activeMarkets: storeActiveMarkets,
    currentSymbol: storeCurrentSymbol,
    setCurrentSymbol,
    addMarket,
    removeMarket,
    binaryMarkets,
  } = useBinaryStore();

  const activeMarkets = propActiveMarkets || storeActiveMarkets;
  const currentSymbol = propCurrentSymbol || storeCurrentSymbol;

  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkTheme = mounted && theme === "dark";

  // Initialize WebSocket connection
  useEffect(() => {
    tickersWs.initialize();
    const unsubscribe = tickersWs.subscribeToSpotData((data) => {
      setTimeout(() => {
        setTickerData((prevData) => {
          const updatedData = { ...prevData };
          Object.entries(data).forEach(([symbol, tickerData]) => {
            if (tickerData && tickerData.last !== undefined) {
              updatedData[symbol] = tickerData;
            }
          });
          return updatedData;
        });
      }, 0);
    });
    return () => unsubscribe();
  }, []);

  // Check if container is scrollable
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };
    const timeoutId = setTimeout(checkScrollable, 0);
    window.addEventListener("resize", checkScrollable);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkScrollable);
    };
  }, [activeMarkets]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 120;
      const newScrollPosition =
        direction === "left"
          ? Math.max(0, scrollPosition - scrollAmount)
          : Math.min(
              container.scrollWidth - container.clientWidth,
              scrollPosition + scrollAmount
            );
      container.scrollTo({ left: newScrollPosition, behavior: "smooth" });
      setScrollPosition(newScrollPosition);
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft);
    }
  };

  const handleAddMarket = useCallback(
    (marketSymbol: Symbol) => {
      if (onAddMarket) {
        onAddMarket(marketSymbol);
      } else {
        addMarket(marketSymbol);
      }
      setShowAddModal(false);
    },
    [onAddMarket, addMarket]
  );

  const handleSelectMarket = useCallback(
    (marketSymbol: Symbol) => {
      setTimeout(() => {
        if (handleMarketSelect) {
          handleMarketSelect(String(marketSymbol));
        } else if (onSelectSymbol) {
          onSelectSymbol(marketSymbol);
        } else {
          setCurrentSymbol(marketSymbol);
        }
        setShowAddModal(false);
      }, 0);
    },
    [handleMarketSelect, onSelectSymbol, setCurrentSymbol]
  );

  const handleRemoveMarket = useCallback(
    (marketSymbol: Symbol) => {
      if (onRemoveMarket) {
        onRemoveMarket(marketSymbol);
      } else {
        removeMarket(marketSymbol);
      }
    },
    [onRemoveMarket, removeMarket]
  );

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center h-full">
      <div className="relative flex items-center h-full">
        {/* Left scroll button */}
        {showScrollButtons && scrollPosition > 0 && (
          <button
            className={`absolute left-0 z-10 h-10 w-6 flex items-center justify-center ${
              isDarkTheme ? "bg-black/90 border-r border-zinc-800" : "bg-white/90 border-r border-zinc-200"
            }`}
            onClick={() => scroll("left")}
          >
            <ChevronDown className="rotate-90" size={14} />
          </button>
        )}

        {activeMarkets.length > 0 && (
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto scrollbar-hide max-w-[500px] h-full"
            onScroll={handleScroll}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            {activeMarkets.map((market) => {
              if (!market?.symbol) return null;

              const symbol = market.symbol;
              const baseCurrency = extractBaseCurrency(symbol);
              const quoteCurrency = extractQuoteCurrency(symbol);

              if (!baseCurrency || !quoteCurrency) return null;

              const formattedSymbol = `${baseCurrency}/${quoteCurrency}`;
              const wsData = tickerData[formattedSymbol];

              return (
                <ActiveMarketTab
                  key={symbol}
                  market={market}
                  currentSymbol={currentSymbol}
                  wsData={wsData}
                  onSelect={handleSelectMarket}
                  onRemove={handleRemoveMarket}
                  isDarkTheme={isDarkTheme}
                  canRemove={activeMarkets.length > 1}
                />
              );
            })}
          </div>
        )}

        {/* Right scroll button */}
        {showScrollButtons &&
          scrollContainerRef.current &&
          scrollPosition <
            scrollContainerRef.current.scrollWidth -
              scrollContainerRef.current.clientWidth -
              10 && (
            <button
              className={`absolute right-0 z-10 h-10 w-6 flex items-center justify-center ${
                isDarkTheme ? "bg-black/90 border-l border-zinc-800" : "bg-white/90 border-l border-zinc-200"
              }`}
              onClick={() => scroll("right")}
            >
              <ChevronDown className="-rotate-90" size={14} />
            </button>
          )}

        {/* Add Market Button - hide when all pairs added or max reached */}
        {activeMarkets.length < MAX_ACTIVE_MARKETS && activeMarkets.length < binaryMarkets.length && (
          <button
            onClick={() => setShowAddModal(true)}
            className={`h-10 w-10 flex items-center justify-center transition-colors border-r ${
              isDarkTheme
                ? "border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800"
            }`}
          >
            <Plus size={18} />
          </button>
        )}

        {/* Unified Market Selector Modal */}
        <MarketSelectorModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          handleMarketSelect={handleMarketSelect}
          onAddMarket={handleAddMarket}
        />
      </div>
    </div>
  );
}
