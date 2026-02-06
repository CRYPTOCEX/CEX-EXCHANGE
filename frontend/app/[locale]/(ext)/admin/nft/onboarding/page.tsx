import { Metadata } from "next";
import NFTAdminOnboardingClient from "./client";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export const metadata: Metadata = {
  title: "NFT Admin Onboarding",
  description: "Complete setup guide for NFT marketplace administrators",
};

export default function NFTAdminOnboardingPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <NFTAdminOnboardingClient />
    </div>
  );
}