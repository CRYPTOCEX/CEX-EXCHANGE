interface aiMarketMakerPoolAttributes {
  id: string;
  marketMakerId: string;
  baseCurrencyBalance: number;
  quoteCurrencyBalance: number;
  initialBaseBalance: number;
  initialQuoteBalance: number;
  totalValueLocked: number;
  unrealizedPnL: number;
  realizedPnL: number;
  lastRebalanceAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

type aiMarketMakerPoolPk = "id";
type aiMarketMakerPoolId = aiMarketMakerPoolAttributes[aiMarketMakerPoolPk];
type aiMarketMakerPoolOptionalAttributes =
  | "id"
  | "baseCurrencyBalance"
  | "quoteCurrencyBalance"
  | "initialBaseBalance"
  | "initialQuoteBalance"
  | "totalValueLocked"
  | "unrealizedPnL"
  | "realizedPnL"
  | "lastRebalanceAt"
  | "createdAt"
  | "updatedAt";
type aiMarketMakerPoolCreationAttributes = Optional<
  aiMarketMakerPoolAttributes,
  aiMarketMakerPoolOptionalAttributes
>;
