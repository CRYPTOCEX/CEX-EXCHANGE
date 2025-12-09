import { models } from "@b/db";
import { logError } from "../logger";
import { broadcastStatus, broadcastProgress, broadcastLog } from "./broadcast";
import { Op } from "sequelize";
import { CacheManager } from "../cache";

/**
 * AI Risk Monitor
 *
 * This cron job monitors risk metrics for all AI market makers.
 * It checks for:
 * - High volatility conditions
 * - Daily loss limits
 * - Unusual trading patterns
 * - Circuit breaker conditions
 *
 * Run frequency: Every 10 seconds (configured in cron.ts)
 */

export async function processAiRiskMonitor() {
  const cronName = "processAiRiskMonitor";
  const startTime = Date.now();

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting AI Risk Monitor check");

    // Get global settings from centralized store
    const settings = await getAiMarketMakerSettings();
    if (!settings.tradingEnabled) {
      broadcastLog(cronName, "AI Market Maker disabled, skipping risk check", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    // Get all active markets
    const activeMarkets = await models.aiMarketMaker.findAll({
      where: {
        status: { [Op.in]: ["ACTIVE", "PAUSED"] },
      },
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

    // Check each market
    for (let i = 0; i < total; i++) {
      const market = activeMarkets[i];
      try {
        const marketAlerts = await checkMarketRisk(market, settings);
        alerts.push(...marketAlerts);
      } catch (error: any) {
        logError(`processAiRiskMonitor - market ${market.id}`, error, __filename);
        broadcastLog(
          cronName,
          `Error checking risk for market ${market.id}: ${error.message}`,
          "error"
        );
      }

      const progress = Math.round(((i + 1) / total) * 100);
      broadcastProgress(cronName, progress);
    }

    // Log all alerts
    if (alerts.length > 0) {
      broadcastLog(
        cronName,
        `Risk alerts found: ${alerts.length}`,
        "warning"
      );
      for (const alert of alerts) {
        broadcastLog(cronName, alert, "warning");
      }
    }

    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    broadcastLog(
      cronName,
      `AI Risk Monitor completed in ${Date.now() - startTime}ms`,
      "success"
    );
  } catch (error: any) {
    logError("processAiRiskMonitor", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(cronName, `AI Risk Monitor failed: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Check risk metrics for a single market
 */
async function checkMarketRisk(market: any, settings: any): Promise<string[]> {
  const alerts: string[] = [];
  const pool = market.pool;
  const symbol = market.market?.symbol || market.id;

  // 1. Check volatility
  if (market.volatilityPauseEnabled) {
    const volatility = await calculateVolatility(market.id);
    const threshold = market.volatilityThreshold || settings.defaultVolatilityThreshold;

    if (volatility > threshold) {
      alerts.push(`High volatility detected for ${symbol}: ${volatility.toFixed(2)}% (threshold: ${threshold}%)`);

      // Auto-pause if market is active
      if (market.status === "ACTIVE") {
        await pauseMarketForVolatility(market);
        alerts.push(`Market ${symbol} auto-paused due to high volatility`);
      }
    }
  }

  // 2. Check daily loss limit
  if (pool) {
    const dailyPnL = await calculateDailyPnL(market.id);
    const tvl = Number(pool.totalValueLocked) || 1;
    const lossPercent = (dailyPnL / tvl) * -100; // Negative P&L = positive loss

    if (lossPercent > settings.maxDailyLossPercent) {
      alerts.push(`Daily loss limit exceeded for ${symbol}: ${lossPercent.toFixed(2)}% (limit: ${settings.maxDailyLossPercent}%)`);

      // Auto-pause if market is active
      if (market.status === "ACTIVE") {
        await pauseMarketForLoss(market, lossPercent);
        alerts.push(`Market ${symbol} auto-paused due to daily loss limit`);
      }
    }
  }

  // 3. Check for stale market (no trades in last hour when active)
  if (market.status === "ACTIVE") {
    const lastTradeTime = await getLastTradeTime(market.id);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (lastTradeTime && lastTradeTime < hourAgo) {
      alerts.push(`Market ${symbol} has been inactive for over an hour`);
    }
  }

  // 4. Check pool balance ratio
  if (pool) {
    const baseValue = Number(pool.baseBalance) * Number(market.targetPrice);
    const quoteValue = Number(pool.quoteBalance);
    const tvl = baseValue + quoteValue;

    if (tvl > 0) {
      const baseRatio = baseValue / tvl;
      const quoteRatio = quoteValue / tvl;

      // Alert if ratio is too skewed (below 10% or above 90%)
      if (baseRatio < 0.1 || baseRatio > 0.9) {
        alerts.push(`Pool imbalance detected for ${symbol}: Base ${(baseRatio * 100).toFixed(1)}% / Quote ${(quoteRatio * 100).toFixed(1)}%`);
      }
    }
  }

  // 5. Check minimum liquidity
  if (pool && Number(pool.totalValueLocked) < settings.minLiquidity) {
    alerts.push(`Low liquidity warning for ${symbol}: ${Number(pool.totalValueLocked).toFixed(2)} (min: ${settings.minLiquidity})`);
  }

  return alerts;
}

/**
 * Calculate recent volatility for a market (simplified)
 */
async function calculateVolatility(marketMakerId: string): Promise<number> {
  try {
    // Get recent price changes from history
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentHistory = await models.aiMarketMakerHistory.findAll({
      where: {
        marketMakerId,
        action: { [Op.in]: ["TRADE", "TARGET_CHANGE"] },
        createdAt: { [Op.gte]: oneHourAgo },
      },
      order: [["createdAt", "ASC"]],
    });

    if (recentHistory.length < 2) {
      return 0;
    }

    // Calculate price changes
    const prices = recentHistory.map((h: any) => Number(h.priceAtAction));
    const returns: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(ret);
    }

    if (returns.length === 0) {
      return 0;
    }

    // Calculate standard deviation of returns
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Annualized volatility (simplified)
    const volatility = stdDev * Math.sqrt(365 * 24) * 100;

    return volatility;
  } catch (error) {
    logError("calculateVolatility", error, __filename);
    return 0;
  }
}

/**
 * Calculate daily P&L for a market
 */
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

    let totalPnL = 0;
    for (const trade of trades) {
      const details = (trade as any).details || {};
      totalPnL += details.pnl || 0;
    }

    return totalPnL;
  } catch (error) {
    logError("calculateDailyPnL", error, __filename);
    return 0;
  }
}

/**
 * Get the time of the last trade for a market
 */
async function getLastTradeTime(marketMakerId: string): Promise<Date | null> {
  try {
    const lastTrade = await models.aiMarketMakerHistory.findOne({
      where: {
        marketMakerId,
        action: "TRADE",
      },
      order: [["createdAt", "DESC"]],
    });

    return lastTrade ? (lastTrade as any).createdAt : null;
  } catch (error) {
    logError("getLastTradeTime", error, __filename);
    return null;
  }
}

/**
 * Pause a market due to high volatility
 */
async function pauseMarketForVolatility(market: any) {
  const cronName = "processAiRiskMonitor";
  try {
    await models.aiMarketMaker.update(
      { status: "PAUSED" },
      { where: { id: market.id } }
    );

    // Pause all bots
    await models.aiBot.update(
      { status: "PAUSED" },
      { where: { marketMakerId: market.id, status: "ACTIVE" } }
    );

    // Log to history
    await models.aiMarketMakerHistory.create({
      marketMakerId: market.id,
      action: "AUTO_PAUSE",
      details: {
        reason: "HIGH_VOLATILITY",
        message: "Market automatically paused due to high volatility",
      },
      priceAtAction: market.targetPrice,
      poolValueAtAction: Number(market.pool?.totalValueLocked || 0),
    });

    broadcastLog(
      cronName,
      `Market ${market.market?.symbol || market.id} paused due to high volatility`,
      "warning"
    );
  } catch (error) {
    logError("pauseMarketForVolatility", error, __filename);
  }
}

/**
 * Pause a market due to daily loss limit
 */
async function pauseMarketForLoss(market: any, lossPercent: number) {
  const cronName = "processAiRiskMonitor";
  try {
    await models.aiMarketMaker.update(
      { status: "PAUSED" },
      { where: { id: market.id } }
    );

    // Pause all bots
    await models.aiBot.update(
      { status: "PAUSED" },
      { where: { marketMakerId: market.id, status: "ACTIVE" } }
    );

    // Log to history
    await models.aiMarketMakerHistory.create({
      marketMakerId: market.id,
      action: "AUTO_PAUSE",
      details: {
        reason: "DAILY_LOSS_LIMIT",
        message: `Market automatically paused due to daily loss limit (${lossPercent.toFixed(2)}%)`,
        lossPercent,
      },
      priceAtAction: market.targetPrice,
      poolValueAtAction: Number(market.pool?.totalValueLocked || 0),
    });

    broadcastLog(
      cronName,
      `Market ${market.market?.symbol || market.id} paused due to daily loss limit (${lossPercent.toFixed(2)}%)`,
      "warning"
    );
  } catch (error) {
    logError("pauseMarketForLoss", error, __filename);
  }
}

/**
 * Get AI market maker settings from centralized settings store
 */
async function getAiMarketMakerSettings() {
  try {
    const cacheManager = CacheManager.getInstance();

    const [
      tradingEnabled,
      maxDailyLossPercent,
      defaultVolatilityThreshold,
      minLiquidity,
      stopLossEnabled,
    ] = await Promise.all([
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
    logError("getAiMarketMakerSettings", error, __filename);
    return {
      tradingEnabled: true,
      maxDailyLossPercent: 5,
      defaultVolatilityThreshold: 10,
      minLiquidity: 100,
      stopLossEnabled: true,
    };
  }
}
