import type { Metadata } from "next";
import SettingsClient from "./client";

export const metadata: Metadata = {
  title: "AI Market Maker Settings - Admin Dashboard",
  description: "Configure AI Market Maker settings",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
