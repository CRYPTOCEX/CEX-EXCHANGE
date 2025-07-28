import type { Metadata } from "next";
import NFTSettingsClient from "./client";

export const metadata: Metadata = {
  title: "NFT Marketplace Settings",
  description: "Configure NFT marketplace parameters and policies",
};

export default function NFTSettingsPage() {
  return <NFTSettingsClient />;
} 