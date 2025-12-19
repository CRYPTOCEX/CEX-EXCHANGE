interface copyTradingLeaderStatsAttributes {
  id: string;
  leaderId: string;
  date: string;
  trades: number;
  winningTrades: number;
  losingTrades: number;
  volume: number;
  profit: number;
  fees: number;
  startEquity: number;
  endEquity: number;
  highEquity: number;
  lowEquity: number;
  createdAt: Date;
  updatedAt: Date;
}

type copyTradingLeaderStatsPk = "id";
type copyTradingLeaderStatsId = copyTradingLeaderStatsAttributes[copyTradingLeaderStatsPk];
type copyTradingLeaderStatsOptionalAttributes =
  | "id"
  | "trades"
  | "winningTrades"
  | "losingTrades"
  | "volume"
  | "profit"
  | "fees"
  | "startEquity"
  | "endEquity"
  | "highEquity"
  | "lowEquity"
  | "createdAt"
  | "updatedAt";
type copyTradingLeaderStatsCreationAttributes = Optional<
  copyTradingLeaderStatsAttributes,
  copyTradingLeaderStatsOptionalAttributes
>;
