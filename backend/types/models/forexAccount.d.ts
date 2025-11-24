


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
  dailyWithdrawLimit?: number;
  monthlyWithdrawLimit?: number;
  dailyWithdrawn?: number;
  monthlyWithdrawn?: number;
  lastWithdrawReset?: Date;
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
  | "dailyWithdrawLimit"
  | "monthlyWithdrawLimit"
  | "dailyWithdrawn"
  | "monthlyWithdrawn"
  | "lastWithdrawReset"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";

type forexAccountCreationAttributes = Optional<
  forexAccountAttributes,
  forexAccountOptionalAttributes
>;
