import { models, sequelize } from "@b/db";
import { replicateLeaderTrade } from "./cron";
import {
  getWalletByUserIdAndCurrency,
  updateWalletBalance,
} from "@b/api/(ext)/ecosystem/utils/wallet";
import { createAuditLog } from "./index";
import { logger } from "@b/utils/console";
import { invalidateLeaderStatsCache, invalidateFollowerStatsCache, invalidateAllocationStatsCache } from "./stats-calculator";

interface OrderData {
  id: string;
  userId: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: string;
  amount: number;
  price: number;
}

/**
 * Hook to be called when a user places an order in the ecosystem
 * Checks if user is a leader and creates a copy trade for replication
 */
export async function onOrderCreated(order: OrderData): Promise<void> {
  try {
    // Check if user is an active leader
    const leader = await models.copyTradingLeader.findOne({
      where: {
        userId: order.userId,
        status: "ACTIVE",
      },
    });

    if (!leader) {
      return; // User is not a leader, no action needed
    }

    const leaderData = leader as any;

    // Check if leader is trading on a declared market
    const leaderMarket = await models.copyTradingLeaderMarket.findOne({
      where: {
        leaderId: leaderData.id,
        symbol: order.symbol,
        isActive: true,
      },
    });

    if (!leaderMarket) {
      logger.warn(
        "COPY_TRADING",
        `Leader ${leaderData.id} trading on undeclared market ${order.symbol} - skipping copy`
      );
      return; // Leader is trading on an undeclared market, don't copy
    }

    // Check if leader has any active followers
    const activeFollowers = await models.copyTradingFollower.count({
      where: {
        leaderId: leaderData.id,
        status: "ACTIVE",
      },
    });

    if (activeFollowers === 0) {
      return; // No followers to replicate to
    }

    // Create leader trade record for replication
    const leaderTrade = await models.copyTradingTrade.create({
      leaderId: leaderData.id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      amount: order.amount,
      price: order.price,
      cost: order.side === "BUY" ? order.amount * order.price : order.amount,
      status: "PENDING_REPLICATION",
      orderId: order.id,
    });

    // Get leader's balance for proportional calculations
    const [, pair] = order.symbol.split("/");
    const leaderWallet = await getWalletByUserIdAndCurrency(order.userId, pair);
    const leaderBalance = leaderWallet ? parseFloat(leaderWallet.balance.toString()) : 0;

    // Trigger immediate replication (async - don't wait)
    replicateLeaderTrade(
      {
        id: (leaderTrade as any).id,
        leaderId: leaderData.id,
        symbol: order.symbol,
        side: order.side as "BUY" | "SELL",
        type: order.type,
        amount: order.amount,
        price: order.price,
        status: "PENDING_REPLICATION",
        createdAt: new Date(),
      },
      leaderBalance
    ).catch((error) => {
      logger.error("COPY_TRADING", "Failed to replicate leader trade", error);
    });

    // Create audit log
    await createAuditLog({
      userId: order.userId,
      action: "TRADE_OPEN",
      entityType: "copyTradingTrade",
      entityId: (leaderTrade as any).id,
      metadata: {
        symbol: order.symbol,
        side: order.side,
        amount: order.amount,
        price: order.price,
        followers: activeFollowers,
      },
    });
  } catch (error) {
    logger.error("COPY_TRADING", "Error in onOrderCreated hook", error);
    // Don't throw - we don't want to fail the order creation
  }
}

/**
 * Hook to be called when an order is filled/closed
 * Updates copy trades and triggers profit distribution
 */
