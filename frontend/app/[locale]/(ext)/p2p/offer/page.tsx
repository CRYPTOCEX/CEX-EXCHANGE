import type { Metadata } from "next";
import { OffersPageClient } from "./client";

export const metadata: Metadata = {
  title: "P2P - Trading Marketplace",
  description:
    "Find the best P2P cryptocurrency trading offers with secure escrow protection",
};

export default function OffersPage() {
  return <OffersPageClient />;
}
