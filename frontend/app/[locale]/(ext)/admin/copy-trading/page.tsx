import type { Metadata } from "next";
import DashboardClient from "./client";

export const metadata: Metadata = {
  title: "Copy Trading Admin | Dashboard",
  description: "Manage copy trading platform",
};

export default function AdminCopyTradingPage() {
  return <DashboardClient />;
}
