import type { Metadata } from "next";
import NFTAnalyticsDashboard from "./client";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export const metadata: Metadata = {
  title: "NFT Analytics Dashboard",
  description: "Comprehensive analytics and insights for the NFT marketplace",
};

export default function NFTAnalyticsPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <NFTAnalyticsDashboard />
    </div>
  );
} 