import { logger } from "@b/utils/console";
import type { MarketMakerEngine } from "./MarketMakerEngine";
import { PriceTracker } from "./PriceTracker";
import { OrderManager } from "./OrderManager";
import { TradeExecutor } from "./TradeExecutor";
import {
  insertPriceHistory,
  calculateLiquiditySplit,
  clearOrderbookForSymbol,
  clearCandlesForSymbol,
  syncOrderbookFromAiTrade,
  syncCandlesFromAiTrade,
  getLastCandleClosePrice,
  deleteAiBotOrdersByMarket,
} from "../scylla/queries";
import {
  clearOrderbookCache,
  forceOrderbookBroadcast,
} from "@b/api/(ext)/ecosystem/market/index.ws";

// Market instance status
export type MarketStatus = "INITIALIZING" | "RUNNING" | "PAUSED" | "STOPPED" | "ERROR";

// Bot configuration from database
export interface BotConfig {
  id: string;
  name: string;
  personality: "SCALPER" | "SWING" | "ACCUMULATOR" | "DISTRIBUTOR" | "MARKET_MAKER";
  riskTolerance: number;
  tradeFrequency: "HIGH" | "MEDIUM" | "LOW";
  avgOrderSize: number;
  orderSizeVariance: number;
  preferredSpread: number;
  status: "ACTIVE" | "PAUSED" | "COOLDOWN";
  lastTradeAt: Date | null;
  dailyTradeCount: number;
  maxDailyTrades: number;
}

// Market maker configuration from database
export interface MarketMakerConfig {
  id: string;
  marketId: string;
  symbol: string;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
  targetPrice: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  aggressionLevel: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  maxDailyVolume: number;
  currentDailyVolume: number;
  volatilityThreshold: number;
  pauseOnHighVolatility: boolean;
  realLiquidityPercent: number;
  pool: {
    baseCurrencyBalance: number;
    quoteCurrencyBalance: number;
    totalValueLocked: number;
  } | null;
  bots: BotConfig[];
}

/**
 * MarketInstance - Manages a single AI market maker
 *
 * This class handles:
 * - Price tracking and external price feeds
 * - Order management (both AI-only and real liquidity)
 * - Trade execution between bots
 * - Strategy execution for price movement
 */
export class MarketInstance {
  private engine: MarketMakerEngine;
  private config: MarketMakerConfig;
  private status: MarketStatus = "INITIALIZING";

  // Sub-components
  private priceTracker: PriceTracker;
  private orderManager: OrderManager;
  private tradeExecutor: TradeExecutor;

  // State
  private currentPrice: bigint = BigInt(0);
  private simulatedPrice: bigint = BigInt(0); // Simulated price for oscillation
  private lastProcessTime: Date | null = null;
  private processCount: number = 0;
  private errorCount: number = 0;

  // Oscillation state for creating natural market movement
  private oscillationStep: number = 0;

  constructor(engine: MarketMakerEngine, makerData: any) {
    this.engine = engine;
    this.config = this.parseConfig(makerData);

    // Initialize sub-components
    this.priceTracker = new PriceTracker(this.config.symbol, this.config.marketId);
    this.orderManager = new OrderManager(this.config, engine);
    this.tradeExecutor = new TradeExecutor(this.config, this.orderManager);
  }

