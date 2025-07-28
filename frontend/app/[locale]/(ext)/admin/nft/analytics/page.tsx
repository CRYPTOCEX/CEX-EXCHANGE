import type { Metadata } from "next";
import NFTAnalyticsDashboard from "./client";

export const metadata: Metadata = {
  title: "NFT Analytics Dashboard",
  description: "Comprehensive analytics and insights for the NFT marketplace",
};

export default function NFTAnalyticsPage() {
  return <NFTAnalyticsDashboard />;
} 