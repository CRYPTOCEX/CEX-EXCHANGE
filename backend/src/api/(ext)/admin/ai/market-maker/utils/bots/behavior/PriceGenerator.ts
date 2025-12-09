/**
 * PriceGenerator - Generates human-like price levels
 *
 * Simulates:
 * - Psychological price levels (.00, .50, .99)
 * - Support/resistance awareness
 * - Price clustering around key levels
 * - Slightly imprecise pricing (not always optimal)
 */
export class PriceGenerator {
  // Psychological price endings (weight)
  private readonly psychologicalEndings: Record<string, number> = {
    "0.00": 0.25, // Round numbers
    "0.50": 0.15, // Half dollars
    "0.25": 0.08, // Quarters
    "0.75": 0.08,
    "0.99": 0.10, // Just below round
    "0.01": 0.08, // Just above round
    "0.95": 0.06,
    "0.05": 0.06,
    random: 0.14, // Truly random
  };

  // Key price level tracking
  private keyLevels: Map<string, number[]> = new Map();

  // Recent price history for pattern recognition
  private priceHistory: Array<{ price: number; timestamp: number }> = [];

  constructor() {}

  /**
   * Generate human-like limit price for buy order
   */
  public generateBuyPrice(
    currentPrice: number,
    options: {
      aggressiveness?: number; // 0-1, 1 = willing to pay more
      preferPsychological?: boolean;
      nearSupport?: number; // Known support level
    } = {}
  ): number {
    const { aggressiveness = 0.5, preferPsychological = true, nearSupport } = options;

    // Base: bid below current price
    const baseDiscount = 0.001 + (1 - aggressiveness) * 0.005; // 0.1% - 0.6% below
    let price = currentPrice * (1 - baseDiscount);

    // Adjust toward support if nearby
    if (nearSupport && Math.abs(price - nearSupport) / price < 0.02) {
      // Within 2%
      price = nearSupport * (1 + Math.random() * 0.002); // Just above support
    }

    // Apply psychological pricing
    if (preferPsychological) {
      price = this.applyPsychologicalPricing(price);
    }

    // Add human imprecision
    price = this.addImprecision(price);

    return price;
  }

  /**
   * Generate human-like limit price for sell order
   */
  public generateSellPrice(
    currentPrice: number,
    options: {
      aggressiveness?: number; // 0-1, 1 = willing to sell lower
      preferPsychological?: boolean;
      nearResistance?: number; // Known resistance level
    } = {}
  ): number {
    const { aggressiveness = 0.5, preferPsychological = true, nearResistance } = options;

    // Base: ask above current price
    const basePremium = 0.001 + (1 - aggressiveness) * 0.005; // 0.1% - 0.6% above
    let price = currentPrice * (1 + basePremium);

    // Adjust toward resistance if nearby
    if (nearResistance && Math.abs(price - nearResistance) / price < 0.02) {
      price = nearResistance * (1 - Math.random() * 0.002); // Just below resistance
    }

    // Apply psychological pricing
    if (preferPsychological) {
      price = this.applyPsychologicalPricing(price);
    }

    // Add human imprecision
    price = this.addImprecision(price);

    return price;
  }

  /**
   * Generate stop-loss price
   */
  public generateStopLossPrice(
    entryPrice: number,
    side: "BUY" | "SELL",
    riskPercent: number = 0.02
  ): number {
    let stopPrice: number;

    if (side === "BUY") {
      // Long position: stop below entry
      stopPrice = entryPrice * (1 - riskPercent);
    } else {
      // Short position: stop above entry
      stopPrice = entryPrice * (1 + riskPercent);
    }

    // Humans often use round numbers for stops
    return this.roundToPsychologicalLevel(stopPrice);
  }

  /**
   * Generate take-profit price
   */
  public generateTakeProfitPrice(
    entryPrice: number,
    side: "BUY" | "SELL",
    rewardPercent: number = 0.04
  ): number {
    let targetPrice: number;

    if (side === "BUY") {
      // Long position: target above entry
      targetPrice = entryPrice * (1 + rewardPercent);
    } else {
      // Short position: target below entry
      targetPrice = entryPrice * (1 - rewardPercent);
    }

    // Humans often use round numbers for targets
    return this.roundToPsychologicalLevel(targetPrice);
  }

  /**
   * Check if price is at a psychological level
   */
  public isPsychologicalLevel(price: number): boolean {
    // Get decimal portion
    const decimals = price % 1;

    // Check common psychological levels
    const psychLevels = [0, 0.25, 0.5, 0.75, 0.99, 0.01, 0.05, 0.95];

    for (const level of psychLevels) {
      if (Math.abs(decimals - level) < 0.01) {
        return true;
      }
    }

    // Check if near round number (within 0.5%)
    const nearestRound = Math.round(price);
    if (Math.abs(price - nearestRound) / price < 0.005) {
      return true;
    }

    return false;
  }