  /**
   * Parse database model to config
   */
  private parseConfig(makerData: any): MarketMakerConfig {
    // Construct symbol from currency/pair since ecosystemMarket doesn't have a symbol field
    const symbol = makerData.market
      ? `${makerData.market.currency}/${makerData.market.pair}`
      : "UNKNOWN/UNKNOWN";

    return {
      id: makerData.id,
      marketId: makerData.marketId,
      symbol,
      status: makerData.status,
      targetPrice: parseFloat(makerData.targetPrice) || 0,
      priceRangeLow: parseFloat(makerData.priceRangeLow) || 0,
      priceRangeHigh: parseFloat(makerData.priceRangeHigh) || 0,
      aggressionLevel: makerData.aggressionLevel || "CONSERVATIVE",
      maxDailyVolume: parseFloat(makerData.maxDailyVolume) || 0,
      currentDailyVolume: parseFloat(makerData.currentDailyVolume) || 0,
      volatilityThreshold: parseFloat(makerData.volatilityThreshold) || 5,
      pauseOnHighVolatility: makerData.pauseOnHighVolatility ?? true,
      realLiquidityPercent: parseFloat(makerData.realLiquidityPercent) || 0,
      pool: makerData.pool
        ? {
            baseCurrencyBalance: parseFloat(makerData.pool.baseCurrencyBalance) || 0,
            quoteCurrencyBalance: parseFloat(makerData.pool.quoteCurrencyBalance) || 0,
            totalValueLocked: parseFloat(makerData.pool.totalValueLocked) || 0,
          }
        : null,
      bots: (makerData.bots || []).map((bot: any) => ({
        id: bot.id,
        name: bot.name,
        personality: bot.personality,
        riskTolerance: parseFloat(bot.riskTolerance) || 0.5,
        tradeFrequency: bot.tradeFrequency || "MEDIUM",
        avgOrderSize: parseFloat(bot.avgOrderSize) || 0,
        orderSizeVariance: parseFloat(bot.orderSizeVariance) || 0.2,
        preferredSpread: parseFloat(bot.preferredSpread) || 0.001,
        status: bot.status,
        lastTradeAt: bot.lastTradeAt,
        dailyTradeCount: bot.dailyTradeCount || 0,
        maxDailyTrades: bot.maxDailyTrades || 100,
      })),
    };
  }

  /**
   * Initialize the market instance
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize price tracker
      await this.priceTracker.initialize();

      // Get initial price - priority order:
      // 1. Last candle close price (for chart continuity)
      // 2. External price from price tracker
      // 3. Target price from config

      // First, try to get the last candle close price for chart continuity
      const lastCandlePrice = await getLastCandleClosePrice(this.config.symbol);

      if (lastCandlePrice !== null && lastCandlePrice > 0) {
        // Use last candle close to ensure smooth chart continuation
        this.currentPrice = BigInt(Math.floor(lastCandlePrice * 1e18));
        this.simulatedPrice = this.currentPrice;
        logger.info(
          "AI_MM",
          `Using last candle close price for ${this.config.symbol}: ${lastCandlePrice}`
        );
      } else {
        // No existing candles - get external price or use target
        this.currentPrice = await this.priceTracker.getCurrentPrice();

        // If no external price available, use target price
        if (this.currentPrice === BigInt(0) && this.config.targetPrice > 0) {
          this.currentPrice = BigInt(Math.floor(this.config.targetPrice * 1e18));
          logger.info(
            "AI_MM",
            `No external price for ${this.config.symbol}, using target price: ${this.config.targetPrice}`
          );
        }

        // Start simulated price at current/target price
        this.simulatedPrice = this.currentPrice;
      }

      // Clear orderbook on initialization to ensure fresh, correct data
      // This removes any corrupted entries (e.g., inverted bids/asks)
      await clearOrderbookForSymbol(this.config.symbol);

      // Clean up old AI bot orders from ScyllaDB
      // These accumulate over time and are never matched (AI-to-AI trades don't use persistent orders)
      // This prevents the ai_bot_orders table from growing indefinitely
      const deletedOrders = await deleteAiBotOrdersByMarket(this.config.marketId);
      if (deletedOrders > 0) {
        logger.info("AI_MM", `Cleaned up ${deletedOrders} old AI bot orders for ${this.config.symbol}`);
      }

      // Note: We DON'T clear candles on restart - we want to preserve chart history

      // Initialize order manager
      await this.orderManager.initialize();

      // Seed fresh orderbook around current/target price
      await this.seedOrderbook();

      this.status = "RUNNING";
      logger.success("AI_MM", `Market instance initialized: ${this.config.symbol}`);
    } catch (error) {
      this.status = "ERROR";
      logger.error("AI_MM", "Market instance initialization error", error);
      throw error;
    }
  }

  /**
   * Seed the orderbook with fresh data around target price
   * This creates a basic spread and initializes the chart
   */
  private async seedOrderbook(): Promise<void> {
    try {
      // Check if we have active bots
      const activeBots = this.config.bots.filter(b => b.status === "ACTIVE");
      if (activeBots.length === 0) {
        logger.warn("AI_MM", `No active bots for ${this.config.symbol}, cannot seed orderbook`);
        return;
      }

      const targetPrice = this.config.targetPrice;
      if (targetPrice <= 0) {
        logger.warn("AI_MM", `No target price for ${this.config.symbol}, cannot seed orderbook`);
        return;
      }

      logger.info("AI_MM", `Seeding orderbook for ${this.config.symbol} around target price ${targetPrice}`);

      // Calculate base order size from bot avg or default
      let baseOrderSize = activeBots.reduce((sum, b) => sum + b.avgOrderSize, 0) / activeBots.length;

      // If bots have 0 avgOrderSize, use a sensible default
      if (baseOrderSize <= 0) {
        // Default: ~$100 worth at target price
        baseOrderSize = Math.max(0.1, 100 / targetPrice);
      }

      // If pool exists, also limit to pool liquidity
      if (this.config.pool && this.config.pool.baseCurrencyBalance > 0) {
        const maxFromPool = this.config.pool.baseCurrencyBalance * 0.1;
        baseOrderSize = Math.min(baseOrderSize, maxFromPool);
      }

      // Sync orderbook to ecosystem for display (creates spread around target price)
      await syncOrderbookFromAiTrade(
        this.config.symbol,
        targetPrice,
        baseOrderSize,
        "BUY" // Direction doesn't matter, it creates both sides
      );

      // Seed initial candle data at target price so chart starts fresh
      await syncCandlesFromAiTrade(
        this.config.symbol,
        targetPrice,
        baseOrderSize
      );

      logger.success("AI_MM", `Seeded orderbook and candles for ${this.config.symbol} at ${targetPrice}`);
    } catch (error) {
      logger.error("AI_MM", "Orderbook seeding error", error);
      // Don't fail initialization if seeding fails
      logger.warn("AI_MM", `Failed to seed orderbook for ${this.config.symbol}, continuing anyway`);
    }
  }

