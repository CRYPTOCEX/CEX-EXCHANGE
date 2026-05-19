import type { Metadata } from "next";
import TradingSettingsClient from "./client";

export const metadata: Metadata = {
  title: "Trading Settings - Admin Dashboard",
  description: "Configure your trading settings",
};

export default function TradingSettingsPage() {
  return <TradingSettingsClient />;
}
