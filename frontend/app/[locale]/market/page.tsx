"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  BarChart3,
  Volume2,
  Clock,
  Sparkles,
  Target,
  Zap,
  ArrowRight,
  ArrowUpDown,
  DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { tickersWs } from "@/services/tickers-ws";
import { Link } from "@/i18n/routing";
import { getCryptoImageUrl } from "@/utils/image-fallback";
import { useUserStore } from "@/store/user";
import SiteHeader from "@/components/partials/header/site-header";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MarketPage() {
  const t = useTranslations("market");
  const [markets, setMarkets] = useState<any[]>([]);
  const [tickers, setTickers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("volume");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useUserStore();

  // Handle mounting state
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  useEffect(() => {
    let spotUnsubscribe: (() => void) | null = null;
    const fetchMarkets = async () => {
      try {
        const res = await fetch("/api/exchange/market");
        const data = await res.json();
        setMarkets(
          Array.isArray(data)
            ? data.map((market) => ({
                ...market,
                displaySymbol: `${market.currency}/${market.pair}`,
                symbol: `${market.currency}${market.pair}`,
              }))
            : []
        );
      } catch (e) {
        setMarkets([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMarkets();
    tickersWs.initialize();
    spotUnsubscribe = tickersWs.subscribeToSpotData((newTickers) => {
      setTickers((prevTickers) => {
        const updatedTickers = { ...prevTickers };
        // Only update tickers that have new data
        Object.entries(newTickers).forEach(([symbol, data]) => {
          if (data && data.last !== undefined) {
            updatedTickers[symbol] = data;
          }
        });
        return updatedTickers;
      });
    });
    return () => {
      if (spotUnsubscribe) spotUnsubscribe();
    };
  }, []);

  const processedMarkets = useMemo(() => {
    if (!markets.length || !Object.keys(tickers).length) return [];
    return markets
      .map((market) => {
        const tickerKey = `${market.currency}/${market.pair}`;
        const ticker = tickers[tickerKey] || {};
        const price = Number(ticker.last) || 0;
        const change24h = Number(ticker.change) || 0;
        const volume = Number(ticker.quoteVolume) || 0;
        const high24h = Number(ticker.high) || 0;
        const low24h = Number(ticker.low) || 0;
        const marketCap = price * (market.marketCap || 1_000_000);
        return {
          ...market,
          price,
          change24h,
          volume,
          high24h,
          low24h,
          marketCap,
          tickerKey,
        };
      })
      .filter((market) => {
        const matchesSearch =
          market.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
          market.displaySymbol.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter =
          selectedFilter === "all" ||
          (selectedFilter === "gainers" && market.change24h > 0) ||
          (selectedFilter === "losers" && market.change24h < 0) ||
          (selectedFilter === "volume" && market.volume > 1000000) ||
          (selectedFilter === "new" && market.trending);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        let aValue, bValue;
        switch (sortBy) {
          case "price":
            aValue = a.price;
            bValue = b.price;
            break;
          case "change":
            aValue = a.change24h;
            bValue = b.change24h;
            break;
          case "volume":
            aValue = a.volume;
            bValue = b.volume;
            break;
          case "marketCap":
            aValue = a.marketCap;
            bValue = b.marketCap;
            break;
          default:
            aValue = a.volume;
            bValue = b.volume;
        }
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
  }, [markets, tickers, searchTerm, selectedFilter, sortBy, sortOrder]);
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else if (price >= 1) {
      return price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    } else {
      return price.toLocaleString("en-US", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 8,
      });
    }
  };
  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    if (volume >= 1) return `$${volume.toFixed(2)}`;
    if (volume > 0) return `$${volume.toFixed(8)}`;
    return `$0.00`;
  };
  const getMarketIcon = (index: number) => {
    const gradients = [
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500",
      "from-green-500 to-emerald-500",
      "from-orange-500 to-red-500",
      "from-indigo-500 to-blue-500",
      "from-yellow-500 to-orange-500",
    ];
    return gradients[index % gradients.length];
  };
  const renderSkeletonRows = () =>
    Array(10)
      .fill(0)
      .map((_, index) => (
        <motion.div
          key={`loading-${index}`}
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.3,
            delay: index * 0.05,
          }}
          className={cn(
            "grid grid-cols-6 gap-4 p-4 rounded-xl animate-pulse border",
            isDark
              ? "bg-zinc-800/30 border-zinc-700/50"
              : "bg-gray-50 border-gray-200/50"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-full",
                isDark ? "bg-zinc-700" : "bg-gray-200"
              )}
            />
            <div className="space-y-2">
              <div
                className={cn(
                  "h-4 w-16 rounded",
                  isDark ? "bg-zinc-700" : "bg-gray-200"
                )}
              />
              <div
                className={cn(
                  "h-3 w-12 rounded",
                  isDark ? "bg-zinc-700" : "bg-gray-200"
                )}
              />
            </div>
          </div>
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex items-center justify-end">
                <div
                  className={cn(
                    "h-4 w-20 rounded",
                    isDark ? "bg-zinc-700" : "bg-gray-200"
                  )}
                />
              </div>
            ))}
        </motion.div>
      ));
  const stats = useMemo(() => {
    const totalMarkets = processedMarkets.length;
    const gainers = processedMarkets.filter((m) => m.change24h > 0).length;
    const losers = processedMarkets.filter((m) => m.change24h < 0).length;
    const totalVolume = processedMarkets.reduce((sum, m) => sum + m.volume, 0);
    return {
      totalMarkets,
      gainers,
      losers,
      totalVolume,
    };
  }, [processedMarkets]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return <SiteHeader />;
  }

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950 pt-14 md:pt-18">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-8 md:mb-12"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800/50 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-4 md:mb-6"
              >
                <BarChart3 className="w-4 h-4" />
                {t("cryptocurrency_markets")}
              </motion.div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 md:mb-6">
                {t("explore_all")}
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {" "}
                  {t("crypto_markets")}
                </span>
              </h1>

              <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-300 max-w-3xl mx-auto leading-relaxed mb-6 md:mb-8">
                {t("real-time_prices_24h_cryptocurrency_pairs")}
                {". "}
                {t("start_trading_with_deep_liquidity")}.
              </p>

              {/* Market Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Total Markets",
                    value: stats.totalMarkets,
                    icon: Target,
                    color: "blue",
                  },
                  {
                    label: "24h Gainers",
                    value: stats.gainers,
                    icon: TrendingUp,
                    color: "green",
                  },
                  {
                    label: "24h Losers",
                    value: stats.losers,
                    icon: TrendingDown,
                    color: "red",
                  },
                  {
                    label: "Total Volume",
                    value: formatVolume(stats.totalVolume),
                    icon: Volume2,
                    color: "purple",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                    className={cn(
                      "p-3 md:p-4 rounded-xl backdrop-blur-sm border",
                      isDark
                        ? "bg-zinc-800/30 border-zinc-700/50"
                        : "bg-white/80 border-white/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          stat.color === "blue" &&
                            "bg-blue-100 dark:bg-blue-900/30",
                          stat.color === "green" &&
                            "bg-green-100 dark:bg-green-900/30",
                          stat.color === "red" &&
                            "bg-red-100 dark:bg-red-900/30",
                          stat.color === "purple" &&
                            "bg-purple-100 dark:bg-purple-900/30"
                        )}
                      >
                        <stat.icon
                          className={cn(
                            "w-4 h-4",
                            stat.color === "blue" &&
                              "text-blue-600 dark:text-blue-400",
                            stat.color === "green" &&
                              "text-green-600 dark:text-green-400",
                            stat.color === "red" &&
                              "text-red-600 dark:text-red-400",
                            stat.color === "purple" &&
                              "text-purple-600 dark:text-purple-400"
                          )}
                        />
                      </div>
                      <div className="text-sm md:text-base text-zinc-600 dark:text-zinc-400">
                        {stat.label}
                      </div>
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {stat.value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Search and Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-6 md:mb-8"
            >
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Input
                    placeholder="Search markets (e.g., BTC, ETH)..."
                    value={searchTerm}
                    icon={"mdi:search"}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-zinc-200 dark:border-zinc-700 h-11"
                  />
                </div>

                {/* Filters and Sort Container */}
                <div className="flex gap-3 w-full sm:w-auto">
                  {/* Filter Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-11 px-4 bg-white/80 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 min-w-[120px] justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4" />
                          <span>
                            {selectedFilter === "all" && "All Markets"}
                            {selectedFilter === "gainers" && "Gainers"}
                            {selectedFilter === "losers" && "Losers"}
                            {selectedFilter === "volume" && "High Volume"}
                            {selectedFilter === "new" && "Trending"}
                          </span>
                        </div>
                        <ArrowDownRight className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("all")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "all" && "bg-blue-50 dark:bg-blue-950"
                        )}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        All Markets
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("gainers")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "gainers" && "bg-green-50 dark:bg-green-950"
                        )}
                      >
                        <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                        Gainers
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("losers")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "losers" && "bg-red-50 dark:bg-red-950"
                        )}
                      >
                        <TrendingDown className="w-4 h-4 mr-2 text-red-600" />
                        Losers
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("volume")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "volume" && "bg-purple-50 dark:bg-purple-950"
                        )}
                      >
                        <Volume2 className="w-4 h-4 mr-2 text-purple-600" />
                        High Volume
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("new")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "new" && "bg-yellow-50 dark:bg-yellow-950"
                        )}
                      >
                        <Sparkles className="w-4 h-4 mr-2 text-yellow-600" />
                        Trending
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Sort Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-11 px-4 bg-white/80 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 min-w-[140px] justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="w-4 h-4" />
                          <span>
                            {sortBy === "volume" && "Volume"}
                            {sortBy === "price" && "Price"}
                            {sortBy === "change" && "24h Change"}
                            {sortBy === "marketCap" && "Market Cap"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {sortOrder === "desc" ? "↓" : "↑"}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => setSortBy("volume")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "volume" && "bg-blue-50 dark:bg-blue-950"
                        )}
                      >
                        <Volume2 className="w-4 h-4 mr-2" />
                        {t("Volume")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("price")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "price" && "bg-blue-50 dark:bg-blue-950"
                        )}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        {t("Price")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("change")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "change" && "bg-blue-50 dark:bg-blue-950"
                        )}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {t("24h_change")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("marketCap")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "marketCap" && "bg-blue-50 dark:bg-blue-950"
                        )}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        {t("market_cap")}
                      </DropdownMenuItem>
                      <div className="border-t my-1" />
                      <DropdownMenuItem
                        onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                        className="cursor-pointer"
                      >
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        {sortOrder === "desc" ? "Descending" : "Ascending"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>

            {/* Markets Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={cn(
                "backdrop-blur-xl rounded-2xl border shadow-xl overflow-hidden",
                isDark
                  ? "bg-zinc-900/50 border-zinc-700/50"
                  : "bg-white/80 border-white/20"
              )}
            >
              {/* Table Header */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-4 p-3 md:p-4 text-sm font-semibold text-zinc-600 dark:text-zinc-300 border-b border-zinc-200/50 dark:border-zinc-700/50 bg-zinc-50/50 dark:bg-zinc-800/50">
                <div>{t("Asset")}</div>
                <div className="text-right md:col-span-1">{t("Price")}</div>
                <div className="hidden md:block text-right">
                  {t("24h_change")}
                </div>
                <div className="hidden md:block text-right">
                  {t("24h_volume")}
                </div>
                <div className="hidden md:block text-right">
                  {t("market_cap")}
                </div>
                <div className="hidden md:block text-right">{t("Action")}</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-zinc-200/50 dark:divide-zinc-700/50">
                {isLoading ? (
                  renderSkeletonRows()
                ) : processedMarkets.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 md:w-8 md:h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      {t("no_markets_found")}
                    </h3>
                    <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400">
                      {t("try_adjusting_your_search_or_filter_criteria")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {processedMarkets.map((market, index) => (
                      <motion.div
                        key={market.symbol}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                        className={cn(
                          "grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-4 p-3 md:p-4 transition-all duration-300 group relative",
                          "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                          "active:bg-zinc-100 dark:active:bg-zinc-700/50",
                          "md:hover:scale-[1.02] md:hover:-translate-y-0.5",
                          isDark ? "hover:bg-zinc-800/50" : "hover:bg-zinc-50"
                        )}
                      >
                        <Link
                          href={`/trade?symbol=${market.currency}-${market.pair}`}
                          className="absolute inset-0 z-10"
                          aria-label={`Trade ${market.currency}/${market.pair}`}
                        />

                        {/* Mobile hover/active indicator - right arrow */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 md:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-blue-500" />
                        </div>

                        {/* Asset */}
                        <div className="flex items-center gap-2 md:gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center overflow-hidden border-2",
                              isDark 
                                ? "bg-zinc-800 border-zinc-700" 
                                : "bg-white border-gray-200"
                            )}
                          >
                            <Image
                              src={getCryptoImageUrl(market.currency || "generic")}
                              alt={market.currency || "generic"}
                              width={32}
                              height={32}
                              className="w-6 h-6 md:w-8 md:h-8 object-cover rounded-full"
                              onError={(e) => {
                                // Prevent infinite loops by checking if we already tried fallback
                                const target = e.currentTarget;
                                if (!target.dataset.fallbackAttempted) {
                                  target.dataset.fallbackAttempted = 'true';
                                  // Use a data URI as fallback to prevent further errors
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI2IiB5PSI2Ij4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgc3Ryb2tlPSIjNjk3MDdCIiBzdHJva2Utd2lkdGg9IjEuNSIvPgo8cGF0aCBkPSJtMTIuNSA3LjUtNSA1IiBzdHJva2U9IiM2OTcwN0IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0ibTcuNSA3LjUgNSA1IiBzdHJva2U9IiM2OTcwN0IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cjwvc3ZnPg==';
                                }
                              }}
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-sm md:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {market.currency}
                            </div>
                            <div
                              className={cn(
                                "text-xs",
                                isDark ? "text-zinc-400" : "text-gray-500"
                              )}
                            >
                              {market.displaySymbol}
                            </div>
                          </div>
                        </div>

                        {/* Price and Change (Mobile) */}
                        <div className="flex flex-col items-end md:hidden pr-6">
                          <div className="font-mono font-semibold text-sm">
                            {market.price
                              ? "$" + formatPrice(market.price)
                              : "--"}
                          </div>
                          <div
                            className={cn(
                              "text-xs font-semibold",
                              market.change24h >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            )}
                          >
                            {market.change24h >= 0 ? "+" : ""}
                            {typeof market.change24h === "number"
                              ? market.change24h.toFixed(2)
                              : market.change24h}
                            %
                          </div>
                        </div>

                        {/* Desktop columns */}
                        <div className="hidden md:flex items-center justify-end">
                          <div className="text-right">
                            <div className="font-mono font-semibold">
                              {market.price
                                ? "$" + formatPrice(market.price)
                                : "--"}
                            </div>
                            {market.high24h > 0 && market.low24h > 0 && (
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                $
                                {formatPrice(market.low24h)}
                                - $
                                {formatPrice(market.high24h)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="hidden md:flex items-center justify-end">
                          <div
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-lg font-semibold text-sm",
                              market.change24h >= 0
                                ? "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                                : "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                            )}
                          >
                            {market.change24h >= 0 ? "+" : ""}
                            {typeof market.change24h === "number"
                              ? market.change24h.toFixed(2)
                              : market.change24h}
                            %
                            {market.change24h >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                          </div>
                        </div>

                        <div className="hidden md:flex items-center justify-end font-medium">
                          {formatVolume(market.volume)}
                        </div>

                        <div className="hidden md:flex items-center justify-end font-medium">
                          {market.marketCap
                            ? formatVolume(market.marketCap)
                            : "--"}
                        </div>

                        {/* Action button for desktop */}
                        <div className="hidden md:flex items-center justify-end">
                          <button
                            onClick={() =>
                              (window.location.href = `/trade?symbol=${market.currency}-${market.pair}`)
                            }
                            className="group/btn relative px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-medium text-white transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                          >
                            <Zap className="w-4 h-4" />
                            {t("Trade")}
                            <ArrowUpRight className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Bottom CTA */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.6,
              }}
              className="text-center mt-12"
            >
              <div
                className={cn(
                  "p-8 rounded-2xl backdrop-blur-sm border",
                  isDark
                    ? "bg-zinc-800/30 border-zinc-700/50"
                    : "bg-white/80 border-white/50"
                )}
              >
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                  {user ? "Happy Trading!" : "Ready to Start Trading?"}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-300 mb-6 max-w-2xl mx-auto">
                  {user
                    ? "You're all set! Choose any cryptocurrency pair above to start trading with our professional tools and real-time market data."
                    : "Join our platform and experience secure cryptocurrency trading with professional tools and real-time market data."}
                </p>
                {user ? (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/trade"
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      {t("start_trading")}
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/register"
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      {t("create_free_account")}
                    </Link>
                    <Link
                      href="/trade"
                      className={cn(
                        "px-6 py-3 rounded-lg font-medium transition-all duration-300 border",
                        isDark
                          ? "border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 text-white"
                          : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
                      )}
                    >
                      {t("start_trading_demo")}
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