  /**
   * Shutdown the market instance
   */
  public async shutdown(): Promise<void> {
    this.status = "STOPPED";

    // Cancel all orders
    await this.cancelAllOrders();

    // Cleanup
    this.priceTracker.cleanup();
  }

  /**
   * Emergency stop
   */
  public async emergencyStop(): Promise<void> {
    this.status = "STOPPED";

    // Immediately cancel all orders
    await this.orderManager.cancelAllOrders();
  }

  /**
   * Pause trading
   */
  public async pause(): Promise<void> {
    this.status = "PAUSED";
  }

  /**
   * Resume trading
   */
  public async resume(): Promise<void> {
    this.status = "RUNNING";
  }

  /**
   * Update configuration from database (used after daily resets)
   */
  public updateConfig(makerData: any): void {
    const newConfig = this.parseConfig(makerData);

    // Update the config - this resets daily volume to 0 if database was updated
    this.config = newConfig;

    logger.info(
      "AI_MM",
      `Config updated for ${this.config.symbol}: dailyVolume=${this.config.currentDailyVolume}/${this.config.maxDailyVolume}`
    );
  }

  /**
   * Cancel all orders
   */
  public async cancelAllOrders(): Promise<void> {
    await this.orderManager.cancelAllOrders();
  }

  /**
   * Cleanup expired orders
   */
  public async cleanupExpiredOrders(): Promise<void> {
    await this.orderManager.cleanupExpiredOrders();
  }

