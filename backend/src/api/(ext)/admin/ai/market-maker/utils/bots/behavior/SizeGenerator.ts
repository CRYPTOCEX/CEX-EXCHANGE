/**
 * SizeGenerator - Generates human-like order sizes
 *
 * Simulates:
 * - Round number preferences (humans like 1, 5, 10, 100)
 * - Size variation based on confidence
 * - Progressive sizing (scaling in/out)
 * - Account size awareness
 */
export class SizeGenerator {
  // Configuration
  private readonly baseSize: number;
  private readonly minSize: number;
  private readonly maxSize: number;

  // Round number preferences (weight)
  private readonly roundNumberWeights = {
    1: 0.15, // Units
    5: 0.25, // Fives
    10: 0.30, // Tens
    25: 0.10, // Quarters
    50: 0.10, // Fifties
    100: 0.08, // Hundreds
    1000: 0.02, // Thousands
  };

  // Position tracking for progressive sizing
  private positionHistory: Array<{ size: number; side: "BUY" | "SELL"; timestamp: number }> = [];

  constructor(baseSize: number, minSize: number = 0.01, maxSize: number = 1000) {
    this.baseSize = baseSize;
    this.minSize = minSize;
    this.maxSize = maxSize;
  }

  /**
   * Generate human-like order size
   */
  public generateSize(options: {
    confidence?: number; // 0-1, higher = larger size
    urgency?: number; // 0-1, higher = more likely to use max
    preferRound?: boolean; // Whether to prefer round numbers
  } = {}): number {
    const { confidence = 0.5, urgency = 0.5, preferRound = true } = options;

    // Start with base size
    let size = this.baseSize;

    // Apply confidence modifier (0.5-1.5x based on confidence)
    size *= 0.5 + confidence;

    // Apply urgency modifier (can push toward max)
    if (urgency > 0.7) {
      size *= 1 + (urgency - 0.7) * 2; // Up to 1.6x for max urgency
    }

    // Add random variation (human inconsistency)
    size *= 0.7 + Math.random() * 0.6; // ±30% variation

    // Apply round number preference
    if (preferRound) {
      size = this.roundToHumanNumber(size);
    }

    // Clamp to bounds
    size = Math.max(this.minSize, Math.min(this.maxSize, size));

    return size;
  }

  /**
   * Generate size for scaling in/out of position
   */
  public generateScalingSize(
    targetTotalSize: number,
    currentPosition: number,
    direction: "IN" | "OUT"
  ): number {
    const remaining = Math.abs(targetTotalSize - currentPosition);

    if (remaining <= 0) {
      return 0;
    }

    // Scaling in: Start small, increase
    // Scaling out: Start larger, decrease
    let sizeFraction: number;

    if (direction === "IN") {
      // Early stages: 10-20% of remaining
      // Later stages: 20-40% of remaining
      const progress = currentPosition / targetTotalSize;
      sizeFraction = 0.1 + progress * 0.2 + Math.random() * 0.1;
    } else {
      // Scaling out: Take larger chunks early
      const progress = 1 - currentPosition / targetTotalSize;
      sizeFraction = 0.3 - progress * 0.15 + Math.random() * 0.1;
    }

    let size = remaining * sizeFraction;

    // Apply round number preference
    size = this.roundToHumanNumber(size);

    // Ensure minimum viable size
    return Math.max(this.minSize, size);
  }

  /**
   * Generate size that varies based on market conditions
   */
  public generateMarketAwareSize(
    volatility: number, // Higher = more volatile
    volume: number, // Recent volume
    spread: number // Current spread percentage
  ): number {
    let size = this.baseSize;

    // High volatility: reduce size (risk management)
    if (volatility > 0.5) {
      size *= 1 - (volatility - 0.5) * 0.5; // Up to 25% reduction
    }

    // Low volume: reduce size (avoid impact)
    const volumeRatio = volume / (this.baseSize * 100); // Arbitrary baseline
    if (volumeRatio < 1) {
      size *= Math.max(0.5, volumeRatio);
    }

    // Wide spread: reduce size (higher cost)
    if (spread > 0.001) {
      // > 0.1% spread
      size *= Math.max(0.6, 1 - spread * 50);
    }

    // Add human variation
    size *= 0.8 + Math.random() * 0.4;

    return this.roundToHumanNumber(Math.max(this.minSize, size));
  }

