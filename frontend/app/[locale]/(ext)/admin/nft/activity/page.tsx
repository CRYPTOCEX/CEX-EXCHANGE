import type { Metadata } from "next";
import NFTActivityClient from "./client";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export const metadata: Metadata = {
  title: "NFT Activity | Admin Dashboard",
  description:
    "Monitor all NFT marketplace activity including mints, sales, transfers, and bids",
};

export default function NFTActivityPage() {
  return (
    <>
      <NFTActivityClient />
    </>
  );
}