  /**
   * Main process - called on each engine tick
   */
  public async process(): Promise<void> {
    if (this.status !== "RUNNING") {
      return;
    }

    this.processCount++;
    this.lastProcessTime = new Date();

    try {
      // 1. Update current price
      await this.updatePrice();

      // 2. Check if we should trade
      if (!this.shouldTrade()) {
        return;
      }

      // 3. Get strategy decision
      const decision = await this.getStrategyDecision();

      // 4. Execute decision
      if (decision.shouldAct) {
        await this.executeDecision(decision);
      }

      // 5. Record price history
      await this.recordPriceHistory();
    } catch (error) {
      this.errorCount++;
      logger.error("AI_MM", `Process error for ${this.config.symbol}`, error);

      // Too many errors, pause
      if (this.errorCount > 10) {
        this.status = "PAUSED";
        logger.error("AI_MM", `Too many errors, pausing ${this.config.symbol}`);
      }
    }
  }

  /**
   * Update current price from external source
   */
  private async updatePrice(): Promise<void> {
    const newPrice = await this.priceTracker.fetchExternalPrice();
    if (newPrice > BigInt(0)) {
      this.currentPrice = newPrice;
    }
  }

  /**
   * Check if we should trade this tick
   */
  private shouldTrade(): boolean {
    // Check if we have active bots (required for AI-to-AI trading)
    const activeBots = this.config.bots.filter((b) => b.status === "ACTIVE");
    if (activeBots.length < 2) {
      if (this.processCount % 60 === 0) {
        logger.warn("AI_MM", `Need at least 2 active bots for ${this.config.symbol}, have: ${activeBots.length}`);
      }
      return false;
    }

    // For real liquidity mode, check pool has funds
    // For pure AI-to-AI mode (realLiquidityPercent = 0), pool is optional
    if (this.config.realLiquidityPercent > 0) {
      if (!this.config.pool || this.config.pool.totalValueLocked <= 0) {
        if (this.processCount % 60 === 0) {
          logger.warn("AI_MM", `Real liquidity enabled but no pool for ${this.config.symbol}`);
        }
        return false;
      }
    }

    // Check daily volume limit (if set)
    if (this.config.maxDailyVolume > 0 && this.config.currentDailyVolume >= this.config.maxDailyVolume) {
      if (this.processCount % 60 === 0) {
        logger.warn("AI_MM", `Daily volume limit reached for ${this.config.symbol}: ${this.config.currentDailyVolume}/${this.config.maxDailyVolume}`);
      }
      return false;
    }

    // Check volatility (if enabled)
    if (this.config.pauseOnHighVolatility) {
      const volatility = this.priceTracker.getVolatility();
      if (volatility > this.config.volatilityThreshold) {
        logger.warn("AI_MM", `High volatility (${volatility}%), skipping ${this.config.symbol}`);
        return false;
      }
    }

    // Random chance based on aggression level
    const tradeChance = this.getTradeChance();
    const roll = Math.random();
    const shouldTrade = roll < tradeChance;

    // Debug logging every 10 ticks
    if (process.env.NODE_ENV === "development" && this.processCount % 10 === 0) {
      logger.debug(
        "AI_MM",
        `${this.config.symbol} tick #${this.processCount}: chance=${(tradeChance * 100).toFixed(0)}%, roll=${(roll * 100).toFixed(0)}%, trade=${shouldTrade}`
      );
    }

    return shouldTrade;
  }

  /**
   * Get trade chance based on aggression level
   */
  private getTradeChance(): number {
    switch (this.config.aggressionLevel) {
      case "AGGRESSIVE":
        return 0.3; // 30% chance per tick
      case "MODERATE":
        return 0.15; // 15% chance per tick
      case "CONSERVATIVE":
      default:
        return 0.05; // 5% chance per tick
    }
  }

