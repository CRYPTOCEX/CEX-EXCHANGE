import type { Metadata } from "next";
import StakingPoolsClient from "./client";
export const metadata: Metadata = {
  title: "Staking Pools - Admin Dashboard",
  description: "Manage your staking pools and their configurations",
};
export default function StakingPoolsPage() {
  return <StakingPoolsClient />;
}
