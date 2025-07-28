


interface forexAccountAttributes {
  id: string;
  userId?: string;
  accountId?: string;
  password?: string;
  broker?: string;
  mt?: number;
  balance: number;
  leverage?: number;
  type: "DEMO" | "LIVE";
  status?: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type forexAccountPk = "id";
type forexAccountId = forexAccountAttributes[forexAccountPk];
type forexAccountOptionalAttributes =
  | "id"
  | "userId"
  | "accountId"
  | "password"
  | "broker"
  | "mt"
  | "balance"
  | "leverage"
  | "type"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";

type forexAccountCreationAttributes = Optional<
  forexAccountAttributes,
  forexAccountOptionalAttributes
>;
