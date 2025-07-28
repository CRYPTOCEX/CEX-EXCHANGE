import type { Metadata } from "next";
import OfferDetailsClient from "./client";

export const metadata: Metadata = {
  title: "Offer Details | P2P Crypto Trading",
  description:
    "View details of this cryptocurrency trading offer and start a trade",
};

export default function OfferPage() {
  return <OfferDetailsClient />;
}
