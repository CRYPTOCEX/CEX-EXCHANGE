import type { Metadata } from "next";
import AdminGatewaySettingsPage from "./client";

export const metadata: Metadata = {
  title: "Gateway Settings | Admin Dashboard",
  description: "Configure payment gateway settings",
};

export default function SettingsPage() {
  return <AdminGatewaySettingsPage />;
}
