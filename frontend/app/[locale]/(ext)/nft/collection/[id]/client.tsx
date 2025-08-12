"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { formatCurrency, formatNumber } from "@/utils/format";
import {
  Shield,
  ExternalLink,
  Search,
  Filter,
  Grid,
  List,
  TrendingUp,
  Users,
  Eye,
  Heart,
  Tag,
  Activity,
  BarChart3,
} from "lucide-react";

interface CollectionDetailClientProps {
  initialCollection: any;
}

export default function CollectionDetailClient({ initialCollection }: CollectionDetailClientProps) {
  const t = useTranslations("nft/collection");

  const [collection, setCollection] = useState(initialCollection);
  const [tokens, setTokens] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recently_created");
  const [filterBy, setFilterBy] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }, []);

  const fetchTokens = useCallback(async (loadMore = false) => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        collectionId: collection.id,
        search: searchQuery,
        sortBy,
        page: loadMore ? page + 1 : 1,
        limit: 20,
      };
      
      if (filterBy !== "all") {
        params.filterBy = filterBy;
      }

      const { data, error } = await $fetch({
        url: `/api/nft/token`,
        params,
      });

      if (!error && data) {
        if (loadMore) {
          setTokens(prev => [...prev, ...(data.data || [])]);
          setPage(prev => prev + 1);
        } else {
          setTokens(data.data || []);
          setPage(1);
        }
        setHasMore(data.pagination?.page < data.pagination?.totalPages);
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setIsLoading(false);
    }
  }, [collection.id, searchQuery, sortBy, filterBy, page]);

  const fetchActivities = useCallback(async () => {
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/activity`,
        params: {
          collectionId: collection.id,
          limit: 10,
        },
      });

      if (!error && data) {
        setActivities(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  }, [collection.id]);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/collection/${collection.id}/stats`,
      });

      if (!error && data) {
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [collection.id]);

  useEffect(() => {
    fetchTokens();
    fetchActivities();
    fetchStats();
  }, [fetchTokens, fetchActivities, fetchStats]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchTokens(true);
    }
  }, [isLoading, hasMore, fetchTokens]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Collection Header */}
      <div className="relative">
        {/* Banner */}
        <div className="h-64 bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden">
          {collection.bannerImage && (
            <img
              src={collection.bannerImage}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Collection Info */}
        <div className="container mx-auto px-4 relative -mt-16">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Logo */}
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-background">
                <AvatarImage src={collection.logoImage} />
                <AvatarFallback className="text-2xl">
                  {collection.name?.[0]}
                </AvatarFallback>
              </Avatar>
              {collection.isVerified && (
                <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-2">
                  <Shield className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-white">{collection.name}</h1>
                  {collection.isVerified && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-100">
                      {t("Verified")}
                    </Badge>
                  )}
                </div>
                {collection.description && (
                  <p className="text-gray-200 max-w-2xl leading-relaxed">
                    {collection.description}
                  </p>
                )}
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-2">
                {collection.website && (
                  <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t("Website")}
                  </Button>
                )}
                {collection.discord && (
                  <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Discord
                  </Button>
                )}
                {collection.twitter && (
                  <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Twitter
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{formatNumber(stats.totalItems || 0)}</div>
              <div className="text-sm text-muted-foreground">{t("Items")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{formatNumber(stats.owners || 0)}</div>
              <div className="text-sm text-muted-foreground">{t("Owners")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{formatCurrency(stats.floorPrice || 0)}</div>
              <div className="text-sm text-muted-foreground">{t("floor_price")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{formatCurrency(stats.totalVolume || 0)}</div>
              <div className="text-sm text-muted-foreground">{t("total_volume")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{formatNumber(stats.totalSales || 0)}</div>
              <div className="text-sm text-muted-foreground">{t("Sales")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{formatNumber(stats.listed || 0)}</div>
              <div className="text-sm text-muted-foreground">{t("Listed")}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search_nfts_in_this_collection")}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("sort_by")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recently_created">{t("recently_created")}</SelectItem>
                <SelectItem value="recently_listed">{t("recently_listed")}</SelectItem>
                <SelectItem value="price_low_to_high">{t("price_low_to_high")}</SelectItem>
                <SelectItem value="price_high_to_low">{t("price_high_to_low")}</SelectItem>
                <SelectItem value="most_liked">{t("most_liked")}</SelectItem>
                <SelectItem value="most_viewed">{t("most_viewed")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("Filter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_items")}</SelectItem>
                <SelectItem value="buy_now">{t("buy_now")}</SelectItem>
                <SelectItem value="on_auction">{t("on_auction")}</SelectItem>
                <SelectItem value="new">{t("New")}</SelectItem>
                <SelectItem value="has_offers">{t("has_offers")}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* NFTs Grid */}
          <div className="lg:col-span-3">
            {isLoading && tokens.length === 0 ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : tokens.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-muted-foreground">
                    {searchQuery ? t("no_nfts_found_matching_your_search") : t("no_nfts_in_this_collection_yet")}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className={`grid gap-4 ${
                  viewMode === "grid" 
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                    : "grid-cols-1"
                }`}>
                  {tokens.map((token: any) => (
                    <Link key={token.id} href={`/nft/${token.id}`}>
                      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
                        <CardContent className="p-0">
                          <div className={`${viewMode === "grid" ? "aspect-square" : "aspect-video md:aspect-square lg:aspect-video"} relative overflow-hidden rounded-t-lg`}>
                            <img
                              src={token.image || "/img/placeholder.svg"}
                              alt={token.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            {token.rarity && (
                              <Badge className="absolute top-2 left-2" variant="secondary">
                                {token.rarity}
                              </Badge>
                            )}
                            <div className="absolute top-2 right-2 flex gap-1">
                              {token.likes > 0 && (
                                <Badge variant="secondary" className="bg-black/50 text-white">
                                  <Heart className="h-3 w-3 mr-1" />
                                  {formatNumber(token.likes)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="p-4 space-y-2">
                            <h3 className="font-semibold truncate">{token.name}</h3>
                            {token.currentListing && (
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                  {token.currentListing.type === "AUCTION" ? t("current_bid") : t("Price")}
                                </div>
                                <div className="font-medium">
                                  {formatCurrency(token.currentListing.price)} {token.currentListing.currency}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>#{token.tokenId}</span>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {formatNumber(token.views || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="text-center mt-8">
                    <Button
                      onClick={handleLoadMore}
                      disabled={isLoading}
                      variant="outline"
                      size="lg"
                    >
                      {isLoading ? <LoadingSpinner /> : null}
                      {t("load_more")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {t("recent_activity")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activities.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    {t("no_recent_activity")}
                  </div>
                ) : (
                  activities.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex items-center gap-3 text-sm">
                      <div className="p-1 bg-accent rounded">
                        <Activity className="h-3 w-3" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{activity.type}</div>
                        {activity.price && (
                          <div className="text-muted-foreground">
                            {formatCurrency(activity.price)} {activity.currency}
                          </div>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatTimeAgo(activity.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Collection Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t("collection_details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Blockchain")}</span>
                  <span className="font-medium">{collection.chain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("contract_standard")}</span>
                  <span className="font-medium">{collection.standard}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("creator_royalty")}</span>
                  <span className="font-medium">{collection.royaltyPercentage || 0}%</span>
                </div>
                {collection.totalSupply && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("total_supply")}</span>
                    <span className="font-medium">{formatNumber(collection.totalSupply)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Created")}</span>
                  <span className="font-medium">{formatTimeAgo(collection.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 