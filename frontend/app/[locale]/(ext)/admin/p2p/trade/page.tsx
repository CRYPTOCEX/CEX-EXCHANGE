import type { Metadata } from "next";
import AdminTradesClient from "./client";
export const metadata: Metadata = {
  title: "Trade Management | Admin Dashboard",
  description: "Manage trades on the P2P platform",
};
export default function TradesPage() {
  return <AdminTradesClient />;
}