  /**
   * Find nearest psychological level
   */
  public findNearestPsychLevel(price: number, direction: "UP" | "DOWN" | "NEAREST"): number {
    const whole = Math.floor(price);
    const decimal = price - whole;

    const levels = [0, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 1.0];

    let nearest = levels[0];
    let minDiff = Math.abs(decimal - nearest);

    for (const level of levels) {
      const diff = Math.abs(decimal - level);

      if (direction === "NEAREST" && diff < minDiff) {
        nearest = level;
        minDiff = diff;
      } else if (direction === "UP" && level > decimal && diff < minDiff) {
        nearest = level;
        minDiff = diff;
      } else if (direction === "DOWN" && level < decimal && diff < minDiff) {
        nearest = level;
        minDiff = diff;
      }
    }

    return whole + nearest;
  }

  /**
   * Add key price level for tracking
   */
  public addKeyLevel(symbol: string, price: number): void {
    if (!this.keyLevels.has(symbol)) {
      this.keyLevels.set(symbol, []);
    }

    const levels = this.keyLevels.get(symbol)!;
    if (!levels.includes(price)) {
      levels.push(price);
      levels.sort((a, b) => a - b);
    }

    // Keep only recent 20 levels
    if (levels.length > 20) {
      levels.shift();
    }
  }

  /**
   * Get nearest key level
   */
  public getNearestKeyLevel(
    symbol: string,
    currentPrice: number,
    direction: "SUPPORT" | "RESISTANCE"
  ): number | null {
    const levels = this.keyLevels.get(symbol) || [];

    if (direction === "SUPPORT") {
      // Find highest level below current price
      const supports = levels.filter((l) => l < currentPrice);
      return supports.length > 0 ? Math.max(...supports) : null;
    } else {
      // Find lowest level above current price
      const resistances = levels.filter((l) => l > currentPrice);
      return resistances.length > 0 ? Math.min(...resistances) : null;
    }
  }

  /**
   * Record price for pattern recognition
   */
  public recordPrice(price: number): void {
    this.priceHistory.push({ price, timestamp: Date.now() });

    // Keep last 1000 prices
    if (this.priceHistory.length > 1000) {
      this.priceHistory.shift();
    }

    // Auto-detect key levels from price clustering
    this.detectKeyLevels();
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Apply psychological pricing patterns
   */
  private applyPsychologicalPricing(price: number): number {
    // Determine which ending to use based on weights
    const random = Math.random();
    let cumulative = 0;

    for (const [ending, weight] of Object.entries(this.psychologicalEndings)) {
      cumulative += weight;

      if (random < cumulative) {
        if (ending === "random") {
          return price; // Keep as-is
        }

        return this.applyEnding(price, ending);
      }
    }

    return price;
  }

  /**
   * Apply specific price ending
   */
  private applyEnding(price: number, ending: string): number {
    const whole = Math.floor(price);
    const targetDecimal = parseFloat(ending);

    // Choose whether to round up or down to reach target
    const currentDecimal = price - whole;

    if (currentDecimal < targetDecimal) {
      return whole + targetDecimal;
    } else if (ending === "0.00") {
      return currentDecimal < 0.5 ? whole : whole + 1;
    } else {
      return whole + targetDecimal;
    }
  }

  /**
   * Round to nearest psychological level
   */
  private roundToPsychologicalLevel(price: number): number {
    const levels = [0, 0.25, 0.5, 0.75, 1.0];
    const whole = Math.floor(price);
    const decimal = price - whole;

    let nearest = levels[0];
    let minDiff = Math.abs(decimal - nearest);

    for (const level of levels) {
      const diff = Math.abs(decimal - level);
      if (diff < minDiff) {
        nearest = level;
        minDiff = diff;
      }
    }

    return whole + nearest;
  }

  /**
   * Add human imprecision to price
   */
  private addImprecision(price: number): number {
    // Humans aren't perfectly precise
    // Add tiny random variation (0.01-0.05%)
    const imprecision = (Math.random() - 0.5) * 0.001;
    return price * (1 + imprecision);
  }

  /**
   * Detect key levels from price history
   */
  private detectKeyLevels(): void {
    if (this.priceHistory.length < 100) return;

    // Get recent prices
    const recentPrices = this.priceHistory.slice(-100).map((p) => p.price);

    // Find price clusters (levels where price has spent time)
    const bucketSize = (Math.max(...recentPrices) - Math.min(...recentPrices)) / 20;

    if (bucketSize <= 0) return;

    const buckets: Map<number, number> = new Map();

    for (const price of recentPrices) {
      const bucket = Math.floor(price / bucketSize) * bucketSize;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    // Find buckets with high concentration
    const threshold = recentPrices.length / 10; // 10% of prices

    for (const [level, count] of buckets.entries()) {
      if (count >= threshold) {
        // This is a key level
        this.addKeyLevel("default", level + bucketSize / 2);
      }
    }
  }

  /**
   * Get pricing statistics
   */
  public getStats(): {
    priceCount: number;
    keyLevelCount: number;
    recentRange: { high: number; low: number } | null;
  } {
    const recent = this.priceHistory.slice(-100);

    return {
      priceCount: this.priceHistory.length,
      keyLevelCount: Array.from(this.keyLevels.values()).flat().length,
      recentRange:
        recent.length > 0
          ? {
              high: Math.max(...recent.map((p) => p.price)),
              low: Math.min(...recent.map((p) => p.price)),
            }
          : null,
    };
  }
}

export default PriceGenerator;
