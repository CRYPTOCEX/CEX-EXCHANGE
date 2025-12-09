interface aiBotAttributes {
  id: string;
  marketMakerId: string;
  name: string;
  personality: "SCALPER" | "SWING" | "ACCUMULATOR" | "DISTRIBUTOR" | "MARKET_MAKER";
  riskTolerance: number;
  tradeFrequency: "HIGH" | "MEDIUM" | "LOW";
  avgOrderSize: number;
  orderSizeVariance: number;
  preferredSpread: number;
  status: "ACTIVE" | "PAUSED" | "COOLDOWN";
  lastTradeAt?: Date;
  dailyTradeCount: number;
  maxDailyTrades: number;
  // Real performance tracking (only from real user trades)
  realTradesExecuted: number;
  profitableTrades: number;
  totalRealizedPnL: number;
  totalVolume: number;
  currentPosition: number;
  avgEntryPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type aiBotPk = "id";
type aiBotId = aiBotAttributes[aiBotPk];
type aiBotOptionalAttributes =
  | "id"
  | "personality"
  | "riskTolerance"
  | "tradeFrequency"
  | "avgOrderSize"
  | "orderSizeVariance"
  | "preferredSpread"
  | "status"
  | "lastTradeAt"
  | "dailyTradeCount"
  | "maxDailyTrades"
  | "realTradesExecuted"
  | "profitableTrades"
  | "totalRealizedPnL"
  | "totalVolume"
  | "currentPosition"
  | "avgEntryPrice"
  | "createdAt"
  | "updatedAt";
type aiBotCreationAttributes = Optional<
  aiBotAttributes,
  aiBotOptionalAttributes
>;
