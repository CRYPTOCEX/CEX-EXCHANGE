/**
 * MarketSelector (Unified)
 *
 * Premium responsive market selector modal with glassmorphism design.
 * Uses defined column widths for consistent layout.
 */
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Search, X, Star, TrendingUp, Flame, Sparkles, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

import {
  useBinaryStore,
  type Symbol,
} from "@/store/trade/use-binary-store";
import { wishlistService } from "../../../../../services/wishlist-service";
import { useTranslations } from "next-intl";
import { tickersWs } from "@/services/tickers-ws";
import type { TickerData } from "@/app/[locale]/trade/components/markets/types";

interface MarketSelectorModalProps {
  open: boolean;
  onClose: () => void;
  handleMarketSelect?: (marketSymbol: string) => void;
  onAddMarket?: (symbol: Symbol) => void;
  isMobile?: boolean; // When true, selecting a market replaces current instead of adding
}

type TabType = "all" | "trending" | "hot" | "favorites";

export default function MarketSelectorModal({
  open,
  onClose,
  handleMarketSelect,
  onAddMarket,
  isMobile = false,
}: MarketSelectorModalProps) {
  const t = useTranslations("common");
  const tBinary = useTranslations("binary_components");
  const {
    activeMarkets,
    currentSymbol,
    setCurrentSymbol,
    addMarket,
    binaryMarkets,
    isLoadingMarkets,
    fetchBinaryMarkets,
  } = useBinaryStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const [favoriteMarkets, setFavoriteMarkets] = useState<Symbol[]>([]);
  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const dark = !mounted ? true : resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-focus search when modal opens
  useEffect(() => {
    if (open && mounted) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open, mounted]);

  // Fetch markets if needed
  useEffect(() => {
    if (binaryMarkets.length === 0 && !isLoadingMarkets) {
      fetchBinaryMarkets();
    }
  }, [binaryMarkets.length, isLoadingMarkets, fetchBinaryMarkets]);

  // Subscribe to wishlist
  useEffect(() => {
    const unsubscribe = wishlistService.subscribe((wishlist) => {
      setFavoriteMarkets(wishlist.map((item) => item.symbol));
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to ticker data
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

  const formatPrice = (price: number): string => {
    if (price === 0) return "—";
    if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const filteredMarkets = binaryMarkets.filter((market) => {
    const searchString = `${market.currency}${market.pair}${market.label}`.toLowerCase();
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

  const handleSelectMarket = (symbol: Symbol) => {
    // On mobile: just switch to the market (replace behavior)
    // On desktop: add the market to activeMarkets if not already present
    if (!isMobile && !activeMarkets.some((m) => m.symbol === symbol)) {
      if (onAddMarket) {
        onAddMarket(symbol);
      } else {
        addMarket(symbol);
      }
    }

    // Select the market (switch to it)
    if (handleMarketSelect) {
      handleMarketSelect(String(symbol));
    } else {
      setCurrentSymbol(symbol);
    }

    onClose();
  };

  const toggleFavorite = (e: React.MouseEvent, symbol: Symbol) => {
    e.stopPropagation();
    wishlistService.toggleWishlist(symbol);
  };

  if (!mounted) return null;

  const tabs = [
    { id: "all" as TabType, icon: <Sparkles size={12} />, label: "All", color: "text-blue-400" },
    { id: "trending" as TabType, icon: <TrendingUp size={12} />, label: "Trending", color: "text-emerald-400" },
    { id: "hot" as TabType, icon: <Flame size={12} />, label: "Hot", color: "text-rose-400" },
    { id: "favorites" as TabType, icon: <Star size={12} />, label: "Favorites", color: "text-amber-400" },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={`w-full max-w-[95vw] sm:max-w-[500px] lg:max-w-[700px] xl:max-w-[800px] max-h-[85vh] p-0 gap-0 overflow-hidden ${
          dark
            ? "bg-zinc-900/95 backdrop-blur-xl border-zinc-800/60"
            : "bg-white/95 backdrop-blur-xl border-zinc-200"
        } border rounded-2xl shadow-2xl [&>button]:hidden`}
      >
        <DialogTitle className="sr-only">Select Market</DialogTitle>
        <DialogDescription className="sr-only">Choose a trading pair</DialogDescription>

        {/* Premium Header */}
        <div className={`relative overflow-hidden ${dark ? "bg-zinc-900/80" : "bg-zinc-50/80"}`}>
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

          {/* Header content */}
          <div className="p-4">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${dark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                  <Zap size={18} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${dark ? "text-white" : "text-zinc-900"}`}>
                    {t("select_market")}
                  </h2>
                  <p className={`text-[11px] ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
                    {binaryMarkets.length} {t("pairs_available")}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  dark
                    ? "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                    : "bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <X size={16} />
              </motion.button>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? "text-zinc-500" : "text-zinc-400"}`} />
              <input
                ref={searchRef}
                type="text"
                placeholder={tBinary("search_markets_symbols_or_pairs_ellipsis")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-11 pl-11 pr-10 text-sm rounded-xl transition-all ${
                  dark
                    ? "bg-zinc-800/60 border-zinc-700/50 text-white placeholder-zinc-500 focus:border-emerald-500/50 focus:bg-zinc-800"
                    : "bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500"
                } border focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setSearchQuery("")}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
                      dark ? "hover:bg-zinc-700 text-zinc-500" : "hover:bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    <X size={14} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Tabs */}
          <div className={`flex gap-1 px-4 pb-3`}>
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? dark
                      ? "bg-zinc-800 text-white shadow-lg"
                      : "bg-white text-zinc-900 shadow-lg"
                    : dark
                      ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <span className={activeTab === tab.id ? tab.color : ""}>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Market List */}
        <div className={`overflow-y-auto max-h-[50vh] ${dark ? "bg-zinc-900/50" : "bg-white"}`}>
          {isLoadingMarkets ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="relative">
                <div className="w-10 h-10 border-2 border-emerald-500/20 rounded-full" />
                <div className="absolute inset-0 w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <span className={`text-sm ${dark ? "text-zinc-500" : "text-zinc-400"}`}>{t("loading_markets_ellipsis")}</span>
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 ${dark ? "text-zinc-600" : "text-zinc-400"}`}>
              <div className={`p-4 rounded-2xl mb-3 ${dark ? "bg-zinc-800/50" : "bg-zinc-100"}`}>
                <Search size={28} className="opacity-50" />
              </div>
              <span className="text-sm font-medium">{t("no_markets_found")}</span>
              <span className={`text-xs mt-1 ${dark ? "text-zinc-600" : "text-zinc-400"}`}>
                {t("try_a_different_search_term")}
              </span>
            </div>
          ) : (
            <div className="p-2">
              {filteredMarkets.map((market, index) => {
                const symbol = market.symbol || `${market.currency}${market.pair}`;
                const wsKey = market.label || `${market.currency}/${market.pair}`;
                const liveData = tickerData[wsKey] || tickerData[symbol] || tickerData[`${market.currency}/${market.pair}`];
                const marketData = activeMarkets.find((m) => m.symbol === symbol);
                const price = liveData?.last || marketData?.price || 0;
                const change = liveData?.change || marketData?.change || 0;
                const isPositive = change >= 0;
                const isFavorite = favoriteMarkets.includes(symbol);
                const isSelected = currentSymbol === symbol;
                const isAdded = activeMarkets.some((m) => m.symbol === symbol);

                return (
                  <motion.div
                    key={market.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.2 }}
                    onClick={() => handleSelectMarket(symbol)}
                    className={`group flex items-center p-3 mb-1 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? dark
                          ? "bg-emerald-500/10 border border-emerald-500/30"
                          : "bg-emerald-50 border border-emerald-200"
                        : dark
                          ? "hover:bg-zinc-800/60 border border-transparent"
                          : "hover:bg-zinc-50 border border-transparent"
                    }`}
                  >
                    {/* Icon with checkmark for added markets */}
                    <div className="relative shrink-0 w-10">
                      <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center ${
                        dark ? "bg-zinc-800" : "bg-zinc-100"
                      }`}>
                        <Image
                          src={`/img/crypto/${(market.currency || "generic").toLowerCase()}.webp`}
                          alt={market.currency || ""}
                          width={28}
                          height={28}
                          className="object-cover"
                          onError={(e) => { e.currentTarget.src = `/img/crypto/generic.webp`; }}
                        />
                      </div>
                      {isAdded && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Name & Tags - fixed width */}
                    <div className="w-32 sm:w-40 min-w-0 ml-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${dark ? "text-white" : "text-zinc-900"}`}>
                          {market.currency}/{market.pair}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {market.isHot && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-500/20 text-rose-400 rounded-md">
                            HOT
                          </span>
                        )}
                        {market.isTrending && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 rounded-md">
                            TREND
                          </span>
                        )}
                        {!market.isHot && !market.isTrending && (
                          <span className={`text-[11px] ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
                            {t("binary_options")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Price - fixed width for alignment */}
                    <div className="w-28 text-right shrink-0">
                      <div className={`font-bold text-sm tabular-nums ${dark ? "text-white" : "text-zinc-900"}`}>
                        {formatPrice(price)}
                      </div>
                      <div className={`text-xs font-semibold tabular-nums flex items-center justify-end gap-1 ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                        <span className={`w-4 h-4 rounded flex items-center justify-center ${isPositive ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                          {isPositive ? <TrendingUp size={10} /> : <TrendingUp size={10} className="rotate-180" />}
                        </span>
                        {isPositive ? "+" : ""}{change.toFixed(2)}%
                      </div>
                    </div>

                    {/* Favorite */}
                    <motion.button
                      onClick={(e) => toggleFavorite(e, symbol)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`p-2 rounded-lg transition-all shrink-0 ml-2 ${
                        isFavorite ? "" : "opacity-0 group-hover:opacity-100"
                      } ${dark ? "hover:bg-zinc-700" : "hover:bg-zinc-100"}`}
                    >
                      <Star
                        size={16}
                        className={isFavorite ? "text-amber-500 fill-amber-500" : dark ? "text-zinc-600" : "text-zinc-400"}
                      />
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
