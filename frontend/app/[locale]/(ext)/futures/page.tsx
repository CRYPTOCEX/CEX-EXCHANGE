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
  BarChart3,
  Volume2,
  Sparkles,
  Target,
  Zap,
  ArrowRight,
  ArrowUpDown,
  DollarSign,
  Rocket,
  Gauge,
  Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Link } from "@/i18n/routing";
import { getCryptoImageUrl } from "@/utils/image-fallback";
import { useUserStore } from "@/store/user";
import SiteHeader from "@/components/partials/header/site-header";
import { SiteFooter } from "@/components/partials/footer/user-footer";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { $fetch } from "@/lib/api";

interface FuturesMarket {
  id: string;
  symbol: string;
  currency: string;
  pair: string;
  maxLeverage: number;
  leverageOptions: number[];
  status: boolean;
  isTrending?: boolean;
  isHot?: boolean;
  metadata?: {
    precision?: { amount: number; price: number };
    limits?: {
      amount?: { min: number; max: number };
      price?: { min: number; max: number };
      cost?: { min: number; max: number };
      leverage?: string;
    };
    taker?: number;
    maker?: number;
  };
}

// Helper to parse leverage string to array of numbers and get max
function parseLeverage(leverageStr?: string): { options: number[]; max: number } {
  if (!leverageStr) return { options: [100], max: 100 };
  const options = leverageStr.split(",").map((l) => parseInt(l.trim(), 10)).filter((n) => !isNaN(n));
  return {
    options: options.length > 0 ? options : [100],
    max: options.length > 0 ? Math.max(...options) : 100,
  };
}

