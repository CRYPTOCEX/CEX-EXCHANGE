



interface investmentPlanAttributes {
  id: string;
  name: string;
  title: string;
  image?: string;
  description: string;
  currency: string;
  walletType: string;
  minAmount: number;
  maxAmount: number;
  profitPercentage: number;
  invested: number;
  minProfit: number;
  maxProfit: number;
  defaultProfit: number;
  defaultResult: "WIN" | "LOSS" | "DRAW";
  trending?: boolean;
  status?: boolean;
  durations?: investmentDurationAttributes[];
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type investmentPlanPk = "id";
type investmentPlanId = investmentPlanAttributes[investmentPlanPk];
type investmentPlanOptionalAttributes =
  | "id"
  | "image"
  | "currency"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type investmentPlanCreationAttributes = Optional<
  investmentPlanAttributes,
  investmentPlanOptionalAttributes
>;