export async function onOrderClosed(
  orderId: string,
  profit: number,
  closedAt: Date
): Promise<void> {
  try {
    // Find the leader trade associated with this order
    const leaderTrade = await models.copyTradingTrade.findOne({
      where: {
        orderId,
        followerId: null, // Leader trade
      },
    });

    if (!leaderTrade) {
      return; // Not a copy trading leader's trade
    }

    const trade = leaderTrade as any;

    // Update leader trade
    await trade.update({
      profit,
      profitPercent: trade.cost > 0 ? (profit / trade.cost) * 100 : 0,
      status: "CLOSED",
      closedAt,
    });

    // Find all follower trades that copied this
    const followerTrades = await models.copyTradingTrade.findAll({
      where: {
        leaderTradeId: trade.id,
        status: { [models.Sequelize.Op.ne]: "CLOSED" },
      },
    });

    // Mark follower trades as closed (profit will be calculated when their orders close)
    for (const followerTrade of followerTrades as any[]) {
      // Note: Actual profit for follower is calculated when their order closes
      // This just marks them for processing
      await followerTrade.update({
        status: "PENDING_CLOSE",
        closedProfit: profit, // Reference profit from leader
      });
    }

    // Invalidate leader stats cache (stats are calculated on-demand)
    await invalidateLeaderStatsCache(trade.leaderId);

    // Create audit log
    await createAuditLog({
      userId: trade.leaderId,
      action: "TRADE_CLOSE",
      entityType: "copyTradingTrade",
      entityId: trade.id,
      metadata: {
        profit,
        followerTrades: followerTrades.length,
      },
    });
  } catch (error) {
    logger.error("COPY_TRADING", "Error in onOrderClosed hook", error);
  }
}

/**
 * Hook to be called when a follower's copied order is closed
 */
export async function onFollowerOrderClosed(
  orderId: string,
  profit: number,
  closedAt: Date
): Promise<void> {
  try {
    // Find the follower trade associated with this order
    const followerTrade = await models.copyTradingTrade.findOne({
      where: {
        orderId,
        followerId: { [models.Sequelize.Op.ne]: null },
      },
      include: [
        {
          model: models.copyTradingFollower,
          as: "follower",
          include: [{ model: models.copyTradingLeader, as: "leader" }],
        },
      ],
    });

    if (!followerTrade) {
      return; // Not a copy trade
    }

    const trade = followerTrade as any;
    const follower = trade.follower;
    const leader = follower?.leader;

    // Update trade with actual profit
    await trade.update({
      profit,
      profitPercent: trade.cost > 0 ? (profit / trade.cost) * 100 : 0,
      status: "CLOSED",
      closedAt,
      closedProfit: profit,
    });

    // Calculate and distribute profit shares
    if (profit > 0 && leader) {
      const platformFeePercent = 2;
      const leaderSharePercent = leader.profitSharePercent || 20;

      const platformFee = profit * (platformFeePercent / 100);
      const leaderProfit = (profit - platformFee) * (leaderSharePercent / 100);

      // Use transaction to prevent race condition on wallet balance
      await sequelize.transaction(async (t) => {
        // Currency for profit share is determined from the trade
        const profitCurrency = trade.profitCurrency || "USDT";

        // Create profit share transaction records
        await models.copyTradingTransaction.create({
          followerId: follower.id,
          type: "PROFIT_SHARE",
          amount: leaderProfit,
          currency: profitCurrency,
          description: `Leader profit share for trade ${trade.id}`,
          metadata: { tradeId: trade.id, leaderId: leader.id },
        }, { transaction: t });

        await models.copyTradingTransaction.create({
          followerId: follower.id,
          type: "PLATFORM_FEE",
          amount: platformFee,
          currency: profitCurrency,
          description: `Platform fee for trade ${trade.id}`,
          metadata: { tradeId: trade.id },
        }, { transaction: t });

        // Credit leader's wallet with proper locking
        const leaderWallet = await getWalletByUserIdAndCurrency(
          leader.userId,
          profitCurrency
        );
        if (leaderWallet) {
          await updateWalletBalance(leaderWallet, leaderProfit, "add");
        }
      });
    }

    // Update allocation's used amounts when trade closes
    const allocation = await models.copyTradingFollowerAllocation.findOne({
      where: {
        followerId: follower.id,
        symbol: trade.symbol,
        isActive: true,
      },
    });

    if (allocation) {
      const allocData = allocation as any;
      if (trade.side === "BUY") {
        // BUY used quote currency - release it
        await allocation.update({
          quoteUsedAmount: Math.max(
            0,
            allocData.quoteUsedAmount - trade.cost
          ),
        });
      } else {
        // SELL used base currency - release it
        await allocation.update({
          baseUsedAmount: Math.max(
            0,
            allocData.baseUsedAmount - trade.amount
          ),
        });
      }
      // Invalidate allocation stats cache
      await invalidateAllocationStatsCache(follower.id, trade.symbol);
    }

    // Invalidate follower stats cache (stats are calculated on-demand)
    await invalidateFollowerStatsCache(follower.id);
  } catch (error) {
    logger.error("COPY_TRADING", "Error in onFollowerOrderClosed hook", error);
  }
}
