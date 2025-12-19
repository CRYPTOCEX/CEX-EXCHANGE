type TransactionType =
  | "ALLOCATION"
  | "DEALLOCATION"
  | "PROFIT_SHARE"
  | "TRADE_PROFIT"
  | "TRADE_LOSS"
  | "FEE"
  | "REFUND";
type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

interface copyTradingTransactionAttributes {
  id: string;
  userId: string;
  leaderId?: string;
  followerId?: string;
  tradeId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  fee: number;
  balanceBefore: number;
  balanceAfter: number;
  status: TransactionStatus;
  description?: string;
  metadata?: string;
  createdAt: Date;
  updatedAt: Date;
}

type copyTradingTransactionPk = "id";
type copyTradingTransactionId = copyTradingTransactionAttributes[copyTradingTransactionPk];
type copyTradingTransactionOptionalAttributes =
  | "id"
  | "leaderId"
  | "followerId"
  | "tradeId"
  | "description"
  | "metadata"
  | "createdAt"
  | "updatedAt";
type copyTradingTransactionCreationAttributes = Optional<
  copyTradingTransactionAttributes,
  copyTradingTransactionOptionalAttributes
>;
