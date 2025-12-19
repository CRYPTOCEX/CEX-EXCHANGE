import { BaseBot, BotStatus, MarketContext, TradeDecision } from "./BaseBot";
import { BotFactory, MarketBotConfig } from "./BotFactory";
import { OrderManager } from "../engine/OrderManager";
import { logger } from "@b/utils/console";

/**
 * Bot statistics
 */
export interface BotStats {
  botId: string;
  personality: string;
  status: BotStatus;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  winRate: number;
  lastTradeTime: number | null;
  pnl: number;
}

/**
 * Market bot group
 */
interface MarketBotGroup {
  marketId: string;
  bots: BaseBot[];
  isRunning: boolean;
  loopInterval: NodeJS.Timeout | null;
}

/**
 * BotManager - Manages bot lifecycle and execution
 *
 * Handles:
 * - Starting/stopping bots
 * - Managing bot groups per market
 * - Executing bot trading loops
 * - Collecting bot statistics
 */
export class BotManager {
  private static instance: BotManager;
  private factory: BotFactory;
  private marketGroups: Map<string, MarketBotGroup> = new Map();
  private orderManagers: Map<string, OrderManager> = new Map();

  // Configuration
  private readonly minLoopInterval = 1000; // 1 second minimum
  private readonly maxConcurrentTrades = 3; // Max concurrent trades per loop

  private constructor() {
    this.factory = BotFactory.getInstance();
  }

  public static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  /**
   * Initialize bots for a market
   */
  public async initializeMarket(
    marketConfig: MarketBotConfig,
    orderManager: OrderManager
  ): Promise<void> {
    const { marketId } = marketConfig;

    // Don't reinitialize if already exists
    if (this.marketGroups.has(marketId)) {
      logger.info("BOT_MANAGER", `Market ${marketId} already initialized`);
      return;
    }

    // Create bots for market
    const bots = this.factory.createBotsForMarket(marketConfig);

    // Initialize each bot with order manager
    for (const bot of bots) {
      bot.setOrderManager(orderManager);
    }

    // Store bot group
    this.marketGroups.set(marketId, {
      marketId,
      bots,
      isRunning: false,
      loopInterval: null,
    });

    // Store order manager reference
    this.orderManagers.set(marketId, orderManager);

    logger.info("BOT_MANAGER", `Initialized ${bots.length} bots for market ${marketId}`);
  }

  /**
   * Start all bots for a market
   */
  public async startMarket(marketId: string): Promise<void> {
    const group = this.marketGroups.get(marketId);
    if (!group) {
      throw new Error(`Market ${marketId} not initialized`);
    }

    if (group.isRunning) {
      logger.info("BOT_MANAGER", `Market ${marketId} already running`);
      return;
    }

    // Start each bot
    for (const bot of group.bots) {
      await bot.start();
    }

    group.isRunning = true;

    // Start trading loop
    this.startTradingLoop(marketId);

    logger.info("BOT_MANAGER", `Started ${group.bots.length} bots for market ${marketId}`);
  }

  /**
   * Stop all bots for a market
   */
  public async stopMarket(marketId: string): Promise<void> {
    const group = this.marketGroups.get(marketId);
    if (!group) {
      return;
    }

    // Stop trading loop
    if (group.loopInterval) {
      clearInterval(group.loopInterval);
      group.loopInterval = null;
    }

    // Stop each bot
    for (const bot of group.bots) {
      await bot.stop();
    }

    group.isRunning = false;

    logger.info("BOT_MANAGER", `Stopped bots for market ${marketId}`);
  }

  /**
   * Pause all bots for a market
   */
  public async pauseMarket(marketId: string): Promise<void> {
    const group = this.marketGroups.get(marketId);
    if (!group) return;

    for (const bot of group.bots) {
      await bot.pause();
    }

    logger.info("BOT_MANAGER", `Paused bots for market ${marketId}`);
  }

  /**
   * Resume all bots for a market
   */
  public async resumeMarket(marketId: string): Promise<void> {
    const group = this.marketGroups.get(marketId);
    if (!group) return;

    for (const bot of group.bots) {
      await bot.resume();
    }

    logger.info("BOT_MANAGER", `Resumed bots for market ${marketId}`);
  }

