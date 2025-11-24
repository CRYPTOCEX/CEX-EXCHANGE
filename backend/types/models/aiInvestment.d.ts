interface aiInvestmentAttributes {
  id: string;
  userId: string;
  planId: string;
  durationId?: string;
  symbol: string;
  type: "SPOT" | "ECO";
  amount: number;
  profit?: number;
  result?: "WIN" | "LOSS" | "DRAW";
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type aiInvestmentPk = "id";
type aiInvestmentId = aiInvestmentAttributes[aiInvestmentPk];
type aiInvestmentOptionalAttributes =
  | "id"
  | "durationId"
  | "profit"
  | "result"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type aiInvestmentCreationAttributes = Optional<
  aiInvestmentAttributes,
  aiInvestmentOptionalAttributes
>;
