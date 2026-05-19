import type { Metadata } from "next";
import { StakingPositionsPage } from "./client";

export const metadata: Metadata = {
  title: "My Staking Positions",
  description: "Manage your active and historical staking positions",
};

export default function PositionsPage() {
  return <StakingPositionsPage />;
}
