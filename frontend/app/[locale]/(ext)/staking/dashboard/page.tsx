import type { Metadata } from "next";
import StakingDashboard from "./client";

export const metadata: Metadata = {
  title: "Staking Dashboard | Manage Your Stakes",
  description: "View and manage your staking positions and rewards",
};

export default function DashboardPage() {
  return <StakingDashboard />;
}
