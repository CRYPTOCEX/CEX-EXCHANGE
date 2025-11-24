import type { Metadata } from "next";
import CreatorDashboardClient from "./client";

export const metadata: Metadata = {
  title: "Creator Dashboard - NFT Marketplace",
  description: "Manage your NFT collections, track sales analytics, and grow your creator profile.",
};

export default function CreatorDashboardPage() {
  return <CreatorDashboardClient />;
} 