"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  LayoutGrid,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useNftStore } from "@/store/nft/nft-store";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";

export default function FeaturedNFTs() {
  const { featuredTokens, categories, fetchFeaturedTokens, fetchCategories } = useNftStore();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "masonry">("masonry");
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
    { id: "all", label: "All", icon: LayoutGrid },
    ...categories.slice(0, 4).map(cat => ({
      id: cat.slug,
      label: cat.name,
      icon: Sparkles, // You can map specific icons per category if needed
    }))
  ];

  const visibleTokens = displayTokens.slice(0, visibleCount);

  const rarityColors: Record<string, string> = {
    COMMON: "bg-gray-500 text-white",
    UNCOMMON: "bg-green-500 text-white",
    RARE: "bg-blue-500 text-white",
    EPIC: "bg-purple-500 text-white",
    LEGENDARY: "bg-amber-500 text-white",
  };

  return (
    <section ref={ref} className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Featured NFTs</h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-muted-foreground"
            >
              Discover hand-picked digital masterpieces
            </motion.p>
          </div>

          {/* View Mode Toggle */}
          <motion.div
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
              variant={viewMode === "masonry" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("masonry")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>

        {/* Category Tabs */}
        <motion.div
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
        </motion.div>

        {/* NFT Grid */}
        <AnimatePresence mode="wait">
          {visibleTokens.length === 0 ? (
            <motion.div
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
                  <h3 className="text-xl font-semibold mb-2">No NFTs Found</h3>
                  <p className="text-muted-foreground">
                    {selectedCategory === "all"
                      ? "There are no NFTs available at the moment."
                      : `No NFTs found in the "${selectedCategory}" category.`}
                  </p>
                </div>
                {selectedCategory !== "all" && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCategory("all")}
                    className="mt-4"
                  >
                    View All Categories
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={selectedCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                viewMode === "masonry"
                  ? "columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6"
                  : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              )}
            >
              {visibleTokens.map((token, index) => (
              <motion.div
                key={token.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  "break-inside-avoid",
                  viewMode === "grid" && "flex"
                )}
              >
                <Link
                  href={`/nft/token/${token.id}`}
                  className="block w-full"
                >
                  <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:border-primary/50 transition-all">
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20">
                      {token.image ? (
                        <img
                          src={token.image}
                          alt={token.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-16 h-16 text-primary/40" />
                        </div>
                      )}

                      {/* Overlay Actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="rounded-full"
                          onClick={(e) => {
                            e.preventDefault();
                            // Handle like
                          }}
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="rounded-full bg-gradient-to-r from-primary to-purple-600"
                          onClick={(e) => {
                            e.preventDefault();
                            // Handle buy
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
                            <span className="text-[8px] text-white">✓</span>
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
                          <div className="font-bold">
                            {token.currentListing?.price || "Not listed"} {token.currentListing?.currency || ""}
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
              </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Load More */}
        {visibleCount < displayTokens.length && (
          <motion.div
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
              Load More NFTs
              <TrendingUp className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* View All Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8"
        >
          <Link href="/nft/marketplace">
            <Button className="gap-2 bg-gradient-to-r from-primary to-purple-600">
              Explore All NFTs
              <Sparkles className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
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
