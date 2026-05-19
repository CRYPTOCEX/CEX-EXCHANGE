import type { Metadata } from "next";
import StakingSettingsClient from "./client";
export const metadata: Metadata = {
  title: "Staking Settings - Admin Dashboard",
  description: "Configure your staking platform settings",
};
export default function StakingSettingsPage() {
  return <StakingSettingsClient />;
}
