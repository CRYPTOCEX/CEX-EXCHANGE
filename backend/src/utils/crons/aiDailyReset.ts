import { models, sequelize } from "@b/db";
import { logError } from "../logger";
import { broadcastStatus, broadcastProgress, broadcastLog } from "./broadcast";
import { Op } from "sequelize";
import { CacheManager } from "../cache";

/**
 * AI Daily Reset
 *
 * This cron job runs at midnight to:
 * - Reset daily volume counters
 * - Reset daily trade counts for bots
 * - Reset daily P&L tracking
 * - Generate daily summary reports
 *
 * Run frequency: Once per day at midnight (configured in cron.ts)
 */

export async function processAiDailyReset() {
  const cronName = "processAiDailyReset";
  const startTime = Date.now();

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting AI Daily Reset");

    // Check if AI Market Maker extension is active (just proceed - centralized settings don't require initialization)
    // Daily reset should always run for any configured markets

    // Step 1: Generate daily summary for all markets
    broadcastLog(cronName, "Generating daily summaries...");
    await generateDailySummaries();
    broadcastProgress(cronName, 25);

    // Step 2: Reset market daily volumes
    broadcastLog(cronName, "Resetting market daily volumes...");
    await resetMarketDailyVolumes();
    broadcastProgress(cronName, 50);

    // Step 3: Reset bot daily trade counts
    broadcastLog(cronName, "Resetting bot daily trade counts...");
    await resetBotDailyTradeCounts();
    broadcastProgress(cronName, 75);

    // Step 4: Resume markets that were auto-paused due to daily limits
    broadcastLog(cronName, "Checking for markets to resume...");
    await resumeAutoPausedMarkets();
    broadcastProgress(cronName, 100);

    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    broadcastLog(
      cronName,
      `AI Daily Reset completed in ${Date.now() - startTime}ms`,
      "success"
    );
  } catch (error: any) {
    logError("processAiDailyReset", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(cronName, `AI Daily Reset failed: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Generate daily summary reports for all markets
 */
async function generateDailySummaries() {
  const cronName = "processAiDailyReset";

  try {
    // Get all markets
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
        // Get yesterday's trades
        const trades = await models.aiMarketMakerHistory.findAll({
          where: {
            marketMakerId: market.id,
            action: "TRADE",
            createdAt: {
              [Op.gte]: yesterday,
              [Op.lt]: today,
            },
          },
        });

        // Calculate daily metrics
        let totalVolume = 0;
        let totalPnL = 0;
        let buyCount = 0;
        let sellCount = 0;

        for (const trade of trades) {
          const details = (trade as any).details || {};
          totalVolume += details.value || 0;
          totalPnL += details.pnl || 0;
          if (details.side === "BUY") buyCount++;
          if (details.side === "SELL") sellCount++;
        }

        // Log daily summary to history
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
            tvl: Number(market.pool?.totalValueLocked || 0),
            realizedPnL: Number(market.pool?.realizedPnL || 0),
            unrealizedPnL: Number(market.pool?.unrealizedPnL || 0),
          },
          priceAtAction: market.targetPrice,
          poolValueAtAction: Number(market.pool?.totalValueLocked || 0),
        });

        broadcastLog(
          cronName,
          `Daily summary for ${market.market?.symbol || market.id}: ${trades.length} trades, $${totalVolume.toFixed(2)} volume, $${totalPnL.toFixed(2)} P&L`
        );
      } catch (error: any) {
        logError(`generateDailySummaries - market ${market.id}`, error, __filename);
      }
    }
  } catch (error) {
    logError("generateDailySummaries", error, __filename);
    throw error;
  }
}

/**
 * Reset daily volume counters for all markets
 */
async function resetMarketDailyVolumes() {
  const cronName = "processAiDailyReset";

  try {
    const result = await models.aiMarketMaker.update(
      { currentDailyVolume: 0 },
      { where: {} }
    );

    broadcastLog(
      cronName,
      `Reset daily volumes for ${result[0]} markets`,
      "success"
    );
  } catch (error) {
    logError("resetMarketDailyVolumes", error, __filename);
    throw error;
  }
}

/**
 * Reset daily trade counts for all bots
 */
async function resetBotDailyTradeCounts() {
  const cronName = "processAiDailyReset";

  try {
    const result = await models.aiBot.update(
      { dailyTradeCount: 0 },
      { where: {} }
    );

    broadcastLog(
      cronName,
      `Reset daily trade counts for ${result[0]} bots`,
      "success"
    );
  } catch (error) {
    logError("resetBotDailyTradeCounts", error, __filename);
    throw error;
  }
}

/**
 * Resume markets that were auto-paused due to daily loss limits
 * (since it's a new day, they should get another chance)
 */
async function resumeAutoPausedMarkets() {
  const cronName = "processAiDailyReset";

  try {
    // Find markets that were auto-paused due to daily loss limit
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const autoPausedHistory = await models.aiMarketMakerHistory.findAll({
      where: {
        action: "AUTO_PAUSE",
        createdAt: { [Op.gte]: yesterday },
      },
      attributes: ["marketMakerId"],
      group: ["marketMakerId"],
    });

    const marketIds = autoPausedHistory.map((h: any) => h.marketMakerId);

    if (marketIds.length === 0) {
      broadcastLog(cronName, "No auto-paused markets to resume", "info");
      return;
    }

    // Get markets that are still paused
    const pausedMarkets = await models.aiMarketMaker.findAll({
      where: {
        id: { [Op.in]: marketIds },
        status: "PAUSED",
      },
    });

    let resumedCount = 0;

    for (const market of pausedMarkets) {
      try {
        // Check the most recent pause reason
        const lastPause = await models.aiMarketMakerHistory.findOne({
          where: {
            marketMakerId: market.id,
            action: "AUTO_PAUSE",
          },
          order: [["createdAt", "DESC"]],
        });

        const reason = (lastPause as any)?.details?.reason;

        // Only auto-resume if paused for daily loss limit (not volatility)
        if (reason === "DAILY_LOSS_LIMIT") {
          await models.aiMarketMaker.update(
            { status: "ACTIVE" },
            { where: { id: market.id } }
          );

          // Resume bots
          await models.aiBot.update(
            { status: "ACTIVE" },
            { where: { marketMakerId: market.id, status: "PAUSED" } }
          );

          // Log resume
          await models.aiMarketMakerHistory.create({
            marketMakerId: market.id,
            action: "RESUME",
            details: {
              reason: "DAILY_RESET",
              message: "Market automatically resumed after daily reset",
            },
            priceAtAction: market.targetPrice,
            poolValueAtAction: 0,
          });

          resumedCount++;
        }
      } catch (error: any) {
        logError(`resumeAutoPausedMarkets - market ${market.id}`, error, __filename);
      }
    }

    broadcastLog(
      cronName,
      `Resumed ${resumedCount} previously auto-paused markets`,
      "success"
    );
  } catch (error) {
    logError("resumeAutoPausedMarkets", error, __filename);
    throw error;
  }
}
