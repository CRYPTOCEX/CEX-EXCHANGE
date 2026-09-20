import type { Metadata } from "next";
import StakingPoolsPage from "./client";

export const metadata: Metadata = {
  title: "Staking Pools",
  description:
    "Browse and select from our range of staking pools to start earning passive income",
};

export default function PoolsPage() {
  return <StakingPoolsPage />;
}
