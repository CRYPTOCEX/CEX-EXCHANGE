"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import Image from "next/image";
import {
  Search,
  TrendingUp,
  Flame,
  Star,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

// Import the binary store
import {
  useBinaryStore,
  type Symbol,
  type Order,
  type BinaryMarket,
  getSymbolFromPair,
  extractBaseCurrency,
  extractQuoteCurrency,
} from "@/store/trade/use-binary-store";

// Import the ticker WebSocket service for real-time data
import { tickersWs } from "@/services/tickers-ws";

// Import image utilities
import { getCryptoImageUrl, handleImageError } from "@/utils/image-fallback";
import type { TickerData } from "@/app/[locale]/trade/components/markets/types";
import { wishlistService } from "../../../../../services/wishlist-service";
import { useTranslations } from "next-intl";

// Memoized crypto icon component to prevent unnecessary re-renders and image requests
const CryptoIcon = memo(({ 
  currency, 
  size = 32, 
  className = "",
  isPositive = false
}: { 
  currency: string; 
  size?: number; 
  className?: string;
  isPositive?: boolean;
}) => {
  const imageUrl = useMemo(() => getCryptoImageUrl(currency || "generic"), [currency]);
  
  return (
    <div
      className={`relative w-12 h-12 rounded-xl bg-zinc-800/80 flex items-center justify-center shadow-lg border-2 ${
        isPositive
          ? "border-green-500/20"
          : "border-red-500/20"
      } group-hover:scale-110 transition-transform duration-300 ${className}`}
    >
      <Image
        src={imageUrl}
        alt={currency || "generic"}
        width={size}
        height={size}
        className="object-cover rounded-lg"
        onError={(e) => {
          handleImageError(e, '/img/crypto/generic.webp');
        }}
        priority={false}
        loading="lazy"
        unoptimized={false}
      />
    </div>
  );
});

CryptoIcon.displayName = 'CryptoIcon';

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
  onToggleFavorite,
  isFavorite,
  isDarkTheme
}: {
  market: any;
  currentSymbol: string;
  wsData: any;
  onSelect: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
  isFavorite: boolean;
  isDarkTheme: boolean;
}) => {
  const t = useTranslations("binary/components/header/market-selector");
  
  const symbol = market.symbol;
  const baseCurrency = extractBaseCurrency(symbol);
  const quoteCurrency = extractQuoteCurrency(symbol);
  const isPositive = (wsData?.change || 0) >= 0;

  const formatPrice = (price: number) => {
    if (price === 0) return "Loading...";
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  return (
    <div
      className={`relative flex items-center px-2 py-1 mr-1.5 cursor-pointer rounded-lg transition-all ${
        currentSymbol === symbol
          ? isDarkTheme
            ? "bg-zinc-800/80 text-white shadow-md"
            : "bg-gray-200 text-gray-800 shadow-md"
          : isDarkTheme
            ? "bg-black/60 text-gray-300 hover:bg-zinc-900/50"
            : "bg-gray-100/60 text-gray-600 hover:bg-gray-200/50"
      }`}
      onClick={() => onSelect(symbol)}
    >
      <div className="flex items-center">
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center mr-1.5 ${
            isDarkTheme ? "bg-zinc-800" : "bg-white"
          } overflow-hidden`}
        >
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
              {isPositive ? (
                <ChevronUp className="h-2.5 w-2.5 inline" />
              ) : (
                <ChevronDown className="h-2.5 w-2.5 inline" />
              )}{" "}
              {isPositive ? "+" : ""}
              {Math.abs(wsData?.change || 0).toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] font-medium">
            {formatPrice(wsData?.last || 0)}
          </div>
        </div>
      </div>
    </div>
  );
});

ActiveMarketTab.displayName = 'ActiveMarketTab';

// Memoized market card component to prevent unnecessary re-renders
const MarketCard = memo(({ 
  market, 
  isAlreadyAdded, 
  isFavorite, 
  currentPrice, 
  priceChange, 
  isPositive,
  onAddMarket,
  onToggleFavorite,
  onSelect,
  isDarkTheme,
  index
}: {
  market: BinaryMarket;
  isAlreadyAdded: boolean;
  isFavorite: boolean;
  currentPrice: number;
  priceChange: number;
  isPositive: boolean;
  onAddMarket: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
  onSelect: (symbol: string) => void;
  isDarkTheme: boolean;
  index: number;
}) => {
  const t = useTranslations("binary/components/header/market-selector");
  const symbol = market.symbol || `${market.currency}${market.pair}`;
  
  const formatPrice = (price: number) => {
    if (price === 0) return "Loading...";
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  return (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
        isDarkTheme
          ? "bg-zinc-900/90 border-zinc-800/50 hover:border-zinc-700/80 shadow-xl hover:shadow-2xl"
          : "bg-white/90 border-zinc-200 hover:border-zinc-300 shadow-lg hover:shadow-xl"
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{
        scale: 1.02,
        rotateY: 2,
        rotateX: 2,
      }}
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      {/* Background gradient overlay */}
      <div
        className={`absolute inset-0 opacity-20 ${
          isPositive
            ? "bg-gradient-to-br from-green-500/10 to-emerald-600/10"
            : "bg-gradient-to-br from-red-500/10 to-pink-600/10"
        }`}
      />

      {/* Card Content */}
      <div className="relative p-5">
        {/* Header with coin and favorite */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CryptoIcon
              currency={market.currency || "generic"}
              isPositive={isPositive}
            />

            <div>
              <div
                className={`font-bold text-lg ${isDarkTheme ? "text-white" : "text-zinc-900"}`}
              >
                {market.label || `${market.currency}/${market.pair}`}
              </div>
              <div
                className={`text-xs font-medium ${isDarkTheme ? "text-zinc-400" : "text-zinc-500"}`}
              >
                {t("binary_options")}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(symbol);
            }}
            className={`p-2 rounded-full transition-colors ${
              isFavorite
                ? "text-yellow-400 hover:text-yellow-300"
                : isDarkTheme
                  ? "text-zinc-600 hover:text-yellow-400"
                  : "text-zinc-400 hover:text-yellow-400"
            }`}
          >
            <Star size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Price and change */}
        <div className="mb-4">
          {currentPrice > 0 ? (
            <div>
              <div
                className={`text-2xl font-bold mb-1 ${isDarkTheme ? "text-white" : "text-gray-900"}`}
              >
                $
                {formatPrice(currentPrice)}
              </div>
              <div
                className={`flex items-center space-x-1 text-sm font-semibold ${
                  isPositive ? "text-green-500" : "text-red-500"
                }`}
              >
                <motion.div
                  animate={{
                    y: isPositive ? [0, -2, 0] : [0, 2, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {isPositive ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </motion.div>
                <span>
                  {isPositive ? "+" : ""}
                  {priceChange.toFixed(2)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="animate-pulse space-y-2">
              <div
                className={`h-6 rounded ${isDarkTheme ? "bg-zinc-800" : "bg-gray-200"}`}
              />
              <div
                className={`h-4 w-20 rounded ${isDarkTheme ? "bg-zinc-800" : "bg-gray-200"}`}
              />
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={() => {
            if (isAlreadyAdded) {
              onSelect(symbol);
            } else {
              onAddMarket(symbol);
            }
          }}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
            isAlreadyAdded
              ? isDarkTheme
                ? "bg-[#F7941D] text-white hover:bg-[#e87d0a] shadow-lg hover:shadow-xl"
                : "bg-[#F7941D] text-white hover:bg-[#e87d0a] shadow-lg hover:shadow-xl"
              : isDarkTheme
                ? "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
                : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 border border-zinc-300"
          } hover:scale-105 active:scale-95`}
        >
          {isAlreadyAdded ? t("select") : t("add_to_trading")}
        </button>
      </div>
    </motion.div>
  );
});

