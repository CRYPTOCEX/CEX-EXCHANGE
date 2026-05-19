import type { Metadata } from "next";
import StakingOverviewClient from "./client";
export const metadata: Metadata = {
  title: "Staking Overview - Admin Dashboard",
  description: "Overview of your staking operations and performance metrics",
};
export default function StakingOverviewPage() {
  return <StakingOverviewClient />;
}
