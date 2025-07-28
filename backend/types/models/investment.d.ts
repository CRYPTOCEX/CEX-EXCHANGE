


interface investmentAttributes {
  id: string;
  userId: string;
  planId: string;
  durationId: string;
  amount: number;
  profit?: number;
  result?: "WIN" | "LOSS" | "DRAW";
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
  endDate?: Date;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type investmentPk = "id";
type investmentId = investmentAttributes[investmentPk];
type investmentOptionalAttributes =
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
type investmentCreationAttributes = Optional<
  investmentAttributes,
  investmentOptionalAttributes
>;
