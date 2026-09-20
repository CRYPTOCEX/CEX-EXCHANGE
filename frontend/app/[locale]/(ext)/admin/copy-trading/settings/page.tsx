import type { Metadata } from "next";
import SettingsClient from "./client";

export const metadata: Metadata = {
  title: "Settings | Copy Trading Admin",
  description: "Configure copy trading platform settings",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
