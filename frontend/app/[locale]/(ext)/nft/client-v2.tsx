"use client";

import HeroSection from "@/components/nft-v2/landing/HeroSection";
import LiveStatsBar from "@/components/nft-v2/landing/LiveStatsBar";
import FeaturedCarousel from "@/components/nft-v2/landing/FeaturedCarousel";
import TrendingCollections from "@/components/nft-v2/landing/TrendingCollections";
import QuickActionsGrid from "@/components/nft-v2/landing/QuickActionsGrid";
import FeaturedNFTs from "@/components/nft-v2/landing/FeaturedNFTs";
import LiveActivityFeed from "@/components/nft-v2/landing/LiveActivityFeed";
import CreatorSpotlight from "@/components/nft-v2/landing/CreatorSpotlight";
import MultiChainSection from "@/components/nft-v2/landing/MultiChainSection";
import FinalCTA from "@/components/nft-v2/landing/FinalCTA";
import PageTransition from "@/components/nft-v2/effects/PageTransition";
import StructuredData from "@/components/nft-v2/seo/StructuredData";
import PerformanceMonitor from "@/components/nft-v2/analytics/PerformanceMonitor";
import { useEffect } from "react";
import { useNftStore } from "@/store/nft/nft-store";

export default function NFTClientV2() {
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

          {/* Quick Actions Bento Grid */}
          <QuickActionsGrid />

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
