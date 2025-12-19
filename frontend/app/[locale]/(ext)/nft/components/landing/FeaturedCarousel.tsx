"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Flame } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useInView } from "react-intersection-observer";
import { useNftStore } from "@/store/nft/nft-store";
import { formatCurrency } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { getNftImageUrl } from "@/lib/nft-utils";

interface FeaturedNFT {
  id: string;
  name: string;
  collection: string;
  price: string;
}

export default function FeaturedCarousel() {
  const t = useTranslations("ext_nft");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  const { featuredTokens, fetchFeaturedTokens } = useNftStore();

  useEffect(() => {
    if (inView) {
      fetchFeaturedTokens(10);
    }
  }, [inView, fetchFeaturedTokens]);

  // Use featured tokens from store
  const featuredNFTs: FeaturedNFT[] = featuredTokens.slice(0, 6).map(token => ({
    id: token.id,
    name: token.name,
    collection: token.collection?.name || "Unknown",
    price: token.currentListing?.price
      ? formatCurrency(Number(token.currentListing.price), token.currentListing.currency)
      : "Not listed",
  }));

  // Infinite auto-scroll functionality with smooth FPS
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !inView || featuredNFTs.length < 3) return; // Disable auto-scroll for few NFTs

    let animationFrameId: number;
    let isPaused = false;
    let lastTime = performance.now();
    const scrollSpeed = 0.05; // pixels per millisecond (30px per second) - TESTING: Increased for visibility

    console.log('[FeaturedCarousel] Starting scroll animation with speed:', scrollSpeed);

    const scroll = (currentTime: number) => {
      if (!isPaused && container) {
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        // Time-based scrolling for consistent speed regardless of FPS
        const scrollAmount = scrollSpeed * deltaTime;
        container.scrollLeft += scrollAmount;

        // Reset scroll position when reaching halfway point for seamless loop
        const maxScroll = container.scrollWidth / 2;
        if (container.scrollLeft >= maxScroll) {
          container.scrollLeft = 0;
          console.log('[FeaturedCarousel] Loop reset at maxScroll:', maxScroll);
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

  return (
    <section ref={ref} className="py-16 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />

      <div className="container relative z-10">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">{t("hot_drops")}</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              {t("trending_nfts_making_waves_right_now")}
            </p>
          </motion.div>
        </div>

        {/* Empty State or Scrollable NFT Carousel */}
        {featuredNFTs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mx-auto mb-6">
              <Flame className="w-10 h-10 text-orange-500/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("no_hot_drops_yet")}</h3>
            <p className="text-muted-foreground mb-6">
              {t("featured_nfts_will_appear_here_once")}
            </p>
            <Link href="/nft/marketplace">
              <Button variant="outline" className="gap-2">
                {t("explore_marketplace")}
                <Sparkles className="w-4 h-4" />
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
              {/* First set */}
              {featuredNFTs.map((nft, index) => (
              <Link key={`first-${nft.id}`} href={`/nft/token/${nft.id}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  whileHover={{ y: -8 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                    y: { type: "spring", stiffness: 400, damping: 25 }
                  }}
                  className="group w-64 bg-card border border-border rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:border-primary/50 transition-all cursor-pointer"
                >
                  {/* NFT Image */}
                  <div className={`relative aspect-square bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20 flex items-center justify-center overflow-hidden`}>
                    <Image
                      src={getNftImageUrl(nft.id)}
                      alt={nft.name}
                      fill
                      sizes="256px"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />

                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="mb-2">
                      <span className="text-xs text-muted-foreground">
                        {nft.collection}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-3 truncate">
                      {nft.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">Price</div>
                        <span className="text-sm font-bold">{nft.price}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
            {/* Duplicate set for infinite scroll - only show if we have enough NFTs */}
            {featuredNFTs.length >= 3 && featuredNFTs.map((nft, index) => (
              <Link key={`duplicate-${nft.id}`} href={`/nft/token/${nft.id}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  whileHover={{ y: -8 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                    y: { type: "spring", stiffness: 400, damping: 25 }
                  }}
                  className="group w-64 bg-card border border-border rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:border-primary/50 transition-all cursor-pointer"
                >
                  {/* NFT Image */}
                  <div className={`relative aspect-square bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20 flex items-center justify-center overflow-hidden`}>
                    <Image
                      src={getNftImageUrl(nft.id)}
                      alt={nft.name}
                      fill
                      sizes="256px"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />

                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="mb-2">
                      <span className="text-xs text-muted-foreground">
                        {nft.collection}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-3 truncate">
                      {nft.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">Price</div>
                        <span className="text-sm font-bold">{nft.price}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
        )}
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
