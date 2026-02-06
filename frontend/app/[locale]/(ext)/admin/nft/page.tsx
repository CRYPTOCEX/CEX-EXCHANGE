import type { Metadata } from "next";
import NFTAdminDashboard from "./client";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export const metadata: Metadata = {
  title: "NFT Admin Dashboard",
  description: "NFT marketplace administration and management overview",
};

export default function NFTAdminPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <NFTAdminDashboard />
    </div>
  );
} 