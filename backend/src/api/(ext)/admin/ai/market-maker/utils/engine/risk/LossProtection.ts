import { models } from "@b/db";
import { Op } from "sequelize";

/**
 * LossProtection - Monitors losses and prevents excessive trading
 *
 * Tracks:
 * - Daily loss per market
 * - Global daily loss
 * - Consecutive losses
 * - Loss patterns
 */
export class LossProtection {
  // Daily loss tracking by market
  private marketDailyLoss: Map<string, number> = new Map();

  // Consecutive loss tracking
  private consecutiveLosses: Map<string, number> = new Map();

  // Global loss tracking
  private globalDailyLoss: number = 0;
  private globalDailyProfit: number = 0;

  // Last reset timestamp
  private lastResetDate: Date = new Date();

  /**
   * Check global loss limits
   */
  public async checkGlobalLoss(
    maxDailyLossPercent: number
  ): Promise<{ canTrade: boolean; reason?: string }> {
    // Reset if new day
    this.checkDayReset();

    // Calculate current loss percentage
    const totalCapital = await this.getTotalCapital();
    if (totalCapital <= 0) {
      return { canTrade: true };
    }

    const lossPercent = (this.globalDailyLoss / totalCapital) * 100;

    if (lossPercent >= maxDailyLossPercent) {
      return {
        canTrade: false,
        reason: `Daily loss limit reached: ${lossPercent.toFixed(2)}% (max: ${maxDailyLossPercent}%)`,
      };
    }

    return { canTrade: true };
  }

  /**
   * Get loss percentage for a specific market
   */
  public async getMarketLoss(marketId: string): Promise<number> {
    this.checkDayReset();

    const marketLoss = this.marketDailyLoss.get(marketId) || 0;
    const marketCapital = await this.getMarketCapital(marketId);

    if (marketCapital <= 0) {
      return 0;
    }

    return (marketLoss / marketCapital) * 100;
  }

  /**
   * Record a trade result
   */
  public async recordTrade(
    marketId: string,
    pnl: number,
    isLoss: boolean
  ): Promise<void> {
    this.checkDayReset();

    if (isLoss) {
      // Track loss
      const currentLoss = this.marketDailyLoss.get(marketId) || 0;
      this.marketDailyLoss.set(marketId, currentLoss + Math.abs(pnl));
      this.globalDailyLoss += Math.abs(pnl);

      // Track consecutive losses
      const consecutive = this.consecutiveLosses.get(marketId) || 0;
      this.consecutiveLosses.set(marketId, consecutive + 1);
    } else {
      // Track profit
      this.globalDailyProfit += pnl;

      // Reset consecutive losses
      this.consecutiveLosses.set(marketId, 0);
    }
  }

  /**
   * Get consecutive losses for a market
   */
  public getConsecutiveLosses(marketId: string): number {
    return this.consecutiveLosses.get(marketId) || 0;
  }

  /**
   * Get global loss percentage
   */
  public getGlobalLossPercent(): number {
    // Simple estimation based on tracked loss
    // In production, this would calculate against actual capital
    const netPnl = this.globalDailyProfit - this.globalDailyLoss;
    return netPnl < 0 ? Math.abs(netPnl) / 100 : 0; // Simplified
  }

  /**
   * Should stop trading based on loss patterns
   */
  public shouldStopTrading(marketId: string): boolean {
    // Stop if 5+ consecutive losses
    const consecutive = this.consecutiveLosses.get(marketId) || 0;
    if (consecutive >= 5) {
      return true;
    }

    return false;
  }

  /**
   * Reset daily tracking
   */
  public resetDaily(): void {
    this.marketDailyLoss.clear();
    this.consecutiveLosses.clear();
    this.globalDailyLoss = 0;
    this.globalDailyProfit = 0;
    this.lastResetDate = new Date();
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Check if we need to reset for new day
   */
  private checkDayReset(): void {
    const now = new Date();
    if (
      now.getDate() !== this.lastResetDate.getDate() ||
      now.getMonth() !== this.lastResetDate.getMonth() ||
      now.getFullYear() !== this.lastResetDate.getFullYear()
    ) {
      this.resetDaily();
    }
  }

  /**
   * Get total capital across all pools
   */
  private async getTotalCapital(): Promise<number> {
    try {
      const pools = await models.aiMarketMakerPool.findAll();
      let total = 0;
      for (const pool of pools) {
        total += parseFloat(pool.totalValueLocked) || 0;
      }
      return total;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get capital for a specific market
   */
  private async getMarketCapital(marketId: string): Promise<number> {
    try {
      const maker = await models.aiMarketMaker.findOne({
        where: { marketId },
        include: [{ model: models.aiMarketMakerPool, as: "pool" }],
      });

      if (maker?.pool) {
        return parseFloat(maker.pool.totalValueLocked) || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }
}

export default LossProtection;
