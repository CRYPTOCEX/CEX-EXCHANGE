// Copy Trading Utility Functions
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import { CacheManager } from "@b/utils/cache";
import { calculateBatchLeaderStats } from "./stats-calculator";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type LeaderStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED"
  | "INACTIVE";
export type FollowerStatus = "ACTIVE" | "PAUSED" | "STOPPED";
export type CopyMode = "PROPORTIONAL" | "FIXED_AMOUNT" | "FIXED_RATIO";
export type TradingStyle = "SCALPING" | "DAY_TRADING" | "SWING" | "POSITION";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

// ============================================================================
// LEADER FUNCTIONS
// ============================================================================

/**
 * Get leader by ID with optional includes
 */
export async function getLeaderById(
  leaderId: string,
  includes: string[] = []
): Promise<any> {
  const includeOptions: any[] = [];

  if (includes.includes("user")) {
    includeOptions.push({
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    });
  }

  if (includes.includes("followers")) {
    includeOptions.push({
      model: models.copyTradingFollower,
      as: "followers",
      where: { status: "ACTIVE" },
      required: false,
    });
  }

  return models.copyTradingLeader.findByPk(leaderId, {
    include: includeOptions,
  });
}

/**
 * Get leader by user ID
 */
export async function getLeaderByUserId(userId: string): Promise<any> {
  return models.copyTradingLeader.findOne({
    where: { userId },
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });
}

/**
 * Check if user can become a leader
 */
export async function checkLeaderEligibility(
  userId: string
): Promise<{ eligible: boolean; reason?: string }> {
  // Check platform status first
  const platformStatus = await checkPlatformStatus();
  if (!platformStatus.available) {
    return { eligible: false, reason: platformStatus.reason };
  }

  // Check if already a leader
  const existingLeader = await models.copyTradingLeader.findOne({
    where: { userId },
  });

  if (existingLeader) {
    if (existingLeader.status === "ACTIVE") {
      return { eligible: false, reason: "You are already an active leader" };
    }
    if (existingLeader.status === "PENDING") {
      return {
        eligible: false,
        reason: "Your leader application is pending review",
      };
    }
    if (existingLeader.status === "SUSPENDED") {
      return {
        eligible: false,
        reason: "Your leader account has been suspended",
      };
    }
  }

  // Check KYC status if required
  const settings = await getCopyTradingSettings();
  if (settings.requireKYC) {
    const user = await models.user.findByPk(userId);
    if (!user?.kyc?.level || user.kyc.level < 2) {
      return { eligible: false, reason: "KYC verification is required" };
    }
  }

  // Check minimum trading history
  // This would check ecosystem orders/trades
  // For now, we'll skip this check

  return { eligible: true };
}

/**
 * Update leader statistics
 */
export async function updateLeaderStats(leaderId: string): Promise<void> {
  const leader = await models.copyTradingLeader.findByPk(leaderId);
  if (!leader) return;

  // Get all closed trades for this leader
  const trades = await models.copyTradingTrade.findAll({
    where: {
      leaderId,
      isLeaderTrade: true,
      status: "CLOSED",
    },
  });

  // Calculate statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t: any) => (t.profit || 0) > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
  const totalVolume = trades.reduce((sum: number, t: any) => sum + (t.cost || 0), 0);

  // Get active followers count
  const totalFollowers = await models.copyTradingFollower.count({
    where: { leaderId, status: "ACTIVE" },
  });

  // Calculate ROI (simplified)
  const roi = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;

  await leader.update({
    totalTrades,
    winRate,
    totalProfit,
    totalVolume,
    totalFollowers,
    roi,
  });
}

// ============================================================================
// FOLLOWER FUNCTIONS
// ============================================================================

/**
 * Get follower by ID
 */
export async function getFollowerById(
  followerId: string,
  includes: string[] = []
): Promise<any> {
  const includeOptions: any[] = [];

  if (includes.includes("user")) {
    includeOptions.push({
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    });
  }

  if (includes.includes("leader")) {
    includeOptions.push({
      model: models.copyTradingLeader,
      as: "leader",
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
      ],
    });
  }

  return models.copyTradingFollower.findByPk(followerId, {
    include: includeOptions,
  });
}

