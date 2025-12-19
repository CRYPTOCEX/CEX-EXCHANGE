// Copy Trading WebSocket Handler - Real-time updates for copy trading
import { messageBroker, registerClient, removeClientSubscription } from "@b/handler/Websocket";
import { models } from "@b/db";
import { logger } from "@b/utils/console";
import { Op } from "sequelize";
import { calculateBatchLeaderStats } from "@b/api/(ext)/copy-trading/utils/stats-calculator";

export const metadata = {
  requiresAuth: true,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SubscriptionMessage {
  action: "SUBSCRIBE" | "UNSUBSCRIBE";
  payload: {
    channel: string;
    leaderId?: string;
  };
}

interface TradeUpdateMessage {
  type: "trade_opened" | "trade_closed" | "trade_updated";
  trade: {
    id: string;
    symbol: string;
    side: string;
    amount: number;
    price: number;
    profit?: number;
    status: string;
  };
  leaderId: string;
  followerId?: string;
}

interface LeaderUpdateMessage {
  type: "leader_stats" | "leader_trade";
  leader: {
    id: string;
    displayName: string;
    roi: number;
    winRate: number;
    totalFollowers: number;
  };
  trade?: any;
}

// ============================================================================
// COPY TRADING DATA HANDLER
// ============================================================================

class CopyTradingDataHandler {
  private static instance: CopyTradingDataHandler;
  private activeSubscriptions: Map<string, Set<string>> = new Map(); // channel -> Set<userId>

  private constructor() {}

  public static getInstance(): CopyTradingDataHandler {
    if (!CopyTradingDataHandler.instance) {
      CopyTradingDataHandler.instance = new CopyTradingDataHandler();
    }
    return CopyTradingDataHandler.instance;
  }

  /**
   * Add a subscription for a user
   */
  public async addSubscription(
    userId: string,
    channel: string,
    leaderId?: string
  ): Promise<{ success: boolean; data?: any }> {
    const subscriptionKey = leaderId ? `${channel}:${leaderId}` : channel;

    if (!this.activeSubscriptions.has(subscriptionKey)) {
      this.activeSubscriptions.set(subscriptionKey, new Set());
    }
    this.activeSubscriptions.get(subscriptionKey)!.add(userId);

    // Send initial data based on channel
    let initialData: any = null;

    switch (channel) {
      case "my_trades":
        initialData = await this.getMyTrades(userId);
        break;
      case "leader_updates":
        if (leaderId) {
          initialData = await this.getLeaderData(leaderId);
        }
        break;
      case "all_leaders":
        initialData = await this.getLeaderboard();
        break;
      case "my_subscriptions":
        initialData = await this.getMySubscriptions(userId);
        break;
    }

    logger.info(
      "COPY_TRADING_WS",
      `User ${userId} subscribed to ${subscriptionKey}`
    );

    return { success: true, data: initialData };
  }

  /**
   * Remove a subscription
   */
  public removeSubscription(
    userId: string,
    channel: string,
    leaderId?: string
  ): void {
    const subscriptionKey = leaderId ? `${channel}:${leaderId}` : channel;

    if (this.activeSubscriptions.has(subscriptionKey)) {
      this.activeSubscriptions.get(subscriptionKey)!.delete(userId);

      if (this.activeSubscriptions.get(subscriptionKey)!.size === 0) {
        this.activeSubscriptions.delete(subscriptionKey);
      }

      logger.info(
        "COPY_TRADING_WS",
        `User ${userId} unsubscribed from ${subscriptionKey}`
      );
    }
  }

  /**
   * Remove all subscriptions for a user (called on disconnect)
   */
  public removeAllSubscriptions(userId: string): void {
    const keysToCleanup: string[] = [];

    for (const [key, users] of this.activeSubscriptions) {
      if (users.has(userId)) {
        users.delete(userId);
        if (users.size === 0) {
          keysToCleanup.push(key);
        }
      }
    }

    for (const key of keysToCleanup) {
      this.activeSubscriptions.delete(key);
    }

    if (keysToCleanup.length > 0) {
      logger.info(
        "COPY_TRADING_WS",
        `Cleaned up ${keysToCleanup.length} subscriptions for user ${userId}`
      );
    }
  }

  /**
   * Get user's active copy trades
   */
  private async getMyTrades(userId: string): Promise<any[]> {
    try {
      const followerRecords = await models.copyTradingFollower.findAll({
        where: { userId, status: { [Op.in]: ["ACTIVE", "PAUSED"] } },
        attributes: ["id"],
      });

      if (followerRecords.length === 0) return [];

      const followerIds = (followerRecords as any[]).map((f) => f.id);

      const trades = await models.copyTradingTrade.findAll({
        where: {
          followerId: { [Op.in]: followerIds },
          status: { [Op.in]: ["OPEN", "PENDING", "PENDING_REPLICATION"] },
        },
        include: [
          {
            model: models.copyTradingLeader,
            as: "leader",
            attributes: ["id", "displayName"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 50,
      });

      return (trades as any[]).map((t) => t.toJSON());
    } catch (error: any) {
      logger.error("COPY_TRADING_WS", "Failed to get my trades", error);
      return [];
    }
  }

  /**
   * Get leader data
   */
  private async getLeaderData(leaderId: string): Promise<any | null> {
    try {
      const leader = await models.copyTradingLeader.findByPk(leaderId, {
        include: [
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
        ],
      });

      if (!leader) return null;

      return (leader as any).toJSON();
    } catch (error: any) {
      logger.error("COPY_TRADING_WS", "Failed to get leader data", error);
      return null;
    }
  }

  /**
   * Get leaderboard
   */
  private async getLeaderboard(): Promise<any[]> {
    try {
      const leaders = await models.copyTradingLeader.findAll({
        where: { status: "ACTIVE", isPublic: true },
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
        const stats = statsMap.get(l.id) || { roi: 0, winRate: 0, totalFollowers: 0 };
        return {
          id: l.id,
          displayName: l.displayName,
          avatar: l.avatar || l.user?.avatar,
          roi: stats.roi,
          winRate: stats.winRate,
          totalFollowers: stats.totalFollowers,
          tradingStyle: l.tradingStyle,
          riskLevel: l.riskLevel,
        };
      });

      // Sort by ROI descending and limit to 50
      leadersWithStats.sort((a, b) => b.roi - a.roi);
      return leadersWithStats.slice(0, 50);
    } catch (error: any) {
      logger.error("COPY_TRADING_WS", "Failed to get leaderboard", error);
      return [];
    }
  }

  /**
   * Get user's subscriptions (leaders they follow)
   */
  private async getMySubscriptions(userId: string): Promise<any[]> {
    try {
      const subscriptions = await models.copyTradingFollower.findAll({
        where: { userId, status: { [Op.in]: ["ACTIVE", "PAUSED"] } },
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

      // Get stats for all leaders in these subscriptions
      const leaderIds = (subscriptions as any[])
        .filter((s) => s.leader)
        .map((s) => s.leader.id);
      const leaderStatsMap = leaderIds.length > 0
        ? await calculateBatchLeaderStats(leaderIds)
        : new Map();

      return (subscriptions as any[]).map((s) => {
        const leaderStats = s.leader ? leaderStatsMap.get(s.leader.id) : null;
        return {
          id: s.id,
          status: s.status,
          leader: s.leader
            ? {
                id: s.leader.id,
                displayName: s.leader.displayName,
                avatar: s.leader.avatar || s.leader.user?.avatar,
                roi: leaderStats?.roi || 0,
                winRate: leaderStats?.winRate || 0,
              }
            : null,
        };
      });
    } catch (error: any) {
      logger.error("COPY_TRADING_WS", "Failed to get my subscriptions", error);
      return [];
    }
  }
}

// Export the handler instance
export const copyTradingHandler = CopyTradingDataHandler.getInstance();

// ============================================================================
// WEBSOCKET MESSAGE HANDLER
// ============================================================================

export default async (ws: any, message: any) => {
  // Parse the incoming message if it's a string
  if (typeof message === "string") {
    try {
      message = JSON.parse(message);
    } catch (e) {
      return { error: "Invalid message format" };
    }
  }

  const userId = ws.user?.id;
  if (!userId) {
    return { error: "Authentication required" };
  }

  const { action, payload } = message;
  const { channel, leaderId } = payload || {};

  if (!channel) {
    return { error: "Channel is required" };
  }

  const handler = CopyTradingDataHandler.getInstance();

  if (action === "SUBSCRIBE") {
    const result = await handler.addSubscription(userId, channel, leaderId);
    return {
      subscribed: channel,
      leaderId,
      data: result.data,
    };
  } else if (action === "UNSUBSCRIBE") {
    handler.removeSubscription(userId, channel, leaderId);
    return {
      unsubscribed: channel,
      leaderId,
    };
  }

  return { error: "Unknown action" };
};

// ============================================================================
// HANDLE CLIENT DISCONNECT
// ============================================================================

export const onClose = (ws: any, route: string, clientId: string) => {
  const handler = CopyTradingDataHandler.getInstance();
  handler.removeAllSubscriptions(clientId);
};

// ============================================================================
// BROADCAST FUNCTIONS (for use by other modules)
// ============================================================================

/**
 * Broadcast a trade update to relevant subscribers
 */
export function broadcastTradeUpdate(
  trade: any,
  eventType: "opened" | "closed" | "updated"
): void {
  const message: TradeUpdateMessage = {
    type: `trade_${eventType}` as any,
    trade: {
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      amount: trade.amount,
      price: trade.price,
      profit: trade.profit,
      status: trade.status,
    },
    leaderId: trade.leaderId,
    followerId: trade.followerId,
  };

  // Broadcast to leader's subscribers
  messageBroker.broadcastToSubscribedClients(
    `/api/ext/copy-trading`,
    { channel: "leader_updates", leaderId: trade.leaderId },
    { stream: "leader_trade", data: message }
  );

  // Broadcast to follower if applicable
  if (trade.followerId && trade.follower?.userId) {
    messageBroker.broadcastToSubscribedClients(
      `/api/ext/copy-trading`,
      { channel: "my_trades", userId: trade.follower.userId },
      { stream: "my_trade", data: message }
    );
  }
}

/**
 * Broadcast leader stats update
 * @param leader - Leader object with id and displayName
 * @param stats - Calculated stats (roi, winRate, totalFollowers) from stats-calculator
 */
export function broadcastLeaderUpdate(
  leader: { id: string; displayName: string },
  stats: { roi: number; winRate: number; totalFollowers: number }
): void {
  const message: LeaderUpdateMessage = {
    type: "leader_stats",
    leader: {
      id: leader.id,
      displayName: leader.displayName,
      roi: stats.roi,
      winRate: stats.winRate,
      totalFollowers: stats.totalFollowers,
    },
  };

  // Broadcast to leader's subscribers
  messageBroker.broadcastToSubscribedClients(
    `/api/ext/copy-trading`,
    { channel: "leader_updates", leaderId: leader.id },
    { stream: "leader_stats", data: message }
  );

  // Broadcast to leaderboard subscribers
  messageBroker.broadcastToSubscribedClients(
    `/api/ext/copy-trading`,
    { channel: "all_leaders" },
    { stream: "leaderboard_update", data: message }
  );
}

/**
 * Broadcast leaderboard update
 */
export async function broadcastLeaderboard(): Promise<void> {
  try {
    const leaders = await models.copyTradingLeader.findAll({
      where: { status: "ACTIVE", isPublic: true },
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
      const stats = statsMap.get(l.id) || { roi: 0, winRate: 0, totalFollowers: 0 };
      return {
        id: l.id,
        displayName: l.displayName,
        avatar: l.avatar || l.user?.avatar,
        roi: stats.roi,
        winRate: stats.winRate,
        totalFollowers: stats.totalFollowers,
        tradingStyle: l.tradingStyle,
        riskLevel: l.riskLevel,
      };
    });

    // Sort by ROI descending and limit to 50
    leadersWithStats.sort((a, b) => b.roi - a.roi);
    const leaderboard = leadersWithStats.slice(0, 50);

    messageBroker.broadcastToSubscribedClients(
      `/api/ext/copy-trading`,
      { channel: "all_leaders" },
      { stream: "leaderboard", data: leaderboard }
    );
  } catch (error: any) {
    logger.error("COPY_TRADING_WS", "Failed to broadcast leaderboard", error);
  }
}

/**
 * Broadcast notification to a specific user
 */
export function broadcastUserNotification(
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }
): void {
  messageBroker.broadcastToSubscribedClients(
    `/api/ext/copy-trading`,
    { channel: "my_trades", userId },
    { stream: "notification", data: notification }
  );
}

/**
 * Broadcast follower subscription status change
 */
export function broadcastSubscriptionUpdate(
  followerId: string,
  status: string,
  follower: { userId: string; leaderId: string }
): void {
  const message = {
    type: "subscription_update",
    followerId,
    status,
    leaderId: follower.leaderId,
  };

  // Broadcast to the follower
  messageBroker.broadcastToSubscribedClients(
    `/api/ext/copy-trading`,
    { channel: "my_trades", userId: follower.userId },
    { stream: "subscription_update", data: message }
  );
}