  /**
   * Remove market and cleanup
   */
  public async removeMarket(marketId: string): Promise<void> {
    const group = this.marketGroups.get(marketId);

    // Ensure interval is cleared before removing to prevent memory leaks
    if (group?.loopInterval) {
      clearInterval(group.loopInterval);
      group.loopInterval = null;
    }

    await this.stopMarket(marketId);

    // Clear all references to allow garbage collection
    if (group) {
      group.bots = [];
    }

    this.marketGroups.delete(marketId);
    this.orderManagers.delete(marketId);
    logger.info("BOT_MANAGER", `Removed market ${marketId}`);
  }

  /**
   * Add a single bot to a market
   */
  public async addBot(marketId: string, bot: BaseBot): Promise<void> {
    const group = this.marketGroups.get(marketId);
    if (!group) {
      throw new Error(`Market ${marketId} not initialized`);
    }

    const orderManager = this.orderManagers.get(marketId);
    if (orderManager) {
      bot.setOrderManager(orderManager);
    }

    group.bots.push(bot);

    if (group.isRunning) {
      await bot.start();
    }

    logger.info("BOT_MANAGER", `Added bot ${bot.getBotId()} to market ${marketId}`);
  }

  /**
   * Remove a specific bot
   */
  public async removeBot(marketId: string, botId: string): Promise<void> {
    const group = this.marketGroups.get(marketId);
    if (!group) return;

    const botIndex = group.bots.findIndex((b) => b.getBotId() === botId);
    if (botIndex === -1) return;

    const bot = group.bots[botIndex];
    await bot.stop();

    group.bots.splice(botIndex, 1);

    logger.info("BOT_MANAGER", `Removed bot ${botId} from market ${marketId}`);
  }

  /**
   * Get all bots for a market
   */
  public getBots(marketId: string): BaseBot[] {
    return this.marketGroups.get(marketId)?.bots || [];
  }

  /**
   * Get specific bot
   */
  public getBot(marketId: string, botId: string): BaseBot | undefined {
    const group = this.marketGroups.get(marketId);
    return group?.bots.find((b) => b.getBotId() === botId);
  }

  /**
   * Get statistics for all bots in a market
   */
  public getMarketStats(marketId: string): BotStats[] {
    const group = this.marketGroups.get(marketId);
    if (!group) return [];

    return group.bots.map((bot) => ({
      botId: bot.getBotId(),
      personality: bot.getPersonality(),
      status: bot.getStatus(),
      totalTrades: bot.getTotalTrades(),
      successfulTrades: bot.getSuccessfulTrades(),
      failedTrades: bot.getFailedTrades(),
      winRate: bot.getWinRate(),
      lastTradeTime: bot.getLastTradeTime(),
      pnl: bot.getPnL(),
    }));
  }

  /**
   * Get aggregate statistics for a market
   */
  public getAggregateStats(marketId: string): {
    totalBots: number;
    activeBots: number;
    totalTrades: number;
    totalPnL: number;
    avgWinRate: number;
  } {
    const stats = this.getMarketStats(marketId);

    const totalBots = stats.length;
    const activeBots = stats.filter((s) => s.status === "ACTIVE").length;
    const totalTrades = stats.reduce((sum, s) => sum + s.totalTrades, 0);
    const totalPnL = stats.reduce((sum, s) => sum + s.pnl, 0);
    const avgWinRate =
      totalBots > 0
        ? stats.reduce((sum, s) => sum + s.winRate, 0) / totalBots
        : 0;

    return {
      totalBots,
      activeBots,
      totalTrades,
      totalPnL,
      avgWinRate,
    };
  }

