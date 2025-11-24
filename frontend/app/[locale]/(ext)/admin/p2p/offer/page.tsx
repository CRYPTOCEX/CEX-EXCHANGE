import type { Metadata } from "next";
import AdminOffersPage from "./client";

export const metadata: Metadata = {
  title: "Offer Management | Admin Dashboard",
  description: "Manage trade offers on the CryptoP2P platform",
};

export default function OffersPage() {
  return <AdminOffersPage />;
}
