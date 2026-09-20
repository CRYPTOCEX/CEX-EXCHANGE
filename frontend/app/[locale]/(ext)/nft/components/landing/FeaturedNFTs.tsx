"use client";

import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Heart,
  ShoppingCart,
  Eye,
  Zap,
  TrendingUp,
  Filter,
  Grid3x3,
  List,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useNftStore } from "@/store/nft/nft-store";
import { useInView } from "react-intersection-observer";
import { cn, formatCurrency } from "@/lib/utils";
import { MoneyFigure } from "@/components/ui/money-figure";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { getNftImageUrl } from "@/lib/nft-utils";
import { CurrencyIcon } from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
export default function FeaturedNFTs() {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const { featuredTokens, categories, fetchFeaturedTokens, fetchCategories } = useNftStore();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(12);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      fetchFeaturedTokens(20, selectedCategory === "all" ? undefined : selectedCategory);
      if (categories.length === 0) {
        fetchCategories();
      }
    }
  }, [inView, selectedCategory, fetchFeaturedTokens, fetchCategories, categories.length]);

  // Use featured tokens from store
  const displayTokens = featuredTokens;

  // Build category tabs from real categories
  const categoryTabs = [
    { id: "all", label: tCommon("all"), icon: Grid3x3 },
    ...categories.slice(0, 4).map(cat => ({
      id: cat.slug,
      label: cat.name,
      icon: Sparkles, // You can map specific icons per category if needed
    }))
  ];

  const visibleTokens = displayTokens.slice(0, visibleCount);

  // Rarity is an ordered scale, so it reads as one hue getting stronger rather
  // than five unrelated colours. The old map also paired `bg-muted` — a light
  // surface — with `text-primary-foreground`, which is white: unreadable in
  // light mode, where muted is nearly white too.
  //
  // The tint ladder used to climb /10 -> /20 -> /30, which put RARE at 4.19:1
  // and EPIC at 3.63:1 — `text-{tone}-ink` is calibrated for a /10 tint and
  // every extra 5% spends ~0.3 of the ratio (see globals.css). A five-rung
  // ramp therefore cannot be built out of fill alone: only /5, /10 and the
  // solid pairing clear AA. So the ladder now climbs on TWO axes — fill for
  // the first three rungs, then the rule, then the solid fill for the top —
  // which keeps five distinguishable steps with none of them below 4.5:1.
  const rarityColors: Record<string, string> = {
    COMMON: "bg-surface-3 text-muted-foreground",
    UNCOMMON: "bg-primary/5 text-primary-ink",
    RARE: "bg-primary/10 text-primary-ink",
    EPIC: "bg-primary/10 text-primary-ink border-primary/60",
    LEGENDARY: "bg-primary text-primary-foreground",
  };

  return (
    <section ref={ref} className="py-20">
      <div className="container">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <m.div
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">{t("featured_nfts")}</h2>
            </m.div>
            <m.p
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-muted-foreground"
            >
              {t("discover_hand_picked_digital_masterpieces")}
            </m.p>
          </div>

          {/* View Mode Toggle */}
          <m.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </m.div>
        </div>

        {/* Category Tabs */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide"
        >
          {categoryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={selectedCategory === tab.id ? "default" : "outline"}
                className="gap-2 whitespace-nowrap"
                onClick={() => setSelectedCategory(tab.id)}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </m.div>

        {/* NFT Grid */}
        <AnimatePresence mode="wait">
          {visibleTokens.length === 0 ? (
            <m.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="py-20 text-center"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{t("no_nfts_found")}</h3>
                  <p className="text-muted-foreground">
                    {selectedCategory === "all"
                      ? t("there_are_no_nfts_available_at_the_moment")
                      : t("no_nfts_found_in_the_category", { selectedCategory: String(selectedCategory) })}
                  </p>
                </div>
                {selectedCategory !== "all" && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCategory("all")}
                    className="mt-4"
                  >
                    {tCommon("view_all_categories")}
                  </Button>
                )}
              </div>
            </m.div>
          ) : (
            <m.div
              key={selectedCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                viewMode === "list"
                  ? "flex flex-col gap-3"
                  : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
              )}
            >
              {/* List View Header */}
              {viewMode === "list" && (
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Item</div>
                  <div className="col-span-2">Collection</div>
                  <div className="col-span-1 text-center">Rarity</div>
                  <div className="col-span-1 text-right">Price</div>
                  <div className="col-span-1 text-center">Views</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>
              )}
              {visibleTokens.map((token, index) => (
              <m.div
                key={token.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="w-full"
              >
                {viewMode === "list" ? (
                  /* List View Card */
                  <Link
                    href={`/nft/token/${token.id}`}
                    className="block w-full"
                  >
                    <div className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:bg-muted/30 transition-all">
                      {/* Mobile List View */}
                      <div className="md:hidden flex items-center gap-4 p-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-primary/20">
                          <Image
                            src={getNftImageUrl(token.id)}
                            alt={token.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                          {token.rarity && (
                            <Badge className={cn("absolute -top-1 -right-1 text-[10px] px-1.5 py-0", rarityColors[token.rarity])}>
                              {token.rarity.slice(0, 1)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{token.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{token.collection?.name}</p>
                          <p className="font-bold text-sm mt-1 flex items-center gap-1.5">
                            {token.currentListing?.price ? (
                              <>
                                <CurrencyIcon currency={token.currentListing.currency} size={14} />
                                <MoneyFigure value={formatCurrency(Number(token.currentListing.price), token.currentListing.currency)} />
                              </>
                            ) : (
                              tCommon("not_listed")
                            )}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 bg-primary"
                          onClick={(e) => {
                            e.preventDefault();
                          }}
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Desktop List View - Table Row Style */}
                      <div className="hidden md:grid grid-cols-12 gap-4 items-center px-4 py-3">
                        {/* Rank */}
                        <div className="col-span-1 text-muted-foreground font-medium">
                          {index + 1}
                        </div>

                        {/* Item (Image + Name) */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-primary/20 group-hover:ring-2 group-hover:ring-primary/50 transition-all">
                            <Image
                              src={getNftImageUrl(token.id)}
                              alt={token.name}
                              fill
                              sizes="56px"
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                              {token.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              #{token.id?.toString().slice(-6) || "000000"}
                            </p>
                          </div>
                        </div>

                        {/* Collection */}
                        <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                          <span className="text-sm truncate">{token.collection?.name || tCommon("unknown")}</span>
                          {token.collection?.isVerified && (
                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <span className="text-[10px] text-primary-foreground">✓</span>
                            </div>
                          )}
                        </div>

                        {/* Rarity */}
                        <div className="col-span-1 flex justify-center">
                          {token.rarity ? (
                            <Badge className={cn("text-xs", rarityColors[token.rarity])}>
                              {token.rarity}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="col-span-1 text-right">
                          <div className="font-bold flex items-center justify-end gap-1.5">
                            {token.currentListing?.price ? (
                              <>
                                <CurrencyIcon currency={token.currentListing.currency} size={14} />
                                <MoneyFigure value={formatCurrency(Number(token.currentListing.price), token.currentListing.currency)} />
                              </>
                            ) : (
                              "-"
                            )}
                          </div>
                        </div>

                        {/* Views/Likes */}
                        <div className="col-span-1 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {token.views || 0}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => {
                              e.preventDefault();
                            }}
                          >
                            <Heart className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-primary hover:opacity-90"
                            onClick={(e) => {
                              e.preventDefault();
                            }}
                          >
                            <ShoppingCart className="w-4 h-4 mr-1.5" />
                            {tCommon("buy_now")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  /* Grid View Card */
                  <Link
                    href={`/nft/token/${token.id}`}
                    className="block w-full"
                  >
                    <div className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all">
                      {/* Image */}
                      <div className="relative aspect-square overflow-hidden bg-primary/20">
                        <Image
                          src={getNftImageUrl(token.id)}
                          alt={token.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-overlay/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="rounded-full"
                            onClick={(e) => {
                              e.preventDefault();
                            }}
                          >
                            <Heart className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="rounded-full bg-primary"
                            onClick={(e) => {
                              e.preventDefault();
                            }}
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Rarity Badge */}
                        {token.rarity && (
                          <Badge
                            className={cn(
                              "absolute top-3 left-3",
                              rarityColors[token.rarity]
                            )}
                          >
                            {token.rarity}
                          </Badge>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        {/* Collection */}
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-xs text-muted-foreground truncate">
                            {token.collection?.name}
                          </span>
                          {token.collection?.isVerified && (
                            <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <span className="text-[8px] text-primary-foreground">✓</span>
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <h3 className="font-semibold text-lg mb-3 truncate">
                          {token.name}
                        </h3>

                        {/* Price & Stats */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Price
                            </div>
                            <div className="font-bold flex items-center gap-1.5">
                              {token.currentListing?.price ? (
                                <>
                                  <CurrencyIcon currency={token.currentListing.currency} size={14} />
                                  <MoneyFigure value={formatCurrency(Number(token.currentListing.price), token.currentListing.currency)} />
                                </>
                              ) : (
                                tCommon("not_listed")
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {token.views || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {token.likes || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}
              </m.div>
              ))}
            </m.div>
          )}
        </AnimatePresence>

        {/* Load More */}
        {visibleCount < displayTokens.length && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center mt-12"
          >
            <Button
              size="lg"
              variant="outline"
              onClick={() => setVisibleCount((prev) => prev + 9)}
              className="gap-2"
            >
              {t("load_more_nfts")}
              <TrendingUp className="w-4 h-4" />
            </Button>
          </m.div>
        )}

        {/* View All Link */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8"
        >
          <Link href="/nft/marketplace">
            <Button className="gap-2 bg-primary">
              {t("explore_all_nfts")}
              <Sparkles className="w-4 h-4" />
            </Button>
          </Link>
        </m.div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