  /**
   * Generate iceberg order sizes (show less than total)
   */
  public generateIcebergSizes(
    totalSize: number,
    visiblePercentage: number = 0.1
  ): { visible: number; hidden: number; chunks: number[] } {
    const visible = totalSize * visiblePercentage;
    const hidden = totalSize - visible;

    // Generate chunked sizes for hidden portion
    const chunks: number[] = [];
    let remaining = hidden;

    while (remaining > this.minSize) {
      // Random chunk size (10-30% of remaining)
      let chunk = remaining * (0.1 + Math.random() * 0.2);
      chunk = this.roundToHumanNumber(chunk);
      chunk = Math.min(chunk, remaining);

      if (chunk >= this.minSize) {
        chunks.push(chunk);
        remaining -= chunk;
      } else {
        break;
      }
    }

    // Add any remainder to last chunk
    if (remaining > 0 && chunks.length > 0) {
      chunks[chunks.length - 1] += remaining;
    }

    return {
      visible: this.roundToHumanNumber(visible),
      hidden,
      chunks,
    };
  }

  /**
   * Get size recommendation based on account balance
   */
  public getSizeForBalance(
    balance: number,
    riskPercent: number = 0.02 // 2% default risk
  ): number {
    const maxRiskSize = balance * riskPercent;

    // Size should be fraction of max risk
    let size = maxRiskSize * (0.3 + Math.random() * 0.4); // 30-70% of max

    return this.roundToHumanNumber(Math.min(size, this.maxSize));
  }

  /**
   * Record a trade for progressive sizing calculations
   */
  public recordTrade(size: number, side: "BUY" | "SELL"): void {
    this.positionHistory.push({
      size,
      side,
      timestamp: Date.now(),
    });

    // Keep last 100 trades
    if (this.positionHistory.length > 100) {
      this.positionHistory.shift();
    }
  }

  /**
   * Get average recent size (for comparison)
   */
  public getAverageRecentSize(windowMs: number = 3600000): number {
    const cutoff = Date.now() - windowMs;
    const recent = this.positionHistory.filter((t) => t.timestamp > cutoff);

    if (recent.length === 0) {
      return this.baseSize;
    }

    return recent.reduce((sum, t) => sum + t.size, 0) / recent.length;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Round to human-preferred numbers
   */
  private roundToHumanNumber(size: number): number {
    // Determine magnitude
    const magnitude = Math.floor(Math.log10(size));
    const base = Math.pow(10, magnitude);

    // Get the significant digits
    const normalized = size / base;

    // Choose a round number based on weights
    const roundTargets = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 7.5, 8, 9, 10];

    // Find closest target
    let closest = roundTargets[0];
    let minDiff = Math.abs(normalized - closest);

    for (const target of roundTargets) {
      const diff = Math.abs(normalized - target);
      if (diff < minDiff) {
        minDiff = diff;
        closest = target;
      }
    }

    // Sometimes keep exact value for variety (20% chance)
    if (Math.random() < 0.2) {
      return size;
    }

    return closest * base;
  }

  /**
   * Generate random size with specific distribution
   */
  public generateWithDistribution(
    distribution: "UNIFORM" | "NORMAL" | "SKEWED_SMALL" | "SKEWED_LARGE"
  ): number {
    let size: number;

    switch (distribution) {
      case "UNIFORM":
        size = this.minSize + Math.random() * (this.maxSize - this.minSize);
        break;

      case "NORMAL":
        // Box-Muller for normal distribution centered on baseSize
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        size = this.baseSize + z * (this.baseSize * 0.3);
        break;

      case "SKEWED_SMALL":
        // More small orders
        size = this.minSize + Math.pow(Math.random(), 2) * (this.maxSize - this.minSize);
        break;

      case "SKEWED_LARGE":
        // More large orders
        size = this.minSize + Math.pow(Math.random(), 0.5) * (this.maxSize - this.minSize);
        break;

      default:
        size = this.baseSize;
    }

    return this.roundToHumanNumber(Math.max(this.minSize, Math.min(this.maxSize, size)));
  }

  /**
   * Get size statistics
   */
  public getStats(): {
    baseSize: number;
    averageRecent: number;
    tradeCount: number;
    buyVolume: number;
    sellVolume: number;
  } {
    const buyTrades = this.positionHistory.filter((t) => t.side === "BUY");
    const sellTrades = this.positionHistory.filter((t) => t.side === "SELL");

    return {
      baseSize: this.baseSize,
      averageRecent: this.getAverageRecentSize(),
      tradeCount: this.positionHistory.length,
      buyVolume: buyTrades.reduce((sum, t) => sum + t.size, 0),
      sellVolume: sellTrades.reduce((sum, t) => sum + t.size, 0),
    };
  }
}

export default SizeGenerator;
