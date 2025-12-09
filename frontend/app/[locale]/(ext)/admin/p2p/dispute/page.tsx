import type { Metadata } from "next";
import AdminDisputesClient from "./client";
export const metadata: Metadata = {
  title: "Dispute Management | Admin Dashboard",
  description: "Manage and resolve disputes on the P2P platform",
};
export default function DisputesPage() {
  return <AdminDisputesClient />;
}
