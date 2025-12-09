import { BaseBot, BotConfig, TradeDecision, MarketContext } from "../BaseBot";

/**
 * SwingBot - Medium-frequency trader with wider targets
 *
 * Characteristics:
 * - Medium frequency trades
 * - Larger order sizes
 * - Holds positions longer
 * - Targets larger price swings
 * - Patience for better entries
 */
export class SwingBot extends BaseBot {
  // Swing-specific settings
  private readonly minSwingPercent = 0.5; // 0.5% minimum swing target
  private readonly maxSwingPercent = 3; // 3% maximum swing target
  private readonly holdTimeMs = 300000; // 5 minutes average hold

  // Position tracking
  private currentPosition: "LONG" | "SHORT" | "NEUTRAL" = "NEUTRAL";
  private entryPrice: number = 0;
  private positionOpenTime: Date | null = null;

  constructor(config: BotConfig) {
    super({
      ...config,
      personality: "SWING",
      tradeFrequency: "MEDIUM",
    });
  }

  /**
   * Swing decision logic - wait for good entry points
   */
  public decideTrade(context: MarketContext): TradeDecision {
    if (!this.canTrade()) {
      return { shouldTrade: false, reason: "Cannot trade" };
    }

    const currentPriceNum = Number(context.currentPrice) / 1e18;
    const targetPriceNum = Number(context.targetPrice) / 1e18;
    const priceDiff = ((targetPriceNum - currentPriceNum) / currentPriceNum) * 100;

    // Check if we have an open position
    if (this.currentPosition !== "NEUTRAL") {
      return this.managePosition(context, currentPriceNum, priceDiff);
    }

    // Look for entry opportunity
    return this.findEntry(context, currentPriceNum, priceDiff);
  }

  /**
   * Manage existing position
   */
  private managePosition(
    context: MarketContext,
    currentPriceNum: number,
    priceDiff: number
  ): TradeDecision {
    if (!this.positionOpenTime) {
      this.currentPosition = "NEUTRAL";
      return { shouldTrade: false };
    }

    const holdTime = Date.now() - this.positionOpenTime.getTime();
    const priceChange = ((currentPriceNum - this.entryPrice) / this.entryPrice) * 100;

    // Check profit target
    const profitTarget = this.minSwingPercent + Math.random() * (this.maxSwingPercent - this.minSwingPercent);

    // Close position if:
    // 1. Profit target reached
    // 2. Hold time exceeded
    // 3. Trend reversed significantly
    const shouldClose =
      (this.currentPosition === "LONG" && priceChange >= profitTarget) ||
      (this.currentPosition === "SHORT" && priceChange <= -profitTarget) ||
      holdTime > this.holdTimeMs * 2 ||
      Math.abs(priceDiff) > this.maxSwingPercent;

    if (shouldClose) {
      const closeSide = this.currentPosition === "LONG" ? "SELL" : "BUY";
      const price = this.calculatePrice(context, closeSide);
      const amount = this.calculateOrderSize(context);

      // Reset position
      this.currentPosition = "NEUTRAL";
      this.entryPrice = 0;
      this.positionOpenTime = null;

      return {
        shouldTrade: true,
        side: closeSide,
        price,
        amount,
        purpose: "PRICE_PUSH",
        confidence: 0.8,
        reason: `Closing ${this.currentPosition} position (${priceChange.toFixed(2)}% P&L)`,
      };
    }

    return { shouldTrade: false, reason: "Holding position" };
  }

  /**
   * Find entry opportunity
   */
  private findEntry(
    context: MarketContext,
    currentPriceNum: number,
    priceDiff: number
  ): TradeDecision {
    // Need sufficient distance from target
    if (Math.abs(priceDiff) < this.minSwingPercent) {
      return { shouldTrade: false, reason: "Price too close to target" };
    }

    // Avoid very high volatility
    if (context.volatility > 5) {
      return { shouldTrade: false, reason: "Volatility too high for swing entry" };
    }

    // Check if near support/resistance
    const nearSupport = currentPriceNum <= context.priceRangeLow * 1.02;
    const nearResistance = currentPriceNum >= context.priceRangeHigh * 0.98;

    let side: "BUY" | "SELL";
    let reason: string;

    if (nearSupport && priceDiff > 0) {
      // Near support and need to go up - good long entry
      side = "BUY";
      reason = "Long entry near support";
    } else if (nearResistance && priceDiff < 0) {
      // Near resistance and need to go down - good short entry
      side = "SELL";
      reason = "Short entry near resistance";
    } else if (priceDiff > this.minSwingPercent) {
      // Need price to go up
      side = "BUY";
      reason = "Long entry to push price up";
    } else {
      // Need price to go down
      side = "SELL";
      reason = "Short entry to push price down";
    }

    // Random entry chance (swing traders are patient)
    if (Math.random() > 0.4) {
      return { shouldTrade: false, reason: "Waiting for better entry" };
    }

    const price = this.calculatePrice(context, side);
    const amount = this.calculateOrderSize(context);

    // Track position
    this.currentPosition = side === "BUY" ? "LONG" : "SHORT";
    this.entryPrice = currentPriceNum;
    this.positionOpenTime = new Date();

    return {
      shouldTrade: true,
      side,
      price,
      amount,
      purpose: "PRICE_PUSH",
      confidence: 0.6 + Math.abs(priceDiff) * 0.1,
      reason,
    };
  }

  /**
   * Calculate medium order size
   */
  public calculateOrderSize(context: MarketContext): bigint {
    // Swing traders use medium-sized orders
    const baseSize = this.config.avgOrderSize;
    const variedSize = this.addVariance(baseSize, 0.3);

    return BigInt(Math.floor(variedSize * 1e18));
  }

  /**
   * Calculate price with swing offset
   */
  public calculatePrice(context: MarketContext, side: "BUY" | "SELL"): bigint {
    const currentPriceNum = Number(context.currentPrice) / 1e18;

    // Swing traders place orders slightly away from current price
    const offsetPercent = 0.001 + Math.random() * 0.003; // 0.1% to 0.4%

    let price: number;
    if (side === "BUY") {
      price = currentPriceNum * (1 - offsetPercent);
    } else {
      price = currentPriceNum * (1 + offsetPercent);
    }

    return BigInt(Math.floor(price * 1e18));
  }

  /**
   * Medium cooldown for swing traders
   */
  public getCooldownTime(): number {
    return 60000; // 1 minute
  }
}

export default SwingBot;
