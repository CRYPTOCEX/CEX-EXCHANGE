


interface ecosystemTokenAttributes {
  id: string;
  contract: string;
  name: string;
  currency: string;
  chain: string;
  network: string;
  type: string;
  decimals: number;
  status?: boolean;
  precision?: number;
  limits?: {
    deposit?: {
      min?: number;
      max?: number;
    };
    withdrawal?: {
      min?: number;
      max?: number;
    };
  };
  fee?: {
    min: number;
    percentage: number;
  };
  icon?: string;
  contractType: "PERMIT" | "NO_PERMIT" | "NATIVE";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type ecosystemTokenPk = "id";
type ecosystemTokenId = ecosystemTokenAttributes[ecosystemTokenPk];
type ecosystemTokenOptionalAttributes =
  | "id"
  | "status"
  | "precision"
  | "limits"
  | "fee"
  | "icon"
  | "contractType"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type ecosystemTokenCreationAttributes = Optional<
  ecosystemTokenAttributes,
  ecosystemTokenOptionalAttributes
>;
