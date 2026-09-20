import type { Metadata } from "next";
import CreatorProfileClient from "./client";

export const metadata: Metadata = {
  title: "Creator Profile Settings - NFT Marketplace",
  description: "Customize your creator profile, display name, bio, and banner image.",
};

export default function CreatorProfilePage() {
  return <CreatorProfileClient />;
} 