MarketCard.displayName = 'MarketCard';

// Update the MarketSelectorProps interface to match what's being used
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

// Make sure the component accepts these props
export default function MarketSelector({
  // Default to using the binary store if props aren't provided
  onAddMarket,
  activeMarkets: propActiveMarkets,
  currentSymbol: propCurrentSymbol,
  onSelectSymbol,
  onRemoveMarket,
  orders,
  currentPrice,
  handleMarketSelect,
}: MarketSelectorProps) {
  const t = useTranslations("binary/components/header/market-selector");
  // Use the binary store
  const {
    activeMarkets: storeActiveMarkets,
    currentSymbol: storeCurrentSymbol,
    setCurrentSymbol,
    addMarket,
    removeMarket,
    binaryMarkets,
    isLoadingMarkets,
    fetchBinaryMarkets,
  } = useBinaryStore();

  // Use props if provided, otherwise use store values
  const activeMarkets = propActiveMarkets || storeActiveMarkets;
  const currentSymbol = propCurrentSymbol || storeCurrentSymbol;

  // Ticker data state
  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});

  // Initialize WebSocket connection and subscribe to ticker data
  useEffect(() => {
    tickersWs.initialize();

    const unsubscribe = tickersWs.subscribeToSpotData((data) => {
      // Defer ticker data updates to prevent setState during render
      setTimeout(() => {
        setTickerData((prevData) => {
          const updatedData = { ...prevData };
          // Only update tickers that have new data
          Object.entries(data).forEach(([symbol, tickerData]) => {
            if (tickerData && tickerData.last !== undefined) {
              updatedData[symbol] = tickerData;
            }
          });
          return updatedData;
        });
      }, 0);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [favoriteMarkets, setFavoriteMarkets] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hoveredMarket, setHoveredMarket] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  // Handle mounting state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine dark mode based on theme
  const isDarkTheme = mounted && theme === "dark";

  // Load favorite markets from localStorage
  useEffect(() => {
    if (mounted) {
      const saved = localStorage.getItem("favoriteMarkets");
      if (saved) {
        setFavoriteMarkets(JSON.parse(saved));
      }
    }
  }, [mounted]);

  // Fetch binary markets on mount
  useEffect(() => {
    if (binaryMarkets.length === 0) {
      fetchBinaryMarkets();
    }
  }, [binaryMarkets.length]); // Remove fetchBinaryMarkets from dependencies to prevent re-runs

  // Check if container is scrollable
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    // Use setTimeout to defer the check until after render
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

  // Format price with appropriate decimal places based on value
  const formatPrice = (price: number): string => {
    if (price >= 1000)
      return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (price >= 1)
      return price.toLocaleString("en-US", { maximumFractionDigits: 4 });
    return price.toLocaleString("en-US", { maximumFractionDigits: 8 });
  };

  // Generate chart data - memoized to improve performance
  const generateMiniChartData = useCallback(
    (symbol: string, isPositive: boolean) => {
      const points = 30;
      const data: number[] = [];

      // Use the symbol string to generate a consistent seed
      const seed = symbol
        .split("untitled")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);

      // Start with a base value
      let value = 100;

      // Create a deterministic pattern based on the symbol
      for (let i = 0; i < points; i++) {
        // Use a sine wave with the seed to create a consistent pattern
        const angle = (i / points) * Math.PI * 2;
        const wave = Math.sin(angle + seed * 0.1);

        // Add a trend based on whether it should be positive or negative
        const trend = isPositive ? 0.2 : -0.2;

        // Calculate the new value with minimal randomness
        value = 100 + wave * 10 + trend * i;

        // Ensure value stays reasonable
        value = Math.max(85, Math.min(115, value));
        data.push(value);
      }

      return data;
    },
    []
  );

  // Memoize chart data for each market to prevent recalculation
  const chartDataCache = useMemo(() => {
    const cache = new Map<string, { up: number[]; down: number[] }>();

    binaryMarkets.forEach((market) => {
      const symbol = market.symbol || `${market.currency}/${market.pair}`;
      cache.set(symbol, {
        up: generateMiniChartData(symbol, true),
        down: generateMiniChartData(symbol, false),
      });
    });

    return cache;
  }, [binaryMarkets, generateMiniChartData]);

  // Handle adding a market
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

  // Handle removing a market
  const handleRemoveMarket = useCallback(
    (marketSymbol: Symbol, e: React.MouseEvent) => {
      e.stopPropagation();
      if (onRemoveMarket) {
        onRemoveMarket(marketSymbol);
      } else {
        removeMarket(marketSymbol);
      }
    },
    [onRemoveMarket, removeMarket]
  );

  // Handle selecting a market
  const handleSelectMarket = useCallback(
    (marketSymbol: Symbol) => {
      // Defer state updates to prevent setState during render
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

  // Toggle favorite status
  const toggleFavorite = useCallback(
    (symbol: string) => {
      const newFavorites = favoriteMarkets.includes(symbol)
        ? favoriteMarkets.filter((fav) => fav !== symbol)
        : [...favoriteMarkets, symbol];

      setFavoriteMarkets(newFavorites);
      if (mounted) {
        localStorage.setItem("favoriteMarkets", JSON.stringify(newFavorites));
      }
    },
    [favoriteMarkets, mounted]
  );

  // Filter markets based on search and active tab
  const filteredMarkets = useMemo(() => {
    return binaryMarkets.filter((market) => {
      const symbol = market.symbol || `${market.currency}/${market.pair}`;
      const baseCurrency = extractBaseCurrency(symbol);
      const quoteCurrency = extractQuoteCurrency(symbol);

      // Search filter
      const searchMatch =
        searchQuery === "" ||
        symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        baseCurrency.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quoteCurrency.toLowerCase().includes(searchQuery.toLowerCase());

      if (!searchMatch) return false;

      // Tab filter
      switch (activeTab) {
        case "trending":
          return market.isTrending || false;
        case "hot":
          return market.isHot || false;
        case "favorites":
          return favoriteMarkets.includes(symbol);
        default:
          return true;
      }
    });
  }, [binaryMarkets, searchQuery, activeTab, favoriteMarkets]);

  // Memoize market cards to prevent unnecessary re-renders
  const renderMarketCard = useCallback(
    (market: BinaryMarket) => {
      // Use the symbol from the API response directly, or construct it from currency + pair
      const symbol = market.symbol || `${market.currency}/${market.pair}`;
      const formattedSymbol = symbol; // Already in currency/pair format
      const wsData = tickerData[formattedSymbol];
      const isFavorite = favoriteMarkets.includes(symbol);
      const isPositive = (wsData?.change || 0) >= 0;

      // Get cached chart data
      const chartData = chartDataCache.get(symbol);
      const miniChartData = chartData
        ? isPositive
          ? chartData.up
          : chartData.down
        : [];

      const baseCurrency = extractBaseCurrency(symbol);
      const quoteCurrency = extractQuoteCurrency(symbol);

      return (
        <div
          key={symbol}
          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
            isDarkTheme
              ? "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/60"
              : "bg-gray-50 border-gray-200 hover:bg-gray-100"
          } ${
            hoveredMarket === symbol
              ? isDarkTheme
                ? "border-zinc-600"
                : "border-gray-300"
              : ""
          }`}
          onMouseEnter={() => setHoveredMarket(symbol)}
          onMouseLeave={() => setHoveredMarket(null)}
          onClick={() => handleSelectMarket(symbol)}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                  isDarkTheme ? "bg-zinc-800" : "bg-white"
                } overflow-hidden`}
              >
                <Image
                  src={`/img/crypto/${(baseCurrency || "generic").toLowerCase()}.webp`}
                  alt={baseCurrency || "generic"}
                  width={24}
                  height={24}
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `/img/crypto/generic.webp`;
                  }}
                />
              </div>
              <div>
                <div
                  className={`font-medium text-sm ${
                    isDarkTheme ? "text-white" : "text-gray-800"
                  }`}
                >
                  {baseCurrency}_
                  {quoteCurrency}
                </div>
                <div
                  className={`text-xs ${
                    isDarkTheme ? "text-zinc-400" : "text-gray-500"
                  }`}
                >
                  {market.label || baseCurrency}
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(symbol);
              }}
              className={`p-1 rounded-full transition-colors ${
                isFavorite
                  ? "text-yellow-500"
                  : isDarkTheme
                    ? "text-zinc-400 hover:text-yellow-500"
                    : "text-gray-400 hover:text-yellow-500"
              }`}
            >
              <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="mt-2">
            {wsData ? (
              <div className="flex justify-between items-center">
                <div
                  className={`font-bold text-lg ${
                    isDarkTheme ? "text-white" : "text-gray-800"
                  }`}
                >
                  {formatPrice(wsData.last || 0)}
                </div>
                <div
                  className={`text-sm font-bold ${
                    (wsData.change || 0) >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  } flex items-center`}
                >
                  {(wsData.change || 0) >= 0 ? (
                    <ChevronUp size={16} className="inline mr-[1px]" />
                  ) : (
                    <ChevronDown size={16} className="inline mr-[1px]" />
                  )}
                  {Math.abs(wsData.change || 0).toFixed(2)}%
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div
                  className={`${
                    isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                  } rounded h-6 w-20 animate-pulse`}
                />
                <div
                  className={`${
                    isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                  } rounded h-4 w-12 animate-pulse`}
                />
              </div>
            )}
          </div>

          {/* Mini chart */}
          <div className="mt-3 h-8 relative">
            <svg className="w-full h-full" viewBox="0 0 100 20">
              <path
                d={`M ${miniChartData
                  .map(
                    (point, index) =>
                      `${(index / (miniChartData.length - 1)) * 100},${
                        20 - ((point - 85) / 30) * 20
                      }`
                  )
                  .join(" L ")}`}
                fill="none"
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth="1.5"
                className="drop-shadow-sm"
              />
            </svg>
          </div>

          {/* Add trending/hot badges */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex space-x-1">
              {market.isTrending && (
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    isDarkTheme
                      ? "bg-blue-900/20 text-blue-400"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  <TrendingUp size={10} className="mr-1" />
                  {t("Trending")}
                </span>
              )}
              {market.isHot && (
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    isDarkTheme
                      ? "bg-orange-900/20 text-orange-400"
                      : "bg-orange-100 text-orange-800"
                  }`}
                >
                  <Flame size={10} className="mr-1" />
                  {t("Hot")}
                </span>
              )}
            </div>
            <ArrowRight
              size={14}
              className={isDarkTheme ? "text-zinc-500" : "text-gray-400"}
            />
          </div>
        </div>
      );
    },
    [
      chartDataCache,
      favoriteMarkets,
      hoveredMarket,
      handleAddMarket,
      toggleFavorite,
      isDarkTheme,
      tickerData,
    ]
  );

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center">
      {/* Market tabs container */}
      {activeMarkets.length > 0 && (
        <div className="relative flex items-center mr-2">
          {/* Left scroll button */}
          {showScrollButtons && scrollPosition > 0 && (
            <button
              className={`absolute left-0 z-10 w-6 h-6 flex items-center justify-center ${
                isDarkTheme ? "bg-black/80" : "bg-white/80"
              } rounded-full shadow-lg`}
              onClick={() => scroll("left")}
            >
              <ChevronDown className="rotate-90" size={14} />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto scrollbar-hide max-w-[400px] px-1"
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

            {/* Update the render of market tabs to use this function */}
            {activeMarkets.map((market) => {
              // Safety check for market symbol
              if (!market?.symbol) {
                console.warn('Market missing symbol:', market);
                return null;
              }
              
              const symbol = market.symbol;
              const baseCurrency = extractBaseCurrency(symbol);
              const quoteCurrency = extractQuoteCurrency(symbol);
              
              // Additional safety check for extracted currencies
              if (!baseCurrency || !quoteCurrency) {
                console.warn('Failed to extract currencies from symbol:', symbol);
                return null;
              }
              
              const formattedSymbol = `${baseCurrency}/${quoteCurrency}`;
              const wsData = tickerData[formattedSymbol];
              const isPositive = (wsData?.change || 0) >= 0;

              return (
                <ActiveMarketTab
                  key={symbol}
                  market={market}
                  currentSymbol={currentSymbol}
                  wsData={wsData}
                  onSelect={handleSelectMarket}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favoriteMarkets.includes(symbol)}
                  isDarkTheme={isDarkTheme}
                />
              );
            })}
          </div>

          {/* Right scroll button */}
          {showScrollButtons &&
            scrollContainerRef.current &&
            scrollPosition <
              scrollContainerRef.current.scrollWidth -
                scrollContainerRef.current.clientWidth -
                10 && (
              <button
                className={`absolute right-0 z-10 w-6 h-6 flex items-center justify-center ${
                  isDarkTheme ? "bg-black/80" : "bg-white/80"
                } rounded-full shadow-lg`}
                onClick={() => scroll("right")}
              >
                <ChevronDown className="-rotate-90" size={14} />
              </button>
            )}
        </div>
      )}

      {/* Enhanced Add Market Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogTrigger asChild>
          <motion.button
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              isDarkTheme
                ? "bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-700/50"
                : "bg-white/80 hover:bg-gray-50 border border-gray-200/50"
            } backdrop-blur-sm shadow-sm hover:shadow-md`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus
              size={16}
              className={isDarkTheme ? "text-zinc-300" : "text-gray-700"}
            />
          </motion.button>
        </DialogTrigger>
        <DialogContent
          className={`w-[80vw] min-w-[80vw] max-w-[80vw] max-h-[90vh] p-0 border-0 ${
            isDarkTheme ? "bg-black/95" : "bg-white/95"
          } backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden`}
          style={{ width: "80vw", minWidth: "80vw", maxWidth: "80vw" }}
        >
          <DialogTitle className="sr-only">
            Discover Markets
          </DialogTitle>
          <DialogDescription className="sr-only">
            Add new trading pairs to your workspace. Browse through popular, trending, and all available markets.
          </DialogDescription>
          <div className="relative">
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F7941D]/5 via-transparent to-blue-500/5 animate-pulse" />

            {/* Header Section */}
            <div
              className={`relative p-6 border-b ${isDarkTheme ? "border-zinc-800/50" : "border-zinc-200/50"}`}
            >
              <div className="flex items-center space-x-3">
                <motion.div
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F7941D] to-[#FF7A00] flex items-center justify-center shadow-lg"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Plus className="text-white" size={24} />
                </motion.div>
                <div>
                  <h2
                    className={`text-2xl font-bold ${isDarkTheme ? "text-white" : "text-zinc-800"}`}
                  >
                    {t("Discover")}{" "}
                    <span className="text-[#F7941D]">{t("Markets")}</span>
                  </h2>
                  <p
                    className={`text-sm ${isDarkTheme ? "text-zinc-400" : "text-zinc-600"}`}
                  >
                    {t("add_new_trading_pairs_to_your_workspace")}
                  </p>
                </div>
              </div>

              {/* Enhanced Search Bar */}
              <div className="relative mt-6">
                <div
                  className={`relative flex items-center ${
                    isDarkTheme ? "bg-zinc-900/50" : "bg-zinc-50/80"
                  } backdrop-blur-sm rounded-xl border ${
                    isDarkTheme ? "border-zinc-700/50" : "border-zinc-200/50"
                  } shadow-sm`}
                >
                  <Search
                    className={`absolute left-4 ${isDarkTheme ? "text-zinc-400" : "text-zinc-500"}`}
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Search markets, symbols, or pairs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 bg-transparent ${
                      isDarkTheme
                        ? "text-white placeholder-zinc-500"
                        : "text-zinc-800 placeholder-zinc-400"
                    } text-lg focus:outline-none`}
                  />
                  {searchQuery && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setSearchQuery("")}
                      className={`absolute right-4 p-1 rounded-full ${
                        isDarkTheme ? "hover:bg-zinc-700" : "hover:bg-zinc-200"
                      }`}
                    >
                      <X
                        size={16}
                        className={
                          isDarkTheme ? "text-zinc-400" : "text-zinc-500"
                        }
                      />
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Tabs */}
            <div
              className={`px-6 py-4 border-b ${isDarkTheme ? "border-zinc-800/50" : "border-zinc-200/50"}`}
            >
              <div className="flex space-x-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl backdrop-blur-sm">
                {[
                  { id: "all", label: "All Markets", icon: "🌐" },
                  { id: "trending", label: "Trending", icon: "📈" },
                  { id: "hot", label: "Hot", icon: "🔥" },
                  { id: "favorites", label: "Favorites", icon: "⭐" },
                ].map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-[#F7941D] text-white shadow-lg"
                        : isDarkTheme
                          ? "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                          : "text-zinc-600 hover:text-zinc-800 hover:bg-white/50"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-[#F7941D] rounded-lg -z-10"
                        initial={false}
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Markets Grid */}
            <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-transparent">
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {filteredMarkets.map((market, index) => {
                  const symbol =
                    market.symbol || `${market.currency}${market.pair}`; // Use symbol directly from API
                  const isAlreadyAdded = activeMarkets.some(
                    (m) => m.symbol === symbol
                  );
                  const isFavorite = favoriteMarkets.includes(symbol);

                  // Get live price data from WebSocket
                  const wsKey =
                    market.label || `${market.currency}/${market.pair}`; // "BTC/USDT" format for WebSocket
                  const liveData =
                    tickerData[wsKey] ||
                    tickerData[symbol] ||
                    tickerData[`${market.currency}/${market.pair}`];

                  const currentPrice = liveData?.last || 0;
                  const priceChange = liveData?.change || 0;
                  const isPositive = priceChange >= 0;

                  return (
                    <MarketCard
                      key={market.id}
                      market={market}
                      isAlreadyAdded={isAlreadyAdded}
                      isFavorite={isFavorite}
                      currentPrice={currentPrice}
                      priceChange={priceChange}
                      isPositive={isPositive}
                      onAddMarket={handleAddMarket}
                      onToggleFavorite={toggleFavorite}
                      onSelect={handleSelectMarket}
                      isDarkTheme={isDarkTheme}
                      index={index}
                    />
                  );
                })}
              </motion.div>

              {/* Empty State */}
              {filteredMarkets.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="text-6xl mb-4">🔍</div>
                  <h3
                    className={`text-xl font-semibold mb-2 ${isDarkTheme ? "text-white" : "text-gray-800"}`}
                  >
                    {t("no_markets_found")}
                  </h3>
                  <p
                    className={`${isDarkTheme ? "text-zinc-400" : "text-gray-600"}`}
                  >
                    {t("try_adjusting_your_different_categories")}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div
              className={`px-6 py-4 border-t ${isDarkTheme ? "border-zinc-800/50" : "border-gray-200/50"} bg-black/5 dark:bg-white/5`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`text-sm ${isDarkTheme ? "text-zinc-400" : "text-gray-600"}`}
                >
                  {filteredMarkets.length} {t("markets_available")}
                </div>
                <div className="flex space-x-2">
                  <motion.button
                    className={`px-4 py-2 rounded-lg text-sm ${
                      isDarkTheme
                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSearchQuery("")}
                  >
                    {t("clear_filters")}
                  </motion.button>
                  <motion.button
                    className="px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-[#F7941D] to-[#FF7A00] text-white"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAddModal(false)}
                  >
                    {t("Done")}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
