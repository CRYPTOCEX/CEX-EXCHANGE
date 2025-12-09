import { models } from "@b/db";
import { calculateTVL } from "../../helpers/tvl";

/**
 * BalanceTracker - Tracks real-time balance for a single pool
 *
 * Handles:
 * - Current balance tracking
 * - Reserved balance for open orders
 * - Available balance calculation
 * - Balance sync with database
 */
export class BalanceTracker {
  private marketMakerId: string;

  // Current balances
  private baseCurrencyBalance: number = 0;
  private quoteCurrencyBalance: number = 0;

  // Reserved for open orders
  private reservedBase: number = 0;
  private reservedQuote: number = 0;

  // Initial balances (for P&L calculation)
  private initialBaseBalance: number = 0;
  private initialQuoteBalance: number = 0;

  // Last sync time
  private lastSyncTime: Date | null = null;

  // Current price for TVL calculation
  private currentPrice: number = 0;

  constructor(marketMakerId: string) {
    this.marketMakerId = marketMakerId;
  }

  /**
   * Set current price for accurate TVL calculation
   */
  public setCurrentPrice(price: number): void {
    this.currentPrice = price;
  }

  /**
   * Sync balance from database
   */
  public async syncFromDatabase(): Promise<void> {
    try {
      const pool = await models.aiMarketMakerPool.findOne({
        where: { marketMakerId: this.marketMakerId },
      });

      if (pool) {
        this.baseCurrencyBalance = parseFloat(pool.baseCurrencyBalance) || 0;
        this.quoteCurrencyBalance = parseFloat(pool.quoteCurrencyBalance) || 0;
        this.initialBaseBalance = parseFloat(pool.initialBaseBalance) || 0;
        this.initialQuoteBalance = parseFloat(pool.initialQuoteBalance) || 0;
        this.lastSyncTime = new Date();
      }
    } catch (error) {
      // Keep cached values on error
    }
  }

  /**
   * Get current balance
   */
  public async getBalance(): Promise<{
    baseCurrency: number;
    quoteCurrency: number;
    totalValueLocked: number;
  }> {
    // Ensure we have recent data
    if (!this.lastSyncTime || Date.now() - this.lastSyncTime.getTime() > 60000) {
      await this.syncFromDatabase();
    }

    // Calculate TVL using centralized helper with actual price
    const totalValueLocked = calculateTVL({
      baseBalance: this.baseCurrencyBalance,
      quoteBalance: this.quoteCurrencyBalance,
      currentPrice: this.currentPrice,
    });

    return {
      baseCurrency: this.baseCurrencyBalance,
      quoteCurrency: this.quoteCurrencyBalance,
      totalValueLocked,
    };
  }

  /**
   * Get available balance (total - reserved)
   */
  public getAvailableBalance(): { base: number; quote: number } {
    return {
      base: Math.max(0, this.baseCurrencyBalance - this.reservedBase),
      quote: Math.max(0, this.quoteCurrencyBalance - this.reservedQuote),
    };
  }

  /**
   * Reserve balance for an order
   */
  public reserve(currency: "base" | "quote", amount: number): boolean {
    const available = this.getAvailableBalance();

    if (currency === "base") {
      if (available.base < amount) {
        return false;
      }
      this.reservedBase += amount;
    } else {
      if (available.quote < amount) {
        return false;
      }
      this.reservedQuote += amount;
    }

    return true;
  }

  /**
   * Release reserved balance
   */
  public release(currency: "base" | "quote", amount: number): void {
    if (currency === "base") {
      this.reservedBase = Math.max(0, this.reservedBase - amount);
    } else {
      this.reservedQuote = Math.max(0, this.reservedQuote - amount);
    }
  }

  /**
   * Deposit funds
   */
  public async deposit(currency: "base" | "quote", amount: number): Promise<void> {
    if (currency === "base") {
      this.baseCurrencyBalance += amount;
    } else {
      this.quoteCurrencyBalance += amount;
    }
  }

  /**
   * Withdraw funds
   */
  public async withdraw(currency: "base" | "quote", amount: number): Promise<void> {
    const available = this.getAvailableBalance();

    if (currency === "base") {
      if (available.base < amount) {
        throw new Error("Insufficient base currency balance");
      }
      this.baseCurrencyBalance -= amount;
    } else {
      if (available.quote < amount) {
        throw new Error("Insufficient quote currency balance");
      }
      this.quoteCurrencyBalance -= amount;
    }
  }

  /**
   * Check if withdrawal is possible
   */
  public async canWithdraw(currency: "base" | "quote", amount: number): Promise<boolean> {
    const available = this.getAvailableBalance();

    if (currency === "base") {
      return available.base >= amount;
    } else {
      return available.quote >= amount;
    }
  }

  /**
   * Rebalance pool to target ratio
   */
  public async rebalance(targetRatio: number = 0.5): Promise<void> {
    // targetRatio is the percentage of base currency (0.5 = 50/50)
    const total = this.baseCurrencyBalance + this.quoteCurrencyBalance;

    this.baseCurrencyBalance = total * targetRatio;
    this.quoteCurrencyBalance = total * (1 - targetRatio);
  }

  /**
   * Apply trade (update balances after trade execution)
   */
  public applyTrade(
    side: "BUY" | "SELL",
    amount: number,
    price: number,
    fee: number = 0
  ): void {
    const cost = amount * price;

    if (side === "BUY") {
      // Buying base currency: add base, subtract quote
      this.baseCurrencyBalance += amount;
      this.quoteCurrencyBalance -= cost + fee;
    } else {
      // Selling base currency: subtract base, add quote
      this.baseCurrencyBalance -= amount;
      this.quoteCurrencyBalance += cost - fee;
    }
  }

  /**
   * Get initial balances
   */
  public getInitialBalances(): { base: number; quote: number } {
    return {
      base: this.initialBaseBalance,
      quote: this.initialQuoteBalance,
    };
  }

  /**
   * Get reserved amounts
   */
  public getReserved(): { base: number; quote: number } {
    return {
      base: this.reservedBase,
      quote: this.reservedQuote,
    };
  }
}

export default BalanceTracker;
