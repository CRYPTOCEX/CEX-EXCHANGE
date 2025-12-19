// Daily Limits - Daily trade/loss limit enforcement
import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { logger } from "@b/utils/console";
import { getCopyTradingSettings, createAuditLog } from "./index";
import {
  convertToUSDT,
  getQuoteCurrency,
  formatCurrencyAmount,
} from "./currency";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DailyLimitCheck {
  canTrade: boolean;
  reason?: string;
  currentTrades?: number;
  maxTrades?: number;
  currentLoss?: number;
  maxLoss?: number;
}

interface DailyStats {
  tradesCount: number;
  totalProfit: number; // In USDT equivalent
  totalLoss: number; // In USDT equivalent
  netPnL: number; // In USDT equivalent
  totalVolume: number; // In USDT equivalent
  // Breakdown by currency for detailed reporting
  profitByCurrency: Record<string, number>;
  lossByCurrency: Record<string, number>;
}

// Redis key prefix for daily limits (in-memory fallback if Redis unavailable)
const dailyLimitsCache: Map<string, { trades: number; loss: number; date: string }> =
  new Map();

// ============================================================================
// DAILY LIMIT CHECKING
// ============================================================================

/**
 * Check if a follower can make a trade based on daily limits
 */
export async function checkDailyLimits(
  followerId: string
): Promise<DailyLimitCheck> {
  try {
    const follower = await models.copyTradingFollower.findByPk(followerId);
    if (!follower) {
      return { canTrade: false, reason: "Follower not found" };
    }

    const followerData = follower as any;

    // Check if follower is active
    if (followerData.status !== "ACTIVE") {
      return { canTrade: false, reason: "Subscription is not active" };
    }

    // Get today's stats
    const todayStats = await getDailyStats(followerId);

    // Check daily trade limit if configured
    const settings = await getCopyTradingSettings();
    const maxDailyTrades = settings.maxDailyLossDefault || 50; // Default 50 trades per day

    // Get follower's max daily loss
    const maxDailyLoss = followerData.maxDailyLoss;

    // Check trade count limit
    if (todayStats.tradesCount >= maxDailyTrades) {
      return {
        canTrade: false,
        reason: "Daily trade limit reached",
        currentTrades: todayStats.tradesCount,
        maxTrades: maxDailyTrades,
      };
    }

    // Check daily loss limit
    if (maxDailyLoss && maxDailyLoss > 0) {
      if (todayStats.totalLoss >= maxDailyLoss) {
        return {
          canTrade: false,
          reason: "Daily loss limit reached",
          currentLoss: todayStats.totalLoss,
          maxLoss: maxDailyLoss,
        };
      }
    }

    return { canTrade: true };
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to check daily limits", error);
    // Allow trading if we can't check limits (fail open)
    return { canTrade: true };
  }
}

/**
 * Get daily statistics for a follower
 * All monetary values are converted to USDT equivalent for consistent comparison
 */
export async function getDailyStats(followerId: string): Promise<DailyStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Get today's trades with symbol info to determine profit currency
    const trades = await models.copyTradingTrade.findAll({
      where: {
        followerId,
        createdAt: { [Op.gte]: today },
      },
      attributes: ["profit", "cost", "status", "symbol", "profitCurrency"],
    });

    const tradesData = trades as any[];
    const tradesCount = tradesData.length;

    // Calculate P&L with currency conversion to USDT
    let totalProfitUSDT = 0;
    let totalLossUSDT = 0;
    let totalVolumeUSDT = 0;
    const profitByCurrency: Record<string, number> = {};
    const lossByCurrency: Record<string, number> = {};

    for (const trade of tradesData) {
      const profit = trade.profit || 0;
      const cost = trade.cost || 0;

      // Determine the profit currency (from field or symbol quote)
      let profitCurrency = trade.profitCurrency;
      if (!profitCurrency && trade.symbol) {
        profitCurrency = getQuoteCurrency(trade.symbol);
      }
      // Fallback to USDT if no currency info available
      if (!profitCurrency) {
        profitCurrency = "USDT";
      }

      // Convert profit/loss to USDT for aggregation
      try {
        const profitInUSDT = await convertToUSDT(profit, profitCurrency);
        const costInUSDT = await convertToUSDT(cost, profitCurrency);

        if (profitInUSDT > 0) {
          totalProfitUSDT += profitInUSDT;
          // Track profit in original currency
          profitByCurrency[profitCurrency] =
            (profitByCurrency[profitCurrency] || 0) + profit;
        } else if (profitInUSDT < 0) {
          totalLossUSDT += Math.abs(profitInUSDT);
          // Track loss in original currency
          lossByCurrency[profitCurrency] =
            (lossByCurrency[profitCurrency] || 0) + Math.abs(profit);
        }

        totalVolumeUSDT += costInUSDT;
      } catch (conversionError: any) {
        // If conversion fails, log warning and use raw values (assume USDT)
        logger.warn(
          "COPY_TRADING",
          `Currency conversion failed for ${profitCurrency}, using raw value`,
          conversionError
        );
        if (profit > 0) {
          totalProfitUSDT += profit;
          profitByCurrency[profitCurrency] =
            (profitByCurrency[profitCurrency] || 0) + profit;
        } else {
          totalLossUSDT += Math.abs(profit);
          lossByCurrency[profitCurrency] =
            (lossByCurrency[profitCurrency] || 0) + Math.abs(profit);
        }
        totalVolumeUSDT += cost;
      }
    }

    return {
      tradesCount,
      totalProfit: totalProfitUSDT,
      totalLoss: totalLossUSDT,
      netPnL: totalProfitUSDT - totalLossUSDT,
      totalVolume: totalVolumeUSDT,
      profitByCurrency,
      lossByCurrency,
    };
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to get daily stats", error);
    return {
      tradesCount: 0,
      totalProfit: 0,
      totalLoss: 0,
      netPnL: 0,
      totalVolume: 0,
      profitByCurrency: {},
      lossByCurrency: {},
    };
  }
}

