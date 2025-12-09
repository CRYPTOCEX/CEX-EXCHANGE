import { models } from "@b/db";
import type { BalanceTracker } from "./BalanceTracker";
import { calculatePnLFromTVL } from "../../helpers/tvl";

/**
 * PnLCalculator - Calculates profit and loss for pools
 *
 * Tracks:
 * - Unrealized P&L (based on current vs initial TVL with price consideration)
 * - Realized P&L (from completed trades)
 * - Daily/weekly/monthly aggregations
 */
export class PnLCalculator {
  // P&L tracking by market maker
  private unrealizedPnL: Map<string, number> = new Map();
  private realizedPnL: Map<string, number> = new Map();

  // Price tracking for accurate P&L
  private initialPrices: Map<string, number> = new Map();
  private currentPrices: Map<string, number> = new Map();

  // Daily aggregations
  private dailyPnL: Map<string, number[]> = new Map();

  /**
   * Set initial price for a market maker (call when starting)
   */
  public setInitialPrice(marketMakerId: string, price: number): void {
    if (!this.initialPrices.has(marketMakerId)) {
      this.initialPrices.set(marketMakerId, price);
    }
  }

  /**
   * Update current price for a market maker
   */
  public updateCurrentPrice(marketMakerId: string, price: number): void {
    this.currentPrices.set(marketMakerId, price);
  }

  /**
   * Calculate P&L for a market maker using TVL-based calculation
   */
  public async calculatePnL(
    marketMakerId: string,
    balanceTracker: BalanceTracker
  ): Promise<void> {
    try {
      const currentBalance = await balanceTracker.getBalance();
      const initialBalance = balanceTracker.getInitialBalances();

      // Get prices for accurate TVL calculation
      const initialPrice = this.initialPrices.get(marketMakerId) || 1;
      const currentPrice = this.currentPrices.get(marketMakerId) || initialPrice;

      // Calculate P&L using TVL helper (accounts for price changes)
      const pnlResult = calculatePnLFromTVL(
        initialBalance.base,
        initialBalance.quote,
        currentBalance.baseCurrency,
        currentBalance.quoteCurrency,
        initialPrice,
        currentPrice
      );

      this.unrealizedPnL.set(marketMakerId, pnlResult.absolutePnL);

      // Update database
      await this.updatePnLInDatabase(marketMakerId);
    } catch (error) {
      // Ignore calculation errors
    }
  }

  /**
   * Record a P&L event
   */
  public recordPnL(
    marketMakerId: string,
    pnl: number,
    isRealized: boolean
  ): void {
    if (isRealized) {
      const current = this.realizedPnL.get(marketMakerId) || 0;
      this.realizedPnL.set(marketMakerId, current + pnl);

      // Track daily
      this.recordDailyPnL(marketMakerId, pnl);
    } else {
      // Unrealized is recalculated, not accumulated
      this.unrealizedPnL.set(marketMakerId, pnl);
    }
  }

  /**
   * Get P&L for a market maker
   */
  public async getPnL(marketMakerId: string): Promise<{
    unrealized: number;
    realized: number;
    total: number;
  }> {
    const unrealized = this.unrealizedPnL.get(marketMakerId) || 0;
    const realized = this.realizedPnL.get(marketMakerId) || 0;

    return {
      unrealized,
      realized,
      total: unrealized + realized,
    };
  }

  /**
   * Get daily P&L history
   */
  public getDailyPnL(marketMakerId: string, days: number = 7): number[] {
    const daily = this.dailyPnL.get(marketMakerId) || [];
    return daily.slice(-days);
  }

  /**
   * Get aggregate P&L for period
   */
  public getAggregatePnL(
    marketMakerId: string,
    period: "day" | "week" | "month"
  ): number {
    const daily = this.dailyPnL.get(marketMakerId) || [];

    let days: number;
    switch (period) {
      case "day":
        days = 1;
        break;
      case "week":
        days = 7;
        break;
      case "month":
        days = 30;
        break;
    }

    const recentPnL = daily.slice(-days);
    return recentPnL.reduce((sum, pnl) => sum + pnl, 0);
  }

  /**
   * Reset daily tracking (called at start of new day)
   */
  public resetDaily(): void {
    // Move current day to history and reset
    for (const [marketMakerId] of this.realizedPnL) {
      const todayPnL = this.realizedPnL.get(marketMakerId) || 0;
      this.recordDailyPnL(marketMakerId, todayPnL);
    }

    this.realizedPnL.clear();
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Record daily P&L
   */
  private recordDailyPnL(marketMakerId: string, pnl: number): void {
    const daily = this.dailyPnL.get(marketMakerId) || [];
    daily.push(pnl);

    // Keep only last 30 days
    if (daily.length > 30) {
      daily.shift();
    }

    this.dailyPnL.set(marketMakerId, daily);
  }

  /**
   * Update P&L in database
   */
  private async updatePnLInDatabase(marketMakerId: string): Promise<void> {
    try {
      const unrealized = this.unrealizedPnL.get(marketMakerId) || 0;
      const realized = this.realizedPnL.get(marketMakerId) || 0;

      await models.aiMarketMakerPool.update(
        {
          unrealizedPnL: unrealized,
          realizedPnL: realized,
        },
        { where: { marketMakerId } }
      );
    } catch (error) {
      // Ignore database update errors
    }
  }
}

export default PnLCalculator;
