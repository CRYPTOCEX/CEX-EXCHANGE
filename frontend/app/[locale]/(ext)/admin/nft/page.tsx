import type { Metadata } from "next";
import NFTAdminDashboard from "./client";

export const metadata: Metadata = {
  title: "NFT Admin Dashboard",
  description: "NFT marketplace administration and management overview",
};

export default function NFTAdminPage() {
  return <NFTAdminDashboard />;
} 