// ============================================================================
// TRADE AND LOSS RECORDING
// ============================================================================

/**
 * Record a trade for daily limit tracking
 */
export async function recordTrade(
  followerId: string,
  tradeAmount: number
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const cacheKey = `${followerId}:${today}`;

  const existing = dailyLimitsCache.get(cacheKey) || {
    trades: 0,
    loss: 0,
    date: today,
  };

  existing.trades += 1;
  dailyLimitsCache.set(cacheKey, existing);
}

/**
 * Record a loss for daily limit tracking
 * @param lossAmount - The loss amount in original currency
 * @param lossCurrency - The currency of the loss (e.g., "USDT", "BTC")
 */
export async function recordLoss(
  followerId: string,
  lossAmount: number,
  lossCurrency: string = "USDT"
): Promise<void> {
  if (lossAmount <= 0) return;

  const today = new Date().toISOString().split("T")[0];
  const cacheKey = `${followerId}:${today}`;

  // Convert loss to USDT for consistent tracking
  let lossInUSDT: number;
  try {
    lossInUSDT = await convertToUSDT(lossAmount, lossCurrency);
  } catch (error) {
    logger.warn(
      "COPY_TRADING",
      `Failed to convert loss from ${lossCurrency} to USDT, using raw value`,
      error
    );
    lossInUSDT = lossAmount;
  }

  const existing = dailyLimitsCache.get(cacheKey) || {
    trades: 0,
    loss: 0,
    date: today,
  };

  existing.loss += lossInUSDT;
  dailyLimitsCache.set(cacheKey, existing);

  // Check if this triggers the daily loss limit
  const follower = await models.copyTradingFollower.findByPk(followerId);
  if (follower) {
    const followerData = follower as any;
    const maxDailyLoss = followerData.maxDailyLoss; // maxDailyLoss is stored in USDT

    if (maxDailyLoss && existing.loss >= maxDailyLoss) {
      // Pause the follower subscription
      await pauseFollowerDueToDailyLimit(followerId, existing.loss, maxDailyLoss);
    }
  }
}

/**
 * Pause a follower's subscription due to daily loss limit
 * @param currentLoss - Current loss in USDT equivalent
 * @param maxLoss - Max daily loss limit in USDT
 */
async function pauseFollowerDueToDailyLimit(
  followerId: string,
  currentLoss: number,
  maxLoss: number
): Promise<void> {
  try {
    await models.copyTradingFollower.update(
      { status: "PAUSED" },
      { where: { id: followerId } }
    );

    // Get follower for user notification
    const follower = await models.copyTradingFollower.findByPk(followerId, {
      include: [{ model: models.user, as: "user" }],
    });

    if (follower) {
      const followerData = follower as any;

      // Create notification with proper currency formatting
      await models.notification.create({
        userId: followerData.userId,
        type: "system",
        title: "Copy Trading Paused",
        message: `Your copy trading subscription has been paused because your daily loss limit (${formatCurrencyAmount(maxLoss, "USDT")}) was reached. Current loss: ${formatCurrencyAmount(currentLoss, "USDT")}. You can resume trading tomorrow.`,
        link: "/copy-trading/subscription",
      });

      // Create audit log
      await createAuditLog({
        entityType: "copyTradingFollower",
        entityId: followerId,
        action: "DAILY_LOSS_LIMIT_REACHED",
        userId: followerData.userId,
        metadata: { currentLoss, maxLoss, currency: "USDT" },
      });
    }
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to pause follower due to daily limit", error);
  }
}

// ============================================================================
// DAILY RESET
// ============================================================================

