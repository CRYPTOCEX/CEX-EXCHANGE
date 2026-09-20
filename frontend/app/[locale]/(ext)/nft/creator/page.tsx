import type { Metadata } from "next";
import NFTDashboardClient from "./client";
import { LazyWalletProvider } from "@/context/wallet-lazy";

export const metadata: Metadata = {
  title: "Creator Dashboard - NFT Marketplace",
  description: "Manage your NFT portfolio, track your creations, and view your earnings",
};

export default function NFTCreatorPage() {
  return (
    <LazyWalletProvider cookies="">
      <NFTDashboardClient />
    </LazyWalletProvider>
  );
} 