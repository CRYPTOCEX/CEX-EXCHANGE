import type { Metadata } from "next";
import AdminPaymentsPage from "./client";

export const metadata: Metadata = {
  title: "Payment Management | Admin Dashboard",
  description: "Manage payment gateway transactions",
};

export default function PaymentsPage() {
  return <AdminPaymentsPage />;
}
