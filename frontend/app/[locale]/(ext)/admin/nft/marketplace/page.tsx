import { Metadata } from "next";
import MarketplaceManagementClient from "./client";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export const metadata: Metadata = {
  title: "Marketplace Contract Management",
  description: "Deploy and manage NFT marketplace contracts across multiple blockchains",
};

export default function MarketplaceManagementPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <MarketplaceManagementClient />
    </div>
  );
}