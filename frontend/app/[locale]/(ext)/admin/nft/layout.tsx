import { Metadata } from "next";
import Footer from "@/components/partials/footer";
import NFTAdminNavbar from "./components/navbar";

export const metadata: Metadata = {
  title: "NFT Admin Dashboard",
  description: "Manage NFT collections, NFTs, listings, and marketplace settings",
};

export default function NFTAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NFTAdminNavbar />
      <main className="flex-1 mx-auto container pt-8 space-y-8 pb-24">
        {children}
      </main>
      <Footer />
    </>
  );
} 