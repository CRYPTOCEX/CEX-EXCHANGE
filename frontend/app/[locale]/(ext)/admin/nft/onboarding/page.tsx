import { Metadata } from "next";
import NFTAdminOnboardingClient from "./client";

export const metadata: Metadata = {
  title: "NFT Admin Onboarding",
  description: "Complete setup guide for NFT marketplace administrators",
};

export default function NFTAdminOnboardingPage() {
  return <NFTAdminOnboardingClient />;
}