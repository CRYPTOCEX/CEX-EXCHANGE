"use client";

import { useEffect, useRef } from "react";
import { m } from "framer-motion";
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
import {
  CurrencyIcon,
  chainNativeCurrency,
} from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import { CollectionAvatar } from "@/app/[locale]/(ext)/nft/components/shared/collection-avatar";
import { useTranslations } from "next-intl";

/** The coin a collection's floor price and volume are quoted in. */
const collectionCurrency = (collection: any): string =>
  collection.currency || chainNativeCurrency(collection.chain);

export default function TrendingCollections() {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
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
            <m.div
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className={`w-10 h-10 rounded-xl bg-primary flex items-center justify-center`}>
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                {t("trending_collections")}
              </h2>
            </m.div>
            <m.p
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-muted-foreground"
            >
              {t("top_performing_collections_in_the_last_24_hours")}
            </m.p>
          </div>
          <Link href="/nft/marketplace">
            <Button variant="outline" className="gap-2 hidden md:flex">
              {tCommon("view_all")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Empty State or Scrollable Collections */}
        {displayCollections.length === 0 ? (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center py-16"
          >
            <div className={`w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6`}>
              <TrendingUp className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("no_trending_collections_yet")}</h3>
            <p className="text-muted-foreground mb-6">
              {t("popular_collections_will_appear_here_once")}
            </p>
            <Link href="/nft/marketplace">
              <Button variant="outline" className="gap-2">
                {t("explore_marketplace")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </m.div>
        ) : (
          <m.div
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
                <m.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  whileHover={{ y: -8 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                    y: { type: "spring", stiffness: 400, damping: 25 }
                  }}
                  className="group w-80 bg-card border border-border rounded-lg overflow-hidden transition-all cursor-pointer"
                >
                  {/* Banner */}
                  <div className={`relative h-32 bg-primary/20`}>
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
                              className={`w-12 h-12 rounded-lg bg-primary/30 backdrop-blur`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Owners Count Overlay */}
                    {collection.metrics?.uniqueOwners && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-overlay/60 backdrop-blur rounded-full flex items-center gap-1">
                        <Eye className="w-3 h-3 text-primary-foreground" />
                        <span className="text-xs text-primary-foreground">
                          {collection.metrics.uniqueOwners.toLocaleString()} owners
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Logo Overlap */}
                  <div className="px-6 -mt-10">
                    <div className="w-20 h-20 rounded-xl border-4 border-card bg-muted overflow-hidden shadow-xl">
                      <CollectionAvatar
                        src={collection.logoImage}
                        name={collection.name}
                        size={72}
                        className="w-full h-full rounded-none"
                      />
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
                          {tExt("floor_price")}
                        </div>
                        <div className="font-bold flex items-center gap-1.5">
                          <CurrencyIcon currency={collectionCurrency(collection)} size={14} />
                          {collection.metrics?.floorPrice || 0} {collectionCurrency(collection)}
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          {`24h ${tCommon('volume')}`}
                        </div>
                        <div className="font-bold flex items-center gap-1.5">
                          <CurrencyIcon currency={collectionCurrency(collection)} size={14} />
                          {/*
                            The `/1000` was UNCONDITIONAL, so a collection with
                            a genuine 12 BNB of 24-hour volume advertised
                            "0.0K BNB" — a live collection shown as dead. Only
                            abbreviate once there is something to abbreviate.
                          */}
                          {(() => {
                            const v = Number(collection.metrics?.recentVolume) || 0;
                            return v >= 1000
                              ? `${(v / 1000).toFixed(1)}K`
                              : v.toLocaleString("en-US", { maximumFractionDigits: 4 });
                          })()}{" "}
                          {collectionCurrency(collection)}
                        </div>
                      </div>
                    </div>

                    {/* Sales Count */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {`24h ${tCommon('sales')}`}
                      </span>
                      <Badge variant="default" className="gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {collection.metrics?.recentSales || 0}
                      </Badge>
                    </div>
                  </div>
                </m.div>
              </Link>
            ))}
            {/* Duplicate set for infinite scroll - only show if we have enough collections */}
            {displayCollections.length >= 3 && displayCollections.map((collection, index) => (
              <Link
                key={`duplicate-${collection.id}`}
                href={`/nft/collection/${collection.slug || collection.id}`}
              >
                <m.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  whileHover={{ y: -8 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                    y: { type: "spring", stiffness: 400, damping: 25 }
                  }}
                  className="group w-80 bg-card border border-border rounded-lg overflow-hidden transition-all cursor-pointer"
                >
                  {/* Banner */}
                  <div className={`relative h-32 bg-primary/20`}>
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
                              className={`w-12 h-12 rounded-lg bg-primary/30 backdrop-blur`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Owners Count Overlay */}
                    {collection.metrics?.uniqueOwners && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-overlay/60 backdrop-blur rounded-full flex items-center gap-1">
                        <Eye className="w-3 h-3 text-primary-foreground" />
                        <span className="text-xs text-primary-foreground">
                          {collection.metrics.uniqueOwners.toLocaleString()} owners
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Logo Overlap */}
                  <div className="px-6 -mt-10">
                    <div className="w-20 h-20 rounded-xl border-4 border-card bg-muted overflow-hidden shadow-xl">
                      <CollectionAvatar
                        src={collection.logoImage}
                        name={collection.name}
                        size={72}
                        className="w-full h-full rounded-none"
                      />
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
                          {tExt("floor_price")}
                        </div>
                        <div className="font-bold flex items-center gap-1.5">
                          <CurrencyIcon currency={collectionCurrency(collection)} size={14} />
                          {collection.metrics?.floorPrice || 0} {collectionCurrency(collection)}
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          {`24h ${tCommon('volume')}`}
                        </div>
                        <div className="font-bold flex items-center gap-1.5">
                          <CurrencyIcon currency={collectionCurrency(collection)} size={14} />
                          {((collection.metrics?.recentVolume || 0) / 1000).toFixed(1)}K {collectionCurrency(collection)}
                        </div>
                      </div>
                    </div>

                    {/* Sales Count */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {`24h ${tCommon('sales')}`}
                      </span>
                      <Badge variant="default" className="gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {collection.metrics?.recentSales || 0}
                      </Badge>
                    </div>
                  </div>
                </m.div>
              </Link>
            ))}
          </div>
        </m.div>
        )}

        {/* Mobile View All Button */}
        <div className="flex justify-center mt-8 md:hidden">
          <Link href="/nft/marketplace">
            <Button className="gap-2">
              {t("view_all_collections")}
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
