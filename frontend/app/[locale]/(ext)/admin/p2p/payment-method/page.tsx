import type { Metadata } from "next";
import P2PPaymentMethodClient from "./client";

export const metadata: Metadata = {
  title: "Payment Methods Management - P2P Admin",
  description: "Manage P2P payment methods including global, system, and user-created methods",
};

export default function P2PPaymentMethodPage() {
  return <P2PPaymentMethodClient />;
}