/**
 * Get followers for a user
 */
export async function getFollowersByUserId(userId: string): Promise<any[]> {
  return models.copyTradingFollower.findAll({
    where: { userId },
    include: [
      {
        model: models.copyTradingLeader,
        as: "leader",
        include: [
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
        ],
      },
    ],
  });
}

/**
 * Check if user can follow a leader
 * @param userId - User ID attempting to follow
 * @param leaderId - Leader ID to follow
 * @param amount - Unused parameter (maintained for interface compatibility)
 * NOTE: Per-market minimums (minBase/minQuote) are validated per allocation
 */
export async function checkFollowEligibility(
  userId: string,
  leaderId: string,
  amount: number
): Promise<{ eligible: boolean; reason?: string }> {
  // Check platform status first
  const platformStatus = await checkPlatformStatus();
  if (!platformStatus.available) {
    return { eligible: false, reason: platformStatus.reason };
  }

  const leader = await models.copyTradingLeader.findByPk(leaderId);
  if (!leader) {
    return { eligible: false, reason: "Leader not found" };
  }

  if (leader.status !== "ACTIVE") {
    return { eligible: false, reason: "Leader is not active" };
  }

  if (leader.userId === userId) {
    return { eligible: false, reason: "You cannot follow yourself" };
  }

  // Check if already following
  const existingFollow = await models.copyTradingFollower.findOne({
    where: { userId, leaderId, status: { [Op.ne]: "STOPPED" } },
  });
  if (existingFollow) {
    return { eligible: false, reason: "You are already following this leader" };
  }

  // Minimum requirements are enforced per-market via minBase/minQuote
  // which are validated in the allocation endpoints

  // Get settings for limit checks
  const settings = await getCopyTradingSettings();

  // Check if leader has room for more followers (per-leader limit)
  const followerCount = await models.copyTradingFollower.count({
    where: { leaderId, status: "ACTIVE" },
  });

  // Check both per-leader limit and global limit
  const effectiveMaxFollowers = Math.min(
    leader.maxFollowers || settings.maxFollowersPerLeader,
    settings.maxFollowersPerLeader
  );

  if (followerCount >= effectiveMaxFollowers) {
    return { eligible: false, reason: "Leader has reached maximum followers" };
  }

  // Check settings for max leaders per follower
  const userFollowCount = await models.copyTradingFollower.count({
    where: { userId, status: { [Op.in]: ["ACTIVE", "PAUSED"] } },
  });
  if (userFollowCount >= settings.maxLeadersPerFollower) {
    return {
      eligible: false,
      reason: `You can only follow up to ${settings.maxLeadersPerFollower} leaders`,
    };
  }

  return { eligible: true };
}

/**
 * Update follower statistics
 */
export async function updateFollowerStats(followerId: string): Promise<void> {
  const follower = await models.copyTradingFollower.findByPk(followerId);
  if (!follower) return;

  // Get all closed trades for this follower
  const trades = await models.copyTradingTrade.findAll({
    where: {
      followerId,
      status: "CLOSED",
    },
  });

  // Calculate statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t: any) => (t.profit || 0) > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);

  // ROI is now calculated from allocations, not at follower level

  await follower.update({
    totalTrades,
    winRate,
    totalProfit,
    // roi removed - calculated from allocations
  });
}

// ============================================================================
// WALLET FUNCTIONS
// ============================================================================

/**
 * Get user's wallet balance for a specific currency
 * @param userId - The user ID
 * @param currency - The currency code (required - do not default to USDT)
 */
export async function getUserWalletBalance(
  userId: string,
  currency: string
): Promise<number> {
  if (!currency) {
    throw new Error("Currency is required for getUserWalletBalance");
  }
  const wallet = await models.wallet.findOne({
    where: {
      userId,
      currency,
      type: "ECO",
    },
  });

  if (!wallet) return 0;
  return parseFloat(wallet.balance?.toString() || "0");
}

// ============================================================================
// TRANSACTION FUNCTIONS
// ============================================================================

