import { Metadata } from "next";
import ListNFTPageClient from "./client";
import { LazyWalletProvider } from "@/context/wallet-lazy";

export const metadata: Metadata = {
  title: "List NFT for Sale",
  description: "List your NFT on the marketplace",
};

export default async function ListNFTPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <LazyWalletProvider cookies="">
      <ListNFTPageClient tokenId={id} />
    </LazyWalletProvider>
  );
}