export default function FuturesMarketPage() {
  const t = useTranslations("common");
  const [markets, setMarkets] = useState<FuturesMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("leverage");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useUserStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const { data, error } = await $fetch({
          url: "/api/futures/market",
          silent: true,
        });
        if (error || !data) {
          setMarkets([]);
          return;
        }
        setMarkets(
          Array.isArray(data)
            ? data.map((market: any) => {
                const leverage = parseLeverage(market.metadata?.limits?.leverage);
                return {
                  ...market,
                  displaySymbol: `${market.currency}/${market.pair}`,
                  symbol: market.symbol || `${market.currency}/${market.pair}`,
                  maxLeverage: leverage.max,
                  leverageOptions: leverage.options,
                };
              })
            : []
        );
      } catch (e) {
        setMarkets([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMarkets();
  }, []);

  const processedMarkets = useMemo(() => {
    if (!markets.length) return [];
    return markets
      .filter((market) => {
        const matchesSearch =
          market.currency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          market.symbol?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter =
          selectedFilter === "all" ||
          (selectedFilter === "high_leverage" && market.maxLeverage >= 100);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        let aValue, bValue;
        switch (sortBy) {
          case "leverage":
            aValue = a.maxLeverage;
            bValue = b.maxLeverage;
            break;
          case "name":
            aValue = a.currency || "";
            bValue = b.currency || "";
            return sortOrder === "desc"
              ? bValue.localeCompare(aValue)
              : aValue.localeCompare(bValue);
          default:
            aValue = a.maxLeverage;
            bValue = b.maxLeverage;
        }
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
  }, [markets, searchTerm, selectedFilter, sortBy, sortOrder]);

  const renderSkeletonRows = () =>
    Array(8)
      .fill(0)
      .map((_, index) => (
        <motion.div
          key={`loading-${index}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className={cn(
            "grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl animate-pulse border",
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
          {Array(3)
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
    const highLeverage = processedMarkets.filter(
      (m) => m.maxLeverage >= 100
    ).length;
    const maxLeverage = Math.max(
      ...processedMarkets.map((m) => m.maxLeverage),
      0
    );
    return { totalMarkets, highLeverage, maxLeverage };
  }, [processedMarkets]);

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
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-950/50 dark:to-red-950/50 border border-orange-200 dark:border-orange-800/50 rounded-full px-4 py-2 text-sm font-medium text-orange-700 dark:text-orange-300 mb-4 md:mb-6"
              >
                <Rocket className="w-4 h-4" />
                Futures Trading
              </motion.div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 md:mb-6">
                Trade with
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
                  {" "}
                  Leverage
                </span>
              </h1>

              <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-300 max-w-3xl mx-auto leading-relaxed mb-6 md:mb-8">
                Trade perpetual futures contracts with up to 150x leverage.
                Advanced risk management, real-time PnL tracking, and deep
                liquidity.
              </p>

              {/* Market Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  {
                    label: "Futures Markets",
                    value: stats.totalMarkets,
                    icon: Target,
                    color: "orange",
                  },
                  {
                    label: "High Leverage",
                    value: stats.highLeverage,
                    icon: Gauge,
                    color: "red",
                  },
                  {
                    label: "Max Leverage",
                    value: `${stats.maxLeverage}x`,
                    icon: Zap,
                    color: "yellow",
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
                          stat.color === "orange" &&
                            "bg-orange-100 dark:bg-orange-900/30",
                          stat.color === "red" &&
                            "bg-red-100 dark:bg-red-900/30",
                          stat.color === "yellow" &&
                            "bg-yellow-100 dark:bg-yellow-900/30"
                        )}
                      >
                        <stat.icon
                          className={cn(
                            "w-4 h-4",
                            stat.color === "orange" &&
                              "text-orange-600 dark:text-orange-400",
                            stat.color === "red" &&
                              "text-red-600 dark:text-red-400",
                            stat.color === "yellow" &&
                              "text-yellow-600 dark:text-yellow-400"
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
                    placeholder="Search futures markets..."
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
                            {selectedFilter === "high_leverage" &&
                              "High Leverage"}
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
                          selectedFilter === "all" &&
                            "bg-orange-50 dark:bg-orange-950"
                        )}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        All Markets
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("high_leverage")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "high_leverage" &&
                            "bg-orange-50 dark:bg-orange-950"
                        )}
                      >
                        <Gauge className="w-4 h-4 mr-2 text-orange-600" />
                        High Leverage (100x+)
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
                            {sortBy === "leverage" && "Leverage"}
                            {sortBy === "name" && "Name"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {sortOrder === "desc" ? "↓" : "↑"}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => setSortBy("leverage")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "leverage" &&
                            "bg-orange-50 dark:bg-orange-950"
                        )}
                      >
                        <Gauge className="w-4 h-4 mr-2" />
                        Leverage
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("name")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "name" && "bg-orange-50 dark:bg-orange-950"
                        )}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Name
                      </DropdownMenuItem>
                      <div className="border-t my-1" />
                      <DropdownMenuItem
                        onClick={() =>
                          setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                        }
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

            {/* Markets Grid */}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 p-3 md:p-4 text-sm font-semibold text-zinc-600 dark:text-zinc-300 border-b border-zinc-200/50 dark:border-zinc-700/50 bg-zinc-50/50 dark:bg-zinc-800/50">
                <div>Market</div>
                <div className="text-right md:col-span-1">Leverage</div>
                <div className="hidden md:block text-right">Type</div>
                <div className="hidden md:block text-right">Action</div>
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
                      No futures markets found
                    </h3>
                    <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {processedMarkets.map((market, index) => (
                      <motion.div
                        key={market.id || market.symbol}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                        className={cn(
                          "grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 p-3 md:p-4 transition-all duration-300 group relative",
                          "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                          "active:bg-zinc-100 dark:active:bg-zinc-700/50",
                          "md:hover:scale-[1.02] md:hover:-translate-y-0.5"
                        )}
                      >
                        <Link
                          href={`/trade?symbol=${market.currency}-${market.pair}&type=futures`}
                          className="absolute inset-0 z-10"
                          aria-label={`Trade ${market.currency}/${market.pair} futures`}
                        />

                        {/* Mobile hover indicator */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 md:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-orange-500" />
                        </div>

                        {/* Market */}
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
                              src={getCryptoImageUrl(
                                market.currency || "generic"
                              )}
                              alt={market.currency || "generic"}
                              width={32}
                              height={32}
                              className="w-6 h-6 md:w-8 md:h-8 object-cover rounded-full"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.dataset.fallbackAttempted) {
                                  target.dataset.fallbackAttempted = "true";
                                  target.src =
                                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI2IiB5PSI2Ij4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgc3Ryb2tlPSIjNjk3MDdCIiBzdHJva2Utd2lkdGg9IjEuNSIvPgo8cGF0aCBkPSJtMTIuNSA3LjUtNSA1IiBzdHJva2U9IiM2OTcwN0IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0ibTcuNSA3LjUgNSA1IiBzdHJva2U9IiM2OTcwN0IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cjwvc3ZnPg==";
                                }
                              }}
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-sm md:text-base group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                              {market.currency}
                            </div>
                            <div
                              className={cn(
                                "text-xs",
                                isDark ? "text-zinc-400" : "text-gray-500"
                              )}
                            >
                              {market.currency}/{market.pair}
                            </div>
                          </div>
                        </div>

                        {/* Leverage (Mobile + Desktop) */}
                        <div className="flex items-center justify-end">
                          <div
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-sm",
                              "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                            )}
                          >
                            <Zap className="w-3 h-3" />
                            {market.maxLeverage}x
                          </div>
                        </div>

                        {/* Type */}
                        <div className="hidden md:flex items-center justify-end">
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            <Shield className="w-3 h-3" />
                            Perpetual
                          </div>
                        </div>

                        {/* Action */}
                        <div className="hidden md:flex items-center justify-end">
                          <button
                            onClick={() =>
                              (window.location.href = `/trade?symbol=${market.currency}-${market.pair}&type=futures`)
                            }
                            className="group/btn relative px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg font-medium text-white transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                          >
                            <Zap className="w-4 h-4" />
                            Trade
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
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
                  {user
                    ? "Ready to Trade Futures?"
                    : "Start Futures Trading Today"}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-300 mb-6 max-w-2xl mx-auto">
                  {user
                    ? "Choose any futures pair above and start trading with leverage. Advanced risk management tools available."
                    : "Join our platform and experience professional futures trading with up to 150x leverage and real-time PnL tracking."}
                </p>
                {user ? (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {processedMarkets.length > 0 && (
                      <Link
                        href={`/trade?symbol=${processedMarkets[0].currency}-${processedMarkets[0].pair}&type=futures`}
                        className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        Start Trading
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/register"
                      className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Create Free Account
                    </Link>
                    {processedMarkets.length > 0 && (
                      <Link
                        href={`/trade?symbol=${processedMarkets[0].currency}-${processedMarkets[0].pair}&type=futures`}
                        className={cn(
                          "px-6 py-3 rounded-lg font-medium transition-all duration-300 border",
                          isDark
                            ? "border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 text-white"
                            : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
                        )}
                      >
                        View Demo
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
