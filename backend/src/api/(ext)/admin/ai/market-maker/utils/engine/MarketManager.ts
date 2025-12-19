import { models } from "@b/db";
import { Op } from "sequelize";
import { logger } from "@b/utils/console";
import type { MarketMakerEngine } from "./MarketMakerEngine";
import { MarketInstance, MarketStatus } from "./MarketInstance";
import { CacheManager } from "@b/utils/cache";

/**
 * MarketManager - Manages all active AI market maker instances
 *
 * Responsibilities:
 * - Load and track active market makers from database
 * - Start/stop/pause individual markets
 * - Coordinate market processing during each tick
 * - Handle market lifecycle events
 */
export class MarketManager {
  private engine: MarketMakerEngine;
  private markets: Map<string, MarketInstance> = new Map();
  private processingMarkets: Set<string> = new Set();

  // Batch processing settings to prevent resource exhaustion
  private readonly BATCH_SIZE = 5; // Process 5 markets concurrently max
  private readonly BATCH_DELAY_MS = 50; // Small delay between batches

  constructor(engine: MarketMakerEngine) {
    this.engine = engine;
  }

  /**
   * Load all active market makers from database
   * @returns Number of active market makers loaded
   */
  public async loadActiveMarkets(): Promise<number> {
    try {
      const activeMarkers = await models.aiMarketMaker.findAll({
        where: {
          status: "ACTIVE",
        },
        include: [
          {
            model: models.aiMarketMakerPool,
            as: "pool",
          },
          {
            model: models.ecosystemMarket,
            as: "market",
          },
        ],
      });

      for (const maker of activeMarkers) {
        await this.startMarket(maker.id);
      }

      return activeMarkers.length;
    } catch (error) {
      logger.error("AI_MM", "Market manager initialization error", error);
      throw error;
    }
  }

  /**
   * Start a specific market
   * @param makerOrId - Either a market maker ID string or the full market maker object
   */
  public async startMarket(makerOrId: string | any): Promise<boolean> {
    try {
      // Determine if we have an ID or full object
      const isFullObject = typeof makerOrId === "object" && makerOrId !== null;
      const marketMakerId = isFullObject ? makerOrId.id : makerOrId;

      // Check if already running
      if (this.markets.has(marketMakerId)) {
        logger.warn("AI_MM", `Market ${marketMakerId} is already running`);
        return true;
      }

      // Check max concurrent markets
      const config = this.engine.getConfig();
      if (this.markets.size >= config.maxConcurrentMarkets) {
        logger.warn("AI_MM", `Max concurrent markets (${config.maxConcurrentMarkets}) reached`);
        return false;
      }

      // Use provided object or load from database
      let maker = isFullObject ? makerOrId : null;
      if (!maker) {
        maker = await models.aiMarketMaker.findByPk(marketMakerId, {
          include: [
            {
              model: models.aiMarketMakerPool,
              as: "pool",
            },
            {
              model: models.ecosystemMarket,
              as: "market",
            },
            {
              model: models.aiBot,
              as: "bots",
              where: { status: "ACTIVE" },
              required: false,
            },
          ],
        });
      }

      if (!maker) {
        logger.error("AI_MM", `Market maker ${marketMakerId} not found`);
        return false;
      }

      if (!maker.market) {
        logger.error("AI_MM", `Ecosystem market not found for ${marketMakerId}`);
        return false;
      }

      // Check minimum liquidity requirement from centralized settings
      const cacheManager = CacheManager.getInstance();
      const minLiquidity = Number(await cacheManager.getSetting("aiMarketMakerMinLiquidity")) || 0;
      const quoteBalance = Number(maker.pool?.quoteCurrencyBalance || 0);

      if (minLiquidity > 0 && quoteBalance < minLiquidity) {
        const marketSymbol = `${maker.market.currency}/${maker.market.pair}`;
        logger.error("AI_MM", `Market ${marketSymbol} does not meet minimum liquidity requirement. Required: ${minLiquidity} ${maker.market.pair}, Pool quote balance: ${quoteBalance} ${maker.market.pair}`);
        return false;
      }

      // Create market instance
      const instance = new MarketInstance(this.engine, maker);
      await instance.initialize();

      this.markets.set(marketMakerId, instance);

      // Construct symbol from currency/pair
      const marketSymbol = `${maker.market.currency}/${maker.market.pair}`;

      logger.info("AI_MM", `Started market: ${marketSymbol || marketMakerId}`);

      // Log history with actual price and pool value
      const poolValue = maker.pool?.totalValueLocked || 0;
      await this.logMarketHistory(marketMakerId, "START", {
        symbol: marketSymbol,
        targetPrice: maker.targetPrice,
        realLiquidityPercent: maker.realLiquidityPercent,
      }, Number(maker.targetPrice), poolValue);

      return true;
    } catch (error) {
      logger.error("AI_MM", "Market start error", error);
      return false;
    }
  }

