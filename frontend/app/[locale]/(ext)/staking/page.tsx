import type { Metadata } from "next";
import StakingLanding from "./client";

export const metadata: Metadata = {
  title: "Staking | Earn Rewards",
  description:
    "Stake your crypto assets and earn passive income with our secure staking platform",
};

export default function StakingPage() {
  return <StakingLanding />;
}
