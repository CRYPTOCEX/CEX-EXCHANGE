import type { Metadata } from "next";
import OfferingsPageClient from "./client";

export const metadata: Metadata = {
  title: "Token Offerings | TokenLaunch",
  description: "Browse active, upcoming, and completed token offerings",
};

export default function OfferingsPage() {
  return <OfferingsPageClient />;
}
