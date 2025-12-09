interface aiMarketMakerAttributes {
  id: string;
  marketId: string;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
  targetPrice: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  aggressionLevel: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  maxDailyVolume: number;
  currentDailyVolume: number;
  volatilityThreshold: number;
  pauseOnHighVolatility: boolean;
  realLiquidityPercent: number; // 0-100: % of orders placed in real ecosystem (0 = AI-only)
  createdAt?: Date;
  updatedAt?: Date;
}

type aiMarketMakerPk = "id";
type aiMarketMakerId = aiMarketMakerAttributes[aiMarketMakerPk];
type aiMarketMakerOptionalAttributes =
  | "id"
  | "status"
  | "targetPrice"
  | "priceRangeLow"
  | "priceRangeHigh"
  | "aggressionLevel"
  | "maxDailyVolume"
  | "currentDailyVolume"
  | "volatilityThreshold"
  | "pauseOnHighVolatility"
  | "realLiquidityPercent"
  | "createdAt"
  | "updatedAt";
type aiMarketMakerCreationAttributes = Optional<
  aiMarketMakerAttributes,
  aiMarketMakerOptionalAttributes
>;
