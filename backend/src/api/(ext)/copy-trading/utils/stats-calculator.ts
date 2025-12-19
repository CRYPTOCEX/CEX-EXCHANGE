/**
 * Statistics Calculator for Copy Trading
 *
 * Calculates statistics on-the-fly from the source of truth (copyTradingTrade table)
 * instead of storing redundant calculated values in the database.
 *
 * Features:
 * - Redis caching with configurable TTL
 * - Automatic cache invalidation
 * - Currency conversion to USDT for consistent aggregation
 */

import { models } from "@b/db";
import { Op } from "sequelize";
import { getEcoPriceInUSD } from "@b/api/finance/currency/utils";
import { RedisSingleton } from "@b/utils/redis";
import { logger } from "@b/utils/console";

const redis = RedisSingleton.getInstance();

// Cache configuration
const CACHE_TTL = {
  LEADER_STATS: 300, // 5 minutes
  FOLLOWER_STATS: 300, // 5 minutes
  ALLOCATION_STATS: 180, // 3 minutes
  DAILY_STATS: 3600, // 1 hour (historical data)
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LeaderStats {
  totalFollowers: number;
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  totalVolume: number;
  roi: number;
}

export interface FollowerStats {
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  roi: number;
}

export interface AllocationStats {
  totalTrades: number;
  winRate: number;
  totalProfit: number;
}

export interface DailyStats {
  trades: number;
  winningTrades: number;
  losingTrades: number;
  profit: number;
  volume: number;
  fees: number;
}

// ============================================================================
// LEADER STATISTICS
// ============================================================================

/**
 * Calculate leader statistics from trades
 * Single source of truth: copyTradingTrade table
 */
export async function calculateLeaderStats(leaderId: string): Promise<LeaderStats> {
  try {
    // Count active followers (not stopped)
    const totalFollowers = await models.copyTradingFollower.count({
      where: {
        leaderId,
        status: { [Op.ne]: "STOPPED" },
      },
    });

    // Get all closed leader trades
    const trades = await models.copyTradingTrade.findAll({
      where: {
        leaderId,
        isLeaderTrade: true,
        status: "CLOSED",
      },
      attributes: ["profit", "cost", "fee"],
      raw: true,
    });

    const totalTrades = trades.length;
    const winningTrades = trades.filter((t: any) => (t.profit || 0) > 0).length;
    const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
    const totalVolume = trades.reduce((sum: number, t: any) => sum + (t.cost || 0), 0);

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const roi = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;

    return {
      totalFollowers,
      totalTrades,
      winRate: Math.round(winRate * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100,
      roi: Math.round(roi * 100) / 100,
    };
  } catch (error) {
    logger.error("COPY_TRADING", `Failed to calculate leader stats for ${leaderId}`, error);
    throw error;
  }
}

/**
 * Get leader statistics with Redis caching
 */
export async function getLeaderStats(leaderId: string): Promise<LeaderStats> {
  const cacheKey = `copy:leader:stats:${leaderId}`;

  try {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (cacheError) {
    logger.warn("COPY_TRADING", `Cache read failed for ${cacheKey}`, cacheError);
  }

  // Calculate fresh stats
  const stats = await calculateLeaderStats(leaderId);

  // Cache the result
  try {
    await redis.set(cacheKey, JSON.stringify(stats), "EX", CACHE_TTL.LEADER_STATS);
  } catch (cacheError) {
    logger.warn("COPY_TRADING", `Cache write failed for ${cacheKey}`, cacheError);
  }

  return stats;
}

/**
 * Invalidate leader stats cache (call when new trade closes)
 */
export async function invalidateLeaderStatsCache(leaderId: string): Promise<void> {
  const cacheKey = `copy:leader:stats:${leaderId}`;
  try {
    await redis.del(cacheKey);
  } catch (error) {
    logger.warn("COPY_TRADING", `Failed to invalidate cache for ${cacheKey}`, error);
  }
}

// ============================================================================
// FOLLOWER STATISTICS
// ============================================================================

/**
 * Calculate follower statistics from trades
 */
export async function calculateFollowerStats(followerId: string): Promise<FollowerStats> {
  try {
    const trades = await models.copyTradingTrade.findAll({
      where: {
        followerId,
        status: "CLOSED",
      },
      attributes: ["profit", "cost"],
      raw: true,
    });

    const totalTrades = trades.length;
    const winningTrades = trades.filter((t: any) => (t.profit || 0) > 0).length;
    const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Calculate total allocated in USDT for ROI
    const allocations = await models.copyTradingFollowerAllocation.findAll({
      where: { followerId, isActive: true },
      attributes: ["symbol", "baseAmount", "quoteAmount"],
      raw: true,
    });

    let totalAllocated = 0;
    for (const alloc of allocations as any[]) {
      try {
        // Extract base and quote currencies from symbol (e.g., "BTC/USDT" -> ["BTC", "USDT"])
        const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");
        const basePrice = await getEcoPriceInUSD(baseCurrency);
        const quotePrice = await getEcoPriceInUSD(quoteCurrency);
        totalAllocated +=
          parseFloat(alloc.baseAmount || 0) * basePrice +
          parseFloat(alloc.quoteAmount || 0) * quotePrice;
      } catch (error) {
        logger.warn("COPY_TRADING", `Failed to get price for ${alloc.symbol}`, error);
      }
    }

    const roi = totalAllocated > 0 ? (totalProfit / totalAllocated) * 100 : 0;

    return {
      totalTrades,
      winRate: Math.round(winRate * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      roi: Math.round(roi * 100) / 100,
    };
  } catch (error) {
    logger.error("COPY_TRADING", `Failed to calculate follower stats for ${followerId}`, error);
    throw error;
  }
}

/**
 * Get follower statistics with Redis caching
 */
export async function getFollowerStats(followerId: string): Promise<FollowerStats> {
  const cacheKey = `copy:follower:stats:${followerId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (cacheError) {
    logger.warn("COPY_TRADING", `Cache read failed for ${cacheKey}`, cacheError);
  }

  const stats = await calculateFollowerStats(followerId);

  try {
    await redis.set(cacheKey, JSON.stringify(stats), "EX", CACHE_TTL.FOLLOWER_STATS);
  } catch (cacheError) {
    logger.warn("COPY_TRADING", `Cache write failed for ${cacheKey}`, cacheError);
  }

  return stats;
}

/**
 * Invalidate follower stats cache
 */
export async function invalidateFollowerStatsCache(followerId: string): Promise<void> {
  const cacheKey = `copy:follower:stats:${followerId}`;
  try {
    await redis.del(cacheKey);
  } catch (error) {
    logger.warn("COPY_TRADING", `Failed to invalidate cache for ${cacheKey}`, error);
  }
}

// ============================================================================
// ALLOCATION STATISTICS
// ============================================================================

/**
 * Calculate allocation statistics for a specific market
 */
export async function calculateAllocationStats(
  followerId: string,
  symbol: string
): Promise<AllocationStats> {
  try {
    const trades = await models.copyTradingTrade.findAll({
      where: {
        followerId,
        symbol,
        status: "CLOSED",
      },
      attributes: ["profit"],
      raw: true,
    });

    const totalTrades = trades.length;
    const winningTrades = trades.filter((t: any) => (t.profit || 0) > 0).length;
    const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      totalTrades,
      winRate: Math.round(winRate * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
    };
  } catch (error) {
    logger.error("COPY_TRADING", `Failed to calculate allocation stats for ${followerId}/${symbol}`, error);
    throw error;
  }
}

/**
 * Get allocation statistics with Redis caching
 */
export async function getAllocationStats(
  followerId: string,
  symbol: string
): Promise<AllocationStats> {
  const cacheKey = `copy:allocation:stats:${followerId}:${symbol}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (cacheError) {
    logger.warn("COPY_TRADING", `Cache read failed for ${cacheKey}`, cacheError);
  }

  const stats = await calculateAllocationStats(followerId, symbol);

  try {
    await redis.set(cacheKey, JSON.stringify(stats), "EX", CACHE_TTL.ALLOCATION_STATS);
  } catch (cacheError) {
    logger.warn("COPY_TRADING", `Cache write failed for ${cacheKey}`, cacheError);
  }

  return stats;
}

/**
 * Invalidate allocation stats cache
 */
export async function invalidateAllocationStatsCache(
  followerId: string,
  symbol: string
): Promise<void> {
  const cacheKey = `copy:allocation:stats:${followerId}:${symbol}`;
  try {
    await redis.del(cacheKey);
  } catch (error) {
    logger.warn("COPY_TRADING", `Failed to invalidate cache for ${cacheKey}`, error);
  }
}

// ============================================================================
// DAILY STATISTICS (for historical tracking)
// ============================================================================

/**
 * Calculate leader daily stats for a specific date
 * Used for aggregation/historical tracking in copyTradingLeaderStats table
 */
export async function calculateLeaderDailyStats(
  leaderId: string,
  date: Date
): Promise<DailyStats> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const trades = await models.copyTradingTrade.findAll({
      where: {
        leaderId,
        isLeaderTrade: true,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      },
      attributes: ["profit", "cost", "fee", "status"],
      raw: true,
    });

    const closedTrades = trades.filter((t: any) => t.status === "CLOSED");
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter((t: any) => (t.profit || 0) > 0).length;
    const losingTrades = totalTrades - winningTrades;
    const profit = closedTrades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
    const volume = closedTrades.reduce((sum: number, t: any) => sum + (t.cost || 0), 0);
    const fees = closedTrades.reduce((sum: number, t: any) => sum + (t.fee || 0), 0);

    return {
      trades: totalTrades,
      winningTrades,
      losingTrades,
      profit: Math.round(profit * 100) / 100,
      volume: Math.round(volume * 100) / 100,
      fees: Math.round(fees * 100) / 100,
    };
  } catch (error) {
    logger.error("COPY_TRADING", `Failed to calculate daily stats for leader ${leaderId}`, error);
    throw error;
  }
}

/**
 * Get leader daily stats with caching (longer TTL for historical data)
 */
export async function getLeaderDailyStats(
  leaderId: string,
  date: Date
): Promise<DailyStats> {
  const dateStr = date.toISOString().split("T")[0];
  const cacheKey = `copy:leader:daily:${leaderId}:${dateStr}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (cacheError) {
    logger.warn("COPY_TRADING", `Cache read failed for ${cacheKey}`, cacheError);
  }

  const stats = await calculateLeaderDailyStats(leaderId, date);

  try {
    await redis.set(cacheKey, JSON.stringify(stats), "EX", CACHE_TTL.DAILY_STATS);
  } catch (cacheError) {
    logger.warn("COPY_TRADING", `Cache write failed for ${cacheKey}`, cacheError);
  }

  return stats;
}

// ============================================================================
// BATCH OPERATIONS (for leaderboard)
// ============================================================================

/**
 * Calculate stats for multiple leaders at once (optimized for leaderboards)
 * Returns a map of leaderId -> stats
 */
export async function calculateBatchLeaderStats(
  leaderIds: string[]
): Promise<Map<string, LeaderStats>> {
  try {
    const statsMap = new Map<string, LeaderStats>();

    // Get all followers for these leaders in one query
    const followers = await models.copyTradingFollower.findAll({
      where: {
        leaderId: { [Op.in]: leaderIds },
        status: { [Op.ne]: "STOPPED" },
      },
      attributes: ["leaderId"],
      raw: true,
    });

    // Count followers per leader
    const followerCounts = new Map<string, number>();
    for (const follower of followers as any[]) {
      const count = followerCounts.get(follower.leaderId) || 0;
      followerCounts.set(follower.leaderId, count + 1);
    }

    // Get all trades for these leaders in one query
    const trades = await models.copyTradingTrade.findAll({
      where: {
        leaderId: { [Op.in]: leaderIds },
        isLeaderTrade: true,
        status: "CLOSED",
      },
      attributes: ["leaderId", "profit", "cost"],
      raw: true,
    });

    // Group trades by leader
    const tradesByLeader = new Map<string, any[]>();
    for (const trade of trades as any[]) {
      const leaderTrades = tradesByLeader.get(trade.leaderId) || [];
      leaderTrades.push(trade);
      tradesByLeader.set(trade.leaderId, leaderTrades);
    }

    // Calculate stats for each leader
    for (const leaderId of leaderIds) {
      const leaderTrades = tradesByLeader.get(leaderId) || [];
      const totalTrades = leaderTrades.length;
      const winningTrades = leaderTrades.filter((t) => (t.profit || 0) > 0).length;
      const totalProfit = leaderTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
      const totalVolume = leaderTrades.reduce((sum, t) => sum + (t.cost || 0), 0);

      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      const roi = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;

      statsMap.set(leaderId, {
        totalFollowers: followerCounts.get(leaderId) || 0,
        totalTrades,
        winRate: Math.round(winRate * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
        roi: Math.round(roi * 100) / 100,
      });
    }

    return statsMap;
  } catch (error) {
    logger.error("COPY_TRADING", "Failed to calculate batch leader stats", error);
    throw error;
  }
}

// ============================================================================
// CACHE INVALIDATION (call when trades are created/closed)
// ============================================================================

/**
 * Invalidate all related caches when a trade is closed
 * Call this from the trade processing cron job
 */
export async function invalidateTradeRelatedCaches(
  leaderId: string,
  followerId?: string,
  symbol?: string
): Promise<void> {
  const promises: Promise<void>[] = [];

  // Always invalidate leader stats
  promises.push(invalidateLeaderStatsCache(leaderId));

  // Invalidate follower stats if this is a follower trade
  if (followerId) {
    promises.push(invalidateFollowerStatsCache(followerId));

    // Invalidate allocation stats if symbol is provided
    if (symbol) {
      promises.push(invalidateAllocationStatsCache(followerId, symbol));
    }
  }

  await Promise.all(promises);
}

/**
 * Pre-warm cache for popular leaders (optional background job)
 */
export async function prewarmLeaderStatsCache(leaderIds: string[]): Promise<void> {
  logger.info("COPY_TRADING", `Pre-warming stats cache for ${leaderIds.length} leaders`);

  for (const leaderId of leaderIds) {
    try {
      await getLeaderStats(leaderId);
    } catch (error) {
      logger.warn("COPY_TRADING", `Failed to pre-warm cache for leader ${leaderId}`, error);
    }
  }
}