  /**
   * Execute trading decisions for all ready bots
   */
  public async executeTradingRound(
    marketId: string,
    context: MarketContext
  ): Promise<TradeDecision[]> {
    const group = this.marketGroups.get(marketId);
    if (!group || !group.isRunning) {
      return [];
    }

    const decisions: TradeDecision[] = [];
    let tradesExecuted = 0;

    // Shuffle bots to avoid same order every time
    const shuffledBots = [...group.bots].sort(() => Math.random() - 0.5);

    for (const bot of shuffledBots) {
      // Check concurrent trade limit
      if (tradesExecuted >= this.maxConcurrentTrades) {
        break;
      }

      // Check if bot can trade
      if (!bot.canTrade()) {
        continue;
      }

      try {
        // Get bot's trade decision
        const decision = bot.decideTrade(context);
        decisions.push(decision);

        // Execute if bot wants to trade
        if (decision.shouldTrade) {
          const success = await bot.executeTrade(decision);
          if (success) {
            tradesExecuted++;
          }
        }
      } catch (error: any) {
        logger.error("BOT_MANAGER", "Error executing trade", error instanceof Error ? error : new Error(String(error)));
      }
    }

    return decisions;
  }

  /**
   * Check if market is running
   */
  public isMarketRunning(marketId: string): boolean {
    return this.marketGroups.get(marketId)?.isRunning || false;
  }

  /**
   * Get all active markets
   */
  public getActiveMarkets(): string[] {
    return Array.from(this.marketGroups.entries())
      .filter(([, group]) => group.isRunning)
      .map(([marketId]) => marketId);
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Start the trading loop for a market
   */
  private startTradingLoop(marketId: string): void {
    const group = this.marketGroups.get(marketId);
    if (!group) return;

    // Calculate optimal loop interval based on bot types
    const interval = this.calculateLoopInterval(group.bots);

    group.loopInterval = setInterval(async () => {
      if (!group.isRunning) return;

      try {
        // Get current market context from order manager
        const orderManager = this.orderManagers.get(marketId);
        if (!orderManager) return;

        const context = await this.buildMarketContext(marketId, orderManager);
        await this.executeTradingRound(marketId, context);
      } catch (error: any) {
        logger.error("BOT_MANAGER", "Error in trading loop", error instanceof Error ? error : new Error(String(error)));
      }
    }, interval);
  }

  /**
   * Calculate optimal loop interval based on bot personalities
   */
  private calculateLoopInterval(bots: BaseBot[]): number {
    if (bots.length === 0) return this.minLoopInterval;

    // Get minimum cooldown among all bots
    const minCooldown = Math.min(
      ...bots.map((bot) => bot.getCooldownTime())
    );

    // Loop at half the minimum cooldown (to catch bots as they become ready)
    return Math.max(this.minLoopInterval, Math.floor(minCooldown / 2));
  }

  /**
   * Build market context for bot decisions
   */
  private async buildMarketContext(
    marketId: string,
    orderManager: OrderManager
  ): Promise<MarketContext> {
    // Get current price from order manager (use any to access optional methods)
    const om = orderManager as any;
    const currentPrice = om.getCurrentPrice?.() || BigInt(0);
    const targetPrice = om.getTargetPrice?.() || currentPrice;

    // Get order book data
    const orderbook = om.getOrderbook?.() || {
      bids: [],
      asks: [],
      spread: 0,
      midPrice: Number(currentPrice) / 1e18,
    };

    // Calculate volatility (placeholder - should be from actual data)
    const volatility = 0;

    // Determine recent trend
    const recentTrend: "UP" | "DOWN" | "SIDEWAYS" = "SIDEWAYS";

    return {
      currentPrice,
      targetPrice,
      priceRangeLow: Number(currentPrice) * 0.9, // Default 10% below
      priceRangeHigh: Number(currentPrice) * 1.1, // Default 10% above
      volatility,
      recentTrend,
      spreadBps: orderbook.spread * 10000, // Convert to basis points
      recentVolume: BigInt(0),
      orderbook: {
        bestBid: orderbook.bids[0]?.price
          ? BigInt(Math.floor(orderbook.bids[0].price * 1e18))
          : BigInt(0),
        bestAsk: orderbook.asks[0]?.price
          ? BigInt(Math.floor(orderbook.asks[0].price * 1e18))
          : BigInt(0),
      },
    };
  }

  /**
   * Shutdown all markets
   */
  public async shutdown(): Promise<void> {
    const markets = Array.from(this.marketGroups.keys());

    for (const marketId of markets) {
      await this.stopMarket(marketId);
    }

    this.marketGroups.clear();
    this.orderManagers.clear();

    logger.info("BOT_MANAGER", "Shutdown complete");
  }
}

export default BotManager;
