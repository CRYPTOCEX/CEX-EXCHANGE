import type { Metadata } from "next";
import PositionsManagement from "./client";
export const metadata: Metadata = {
  title: "Staking Positions - Admin Dashboard",
  description: "Manage user staking positions and withdrawal requests",
};
export default function StakingPositionsPage() {
  return <PositionsManagement />;
}