  /**
   * Get strategy decision
   * Creates natural oscillation around target price within configured range
   *
   * IMPORTANT: Price movements are kept very small (0.01-0.1%) per trade
   * to create realistic looking candles on the chart
   */
  private async getStrategyDecision(): Promise<StrategyDecision> {
    const targetPriceNum = this.config.targetPrice;
    const priceRangeLow = this.config.priceRangeLow || targetPriceNum * 0.95;
    const priceRangeHigh = this.config.priceRangeHigh || targetPriceNum * 1.05;

    // Get current simulated price
    const simulatedPriceNum = Number(this.simulatedPrice) / 1e18;

    // Update oscillation step (creates a wave pattern over time)
    // Slow oscillation: takes ~60 ticks (1 minute at 1s ticks) for a full cycle
    this.oscillationStep += 0.05 + Math.random() * 0.05;

    // Keep oscillationStep bounded to prevent unbounded growth
    // Reset when we complete multiple full cycles (2π ≈ 6.28, so reset at ~100 for ~16 cycles)
    if (this.oscillationStep > 100) {
      this.oscillationStep = this.oscillationStep % (2 * Math.PI);
    }

    // Calculate oscillation range based on aggression level
    // Keep it small for realistic candles
    let maxOscillationPercent: number;
    switch (this.config.aggressionLevel) {
      case "AGGRESSIVE":
        maxOscillationPercent = 0.5; // ±0.5% from target
        break;
      case "MODERATE":
        maxOscillationPercent = 0.3; // ±0.3% from target
        break;
      case "CONSERVATIVE":
      default:
        maxOscillationPercent = 0.15; // ±0.15% from target
    }

    // Calculate next simulated price using sine wave for natural oscillation
    // Oscillation happens around the TARGET price, not current price
    const oscillationOffset = Math.sin(this.oscillationStep) * (maxOscillationPercent / 100) * targetPriceNum;

    // Add tiny random noise for realistic market behavior (±0.01%)
    const noise = (Math.random() - 0.5) * 0.0002 * targetPriceNum;

    // Calculate new simulated price
    let newSimulatedPrice = targetPriceNum + oscillationOffset + noise;

    // Clamp within configured range
    newSimulatedPrice = Math.max(priceRangeLow, Math.min(priceRangeHigh, newSimulatedPrice));

    // Update simulated price
    this.simulatedPrice = BigInt(Math.floor(newSimulatedPrice * 1e18));

    // Determine trade direction based on simulated price movement
    const priceDiff = newSimulatedPrice - simulatedPriceNum;
    const direction: "BUY" | "SELL" = priceDiff > 0 ? "BUY" : "SELL";

    // Always execute trades to create market activity (that's the point of AI market maker)
    // The random chance is already handled in shouldTrade()
    logger.info(
      "AI_MM",
      `Strategy decision for ${this.config.symbol}: ${direction} | price: ${newSimulatedPrice.toFixed(6)} | target: ${targetPriceNum.toFixed(6)}`
    );

    return {
      shouldAct: true,
      direction,
      targetPrice: newSimulatedPrice, // Pass the actual simulated price
      orderSize: this.calculateOrderSize(),
    };
  }

  /**
   * Calculate step size based on distance from target
   */
  private calculateStepSize(priceDiffPercent: number): number {
    const absDiff = Math.abs(priceDiffPercent);

    // Larger steps when far from target, smaller when close
    let maxStep: number;
    switch (this.config.aggressionLevel) {
      case "AGGRESSIVE":
        maxStep = 0.5; // 0.5% max step
        break;
      case "MODERATE":
        maxStep = 0.2; // 0.2% max step
        break;
      case "CONSERVATIVE":
      default:
        maxStep = 0.1; // 0.1% max step
    }

    // Scale step based on distance
    const step = Math.min(absDiff * 0.1, maxStep);

    // Add randomization (80% to 120% of calculated step)
    const randomFactor = 0.8 + Math.random() * 0.4;

    return step * randomFactor;
  }

