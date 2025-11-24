"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Coins,
  Clock,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useFilterStore,
  type SortOption,
} from "@/store/ico/offer/filter-store";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

// Define types for the options returned by the API endpoints
type BlockchainOption = {
  id: string;
  name: string;
  value: string;
  status: boolean;
};

type TokenTypeOption = {
  id: string;
  name: string;
  value: string;
  description: string;
  status: boolean;
};

export function OfferingsFilter() {
  const t = useTranslations("ext");
  const {
    filters,
    setSearch,
    setSort,
    toggleBlockchain,
    toggleTokenType,
    resetFilters,
    applyFilters,
  } = useFilterStore();

  const [searchValue, setSearchValue] = useState(filters.search);
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [expandedSections, setExpandedSections] = useState({
    blockchain: true,
    tokenType: true,
  });

  // Local state for dynamic options
  const [blockchainOptions, setBlockchainOptions] = useState<
    BlockchainOption[]
  >([]);
  const [tokenTypeOptions, setTokenTypeOptions] = useState<TokenTypeOption[]>(
    []
  );

  // Fetch blockchain and token type options on mount
  useEffect(() => {
    async function fetchOptions() {
      setIsLoading(true);
      try {
        const [blockchainData, tokenTypeData] = await Promise.all([
          $fetch({
            url: "/api/ico/blockchain",
            silent: true,
          }),
          $fetch({
            url: "/api/ico/token/type",
            silent: true,
          }),
        ]);

        setBlockchainOptions(blockchainData.data);
        setTokenTypeOptions(tokenTypeData.data);
      } catch (error) {
        console.error("Failed to fetch filter options", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOptions();
  }, []);

  // Calculate active filters count
  useEffect(() => {
    const blockchainCount = filters.blockchains.length > 0 ? 1 : 0;
    const tokenTypeCount = filters.tokenTypes.length > 0 ? 1 : 0;
    setActiveFiltersCount(blockchainCount + tokenTypeCount);
  }, [filters.blockchains, filters.tokenTypes]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchValue);
    applyFilters();
  };

  const handleSortChange = (value: string) => {
    setSort(value as SortOption);
    applyFilters();
  };

  const handleApplyFilters = () => {
    applyFilters();
  };

  const handleResetFilters = () => {
    resetFilters();
    setSearchValue("");
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setSearch("");
    applyFilters();
  };

  const toggleSection = (section: "blockchain" | "tokenType") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const filteredBlockchains =
    activeTab === "all"
      ? blockchainOptions
      : blockchainOptions.filter((_, index) => index < 3);

  const filteredTokenTypes =
    activeTab === "all"
      ? tokenTypeOptions
      : tokenTypeOptions.filter((_, index) => index < 3);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
          <Input
            type="search"
            placeholder="Search offerings by name, symbol..."
            value={searchValue}
            onChange={handleSearchChange}
            icon="mdi:magnify"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select defaultValue={filters.sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-[180px] h-10">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("newest_first")}</span>
                </div>
              </SelectItem>
              <SelectItem value="oldest">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("oldest_first")}</span>
                </div>
              </SelectItem>
              <SelectItem value="raised-high">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{t("most_raised")}</span>
                </div>
              </SelectItem>
              <SelectItem value="raised-low">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 transform rotate-180" />
                  <span>{t("least_raised")}</span>
                </div>
              </SelectItem>
              <SelectItem value="target-high">
                <div className="flex items-center gap-2">
                  <Coins className="h-3.5 w-3.5" />
                  <span>{t("highest_target")}</span>
                </div>
              </SelectItem>
              <SelectItem value="target-low">
                <div className="flex items-center gap-2">
                  <Coins className="h-3.5 w-3.5" />
                  <span>{t("lowest_target")}</span>
                </div>
              </SelectItem>
              <SelectItem value="ending-soon">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" />
                  <span>{t("ending_soon")}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showFilterCard ? "default" : "outline"}
            size="icon"
            className={cn(
              "relative h-10 w-10 transition-all duration-200",
              showFilterCard && "bg-primary text-primary-foreground"
            )}
            onClick={() => setShowFilterCard(!showFilterCard)}
          >
            <Filter className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <Badge
                className={cn(
                  "absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full",
                  showFilterCard
                    ? "bg-background text-foreground"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {activeFiltersCount}
              </Badge>
            )}
            <span className="sr-only">Filter</span>
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.blockchains.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.blockchains.map((chain) => {
                const blockchainName =
                  blockchainOptions.find((b) => b.value === chain)?.name ||
                  chain;
                return (
                  <Badge
                    key={chain}
                    variant="outline"
                    className="px-2 py-1 flex items-center gap-1 bg-secondary/40 hover:bg-secondary/60 transition-colors group"
                  >
                    <span>{blockchainName}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBlockchain(chain);
                      }}
                      className="group-hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">
                        Remove {blockchainName} filter
                      </span>
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {filters.tokenTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.tokenTypes.map((type) => {
                const typeName =
                  tokenTypeOptions.find((t) => t.value === type)?.name || type;
                return (
                  <Badge
                    key={type}
                    variant="outline"
                    className="px-2 py-1 flex items-center gap-1 bg-primary/10 hover:bg-primary/20 transition-colors group"
                  >
                    <span>{typeName}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTokenType(type);
                      }}
                      className="group-hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {typeName} filter</span>
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {(filters.blockchains.length > 0 ||
            filters.tokenTypes.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleResetFilters}
            >
              {t("clear_all")}
            </Button>
          )}
        </div>
      )}

      {/* Enhanced Filter Card */}
      {showFilterCard && (
        <Card className="w-full overflow-hidden border-primary/20 animate-in fade-in-50 zoom-in-95 duration-200">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">
                    {t("advanced_filters")}
                  </h3>
                </div>
                <Tabs
                  defaultValue={activeTab}
                  onValueChange={setActiveTab}
                  className="hidden sm:block"
                >
                  <TabsList className="bg-background/50">
                    <TabsTrigger value="popular" className="text-xs">
                      {t("Popular")}
                    </TabsTrigger>
                    <TabsTrigger value="all" className="text-xs">
                      {t("all_filters")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {isLoading ? (
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="h-5 bg-muted rounded animate-pulse w-1/4"></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="h-5 bg-muted rounded animate-pulse w-1/4"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="h-16 bg-muted rounded animate-pulse"></div>
                    <div className="h-16 bg-muted rounded animate-pulse"></div>
                    <div className="h-16 bg-muted rounded animate-pulse"></div>
                    <div className="h-16 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Blockchain Section */}
                <div className="space-y-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection("blockchain")}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-medium">{t("Blockchain")}</h3>
                    </div>
                    {expandedSections.blockchain ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {expandedSections.blockchain && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2 transition-all duration-200">
                      {filteredBlockchains.map((blockchain) => (
                        <div
                          key={blockchain.id}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-md border transition-all duration-200 cursor-pointer hover:border-primary/50",
                            filters.blockchains.includes(blockchain.value)
                              ? "bg-primary/10 border-primary"
                              : "bg-card hover:bg-secondary/40"
                          )}
                          onClick={() => toggleBlockchain(blockchain.value)}
                        >
                          <span className="text-sm">{blockchain.name}</span>
                          {filters.blockchains.includes(blockchain.value) && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))}

                      {activeTab !== "all" && blockchainOptions.length > 3 && (
                        <Button
                          variant="ghost"
                          className="text-xs h-9 justify-start text-muted-foreground hover:text-primary"
                          onClick={() => setActiveTab("all")}
                        >
                          + {blockchainOptions.length - 3}
                          {t("more")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <Separator className="my-2" />

                {/* Token Type Section */}
                <div className="space-y-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection("tokenType")}
                  >
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-medium">{t("token_type")}</h3>
                    </div>
                    {expandedSections.tokenType ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {expandedSections.tokenType && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 transition-all duration-200">
                      {filteredTokenTypes.map((type) => (
                        <div
                          key={type.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-md border transition-all duration-200 cursor-pointer hover:border-primary/50",
                            filters.tokenTypes.includes(type.value)
                              ? "bg-primary/10 border-primary"
                              : "bg-card hover:bg-secondary/40"
                          )}
                          onClick={() => toggleTokenType(type.value)}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {type.name}
                              </span>
                              {filters.tokenTypes.includes(type.value) && (
                                <Check className="h-3.5 w-3.5 text-primary" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      ))}

                      {activeTab !== "all" && tokenTypeOptions.length > 3 && (
                        <Button
                          variant="ghost"
                          className="text-xs h-9 justify-start text-muted-foreground hover:text-primary"
                          onClick={() => setActiveTab("all")}
                        >
                          + {tokenTypeOptions.length - 3}
                          {t("more")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4 border-t mt-4">
                  <Button
                    variant="outline"
                    onClick={handleResetFilters}
                    disabled={activeFiltersCount === 0}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    {t("Reset")}
                  </Button>
                  <Button onClick={handleApplyFilters} className="gap-2">
                    <Filter className="h-4 w-4" />
                    {t("apply_filters")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
