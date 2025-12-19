"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useNftStore } from "@/store/nft/nft-store";
import { useInView } from "react-intersection-observer";

export default function TrendingCollections() {
  const { trendingCollections, fetchTrendingCollections } = useNftStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      fetchTrendingCollections(10, "24h");
    }
  }, [inView, fetchTrendingCollections]);

  // Infinite auto-scroll functionality with smooth FPS
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !inView || trendingCollections.length < 3) return; // Disable auto-scroll for few collections

    let animationFrameId: number;
    let isPaused = false;
    let lastTime = performance.now();
    const scrollSpeed = 0.5; // pixels per millisecond (30px per second)

    const scroll = (currentTime: number) => {
      if (!isPaused && container) {
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        // Time-based scrolling for consistent speed regardless of FPS
        container.scrollLeft += scrollSpeed * deltaTime;

        // Reset scroll position when reaching halfway point for seamless loop
        const maxScroll = container.scrollWidth / 2;
        if (container.scrollLeft >= maxScroll) {
          container.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    // Pause on hover
    const handleMouseEnter = () => {
      isPaused = true;
    };
    const handleMouseLeave = () => {
      isPaused = false;
      lastTime = performance.now(); // Reset time to prevent jump
    };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [inView]);

  // Use trending collections from store, ensure it's always an array
  const displayCollections = Array.isArray(trendingCollections) ? trendingCollections : [];

  return (
    <section ref={ref} className="py-20">
      <div className="container">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center`}>
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Trending Collections
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-muted-foreground"
            >
              Top performing collections in the last 24 hours
            </motion.p>
          </div>
          <Link href="/nft/marketplace">
            <Button variant="outline" className="gap-2 hidden md:flex">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Empty State or Scrollable Collections */}
        {displayCollections.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center py-16"
          >
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center mx-auto mb-6`}>
              <TrendingUp className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Trending Collections Yet</h3>
            <p className="text-muted-foreground mb-6">
              Popular collections will appear here once trading activity picks up
            </p>
            <Link href="/nft/marketplace">
              <Button variant="outline" className="gap-2">
                Explore Marketplace
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            ref={scrollContainerRef}
            className="overflow-x-auto overflow-y-visible pb-4 pt-2 -mx-4 px-4 scrollbar-hide"
            style={{ scrollBehavior: "auto" }}
          >
            <div className="flex gap-6 min-w-max pt-2">
              {/* First set of collections */}
              {displayCollections.map((collection, index) => (
              <Link
                key={`first-${collection.id}`}
                href={`/nft/collection/${collection.slug || collection.id}`}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  whileHover={{ y: -8 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                    y: { type: "spring", stiffness: 400, damping: 25 }
                  }}
                  className="group w-80 bg-card border border-border rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                >
                  {/* Banner */}
                  <div className={`relative h-32 bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20`}>
                    {collection.bannerImage ? (
                      <img
                        src={collection.bannerImage}
                        alt={collection.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="grid grid-cols-3 gap-2 p-4">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-purple-600/30 backdrop-blur`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Owners Count Overlay */}
                    {collection.metrics?.uniqueOwners && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur rounded-full flex items-center gap-1">
                        <Eye className="w-3 h-3 text-white" />
                        <span className="text-xs text-white">
                          {collection.metrics.uniqueOwners.toLocaleString()} owners
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Logo Overlap */}
                  <div className="px-6 -mt-10">
                    <div className={`w-20 h-20 rounded-xl border-4 border-card bg-gradient-to-br from-primary to-purple-600 overflow-hidden shadow-xl`}>
                      {collection.logoImage ? (
                        <img
                          src={collection.logoImage}
                          alt={collection.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                          {collection.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-bold text-lg truncate flex-1">
                        {collection.name}
                      </h3>
                      {collection.isVerified && (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          Floor Price
                        </div>
                        <div className="font-bold">
                          {collection.metrics?.floorPrice || 0} BNB
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          24h Volume
                        </div>
                        <div className="font-bold">
                          {((collection.metrics?.recentVolume || 0) / 1000).toFixed(1)}K BNB
                        </div>
                      </div>
                    </div>

                    {/* Sales Count */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        24h Sales
                      </span>
                      <Badge variant="default" className="gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {collection.metrics?.recentSales || 0}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
            {/* Duplicate set for infinite scroll - only show if we have enough collections */}
            {displayCollections.length >= 3 && displayCollections.map((collection, index) => (
              <Link
                key={`duplicate-${collection.id}`}
                href={`/nft/collection/${collection.slug || collection.id}`}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  whileHover={{ y: -8 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                    y: { type: "spring", stiffness: 400, damping: 25 }
                  }}
                  className="group w-80 bg-card border border-border rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                >
                  {/* Banner */}
                  <div className={`relative h-32 bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20`}>
                    {collection.bannerImage ? (
                      <img
                        src={collection.bannerImage}
                        alt={collection.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="grid grid-cols-3 gap-2 p-4">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-purple-600/30 backdrop-blur`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Owners Count Overlay */}
                    {collection.metrics?.uniqueOwners && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur rounded-full flex items-center gap-1">
                        <Eye className="w-3 h-3 text-white" />
                        <span className="text-xs text-white">
                          {collection.metrics.uniqueOwners.toLocaleString()} owners
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Logo Overlap */}
                  <div className="px-6 -mt-10">
                    <div className={`w-20 h-20 rounded-xl border-4 border-card bg-gradient-to-br from-primary to-purple-600 overflow-hidden shadow-xl`}>
                      {collection.logoImage ? (
                        <img
                          src={collection.logoImage}
                          alt={collection.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                          {collection.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-bold text-lg truncate flex-1">
                        {collection.name}
                      </h3>
                      {collection.isVerified && (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          Floor Price
                        </div>
                        <div className="font-bold">
                          {collection.metrics?.floorPrice || 0} BNB
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          24h Volume
                        </div>
                        <div className="font-bold">
                          {((collection.metrics?.recentVolume || 0) / 1000).toFixed(1)}K BNB
                        </div>
                      </div>
                    </div>

                    {/* Sales Count */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        24h Sales
                      </span>
                      <Badge variant="default" className="gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {collection.metrics?.recentSales || 0}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
        )}

        {/* Mobile View All Button */}
        <div className="flex justify-center mt-8 md:hidden">
          <Link href="/nft/marketplace">
            <Button className="gap-2">
              View All Collections
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
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
