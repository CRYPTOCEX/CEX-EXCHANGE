interface copyTradingLeaderMarketAttributes {
  id: string;
  leaderId: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  minBase: number;
  minQuote: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type copyTradingLeaderMarketPk = "id";
type copyTradingLeaderMarketId = copyTradingLeaderMarketAttributes[copyTradingLeaderMarketPk];
type copyTradingLeaderMarketOptionalAttributes =
  | "id"
  | "minBase"
  | "minQuote"
  | "isActive"
  | "createdAt"
  | "updatedAt";
type copyTradingLeaderMarketCreationAttributes = Optional<
  copyTradingLeaderMarketAttributes,
  copyTradingLeaderMarketOptionalAttributes
>;
