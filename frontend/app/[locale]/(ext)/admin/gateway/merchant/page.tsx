import type { Metadata } from "next";
import AdminMerchantsPage from "./client";

export const metadata: Metadata = {
  title: "Merchant Management | Admin Dashboard",
  description: "Manage payment gateway merchants",
};

export default function MerchantsPage() {
  return <AdminMerchantsPage />;
}
