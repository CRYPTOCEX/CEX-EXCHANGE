import { calculateVolatility } from "../../scylla/queries";

/**
 * VolatilityMonitor - Tracks market volatility
 *
 * Monitors price changes across different timeframes
 * and provides volatility assessments for risk management.
 */
export class VolatilityMonitor {
  // Volatility cache by market
  private volatilityCache: Map<string, { value: number; timestamp: Date }> = new Map();

  // Global volatility (average across markets)
  private globalVolatility: number = 0;

  // Cache TTL in milliseconds
  private cacheTtlMs = 30000; // 30 seconds

  /**
   * Get volatility for a specific market
   */
  public async getVolatility(marketId: string, minutesWindow: number = 60): Promise<number> {
    // Check cache
    const cached = this.volatilityCache.get(marketId);
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTtlMs) {
      return cached.value;
    }

    // Calculate fresh volatility
    try {
      const volatility = await calculateVolatility(marketId, minutesWindow);

      // Cache result
      this.volatilityCache.set(marketId, {
        value: volatility,
        timestamp: new Date(),
      });

      // Update global volatility
      this.updateGlobalVolatility();

      return volatility;
    } catch (error) {
      // Return cached value or 0 on error
      return cached?.value || 0;
    }
  }

  /**
   * Get global volatility (average across all tracked markets)
   */
  public getGlobalVolatility(): number {
    return this.globalVolatility;
  }

  /**
   * Check if volatility is high for a market
   */
  public async isVolatilityHigh(marketId: string, threshold: number): Promise<boolean> {
    const volatility = await this.getVolatility(marketId);
    return volatility > threshold;
  }

  /**
   * Get volatility across multiple timeframes
   */
  public async getMultiTimeframeVolatility(
    marketId: string
  ): Promise<{
    min1: number;
    min5: number;
    min15: number;
    hour1: number;
  }> {
    const [min1, min5, min15, hour1] = await Promise.all([
      calculateVolatility(marketId, 1),
      calculateVolatility(marketId, 5),
      calculateVolatility(marketId, 15),
      calculateVolatility(marketId, 60),
    ]);

    return { min1, min5, min15, hour1 };
  }

  /**
   * Update global volatility based on cached values
   */
  private updateGlobalVolatility(): void {
    if (this.volatilityCache.size === 0) {
      this.globalVolatility = 0;
      return;
    }

    let sum = 0;
    let count = 0;

    for (const [, cached] of this.volatilityCache) {
      // Only include recent values
      if (Date.now() - cached.timestamp.getTime() < this.cacheTtlMs * 2) {
        sum += cached.value;
        count++;
      }
    }

    this.globalVolatility = count > 0 ? sum / count : 0;
  }

  /**
   * Clear volatility cache for a market
   */
  public clearCache(marketId?: string): void {
    if (marketId) {
      this.volatilityCache.delete(marketId);
    } else {
      this.volatilityCache.clear();
    }
    this.updateGlobalVolatility();
  }
}

export default VolatilityMonitor;
