import type { Metadata } from "next";
import StakingPoolFormPage from "../../components/pool-form-page";

export const metadata: Metadata = {
  title: "Edit Staking Pool - Crypto Platform",
  description: "Modify an existing staking pool",
};

export default function EditStakingPoolPage() {
  return <StakingPoolFormPage />;
}
