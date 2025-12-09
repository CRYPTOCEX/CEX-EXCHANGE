import { BaseBot, BotConfig, TradeDecision, MarketContext } from "../BaseBot";

/**
 * AccumulatorBot - Slow, consistent buyer
 *
 * Characteristics:
 * - Primarily buys
 * - Builds support levels
 * - Creates upward pressure
 * - Patient and methodical
 * - Accumulates at lower prices
 */
export class AccumulatorBot extends BaseBot {
  // Accumulator-specific settings
  private readonly buyBias = 0.9; // 90% chance to buy vs sell
  private readonly maxAccumulationPercent = 2; // Max 2% above target to accumulate
  private readonly supportBuildingStrength = 1.5; // Multiplier for support level orders

  // Accumulation tracking
  private totalAccumulated: bigint = BigInt(0);
  private accumulationSessions: number = 0;

  constructor(config: BotConfig) {
    super({
      ...config,
      personality: "ACCUMULATOR",
      tradeFrequency: "LOW",
    });
  }

  /**
   * Accumulator decision logic - consistently buy
   */
  public decideTrade(context: MarketContext): TradeDecision {
    if (!this.canTrade()) {
      return { shouldTrade: false, reason: "Cannot trade" };
    }

    const currentPriceNum = Number(context.currentPrice) / 1e18;
    const targetPriceNum = Number(context.targetPrice) / 1e18;
    const priceDiff = ((targetPriceNum - currentPriceNum) / currentPriceNum) * 100;

    // Accumulators prefer to buy when price is below target
    const isBelowTarget = currentPriceNum < targetPriceNum;

    // Don't accumulate if price is too far above target
    if (priceDiff < -this.maxAccumulationPercent) {
      return {
        shouldTrade: false,
        reason: `Price too far above target (${priceDiff.toFixed(2)}%)`,
      };
    }

    // Random chance with buy bias
    const shouldBuy = Math.random() < this.buyBias;

    if (!shouldBuy) {
      // Rarely sell - only for rebalancing
      if (this.totalAccumulated > BigInt(0) && Math.random() < 0.1) {
        return this.createSellOrder(context, "Rebalancing small amount");
      }
      return { shouldTrade: false, reason: "Skipping - accumulator prefers buying" };
    }

    // Check if near support level
    const nearSupport = currentPriceNum <= context.priceRangeLow * 1.05;

    // Buy more aggressively near support
    const sizeMultiplier = nearSupport ? this.supportBuildingStrength : 1;

    const price = this.calculatePrice(context, "BUY");
    const baseAmount = this.calculateOrderSize(context);
    const amount = BigInt(Math.floor(Number(baseAmount) * sizeMultiplier));

    this.accumulationSessions++;

    return {
      shouldTrade: true,
      side: "BUY",
      price,
      amount,
      purpose: isBelowTarget ? "PRICE_PUSH" : "LIQUIDITY",
      confidence: 0.7 + (isBelowTarget ? 0.2 : 0),
      reason: nearSupport
        ? "Building support level"
        : `Accumulating (session ${this.accumulationSessions})`,
    };
  }

  /**
   * Create rare sell order for rebalancing
   */
  private createSellOrder(context: MarketContext, reason: string): TradeDecision {
    const price = this.calculatePrice(context, "SELL");
    const amount = this.calculateOrderSize(context);

    // Sell only a small portion
    const sellAmount = BigInt(Math.floor(Number(amount) * 0.3));

    return {
      shouldTrade: true,
      side: "SELL",
      price,
      amount: sellAmount,
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

    // Accumulate more when price is below target
    let sizeMultiplier = 1;
    if (currentPriceNum < targetPriceNum * 0.98) {
      sizeMultiplier = 1.3; // 30% more when significantly below target
    }

    const baseSize = this.config.avgOrderSize * sizeMultiplier;
    const variedSize = this.addVariance(baseSize, 0.25);

    return BigInt(Math.floor(variedSize * 1e18));
  }

  /**
   * Calculate buy price - slightly below current for better fills
   */
  public calculatePrice(context: MarketContext, side: "BUY" | "SELL"): bigint {
    const currentPriceNum = Number(context.currentPrice) / 1e18;

    if (side === "BUY") {
      // Accumulators place bids below current price
      const offset = 0.001 + Math.random() * 0.002; // 0.1% to 0.3%
      const price = currentPriceNum * (1 - offset);
      return BigInt(Math.floor(price * 1e18));
    } else {
      // Rare sells at or above current price
      const offset = Math.random() * 0.002; // 0% to 0.2%
      const price = currentPriceNum * (1 + offset);
      return BigInt(Math.floor(price * 1e18));
    }
  }

  /**
   * Record trade and track accumulation
   */
  public recordTradeResult(pnl: number): void {
    super.recordTradeResult(pnl);

    // Track accumulated amount (simplified)
    if (pnl > 0) {
      this.totalAccumulated += BigInt(Math.floor(pnl * 1e18));
    }
  }

  /**
   * Long cooldown - accumulators are patient
   */
  public getCooldownTime(): number {
    return 120000; // 2 minutes
  }

  /**
   * Get accumulation stats
   */
  public getAccumulationStats(): {
    totalAccumulated: string;
    sessions: number;
  } {
    return {
      totalAccumulated: (Number(this.totalAccumulated) / 1e18).toFixed(8),
      sessions: this.accumulationSessions,
    };
  }
}

export default AccumulatorBot;
