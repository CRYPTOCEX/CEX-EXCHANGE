"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Search, ChevronDown, ChevronUp, X, Star } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTheme } from "next-themes";

// Import the ticker service for real-time price updates
import { tickersWs } from "@/services/tickers-ws";

// Import the binary store
import {
  useBinaryStore,
  type Symbol,
  type Market,
  getSymbolFromPair,
  extractBaseCurrency,
  extractQuoteCurrency,
} from "@/store/trade/use-binary-store";
import { wishlistService } from "../../../../../services/wishlist-service";
import { useTranslations } from "next-intl";

// Update the component props interface to include all the needed properties
interface MarketSelectorModalProps {
  onClose: () => void;
  handleMarketSelect?: (marketSymbol: string) => void;
}

// Update the component function signature to destructure all props
export default function MarketSelectorModal({
  onClose,
  handleMarketSelect,
}: MarketSelectorModalProps) {
  const t = useTranslations("binary/components/header/market-selector-modal");
  // Use the binary store
  const {
    activeMarkets,
    currentSymbol,
    setCurrentSymbol,
    addMarket,
    removeMarket,
    binaryMarkets,
    isLoadingMarkets,
    fetchBinaryMarkets,
  } = useBinaryStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "trending" | "hot" | "favorites"
  >("all");
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const [favoriteMarkets, setFavoriteMarkets] = useState<Symbol[]>([]);

  // Handle mounting state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine dark mode based on theme
  const isDarkTheme = mounted && theme === "dark";

  // Fetch markets when component mounts if needed
  useEffect(() => {
    if (binaryMarkets.length === 0 && !isLoadingMarkets) {
      fetchBinaryMarkets();
    }
  }, [binaryMarkets.length, isLoadingMarkets, fetchBinaryMarkets]);

  // Load favorites from wishlistService on mount
  useEffect(() => {
    const unsubscribe = wishlistService.subscribe((wishlist) => {
      setFavoriteMarkets(wishlist.map((item) => item.symbol));
    });
    return () => unsubscribe();
  }, []);

  // Format price with appropriate decimal places based on value
  const formatPrice = (price: number): string => {
    if (price >= 1000)
      return price.toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });
    if (price >= 1)
      return price.toLocaleString("en-US", {
        maximumFractionDigits: 4,
      });
    return price.toLocaleString("en-US", {
      maximumFractionDigits: 8,
    });
  };

  // Filter markets based on search query and active tab
  const filteredMarkets = binaryMarkets.filter((market) => {
    const searchString =
      `${market.currency}${market.pair}${market.label}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "favorites") {
      const symbol = market.symbol || `${market.currency}${market.pair}`;
      return matchesSearch && favoriteMarkets.includes(symbol);
    }
    if (activeTab === "trending") return matchesSearch && market.isTrending;
    if (activeTab === "hot") return matchesSearch && market.isHot;
    return matchesSearch;
  });

  // Update the handleSelectMarket function to subscribe to WebSocket updates
  // Replace the existing handleSelectMarket function with this one:

  // Handle market selection
  const handleSelectMarket = (symbol: Symbol) => {
    // Use the prop function if provided, otherwise use store function
    if (handleMarketSelect) {
      handleMarketSelect(String(symbol));
    } else {
      setCurrentSymbol(symbol);
      if (!activeMarkets.some((m) => m.symbol === symbol)) {
        addMarket(symbol);
      }
    }
    onClose();
  };

  // Toggle favorite status
  const toggleFavorite = (e: React.MouseEvent, symbol: Symbol) => {
    e.stopPropagation();
    wishlistService.toggleWishlist(symbol);
  };

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null;
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`w-[90vw] p-0 ${isDarkTheme ? "bg-black border-zinc-800 text-white" : "bg-white border-gray-200 text-gray-800"} border rounded-lg shadow-2xl max-w-md mx-auto`}
      >
        <DialogTitle className="sr-only">
          Add Market
        </DialogTitle>
        <DialogDescription className="sr-only">
          Search and select a trading market to add to your watchlist.
        </DialogDescription>
        <div className="flex flex-col max-h-[80vh]">
          {/* Header with search */}
          <div
            className={`p-4 border-b ${isDarkTheme ? "border-zinc-800 bg-black" : "border-gray-200 bg-white"} flex items-center justify-between`}
          >
            <h3
              className={`text-lg font-medium ${isDarkTheme ? "text-white" : "text-gray-800"}`}
            >
              <span className="text-[#F7941D] font-bold">{t("Add")}</span>
              {t("Market")}
            </h3>
            <button
              onClick={onClose}
              className={`p-1 rounded-full ${isDarkTheme ? "hover:bg-zinc-800" : "hover:bg-gray-100"} transition-colors`}
            >
              <X
                size={18}
                className={isDarkTheme ? "text-zinc-300" : "text-gray-600"}
              />
            </button>
          </div>

          <div
            className={`p-4 border-b ${isDarkTheme ? "border-zinc-800 bg-black" : "border-gray-200 bg-white"}`}
          >
            <div className="relative">
              <Search
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkTheme ? "text-zinc-400" : "text-gray-500"}`}
                size={16}
              />
              <input
                type="text"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${isDarkTheme ? "bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500" : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"} border rounded-md pl-10 pr-3 py-2.5 w-full text-sm focus:outline-none focus:ring-1 focus:ring-[#F7941D] transition-all`}
              />
            </div>
          </div>

          {/* Tabs */}
          <div
            className={`flex border-b ${isDarkTheme ? "border-zinc-800" : "border-gray-200"} ${isDarkTheme ? "bg-black" : "bg-white"}`}
          >
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-3 text-sm font-medium ${activeTab === "all" ? (isDarkTheme ? "text-[#F7941D] border-b-2 border-[#F7941D]" : "text-[#F7941D] border-b-2 border-[#F7941D]") : isDarkTheme ? "text-zinc-400 hover:text-zinc-300" : "text-gray-500 hover:text-gray-700"} transition-colors`}
            >
              {t("All")}
            </button>
            <button
              onClick={() => setActiveTab("trending")}
              className={`flex-1 py-3 text-sm font-medium ${activeTab === "trending" ? (isDarkTheme ? "text-[#F7941D] border-b-2 border-[#F7941D]" : "text-[#F7941D] border-b-2 border-[#F7941D]") : isDarkTheme ? "text-zinc-400 hover:text-zinc-300" : "text-gray-500 hover:text-gray-700"} transition-colors flex items-center justify-center`}
            >
              <svg
                className="w-4 h-4 mr-1"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 3V21H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 14L11 10L15 14L21 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("Trending")}
            </button>
            <button
              onClick={() => setActiveTab("hot")}
              className={`flex-1 py-3 text-sm font-medium ${activeTab === "hot" ? (isDarkTheme ? "text-[#F7941D] border-b-2 border-[#F7941D]" : "text-[#F7941D] border-b-2 border-[#F7941D]") : isDarkTheme ? "text-zinc-400 hover:text-zinc-300" : "text-gray-500 hover:text-gray-700"} transition-colors flex items-center justify-center`}
            >
              <svg
                className="w-4 h-4 mr-1"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z"
                  fill="currentColor"
                />
                <path
                  d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z"
                  fill="currentColor"
                />
              </svg>
              {t("Hot")}
            </button>
            <button
              onClick={() => setActiveTab("favorites")}
              className={`flex-1 py-3 text-sm font-medium ${activeTab === "favorites" ? (isDarkTheme ? "text-[#F7941D] border-b-2 border-[#F7941D]" : "text-[#F7941D] border-b-2 border-[#F7941D]") : isDarkTheme ? "text-zinc-400 hover:text-zinc-300" : "text-gray-500 hover:text-gray-700"} transition-colors flex items-center justify-center`}
            >
              <Star className="w-4 h-4 mr-1" />
              {t("Favorites")}
            </button>
          </div>

          {/* Market list */}
          <div
            className={`overflow-y-auto max-h-[60vh] p-2 ${isDarkTheme ? "bg-black" : "bg-gray-50"}`}
          >
            {isLoadingMarkets ? (
              <div className="flex justify-center items-center p-8">
                <div
                  className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkTheme ? "border-[#F7941D]" : "border-[#F7941D]"}`}
                ></div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Active markets section */}
                {activeMarkets.length > 0 && activeTab !== "favorites" && (
                  <div className="mb-4">
                    <h3
                      className={`text-sm font-medium ${isDarkTheme ? "text-zinc-400" : "text-gray-500"} px-2 mb-2`}
                    >
                      {t("active_markets")}
                    </h3>
                    {activeMarkets.map((market) => {
                      // Safety check for market symbol
                      if (!market?.symbol) {
                        console.warn('Market missing symbol:', market);
                        return null;
                      }
                      
                      const isPositive = (market.change || 0) >= 0;
                      const baseCurrency = extractBaseCurrency(market.symbol);
                      const quoteCurrency = extractQuoteCurrency(market.symbol);
                      
                      // Additional safety check for extracted currencies
                      if (!baseCurrency || !quoteCurrency) {
                        console.warn('Failed to extract currencies from symbol:', market.symbol);
                        return null;
                      }
                      return (
                        <div
                          key={market.symbol}
                          className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${currentSymbol === market.symbol ? (isDarkTheme ? "bg-zinc-800" : "bg-gray-200") : isDarkTheme ? "bg-zinc-900 hover:bg-zinc-800" : "bg-white hover:bg-gray-100"} transition-colors`}
                          onClick={() => handleSelectMarket(market.symbol)}
                        >
                          <div className="flex items-center">
                            <div
                              className={`w-8 h-8 rounded-full ${isDarkTheme ? "bg-zinc-800" : "bg-gray-100"} flex items-center justify-center mr-3 overflow-hidden`}
                            >
                              <Image
                                src={`/img/crypto/${(baseCurrency || "generic").toLowerCase()}.webp`}
                                alt={baseCurrency || "generic"}
                                width={32}
                                height={32}
                                className="object-cover"
                                onError={(e) => {
                                  // Fallback if image not found
                                  e.currentTarget.src = `/img/crypto/generic.webp`;
                                }}
                              />
                            </div>
                            <div>
                              <div
                                className={`font-medium ${isDarkTheme ? "text-white" : "text-gray-800"}`}
                              >
                                {baseCurrency}/{quoteCurrency}
                              </div>
                              <div
                                className={`text-xs ${isDarkTheme ? "text-zinc-400" : "text-gray-500"}`}
                              >
                                {t("Binary")}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex items-center">
                            <div>
                              <div
                                className={`font-medium ${isDarkTheme ? "text-white" : "text-gray-800"}`}
                              >
                                {formatPrice(market.price || 0)}
                              </div>
                              <div
                                className={`text-xs ${isPositive ? "text-green-500" : "text-red-500"}`}
                              >
                                {isPositive ? (
                                  <ChevronUp
                                    size={12}
                                    className="inline mr-[1px]"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={12}
                                    className="inline mr-[1px]"
                                  />
                                )}
                                {Math.abs(market.change || 0).toFixed(2)}%
                              </div>
                            </div>
                            <button
                              className="ml-3"
                              onClick={(e) => toggleFavorite(e, market.symbol)}
                            >
                              <Star
                                size={16}
                                className={`${favoriteMarkets.includes(market.symbol) ? "text-[#F7941D] fill-[#F7941D]" : isDarkTheme ? "text-zinc-500 hover:text-zinc-400" : "text-gray-400 hover:text-gray-600"}`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* All markets section */}
                <div>
                  <h3
                    className={`text-sm font-medium ${isDarkTheme ? "text-zinc-400" : "text-gray-500"} px-2 mb-2`}
                  >
                    {activeTab === "favorites"
                      ? "Favorite Markets"
                      : "All Markets"}
                  </h3>
                  {filteredMarkets.length > 0 ? (
                    filteredMarkets.map((market) => {
                      const symbol =
                        market.symbol || `${market.currency}${market.pair}`; // Use the symbol directly from API
                      // Skip if already in active markets and not in favorites tab
                      if (
                        activeTab !== "favorites" &&
                        activeMarkets.some((m) => m.symbol === symbol)
                      )
                        return null;
                      const marketData = activeMarkets.find(
                        (m) => m.symbol === symbol
                      );
                      const isPositive = (marketData?.change || 0) >= 0;
                      const isFavorite = favoriteMarkets.includes(symbol);
                      return (
                        <div
                          key={market.id}
                          className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${currentSymbol === symbol ? (isDarkTheme ? "bg-zinc-800" : "bg-gray-200") : isDarkTheme ? "bg-zinc-900 hover:bg-zinc-800" : "bg-white hover:bg-gray-100"} transition-colors mb-2`}
                          onClick={() => handleSelectMarket(symbol)}
                        >
                          <div className="flex items-center">
                            <div
                              className={`w-8 h-8 rounded-full ${isDarkTheme ? "bg-zinc-800" : "bg-gray-100"} flex items-center justify-center mr-3 overflow-hidden`}
                            >
                              <Image
                                src={`/img/crypto/${(market.currency || "generic").toLowerCase()}.webp`}
                                alt={market.currency || "generic"}
                                width={32}
                                height={32}
                                className="object-cover"
                                onError={(e) => {
                                  // Fallback if image not found
                                  e.currentTarget.src = `/img/crypto/generic.webp`;
                                }}
                              />
                            </div>
                            <div>
                              <div
                                className={`font-medium ${isDarkTheme ? "text-white" : "text-gray-800"}`}
                              >
                                {market.label ||
                                  `${market.currency}/${market.pair}`}
                              </div>
                              <div
                                className={`text-xs ${isDarkTheme ? "text-zinc-400" : "text-gray-500"}`}
                              >
                                {t("Binary")}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex items-center">
                            {marketData ? (
                              <div>
                                <div
                                  className={`font-medium ${isDarkTheme ? "text-white" : "text-gray-800"}`}
                                >
                                  {formatPrice(marketData.price)}
                                </div>
                                <div
                                  className={`text-xs ${isPositive ? "text-green-500" : "text-red-500"}`}
                                >
                                  {isPositive ? (
                                    <ChevronUp
                                      size={12}
                                      className="inline mr-[1px]"
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={12}
                                      className="inline mr-[1px]"
                                    />
                                  )}
                                  {Math.abs(marketData.change).toFixed(2)}%
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`text-xs ${isDarkTheme ? "text-zinc-400" : "text-gray-500"}`}
                              >
                                {t("Loading")}.
                              </div>
                            )}
                            <button
                              className="ml-3"
                              onClick={(e) => toggleFavorite(e, symbol)}
                            >
                              <Star
                                size={16}
                                className={`${isFavorite ? "text-[#F7941D] fill-[#F7941D]" : isDarkTheme ? "text-zinc-500 hover:text-zinc-400" : "text-gray-400 hover:text-gray-600"}`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      className={`flex flex-col items-center justify-center p-8 ${isDarkTheme ? "text-zinc-400" : "text-gray-500"}`}
                    >
                      <Search size={24} className="mb-2" />
                      <p>{t("no_markets_found")}</p>
                      <p className="text-sm">
                        {t("try_adjusting_your_search")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
