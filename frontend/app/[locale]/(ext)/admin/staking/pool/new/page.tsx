import type { Metadata } from "next";
import StakingPoolFormPage from "../components/pool-form-page";
export const metadata: Metadata = {
  title: "Add New Staking Pool - Crypto Platform",
  description: "Create a new staking pool for your users",
};
export default function NewStakingPoolPage() {
  return <StakingPoolFormPage />;
}
