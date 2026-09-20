import type { Metadata } from "next";
import { StakingEarningsClient } from "./client";
export const metadata: Metadata = {
  title: "Staking Earnings - Admin Dashboard",
  description: "Manage and distribute earnings across your staking pools",
};
export default function StakingEarningsPage() {
  return <StakingEarningsClient />;
}
