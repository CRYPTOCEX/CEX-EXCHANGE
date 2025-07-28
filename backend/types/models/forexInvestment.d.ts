


interface forexInvestmentAttributes {
  id: string;
  userId: string;
  planId?: string;
  durationId?: string;
  amount?: number;
  profit?: number;
  result?: "WIN" | "LOSS" | "DRAW";
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
  endDate?: Date;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type forexInvestmentPk = "id";
type forexInvestmentId = forexInvestmentAttributes[forexInvestmentPk];
type forexInvestmentOptionalAttributes =
  | "id"
  | "planId"
  | "durationId"
  | "amount"
  | "profit"
  | "result"
  | "status"
  | "endDate"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type forexInvestmentCreationAttributes = Optional<
  forexInvestmentAttributes,
  forexInvestmentOptionalAttributes
>;
