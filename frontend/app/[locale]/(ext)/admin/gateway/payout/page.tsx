import type { Metadata } from "next";
import AdminPayoutsPage from "./client";

export const metadata: Metadata = {
  title: "Payout Management | Admin Dashboard",
  description: "Manage merchant payouts",
};

export default function PayoutsPage() {
  return <AdminPayoutsPage />;
}
