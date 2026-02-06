import type { Metadata } from "next";
import NFTClient from "./client";

export const metadata: Metadata = {
  title: "NFT Marketplace - Discover, Collect & Sell Extraordinary NFTs",
  description: "The world's first and largest digital marketplace for crypto collectibles and non-fungible tokens. Buy, sell, and discover exclusive digital items.",
};

export default function NFTExplorePage() {
  return <NFTClient />;
} 