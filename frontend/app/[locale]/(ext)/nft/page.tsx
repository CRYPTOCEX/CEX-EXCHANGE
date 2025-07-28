import type { Metadata } from "next";
import NFTExploreClient from "./client";

export const metadata: Metadata = {
  title: "NFT Marketplace - Explore",
  description: "Discover, buy, and sell unique digital assets on our NFT marketplace",
};

export default function NFTExplorePage() {
  return <NFTExploreClient />;
} 