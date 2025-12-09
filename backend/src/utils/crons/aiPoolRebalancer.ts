import { models } from "@b/db";
import { logError } from "../logger";
import { broadcastStatus, broadcastProgress, broadcastLog } from "./broadcast";
import { Op } from "sequelize";
import { CacheManager } from "../cache";

/**
 * AI Pool Rebalancer
 *
 * This cron job automatically rebalances AI market maker pools
 * when their asset ratios become too skewed.
 *
 * Run frequency: Every hour (configured in cron.ts)
 */

// Target ratio thresholds
const MIN_RATIO_THRESHOLD = 0.2; // 20% minimum for either asset
const MAX_RATIO_THRESHOLD = 0.8; // 80% maximum for either asset
const TARGET_RATIO = 0.5; // 50/50 target ratio

export async function processAiPoolRebalancer() {
  const cronName = "processAiPoolRebalancer";
  const startTime = Date.now();

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting AI Pool Rebalancer");

    // Check if AI Market Maker is enabled from centralized settings
    const cacheManager = CacheManager.getInstance();
    const tradingEnabled = await cacheManager.getSetting("aiMarketMakerEnabled");
    if (tradingEnabled === false) {
      broadcastLog(cronName, "AI Market Maker disabled, skipping rebalance", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    // Get all markets with pools (active or paused - we can rebalance paused markets)
    const marketsWithPools = await models.aiMarketMaker.findAll({
      where: {
        status: { [Op.in]: ["ACTIVE", "PAUSED"] },
      },
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

      if (!pool) {
        continue;
      }

      try {
        const needsRebalance = checkPoolNeedsRebalance(market, pool);
        if (needsRebalance) {
          await rebalancePool(market, pool);
          rebalancedCount++;
        }
      } catch (error: any) {
        logError(`processAiPoolRebalancer - pool ${pool.id}`, error, __filename);
        broadcastLog(
          cronName,
          `Error checking/rebalancing pool ${pool.id}: ${error.message}`,
          "error"
        );
      }

      const progress = Math.round(((i + 1) / total) * 100);
      broadcastProgress(cronName, progress);
    }

    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    broadcastLog(
      cronName,
      `AI Pool Rebalancer completed. Rebalanced ${rebalancedCount} pools in ${Date.now() - startTime}ms`,
      "success"
    );
  } catch (error: any) {
    logError("processAiPoolRebalancer", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(cronName, `AI Pool Rebalancer failed: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Check if a pool needs rebalancing based on its current ratio
 */
function checkPoolNeedsRebalance(market: any, pool: any): boolean {
  const baseBalance = Number(pool.baseBalance) || 0;
  const quoteBalance = Number(pool.quoteBalance) || 0;
  const targetPrice = Number(market.targetPrice) || 1;

  // Calculate values
  const baseValue = baseBalance * targetPrice;
  const quoteValue = quoteBalance;
  const totalValue = baseValue + quoteValue;

  if (totalValue <= 0) {
    return false;
  }

  // Calculate ratios
  const baseRatio = baseValue / totalValue;

  // Check if ratio is outside acceptable bounds
  return baseRatio < MIN_RATIO_THRESHOLD || baseRatio > MAX_RATIO_THRESHOLD;
}

/**
 * Rebalance a pool to target ratio
 */
async function rebalancePool(market: any, pool: any) {
  const cronName = "processAiPoolRebalancer";
  const symbol = market.market?.symbol || market.id;

  const baseBalance = Number(pool.baseBalance) || 0;
  const quoteBalance = Number(pool.quoteBalance) || 0;
  const targetPrice = Number(market.targetPrice) || 1;

  // Calculate current values
  const baseValue = baseBalance * targetPrice;
  const quoteValue = quoteBalance;
  const totalValue = baseValue + quoteValue;

  if (totalValue <= 0) {
    return;
  }

  // Current ratio
  const currentBaseRatio = baseValue / totalValue;

  // Calculate target values
  const targetBaseValue = totalValue * TARGET_RATIO;
  const targetQuoteValue = totalValue * (1 - TARGET_RATIO);

  // Calculate target balances
  const targetBaseBalance = targetBaseValue / targetPrice;
  const targetQuoteBalance = targetQuoteValue;

  // Calculate the trade needed
  const baseDiff = targetBaseBalance - baseBalance;
  const quoteDiff = targetQuoteBalance - quoteBalance;

  broadcastLog(
    cronName,
    `Rebalancing ${symbol}: Base ${(currentBaseRatio * 100).toFixed(1)}% -> ${(TARGET_RATIO * 100).toFixed(1)}%`
  );

  // Update pool balances (simulated rebalance)
  await models.aiMarketMakerPool.update(
    {
      baseBalance: targetBaseBalance,
      quoteBalance: targetQuoteBalance,
      lastRebalanceAt: new Date(),
    },
    { where: { id: pool.id } }
  );

  // Log the rebalance
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
      baseDiff,
      quoteDiff,
    },
    priceAtAction: targetPrice,
    poolValueAtAction: totalValue,
  });

  broadcastLog(
    cronName,
    `Pool ${symbol} rebalanced: Base ${targetBaseBalance.toFixed(6)}, Quote ${targetQuoteBalance.toFixed(2)}`,
    "success"
  );
}
