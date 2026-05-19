import type { Metadata } from "next";
import EditOfferClient from "./client";

export const metadata: Metadata = {
  title: "Edit Offer | P2P Crypto Trading",
  description: "Edit your cryptocurrency trading offer settings and requirements",
};

export default function EditOfferPage() {
  return <EditOfferClient />;
} 