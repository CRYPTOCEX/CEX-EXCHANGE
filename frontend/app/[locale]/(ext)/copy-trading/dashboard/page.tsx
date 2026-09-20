import type { Metadata } from "next";
import DashboardPage from "./client";

export const metadata: Metadata = {
  title: "Leader Dashboard | Copy Trading",
  description: "Manage your copy trading leader profile",
};

export default function Page() {
  return <DashboardPage />;
}
