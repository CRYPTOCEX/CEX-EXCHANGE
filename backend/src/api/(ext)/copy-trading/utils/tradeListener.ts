// Trade Listener - Listen for leader orders in real-time
import { models, sequelize } from "@b/db";
import { Op, Transaction } from "sequelize";
import { logger } from "@b/utils/console";
import { getWalletByUserIdAndCurrency } from "@b/api/(ext)/ecosystem/utils/wallet";
import { createAuditLog } from "./index";
import { processCopyOrder } from "./copyProcessor";
import { checkDailyLimits } from "./dailyLimits";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LeaderTradeEvent {
  orderId: string;
  userId: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  amount: number;
  price: number;
  status: string;
  createdAt: Date;
}

interface ProcessingResult {
  success: boolean;
  tradeId?: string;
  followersProcessed?: number;
  error?: string;
}

// ============================================================================
// TRADE LISTENER CLASS
// ============================================================================

export class LeaderTradeListener {
  private static instance: LeaderTradeListener | null = null;
  private isProcessing: boolean = false;
  private pendingEvents: LeaderTradeEvent[] = [];
  private processInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): LeaderTradeListener {
    if (!LeaderTradeListener.instance) {
      LeaderTradeListener.instance = new LeaderTradeListener();
    }
    return LeaderTradeListener.instance;
  }

  /**
   * Start the trade listener
   */
  public start(intervalMs: number = 1000): void {
    if (this.processInterval) {
      return; // Already running
    }

    this.processInterval = setInterval(async () => {
      await this.processPendingEvents();
    }, intervalMs);

    logger.info("COPY_TRADING", "LeaderTradeListener started");
  }

  /**
   * Stop the trade listener
   */
  public stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    logger.info("COPY_TRADING", "LeaderTradeListener stopped");
  }

  /**
   * Handle a new order event from the ecosystem
   */
  public async onOrderCreated(event: LeaderTradeEvent): Promise<ProcessingResult> {
    try {
      // Check if the user is an active leader
      const leader = await models.copyTradingLeader.findOne({
        where: {
          userId: event.userId,
          status: "ACTIVE",
        },
      });

      if (!leader) {
        return { success: true }; // Not a leader, skip silently
      }

      const leaderData = leader as any;

      // Check if leader has any active followers
      const activeFollowers = await models.copyTradingFollower.count({
        where: {
          leaderId: leaderData.id,
          status: "ACTIVE",
        },
      });

      if (activeFollowers === 0) {
        return { success: true }; // No followers, skip
      }

      // Create leader trade record
      const leaderTrade = await models.copyTradingTrade.create({
        leaderId: leaderData.id,
        symbol: event.symbol,
        side: event.side,
        type: event.type,
        amount: event.amount,
        price: event.price,
        cost: event.side === "BUY" ? event.amount * event.price : event.amount,
        fee: 0,
        feeCurrency: event.symbol.split("/")[1] || "USDT",
        status: "PENDING",
        isLeaderTrade: true,
        leaderOrderId: event.orderId,
        executedAmount: 0,
        executedPrice: 0,
      });

      const tradeData = leaderTrade as any;

      // Get leader's balance for proportional calculations
      const [, quoteCurrency] = event.symbol.split("/");
      const leaderWallet = await getWalletByUserIdAndCurrency(
        event.userId,
        quoteCurrency
      );
      const leaderBalance = leaderWallet
        ? parseFloat(leaderWallet.balance.toString())
        : 0;

      // Process copy orders for all followers
      const result = await this.processLeaderTrade(
        tradeData,
        leaderData,
        leaderBalance
      );

      // Create audit log
      await createAuditLog({
        entityType: "copyTradingTrade",
        entityId: tradeData.id,
        action: "TRADE_CREATED",
        userId: event.userId,
        metadata: {
          symbol: event.symbol,
          side: event.side,
          amount: event.amount,
          price: event.price,
          followers: activeFollowers,
          processed: result.followersProcessed,
        },
      });

      return {
        success: true,
        tradeId: tradeData.id,
        followersProcessed: result.followersProcessed,
      };
    } catch (error: any) {
      logger.error("COPY_TRADING", "Error in LeaderTradeListener.onOrderCreated", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a leader trade and copy to all followers using queue
   */
  private async processLeaderTrade(
    trade: any,
    leader: any,
    leaderBalance: number
  ): Promise<{ followersProcessed: number; errors: string[] }> {
    try {
      // Queue the trade for async processing (non-blocking)
      const { queueLeaderTrade } = await import("./copyQueue");
      await queueLeaderTrade(trade.id, leader.id, trade.symbol, 0);

      // Return immediately - actual processing happens in the background
      logger.info("COPY_TRADING", `Queued leader trade ${trade.id} for processing`);

      return { followersProcessed: 0, errors: [] };
    } catch (error: any) {
      logger.error("COPY_TRADING", "Failed to queue leader trade", error);
      return { followersProcessed: 0, errors: [error.message] };
    }
  }

  /**
   * Process pending events from the queue
   */
  private async processPendingEvents(): Promise<void> {
    if (this.isProcessing || this.pendingEvents.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.pendingEvents.length > 0) {
        const event = this.pendingEvents.shift();
        if (event) {
          await this.onOrderCreated(event);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Queue an event for processing
   */
  public queueEvent(event: LeaderTradeEvent): void {
    this.pendingEvents.push(event);
  }
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

/**
 * Handle order created event - entry point from ecosystem
 */
export async function handleOrderCreated(
  orderId: string,
  userId: string,
  symbol: string,
  side: "BUY" | "SELL",
  type: "MARKET" | "LIMIT",
  amount: number,
  price: number
): Promise<ProcessingResult> {
  const listener = LeaderTradeListener.getInstance();
  return listener.onOrderCreated({
    orderId,
    userId,
    symbol,
    side,
    type,
    amount,
    price,
    status: "NEW",
    createdAt: new Date(),
  });
}

/**
 * Check if a user is an active leader
 */
export async function isActiveLeader(userId: string): Promise<boolean> {
  const leader = await models.copyTradingLeader.findOne({
    where: {
      userId,
      status: "ACTIVE",
    },
  });
  return !!leader;
}

/**
 * Get leader info for a user
 */
export async function getLeaderInfo(
  userId: string
): Promise<{ id: string; displayName: string; followerCount: number } | null> {
  const leader = await models.copyTradingLeader.findOne({
    where: { userId, status: "ACTIVE" },
  });

  if (!leader) return null;

  const leaderData = leader as any;
  const followerCount = await models.copyTradingFollower.count({
    where: { leaderId: leaderData.id, status: "ACTIVE" },
  });

  return {
    id: leaderData.id,
    displayName: leaderData.displayName,
    followerCount,
  };
}

/**
 * Handle order cancellation event - entry point from ecosystem
 * Cancels all associated follower copy trades when a leader cancels their order
 */
export async function handleOrderCancelled(
  orderId: string,
  userId: string,
  symbol: string
): Promise<{ success: boolean; cancelledCount?: number; error?: string }> {
  try {
    // Check if user is an active leader
    const leader = await models.copyTradingLeader.findOne({
      where: {
        userId,
        status: "ACTIVE",
      },
    });

    if (!leader) {
      return { success: true }; // Not a leader, skip silently
    }

    const leaderData = leader as any;

    // Find the leader trade associated with this order
    const leaderTrade = await models.copyTradingTrade.findOne({
      where: {
        leaderId: leaderData.id,
        leaderOrderId: orderId,
        isLeaderTrade: true,
        status: { [Op.in]: ["PENDING", "OPEN", "PARTIALLY_FILLED"] },
      },
    });

    if (!leaderTrade) {
      return { success: true }; // No active trade found
    }

    const tradeData = leaderTrade as any;

    logger.info("COPY_TRADING", `Leader cancelled order ${orderId}, cancelling copy trades for trade ${tradeData.id}`);

    // Update leader trade status to CANCELLED
    await leaderTrade.update({
      status: "CANCELLED",
      closedAt: new Date(),
    });

    // Find and cancel all associated follower trades
    const followerTrades = await models.copyTradingTrade.findAll({
      where: {
        leaderTradeId: tradeData.id,
        isLeaderTrade: false,
        status: { [Op.in]: ["PENDING", "OPEN", "PARTIALLY_FILLED"] },
      },
      include: [
        {
          model: models.copyTradingFollower,
          as: "follower",
          include: [{ model: models.user, as: "user" }],
        },
      ],
    });

    let cancelledCount = 0;

    // Cancel each follower trade
    for (const followerTrade of followerTrades as any[]) {
      try {
        await followerTrade.update({
          status: "CANCELLED",
          closedAt: new Date(),
        });

        // If the follower trade has an order, cancel it in the ecosystem
        if (followerTrade.leaderOrderId && followerTrade.follower?.userId) {
          try {
            // Try to cancel the follower's ecosystem order
            const { cancelOrderByUuid } = await import(
              "@b/api/(ext)/ecosystem/utils/scylla/queries"
            );
            const { getOrderByUuid } = await import(
              "@b/api/(ext)/ecosystem/utils/scylla/queries"
            );

            // Find the order timestamp
            const order = await getOrderByUuid(
              followerTrade.follower.userId,
              followerTrade.leaderOrderId,
              new Date(followerTrade.createdAt).toISOString()
            );

            if (order && order.status === "OPEN") {
              await cancelOrderByUuid(
                followerTrade.follower.userId,
                followerTrade.leaderOrderId,
                new Date(followerTrade.createdAt).toISOString(),
                symbol,
                BigInt(order.price),
                order.side,
                BigInt(order.amount)
              );
            }
          } catch (cancelError: any) {
            logger.warn("COPY_TRADING", `Failed to cancel ecosystem order for follower ${followerTrade.follower?.userId}: ${cancelError.message}`);
          }
        }

        // Release allocation used amounts
        const allocation = await models.copyTradingFollowerAllocation.findOne({
          where: {
            followerId: followerTrade.followerId,
            symbol,
            isActive: true,
          },
        });

        if (allocation) {
          const allocData = allocation as any;
          if (followerTrade.side === "BUY") {
            // Release quote currency
            await allocation.update({
              quoteUsedAmount: Math.max(0, allocData.quoteUsedAmount - (followerTrade.cost || 0)),
            });
          } else {
            // Release base currency
            await allocation.update({
              baseUsedAmount: Math.max(0, allocData.baseUsedAmount - (followerTrade.amount || 0)),
            });
          }
        }

        cancelledCount++;
      } catch (followerError: any) {
        logger.error("COPY_TRADING", `Failed to cancel follower trade ${followerTrade.id}: ${followerError.message}`);
      }
    }

    // Create audit log
    await createAuditLog({
      entityType: "copyTradingTrade",
      entityId: tradeData.id,
      action: "TRADE_CANCELLED",
      userId,
      metadata: {
        symbol,
        orderId,
        cancelledFollowers: cancelledCount,
      },
    });

    logger.info("COPY_TRADING", `Cancelled ${cancelledCount} follower trades for leader trade ${tradeData.id}`);

    return { success: true, cancelledCount };
  } catch (error: any) {
    logger.error("COPY_TRADING", "Error in handleOrderCancelled", error);
    return { success: false, error: error.message };
  }
}
