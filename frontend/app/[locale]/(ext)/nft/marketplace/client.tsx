"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Grid3X3, 
  List,
  Gavel,
  ShoppingCart,
  Eye,
  Heart,
  Timer,
  Zap,
  Filter,
  X,
  SlidersHorizontal,
  TrendingUp,
  Clock,
  DollarSign
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useNftStore } from "@/store/nft/nft-store";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { $fetch } from "@/lib/api";
import { WalletOnboarding } from "@/components/ext/nft/WalletOnboarding";
import { useWalletOnboarding } from "@/hooks/ext/nft/useWalletOnboarding";

export default function MarketplaceClient() {
  const t = useTranslations("nft/marketplace");
  const {
    showOnboarding,
    completeOnboarding,
    skipOnboarding
  } = useWalletOnboarding();
  
  const { 
    listings, 
    categories, 
    collections,
    loading, 
    fetchListings, 
    fetchCategories, 
    fetchCollections,
    setFilters 
  } = useNftStore();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCollection, setSelectedCollection] = useState("all");
  const [sortBy, setSortBy] = useState("recently_listed");
  const [listingType, setListingType] = useState("all");
  const [sortOptions, setSortOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [endingSoon, setEndingSoon] = useState(false);
  const [hasOffers, setHasOffers] = useState(false);

  const handleFetchListings = useCallback((filters?: any) => {
    fetchListings(filters);
  }, [fetchListings]);

  const fetchSortOptions = useCallback(async () => {
    // Use static sort options since endpoint doesn't exist
    setSortOptions([
      { value: "recently_listed", label: t("recently_listed") },
      { value: "price_low_high", label: t("price_low_to_high") },
      { value: "price_high_low", label: t("price_high_to_low") },
      { value: "ending_soon", label: t("ending_soon") },
      { value: "most_viewed", label: t("most_viewed") },
    ]);
  }, [t]);

  useEffect(() => {
    handleFetchListings();
    fetchCategories();
    fetchCollections();
    fetchSortOptions();
  }, [handleFetchListings, fetchCategories, fetchCollections, fetchSortOptions]);

  useEffect(() => {
    const filters = {
      filter: JSON.stringify({
        search: searchQuery || undefined,
      }),
      ...(selectedCategory !== "all" && { categoryId: selectedCategory }),
      ...(selectedCollection !== "all" && { collectionId: selectedCollection }),
      sortField: sortBy,
      ...(listingType !== "all" && { type: listingType }),
      ...(priceRange.min && { minPrice: parseFloat(priceRange.min) }),
      ...(priceRange.max && { maxPrice: parseFloat(priceRange.max) }),
      ...(endingSoon && { endingSoon: "true" }),
      ...(hasOffers && { hasOffers: "true" }),
    };
    
    setFilters(filters);
    handleFetchListings(filters);
  }, [searchQuery, selectedCategory, selectedCollection, sortBy, listingType, priceRange, endingSoon, hasOffers, setFilters, handleFetchListings]);

  const getTimeLeft = useCallback((endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const distance = end - now;

    if (distance <= 0) return "Ended";

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, []);

  const ListingCard = useCallback(({ listing }: { listing: any }) => {
    const isAuction = listing.type === "AUCTION";
    const hasEnded = isAuction && listing.endTime && new Date() > new Date(listing.endTime);
    const timeLeft = isAuction && listing.endTime ? getTimeLeft(listing.endTime) : null;

    return (
      <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary/20">
        <Link href={`/nft/token/${listing.token.id}`}>
          <div className="aspect-square relative bg-muted rounded-t-lg overflow-hidden">
            {listing.token.image ? (
              <Image
                src={listing.token.image}
                alt={listing.token.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <span className="text-4xl opacity-50">🖼️</span>
              </div>
            )}
            
            {/* Overlay badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              {isAuction && (
                <Badge variant="secondary" className="bg-orange-500/90 text-white border-0 shadow-lg">
                  <Gavel className="h-3 w-3 mr-1" />
                  {t("Auction")}
                </Badge>
              )}
              {listing.type === "BUNDLE" && (
                <Badge variant="secondary" className="bg-purple-500/90 text-white border-0 shadow-lg">
                  <Zap className="h-3 w-3 mr-1" />
                  {t("Bundle")}
                </Badge>
              )}
              {listing.token.collection?.isVerified && (
                <Badge variant="secondary" className="bg-blue-500/90 text-white border-0 shadow-lg">
                  ✓
                </Badge>
              )}
            </div>

            {/* Quick actions */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 bg-white/95 hover:bg-white shadow-lg"
              >
                <Heart className="h-4 w-4" />
              </Button>
            </div>

            {/* Auction timer */}
            {isAuction && timeLeft && !hasEnded && (
              <div className="absolute bottom-3 left-3 right-3">
                <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-2 backdrop-blur-sm">
                  <Timer className="h-3 w-3" />
                  <span className="font-medium">{timeLeft}</span>
                </div>
              </div>
            )}

            {/* Sold overlay */}
            {hasEnded && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">
                  {t("ENDED")}
                </div>
              </div>
            )}
          </div>
        </Link>

        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Collection */}
            {listing.token.collection && (
              <div className="flex items-center gap-2">
                <Link 
                  href={`/nft/collections/${listing.token.collection.slug}`}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                >
                  {listing.token.collection.logoImage && (
                    <Image
                      src={listing.token.collection.logoImage}
                      alt={listing.token.collection.name}
                      width={16}
                      height={16}
                      className="rounded-full"
                    />
                  )}
                  {listing.token.collection.name}
                </Link>
                {listing.token.collection.isVerified && (
                  <Badge variant="secondary" className="h-4 w-4 p-0 bg-blue-100 text-blue-600">
                    ✓
                  </Badge>
                )}
              </div>
            )}

            {/* Title */}
            <Link href={`/nft/token/${listing.token.id}`}>
              <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors leading-tight">
                {listing.token.name}
              </h3>
            </Link>

            {/* Seller */}
            {listing.seller && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t("by")}</span>
                <span className="font-medium">
                  {listing.seller.nftCreator?.displayName || 
                   `${listing.seller.firstName} ${listing.seller.lastName}`}
                </span>
                {listing.seller.nftCreator?.verificationTier && (
                  <Badge variant="outline" className="h-4 text-xs">
                    {listing.seller.nftCreator.verificationTier}
                  </Badge>
                )}
              </div>
            )}

            {/* Price */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {isAuction ? (hasEnded ? t("final_bid") : t("current_bid")) : t("Price")}
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-lg">
                    {isAuction ? (listing.currentBid || listing.price) : listing.price}
                  </p>
                  <span className="text-sm text-muted-foreground">{listing.currency}</span>
                </div>
                {/* USD equivalent could be added here */}
              </div>
              
              {!hasEnded && (
                <Button size="sm" className="h-9 px-4">
                  {isAuction ? (
                    <>
                      <Gavel className="h-4 w-4 mr-2" />
                      {t("place_bid")}
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {t("buy_now")}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {listing.token.viewCount || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {listing.token.likeCount || 0}
                </span>
                {isAuction && (
                  <span className="flex items-center gap-1">
                    <Gavel className="h-3 w-3" />
                    {listing.bidCount || 0}
                  </span>
                )}
              </div>
              {listing.token.rarity && (
                <Badge variant="outline" className="text-xs">
                  {listing.token.rarity}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [t, getTimeLeft]);

  // Remove full-page loading check

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("nft_marketplace")}</h1>
            <p className="text-muted-foreground">
              {t("discover_buy_and_sell")}
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg text-primary">
                {Array.isArray(listings) ? listings.length : 0}
              </div>
              <div className="text-muted-foreground">{t("active_listings")}</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-primary">
                {Array.isArray(categories) ? categories.length : 0}
              </div>
              <div className="text-muted-foreground">{t("Categories")}</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-primary">
                {Array.isArray(collections) ? collections.length : 0}
              </div>
              <div className="text-muted-foreground">{t("Collections")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="mb-8">
        {/* Main Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search_nfts_collections_or_creators")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2">
            <Button
              variant={endingSoon ? "default" : "outline"}
              size="sm"
              onClick={() => setEndingSoon(!endingSoon)}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              {t("ending_soon")}
            </Button>
            <Button
              variant={hasOffers ? "default" : "outline"}
              size="sm"
              onClick={() => setHasOffers(!hasOffers)}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              {t("has_offers")}
            </Button>
          </div>

          {/* Advanced Filters Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("Filters")}
            {showFilters && <X className="h-4 w-4" />}
          </Button>

          {/* View Mode */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
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

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card className="p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t("Category")}</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
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
              </div>

              {/* Collection Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t("Collection")}</label>
                <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("all_collections")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all_collections")}</SelectItem>
                    {Array.isArray(collections) && collections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t("price_range")} (ETH)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t("sort_by")}</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(sortOptions) && sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedCollection("all");
                  setPriceRange({ min: "", max: "" });
                  setEndingSoon(false);
                  setHasOffers(false);
                  setSortBy("recently_listed");
                }}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                {t("clear_all_filters")}
              </Button>
              <div className="text-sm text-muted-foreground">
                {Array.isArray(listings) ? listings.length : 0} {t("results_found")}
              </div>
            </div>
          </Card>
        )}

        {/* Listing Type Tabs */}
        <Tabs value={listingType} onValueChange={setListingType}>
          <TabsList>
            <TabsTrigger value="all">{t("all_listings")}</TabsTrigger>
            <TabsTrigger value="FIXED_PRICE" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {t("buy_now")}
            </TabsTrigger>
            <TabsTrigger value="AUCTION" className="flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              {t("Auctions")}
            </TabsTrigger>
            <TabsTrigger value="BUNDLE" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              {t("Bundles")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("Showing")}{" "}
          {Array.isArray(listings) ? listings.length : 0}{" "}
          {t("results")}
        </p>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className={`grid gap-6 ${
          viewMode === "grid" 
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
            : "grid-cols-1"
        }`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-muted rounded-t-lg" />
              <CardContent className="p-4 space-y-3">
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-16" />
                    <div className="h-6 bg-muted rounded w-20" />
                  </div>
                  <div className="h-8 w-20 bg-muted rounded" />
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <div className="flex gap-2">
                    <div className="h-3 w-8 bg-muted rounded" />
                    <div className="h-3 w-8 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-12 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Array.isArray(listings) && listings.length > 0 ? (
        <div className={`grid gap-6 ${
          viewMode === "grid" 
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
            : "grid-cols-1"
        }`}>
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <Card className="text-center py-16">
          <CardContent>
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Gavel className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t("no_listings_found")}</h3>
              <p className="text-muted-foreground mb-8">
                {t("no_nfts_match_your")}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedCollection("all");
                    setPriceRange({ min: "", max: "" });
                    setEndingSoon(false);
                    setHasOffers(false);
                    setListingType("all");
                    setSortBy("recently_listed");
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  {t("clear_all_filters")}
                </Button>
                <Link href="/nft">
                  <Button className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {t("browse_all_nfts")}
                  </Button>
                </Link>
              </div>
              
              {/* Suggestions */}
              <div className="mt-8 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-4">{t("popular_searches")}:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Art", "Gaming", "Music", "Photography"].map((tag) => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery(tag)}
                      className="h-8 text-xs"
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Load More */}
      {Array.isArray(listings) && listings.length > 0 && (
        <div className="text-center mt-12">
          <Button variant="outline" disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner />
                {t("loading")}
              </>
            ) : (
              t("load_more")
            )}
          </Button>
        </div>
      )}
      
      {/* Wallet Onboarding Modal */}
      {showOnboarding && (
        <WalletOnboarding 
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}
    </div>
  );
} 