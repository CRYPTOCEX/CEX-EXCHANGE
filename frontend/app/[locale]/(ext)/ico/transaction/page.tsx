import type { Metadata } from "next";
import TransactionPageClient from "./client";

export const metadata: Metadata = {
  title: "Transactions | ICO",
  description: "View your ICO investment transaction history",
};

export default function TransactionPage() {
  return <TransactionPageClient />;
}
