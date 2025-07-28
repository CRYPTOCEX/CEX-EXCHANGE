interface forexPlanAttributes {
  id: string;
  name: string;
  title?: string;
  description?: string;
  image?: string;
  currency: string;
  walletType: string;
  minProfit: number;
  maxProfit: number;
  minAmount?: number;
  maxAmount?: number;
  profitPercentage: number;
  status?: boolean;
  defaultProfit: number;
  defaultResult: "WIN" | "LOSS" | "DRAW";
  trending?: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type forexPlanPk = "id";
type forexPlanId = forexPlanAttributes[forexPlanPk];
type forexPlanOptionalAttributes =
  | "id"
  | "title"
  | "description"
  | "image"
  | "minAmount"
  | "maxAmount"
  | "profitPercentage"
  | "status"
  | "defaultProfit"
  | "trending"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type forexPlanCreationAttributes = Optional<
  forexPlanAttributes,
  forexPlanOptionalAttributes
>;
