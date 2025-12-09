import { IStrategy, StrategyConfig, StrategyResult } from "./IStrategy";

/**
 * GradualDriftStrategy - Slowly moves price toward target
 *
 * This strategy:
 * - Makes small, incremental price movements
 * - Adjusts step size based on distance from target
 * - Adds randomization for natural-looking movement
 * - Respects aggression level settings
 */
export class GradualDriftStrategy implements IStrategy {
  public name = "gradual_drift";

  public calculate(
    currentPrice: bigint,
    targetPrice: bigint,
    config: StrategyConfig
  ): StrategyResult {
    const current = Number(currentPrice) / 1e18;
    const target = Number(targetPrice) / 1e18;

    // Calculate distance from target
    const distance = target - current;
    const distancePercent = (distance / current) * 100;
    const absDistance = Math.abs(distancePercent);

    // If already at target (within 0.1%), don't trade
    if (absDistance < 0.1) {
      return {
        shouldTrade: false,
        direction: "BUY",
        priceAdjustment: 0,
        sizeMultiplier: 1,
        confidence: 0.5,
        reason: "Already at target price",
      };
    }

    // Determine direction
    const direction: "BUY" | "SELL" = distance > 0 ? "BUY" : "SELL";

    // Calculate step size based on aggression and distance
    const maxStep = this.getMaxStep(config.aggressionLevel);
    let stepSize = Math.min(absDistance * 0.1, maxStep);

    // Add randomization (80-120% of calculated step)
    const randomFactor = 0.8 + Math.random() * 0.4;
    stepSize *= randomFactor;

    // Reduce step if volatility is high
    if (config.currentVolatility > config.volatilityThreshold) {
      stepSize *= 0.5;
    }

    // Calculate size multiplier based on distance
    // Trade larger when far from target, smaller when close
    let sizeMultiplier = 1;
    if (absDistance > 5) {
      sizeMultiplier = 1.5;
    } else if (absDistance < 1) {
      sizeMultiplier = 0.5;
    }

    // Calculate confidence based on how clear the signal is
    const confidence = Math.min(1, absDistance / 10);

    return {
      shouldTrade: true,
      direction,
      priceAdjustment: direction === "BUY" ? stepSize : -stepSize,
      sizeMultiplier,
      confidence,
      reason: `Moving ${direction} toward target (${distancePercent.toFixed(2)}% away)`,
    };
  }

  /**
   * Get maximum step size based on aggression level
   */
  private getMaxStep(aggression: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE"): number {
    switch (aggression) {
      case "AGGRESSIVE":
        return 0.5; // 0.5% max step
      case "MODERATE":
        return 0.2; // 0.2% max step
      case "CONSERVATIVE":
      default:
        return 0.1; // 0.1% max step
    }
  }
}

export default GradualDriftStrategy;
