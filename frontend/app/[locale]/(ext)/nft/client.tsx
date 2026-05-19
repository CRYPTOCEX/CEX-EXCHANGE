"use client";

import HeroSection from "@/app/[locale]/(ext)/nft/components/landing/HeroSection";
import LiveStatsBar from "@/app/[locale]/(ext)/nft/components/landing/LiveStatsBar";
import FeaturedCarousel from "@/app/[locale]/(ext)/nft/components/landing/FeaturedCarousel";
import TrendingCollections from "@/app/[locale]/(ext)/nft/components/landing/TrendingCollections";
import FeaturedNFTs from "@/app/[locale]/(ext)/nft/components/landing/FeaturedNFTs";
import LiveActivityFeed from "@/app/[locale]/(ext)/nft/components/landing/LiveActivityFeed";
import CreatorSpotlight from "@/app/[locale]/(ext)/nft/components/landing/CreatorSpotlight";
import MultiChainSection from "@/app/[locale]/(ext)/nft/components/landing/MultiChainSection";
import FinalCTA from "@/app/[locale]/(ext)/nft/components/landing/FinalCTA";
import PageTransition from "@/app/[locale]/(ext)/nft/components/effects/PageTransition";
import StructuredData from "@/app/[locale]/(ext)/nft/components/seo/StructuredData";
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