  /**
   * Calculate order size based on bot configuration
   * For AI-to-AI trades, uses bot's avgOrderSize
   * For real liquidity, also considers pool balance limits
   */
  private calculateOrderSize(): bigint {
    // Get average order size from active bots
    const activeBots = this.config.bots.filter((b) => b.status === "ACTIVE");
    if (activeBots.length === 0) {
      return BigInt(0);
    }

    // Use random bot's order size with variance (clamped to max 0.5 for safety)
    const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
    const orderSizeVariance = Math.min(bot.orderSizeVariance, 0.5);
    const variance = 1 - orderSizeVariance + Math.random() * orderSizeVariance * 2;
    let orderSize = bot.avgOrderSize * variance;

    // If pool exists, limit to pool liquidity for real liquidity trades
    if (this.config.pool && this.config.pool.baseCurrencyBalance > 0) {
      const baseBalance = this.config.pool.baseCurrencyBalance;
      const maxTradePercent = 0.05 + Math.random() * 0.1; // 5-15%
      const maxOrderSize = baseBalance * maxTradePercent;

      // Use the smaller of configured order size or max allowed
      if (orderSize > maxOrderSize && this.config.realLiquidityPercent > 0) {
        orderSize = maxOrderSize;
      }
    }

    // Ensure minimum trade size (at least 0.001 of base currency)
    const minOrderSize = 0.001;
    if (orderSize < minOrderSize) {
      orderSize = minOrderSize;
    }

    // If bot's avgOrderSize is 0, use a default based on target price
    if (orderSize < minOrderSize) {
      // Default: ~$10 worth at target price, minimum 0.01
      const targetPrice = this.config.targetPrice || 1;
      orderSize = Math.max(0.01, 10 / targetPrice);
    }

    // Convert to bigint (assuming 18 decimals)
    return BigInt(Math.floor(orderSize * 1e18));
  }

  /**
   * Execute the strategy decision
   */
  private async executeDecision(decision: StrategyDecision): Promise<void> {
    if (!decision.shouldAct || !decision.direction || !decision.orderSize || !decision.targetPrice) {
      return;
    }

    // Calculate liquidity split
    const { aiAmount, realAmount } = calculateLiquiditySplit(
      decision.orderSize,
      this.config.realLiquidityPercent
    );

    // Execute AI-only trade (bot-to-bot)
    if (aiAmount > BigInt(0)) {
      await this.tradeExecutor.executeAiTrade({
        direction: decision.direction,
        amount: aiAmount,
        targetPrice: decision.targetPrice,
      });
    }

    // Execute real liquidity order (in ecosystem)
    if (realAmount > BigInt(0)) {
      await this.tradeExecutor.placeRealLiquidityOrder({
        direction: decision.direction,
        amount: realAmount,
        targetPrice: decision.targetPrice,
        volatility: this.priceTracker.getVolatility(), // Pass current volatility for dynamic spread
      });
    }
  }

  /**
   * Record price history
   */
  private async recordPriceHistory(): Promise<void> {
    // Only record every 10 processes to reduce noise
    if (this.processCount % 10 !== 0) {
      return;
    }

    try {
      await insertPriceHistory({
        marketId: this.config.marketId,
        price: this.currentPrice,
        volume: BigInt(0), // Will be calculated
        isAiTrade: true,
        source: "AI",
      });
    } catch (error) {
      // Ignore price history errors
    }
  }

  // ============================================
  // Getters
  // ============================================

  public getStatus(): MarketStatus {
    return this.status;
  }

  public getConfig(): MarketMakerConfig {
    return { ...this.config };
  }

  public getCurrentPrice(): bigint {
    return this.currentPrice;
  }

  public getSymbol(): string {
    return this.config.symbol;
  }

  public getStats(): {
    processCount: number;
    errorCount: number;
    lastProcessTime: Date | null;
    currentPrice: string;
  } {
    return {
      processCount: this.processCount,
      errorCount: this.errorCount,
      lastProcessTime: this.lastProcessTime,
      currentPrice: (Number(this.currentPrice) / 1e18).toFixed(8),
    };
  }
}

// Strategy decision interface
interface StrategyDecision {
  shouldAct: boolean;
  direction?: "BUY" | "SELL";
  targetPrice?: number; // The simulated price for the trade
  orderSize?: bigint;
}

export default MarketInstance;
