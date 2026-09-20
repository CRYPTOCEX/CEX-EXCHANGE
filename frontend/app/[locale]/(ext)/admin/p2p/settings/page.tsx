import type { Metadata } from "next";
import SettingsClient from "./client";
export const metadata: Metadata = {
  title: "Platform Settings - Admin Dashboard",
  description: "Configure your trading platform settings",
};
export default function SettingsPage() {
  return <SettingsClient />;
}
