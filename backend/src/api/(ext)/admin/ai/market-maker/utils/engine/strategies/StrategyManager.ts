import { IStrategy, StrategyConfig, StrategyResult } from "./IStrategy";
import { GradualDriftStrategy } from "./GradualDriftStrategy";
import { OscillationStrategy } from "./OscillationStrategy";
import { SupportResistanceStrategy } from "./SupportResistanceStrategy";

/**
 * StrategyManager - Manages and coordinates trading strategies
 *
 * Handles:
 * - Strategy selection based on market conditions
 * - Strategy switching
 * - Combined strategy execution
 */
export class StrategyManager {
  private strategies: Map<string, IStrategy> = new Map();
  private activeStrategies: Map<string, string[]> = new Map(); // marketId -> strategy names

  constructor() {
    // Initialize default strategies
    this.registerStrategy(new GradualDriftStrategy());
    this.registerStrategy(new OscillationStrategy());
    this.registerStrategy(new SupportResistanceStrategy());
  }

  /**
   * Register a strategy
   */
  public registerStrategy(strategy: IStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Get a strategy by name
   */
  public getStrategy(name: string): IStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Get all available strategies
   */
  public getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Set active strategies for a market
   */
  public setActiveStrategies(marketId: string, strategyNames: string[]): void {
    this.activeStrategies.set(marketId, strategyNames);
  }

  /**
   * Get active strategies for a market
   */
  public getActiveStrategies(marketId: string): string[] {
    return this.activeStrategies.get(marketId) || ["gradual_drift"]; // Default
  }

  /**
   * Calculate combined strategy result
   */
  public calculate(
    marketId: string,
    currentPrice: bigint,
    targetPrice: bigint,
    config: StrategyConfig
  ): StrategyResult {
    const activeNames = this.getActiveStrategies(marketId);
    const results: StrategyResult[] = [];

    for (const name of activeNames) {
      const strategy = this.strategies.get(name);
      if (strategy) {
        const result = strategy.calculate(currentPrice, targetPrice, config);
        results.push(result);
      }
    }

    if (results.length === 0) {
      return {
        shouldTrade: false,
        direction: "BUY",
        priceAdjustment: 0,
        sizeMultiplier: 1,
        confidence: 0,
      };
    }

    // Combine results (weighted average)
    return this.combineResults(results);
  }

  /**
   * Select best strategy for current conditions
   */
  public selectStrategy(
    marketId: string,
    volatility: number,
    distanceFromTarget: number
  ): string {
    // High volatility -> oscillation strategy
    if (volatility > 5) {
      return "oscillation";
    }

    // Far from target -> gradual drift
    if (Math.abs(distanceFromTarget) > 5) {
      return "gradual_drift";
    }

    // Near target -> support/resistance
    return "support_resistance";
  }

  /**
   * Auto-select and set strategies based on conditions
   */
  public autoSelectStrategies(
    marketId: string,
    volatility: number,
    distanceFromTarget: number
  ): void {
    const primary = this.selectStrategy(marketId, volatility, distanceFromTarget);

    // Always include the primary strategy
    const strategies = [primary];

    // Add complementary strategies
    if (primary !== "oscillation" && volatility > 2) {
      strategies.push("oscillation");
    }

    this.setActiveStrategies(marketId, strategies);
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Combine multiple strategy results
   */
  private combineResults(results: StrategyResult[]): StrategyResult {
    if (results.length === 1) {
      return results[0];
    }

    // Weight by confidence
    let totalWeight = 0;
    let weightedPriceAdj = 0;
    let weightedSizeMultiplier = 0;
    let shouldTrade = false;
    let primaryDirection: "BUY" | "SELL" = "BUY";
    let buyVotes = 0;
    let sellVotes = 0;

    for (const result of results) {
      const weight = result.confidence;
      totalWeight += weight;

      weightedPriceAdj += result.priceAdjustment * weight;
      weightedSizeMultiplier += result.sizeMultiplier * weight;

      if (result.shouldTrade) {
        shouldTrade = true;
        if (result.direction === "BUY") {
          buyVotes += weight;
        } else {
          sellVotes += weight;
        }
      }
    }

    if (totalWeight === 0) {
      return {
        shouldTrade: false,
        direction: "BUY",
        priceAdjustment: 0,
        sizeMultiplier: 1,
        confidence: 0,
      };
    }

    primaryDirection = buyVotes >= sellVotes ? "BUY" : "SELL";

    return {
      shouldTrade,
      direction: primaryDirection,
      priceAdjustment: weightedPriceAdj / totalWeight,
      sizeMultiplier: weightedSizeMultiplier / totalWeight,
      confidence: totalWeight / results.length,
    };
  }
}

export default StrategyManager;
