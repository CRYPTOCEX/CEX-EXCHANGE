import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";
import { logger } from "@b/utils/console";
import { initializeAiMarketMakerTables } from "../scylla/client";
import { MarketManager } from "./MarketManager";
import { StrategyManager } from "./strategies/StrategyManager";
import { RiskManager } from "./risk/RiskManager";
import { PoolManager } from "./pool/PoolManager";
import { CacheManager } from "@b/utils/cache";

const redis = RedisSingleton.getInstance();

// Engine status types
export type EngineStatus = "STOPPED" | "STARTING" | "RUNNING" | "STOPPING" | "ERROR";

// Engine configuration
export interface EngineConfig {
  tickIntervalMs: number; // How often to run the main loop
  maxConcurrentMarkets: number; // Max markets to run at once
  enableRealLiquidity: boolean; // Global toggle for real liquidity
  emergencyStopEnabled: boolean; // Emergency stop capability
}

// Default configuration
const DEFAULT_CONFIG: EngineConfig = {
  tickIntervalMs: 1000, // 1 second
  maxConcurrentMarkets: 10,
  enableRealLiquidity: true,
  emergencyStopEnabled: true,
};

/**
 * MarketMakerEngine - Main orchestrator for AI market making
 *
 * This is a singleton class that manages all AI market making operations.
 * It coordinates between:
 * - MarketManager: Manages individual market instances
 * - StrategyManager: Handles price movement strategies
 * - RiskManager: Monitors and controls risk
 * - PoolManager: Manages liquidity pools
 */
class MarketMakerEngine {
  private static instance: MarketMakerEngine;

  private status: EngineStatus = "STOPPED";
  private config: EngineConfig = DEFAULT_CONFIG;
  private tickInterval: NodeJS.Timeout | null = null;
  private lastTickTime: Date | null = null;
  private tickCount: number = 0;
  private errorCount: number = 0;
  private startTime: Date | null = null;