  /**
   * Stop a specific market
   */
  public async stopMarket(marketMakerId: string): Promise<boolean> {
    try {
      const instance = this.markets.get(marketMakerId);
      if (!instance) {
        logger.warn("AI_MM", `Market ${marketMakerId} is not running`);
        return true;
      }

      // Cancel all open orders before stopping
      await instance.cancelAllOrders();

      // Shutdown instance
      await instance.shutdown();

      this.markets.delete(marketMakerId);

      // Update database status
      await models.aiMarketMaker.update(
        { status: "STOPPED" },
        { where: { id: marketMakerId } }
      );

      logger.info("AI_MM", `Stopped market: ${marketMakerId}`);

      // Log history
      await this.logMarketHistory(marketMakerId, "STOP", {
        reason: "Manual stop",
      });

      return true;
    } catch (error) {
      logger.error("AI_MM", "Market stop error", error);
      return false;
    }
  }

  /**
   * Pause a market (keeps it loaded but stops trading)
   */
  public async pauseMarket(marketMakerId: string): Promise<boolean> {
    try {
      const instance = this.markets.get(marketMakerId);
      if (!instance) {
        logger.warn("AI_MM", `Market ${marketMakerId} is not running`);
        return false;
      }

      await instance.pause();

      // Update database status
      await models.aiMarketMaker.update(
        { status: "PAUSED" },
        { where: { id: marketMakerId } }
      );

      logger.info("AI_MM", `Paused market: ${marketMakerId}`);

      // Log history
      await this.logMarketHistory(marketMakerId, "PAUSE", {
        reason: "Manual pause",
      });

      return true;
    } catch (error) {
      logger.error("AI_MM", "Market pause error", error);
      return false;
    }
  }

  /**
   * Resume a paused market
   */
  public async resumeMarket(marketMakerId: string): Promise<boolean> {
    try {
      const instance = this.markets.get(marketMakerId);
      if (!instance) {
        // Try to start it fresh
        return this.startMarket(marketMakerId);
      }

      await instance.resume();

      // Update database status
      await models.aiMarketMaker.update(
        { status: "ACTIVE" },
        { where: { id: marketMakerId } }
      );

      logger.info("AI_MM", `Resumed market: ${marketMakerId}`);

      // Log history
      await this.logMarketHistory(marketMakerId, "RESUME", {});

      return true;
    } catch (error) {
      logger.error("AI_MM", "Market resume error", error);
      return false;
    }
  }

  /**
   * Stop all markets
   */
  public async stopAllMarkets(): Promise<void> {
    logger.info("AI_MM", `Stopping all ${this.markets.size} markets...`);

    const stopPromises = Array.from(this.markets.keys()).map((id) =>
      this.stopMarket(id)
    );

    await Promise.all(stopPromises);
  }

  /**
   * Emergency stop all markets immediately
   */
  public async emergencyStopAllMarkets(): Promise<void> {
    logger.error("AI_MM", `Emergency stopping all markets!`);

    for (const [id, instance] of this.markets) {
      try {
        await instance.emergencyStop();
      } catch (error) {
        logger.error("AI_MM", `Error emergency stopping market ${id}: ${error}`);
      }
    }

    this.markets.clear();

    // Update all markets in database
    await models.aiMarketMaker.update(
      { status: "STOPPED" },
      { where: { status: { [Op.in]: ["ACTIVE", "PAUSED"] } } }
    );
  }

