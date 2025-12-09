import { BaseBot, BotConfig, TradeDecision, MarketContext } from "../BaseBot";

/**
 * ScalperBot - High-frequency trader with tight spreads
 *
 * Characteristics:
 * - Very frequent trades (every few seconds)
 * - Small order sizes
 * - Tight spread preference
 * - Quick position turnover
 * - Focus on small, consistent profits
 */
export class ScalperBot extends BaseBot {
  // Scalper-specific settings
  private readonly minSpreadBps = 5; // 0.05% minimum spread
  private readonly maxSpreadBps = 20; // 0.2% maximum spread
  private readonly targetProfitBps = 3; // 0.03% target profit per trade

  constructor(config: BotConfig) {
    super({
      ...config,
      personality: "SCALPER",
      tradeFrequency: "HIGH",
    });
  }

  /**
   * Scalper decision logic - look for quick profit opportunities
   */
  public decideTrade(context: MarketContext): TradeDecision {
    if (!this.canTrade()) {
      return { shouldTrade: false, reason: "Cannot trade" };
    }

    const currentPriceNum = Number(context.currentPrice) / 1e18;
    const targetPriceNum = Number(context.targetPrice) / 1e18;

    // Scalpers love tight spreads
    if (context.spreadBps > this.maxSpreadBps) {
      return {
        shouldTrade: false,
        reason: `Spread too wide: ${context.spreadBps}bps`,
      };
    }

    // Avoid high volatility
    if (context.volatility > 3) {
      return {
        shouldTrade: false,
        reason: `Volatility too high: ${context.volatility}%`,
      };
    }

    // Determine direction based on micro movements
    const priceDiff = (targetPriceNum - currentPriceNum) / currentPriceNum;
    const side: "BUY" | "SELL" = priceDiff > 0 ? "BUY" : "SELL";

    // Calculate order
    const price = this.calculatePrice(context, side);
    const amount = this.calculateOrderSize(context);

    // Random chance to skip (adds unpredictability)
    if (Math.random() > 0.6) {
      return { shouldTrade: false, reason: "Random skip for unpredictability" };
    }

    return {
      shouldTrade: true,
      side,
      price,
      amount,
      purpose: "SPREAD_MAINTENANCE",
      confidence: 0.7 + Math.random() * 0.2,
      reason: `Scalping ${side} for micro profit`,
    };
  }

  /**
   * Calculate small order size with high variance
   */
  public calculateOrderSize(context: MarketContext): bigint {
    // Scalpers use small orders
    const baseSize = this.config.avgOrderSize * 0.5; // 50% of average
    const variedSize = this.addVariance(baseSize, 0.4); // High variance

    return BigInt(Math.floor(variedSize * 1e18));
  }

  /**
   * Calculate tight price close to current
   */
  public calculatePrice(context: MarketContext, side: "BUY" | "SELL"): bigint {
    const currentPriceNum = Number(context.currentPrice) / 1e18;

    // Very small offset for scalping
    const offsetPercent = (this.targetProfitBps / 10000) * (0.5 + Math.random() * 0.5);

    let price: number;
    if (side === "BUY") {
      price = currentPriceNum * (1 - offsetPercent); // Slightly below
    } else {
      price = currentPriceNum * (1 + offsetPercent); // Slightly above
    }

    return BigInt(Math.floor(price * 1e18));
  }

  /**
   * Short cooldown for scalpers
   */
  public getCooldownTime(): number {
    return 10000; // 10 seconds
  }
}

export default ScalperBot;