/**
 * Reset daily limits for all followers (called by cron job at midnight)
 */
export async function resetDailyLimits(): Promise<{
  reset: number;
  reactivated: number;
}> {
  let reset = 0;
  let reactivated = 0;

  try {
    // Clear in-memory cache
    dailyLimitsCache.clear();
    reset++;

    // Reactivate followers paused due to daily limits
    // (only if they were paused and it's a new day)
    const pausedFollowers = await models.copyTradingFollower.findAll({
      where: { status: "PAUSED" },
      include: [
        {
          model: models.copyTradingAuditLog,
          as: "auditLogs",
          where: {
            action: "DAILY_LOSS_LIMIT_REACHED",
            createdAt: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
            },
          },
          required: true,
          limit: 1,
        },
      ],
    });

    for (const follower of pausedFollowers as any[]) {
      await follower.update({ status: "ACTIVE" });
      reactivated++;

      // Create notification
      await models.notification.create({
        userId: follower.userId,
        type: "system",
        title: "Copy Trading Resumed",
        message:
          "Your copy trading subscription has been automatically reactivated for the new trading day.",
        link: "/copy-trading/subscription",
      });

      // Create audit log
      await createAuditLog({
        entityType: "copyTradingFollower",
        entityId: follower.id,
        action: "DAILY_LIMITS_RESET",
        userId: follower.userId,
      });
    }

    logger.info(
      "COPY_TRADING",
      `Daily limits reset complete: ${reset} caches cleared, ${reactivated} followers reactivated`
    );

    return { reset, reactivated };
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to reset daily limits", error);
    return { reset, reactivated };
  }
}

// ============================================================================
// LIMIT CONFIGURATION
// ============================================================================

/**
 * Update follower's daily limits
 */
export async function updateFollowerLimits(
  followerId: string,
  limits: {
    maxDailyLoss?: number;
    maxPositionSize?: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const follower = await models.copyTradingFollower.findByPk(followerId);
    if (!follower) {
      return { success: false, error: "Follower not found" };
    }

    await follower.update(limits);

    // Create audit log
    await createAuditLog({
      entityType: "copyTradingFollower",
      entityId: followerId,
      action: "LIMITS_UPDATED",
      userId: (follower as any).userId,
      newValue: limits,
    });

    return { success: true };
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to update follower limits", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get follower's current limit status
 * All monetary values are in USDT equivalent
 */
export async function getFollowerLimitStatus(followerId: string): Promise<{
  limits: {
    maxDailyLoss: number | null;
    maxPositionSize: number | null;
    stopLossPercent: number | null;
    takeProfitPercent: number | null;
  };
  currentUsage: DailyStats;
  canTrade: boolean;
  reason?: string;
  currency: string; // The base currency for all values (USDT)
}> {
  const follower = await models.copyTradingFollower.findByPk(followerId);
  if (!follower) {
    return {
      limits: {
        maxDailyLoss: null,
        maxPositionSize: null,
        stopLossPercent: null,
        takeProfitPercent: null,
      },
      currentUsage: {
        tradesCount: 0,
        totalProfit: 0,
        totalLoss: 0,
        netPnL: 0,
        totalVolume: 0,
        profitByCurrency: {},
        lossByCurrency: {},
      },
      canTrade: false,
      reason: "Follower not found",
      currency: "USDT",
    };
  }

  const followerData = follower as any;
  const currentUsage = await getDailyStats(followerId);
  const limitCheck = await checkDailyLimits(followerId);

  return {
    limits: {
      maxDailyLoss: followerData.maxDailyLoss,
      maxPositionSize: followerData.maxPositionSize,
      stopLossPercent: followerData.stopLossPercent,
      takeProfitPercent: followerData.takeProfitPercent,
    },
    currentUsage,
    canTrade: limitCheck.canTrade,
    reason: limitCheck.reason,
    currency: "USDT", // All values are normalized to USDT
  };
}

// ============================================================================
// AUTO-ACTIONS
// ============================================================================

/**
 * Check and execute auto-pause for followers exceeding limits
 */
export async function checkAutoActions(): Promise<{
  checked: number;
  paused: number;
}> {
  let checked = 0;
  let paused = 0;

  try {
    // Get all active followers with loss limits configured
    const followers = await models.copyTradingFollower.findAll({
      where: {
        status: "ACTIVE",
        maxDailyLoss: { [Op.gt]: 0 },
      },
    });

    for (const follower of followers as any[]) {
      checked++;
      const stats = await getDailyStats(follower.id);

      if (stats.totalLoss >= follower.maxDailyLoss) {
        await pauseFollowerDueToDailyLimit(
          follower.id,
          stats.totalLoss,
          follower.maxDailyLoss
        );
        paused++;
      }
    }

    return { checked, paused };
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to check auto actions", error);
    return { checked, paused };
  }
}