  /**
   * Process all active markets (called on each tick)
   * Uses batched processing to prevent overwhelming system resources
   */
  public async processAllMarkets(): Promise<void> {
    // Collect markets to process
    const marketsToProcess: Array<{ id: string; instance: MarketInstance }> = [];

    for (const [marketId, instance] of this.markets) {
      // Skip if already processing
      if (this.processingMarkets.has(marketId)) {
        continue;
      }

      // Skip if paused
      if (instance.getStatus() === "PAUSED") {
        continue;
      }

      marketsToProcess.push({ id: marketId, instance });
    }

    // Process in batches to prevent resource exhaustion
    for (let i = 0; i < marketsToProcess.length; i += this.BATCH_SIZE) {
      const batch = marketsToProcess.slice(i, i + this.BATCH_SIZE);

      const batchPromises = batch.map(({ id, instance }) => {
        this.processingMarkets.add(id);

        return instance
          .process()
          .catch((error) => {
            logger.error("AI_MM", `Market process error for ${id}`, error);
          })
          .finally(() => {
            this.processingMarkets.delete(id);
          });
      });

      await Promise.all(batchPromises);

      // Small delay between batches to allow other operations to run
      if (i + this.BATCH_SIZE < marketsToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY_MS));
      }
    }
  }

  /**
   * Cleanup expired orders across all markets
   */
  public async cleanupExpiredOrders(): Promise<void> {
    for (const [, instance] of this.markets) {
      try {
        await instance.cleanupExpiredOrders();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Get market status
   */
  public getMarketStatus(marketMakerId: string): MarketStatus | null {
    const instance = this.markets.get(marketMakerId);
    if (!instance) {
      return null;
    }
    return instance.getStatus();
  }

  /**
   * Get number of active markets
   */
  public getActiveMarketCount(): number {
    return this.markets.size;
  }

  /**
   * Get all market IDs
   */
  public getMarketIds(): string[] {
    return Array.from(this.markets.keys());
  }

  /**
   * Get market instance
   */
  public getMarketInstance(marketMakerId: string): MarketInstance | undefined {
    return this.markets.get(marketMakerId);
  }

  /**
   * Refresh all markets by reloading their configuration from database
   * Used after daily volume resets to pick up new values
   */
  public async refreshAllMarkets(): Promise<void> {
    logger.info("AI_MM", "Refreshing all market configurations...");

    for (const [marketMakerId, instance] of this.markets) {
      try {
        // Load fresh config from database
        const makerData = await models.aiMarketMaker.findByPk(marketMakerId, {
          include: [
            { model: models.aiMarketMakerPool, as: "pool" },
            { model: models.ecosystemMarket, as: "market" },
            { model: models.aiBot, as: "bots" },
          ],
        });

        if (makerData) {
          // Update the instance's configuration
          instance.updateConfig(makerData);
          logger.info("AI_MM", `Refreshed config for market ${marketMakerId}`);
        }
      } catch (error) {
        logger.error("AI_MM", `Market refresh error for ${marketMakerId}`, error);
      }
    }
  }

  /**
   * Check if a market is active in the engine
   */
  public isMarketActive(marketMakerId: string): boolean {
    return this.markets.has(marketMakerId);
  }

  /**
   * Log market history event
   */
  private async logMarketHistory(
    marketMakerId: string,
    action: string,
    details: any,
    priceAtAction: number = 0,
    poolValueAtAction: number = 0
  ): Promise<void> {
    try {
      await models.aiMarketMakerHistory.create({
        marketMakerId,
        action,
        details,
        priceAtAction,
        poolValueAtAction,
      });
    } catch (error) {
      // Ignore history logging errors
    }
  }
}

export default MarketManager;
