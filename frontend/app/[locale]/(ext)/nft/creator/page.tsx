import type { Metadata } from "next";
import NFTDashboardClient from "./client";
import WalletProvider from "@/context/wallet";

export const metadata: Metadata = {
  title: "Creator Dashboard - NFT Marketplace",
  description: "Manage your NFT portfolio, track your creations, and view your earnings",
};

export default function NFTCreatorPage() {
  return (
    <WalletProvider cookies="">
      <NFTDashboardClient />
    </WalletProvider>
  );
} 