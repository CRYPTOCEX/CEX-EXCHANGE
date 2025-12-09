import { IStrategy, StrategyConfig, StrategyResult } from "./IStrategy";

/**
 * SupportResistanceStrategy - Builds support and resistance levels
 *
 * This strategy:
 * - Creates natural support levels below target
 * - Creates resistance levels above target
 * - Defends price levels with increased volume
 * - Creates more natural market structure
 */
export class SupportResistanceStrategy implements IStrategy {
  public name = "support_resistance";

  // Track support/resistance levels
  private supportLevels: Map<string, number[]> = new Map();
  private resistanceLevels: Map<string, number[]> = new Map();

  public calculate(
    currentPrice: bigint,
    targetPrice: bigint,
    config: StrategyConfig
  ): StrategyResult {
    const current = Number(currentPrice) / 1e18;
    const target = Number(targetPrice) / 1e18;

    // Calculate key levels
    const levels = this.calculateLevels(target, config);

    // Find nearest support and resistance
    const nearestSupport = this.findNearestBelow(current, levels.support);
    const nearestResistance = this.findNearestAbove(current, levels.resistance);

    // Calculate distance to levels
    const distToSupport = nearestSupport ? (current - nearestSupport) / current * 100 : 100;
    const distToResistance = nearestResistance ? (nearestResistance - current) / current * 100 : 100;

    // Determine action based on position relative to levels
    if (distToSupport < 0.5) {
      // Near support - defend it with buys
      return {
        shouldTrade: true,
        direction: "BUY",
        priceAdjustment: 0.05,
        sizeMultiplier: 1.5, // Larger volume at support
        confidence: 0.9,
        reason: `Defending support at ${nearestSupport?.toFixed(8)}`,
      };
    }

    if (distToResistance < 0.5) {
      // Near resistance - defend it with sells
      return {
        shouldTrade: true,
        direction: "SELL",
        priceAdjustment: 0.05,
        sizeMultiplier: 1.5, // Larger volume at resistance
        confidence: 0.9,
        reason: `Defending resistance at ${nearestResistance?.toFixed(8)}`,
      };
    }

    // If between levels, push toward target
    const distToTarget = (target - current) / current * 100;

    if (Math.abs(distToTarget) < 0.5) {
      // At target - maintain with small oscillations
      return {
        shouldTrade: Math.random() > 0.7, // Only trade 30% of time
        direction: Math.random() > 0.5 ? "BUY" : "SELL",
        priceAdjustment: 0.02,
        sizeMultiplier: 0.5,
        confidence: 0.3,
        reason: "Maintaining around target",
      };
    }

    // Push toward target
    const direction: "BUY" | "SELL" = distToTarget > 0 ? "BUY" : "SELL";

    return {
      shouldTrade: true,
      direction,
      priceAdjustment: Math.min(0.1, Math.abs(distToTarget) * 0.1),
      sizeMultiplier: 1,
      confidence: 0.6,
      reason: `Moving toward target (${distToTarget.toFixed(2)}% away)`,
    };
  }

  /**
   * Calculate support and resistance levels
   */
  private calculateLevels(
    target: number,
    config: StrategyConfig
  ): { support: number[]; resistance: number[] } {
    const support: number[] = [];
    const resistance: number[] = [];

    // Calculate level spacing based on aggression
    const spacing = this.getLevelSpacing(config.aggressionLevel);

    // Create levels around target
    for (let i = 1; i <= 5; i++) {
      support.push(target * (1 - spacing * i));
      resistance.push(target * (1 + spacing * i));
    }

    // Add range boundaries as strong levels
    support.push(config.priceRangeLow);
    resistance.push(config.priceRangeHigh);

    return {
      support: support.sort((a, b) => b - a), // Descending
      resistance: resistance.sort((a, b) => a - b), // Ascending
    };
  }

  /**
   * Find nearest level below price
   */
  private findNearestBelow(price: number, levels: number[]): number | null {
    for (const level of levels) {
      if (level < price) {
        return level;
      }
    }
    return null;
  }

  /**
   * Find nearest level above price
   */
  private findNearestAbove(price: number, levels: number[]): number | null {
    for (const level of levels) {
      if (level > price) {
        return level;
      }
    }
    return null;
  }

  /**
   * Get level spacing based on aggression
   */
  private getLevelSpacing(aggression: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE"): number {
    switch (aggression) {
      case "AGGRESSIVE":
        return 0.01; // 1% spacing
      case "MODERATE":
        return 0.02; // 2% spacing
      case "CONSERVATIVE":
      default:
        return 0.03; // 3% spacing
    }
  }
}

export default SupportResistanceStrategy;
