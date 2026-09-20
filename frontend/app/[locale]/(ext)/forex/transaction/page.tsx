import type { Metadata } from "next";
import ForexTransactionsClient from "./client";

export const metadata: Metadata = {
  title: "Forex Transactions",
  description: "View and manage your forex transaction history",
};

export default function ForexTransactionsPage() {
  return <ForexTransactionsClient />;
} 