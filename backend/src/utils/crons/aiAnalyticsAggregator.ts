import { models, sequelize } from "@b/db";
import { logError } from "../logger";
import { broadcastStatus, broadcastProgress, broadcastLog } from "./broadcast";
import { Op } from "sequelize";

/**
 * AI Analytics Aggregator
 *
 * This cron job aggregates trading statistics and performance metrics
 * for AI market makers. It calculates:
 * - Hourly/daily volume summaries
 * - P&L metrics
 * - Bot performance stats
 * - Market health indicators
 *
 * Run frequency: Every 15 minutes (configured in cron.ts)
 */

export async function processAiAnalyticsAggregator() {
  const cronName = "processAiAnalyticsAggregator";
  const startTime = Date.now();

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting AI Analytics Aggregator");

    // Get all markets
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
        logError(`processAiAnalyticsAggregator - market ${market.id}`, error, __filename);
        broadcastLog(
          cronName,
          `Error aggregating analytics for ${market.id}: ${error.message}`,
          "error"
        );
      }

      const progress = Math.round(((i + 1) / total) * 100);
      broadcastProgress(cronName, progress);
    }

    // Aggregate global statistics
    await aggregateGlobalStats();

    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    broadcastLog(
      cronName,
      `AI Analytics Aggregator completed in ${Date.now() - startTime}ms`,
      "success"
    );
  } catch (error: any) {
    logError("processAiAnalyticsAggregator", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(cronName, `AI Analytics Aggregator failed: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Aggregate analytics for a single market
 */
async function aggregateMarketAnalytics(market: any) {
  const cronName = "processAiAnalyticsAggregator";
  const pool = market.pool;
  const bots = market.bots || [];

  // Time ranges
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get trades for different periods
  const [hourlyTrades, dailyTrades, weeklyTrades] = await Promise.all([
    models.aiMarketMakerHistory.findAll({
      where: {
        marketMakerId: market.id,
        action: "TRADE",
        createdAt: { [Op.gte]: oneHourAgo },
      },
    }),
    models.aiMarketMakerHistory.findAll({
      where: {
        marketMakerId: market.id,
        action: "TRADE",
        createdAt: { [Op.gte]: oneDayAgo },
      },
    }),
    models.aiMarketMakerHistory.findAll({
      where: {
        marketMakerId: market.id,
        action: "TRADE",
        createdAt: { [Op.gte]: oneWeekAgo },
      },
    }),
  ]);

  // Calculate metrics
  const hourlyStats = calculateTradeStats(hourlyTrades);
  const dailyStats = calculateTradeStats(dailyTrades);
  const weeklyStats = calculateTradeStats(weeklyTrades);

  // Calculate bot performance
  const botStats = await calculateBotPerformance(bots);

  // Calculate pool health
  const poolHealth = calculatePoolHealth(market, pool);

  // Update pool with aggregated metrics
  if (pool) {
    // Calculate total P&L
    const totalRealizedPnL = weeklyTrades.reduce(
      (sum: number, t: any) => sum + (t.details?.pnl || 0),
      0
    );

    await models.aiMarketMakerPool.update(
      {
        realizedPnL: totalRealizedPnL,
        // Unrealized P&L would require comparing current positions to current price
      },
      { where: { id: pool.id } }
    );
  }

  broadcastLog(
    cronName,
    `${market.market?.symbol || market.id}: 24h trades=${dailyStats.count}, volume=$${dailyStats.volume.toFixed(2)}, PnL=$${dailyStats.pnl.toFixed(2)}`
  );
}

/**
 * Calculate statistics from a set of trades
 */
function calculateTradeStats(trades: any[]): {
  count: number;
  volume: number;
  pnl: number;
  avgPrice: number;
  buyCount: number;
  sellCount: number;
  winCount: number;
  lossCount: number;
} {
  let volume = 0;
  let pnl = 0;
  let priceSum = 0;
  let buyCount = 0;
  let sellCount = 0;
  let winCount = 0;
  let lossCount = 0;

  for (const trade of trades) {
    const details = trade.details || {};
    volume += details.value || 0;
    pnl += details.pnl || 0;
    priceSum += Number(trade.priceAtAction) || 0;

    if (details.side === "BUY") buyCount++;
    if (details.side === "SELL") sellCount++;
    if ((details.pnl || 0) > 0) winCount++;
    if ((details.pnl || 0) < 0) lossCount++;
  }

  return {
    count: trades.length,
    volume,
    pnl,
    avgPrice: trades.length > 0 ? priceSum / trades.length : 0,
    buyCount,
    sellCount,
    winCount,
    lossCount,
  };
}

/**
 * Calculate performance metrics for bots
 */
async function calculateBotPerformance(bots: any[]): Promise<{
  totalTrades: number;
  totalVolume: number;
  totalPnL: number;
  avgWinRate: number;
}> {
  let totalTrades = 0;
  let totalVolume = 0;
  let totalPnL = 0;
  let winRateSum = 0;
  let botsWithTrades = 0;

  for (const bot of bots) {
    totalTrades += bot.tradesExecuted || 0;
    totalVolume += Number(bot.totalVolume || 0);
    totalPnL += Number(bot.totalPnL || 0);

    // Calculate win rate for this bot
    const profitable = bot.profitableTrades || 0;
    const executed = bot.tradesExecuted || 0;
    if (executed > 0) {
      winRateSum += profitable / executed;
      botsWithTrades++;
    }
  }

  return {
    totalTrades,
    totalVolume,
    totalPnL,
    avgWinRate: botsWithTrades > 0 ? (winRateSum / botsWithTrades) * 100 : 0,
  };
}

/**
 * Calculate pool health indicators
 */
function calculatePoolHealth(
  market: any,
  pool: any
): {
  balanceRatio: number;
  tvl: number;
  isHealthy: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!pool) {
    return {
      balanceRatio: 0,
      tvl: 0,
      isHealthy: false,
      warnings: ["No pool found"],
    };
  }

  const baseBalance = Number(pool.baseBalance) || 0;
  const quoteBalance = Number(pool.quoteBalance) || 0;
  const targetPrice = Number(market.targetPrice) || 1;

  const baseValue = baseBalance * targetPrice;
  const quoteValue = quoteBalance;
  const tvl = baseValue + quoteValue;

  const balanceRatio = tvl > 0 ? baseValue / tvl : 0;

  // Check for warnings
  if (tvl < 100) {
    warnings.push("TVL below $100");
  }
  if (balanceRatio < 0.1 || balanceRatio > 0.9) {
    warnings.push("Pool severely imbalanced");
  } else if (balanceRatio < 0.2 || balanceRatio > 0.8) {
    warnings.push("Pool imbalanced");
  }

  return {
    balanceRatio,
    tvl,
    isHealthy: warnings.length === 0,
    warnings,
  };
}

/**
 * Aggregate global statistics across all markets
 */
async function aggregateGlobalStats() {
  const cronName = "processAiAnalyticsAggregator";

  try {
    // Get all pools
    const pools = await models.aiMarketMakerPool.findAll();

    let totalTvl = 0;
    let totalRealizedPnL = 0;
    let totalUnrealizedPnL = 0;

    for (const pool of pools) {
      totalTvl += Number((pool as any).totalValueLocked || 0);
      totalRealizedPnL += Number((pool as any).realizedPnL || 0);
      totalUnrealizedPnL += Number((pool as any).unrealizedPnL || 0);
    }

    // Get active market and bot counts
    const activeMarkets = await models.aiMarketMaker.count({
      where: { status: "ACTIVE" },
    });

    const activeBots = await models.aiBot.count({
      where: { status: "ACTIVE" },
    });

    // Get 24h volume
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyTrades = await models.aiMarketMakerHistory.findAll({
      where: {
        action: "TRADE",
        createdAt: { [Op.gte]: oneDayAgo },
      },
    });

    const dailyVolume = dailyTrades.reduce(
      (sum: number, t: any) => sum + (t.details?.value || 0),
      0
    );

    broadcastLog(
      cronName,
      `Global stats: TVL=$${totalTvl.toFixed(2)}, 24h Volume=$${dailyVolume.toFixed(2)}, Markets=${activeMarkets}, Bots=${activeBots}`
    );
  } catch (error) {
    logError("aggregateGlobalStats", error, __filename);
  }
}
