/**
 * Strategy configuration
 */
export interface StrategyConfig {
  aggressionLevel: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  priceRangeLow: number;
  priceRangeHigh: number;
  volatilityThreshold: number;
  currentVolatility: number;
}

/**
 * Strategy result
 */
export interface StrategyResult {
  shouldTrade: boolean;
  direction: "BUY" | "SELL";
  priceAdjustment: number; // Percentage to adjust price
  sizeMultiplier: number; // Multiplier for order size
  confidence: number; // 0-1 confidence level
  reason?: string;
}

/**
 * IStrategy - Interface for all trading strategies
 */
export interface IStrategy {
  /**
   * Strategy name (unique identifier)
   */
  name: string;

  /**
   * Calculate trading decision
   *
   * @param currentPrice - Current market price
   * @param targetPrice - Target price to move toward
   * @param config - Strategy configuration
   * @returns Strategy result with trading decision
   */
  calculate(
    currentPrice: bigint,
    targetPrice: bigint,
    config: StrategyConfig
  ): StrategyResult;
}

export default IStrategy;
