"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Search } from "lucide-react";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

interface ActivityFiltersProps {
  onFilterChange: (filters: ActivityFilters) => void;
  activeFilters: ActivityFilters;
}

export interface ActivityFilters {
  types: string[];
  collectionId?: string;
  creatorId?: string;
  tokenId?: string;
  search?: string;
}

const activityTypes = [
  { value: "MINT", label: "Mint", color: "bg-green-500" },
  { value: "TRANSFER", label: "Transfer", color: "bg-blue-500" },
  { value: "SALE", label: "Sale", color: "bg-purple-500" },
  { value: "LIST", label: "List", color: "bg-yellow-500" },
  { value: "DELIST", label: "Delist", color: "bg-gray-500" },
  { value: "BID", label: "Bid", color: "bg-orange-500" },
  { value: "OFFER", label: "Offer", color: "bg-pink-500" },
  { value: "BURN", label: "Burn", color: "bg-red-500" },
];

export function ActivityFilters({ onFilterChange, activeFilters }: ActivityFiltersProps) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const [collections, setCollections] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [searchQuery, setSearchQuery] = useState(activeFilters.search || "");

  // Fetch collections
  useEffect(() => {
    const fetchCollections = async () => {
      setLoadingCollections(true);
      try {
        const response = await $fetch({
          url: "/api/admin/nft/collection",
          params: { pageSize: 100 },
          silentSuccess: true,
        });
        if (response.data?.items) {
          setCollections(response.data.items);
        }
      } catch (error) {
        console.error("Failed to fetch collections:", error);
      } finally {
        setLoadingCollections(false);
      }
    };
    fetchCollections();
  }, []);

  // Fetch creators
  useEffect(() => {
    const fetchCreators = async () => {
      setLoadingCreators(true);
      try {
        const response = await $fetch({
          url: "/api/admin/nft/creator",
          params: { pageSize: 100 },
          silentSuccess: true,
        });
        if (response.data?.items) {
          setCreators(response.data.items);
        }
      } catch (error) {
        console.error("Failed to fetch creators:", error);
      } finally {
        setLoadingCreators(false);
      }
    };
    fetchCreators();
  }, []);

  // Fetch tokens when collection is selected
  useEffect(() => {
    if (!activeFilters.collectionId) {
      setTokens([]);
      return;
    }
    const fetchTokens = async () => {
      setLoadingTokens(true);
      try {
        const response = await $fetch({
          url: "/api/admin/nft/token",
          params: {
            ...(activeFilters.collectionId && { collectionId: activeFilters.collectionId }),
            pageSize: 100
          },
          silentSuccess: true,
        });
        if (response.data?.items) {
          setTokens(response.data.items);
        }
      } catch (error) {
        console.error("Failed to fetch tokens:", error);
      } finally {
        setLoadingTokens(false);
      }
    };
    fetchTokens();
  }, [activeFilters.collectionId]);

  const handleTypeToggle = (type: string) => {
    const newTypes = activeFilters.types.includes(type)
      ? activeFilters.types.filter(t => t !== type)
      : [...activeFilters.types, type];
    onFilterChange({ ...activeFilters, types: newTypes });
  };

  const handleCollectionChange = (value: string) => {
    onFilterChange({
      ...activeFilters,
      collectionId: value === "all" ? undefined : value,
      tokenId: undefined // Reset token when collection changes
    });
  };

  const handleCreatorChange = (value: string) => {
    onFilterChange({
      ...activeFilters,
      creatorId: value === "all" ? undefined : value
    });
  };

  const handleTokenChange = (value: string) => {
    onFilterChange({
      ...activeFilters,
      tokenId: value === "all" ? undefined : value
    });
  };

  const handleSearch = () => {
    onFilterChange({ ...activeFilters, search: searchQuery });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    onFilterChange({ ...activeFilters, search: undefined });
  };

  const handleClearAllFilters = () => {
    setSearchQuery("");
    onFilterChange({
      types: [],
      collectionId: undefined,
      creatorId: undefined,
      tokenId: undefined,
      search: undefined,
    });
  };

  const activeFilterCount =
    activeFilters.types.length +
    (activeFilters.collectionId ? 1 : 0) +
    (activeFilters.creatorId ? 1 : 0) +
    (activeFilters.tokenId ? 1 : 0) +
    (activeFilters.search ? 1 : 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filters</CardTitle>
              {activeFilterCount > 0 && (
                <Badge variant="secondary">{activeFilterCount}</Badge>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllFilters}
                className="h-8 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                {tCommon("clear_all")}
              </Button>
            )}
          </div>
          <CardDescription>
            {t("filter_activity_by_type_collection_creator_or_nft")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={t("transaction_hash_user_email_ellipsis")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  className="pl-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={handleClearSearch}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Activity Types */}
          <div className="space-y-3">
            <Label>{t("activity_type")}</Label>
            <div className="grid grid-cols-1 gap-2">
              {activityTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={activeFilters.types.includes(type.value)}
                    onCheckedChange={() => handleTypeToggle(type.value)}
                  />
                  <label
                    htmlFor={`type-${type.value}`}
                    className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <div className={`h-2 w-2 rounded-full ${type.color}`} />
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Collection Filter */}
          <div className="space-y-2">
            <Label htmlFor="collection">Collection</Label>
            <Select
              value={activeFilters.collectionId || "all"}
              onValueChange={handleCollectionChange}
              disabled={loadingCollections}
            >
              <SelectTrigger id="collection">
                <SelectValue placeholder={loadingCollections ? "Loading..." : "All Collections"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tExt("all_collections")}</SelectItem>
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Token Filter (only show when collection is selected) */}
          {activeFilters.collectionId && (
            <div className="space-y-2">
              <Label htmlFor="token">NFT Token</Label>
              <Select
                value={activeFilters.tokenId || "all"}
                onValueChange={handleTokenChange}
                disabled={loadingTokens}
              >
                <SelectTrigger id="token">
                  <SelectValue placeholder={loadingTokens ? "Loading..." : "All Tokens"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tExt("all_tokens")}</SelectItem>
                  {tokens.map((token) => (
                    <SelectItem key={token.id} value={token.id}>
                      {token.name} #{token.tokenId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Creator Filter */}
          <div className="space-y-2">
            <Label htmlFor="creator">Creator</Label>
            <Select
              value={activeFilters.creatorId || "all"}
              onValueChange={handleCreatorChange}
              disabled={loadingCreators}
            >
              <SelectTrigger id="creator">
                <SelectValue placeholder={loadingCreators ? "Loading..." : "All Creators"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_creators")}</SelectItem>
                {creators.map((creator) => (
                  <SelectItem key={creator.id} value={creator.id}>
                    {creator.displayName || creator.user?.email || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{tCommon("active_filters")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activeFilters.types.map((type) => {
                const typeConfig = activityTypes.find(t => t.value === type);
                return (
                  <Badge
                    key={type}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    <div className={`h-2 w-2 rounded-full ${typeConfig?.color}`} />
                    {typeConfig?.label}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTypeToggle(type);
                      }}
                      className="ml-1 rounded-sm hover:bg-destructive/10 p-0.5 cursor-pointer transition-colors"
                      aria-label={t("remove_filter")}
                    >
                      <X className="h-3 w-3 hover:text-destructive" />
                    </button>
                  </Badge>
                );
              })}
              {activeFilters.collectionId && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Collection
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCollectionChange("all");
                    }}
                    className="ml-1 rounded-sm hover:bg-destructive/10 p-0.5 cursor-pointer transition-colors"
                    aria-label={t("remove_filter")}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </button>
                </Badge>
              )}
              {activeFilters.tokenId && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Token
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTokenChange("all");
                    }}
                    className="ml-1 rounded-sm hover:bg-destructive/10 p-0.5 cursor-pointer transition-colors"
                    aria-label={t("remove_filter")}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </button>
                </Badge>
              )}
              {activeFilters.creatorId && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Creator
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreatorChange("all");
                    }}
                    className="ml-1 rounded-sm hover:bg-destructive/10 p-0.5 cursor-pointer transition-colors"
                    aria-label={t("remove_filter")}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </button>
                </Badge>
              )}
              {activeFilters.search && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  {tCommon("search")} {activeFilters.search}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearSearch();
                    }}
                    className="ml-1 rounded-sm hover:bg-destructive/10 p-0.5 cursor-pointer transition-colors"
                    aria-label={t("remove_filter")}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </button>
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
