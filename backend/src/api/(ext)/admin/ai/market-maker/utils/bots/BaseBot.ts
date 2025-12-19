import { logger } from "@b/utils/console";
import type { OrderManager, OrderPurpose } from "../engine/OrderManager";

// Bot personality types
export type BotPersonality =
  | "SCALPER"
  | "SWING"
  | "ACCUMULATOR"
  | "DISTRIBUTOR"
  | "MARKET_MAKER";

// Bot status types
export type BotStatus = "ACTIVE" | "PAUSED" | "COOLDOWN" | "STOPPED";

// Trade frequency types
export type TradeFrequency = "HIGH" | "MEDIUM" | "LOW";

// Bot configuration
export interface BotConfig {
  id: string;
  name: string;
  marketMakerId: string;
  personality: BotPersonality;
  riskTolerance: number; // 0-1
  tradeFrequency: TradeFrequency;
  avgOrderSize: number;
  orderSizeVariance: number; // 0-1
  preferredSpread: number; // Percentage
  maxDailyTrades: number;
}

// Trade decision result
export interface TradeDecision {
  shouldTrade: boolean;
  side?: "BUY" | "SELL";
  price?: bigint;
  amount?: bigint;
  purpose?: OrderPurpose;
  reason?: string;
  confidence?: number;
}

// Market context for decision making
export interface MarketContext {
  currentPrice: bigint;
  targetPrice: bigint;
  priceRangeLow: number;
  priceRangeHigh: number;
  volatility: number;
  recentTrend: "UP" | "DOWN" | "SIDEWAYS";
  spreadBps: number; // Basis points
  recentVolume?: bigint;
  orderbook?: {
    bestBid: bigint;
    bestAsk: bigint;
  };
}

/**
 * BaseBot - Abstract base class for all bot personalities
 *
 * Each bot personality extends this class and implements
 * its specific trading logic.
 */
export abstract class BaseBot {
  protected config: BotConfig;
  protected status: BotStatus = "STOPPED";
  protected orderManager: OrderManager | null = null;

  // Trading state
  protected dailyTradeCount: number = 0;
  protected lastTradeTime: Date | null = null;
  protected openOrderIds: Set<string> = new Set();
  protected consecutiveWins: number = 0;
  protected consecutiveLosses: number = 0;

  // Performance tracking
  protected totalTrades: number = 0;
  protected winningTrades: number = 0;
  protected totalPnL: number = 0;

  constructor(config: BotConfig) {
    this.config = config;
  }

  // ============================================
  // Abstract Methods - Must be implemented by subclasses
  // ============================================

  /**
   * Decide whether to trade and what trade to make
   */
  abstract decideTrade(context: MarketContext): TradeDecision;

  /**
   * Calculate order size based on personality
   */
  abstract calculateOrderSize(context: MarketContext): bigint;

  /**
   * Calculate order price based on personality
   */
  abstract calculatePrice(
    context: MarketContext,
    side: "BUY" | "SELL"
  ): bigint;

  /**
   * Get personality-specific cooldown time (ms)
   */
  abstract getCooldownTime(): number;

  // ============================================
  // Common Methods
  // ============================================

  /**
   * Initialize bot with order manager
   */
  public initialize(orderManager: OrderManager): void {
    this.orderManager = orderManager;
    this.status = "ACTIVE";
    this.resetDailyStats();
  }

  /**
   * Start the bot
   */
  public start(): void {
    if (this.status === "STOPPED") {
      this.status = "ACTIVE";
      this.resetDailyStats();
    }
  }

  /**
   * Stop the bot
   */
  public stop(): void {
    this.status = "STOPPED";
  }

  /**
   * Pause the bot
   */
  public pause(): void {
    if (this.status === "ACTIVE") {
      this.status = "PAUSED";
    }
  }

  /**
   * Resume the bot
   */
  public resume(): void {
    if (this.status === "PAUSED") {
      this.status = "ACTIVE";
    }
  }

  /**
   * Enter cooldown period
   */
  public enterCooldown(): void {
    this.status = "COOLDOWN";
    setTimeout(() => {
      if (this.status === "COOLDOWN") {
        this.status = "ACTIVE";
      }
    }, this.getCooldownTime());
  }

