import type { Metadata } from "next";
import DashboardClientPage from "./client";

export const metadata: Metadata = {
  title: "Dashboard | TokenLaunch",
  description: "Manage your investments and track your portfolio performance",
};

export default function DashboardPage() {
  return <DashboardClientPage />;
}
