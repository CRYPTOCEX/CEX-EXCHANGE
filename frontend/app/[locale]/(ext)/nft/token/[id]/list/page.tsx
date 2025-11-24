import { Metadata } from "next";
import ListNFTPageClient from "./client";
import WalletProvider from "@/context/wallet";

export const metadata: Metadata = {
  title: "List NFT for Sale",
  description: "List your NFT on the marketplace",
};

export default async function ListNFTPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <WalletProvider cookies="">
      <ListNFTPageClient tokenId={id} />
    </WalletProvider>
  );
}
