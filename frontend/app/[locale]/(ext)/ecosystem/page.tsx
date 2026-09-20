"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ArrowRight,
  ArrowUpDown,
  Hexagon,
  Layers,
  Coins,
  Leaf,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Link } from "@/i18n/routing";
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

interface EcosystemMarket {
  id: string;
  symbol: string;
  currency: string;
  pair: string;
  status: boolean;
  metadata?: {
    precision?: { amount: number; price: number };
    limits?: {
      amount?: { min: number; max: number };
      price?: { min: number; max: number };
      cost?: { min: number; max: number };
    };
    taker?: number;
    maker?: number;
  };
}

export default function EcosystemMarketPage() {
  const t = useTranslations("common");
  const [markets, setMarkets] = useState<EcosystemMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
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
          url: "/api/ecosystem/market",
          silent: true,
        });
        if (error || !data) {
          setMarkets([]);
          return;
        }
        setMarkets(
          Array.isArray(data)
            ? data.map((market: any) => ({
                ...market,
                displaySymbol: `${market.currency}/${market.pair}`,
                symbol: market.symbol || `${market.currency}/${market.pair}`,
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
  }, []);

  const processedMarkets = useMemo(() => {
    if (!markets.length) return [];
    return markets
      .filter((market) => {
        const matchesSearch =
          market.currency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          market.pair?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          market.symbol?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => {
        let aValue, bValue;
        switch (sortBy) {
          case "name":
            aValue = a.currency || "";
            bValue = b.currency || "";
            return sortOrder === "desc"
              ? bValue.localeCompare(aValue)
              : aValue.localeCompare(bValue);
          case "pair":
            aValue = a.pair || "";
            bValue = b.pair || "";
            return sortOrder === "desc"
              ? bValue.localeCompare(aValue)
              : aValue.localeCompare(bValue);
          default:
            aValue = a.currency || "";
            bValue = b.currency || "";
            return sortOrder === "desc"
              ? bValue.localeCompare(aValue)
              : aValue.localeCompare(bValue);
        }
      });
  }, [markets, searchTerm, sortBy, sortOrder]);

  // Group markets by pair (quote currency)
  const marketsByPair = useMemo(() => {
    const groups: Record<string, EcosystemMarket[]> = {};
    processedMarkets.forEach((market) => {
      const pair = market.pair || "OTHER";
      if (!groups[pair]) {
        groups[pair] = [];
      }
      groups[pair].push(market);
    });
    return groups;
  }, [processedMarkets]);

  const uniquePairs = useMemo(() => {
    return Object.keys(marketsByPair).sort();
  }, [marketsByPair]);

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
    const totalPairs = uniquePairs.length;
    const uniqueTokens = new Set(processedMarkets.map((m) => m.currency)).size;
    return { totalMarkets, totalPairs, uniqueTokens };
  }, [processedMarkets, uniquePairs]);

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
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-950/50 dark:to-teal-950/50 border border-emerald-200 dark:border-emerald-800/50 rounded-full px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-4 md:mb-6"
              >
                <Hexagon className="w-4 h-4" />
                {t("ecosystem_markets")}
              </motion.div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 md:mb-6">
                {t("trade_native")}
                <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-clip-text text-transparent">
                  {" "}
                  Tokens
                </span>
              </h1>

              <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-300 max-w-3xl mx-auto leading-relaxed mb-6 md:mb-8">
                {t("trade_native_blockchain_tokens_with_direct")}
              </p>

              {/* Market Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  {
                    label: "Markets",
                    value: stats.totalMarkets,
                    icon: Layers,
                    color: "emerald",
                  },
                  {
                    label: "Trading Pairs",
                    value: stats.totalPairs,
                    icon: Coins,
                    color: "teal",
                  },
                  {
                    label: "Tokens",
                    value: stats.uniqueTokens,
                    icon: Leaf,
                    color: "green",
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
                          stat.color === "emerald" &&
                            "bg-emerald-100 dark:bg-emerald-900/30",
                          stat.color === "teal" &&
                            "bg-teal-100 dark:bg-teal-900/30",
                          stat.color === "green" &&
                            "bg-green-100 dark:bg-green-900/30"
                        )}
                      >
                        <stat.icon
                          className={cn(
                            "w-4 h-4",
                            stat.color === "emerald" &&
                              "text-emerald-600 dark:text-emerald-400",
                            stat.color === "teal" &&
                              "text-teal-600 dark:text-teal-400",
                            stat.color === "green" &&
                              "text-green-600 dark:text-green-400"
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
                    placeholder={t("search_ecosystem_markets_ellipsis")}
                    value={searchTerm}
                    icon={"mdi:search"}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-zinc-200 dark:border-zinc-700 h-11"
                  />
                </div>

                {/* Filters and Sort Container */}
                <div className="flex gap-3 w-full sm:w-auto">
                  {/* Filter by Pair Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-11 px-4 bg-white/80 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 min-w-[120px] justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4" />
                          <span>
                            {selectedFilter === "all"
                              ? "All Pairs"
                              : selectedFilter}
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
                            "bg-emerald-50 dark:bg-emerald-950"
                        )}
                      >
                        <Layers className="w-4 h-4 mr-2" />
                        {t("all_pairs")}
                      </DropdownMenuItem>
                      {uniquePairs.map((pair) => (
                        <DropdownMenuItem
                          key={pair}
                          onClick={() => setSelectedFilter(pair)}
                          className={cn(
                            "cursor-pointer",
                            selectedFilter === pair &&
                              "bg-emerald-50 dark:bg-emerald-950"
                          )}
                        >
                          <Coins className="w-4 h-4 mr-2 text-emerald-600" />
                          {pair}
                        </DropdownMenuItem>
                      ))}
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
                            {sortBy === "name" && "Token"}
                            {sortBy === "pair" && "Pair"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {sortOrder === "desc" ? "↓" : "↑"}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => setSortBy("name")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "name" &&
                            "bg-emerald-50 dark:bg-emerald-950"
                        )}
                      >
                        <Leaf className="w-4 h-4 mr-2" />
                        {t("token_name")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("pair")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "pair" &&
                            "bg-emerald-50 dark:bg-emerald-950"
                        )}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        {t("trading_pair")}
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
                <div>Token</div>
                <div className="text-right md:col-span-1">Pair</div>
                <div className="hidden md:block text-right">Type</div>
                <div className="hidden md:block text-right">Action</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-zinc-200/50 dark:divide-zinc-700/50">
                {isLoading ? (
                  renderSkeletonRows()
                ) : processedMarkets.filter(
                    (m) =>
                      selectedFilter === "all" || m.pair === selectedFilter
                  ).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 md:w-8 md:h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      {t("no_ecosystem_markets_found")}
                    </h3>
                    <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400">
                      {t("try_adjusting_your_search_or_filter_criteria")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {processedMarkets
                      .filter(
                        (m) =>
                          selectedFilter === "all" || m.pair === selectedFilter
                      )
                      .map((market, index) => (
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
                            href={`/trade?symbol=${market.symbol.replace("/", "-")}&type=spot-eco`}
                            className="absolute inset-0 z-10"
                            aria-label={`Trade ${market.currency}/${market.pair}`}
                          />

                          {/* Mobile hover indicator */}
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 md:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-4 h-4 text-emerald-500" />
                          </div>

                          {/* Token */}
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
                                src={`/img/crypto/${market.currency?.toLowerCase()}.webp`}
                                alt={market.currency || "token"}
                                width={32}
                                height={32}
                                className="w-6 h-6 md:w-8 md:h-8 object-cover rounded-full"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (!target.dataset.fallbackAttempted) {
                                    target.dataset.fallbackAttempted = "true";
                                    target.src = `/img/crypto/generic.webp`;
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-sm md:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
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

                          {/* Pair */}
                          <div className="flex items-center justify-end">
                            <div
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-lg font-semibold text-sm",
                                "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                              )}
                            >
                              <Coins className="w-3 h-3" />
                              {market.pair}
                            </div>
                          </div>

                          {/* Type */}
                          <div className="hidden md:flex items-center justify-end">
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              <Hexagon className="w-3 h-3" />
                              Native
                            </div>
                          </div>

                          {/* Action */}
                          <div className="hidden md:flex items-center justify-end">
                            <button
                              onClick={() =>
                                (window.location.href = `/trade?symbol=${market.symbol.replace("/", "-")}&type=spot-eco`)
                              }
                              className="group/btn relative px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg font-medium text-white transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                              <Hexagon className="w-4 h-4" />
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
                    ? "Ready to Trade Native Tokens?"
                    : "Start Ecosystem Trading Today"}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-300 mb-6 max-w-2xl mx-auto">
                  {user
                    ? "Choose any market above and start trading native blockchain tokens with full custody and lower fees."
                    : "Join our platform and experience decentralized trading with direct wallet integration and multi-chain support."}
                </p>
                {user ? (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {processedMarkets.length > 0 && (
                      <Link
                        href={`/trade?symbol=${processedMarkets[0].symbol.replace("/", "-")}&type=spot-eco`}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        {t("start_trading")}
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/register"
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      {t("create_free_account")}
                    </Link>
                    {processedMarkets.length > 0 && (
                      <Link
                        href={`/trade?symbol=${processedMarkets[0].symbol.replace("/", "-")}&type=spot-eco`}
                        className={cn(
                          "px-6 py-3 rounded-lg font-medium transition-all duration-300 border",
                          isDark
                            ? "border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 text-white"
                            : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
                        )}
                      >
                        {t("view_demo")}
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
