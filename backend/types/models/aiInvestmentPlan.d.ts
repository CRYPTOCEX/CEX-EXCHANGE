interface aiInvestmentPlanAttributes {
  id: string;
  name: string;
  title: string;
  description?: string;
  image?: string;
  status?: boolean;
  invested: number;
  profitPercentage: number;
  minProfit: number;
  maxProfit: number;
  minAmount: number;
  maxAmount: number;
  trending?: boolean;
  defaultProfit: number;
  defaultResult: "WIN" | "LOSS" | "DRAW";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type aiInvestmentPlanPk = "id";
type aiInvestmentPlanId = aiInvestmentPlanAttributes[aiInvestmentPlanPk];
type aiInvestmentPlanOptionalAttributes =
  | "id"
  | "description"
  | "image"
  | "status"
  | "invested"
  | "profitPercentage"
  | "minAmount"
  | "trending"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type aiInvestmentPlanCreationAttributes = Optional<
  aiInvestmentPlanAttributes,
  aiInvestmentPlanOptionalAttributes
>;
