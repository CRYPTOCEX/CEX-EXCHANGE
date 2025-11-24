import type { Metadata } from "next";
import NFTDashboardClient from "./client";

export const metadata: Metadata = {
  title: "My NFTs - NFT Marketplace",
  description: "Manage your NFT collection, view your assets, and track your activity",
};

export default function NFTDashboardPage() {
  return <NFTDashboardClient />;
} 