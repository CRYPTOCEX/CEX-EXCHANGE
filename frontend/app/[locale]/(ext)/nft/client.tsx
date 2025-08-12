"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Sparkles, 
  Users, 
  Eye,
  Heart,
  ShoppingBag,
  Zap,
  ArrowRight,
  Play,
  Globe,
  Palette
} from "lucide-react";
import { useNftStore } from "@/store/nft/nft-store";
import { Link } from "@/i18n/routing";
import NFTCard from "./components/nft-card";
import CollectionCard from "./components/collection-card";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { $fetch } from "@/lib/api";

export default function NFTClient() {
  const t = useTranslations("nft");
  const {
    tokens,
    collections,
    categories,
    loading,
    fetchTokens,
    fetchCollections,
    fetchCategories,
  } = useNftStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [priceRange, setPriceRange] = useState("all");
  const [priceRanges, setPriceRanges] = useState<Array<{ value: string; label: string }>>([]);
  const [stats, setStats] = useState({
    totalNFTs: 0,
    totalCollections: 0,
    totalVolume: 0,
    totalUsers: 0,
    totalSales: 0,
    averagePrice: 0,
    activeListings: 0,
    floorPrice: 0,
  });
  const [trendingCollections, setTrendingCollections] = useState<any[]>([]);
  const [featuredNFTs, setFeaturedNFTs] = useState<any[]>([]);

  const handleFetchTokens = useCallback(
    (params?: {
      search?: string;
      categoryId?: string;
      sortBy?: string;
      priceRange?: string;
    }) => {
      fetchTokens(params);
    },
    [fetchTokens]
  );

  const fetchPriceRanges = useCallback(async () => {
    // Use static price ranges since endpoint doesn't exist
    setPriceRanges([
      { value: "0-1", label: t("under_1_eth") },
      { value: "1-5", label: '1-5 ETH' },
      { value: "5-10", label: '5-10 ETH' },
      { value: "10+", label: '10+ ETH' },
    ]);
  }, [t]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await $fetch({
        url: `/api/nft/stats`,
        silentSuccess: true,
      });

      if (statsData && !statsData.error) {
        const data = statsData.data || statsData;
        setStats({
          totalNFTs: Number(data?.totalNFTs) || 0,
          totalCollections: Number(data?.totalCollections) || 0,
          totalVolume: Number(data?.totalVolume) || 0,
          totalUsers: Number(data?.totalUsers) || 0,
          totalSales: Number(data?.totalSales) || 0,
          averagePrice: Number(data?.averagePrice) || 0,
          activeListings: Number(data?.activeListings) || 0,
          floorPrice: Number(data?.floorPrice) || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Keep default stats on error - don't reset to undefined
    }
  }, []);

  const fetchTrendingCollections = useCallback(async () => {
    try {
      const collectionsData = await $fetch({
        url: `/api/nft/trending/collections?limit=6`,
        silentSuccess: true,
      });

      if (collectionsData && !collectionsData.error) {
        setTrendingCollections(collectionsData.data || collectionsData);
      }
    } catch (error) {
      console.error("Error fetching trending collections:", error);
    }
  }, []);

  const fetchFeaturedNFTs = useCallback(async () => {
    try {
      const nftsData = await $fetch({
        url: `/api/nft/featured/tokens?limit=12`,
        silentSuccess: true,
      });

      if (nftsData && !nftsData.error) {
        setFeaturedNFTs(nftsData.data || nftsData);
      }
    } catch (error) {
      console.error("Error fetching featured NFTs:", error);
    }
  }, []);

  useEffect(() => {
    handleFetchTokens();
    fetchCollections();
    fetchCategories();
    fetchPriceRanges();
    fetchStats();
    fetchTrendingCollections();
    fetchFeaturedNFTs();
  }, []); // Remove dependencies to prevent re-renders

  const handleSearch = useCallback(() => {
    handleFetchTokens({
      search: searchQuery,
      categoryId: selectedCategory === "all" ? undefined : selectedCategory,
      sortBy,
      priceRange: priceRange === "all" ? undefined : priceRange,
    });
  }, [searchQuery, selectedCategory, sortBy, priceRange, handleFetchTokens]);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory("all");
    setSortBy("recent");
    setPriceRange("all");
    setSearchQuery("");
    handleFetchTokens();
  }, [handleFetchTokens]);

  // Remove the full-page loading check

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              {t("discover_unique_digital_assets")}
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("discover_digital_art_&_collectibles")}
        </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          {t("buy_sell_and_trade")}
        </p>
        
        {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={t("search_nfts_collections_or_creators")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-32 h-14 text-lg border-2 focus:border-primary"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
                <Button 
                  onClick={handleSearch} 
                  className="absolute right-2 top-2 h-10"
                >
            {t("Search")}
          </Button>
        </div>
      </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/nft/marketplace">
                <Button size="lg" className="min-w-40">
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  {t("explore_marketplace")}
                </Button>
              </Link>
              <Link href="/nft/create">
                <Button variant="outline" size="lg" className="min-w-40">
                  <Palette className="h-5 w-5 mr-2" />
                  {t("create_nft")}
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                  {(stats?.totalNFTs || 0).toLocaleString()}+
                </div>
                <div className="text-sm text-muted-foreground">{t("NFTs")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                  {(stats?.totalCollections || 0).toLocaleString()}+
                </div>
                <div className="text-sm text-muted-foreground">{t("Collections")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                  {(stats?.totalVolume || 0).toLocaleString()}Ξ
                </div>
                <div className="text-sm text-muted-foreground">{t("total_volume")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                  {(stats?.totalUsers || 0).toLocaleString()}+
                </div>
                <div className="text-sm text-muted-foreground">{t("Users")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("why_choose_our_marketplace")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("discover_the_features_that_make_us_unique")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t("instant_transactions")}</h3>
                <p className="text-muted-foreground">
                  {t("lightning_fast_blockchain_transactions")}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t("global_marketplace")}</h3>
                <p className="text-muted-foreground">
                  {t("connect_with_creators_worldwide")}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t("verified_creators")}</h3>
                <p className="text-muted-foreground">
                  {t("authentic_artwork_from_verified_artists")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trending Collections */}
      {Array.isArray(trendingCollections) && trendingCollections.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">
                  {t("trending_collections")}
                </h2>
                <p className="text-muted-foreground">
                  {t("discover_the_hottest_collections")}
                </p>
              </div>
              <Link href="/nft/marketplace">
                <Button variant="outline">
                  {t("view_all")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured NFTs */}
      {Array.isArray(featuredNFTs) && featuredNFTs.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">
                  {t("featured_nfts")}
                </h2>
                <p className="text-muted-foreground">
                  {t("handpicked_digital_assets_from_top_creators")}
                </p>
              </div>
              <Link href="/nft/marketplace">
                <Button variant="outline">
                  {t("view_all")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredNFTs.map((token) => (
                <NFTCard key={token.id} token={token} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filters & Content */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("all_categories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_categories")}</SelectItem>
                {Array.isArray(categories) && categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("sort_by")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t("recently_added")}</SelectItem>
            <SelectItem value="price_low">{t("price_low_to_high")}</SelectItem>
            <SelectItem value="price_high">{t("price_high_to_low")}</SelectItem>
            <SelectItem value="popular">{t("most_popular")}</SelectItem>
            <SelectItem value="ending_soon">{t("ending_soon")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priceRange} onValueChange={setPriceRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("price_range")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_prices")}</SelectItem>
                {Array.isArray(priceRanges) && priceRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>

            <Button variant="outline" onClick={handleClearFilters}>
          <Filter className="h-4 w-4 mr-2" />
          {t("clear_filters")}
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="nfts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
          <TabsTrigger value="nfts">{t("NFTs")}</TabsTrigger>
          <TabsTrigger value="collections">{t("Collections")}</TabsTrigger>
        </TabsList>

        <TabsContent value="nfts">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="aspect-square bg-muted rounded-t-lg" />
                      <CardContent className="p-4 space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-6 bg-muted rounded w-1/2" />
                        <div className="h-4 bg-muted rounded w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : Array.isArray(tokens) && tokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tokens.map((token) => (
                <NFTCard key={token.id} token={token} />
              ))}
            </div>
          ) : (
                <Card className="text-center py-16">
                  <CardContent>
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                      <Eye className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {t("no_nfts_found")}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                {t("no_nfts_found_matching_your_criteria")}
              </p>
                    <div className="flex gap-4 justify-center">
                      <Button onClick={handleClearFilters}>
                        {t("view_all_nfts")}
                      </Button>
                      <Link href="/nft/create">
                        <Button variant="outline">
                          {t("create_first_nft")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
          )}
        </TabsContent>

        <TabsContent value="collections">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="aspect-square bg-muted rounded-t-lg" />
                      <CardContent className="p-4 space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-6 bg-muted rounded w-1/2" />
                        <div className="h-4 bg-muted rounded w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : Array.isArray(collections) && collections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          ) : (
                <Card className="text-center py-16">
                  <CardContent>
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                      <Palette className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {t("no_collections_found")}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                {t("no_collections_found_matching_your_criteria")}
              </p>
                    <div className="flex gap-4 justify-center">
                      <Button onClick={() => fetchCollections()}>
                {t("view_all_collections")}
              </Button>
                      <Link href="/nft/create">
                        <Button variant="outline">
                          {t("create_collection")}
                        </Button>
                      </Link>
            </div>
                  </CardContent>
                </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
      </section>
    </div>
  );
} 