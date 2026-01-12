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

  // Multi-Timeframe Volatility System Fields
  priceMode: "AUTONOMOUS" | "FOLLOW_EXTERNAL" | "HYBRID";
  externalSymbol: string | null;
  correlationStrength: number; // 0-100

  marketBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  biasStrength: number; // 0-100

  currentPhase: "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN";
  phaseStartedAt: Date | null;
  nextPhaseChangeAt: Date | null;
  phaseTargetPrice: number | null;

  baseVolatility: number; // e.g., 2.0 for 2% daily
  volatilityMultiplier: number; // 0.5-2.0
  momentumDecay: number; // 0.8-0.999

  lastKnownPrice: number | null;
  trendMomentum: number; // -1.0 to 1.0
  lastMomentumUpdate: Date | null;

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
  // Multi-Timeframe Volatility System Fields
  | "priceMode"
  | "externalSymbol"
  | "correlationStrength"
  | "marketBias"
  | "biasStrength"
  | "currentPhase"
  | "phaseStartedAt"
  | "nextPhaseChangeAt"
  | "phaseTargetPrice"
  | "baseVolatility"
  | "volatilityMultiplier"
  | "momentumDecay"
  | "lastKnownPrice"
  | "trendMomentum"
  | "lastMomentumUpdate"
  | "createdAt"
  | "updatedAt";
type aiMarketMakerCreationAttributes = Optional<
  aiMarketMakerAttributes,
  aiMarketMakerOptionalAttributes
>;