  // Sub-managers
  private marketManager: MarketManager | null = null;
  private strategyManager: StrategyManager | null = null;
  private riskManager: RiskManager | null = null;
  private poolManager: PoolManager | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): MarketMakerEngine {
    if (!MarketMakerEngine.instance) {
      MarketMakerEngine.instance = new MarketMakerEngine();
    }
    return MarketMakerEngine.instance;
  }

  /**
   * Initialize the engine
   * Sets up all sub-managers and prepares for operation
   * Silent initialization - no console output (runs during startup via cron)
   */
  public async initialize(config?: Partial<EngineConfig>): Promise<void> {
    if (this.status !== "STOPPED") {
      return;
    }

    this.status = "STARTING";

    try {
      // Merge configuration
      this.config = { ...DEFAULT_CONFIG, ...config };

      // Initialize Scylla tables
      await initializeAiMarketMakerTables();

      // Load global settings from database
      await this.loadGlobalSettings();

      // Initialize sub-managers
      this.marketManager = new MarketManager(this);
      this.strategyManager = new StrategyManager();
      this.riskManager = new RiskManager(this);
      this.poolManager = new PoolManager();

      // Load active markets
      await this.marketManager.loadActiveMarkets();

      this.status = "RUNNING";
      this.startTime = new Date();
      this.errorCount = 0;

      // Start the main tick loop
      this.startTickLoop();

      // Publish status to Redis for monitoring
      await this.publishStatus();
    } catch (error) {
      this.status = "ERROR";
      logger.error("AI_MM", "Failed to initialize engine", error);
      throw error;
    }
  }

  /**
   * Shutdown the engine gracefully
   */
  public async shutdown(): Promise<void> {
    if (this.status === "STOPPED") {
      logger.warn("AI_MM", "Engine is already stopped");
      return;
    }

    this.status = "STOPPING";
    logger.warn("AI_MM", "Shutting down Market Maker Engine...");

    try {
      // Stop the tick loop
      this.stopTickLoop();

      // Stop all active markets
      if (this.marketManager) {
        await this.marketManager.stopAllMarkets();
      }

      // Cleanup sub-managers
      this.marketManager = null;
      this.strategyManager = null;
      this.riskManager = null;
      this.poolManager = null;

      this.status = "STOPPED";
      this.startTime = null;

      logger.success("AI_MM", "Market Maker Engine shut down successfully");

      // Publish final status
      await this.publishStatus();
    } catch (error) {
      this.status = "ERROR";
      logger.error("AI_MM", "Failed to shutdown Market Maker Engine", error);
      throw error;
    }
  }

  /**
   * Emergency stop - immediately halt all trading
   */
  public async emergencyStop(): Promise<void> {
    logger.error("AI_MM", "EMERGENCY STOP TRIGGERED");

    this.stopTickLoop();

    if (this.marketManager) {
      await this.marketManager.emergencyStopAllMarkets();
    }

    this.status = "STOPPED";

    // Log emergency stop
    await this.logHistory("EMERGENCY_STOP", {
      reason: "Manual emergency stop triggered",
      timestamp: new Date().toISOString(),
    });

    await this.publishStatus();
  }

  /**
   * Get current engine status
   */
  public getStatus(): {
    status: EngineStatus;
    uptime: number | null;
    tickCount: number;
    errorCount: number;
    activeMarkets: number;
    config: EngineConfig;
  } {
    return {
      status: this.status,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : null,
      tickCount: this.tickCount,
      errorCount: this.errorCount,
      activeMarkets: this.marketManager?.getActiveMarketCount() || 0,
      config: this.config,
    };
  }

  /**
   * Get sub-managers for external access
   */
  public getMarketManager(): MarketManager | null {
    return this.marketManager;
  }

  public getStrategyManager(): StrategyManager | null {
    return this.strategyManager;
  }

  public getRiskManager(): RiskManager | null {
    return this.riskManager;
  }

  public getPoolManager(): PoolManager | null {
    return this.poolManager;
  }

  /**
   * Get configuration
   */
  public getConfig(): EngineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (requires restart for some settings)
   */
  public updateConfig(newConfig: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info("AI_MM", `Configuration updated: ${JSON.stringify(this.config)}`);
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Load global settings from database
   */
  private async loadGlobalSettings(): Promise<void> {
    try {
      const cacheManager = CacheManager.getInstance();

      // Load settings from centralized settings table
      const [
        maxConcurrentBots,
        tradingEnabled,
        maintenanceMode,
        globalPauseEnabled,
      ] = await Promise.all([
        cacheManager.getSetting("aiMarketMakerMaxConcurrentBots"),
        cacheManager.getSetting("aiMarketMakerEnabled"),
        cacheManager.getSetting("aiMarketMakerMaintenanceMode"),
        cacheManager.getSetting("aiMarketMakerGlobalPauseEnabled"),
      ]);

      this.config.maxConcurrentMarkets = maxConcurrentBots || 50;
      this.config.enableRealLiquidity = tradingEnabled !== false;

      if (maintenanceMode || globalPauseEnabled) {
        logger.warn("AI_MM", "Global pause or maintenance mode is enabled");
      }
    } catch (error) {
      logger.error("AI_MM", "Failed to load global settings", error);
    }
  }

  /**
   * Start the main tick loop
   */
  private startTickLoop(): void {
    if (this.tickInterval) {
      return;
    }

    this.tickInterval = setInterval(async () => {
      await this.tick();
    }, this.config.tickIntervalMs);
    // Note: Tick loop start is logged by caller in groupItem during initialization
  }

  /**
   * Stop the tick loop
   */
  private stopTickLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
      logger.info("AI_MM", "Tick loop stopped");
    }
  }

  // Track if a tick is in progress to prevent overlapping executions
  private tickInProgress: boolean = false;
  private consecutiveSlowTicks: number = 0;
  private readonly MAX_TICK_DURATION_MS = 5000; // 5 seconds max per tick

  /**
   * Main tick - called every tickIntervalMs
   * This is where the magic happens
   */
  private async tick(): Promise<void> {
    if (this.status !== "RUNNING") {
      return;
    }

    // Prevent overlapping ticks which can cause resource exhaustion
    if (this.tickInProgress) {
      this.consecutiveSlowTicks++;
      if (this.consecutiveSlowTicks > 10) {
        logger.warn("AI_MM", `Warning: ${this.consecutiveSlowTicks} consecutive slow ticks detected`);
      }
      return;
    }

    this.tickInProgress = true;
    const tickStart = Date.now();

    this.tickCount++;
    this.lastTickTime = new Date();

    // Debug logging every 30 ticks in dev mode
    if (process.env.NODE_ENV === "development" && this.tickCount % 30 === 0) {
      logger.debug("AI_MM", `Tick #${this.tickCount} | Markets: ${this.marketManager?.getActiveMarketCount() || 0} | Errors: ${this.errorCount}`);
    }

    try {
      // Check global risk conditions
      if (this.riskManager) {
        const riskCheck = await this.riskManager.checkGlobalRisk();
        if (!riskCheck.canTrade) {
          if (this.tickCount % 60 === 0) {
            logger.warn("AI_MM", `Trading paused: ${riskCheck.reason}`);
          }
          return;
        }
      }

      // Process all active markets with timeout protection
      if (this.marketManager) {
        const processPromise = this.marketManager.processAllMarkets();
        const timeoutPromise = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Market processing timeout")), this.MAX_TICK_DURATION_MS)
        );

        await Promise.race([processPromise, timeoutPromise]);
      }

      // Periodic tasks (every 60 ticks / ~1 minute)
      if (this.tickCount % 60 === 0) {
        await this.performPeriodicTasks();
      }

      // Reset slow tick counter on successful completion
      this.consecutiveSlowTicks = 0;
    } catch (error: any) {
      this.errorCount++;

      if (error?.message === "Market processing timeout") {
        logger.error("AI_MM", `Tick timeout - processing took > ${this.MAX_TICK_DURATION_MS}ms`);
      } else {
        logger.error("AI_MM", "Tick processing error", error);
      }

      // If too many errors, trigger emergency stop
      if (this.errorCount > 100 && this.config.emergencyStopEnabled) {
        await this.emergencyStop();
      }
    } finally {
      this.tickInProgress = false;

      // Log slow ticks
      const tickDuration = Date.now() - tickStart;
      if (tickDuration > this.config.tickIntervalMs * 2) {
        logger.warn("AI_MM", `Slow tick detected: ${tickDuration}ms (expected < ${this.config.tickIntervalMs}ms)`);
      }
    }
  }

  /**
   * Perform periodic maintenance tasks
   */
  private async performPeriodicTasks(): Promise<void> {
    // Check for daily volume reset (at midnight UTC)
    await this.checkDailyVolumeReset();

    // Update pool balances
    if (this.poolManager) {
      await this.poolManager.updateAllBalances();
    }

    // Check for expired orders
    if (this.marketManager) {
      await this.marketManager.cleanupExpiredOrders();
    }

    // Publish status to Redis
    await this.publishStatus();
  }

  /**
   * Check if we need to reset daily volumes (at midnight UTC)
   */
  private async checkDailyVolumeReset(): Promise<void> {
    try {
      const now = new Date();
      const lastResetKey = "ai_market_maker:last_daily_reset";

      // Get last reset date from Redis
      const lastResetStr = await redis.get(lastResetKey);
      const lastResetDate = lastResetStr ? new Date(lastResetStr) : null;

      // Check if it's a new day (UTC)
      const today = now.toISOString().split("T")[0];
      const lastResetDay = lastResetDate?.toISOString().split("T")[0];

      if (lastResetDay !== today) {
        logger.info("AI_MM", "Performing daily volume reset...");

        // Reset all market maker daily volumes
        await models.aiMarketMaker.update(
          { currentDailyVolume: 0 },
          { where: {} }
        );

        // Reset all bot daily trade counts
        await models.aiBot.update(
          { dailyTradeCount: 0 },
          { where: {} }
        );

        // Refresh market instances to pick up the reset values
        if (this.marketManager) {
          await this.marketManager.refreshAllMarkets();
        }

        // Update last reset timestamp
        await redis.set(lastResetKey, now.toISOString());

        logger.info("AI_MM", "Daily volume reset complete");

        // Log the reset
        await this.logHistory("DAILY_RESET", {
          resetDate: today,
          timestamp: now.toISOString(),
        });
      }
    } catch (error) {
      logger.error("AI_MM", "Failed to check daily volume reset", error);
    }
  }

  /**
   * Publish engine status to Redis for monitoring
   */
  private async publishStatus(): Promise<void> {
    try {
      const status = this.getStatus();
      await redis.set(
        "ai_market_maker:engine:status",
        JSON.stringify(status),
        "EX",
        60 // Expire after 60 seconds
      );
    } catch (error) {
      // Ignore Redis errors for status publishing
    }
  }

  /**
   * Log history event
   */
  private async logHistory(action: string, details: any): Promise<void> {
    try {
      // This will be logged to a global history table
      logger.info("AI_MM", `History: ${action} - ${JSON.stringify(details)}`);
    } catch (error) {
      // Ignore history logging errors
    }
  }
}

// Export singleton instance
export default MarketMakerEngine.getInstance();

// Also export class for type purposes
export { MarketMakerEngine };
