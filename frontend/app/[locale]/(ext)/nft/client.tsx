"use client";

import HeroSection from "@/components/nft/landing/HeroSection";
import LiveStatsBar from "@/components/nft/landing/LiveStatsBar";
import FeaturedCarousel from "@/components/nft/landing/FeaturedCarousel";
import TrendingCollections from "@/components/nft/landing/TrendingCollections";
import FeaturedNFTs from "@/components/nft/landing/FeaturedNFTs";
import LiveActivityFeed from "@/components/nft/landing/LiveActivityFeed";
import CreatorSpotlight from "@/components/nft/landing/CreatorSpotlight";
import MultiChainSection from "@/components/nft/landing/MultiChainSection";
import FinalCTA from "@/components/nft/landing/FinalCTA";
import PageTransition from "@/components/nft/effects/PageTransition";
import StructuredData from "@/components/nft/seo/StructuredData";
import PerformanceMonitor from "@/components/nft/analytics/PerformanceMonitor";
import { useEffect } from "react";
import { useNftStore } from "@/store/nft/nft-store";

export default function NFTClient() {
  const { fetchTokens, fetchCollections, fetchCategories } = useNftStore();

  useEffect(() => {
    // Fetch initial data
    fetchTokens();
    fetchCollections();
    fetchCategories();
  }, [fetchTokens, fetchCollections, fetchCategories]);

  return (
    <>
      {/* SEO Structured Data */}
      <StructuredData />

      {/* Performance Monitoring */}
      {process.env.NODE_ENV === "development" && <PerformanceMonitor />}

      <PageTransition>
        <div className="relative">
          {/* Hero Section with animated background */}
          <HeroSection />

          {/* Sticky Live Stats Bar */}
          <LiveStatsBar />

          {/* Featured Carousel - Hot Drops */}
          <FeaturedCarousel />

          {/* Trending Collections Carousel */}
          <TrendingCollections />

          {/* Featured NFTs Masonry Grid */}
          <FeaturedNFTs />

          {/* Live Activity Feed with WebSocket */}
          <LiveActivityFeed />

          {/* Creator Spotlight */}
          <CreatorSpotlight />

          {/* Multi-Chain Support Section */}
          <MultiChainSection />

          {/* Final CTA & Newsletter */}
          <FinalCTA />
        </div>
      </PageTransition>
    </>
  );
}
