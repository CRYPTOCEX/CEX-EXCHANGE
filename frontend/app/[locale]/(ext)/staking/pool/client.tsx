"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  SearchX,
  TrendingUp,
  Layers,
  Clock,
  Flame,
  Star,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { userStakingStore } from "@/store/staking/user";
import PoolCard from "../components/pool-card";
import { useTranslations } from "next-intl";
import PoolListLoading from "./loading";
import PoolListErrorState from "./error-state";
import { HeroSection } from "@/components/ui/hero-section";

type QuickFilter = "all" | "featured" | "high_apr" | "short_lock" | "popular";

export default function StakingPoolsPage() {
  const t = useTranslations("ext_staking");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  const [searchQuery, setSearchQuery] = useState("");
  const [tokenFilter, setTokenFilter] = useState("");
  const [aprRange, setAprRange] = useState<[number, number]>([0, 500]);
  const [sortBy, setSortBy] = useState("apr_desc");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const pools = userStakingStore((state) => state.pools);
  const isLoading = userStakingStore((state) => state.isLoading);
  const error = userStakingStore((state) => state.error);
  const getPools = userStakingStore((state) => state.getPools);

  useEffect(() => {
    getPools({ status: "ACTIVE" });
  }, [getPools]);

  const uniqueTokens = useMemo(() => {
    return [...new Set(pools.map((pool) => pool.token))];
  }, [pools]);

  const applyQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter);
    setSearchQuery("");
    setTokenFilter("");

    switch (filter) {
      case "featured":
        setAprRange([0, 500]);
        setSortBy("apr_desc");
        break;
      case "high_apr":
        setAprRange([50, 500]);
        setSortBy("apr_desc");
        break;
      case "short_lock":
        setAprRange([0, 500]);
        setSortBy("lock_asc");
        break;
      case "popular":
        setAprRange([0, 500]);
        setSortBy("staked_desc");
        break;
      default:
        setAprRange([0, 500]);
        setSortBy("apr_desc");
    }
  };

  const filteredPools = useMemo(() => {
    let result = [...pools];

    if (quickFilter === "featured") {
      result = result.filter((pool) => pool.isPromoted);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (pool) =>
          pool.name.toLowerCase().includes(query) ||
          pool.token.toLowerCase().includes(query) ||
          pool.symbol.toLowerCase().includes(query)
      );
    }

    if (tokenFilter && tokenFilter !== "all") {
      result = result.filter((pool) => pool.token === tokenFilter);
    }

    result = result.filter(
      (pool) => pool.apr >= aprRange[0] && pool.apr <= aprRange[1]
    );

    switch (sortBy) {
      case "apr_desc":
        result.sort((a, b) => b.apr - a.apr);
        break;
      case "apr_asc":
        result.sort((a, b) => a.apr - b.apr);
        break;
      case "lock_asc":
        result.sort((a, b) => a.lockPeriod - b.lockPeriod);
        break;
      case "lock_desc":
        result.sort((a, b) => b.lockPeriod - a.lockPeriod);
        break;
      case "staked_desc":
        result.sort((a, b) => (b.totalStaked ?? 0) - (a.totalStaked ?? 0));
        break;
      default:
        result.sort((a, b) => {
          if (a.isPromoted && !b.isPromoted) return -1;
          if (!a.isPromoted && b.isPromoted) return 1;
          return b.apr - a.apr;
        });
    }

    return result;
  }, [pools, searchQuery, tokenFilter, aprRange, sortBy, quickFilter]);

  const hasActiveFilters =
    searchQuery ||
    (tokenFilter && tokenFilter !== "all") ||
    aprRange[0] > 0 ||
    aprRange[1] < 500;

  const clearAllFilters = () => {
    setSearchQuery("");
    setTokenFilter("");
    setAprRange([0, 500]);
    setSortBy("apr_desc");
    setQuickFilter("all");
  };

  const quickFilters = [
    { id: "all" as QuickFilter, label: tExt("all_pools"), icon: Layers },
    { id: "featured" as QuickFilter, label: tExt("featured"), icon: Star },
    { id: "high_apr" as QuickFilter, label: t("high_apr"), icon: Flame },
    { id: "short_lock" as QuickFilter, label: t("short_lock"), icon: Clock },
    { id: "popular" as QuickFilter, label: tCommon("popular"), icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Header */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: t("staking_pools"),
          gradient: `from-violet-500/10 to-indigo-500/10`,
          iconColor: `text-violet-500`,
          textColor: `text-violet-600 dark:text-violet-400`,
        }}
        title={[
          { text: tCommon("discover") + " " },
          { text: t("staking_pools"), gradient: `from-violet-600 via-indigo-500 to-violet-600 dark:from-violet-400 dark:via-indigo-400 dark:to-violet-400` },
        ]}
        description={t("browse_and_select_passive_income")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContent={
          <div className="flex gap-4">
            <div className="text-center px-6 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                {pools.length}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {tCommon("active_pools")}
              </div>
            </div>
          </div>
        }
        background={{
          orbs: [
            {
              color: "#8b5cf6",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#6366f1",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#8b5cf6", "#6366f1"],
          size: 8,
        }}
      />

      {/* Filters Section */}
      <div className="container mx-auto py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-4 mb-8"
        >
          {/* Main filter row */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Quick Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => applyQuickFilter(filter.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    quickFilter === filter.id
                      ? `bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20`
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  <filter.icon className="w-4 h-4" />
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Search, Sort & More Filters */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="relative flex-1 lg:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={t("search_pools") + "..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full lg:w-56 pl-10 pr-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-sm outline-none transition-all placeholder:text-zinc-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                  <SelectValue placeholder={tCommon("sort_by")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apr_desc">{t("highest_apr")}</SelectItem>
                  <SelectItem value="apr_asc">{t("lowest_apr")}</SelectItem>
                  <SelectItem value="lock_asc">{t("shortest_lock_period")}</SelectItem>
                  <SelectItem value="lock_desc">{t("longest_lock_period")}</SelectItem>
                  <SelectItem value="staked_desc">{t("most_staked")}</SelectItem>
                </SelectContent>
              </Select>

              {/* More Filters Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`rounded-xl border-zinc-200 dark:border-zinc-700 ${
                  showAdvanced || hasActiveFilters
                    ? `border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600`
                    : ""
                }`}
              >
                {tCommon("more")}
                <ChevronDown className={`w-4 h-4 ml-1.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Expandable Advanced Filters */}
          {showAdvanced && (
            <div className="pt-4 mt-4 border-t border-zinc-200/50 dark:border-zinc-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Token Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Token
                  </label>
                  <Select
                    value={tokenFilter || "all"}
                    onValueChange={(value) => setTokenFilter(value)}
                  >
                    <SelectTrigger className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                      <SelectValue placeholder={tExt("all_tokens")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tExt("all_tokens")}</SelectItem>
                      {uniqueTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* APR Range */}
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {t("apr_range")}
                    </label>
                    <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                      {aprRange[0]}% - {aprRange[1]}%
                    </span>
                  </div>
                  <Slider
                    value={aprRange}
                    min={0}
                    max={500}
                    step={5}
                    onValueChange={(value) => setAprRange(value as [number, number])}
                    className="mt-3"
                  />
                </div>

                {/* Reset Button */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="rounded-xl w-full"
                  >
                    {tCommon("reset_filters")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Active filters tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50">
              <span className="text-sm text-zinc-500">{tCommon("active")}:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {tokenFilter && tokenFilter !== "all" && (
                <Badge variant="secondary" className="gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  {tokenFilter}
                  <button
                    onClick={() => setTokenFilter("")}
                    className="ml-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {(aprRange[0] > 0 || aprRange[1] < 500) && (
                <Badge variant="secondary" className="gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  APR: {aprRange[0]}%-{aprRange[1]}%
                  <button
                    onClick={() => setAprRange([0, 500])}
                    className="ml-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              <button
                onClick={clearAllFilters}
                className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-400 font-medium ml-2"
              >
                {tCommon("clear_all")}
              </button>
            </div>
          )}
        </motion.div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {tCommon("showing")} <span className="font-semibold text-zinc-900 dark:text-white">{filteredPools.length}</span> {t("pools")}
          </p>
        </div>

        {/* Pool Grid */}
        {isLoading ? (
          <PoolListLoading />
        ) : error ? (
          <PoolListErrorState
            error={error}
            onRetry={() => getPools({ status: "ACTIVE" })}
          />
        ) : filteredPools.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50">
              <CardContent className="text-center py-20">
                <div className="w-20 h-20 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <SearchX className="h-10 w-10 text-violet-500" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">
                  {t("no_staking_pools_found")}
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-8">
                  {searchQuery || hasActiveFilters
                    ? t("no_pools_match_your_current_filters") + ". " + t("try_adjusting_your_search_criteria")
                    : t("there_are_currently_no_staking_pools_available")}.
                </p>
                {(searchQuery || hasActiveFilters) && (
                  <Button
                    onClick={clearAllFilters}
                    className="rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-600 text-white"
                  >
                    {tCommon("clear_filters")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPools.map((pool, index) => (
              <motion.div
                key={pool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.03 }}
              >
                <PoolCard pool={pool} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
