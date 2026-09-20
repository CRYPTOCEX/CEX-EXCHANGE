import type { Metadata } from "next";
import AffiliateSettingsClient from "./client";
export const metadata: Metadata = {
  title: "Affiliate Settings - Admin Dashboard",
  description: "Configure your affiliate system settings",
};
export default function AffiliateSettingsPage() {
  return <AffiliateSettingsClient />;
}
