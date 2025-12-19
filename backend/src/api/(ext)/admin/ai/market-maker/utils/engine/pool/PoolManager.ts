import { models } from "@b/db";
import { logger } from "@b/utils/console";
import { BalanceTracker } from "./BalanceTracker";
import { PnLCalculator } from "./PnLCalculator";

/**
 * PoolManager - Manages liquidity pools for AI market making
 *
 * Handles:
 * - Balance tracking for each pool
 * - Deposits and withdrawals
 * - P&L calculations
 * - Rebalancing
 */
export class PoolManager {
  // Balance trackers by market maker ID
  private balanceTrackers: Map<string, BalanceTracker> = new Map();

  // P&L calculator
  private pnlCalculator: PnLCalculator;

  constructor() {
    this.pnlCalculator = new PnLCalculator();
  }

  /**
   * Get or create balance tracker for a market maker
   */
  public getBalanceTracker(marketMakerId: string): BalanceTracker {
    let tracker = this.balanceTrackers.get(marketMakerId);
    if (!tracker) {
      tracker = new BalanceTracker(marketMakerId);
      this.balanceTrackers.set(marketMakerId, tracker);
    }
    return tracker;
  }

  /**
   * Get pool balance
   */
  public async getBalance(marketMakerId: string): Promise<{
    baseCurrency: number;
    quoteCurrency: number;
    totalValueLocked: number;
  }> {
    const tracker = this.getBalanceTracker(marketMakerId);
    return tracker.getBalance();
  }

  /**
   * Deposit to pool
   */
  public async deposit(
    marketMakerId: string,
    currency: "base" | "quote",
    amount: number
  ): Promise<boolean> {
    try {
      const tracker = this.getBalanceTracker(marketMakerId);
      await tracker.deposit(currency, amount);

      // Update database
      await this.updatePoolInDatabase(marketMakerId);

      // Log history
      await this.logPoolAction(marketMakerId, "DEPOSIT", {
        currency,
        amount,
      });

      return true;
    } catch (error) {
      logger.error("AI_MM_POOL", "Failed to deposit to pool", error);
      return false;
    }
  }

  /**
   * Withdraw from pool
   */
  public async withdraw(
    marketMakerId: string,
    currency: "base" | "quote",
    amount: number
  ): Promise<boolean> {
    try {
      const tracker = this.getBalanceTracker(marketMakerId);

      // Check if withdrawal is allowed
      if (!await tracker.canWithdraw(currency, amount)) {
        logger.warn("AI_MM", "Insufficient balance for withdrawal");
        return false;
      }

      await tracker.withdraw(currency, amount);

      // Update database
      await this.updatePoolInDatabase(marketMakerId);

      // Log history
      await this.logPoolAction(marketMakerId, "WITHDRAW", {
        currency,
        amount,
      });

      return true;
    } catch (error) {
      logger.error("AI_MM_POOL", "Failed to withdraw from pool", error);
      return false;
    }
  }

  /**
   * Check if withdrawal is allowed
   */
  public async canWithdraw(
    marketMakerId: string,
    currency: "base" | "quote",
    amount: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const tracker = this.getBalanceTracker(marketMakerId);

    // Check market maker status
    const maker = await models.aiMarketMaker.findByPk(marketMakerId);
    if (maker && maker.status === "ACTIVE") {
      return {
        allowed: false,
        reason: "Cannot withdraw while market maker is active. Please pause first.",
      };
    }

    // Check balance
    if (!await tracker.canWithdraw(currency, amount)) {
      return {
        allowed: false,
        reason: "Insufficient available balance",
      };
    }

    return { allowed: true };
  }

  /**
   * Rebalance pool
   */
  public async rebalance(
    marketMakerId: string,
    targetRatio?: number
  ): Promise<boolean> {
    try {
      const tracker = this.getBalanceTracker(marketMakerId);
      await tracker.rebalance(targetRatio);

      // Update database
      await this.updatePoolInDatabase(marketMakerId);

      // Log history
      await this.logPoolAction(marketMakerId, "REBALANCE", {
        targetRatio,
      });

      return true;
    } catch (error) {
      logger.error("AI_MM_POOL", "Failed to rebalance pool", error);
      return false;
    }
  }

  /**
   * Update all pool balances
   */
  public async updateAllBalances(): Promise<void> {
    for (const [marketMakerId, tracker] of this.balanceTrackers) {
      try {
        await tracker.syncFromDatabase();
        await this.pnlCalculator.calculatePnL(marketMakerId, tracker);
      } catch (error) {
        // Ignore individual update errors
      }
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
    return this.pnlCalculator.getPnL(marketMakerId);
  }

  /**
   * Record a trade's P&L
   */
  public async recordTradePnL(
    marketMakerId: string,
    pnl: number,
    isRealized: boolean
  ): Promise<void> {
    this.pnlCalculator.recordPnL(marketMakerId, pnl, isRealized);
  }

  /**
   * Get all pool statistics
   */
  public async getAllPoolStats(): Promise<
    Map<
      string,
      {
        balance: { baseCurrency: number; quoteCurrency: number; totalValueLocked: number };
        pnl: { unrealized: number; realized: number; total: number };
      }
    >
  > {
    const stats = new Map();

    for (const [marketMakerId, tracker] of this.balanceTrackers) {
      stats.set(marketMakerId, {
        balance: await tracker.getBalance(),
        pnl: await this.getPnL(marketMakerId),
      });
    }

    return stats;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Update pool in database
   */
  private async updatePoolInDatabase(marketMakerId: string): Promise<void> {
    try {
      const tracker = this.getBalanceTracker(marketMakerId);
      const balance = await tracker.getBalance();

      await models.aiMarketMakerPool.update(
        {
          baseCurrencyBalance: balance.baseCurrency,
          quoteCurrencyBalance: balance.quoteCurrency,
          totalValueLocked: balance.totalValueLocked,
        },
        { where: { marketMakerId } }
      );
    } catch (error) {
      logger.error("AI_MM_POOL", "Failed to update pool in database", error);
    }
  }

  /**
   * Log pool action to history
   */
  private async logPoolAction(
    marketMakerId: string,
    action: string,
    details: any
  ): Promise<void> {
    try {
      const tracker = this.getBalanceTracker(marketMakerId);
      const balance = await tracker.getBalance();

      await models.aiMarketMakerHistory.create({
        marketMakerId,
        action,
        details,
        priceAtAction: 0,
        poolValueAtAction: balance.totalValueLocked,
      });
    } catch (error) {
      // Ignore history logging errors
    }
  }
}

export default PoolManager;