  /**
   * Check if bot can trade
   */
  public canTrade(): boolean {
    if (this.status !== "ACTIVE") {
      return false;
    }

    if (this.dailyTradeCount >= this.config.maxDailyTrades) {
      return false;
    }

    // Check minimum time between trades
    if (this.lastTradeTime) {
      const minInterval = this.getMinTradeInterval();
      if (Date.now() - this.lastTradeTime.getTime() < minInterval) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a trade
   */
  public async executeTrade(decision: TradeDecision): Promise<string | null> {
    if (!this.orderManager || !decision.shouldTrade) {
      return null;
    }

    if (!decision.side || !decision.price || !decision.amount) {
      return null;
    }

    try {
      const orderId = await this.orderManager.createOrder({
        botId: this.config.id,
        side: decision.side,
        type: "LIMIT",
        price: decision.price,
        amount: decision.amount,
        purpose: decision.purpose || "LIQUIDITY",
        isRealLiquidity: false, // Bots use AI-only orders
      });

      if (orderId) {
        this.openOrderIds.add(orderId);
        this.dailyTradeCount++;
        this.totalTrades++;
        this.lastTradeTime = new Date();
      }

      return orderId;
    } catch (error) {
      logger.error("AI_BOT", "Failed to execute trade", error);
      return null;
    }
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.orderManager) {
      return false;
    }

    const success = await this.orderManager.cancelOrder(orderId);
    if (success) {
      this.openOrderIds.delete(orderId);
    }
    return success;
  }

  /**
   * Cancel all open orders
   */
  public async cancelAllOrders(): Promise<void> {
    if (!this.orderManager) {
      return;
    }

    for (const orderId of this.openOrderIds) {
      await this.cancelOrder(orderId);
    }
    this.openOrderIds.clear();
  }

  /**
   * Record trade result
   */
  public recordTradeResult(pnl: number): void {
    this.totalPnL += pnl;

    if (pnl > 0) {
      this.winningTrades++;
      this.consecutiveWins++;
      this.consecutiveLosses = 0;
    } else if (pnl < 0) {
      this.consecutiveLosses++;
      this.consecutiveWins = 0;

      // Enter cooldown after consecutive losses
      if (this.consecutiveLosses >= 3) {
        this.enterCooldown();
      }
    }
  }

  /**
   * Reset daily statistics
   */
  public resetDailyStats(): void {
    this.dailyTradeCount = 0;
  }

  // ============================================
  // Getters
  // ============================================

  public getId(): string {
    return this.config.id;
  }

  // Alias for getId() for compatibility
  public getBotId(): string {
    return this.config.id;
  }

  public getName(): string {
    return this.config.name;
  }

  public getPersonality(): BotPersonality {
    return this.config.personality;
  }

  public getStatus(): BotStatus {
    return this.status;
  }

  public getConfig(): BotConfig {
    return { ...this.config };
  }

  public getOpenOrderCount(): number {
    return this.openOrderIds.size;
  }

  public getTotalTrades(): number {
    return this.totalTrades;
  }

  public getSuccessfulTrades(): number {
    return this.winningTrades;
  }

  public getFailedTrades(): number {
    return this.totalTrades - this.winningTrades;
  }

  public getWinRate(): number {
    return this.totalTrades > 0 ? this.winningTrades / this.totalTrades : 0;
  }

  public getLastTradeTime(): number | null {
    return this.lastTradeTime ? this.lastTradeTime.getTime() : null;
  }

  public getPnL(): number {
    return this.totalPnL;
  }

  public setOrderManager(orderManager: OrderManager): void {
    this.orderManager = orderManager;
  }

  public getStats(): {
    totalTrades: number;
    winningTrades: number;
    winRate: number;
    totalPnL: number;
    dailyTradeCount: number;
    status: BotStatus;
  } {
    return {
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      winRate: this.totalTrades > 0 ? this.winningTrades / this.totalTrades : 0,
      totalPnL: this.totalPnL,
      dailyTradeCount: this.dailyTradeCount,
      status: this.status,
    };
  }

  // ============================================
  // Protected Helper Methods
  // ============================================

  /**
   * Get minimum time between trades based on frequency
   */
  protected getMinTradeInterval(): number {
    switch (this.config.tradeFrequency) {
      case "HIGH":
        return 5000; // 5 seconds
      case "MEDIUM":
        return 30000; // 30 seconds
      case "LOW":
        return 120000; // 2 minutes
    }
  }

  /**
   * Add variance to a value
   */
  protected addVariance(value: number, variance: number = this.config.orderSizeVariance): number {
    const factor = 1 - variance + Math.random() * variance * 2;
    return value * factor;
  }

  /**
   * Check if price is near a psychological level
   */
  protected isNearPsychologicalLevel(price: number): boolean {
    // Check if near round numbers
    const roundLevels = [
      Math.floor(price / 1000) * 1000,
      Math.floor(price / 100) * 100,
      Math.floor(price / 10) * 10,
    ];

    for (const level of roundLevels) {
      const distance = Math.abs(price - level) / price;
      if (distance < 0.005) {
        // Within 0.5%
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate trend direction from price difference
   */
  protected getTrendDirection(
    currentPrice: number,
    targetPrice: number
  ): "UP" | "DOWN" | "SIDEWAYS" {
    const diff = (targetPrice - currentPrice) / currentPrice;
    if (Math.abs(diff) < 0.001) {
      return "SIDEWAYS";
    }
    return diff > 0 ? "UP" : "DOWN";
  }
}

export default BaseBot;
