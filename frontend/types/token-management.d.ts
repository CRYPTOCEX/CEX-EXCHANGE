// /components/blocks/market/token/management/types.ts

type DeployFormData = {
  mode: "deploy" | "import";
  chain: string;
  name: string;
  currency: string; // token symbol
  decimals: number;
  status: boolean;
  // For deploy mode:
  initialSupply?: number;
  initialHolder?: string;
  marketCap?: number;
  // For import mode:
  contract?: string;
  contractType?: "PERMIT" | "NO_PERMIT" | "NATIVE";
  network?: string;
  type?: string;
  // Common objects:
  precision: number;
  limits: {
    deposit: { min: number; max: number };
    withdraw: { min: number; max: number };
  };
  fee: {
    min: number;
    percentage: number;
  };
  icon: File | string | null;
};

type ChainOption = { id: string; name: string };
type TokenOption = { label: string; value: string };
