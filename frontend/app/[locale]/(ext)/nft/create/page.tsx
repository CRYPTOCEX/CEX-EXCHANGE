import type { Metadata } from "next";
import CreateNFTClient from "./client";
import WalletProvider from "@/context/wallet";

export const metadata: Metadata = {
  title: "Create NFT - NFT Marketplace",
  description: "Create and mint your unique digital asset on our NFT marketplace",
};

export default function CreateNFTPage() {
  return (
    <WalletProvider cookies="">
      <CreateNFTClient />
    </WalletProvider>
  );
} 