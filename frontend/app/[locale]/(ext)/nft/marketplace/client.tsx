"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { m, AnimatePresence } from "framer-motion";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  X,
  SlidersHorizontal,
  TrendingUp,
  Clock,
  Sparkles,
  Flame,
  Award,
  Users
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useNftStore } from "@/store/nft/nft-store";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { CurrencyIcon } from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import { CollectionAvatar } from "@/app/[locale]/(ext)/nft/components/shared/collection-avatar";
import { useInView } from "react-intersection-observer";
import { publicShortName } from "@/utils/display-name";
import { cn } from "@/lib/utils";

export default function MarketplaceClient() {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

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

  /**
   * The NFT store's `loading` is a READ state on this page — the listings query
   * re-runs on every filter, sort and search change — so it is what both the
   * grid and the "Load more" button key off. Aliased because the button's
   * `{!fetching && <TrendingUp/>}` reads like withheld chrome otherwise, and it
   * is not: `<Button loading>` paints its own spinner in that slot.
   */
  const fetching = loading;

  const [viewMode, setViewMode] = useState<"grid" | "masonry">("grid");
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

  const { ref: heroRef, inView: heroInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const handleFetchListings = useCallback((filters?: any) => {
    fetchListings(filters);
  }, [fetchListings]);

  const fetchSortOptions = useCallback(async () => {
    setSortOptions([
      { value: "recently_listed", label: tExt("recently_listed") },
      { value: "price_low_high", label: tExt("price_low_to_high") },
      { value: "price_high_low", label: tExt("price_high_to_low") },
      { value: "ending_soon", label: tCommon("ending_soon") },
      { value: "most_viewed", label: tExt("most_viewed") },
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
      ...(selectedCategory !== "all" && { categoryId: selectedCategory }),
      ...(selectedCollection !== "all" && { collectionId: selectedCollection }),
      sortBy: sortBy,
      sortField: sortBy,
      ...(listingType !== "all" && { type: listingType }),
      ...(priceRange.min && { minPrice: parseFloat(priceRange.min) }),
      ...(priceRange.max && { maxPrice: parseFloat(priceRange.max) }),
      ...(searchQuery && { filter: JSON.stringify({ search: searchQuery }) }),
      ...(endingSoon && { endingSoon: true }),
      ...(hasOffers && { hasOffers: true }),
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

  const ListingCard = useCallback(({ listing, index }: { listing: any; index: number }) => {
    const isAuction = listing.type === "AUCTION";
    const hasEnded = isAuction && listing.endTime && new Date() > new Date(listing.endTime);
    const timeLeft = isAuction && listing.endTime ? getTimeLeft(listing.endTime) : null;

    return (
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <Card className="group transition-colors duration-300 hover:border-primary/50 overflow-hidden bg-card">
          <Link href={`/nft/token/${listing.token.id}`}>
            <div className={`aspect-square relative bg-primary/10 overflow-hidden`}>
              {listing.token.image ? (
                <Image
                  src={listing.token.image}
                  alt={listing.token.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Sparkles className="w-16 h-16 text-primary/40" />
                </div>
              )}

              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Overlay badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                {isAuction && (
                  <Badge className="bg-warning text-warning-foreground border-0 shadow-lg">
                    <Flame className="h-3 w-3 mr-1" />
                    {tCommon("auction")}
                  </Badge>
                )}
                {listing.type === "BUNDLE" && (
                  <Badge className={`bg-primary text-primary-foreground border-0 shadow-lg`}>
                    <Zap className="h-3 w-3 mr-1" />
                    {tCommon("bundle")}
                  </Badge>
                )}
                {listing.token.collection?.isVerified && (
                  <Badge className="bg-primary text-primary-foreground border-0 shadow-lg">
                    <Award className="h-3 w-3" />
                  </Badge>
                )}
              </div>

              {/* Quick actions */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-9 p-0 bg-card/95 hover:bg-card shadow-lg rounded-full"
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>

              {/* Auction timer */}
              {isAuction && timeLeft && !hasEnded && (
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-overlay/90 text-primary-foreground text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 backdrop-blur-sm">
                    <Timer className="h-4 w-4 text-warning" />
                    <span className="font-mono font-semibold tabular-nums">{timeLeft}</span>
                  </div>
                </div>
              )}

              {/* Sold overlay */}
              {hasEnded && (
                <div className="absolute inset-0 bg-overlay/70 backdrop-blur-sm flex items-center justify-center">
                  <div className="bg-destructive text-destructive-foreground px-6 py-3 rounded-lg font-semibold text-lg">
                    {tExt("ended")}
                  </div>
                </div>
              )}
            </div>
          </Link>

          <CardContent className="p-3 sm:p-4">
            <div className="space-y-2 sm:space-y-3">
              {/* Collection */}
              {listing.token.collection && (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/nft/collection/${listing.token.collection.slug}`}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5 group/collection truncate"
                  >
                    <CollectionAvatar
                      src={listing.token.collection.logoImage}
                      name={listing.token.collection.name}
                      size={20}
                      className="ring-2 ring-primary/20 group-hover/collection:ring-primary/50 transition-all"
                    />
                    <span className="group-hover/collection:text-primary/80 truncate">{listing.token.collection.name}</span>
                  </Link>
                  {listing.token.collection.isVerified && (
                    <Badge className="h-4 w-4 sm:h-5 sm:w-5 p-0 bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                      <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </Badge>
                  )}
                </div>
              )}

              {/* Title */}
              <Link href={`/nft/token/${listing.token.id}`}>
                <h3 className="text-base sm:text-lg font-semibold leading-tight tracking-tight text-foreground line-clamp-1 hover:text-primary transition-colors group-hover:text-primary">
                  {listing.token.name}
                </h3>
              </Link>

              {/* Seller */}
              {listing.seller && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                  <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {/* The fallback was an unconditional
                        `${firstName} ${lastName}` — so every seller without a
                        creator profile had their identity-document name on the
                        board, and one without a surname read "Greg undefined".
                        A card byline wants the addressable form. */}
                    {listing.seller.nftCreator?.displayName ||
                      publicShortName(listing.seller, tCommon("anonymous"))}
                  </span>
                  {listing.seller.nftCreator?.verificationTier && (
                    <Badge variant="outline" className="h-4 sm:h-5 text-[9px] sm:text-[10px] px-1.5 sm:px-2 flex-shrink-0">
                      {listing.seller.nftCreator.verificationTier}
                    </Badge>
                  )}
                </div>
              )}

              {/* Price section */}
              <div className="pt-2 sm:pt-3 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-0">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">
                      {isAuction ? (hasEnded ? t("final_bid") : tCommon("current_bid")) : tCommon("price")}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <CurrencyIcon
                        currency={listing.currency}
                        size={16}
                        className="self-center"
                      />
                      <p className="text-lg sm:text-xl font-mono font-semibold tabular-nums text-foreground">
                        {parseFloat(isAuction ? (listing.currentBid || listing.price) : listing.price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 })}
                      </p>
                      <span className="text-xs sm:text-sm text-muted-foreground font-medium">{listing.currency}</span>
                    </div>
                  </div>

                  {!hasEnded && (
                    <Button size="sm" className={`h-8 sm:h-9 sm:px-4 text-xs sm:text-sm bg-primary hover:bg-primary/90 shadow-lg w-full sm:w-auto`}>
                      {isAuction ? (
                        <>
                          <Gavel className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                          {tCommon("place_bid")}
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                          {tCommon("buy_now")}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground pt-2">
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
                    <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="font-mono font-medium tabular-nums">{listing.token.viewCount || 0}</span>
                  </span>
                  <span className="flex items-center gap-1 hover:text-destructive transition-colors cursor-pointer">
                    <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="font-mono font-medium tabular-nums">{listing.token.likeCount || 0}</span>
                  </span>
                  {isAuction && (
                    <span className="flex items-center gap-1 hover:text-warning transition-colors">
                      <Gavel className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="font-mono font-medium tabular-nums">{listing.bidCount || 0}</span>
                    </span>
                  )}
                </div>
                {listing.token.rarity && (
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 font-semibold">
                    {listing.token.rarity}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </m.div>
    );
  }, [t, getTimeLeft]);

  /**
   * ONE source for the listings container's breakpoints.
   *
   * The pending grid and the resolved grid each carried their own copy and had
   * already diverged — see the note at the grid itself. Computing it once is
   * what makes "the pending state is the real layout with unknown values
   * replaced" true here rather than aspirational.
   */
  const gridClass = cn(
    "grid gap-6",
    viewMode === "grid"
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      : "columns-1 sm:columns-2 md:columns-3 lg:columns-4 space-y-6"
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section ref={heroRef} className={`relative pt-32 py-20 overflow-hidden bg-linear-to-b from-primary/5 via-primary/5 to-background`}>
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-6"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{t("explore_the_marketplace")}</span>
            </m.div>

            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-linear-to-r from-foreground via-primary to-primary bg-clip-text text-transparent`}>
              {t("discover_collect_sell")}
              <br />
              <span className="text-primary">{t("extraordinary_nfts")}</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("the_worlds_largest_digital_marketplace_for")} {t("buy_sell_and_discover_exclusive_digital_assets")}
            </p>

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={() => {
                  const filtersSection = document.querySelector('#marketplace-filters');
                  filtersSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`gap-2 bg-primary hover:bg-primary/90 shadow-xl h-12`}
              >
                <Zap className="w-5 h-5" />
                {t("explore_nfts")}
              </Button>
            </div>
          </m.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Enhanced Filters */}
        <div id="marketplace-filters" className="mb-10">
          {/* Main Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1" data-tour="nft-search">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={tCommon("search_nfts_collections_or_creators")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 border-2 focus-visible:ring-2 focus-visible:ring-primary/50"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={endingSoon ? "default" : "outline"}
                size="default"
                onClick={() => setEndingSoon(!endingSoon)}
                className="flex items-center gap-2 h-12 border-2"
              >
                <Clock className="h-4 w-4" />
                {tCommon("ending_soon")}
              </Button>
              <Button
                variant={hasOffers ? "default" : "outline"}
                size="default"
                onClick={() => setHasOffers(!hasOffers)}
                className="flex items-center gap-2 h-12 border-2"
              >
                <TrendingUp className="h-4 w-4" />
                {tExt("has_offers")}
              </Button>
            </div>

            {/* Advanced Filters Toggle */}
            <Button
              variant="outline"
              data-tour="nft-filters"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 h-12 border-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {tCommon("filters")}
              {showFilters && <X className="h-4 w-4 ml-1" />}
            </Button>

            {/* View Mode */}
            <div className="flex border-2 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="default"
                onClick={() => setViewMode("grid")}
                className="rounded-none h-12"
              >
                <Grid3X3 className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === "masonry" ? "default" : "ghost"}
                size="default"
                onClick={() => setViewMode("masonry")}
                className="rounded-none h-12 border-l-2"
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-8 mb-6">
                  <div className="space-y-6">
                    {/* First Row - Category and Collection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Category Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">{tCommon("category")}</label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger className="h-12 border-2">
                            <SelectValue placeholder={tCommon("all_categories")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{tCommon("all_categories")}</SelectItem>
                            {Array.isArray(categories) && categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Collection Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">{tCommon("collection")}</label>
                        <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                          <SelectTrigger className="h-12 border-2">
                            <SelectValue placeholder={tExt("all_collections")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{tExt("all_collections")}</SelectItem>
                            {Array.isArray(collections) && collections.map((collection) => (
                              <SelectItem key={collection.id} value={collection.id}>
                                {collection.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Second Row - Price Range and Sort */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Price Range */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">{tExt("price_range")} (ETH)</label>
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={priceRange.min}
                            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                            className="h-12 border-2"
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={priceRange.max}
                            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                            className="h-12 border-2"
                          />
                        </div>
                      </div>

                      {/* Sort */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">{tCommon("sort_by")}</label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="h-12 border-2">
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

                    {/* Clear Filters and Results */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 border-t-2">
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
                        className="flex items-center gap-2 h-11 border-2"
                      >
                        <X className="h-4 w-4" />
                        {tExt("clear_all_filters")}
                      </Button>
                      <div className="text-sm font-medium text-muted-foreground">
                        <span className="text-primary font-mono font-semibold tabular-nums text-lg">{Array.isArray(listings) ? listings.length : 0}</span> {t("results_found")}
                      </div>
                    </div>
                  </div>
                </Card>
              </m.div>
            )}
          </AnimatePresence>

          {/* Listing Type Tabs */}
          <Tabs value={listingType} onValueChange={setListingType} className="w-full">
            <TabsList data-tour="nft-listing-type" className="grid w-full grid-cols-4 h-12 p-1 bg-muted/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-background">
                {t("all_listings")}
              </TabsTrigger>
              <TabsTrigger value="FIXED_PRICE" className="flex items-center gap-2 data-[state=active]:bg-background">
                <ShoppingCart className="h-4 w-4" />
                {tCommon("buy_now")}
              </TabsTrigger>
              <TabsTrigger value="AUCTION" className="flex items-center gap-2 data-[state=active]:bg-background">
                <Gavel className="h-4 w-4" />
                {t("auctions")}
              </TabsTrigger>
              <TabsTrigger value="BUNDLE" className="flex items-center gap-2 data-[state=active]:bg-background">
                <Zap className="h-4 w-4" />
                {t("bundles")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Results. "Showing 0 results" is a claim, and it was on screen for the
            whole fetch — including every filter change, which re-runs this. */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {tCommon("showing")}{" "}
            <span className="text-foreground font-bold">
              <Loadable loading={fetching} placeholder="00">
                {Array.isArray(listings) ? listings.length : 0}
              </Loadable>
            </span>{" "}
            {tCommon("results")}
          </p>
        </div>

        {/*
          Listings Grid.

          THE TWO GRIDS THAT USED TO BE HERE
          ==================================
          The pending state and the resolved state each wrote out their own
          breakpoint classes, and they had already come apart — which is the
          whole argument against a second copy:

            pending:  masonry-sm:columns-2 masonry-md:columns-3 masonry-lg:columns-4
            resolved: columns-1 sm:columns-2 md:columns-3 lg:columns-4 space-y-6

          `masonry-sm:` is not a variant this project defines, so in masonry view
          the pending grid compiled to nothing at all: twelve cards in ONE column
          for the length of the fetch, then a four-column masonry layout. That is
          not a layout shift, it is a different page.

          `gridClass` is now computed once and both states use it, so they cannot
          disagree again. The empty state stays a third, separate branch — an
          empty result set and an unfetched one are different facts, and the
          "No listings found" card must not be what a user sees while their
          filter is still running.
        */}
        {fetching ? (
          <div className={gridClass}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                {/* `aspect-square` from the real card: the cell's height is its
                    column width, so the row is already the right height before
                    a single image has loaded. */}
                <SkeletonBlock className="aspect-square rounded-none" />
                <CardContent className="p-5 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    <SkeletonText chars={12} />
                  </p>
                  <h3 className="text-lg font-semibold">
                    <SkeletonText chars={16} />
                  </h3>
                  <div className="flex justify-between items-center pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        <SkeletonText placeholder="Price" />
                      </p>
                      <p className="font-mono text-xl font-semibold tabular-nums">
                        <SkeletonText placeholder="0.0000" />
                      </p>
                    </div>
                    <SkeletonBlock className="h-9 w-24 rounded-md" />
                  </div>
                  <div className="flex justify-between pt-2 border-t text-xs text-muted-foreground">
                    <SkeletonText placeholder="1,234" />
                    <SkeletonText placeholder="1,234" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Array.isArray(listings) && listings.length > 0 ? (
          <div className={gridClass}>
            {listings.map((listing, index) => (
              <div key={listing.id} data-tour={index === 0 ? "nft-listing" : undefined} className={viewMode === "masonry" ? "break-inside-avoid" : ""}>
                <ListingCard listing={listing} index={index} />
              </div>
            ))}
          </div>
        ) : (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="text-center py-20">
              <CardContent>
                <div className="max-w-lg mx-auto">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-primary/15 text-primary mx-auto mb-6">
                    <Gavel className="h-6 w-6" />
                  </span>
                  <h3 className="text-2xl font-semibold leading-tight tracking-tight text-foreground mb-3">{t("no_listings_found")}</h3>
                  <p className="text-muted-foreground mb-10 text-lg">
                    {t("no_nfts_match_your")}
                  </p>

                  {/* Suggestions */}
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-4">{t("popular_searches")}:</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {["Art", "Gaming", "Music", "Photography"].map((tag) => (
                        <Button
                          key={tag}
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery(tag)}
                          className="text-sm border-2"
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </m.div>
        )}

        {/* Load More */}
        {Array.isArray(listings) && listings.length > 0 && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-16"
          >
            {/*
              ONE tree in both states.

              This swapped the button's entire contents between a
              `<LoadingSpinner/>` plus "Loading" and a `<TrendingUp/>` plus
              "Load more". `<Button loading>` already renders a spinner in the
              icon slot at the size the design system specifies, so the
              hand-rolled one was a second copy of that idea at a different
              size — and `LoadingSpinner` here is the app's PAGE spinner, which
              is why this button visibly changed width when it was pressed.

              `fetching` rather than `loading` at the icon gate because this is
              a fetch the USER started by pressing the button; the icon stepping
              aside for the spinner is the intent, not withheld chrome.
            */}
            <Button
              variant="outline"
              size="lg"
              loading={fetching}
              disabled={fetching}
              className="h-12 px-10 border-2 hover:border-primary/50"
            >
              {!fetching && <TrendingUp className="h-5 w-5 mr-2" />}
              {fetching ? tCommon("loading") : tCommon("load_more")}
            </Button>
          </m.div>
        )}
      </div>
    </div>
  );
}
