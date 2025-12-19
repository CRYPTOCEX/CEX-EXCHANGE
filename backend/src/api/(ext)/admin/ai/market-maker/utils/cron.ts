import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { logger } from "@b/utils/console";
import { broadcastStatus, broadcastProgress, broadcastLog } from "@b/cron/broadcast";
import { CacheManager } from "@b/utils/cache";
import ExchangeManager from "@b/utils/exchange";

// Direct import from same addon - MarketMakerEngine
import MarketMakerEngine from "./engine/MarketMakerEngine";

// =============================================================================
// AI Market Maker Engine Loop
// =============================================================================

let engineInitialized = false;
let cronInProgress = false;
let lastExecutionTime = 0;
const MIN_EXECUTION_INTERVAL_MS = 4000;

export async function processAiMarketMakerEngine() {
  const cronName = "processAiMarketMakerEngine";
  const startTime = Date.now();

  if (cronInProgress) {
    broadcastLog(cronName, "Previous execution still in progress, skipping", "info");
    return;
  }

  if (startTime - lastExecutionTime < MIN_EXECUTION_INTERVAL_MS) {
    return;
  }

  cronInProgress = true;
  lastExecutionTime = startTime;

  try {
    broadcastStatus(cronName, "running");

    const settings = await getGlobalSettings();

    if (!settings.tradingEnabled) {
      if (engineInitialized && MarketMakerEngine.getStatus().status === "RUNNING") {
        broadcastLog(cronName, "AI Market Maker disabled, shutting down engine", "warning");
        await MarketMakerEngine.shutdown();
        engineInitialized = false;
      }
      broadcastLog(cronName, "AI Market Maker is disabled globally", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    if (settings.maintenanceMode) {
      if (engineInitialized && MarketMakerEngine.getStatus().status === "RUNNING") {
        broadcastLog(cronName, "Maintenance mode, shutting down engine", "warning");
        await MarketMakerEngine.shutdown();
        engineInitialized = false;
      }
      broadcastLog(cronName, "AI Market Maker is in maintenance mode", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    if (settings.globalPauseEnabled) {
      broadcastLog(cronName, "AI Market Maker is globally paused", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    const engineStatus = MarketMakerEngine.getStatus();

    if (!engineInitialized || engineStatus.status === "STOPPED") {
      broadcastLog(cronName, "Initializing AI Market Maker Engine...", "info");
      try {
        await MarketMakerEngine.initialize({
          tickIntervalMs: 1000,
          maxConcurrentMarkets: settings.maxConcurrentBots || 50,
          enableRealLiquidity: true,
          emergencyStopEnabled: true,
        });
        engineInitialized = true;
        broadcastLog(cronName, "AI Market Maker Engine initialized successfully", "success");
      } catch (initError: any) {
        logger.error("AI_MARKET_MAKER", "Failed to initialize engine", initError);
        broadcastLog(cronName, `Failed to initialize engine: ${initError.message}`, "error");
        broadcastStatus(cronName, "failed");
        return;
      }
    }

    const status = MarketMakerEngine.getStatus();
    broadcastLog(
      cronName,
      `Engine running: ${status.activeMarkets} markets, ${status.tickCount} ticks, ${status.errorCount} errors`,
      "info"
    );

    await syncMarketStatuses(MarketMakerEngine);

    broadcastProgress(cronName, 100);
    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
  } catch (error: any) {
    logger.error("AI_MARKET_MAKER", "AI Market Maker Engine failed", error);
    broadcastStatus(cronName, "failed");
    broadcastLog(cronName, `AI Market Maker Engine failed: ${error.message}`, "error");
  } finally {
    cronInProgress = false;
  }
}

async function syncMarketStatuses(engine: any) {
  const cronName = "processAiMarketMakerEngine";
  const marketManager = engine.getMarketManager();
  if (!marketManager) return;

  try {
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
        broadcastLog(cronName, `Starting market ${makerAny.market?.symbol || makerAny.id}`, "info");
        await marketManager.startMarket(makerAny);
      } else if (makerAny.status === "STOPPED" && isRunningInEngine) {
        broadcastLog(cronName, `Stopping market ${makerAny.market?.symbol || makerAny.id}`, "info");
        await marketManager.stopMarket(makerAny.id);
      }
    }
  } catch (error: any) {
    logger.error("AI_MARKET_MAKER", "Failed to sync market statuses", error);
    broadcastLog(cronName, `Failed to sync market statuses: ${error.message}`, "error");
  }
}

async function getGlobalSettings() {
  try {
    const cacheManager = CacheManager.getInstance();

    const [tradingEnabled, globalPauseEnabled, maintenanceMode, maxConcurrentBots] = await Promise.all([
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
    logger.error("AI_SETTINGS", "Failed to get global settings", error);
    return {
      tradingEnabled: true,
      globalPauseEnabled: false,
      maintenanceMode: false,
      maxConcurrentBots: 50,
    };
  }
}

// =============================================================================
// AI Risk Monitor
// =============================================================================

export async function processAiRiskMonitor() {
  const cronName = "processAiRiskMonitor";
  const startTime = Date.now();

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting AI Risk Monitor check");

    const settings = await getAiMarketMakerSettings();
    if (!settings.tradingEnabled) {
      broadcastLog(cronName, "AI Market Maker disabled, skipping risk check", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    const activeMarkets = await models.aiMarketMaker.findAll({
      where: { status: { [Op.in]: ["ACTIVE", "PAUSED"] } },
      include: [
        { model: models.aiMarketMakerPool, as: "pool" },
        { model: models.ecosystemMarket, as: "market" },
      ],
    });

    const total = activeMarkets.length;
    if (total === 0) {
      broadcastLog(cronName, "No active markets to monitor", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    broadcastLog(cronName, `Monitoring ${total} markets for risk`);

    const alerts: string[] = [];

    for (let i = 0; i < total; i++) {
      const market = activeMarkets[i];
      try {
        const marketAlerts = await checkMarketRisk(market, settings);
        alerts.push(...marketAlerts);
      } catch (error: any) {
        logger.error("AI_RISK_MONITOR", `Failed to check risk for market ${market.id}`, error);
      }

      const progress = Math.round(((i + 1) / total) * 100);
      broadcastProgress(cronName, progress);
    }

    if (alerts.length > 0) {
      broadcastLog(cronName, `Risk alerts found: ${alerts.length}`, "warning");
      for (const alert of alerts) {
        broadcastLog(cronName, alert, "warning");
      }
    }

    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    broadcastLog(cronName, `AI Risk Monitor completed in ${Date.now() - startTime}ms`, "success");
  } catch (error: any) {
    logger.error("AI_RISK_MONITOR", "AI Risk Monitor failed", error);
    broadcastStatus(cronName, "failed");
    broadcastLog(cronName, `AI Risk Monitor failed: ${error.message}`, "error");
    throw error;
  }
}

async function checkMarketRisk(market: any, settings: any): Promise<string[]> {
  const alerts: string[] = [];
  const pool = market.pool;
  const symbol = market.market?.symbol || market.id;

  if (market.volatilityPauseEnabled) {
    const volatility = await calculateVolatility(market.id);
    const threshold = market.volatilityThreshold || settings.defaultVolatilityThreshold;

    if (volatility > threshold) {
      alerts.push(`High volatility detected for ${symbol}: ${volatility.toFixed(2)}% (threshold: ${threshold}%)`);
      if (market.status === "ACTIVE") {
        await pauseMarketForVolatility(market);
        alerts.push(`Market ${symbol} auto-paused due to high volatility`);
      }
    }
  }

  if (pool) {
    const dailyPnL = await calculateDailyPnL(market.id);
    const tvl = Number(pool.totalValueLocked) || 1;
    const lossPercent = (dailyPnL / tvl) * -100;

    if (lossPercent > settings.maxDailyLossPercent) {
      alerts.push(`Daily loss limit exceeded for ${symbol}: ${lossPercent.toFixed(2)}%`);
      if (market.status === "ACTIVE") {
        await pauseMarketForLoss(market, lossPercent);
        alerts.push(`Market ${symbol} auto-paused due to daily loss limit`);
      }
    }
  }

  if (market.status === "ACTIVE") {
    const lastTradeTime = await getLastTradeTime(market.id);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (lastTradeTime && lastTradeTime < hourAgo) {
      alerts.push(`Market ${symbol} has been inactive for over an hour`);
    }
  }

  if (pool) {
    const baseValue = Number(pool.baseBalance) * Number(market.targetPrice);
    const quoteValue = Number(pool.quoteBalance);
    const tvl = baseValue + quoteValue;

    if (tvl > 0) {
      const baseRatio = baseValue / tvl;
      if (baseRatio < 0.1 || baseRatio > 0.9) {
        alerts.push(`Pool imbalance detected for ${symbol}: Base ${(baseRatio * 100).toFixed(1)}%`);
      }
    }
  }

  if (pool && Number(pool.totalValueLocked) < settings.minLiquidity) {
    alerts.push(`Low liquidity warning for ${symbol}: ${Number(pool.totalValueLocked).toFixed(2)}`);
  }

  return alerts;
}

async function calculateVolatility(marketMakerId: string): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentHistory = await models.aiMarketMakerHistory.findAll({
      where: {
        marketMakerId,
        action: { [Op.in]: ["TRADE", "TARGET_CHANGE"] },
        createdAt: { [Op.gte]: oneHourAgo },
      },
      order: [["createdAt", "ASC"]],
    });

    if (recentHistory.length < 2) return 0;

    const prices = recentHistory.map((h: any) => Number(h.priceAtAction));
    const returns: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    if (returns.length === 0) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(365 * 24) * 100;
  } catch (error) {
    logger.error("AI_MM", "Failed to calculate volatility", error);
    return 0;
  }
}

async function calculateDailyPnL(marketMakerId: string): Promise<number> {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const trades = await models.aiMarketMakerHistory.findAll({
      where: {
        marketMakerId,
        action: "TRADE",
        createdAt: { [Op.gte]: startOfDay },
      },
    });

    return trades.reduce((sum: number, t: any) => sum + (t.details?.pnl || 0), 0);
  } catch (error) {
    logger.error("AI_MM", "Failed to calculate daily PnL", error);
    return 0;
  }
}

async function getLastTradeTime(marketMakerId: string): Promise<Date | null> {
  try {
    const lastTrade = await models.aiMarketMakerHistory.findOne({
      where: { marketMakerId, action: "TRADE" },
      order: [["createdAt", "DESC"]],
    });
    return lastTrade ? (lastTrade as any).createdAt : null;
  } catch (error) {
    logger.error("AI_MM", "Failed to get last trade time", error);
    return null;
  }
}

async function pauseMarketForVolatility(market: any) {
  try {
    await models.aiMarketMaker.update({ status: "PAUSED" }, { where: { id: market.id } });
    await models.aiBot.update({ status: "PAUSED" }, { where: { marketMakerId: market.id, status: "ACTIVE" } });
    await models.aiMarketMakerHistory.create({
      marketMakerId: market.id,
      action: "AUTO_PAUSE",
      details: { reason: "HIGH_VOLATILITY", message: "Market automatically paused due to high volatility" },
      priceAtAction: market.targetPrice,
      poolValueAtAction: Number(market.pool?.totalValueLocked || 0),
    });
  } catch (error) {
    logger.error("AI_MM", "Failed to pause market for volatility", error);
  }
}

async function pauseMarketForLoss(market: any, lossPercent: number) {
  try {
    await models.aiMarketMaker.update({ status: "PAUSED" }, { where: { id: market.id } });
    await models.aiBot.update({ status: "PAUSED" }, { where: { marketMakerId: market.id, status: "ACTIVE" } });
    await models.aiMarketMakerHistory.create({
      marketMakerId: market.id,
      action: "AUTO_PAUSE",
      details: { reason: "DAILY_LOSS_LIMIT", message: `Market paused due to daily loss limit (${lossPercent.toFixed(2)}%)`, lossPercent },
      priceAtAction: market.targetPrice,
      poolValueAtAction: Number(market.pool?.totalValueLocked || 0),
    });
  } catch (error) {
    logger.error("AI_MM", "Failed to pause market for loss", error);
  }
}

async function getAiMarketMakerSettings() {
  try {
    const cacheManager = CacheManager.getInstance();

    const [tradingEnabled, maxDailyLossPercent, defaultVolatilityThreshold, minLiquidity, stopLossEnabled] = await Promise.all([
      cacheManager.getSetting("aiMarketMakerEnabled"),
      cacheManager.getSetting("aiMarketMakerMaxDailyLossPercent"),
      cacheManager.getSetting("aiMarketMakerDefaultVolatilityThreshold"),
      cacheManager.getSetting("aiMarketMakerMinLiquidity"),
      cacheManager.getSetting("aiMarketMakerStopLossEnabled"),
    ]);

    return {
      tradingEnabled: tradingEnabled !== false,
      maxDailyLossPercent: maxDailyLossPercent || 5,
      defaultVolatilityThreshold: defaultVolatilityThreshold || 10,
      minLiquidity: minLiquidity || 100,
      stopLossEnabled: stopLossEnabled !== false,
    };
  } catch (error) {
    logger.error("AI_MM", "Failed to get AI market maker settings", error);
    return { tradingEnabled: true, maxDailyLossPercent: 5, defaultVolatilityThreshold: 10, minLiquidity: 100, stopLossEnabled: true };
  }
}

// =============================================================================
// AI Pool Rebalancer
// =============================================================================

const MIN_RATIO_THRESHOLD = 0.2;
const MAX_RATIO_THRESHOLD = 0.8;
const TARGET_RATIO = 0.5;

export async function processAiPoolRebalancer() {
  const cronName = "processAiPoolRebalancer";
  const startTime = Date.now();

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting AI Pool Rebalancer");

    const cacheManager = CacheManager.getInstance();
    const tradingEnabled = await cacheManager.getSetting("aiMarketMakerEnabled");
    if (tradingEnabled === false) {
      broadcastLog(cronName, "AI Market Maker disabled, skipping rebalance", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    const marketsWithPools = await models.aiMarketMaker.findAll({
      where: { status: { [Op.in]: ["ACTIVE", "PAUSED"] } },
      include: [
        { model: models.aiMarketMakerPool, as: "pool" },
        { model: models.ecosystemMarket, as: "market" },
      ],
    });

    const total = marketsWithPools.length;
    if (total === 0) {
      broadcastLog(cronName, "No markets with pools to check", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    broadcastLog(cronName, `Checking ${total} pools for rebalancing`);

    let rebalancedCount = 0;

    for (let i = 0; i < total; i++) {
      const market = marketsWithPools[i];
      const pool = market.pool;

      if (!pool) continue;

      try {
        if (checkPoolNeedsRebalance(market, pool)) {
          await rebalancePool(market, pool);
          rebalancedCount++;
        }
      } catch (error: any) {
        logger.error("AI_REBALANCER", `Failed to rebalance pool ${pool.id}`, error);
      }

      broadcastProgress(cronName, Math.round(((i + 1) / total) * 100));
    }

    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    broadcastLog(cronName, `AI Pool Rebalancer completed. Rebalanced ${rebalancedCount} pools`, "success");
  } catch (error: any) {
    logger.error("AI_REBALANCER", "AI Pool Rebalancer failed", error);
    broadcastStatus(cronName, "failed");
    throw error;
  }
}

function checkPoolNeedsRebalance(market: any, pool: any): boolean {
  const baseBalance = Number(pool.baseBalance) || 0;
  const quoteBalance = Number(pool.quoteBalance) || 0;
  const targetPrice = Number(market.targetPrice) || 1;

  const baseValue = baseBalance * targetPrice;
  const quoteValue = quoteBalance;
  const totalValue = baseValue + quoteValue;

  if (totalValue <= 0) return false;

  const baseRatio = baseValue / totalValue;
  return baseRatio < MIN_RATIO_THRESHOLD || baseRatio > MAX_RATIO_THRESHOLD;
}

async function rebalancePool(market: any, pool: any) {
  const cronName = "processAiPoolRebalancer";
  const symbol = market.market?.symbol || market.id;

  const baseBalance = Number(pool.baseBalance) || 0;
  const quoteBalance = Number(pool.quoteBalance) || 0;
  const targetPrice = Number(market.targetPrice) || 1;

  const baseValue = baseBalance * targetPrice;
  const quoteValue = quoteBalance;
  const totalValue = baseValue + quoteValue;

  if (totalValue <= 0) return;

  const currentBaseRatio = baseValue / totalValue;
  const targetBaseValue = totalValue * TARGET_RATIO;
  const targetQuoteValue = totalValue * (1 - TARGET_RATIO);
  const targetBaseBalance = targetBaseValue / targetPrice;
  const targetQuoteBalance = targetQuoteValue;

  broadcastLog(cronName, `Rebalancing ${symbol}: Base ${(currentBaseRatio * 100).toFixed(1)}% -> ${(TARGET_RATIO * 100).toFixed(1)}%`);

  await models.aiMarketMakerPool.update(
    { baseBalance: targetBaseBalance, quoteBalance: targetQuoteBalance, lastRebalanceAt: new Date() },
    { where: { id: pool.id } }
  );

  await models.aiMarketMakerHistory.create({
    marketMakerId: market.id,
    action: "REBALANCE",
    details: {
      reason: "AUTO_REBALANCE",
      previousBaseBalance: baseBalance,
      previousQuoteBalance: quoteBalance,
      newBaseBalance: targetBaseBalance,
      newQuoteBalance: targetQuoteBalance,
      previousBaseRatio: currentBaseRatio,
      newBaseRatio: TARGET_RATIO,
    },
    priceAtAction: targetPrice,
    poolValueAtAction: totalValue,
  });

  broadcastLog(cronName, `Pool ${symbol} rebalanced`, "success");
}

// =============================================================================
// AI Daily Reset
// =============================================================================

export async function processAiDailyReset() {
  const cronName = "processAiDailyReset";
  const startTime = Date.now();

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting AI Daily Reset");

    broadcastLog(cronName, "Generating daily summaries...");
    await generateDailySummaries();
    broadcastProgress(cronName, 25);

    broadcastLog(cronName, "Resetting market daily volumes...");
    await resetMarketDailyVolumes();
    broadcastProgress(cronName, 50);

    broadcastLog(cronName, "Resetting bot daily trade counts...");
    await resetBotDailyTradeCounts();
    broadcastProgress(cronName, 75);

    broadcastLog(cronName, "Checking for markets to resume...");
    await resumeAutoPausedMarkets();
    broadcastProgress(cronName, 100);

    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    broadcastLog(cronName, `AI Daily Reset completed in ${Date.now() - startTime}ms`, "success");
  } catch (error: any) {
    logger.error("AI_DAILY_RESET", "AI Daily Reset failed", error);
    broadcastStatus(cronName, "failed");
    throw error;
  }
}

async function generateDailySummaries() {
  const markets = await models.aiMarketMaker.findAll({
    include: [
      { model: models.aiMarketMakerPool, as: "pool" },
      { model: models.ecosystemMarket, as: "market" },
    ],
  });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const market of markets) {
    try {
      const trades = await models.aiMarketMakerHistory.findAll({
        where: {
          marketMakerId: market.id,
          action: "TRADE",
          createdAt: { [Op.gte]: yesterday, [Op.lt]: today },
        },
      });

      let totalVolume = 0, totalPnL = 0, buyCount = 0, sellCount = 0;
      for (const trade of trades) {
        const details = (trade as any).details || {};
        totalVolume += details.value || 0;
        totalPnL += details.pnl || 0;
        if (details.side === "BUY") buyCount++;
        if (details.side === "SELL") sellCount++;
      }

      await models.aiMarketMakerHistory.create({
        marketMakerId: market.id,
        action: "CONFIG_CHANGE",
        details: {
          type: "DAILY_SUMMARY",
          date: yesterday.toISOString().split("T")[0],
          totalTrades: trades.length,
          buyTrades: buyCount,
          sellTrades: sellCount,
          totalVolume,
          totalPnL,
        },
        priceAtAction: market.targetPrice,
        poolValueAtAction: Number(market.pool?.totalValueLocked || 0),
      });
    } catch (error: any) {
      logger.error("AI_SUMMARY", `Failed to generate daily summary for market ${market.id}`, error);
    }
  }
}

async function resetMarketDailyVolumes() {
  await models.aiMarketMaker.update({ currentDailyVolume: 0 }, { where: {} });
}

async function resetBotDailyTradeCounts() {
  await models.aiBot.update({ dailyTradeCount: 0 }, { where: {} });
}

async function resumeAutoPausedMarkets() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const autoPausedHistory = await models.aiMarketMakerHistory.findAll({
    where: { action: "AUTO_PAUSE", createdAt: { [Op.gte]: yesterday } },
    attributes: ["marketMakerId"],
    group: ["marketMakerId"],
  });

  const marketIds = autoPausedHistory.map((h: any) => h.marketMakerId);
  if (marketIds.length === 0) return;

  const pausedMarkets = await models.aiMarketMaker.findAll({
    where: { id: { [Op.in]: marketIds }, status: "PAUSED" },
  });

  for (const market of pausedMarkets) {
    try {
      const lastPause = await models.aiMarketMakerHistory.findOne({
        where: { marketMakerId: market.id, action: "AUTO_PAUSE" },
        order: [["createdAt", "DESC"]],
      });

      if ((lastPause as any)?.details?.reason === "DAILY_LOSS_LIMIT") {
        await models.aiMarketMaker.update({ status: "ACTIVE" }, { where: { id: market.id } });
        await models.aiBot.update({ status: "ACTIVE" }, { where: { marketMakerId: market.id, status: "PAUSED" } });
        await models.aiMarketMakerHistory.create({
          marketMakerId: market.id,
          action: "RESUME",
          details: { reason: "DAILY_RESET", message: "Market automatically resumed after daily reset" },
          priceAtAction: market.targetPrice,
          poolValueAtAction: 0,
        });
      }
    } catch (error: any) {
      logger.error("AI_MM", `Failed to resume auto-paused market ${market.id}`, error);
    }
  }
}

// =============================================================================
// AI Analytics Aggregator
// =============================================================================

export async function processAiAnalyticsAggregator() {
  const cronName = "processAiAnalyticsAggregator";
  const startTime = Date.now();

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting AI Analytics Aggregator");

    const markets = await models.aiMarketMaker.findAll({
      include: [
        { model: models.aiMarketMakerPool, as: "pool" },
        { model: models.ecosystemMarket, as: "market" },
        { model: models.aiBot, as: "bots" },
      ],
    });

    const total = markets.length;
    if (total === 0) {
      broadcastLog(cronName, "No markets to aggregate", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    broadcastLog(cronName, `Aggregating analytics for ${total} markets`);

    for (let i = 0; i < total; i++) {
      const market = markets[i];
      try {
        await aggregateMarketAnalytics(market);
      } catch (error: any) {
        logger.error("AI_MM", `Failed to aggregate market analytics for ${market.id}`, error);
      }
      broadcastProgress(cronName, Math.round(((i + 1) / total) * 100));
    }

    await aggregateGlobalStats();

    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    broadcastLog(cronName, `AI Analytics Aggregator completed`, "success");
  } catch (error: any) {
    logger.error("AI_ANALYTICS", "AI Analytics Aggregator failed", error);
    broadcastStatus(cronName, "failed");
    throw error;
  }
}

async function aggregateMarketAnalytics(market: any) {
  const pool = market.pool;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const weeklyTrades = await models.aiMarketMakerHistory.findAll({
    where: { marketMakerId: market.id, action: "TRADE", createdAt: { [Op.gte]: oneWeekAgo } },
  });

  if (pool) {
    const totalRealizedPnL = weeklyTrades.reduce((sum: number, t: any) => sum + (t.details?.pnl || 0), 0);
    await models.aiMarketMakerPool.update({ realizedPnL: totalRealizedPnL }, { where: { id: pool.id } });
  }
}

async function aggregateGlobalStats() {
  const pools = await models.aiMarketMakerPool.findAll();
  let totalTvl = 0;
  for (const pool of pools) {
    totalTvl += Number((pool as any).totalValueLocked || 0);
  }

  const activeMarkets = await models.aiMarketMaker.count({ where: { status: "ACTIVE" } });
  const activeBots = await models.aiBot.count({ where: { status: "ACTIVE" } });

  broadcastLog("processAiAnalyticsAggregator", `Global stats: TVL=$${totalTvl.toFixed(2)}, Markets=${activeMarkets}, Bots=${activeBots}`);
}

// =============================================================================
// AI Price Sync
// =============================================================================

const PRICE_DEVIATION_ALERT_THRESHOLD = 10;
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const PRICE_CACHE_TTL = 10000;

export async function processAiPriceSync() {
  const cronName = "processAiPriceSync";
  const startTime = Date.now();

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting AI Price Sync");

    const cacheManager = CacheManager.getInstance();
    const tradingEnabled = await cacheManager.getSetting("aiMarketMakerEnabled");
    if (tradingEnabled === false) {
      broadcastLog(cronName, "AI Market Maker disabled, skipping price sync", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    const activeMarkets = await models.aiMarketMaker.findAll({
      where: { status: "ACTIVE" },
      include: [{ model: models.ecosystemMarket, as: "market" }],
    });

    const total = activeMarkets.length;
    if (total === 0) {
      broadcastLog(cronName, "No active markets to sync prices", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    broadcastLog(cronName, `Syncing prices for ${total} active markets`);

    const alerts: string[] = [];

    for (let i = 0; i < total; i++) {
      const market = activeMarkets[i];
      try {
        const marketAlerts = await syncMarketPrice(market);
        alerts.push(...marketAlerts);
      } catch (error: any) {
        logger.error("AI_MM", `Failed to sync market price for ${market.id}`, error);
      }
      broadcastProgress(cronName, Math.round(((i + 1) / total) * 100));
    }

    if (alerts.length > 0) {
      for (const alert of alerts) {
        broadcastLog(cronName, alert, "warning");
      }
    }

    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    broadcastLog(cronName, `AI Price Sync completed`, "success");
  } catch (error: any) {
    logger.error("AI_PRICE_SYNC", "AI Price Sync failed", error);
    broadcastStatus(cronName, "failed");
    throw error;
  }
}

async function syncMarketPrice(market: any): Promise<string[]> {
  const alerts: string[] = [];
  const symbol = market.market?.symbol;

  if (!symbol) return alerts;

  const externalPrice = await fetchExternalPrice(symbol);
  if (!externalPrice) return alerts;

  const targetPrice = Number(market.targetPrice);
  const deviation = Math.abs((targetPrice - externalPrice) / externalPrice) * 100;

  if (deviation > PRICE_DEVIATION_ALERT_THRESHOLD) {
    alerts.push(`${symbol}: Target price $${targetPrice.toFixed(6)} deviates ${deviation.toFixed(2)}% from external $${externalPrice.toFixed(6)}`);
    await models.aiMarketMakerHistory.create({
      marketMakerId: market.id,
      action: "CONFIG_CHANGE",
      details: { type: "PRICE_DEVIATION_ALERT", targetPrice, externalPrice, deviation, symbol },
      priceAtAction: targetPrice,
      poolValueAtAction: 0,
    });
  }

  return alerts;
}

async function fetchExternalPrice(symbol: string): Promise<number | null> {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    return cached.price;
  }

  try {
    const [currency, pair] = symbol.split("/");
    if (!currency || !pair) return null;

    const exchange = await ExchangeManager.startExchange();
    if (!exchange) return null;

    const ticker = await exchange.fetchTicker(symbol);
    if (ticker && ticker.last) {
      const price = Number(ticker.last);
      priceCache.set(symbol, { price, timestamp: Date.now() });
      return price;
    }
    return null;
  } catch (error: any) {
    return null;
  }
}

export function getCachedExternalPrice(symbol: string): number | null {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL * 3) {
    return cached.price;
  }
  return null;
}

export async function forceRefreshPrice(symbol: string): Promise<number | null> {
  priceCache.delete(symbol);
  return fetchExternalPrice(symbol);
}
