import { Metadata } from "next";
import MarketplaceManagementClient from "./client";

export const metadata: Metadata = {
  title: "Marketplace Contract Management",
  description: "Deploy and manage NFT marketplace contracts across multiple blockchains",
};

export default function MarketplaceManagementPage() {
  return <MarketplaceManagementClient />;
}