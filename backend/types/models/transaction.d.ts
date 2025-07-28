interface transactionAttributes {
  id: string;
  userId: string;
  walletId: string;
  type:
    | "FAILED"
    | "DEPOSIT"
    | "WITHDRAW"
    | "OUTGOING_TRANSFER"
    | "INCOMING_TRANSFER"
    | "PAYMENT"
    | "REFUND"
    | "BINARY_ORDER"
    | "EXCHANGE_ORDER"
    | "INVESTMENT"
    | "INVESTMENT_ROI"
    | "AI_INVESTMENT"
    | "AI_INVESTMENT_ROI"
    | "INVOICE"
    | "FOREX_DEPOSIT"
    | "FOREX_WITHDRAW"
    | "FOREX_INVESTMENT"
    | "FOREX_INVESTMENT_ROI"
    | "ICO_CONTRIBUTION"
    | "REFERRAL_REWARD"
    | "STAKING"
    | "STAKING_REWARD"
    | "P2P_OFFER_TRANSFER"
    | "P2P_TRADE";
  status:
    | "PENDING"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
    | "REJECTED"
    | "REFUNDED"
    | "FROZEN"
    | "PROCESSING"
    | "TIMEOUT"
    | "COMPLETED";
  amount: number;
  fee?: number;
  description?: string;
  metadata?: any;
  referenceId?: string | null;
  trxId?: string | null;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type transactionPk = "id";
type transactionId = transactionAttributes[transactionPk];
type transactionOptionalAttributes =
  | "id"
  | "status"
  | "fee"
  | "description"
  | "metadata"
  | "referenceId"
  | "trxId"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type transactionCreationAttributes = Optional<
  transactionAttributes,
  transactionOptionalAttributes
>;
