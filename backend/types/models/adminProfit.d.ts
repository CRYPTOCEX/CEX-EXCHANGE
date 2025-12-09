interface adminProfitAttributes {
  id: string;
  transactionId: string;
  type:
    | "DEPOSIT"
    | "WITHDRAW"
    | "TRANSFER"
    | "BINARY_ORDER"
    | "EXCHANGE_ORDER"
    | "INVESTMENT"
    | "AI_INVESTMENT"
    | "FOREX_DEPOSIT"
    | "FOREX_WITHDRAW"
    | "FOREX_INVESTMENT"
    | "ICO_CONTRIBUTION"
    | "STAKING"
    | "P2P_TRADE"
    | "NFT_SALE"
    | "NFT_AUCTION"
    | "NFT_OFFER"
    | "GATEWAY_PAYMENT";
  amount: number;
  currency: string;
  chain?: string | null;
  description?: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type adminProfitPk = "id";
type adminProfitId = adminProfitAttributes[adminProfitPk];
type adminProfitOptionalAttributes =
  | "id"
  | "chain"
  | "description"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type adminProfitCreationAttributes = Optional<
  adminProfitAttributes,
  adminProfitOptionalAttributes
>;
