import type { Metadata } from "next";
import MarketplaceClient from "./client";

export const metadata: Metadata = {
  title: "NFT Marketplace - Buy & Sell NFTs",
  description: "Discover, buy, and sell unique NFTs on our marketplace. Find rare digital collectibles, art, and more.",
};

export default function MarketplacePage() {
  return <MarketplaceClient />;
} 