/**
 * Create a copy trading transaction
 * @param data - Transaction data (currency is required)
 * @param transaction - Optional Sequelize transaction
 */
export async function createCopyTradingTransaction(
  data: {
    userId: string;
    leaderId?: string;
    followerId?: string;
    tradeId?: string;
    type: string;
    amount: number;
    currency: string; // Required - no default
    fee?: number;
    balanceBefore: number;
    balanceAfter: number;
    description?: string;
    metadata?: any;
  },
  transaction?: any
): Promise<any> {
  if (!data.currency) {
    throw new Error("Currency is required for createCopyTradingTransaction");
  }
  return models.copyTradingTransaction.create(
    {
      ...data,
      fee: data.fee || 0,
      status: "COMPLETED",
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
    transaction ? { transaction } : undefined
  );
}

// ============================================================================
// SETTINGS FUNCTIONS
// ============================================================================

interface CopyTradingSettings {
  enabled: boolean;
  maintenanceMode: boolean;
  requireKYC: boolean;
  platformFeePercent: number;
  minLeaderTrades: number;
  minLeaderWinRate: number;
  minLeaderAccountAge: number;
  maxLeadersPerFollower: number;
  minAllocationAmount: number;
  maxAllocationPercent: number;
  maxFollowersPerLeader: number;
  maxProfitSharePercent: number;
  maxCopyLatencyMs: number;
  enableMarketOrders: boolean;
  enableLimitOrders: boolean;
  maxDailyLossDefault: number;
  maxPositionDefault: number;
  enableAutoRetry: boolean;
  maxRetryAttempts: number;
  enableProfitShare: boolean;
  leaderApplicationRateLimit: number;
}

const DEFAULT_SETTINGS: CopyTradingSettings = {
  enabled: true,
  maintenanceMode: false,
  requireKYC: false,
  platformFeePercent: 2,
  minLeaderTrades: 10,
  minLeaderWinRate: 50,
  minLeaderAccountAge: 30,
  maxLeadersPerFollower: 10,
  minAllocationAmount: 50,
  maxAllocationPercent: 50,
  maxFollowersPerLeader: 1000,
  maxProfitSharePercent: 50,
  maxCopyLatencyMs: 5000,
  enableMarketOrders: true,
  enableLimitOrders: true,
  maxDailyLossDefault: 20,
  maxPositionDefault: 20,
  enableAutoRetry: true,
  maxRetryAttempts: 3,
  enableProfitShare: true,
  leaderApplicationRateLimit: 10,
};

/**
 * Parse a setting value to boolean
 */
function parseBool(value: any, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return Boolean(value);
}

/**
 * Parse a setting value to number
 */
function parseNum(value: any, defaultValue: number): number {
  if (value === undefined || value === null) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Get copy trading settings from global settings cache
 */
export async function getCopyTradingSettings(): Promise<CopyTradingSettings> {
  const cacheManager = CacheManager.getInstance();
  const globalSettings = await cacheManager.getSettings();

  return {
    enabled: parseBool(globalSettings.get("copyTradingEnabled"), DEFAULT_SETTINGS.enabled),
    maintenanceMode: parseBool(globalSettings.get("copyTradingMaintenanceMode"), DEFAULT_SETTINGS.maintenanceMode),
    requireKYC: parseBool(globalSettings.get("copyTradingRequireKYC"), DEFAULT_SETTINGS.requireKYC),
    platformFeePercent: parseNum(globalSettings.get("copyTradingPlatformFeePercent"), DEFAULT_SETTINGS.platformFeePercent),
    minLeaderTrades: parseNum(globalSettings.get("copyTradingMinLeaderTrades"), DEFAULT_SETTINGS.minLeaderTrades),
    minLeaderWinRate: parseNum(globalSettings.get("copyTradingMinLeaderWinRate"), DEFAULT_SETTINGS.minLeaderWinRate),
    minLeaderAccountAge: parseNum(globalSettings.get("copyTradingMinLeaderAccountAge"), DEFAULT_SETTINGS.minLeaderAccountAge),
    maxLeadersPerFollower: parseNum(globalSettings.get("copyTradingMaxLeadersPerFollower"), DEFAULT_SETTINGS.maxLeadersPerFollower),
    minAllocationAmount: parseNum(globalSettings.get("copyTradingMinAllocationAmount"), DEFAULT_SETTINGS.minAllocationAmount),
    maxAllocationPercent: parseNum(globalSettings.get("copyTradingMaxAllocationPercent"), DEFAULT_SETTINGS.maxAllocationPercent),
    maxFollowersPerLeader: parseNum(globalSettings.get("copyTradingMaxFollowersPerLeader"), DEFAULT_SETTINGS.maxFollowersPerLeader),
    maxProfitSharePercent: parseNum(globalSettings.get("copyTradingMaxProfitSharePercent"), DEFAULT_SETTINGS.maxProfitSharePercent),
    maxCopyLatencyMs: parseNum(globalSettings.get("copyTradingMaxCopyLatencyMs"), DEFAULT_SETTINGS.maxCopyLatencyMs),
    enableMarketOrders: parseBool(globalSettings.get("copyTradingEnableMarketOrders"), DEFAULT_SETTINGS.enableMarketOrders),
    enableLimitOrders: parseBool(globalSettings.get("copyTradingEnableLimitOrders"), DEFAULT_SETTINGS.enableLimitOrders),
    maxDailyLossDefault: parseNum(globalSettings.get("copyTradingMaxDailyLossDefault"), DEFAULT_SETTINGS.maxDailyLossDefault),
    maxPositionDefault: parseNum(globalSettings.get("copyTradingMaxPositionDefault"), DEFAULT_SETTINGS.maxPositionDefault),
    enableAutoRetry: parseBool(globalSettings.get("copyTradingEnableAutoRetry"), DEFAULT_SETTINGS.enableAutoRetry),
    maxRetryAttempts: parseNum(globalSettings.get("copyTradingMaxRetryAttempts"), DEFAULT_SETTINGS.maxRetryAttempts),
    enableProfitShare: parseBool(globalSettings.get("copyTradingEnableProfitShare"), DEFAULT_SETTINGS.enableProfitShare),
    leaderApplicationRateLimit: parseNum(globalSettings.get("copyTradingLeaderApplicationRateLimit"), DEFAULT_SETTINGS.leaderApplicationRateLimit),
  };
}

/**
 * Check if copy trading platform is available
 */
export async function checkPlatformStatus(): Promise<{ available: boolean; reason?: string }> {
  const settings = await getCopyTradingSettings();

  if (!settings.enabled) {
    return { available: false, reason: "Copy trading is currently disabled" };
  }

  if (settings.maintenanceMode) {
    return { available: false, reason: "Copy trading is currently under maintenance" };
  }

  return { available: true };
}

// ============================================================================
// AUDIT LOG FUNCTIONS
// ============================================================================

/**
 * Create an audit log entry
 * @param data - Audit log data
 * @param transaction - Optional Sequelize transaction
 */
export async function createAuditLog(
  data: {
    entityType: string;
    entityId: string;
    action: string;
    oldValue?: any;
    newValue?: any;
    userId?: string;
    adminId?: string;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    metadata?: any;
  },
  transaction?: any
): Promise<any> {
  return models.copyTradingAuditLog.create(
    {
      ...data,
      oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
      newValue: data.newValue ? JSON.stringify(data.newValue) : null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
    transaction ? { transaction } : undefined
  );
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate profit share
 */
export function calculateProfitShare(
  profit: number,
  profitSharePercent: number,
  platformFeePercent: number
): { leaderShare: number; platformFee: number; followerNet: number } {
  if (profit <= 0) {
    return { leaderShare: 0, platformFee: 0, followerNet: profit };
  }

  const platformFee = profit * (platformFeePercent / 100);
  const afterPlatformFee = profit - platformFee;
  const leaderShare = afterPlatformFee * (profitSharePercent / 100);
  const followerNet = afterPlatformFee - leaderShare;

  return { leaderShare, platformFee, followerNet };
}

// ============================================================================
// RANKING FUNCTIONS
// ============================================================================

export type RankingPeriod = "24h" | "7d" | "30d" | "all";

/**
 * Get leader rankings
 */
export async function getLeaderRankings(
  period: RankingPeriod = "30d",
  limit: number = 50
): Promise<any[]> {
  // Get all active public leaders
  const leaders = await models.copyTradingLeader.findAll({
    where: {
      status: "ACTIVE",
      isPublic: true,
    },
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "avatar"],
      },
    ],
  });

  // Calculate stats for all leaders
  const leaderIds = (leaders as any[]).map((l) => l.id);
  const statsMap = leaderIds.length > 0
    ? await calculateBatchLeaderStats(leaderIds)
    : new Map();

  // Map leaders with stats and sort by ROI
  const leadersWithStats = (leaders as any[]).map((l) => {
    const stats = statsMap.get(l.id) || { roi: 0, winRate: 0, totalFollowers: 0, totalProfit: 0, totalTrades: 0, totalVolume: 0 };
    return {
      ...l.toJSON(),
      roi: stats.roi,
      winRate: stats.winRate,
      totalFollowers: stats.totalFollowers,
      totalProfit: stats.totalProfit,
      totalTrades: stats.totalTrades,
      totalVolume: stats.totalVolume,
    };
  });

  // Sort by ROI descending and limit
  leadersWithStats.sort((a, b) => b.roi - a.roi);
  return leadersWithStats.slice(0, limit);
}

// ============================================================================
// RE-EXPORTS FROM OTHER MODULES
// ============================================================================

// Trade Listener
export {
  LeaderTradeListener,
  handleOrderCreated,
  isActiveLeader,
  getLeaderInfo
} from "./tradeListener";

// Copy Processor
export {
  processCopyOrder,
  processCopyOrdersBatch,
  processCopyOrderWithRetry,
  calculateCopyAmount as calculateFollowerCopyAmount
} from "./copyProcessor";

// Fill Monitor
export {
  FillMonitor,
  closeTrade,
  closeLeaderTrade,
  handleOrderFilled
} from "./fillMonitor";

// Execution Utilities
export {
  executeOrder,
  cancelCopyOrder,
  checkPositionSize,
  checkStopLevels,
  monitorStopLevels as monitorTradeStopLevels,
  calculateExpectedSlippage,
  checkSlippageLimit
} from "./execution";

// Profit Share
export {
  calculatePnL,
  calculateUnrealizedPnL,
  distributeProfitShare,
  calculateProfitShareBreakdown,
  processPendingProfitDistributions,
  getLeaderEarnings,
  getFollowerProfitSharePayments,
  previewProfitShare
} from "./profitShare";

// Daily Limits
export {
  checkDailyLimits,
  getDailyStats,
  recordTrade,
  recordLoss,
  resetDailyLimits as resetFollowerDailyLimits,
  updateFollowerLimits,
  getFollowerLimitStatus,
  checkAutoActions
} from "./dailyLimits";

// Advanced Analytics
export {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateCurrentDrawdown,
  calculateStdDev,
  calculateVolatility,
  calculateRollingVolatility,
  calculateProfitFactor,
  calculateExpectancy,
  calculatePerformanceMetrics,
  calculateDailyReturns,
  calculateMonthlyPerformance,
  calculateAlpha,
  calculateRiskAdjustedReturn
} from "./calculations";

// Security - Rate limiting and validation
export {
  copyTradingRateLimiters,
  isValidUUID,
  sanitizeString,
  validateNumber,
  validateLeaderApplication,
  validateFollowRequest,
  validateFundOperation,
  validateSubscriptionUpdate,
  validateLeaderUpdate,
  validatePagination,
  validateSort,
  throwValidationError
} from "./security";

// Notifications - User alerts and updates
export {
  notifyLeaderApplicationEvent,
  notifyLeaderNewFollower,
  notifyLeaderFollowerStopped,
  notifyFollowerSubscriptionEvent,
  notifyFollowerAllocationEvent,
  notifyFollowerTradeEvent,
  notifyFollowerRiskEvent,
  notifyProfitShareEvent,
  notifyCopyTradingAdmins
} from "./notifications";
