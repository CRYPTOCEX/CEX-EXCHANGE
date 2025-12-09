import type { Metadata } from "next";
import CreateOfferClient from "./client";

export const metadata: Metadata = {
  title: "Create P2P Offer",
  description: "Step-by-step guide to create your trade offer",
};

export default function CreateOfferPage() {
  // Let the client component handle everything
  return <CreateOfferClient />;
}
