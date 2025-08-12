"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Filter, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function StakingPoolsPage() {
  const t = useTranslations("ext");
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenFilter, setTokenFilter] = useState("");
  const [aprRange, setAprRange] = useState<[number, number]>([0, 20]);
  const [sortBy, setSortBy] = useState("apr_desc");
  const [showFilters, setShowFilters] = useState(false);

  // Subscribe to global store state
  const pools = userStakingStore((state) => state.pools);
  const isLoading = userStakingStore((state) => state.isLoading);
  const error = userStakingStore((state) => state.error);
  const getPools = userStakingStore((state) => state.getPools);

  // Fetch pools on mount
  useEffect(() => {
    getPools({ status: "ACTIVE" });
  }, [getPools]);

  // Get unique tokens from pools
  const uniqueTokens = useMemo(() => {
    return [...new Set(pools.map((pool) => pool.token))];
  }, [pools]);

  // Derive filtered and sorted pools
  const filteredPools = useMemo(() => {
    let result = [...pools];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (pool) =>
          pool.name.toLowerCase().includes(query) ||
          pool.token.toLowerCase().includes(query) ||
          pool.symbol.toLowerCase().includes(query)
      );
    }

    // Apply token filter if not "all" and not empty
    if (tokenFilter && tokenFilter !== "all") {
      result = result.filter((pool) => pool.token === tokenFilter);
    }

    // Apply APR range filter
    result = result.filter(
      (pool) => pool.apr >= aprRange[0] && pool.apr <= aprRange[1]
    );

    // Apply sorting based on selected criteria
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
        // Default: promoted pools first, then sort by APR descending
        result.sort((a, b) => {
          if (a.isPromoted && !b.isPromoted) return -1;
          if (!a.isPromoted && b.isPromoted) return 1;
          return b.apr - a.apr;
        });
    }

    return result;
  }, [pools, searchQuery, tokenFilter, aprRange, sortBy]);

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {t("staking_pools")}
          </h1>
          <p className="text-muted-foreground">
            {t("browse_and_select_passive_income")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden"
        >
          <Filter className="mr-2 h-4 w-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className={`lg:block ${showFilters ? "block" : "hidden"}`}>
          <div className="bg-card rounded-lg border p-6 sticky top-20">
            <h2 className="font-semibold text-lg mb-4">{t("Filters")}</h2>
            <div className="space-y-6">
              <Input
                type="search"
                title="Search"
                placeholder="Search pools..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon="mdi:magnify"
              />

              <Select
                value={tokenFilter || "all"}
                onValueChange={(value) => setTokenFilter(value)}
              >
                <SelectTrigger className="w-full" title="Token">
                  <SelectValue placeholder="All tokens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all_tokens")}</SelectItem>
                  {uniqueTokens.map((token) => (
                    <SelectItem key={token} value={token}>
                      {token}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium">
                    {t("apr_range")}
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {aprRange[0]}
                    % -
                    {aprRange[1]}%
                  </span>
                </div>
                <Slider
                  defaultValue={aprRange}
                  min={0}
                  max={20}
                  step={0.5}
                  onValueChange={(value) =>
                    setAprRange(value as [number, number])
                  }
                  className="my-4"
                />
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full" title="Sort By">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apr_desc">{t("highest_apr")}</SelectItem>
                  <SelectItem value="apr_asc">{t("lowest_apr")}</SelectItem>
                  <SelectItem value="lock_asc">
                    {t("shortest_lock_period")}
                  </SelectItem>
                  <SelectItem value="lock_desc">
                    {t("longest_lock_period")}
                  </SelectItem>
                  <SelectItem value="staked_desc">
                    {t("most_staked")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchQuery("");
                  setTokenFilter("");
                  setAprRange([0, 20]);
                  setSortBy("apr_desc");
                }}
              >
                {t("reset_filters")}
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="text-red-500 mb-4">
                {t("error_loading_staking_pools")}
                {error}
              </div>
              <Button onClick={() => getPools({ status: "ACTIVE" })}>
                {t("try_again")}
              </Button>
            </div>
          ) : filteredPools.length === 0 ? (
            <div className="text-center py-20 bg-muted/30 rounded-lg">
              <div className="mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <SearchX className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("no_staking_pools_found")}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {searchQuery
                  ? "No pools match your search criteria. Try adjusting your filters or search term."
                  : "There are currently no staking pools available. Check back soon for new opportunities."}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setTokenFilter("");
                    setAprRange([0, 20]);
                    setSortBy("apr_desc");
                  }}
                >
                  {t("clear_filters")}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPools.map((pool) => (
                <PoolCard key={pool.id} pool={pool} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
