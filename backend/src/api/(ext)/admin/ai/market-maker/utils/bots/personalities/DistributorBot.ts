import { BaseBot, BotConfig, TradeDecision, MarketContext } from "../BaseBot";

/**
 * DistributorBot - Slow, consistent seller
 *
 * Characteristics:
 * - Primarily sells
 * - Builds resistance levels
 * - Creates downward pressure
 * - Patient and methodical
 * - Distributes at higher prices
 */
export class DistributorBot extends BaseBot {
  // Distributor-specific settings
  private readonly sellBias = 0.9; // 90% chance to sell vs buy
  private readonly maxDistributionPercent = 2; // Max 2% below target to distribute
  private readonly resistanceBuildingStrength = 1.5; // Multiplier for resistance level orders

  // Distribution tracking
  private totalDistributed: bigint = BigInt(0);
  private distributionSessions: number = 0;

  constructor(config: BotConfig) {
    super({
      ...config,
      personality: "DISTRIBUTOR",
      tradeFrequency: "LOW",
    });
  }

  /**
   * Distributor decision logic - consistently sell
   */
  public decideTrade(context: MarketContext): TradeDecision {
    if (!this.canTrade()) {
      return { shouldTrade: false, reason: "Cannot trade" };
    }

    const currentPriceNum = Number(context.currentPrice) / 1e18;
    const targetPriceNum = Number(context.targetPrice) / 1e18;
    const priceDiff = ((targetPriceNum - currentPriceNum) / currentPriceNum) * 100;

    // Distributors prefer to sell when price is above target
    const isAboveTarget = currentPriceNum > targetPriceNum;

    // Don't distribute if price is too far below target
    if (priceDiff > this.maxDistributionPercent) {
      return {
        shouldTrade: false,
        reason: `Price too far below target (${priceDiff.toFixed(2)}%)`,
      };
    }

    // Random chance with sell bias
    const shouldSell = Math.random() < this.sellBias;

    if (!shouldSell) {
      // Rarely buy - only for rebalancing
      if (this.totalDistributed > BigInt(0) && Math.random() < 0.1) {
        return this.createBuyOrder(context, "Rebalancing small amount");
      }
      return { shouldTrade: false, reason: "Skipping - distributor prefers selling" };
    }

    // Check if near resistance level
    const nearResistance = currentPriceNum >= context.priceRangeHigh * 0.95;

    // Sell more aggressively near resistance
    const sizeMultiplier = nearResistance ? this.resistanceBuildingStrength : 1;

    const price = this.calculatePrice(context, "SELL");
    const baseAmount = this.calculateOrderSize(context);
    const amount = BigInt(Math.floor(Number(baseAmount) * sizeMultiplier));

    this.distributionSessions++;

    return {
      shouldTrade: true,
      side: "SELL",
      price,
      amount,
      purpose: isAboveTarget ? "PRICE_PUSH" : "LIQUIDITY",
      confidence: 0.7 + (isAboveTarget ? 0.2 : 0),
      reason: nearResistance
        ? "Building resistance level"
        : `Distributing (session ${this.distributionSessions})`,
    };
  }

  /**
   * Create rare buy order for rebalancing
   */
  private createBuyOrder(context: MarketContext, reason: string): TradeDecision {
    const price = this.calculatePrice(context, "BUY");
    const amount = this.calculateOrderSize(context);

    // Buy only a small portion
    const buyAmount = BigInt(Math.floor(Number(amount) * 0.3));

    return {
      shouldTrade: true,
      side: "BUY",
      price,
      amount: buyAmount,
      purpose: "LIQUIDITY",
      confidence: 0.4,
      reason,
    };
  }

  /**
   * Calculate order size - consistent but varied
   */
  public calculateOrderSize(context: MarketContext): bigint {
    const currentPriceNum = Number(context.currentPrice) / 1e18;
    const targetPriceNum = Number(context.targetPrice) / 1e18;

    // Distribute more when price is above target
    let sizeMultiplier = 1;
    if (currentPriceNum > targetPriceNum * 1.02) {
      sizeMultiplier = 1.3; // 30% more when significantly above target
    }

    const baseSize = this.config.avgOrderSize * sizeMultiplier;
    const variedSize = this.addVariance(baseSize, 0.25);

    return BigInt(Math.floor(variedSize * 1e18));
  }

  /**
   * Calculate sell price - slightly above current for better fills
   */
  public calculatePrice(context: MarketContext, side: "BUY" | "SELL"): bigint {
    const currentPriceNum = Number(context.currentPrice) / 1e18;

    if (side === "SELL") {
      // Distributors place asks above current price
      const offset = 0.001 + Math.random() * 0.002; // 0.1% to 0.3%
      const price = currentPriceNum * (1 + offset);
      return BigInt(Math.floor(price * 1e18));
    } else {
      // Rare buys at or below current price
      const offset = Math.random() * 0.002; // 0% to 0.2%
      const price = currentPriceNum * (1 - offset);
      return BigInt(Math.floor(price * 1e18));
    }
  }

  /**
   * Record trade and track distribution
   */
  public recordTradeResult(pnl: number): void {
    super.recordTradeResult(pnl);

    // Track distributed amount (simplified)
    if (pnl > 0) {
      this.totalDistributed += BigInt(Math.floor(pnl * 1e18));
    }
  }

  /**
   * Long cooldown - distributors are patient
   */
  public getCooldownTime(): number {
    return 120000; // 2 minutes
  }

  /**
   * Get distribution stats
   */
  public getDistributionStats(): {
    totalDistributed: string;
    sessions: number;
  } {
    return {
      totalDistributed: (Number(this.totalDistributed) / 1e18).toFixed(8),
      sessions: this.distributionSessions,
    };
  }
}

export default DistributorBot;
