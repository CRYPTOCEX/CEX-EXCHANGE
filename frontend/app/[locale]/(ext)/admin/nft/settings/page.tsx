import type { Metadata } from "next";
import NFTSettingsClient from "./client";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export const metadata: Metadata = {
  title: "NFT Marketplace Settings",
  description: "Configure NFT marketplace parameters and policies",
};

export default function NFTSettingsPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <NFTSettingsClient />
    </div>
  );
} 