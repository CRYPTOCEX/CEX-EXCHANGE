import type { Metadata } from "next";
import CreatorDashboardClient from "./client";

export const metadata: Metadata = {
  title: "Creator Dashboard | TokenLaunch",
  description: "Manage your token offerings and track investor activity",
};

export default function CreatorDashboardPage() {
  return <CreatorDashboardClient />;
}
