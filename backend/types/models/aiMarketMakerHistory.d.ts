interface aiMarketMakerHistoryAttributes {
  id: string;
  marketMakerId: string;
  action:
    | "TRADE"
    | "PAUSE"
    | "RESUME"
    | "REBALANCE"
    | "TARGET_CHANGE"
    | "DEPOSIT"
    | "WITHDRAW"
    | "START"
    | "STOP"
    | "CONFIG_CHANGE"
    | "EMERGENCY_STOP"
    | "AUTO_PAUSE";
  details?: Record<string, any>;
  priceAtAction: number;
  poolValueAtAction: number;
  createdAt?: Date;
}

type aiMarketMakerHistoryPk = "id";
type aiMarketMakerHistoryId =
  aiMarketMakerHistoryAttributes[aiMarketMakerHistoryPk];
type aiMarketMakerHistoryOptionalAttributes =
  | "id"
  | "details"
  | "priceAtAction"
  | "poolValueAtAction"
  | "createdAt";
type aiMarketMakerHistoryCreationAttributes = Optional<
  aiMarketMakerHistoryAttributes,
  aiMarketMakerHistoryOptionalAttributes
>;
