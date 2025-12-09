import { models } from "@b/db";
import { logError } from "../logger";
import { broadcastStatus, broadcastProgress, broadcastLog } from "./broadcast";
import { getAiMarketMakerEngine } from "../safe-imports";
import { CacheManager } from "../cache";

/**
 * AI Market Maker Engine Loop
 *
 * This cron job manages the AI market maker engine lifecycle.
 * The actual trading logic is handled by the MarketMakerEngine singleton.
 *
 * Run frequency: Every 5 seconds (configured in cron.ts)
 */

// Track if we've initialized the engine
let engineInitialized = false;

// Prevent overlapping cron executions which can cause resource exhaustion
let cronInProgress = false;
let lastExecutionTime = 0;
const MIN_EXECUTION_INTERVAL_MS = 4000; // Minimum 4 seconds between executions

export async function processAiMarketMakerEngine() {
  const cronName = "processAiMarketMakerEngine";
  const startTime = Date.now();

  // Prevent overlapping executions
  if (cronInProgress) {
    broadcastLog(cronName, "Previous execution still in progress, skipping", "info");
    return;
  }

  // Prevent too frequent executions
  if (startTime - lastExecutionTime < MIN_EXECUTION_INTERVAL_MS) {
    return;
  }

  cronInProgress = true;
  lastExecutionTime = startTime;

  try {
    broadcastStatus(cronName, "running");

    // Get the AI Market Maker Engine (safe import)
    const MarketMakerEngine = await getAiMarketMakerEngine();
    if (!MarketMakerEngine) {
      broadcastLog(cronName, "AI Market Maker addon not available", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    // Check global settings from centralized settings store
    const settings = await getGlobalSettings();

    // Check if trading is enabled
    if (!settings.tradingEnabled) {
      // If engine is running, shut it down
      if (engineInitialized) {
        if (MarketMakerEngine.getStatus().status === "RUNNING") {
          broadcastLog(cronName, "AI Market Maker disabled, shutting down engine", "warning");
          await MarketMakerEngine.shutdown();
          engineInitialized = false;
        }
      }
      broadcastLog(cronName, "AI Market Maker is disabled globally", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    // Check for maintenance mode
    if (settings.maintenanceMode) {
      if (engineInitialized) {
        if (MarketMakerEngine.getStatus().status === "RUNNING") {
          broadcastLog(cronName, "Maintenance mode, shutting down engine", "warning");
          await MarketMakerEngine.shutdown();
          engineInitialized = false;
        }
      }
      broadcastLog(cronName, "AI Market Maker is in maintenance mode", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    // Check global pause
    if (settings.globalPauseEnabled) {
      broadcastLog(cronName, "AI Market Maker is globally paused", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    // Initialize engine if not already done
    const engineStatus = MarketMakerEngine.getStatus();

    if (!engineInitialized || engineStatus.status === "STOPPED") {
      broadcastLog(cronName, "Initializing AI Market Maker Engine...", "info");
      try {
        await MarketMakerEngine.initialize({
          tickIntervalMs: 1000, // 1 second tick
          maxConcurrentMarkets: settings.maxConcurrentBots || 50,
          enableRealLiquidity: true,
          emergencyStopEnabled: true,
        });
        engineInitialized = true;
        broadcastLog(cronName, "AI Market Maker Engine initialized successfully", "success");
      } catch (initError: any) {
        logError("processAiMarketMakerEngine - init", initError, __filename);
        broadcastLog(cronName, `Failed to initialize engine: ${initError.message}`, "error");
        broadcastStatus(cronName, "failed");
        return;
      }
    }

    // Engine is running, report status
    const status = MarketMakerEngine.getStatus();
    broadcastLog(
      cronName,
      `Engine running: ${status.activeMarkets} markets, ${status.tickCount} ticks, ${status.errorCount} errors`,
      "info"
    );

    // Check for any markets that need to be started/stopped
    await syncMarketStatuses(MarketMakerEngine);

    broadcastProgress(cronName, 100);
    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
  } catch (error: any) {
    logError("processAiMarketMakerEngine", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(cronName, `AI Market Maker Engine failed: ${error.message}`, "error");
  } finally {
    cronInProgress = false;
  }
}

/**
 * Sync market statuses between database and engine
 */
async function syncMarketStatuses(engine: any) {
  const cronName = "processAiMarketMakerEngine";
  const marketManager = engine.getMarketManager();
  if (!marketManager) return;

  try {
    // Get all market makers from database
    const marketMakers = await models.aiMarketMaker.findAll({
      include: [
        { model: models.aiMarketMakerPool, as: "pool" },
        { model: models.ecosystemMarket, as: "market" },
        { model: models.aiBot, as: "bots" },
      ],
    });

    for (const maker of marketMakers) {
      const makerAny = maker as any;
      const isRunningInEngine = marketManager.isMarketActive(makerAny.id);

      if (makerAny.status === "ACTIVE" && !isRunningInEngine) {
        // Market should be running but isn't - start it
        broadcastLog(cronName, `Starting market ${makerAny.market?.symbol || makerAny.id}`, "info");
        await marketManager.startMarket(makerAny);
      } else if (makerAny.status === "STOPPED" && isRunningInEngine) {
        // Market is explicitly STOPPED but still running in engine - stop it
        // Note: PAUSED markets should remain in engine (paused but loaded)
        broadcastLog(cronName, `Stopping market ${makerAny.market?.symbol || makerAny.id}`, "info");
        await marketManager.stopMarket(makerAny.id);
      }
      // PAUSED status with isRunningInEngine=true is intentional - market stays loaded but paused
    }
  } catch (error: any) {
    logError("syncMarketStatuses", error, __filename);
    broadcastLog(cronName, `Failed to sync market statuses: ${error.message}`, "error");
  }
}

/**
 * Get global AI market maker settings from centralized settings store
 */
async function getGlobalSettings() {
  try {
    const cacheManager = CacheManager.getInstance();

    const [
      tradingEnabled,
      globalPauseEnabled,
      maintenanceMode,
      maxConcurrentBots,
    ] = await Promise.all([
      cacheManager.getSetting("aiMarketMakerEnabled"),
      cacheManager.getSetting("aiMarketMakerGlobalPauseEnabled"),
      cacheManager.getSetting("aiMarketMakerMaintenanceMode"),
      cacheManager.getSetting("aiMarketMakerMaxConcurrentBots"),
    ]);

    return {
      tradingEnabled: tradingEnabled !== false,
      globalPauseEnabled: globalPauseEnabled === true,
      maintenanceMode: maintenanceMode === true,
      maxConcurrentBots: maxConcurrentBots || 50,
    };
  } catch (error) {
    logError("getGlobalSettings", error, __filename);
    // Return safe defaults
    return {
      tradingEnabled: true,
      globalPauseEnabled: false,
      maintenanceMode: false,
      maxConcurrentBots: 50,
    };
  }
}
