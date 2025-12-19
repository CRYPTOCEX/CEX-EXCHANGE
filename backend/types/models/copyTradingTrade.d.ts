type TradeStatus =
  | "PENDING"
  | "PENDING_REPLICATION"
  | "REPLICATED"
  | "REPLICATION_FAILED"
  | "OPEN"
  | "CLOSED"
  | "PARTIALLY_FILLED"
  | "FAILED"
  | "CANCELLED";
type TradeSide = "BUY" | "SELL";
type TradeType = "MARKET" | "LIMIT";

interface copyTradingTradeAttributes {
  id: string;
  leaderId: string;
  followerId?: string;
  leaderOrderId?: string;
  symbol: string;
  side: TradeSide;
  type: TradeType;
  amount: number;
  price: number;
  cost: number;
  fee: number;
  feeCurrency: string;
  executedAmount: number;
  executedPrice: number;
  slippage?: number;
  latencyMs?: number;
  profit?: number;
  profitPercent?: number;
  profitCurrency?: string;
  status: TradeStatus;
  errorMessage?: string;
  isLeaderTrade: boolean;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

type copyTradingTradePk = "id";
type copyTradingTradeId = copyTradingTradeAttributes[copyTradingTradePk];
type copyTradingTradeOptionalAttributes =
  | "id"
  | "followerId"
  | "leaderOrderId"
  | "slippage"
  | "latencyMs"
  | "profit"
  | "profitPercent"
  | "profitCurrency"
  | "errorMessage"
  | "createdAt"
  | "updatedAt"
  | "closedAt";
type copyTradingTradeCreationAttributes = Optional<
  copyTradingTradeAttributes,
  copyTradingTradeOptionalAttributes
>;
