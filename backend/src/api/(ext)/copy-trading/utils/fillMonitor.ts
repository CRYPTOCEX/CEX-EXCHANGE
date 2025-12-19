// Fill Monitor - Monitor order fills in real-time
import { models, sequelize } from "@b/db";
import { Op, Transaction, literal } from "sequelize";
import { logger } from "@b/utils/console";
import {
  getWalletByUserIdAndCurrency,
  updateWalletBalance,
} from "@b/api/(ext)/ecosystem/utils/wallet";
import { distributeProfitShare } from "./profitShare";
import { recordLoss } from "./dailyLimits";
import { createAuditLog, updateLeaderStats, updateFollowerStats } from "./index";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OrderFillEvent {
  orderId: string;
  userId: string;
  symbol: string;
  side: "BUY" | "SELL";
  filledAmount: number;
  filledPrice: number;
  fee: number;
  status: "FILLED" | "PARTIALLY_FILLED" | "CANCELLED";
  timestamp: Date;
}

interface CloseTradeResult {
  success: boolean;
  profit?: number;
  profitPercent?: number;
  error?: string;
}

// ============================================================================
// FILL MONITOR CLASS
// ============================================================================

export class FillMonitor {
  private static instance: FillMonitor | null = null;
  private isProcessing: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): FillMonitor {
    if (!FillMonitor.instance) {
      FillMonitor.instance = new FillMonitor();
    }
    return FillMonitor.instance;
  }

  /**
   * Start polling for order fills
   */
  public start(intervalMs: number = 5000): void {
    if (this.pollInterval) {
      return;
    }

    this.pollInterval = setInterval(async () => {
      await this.checkPendingOrders();
    }, intervalMs);

    logger.info("COPY_TRADING", "FillMonitor started");
  }

  /**
   * Stop the fill monitor
   */
  public stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    logger.info("COPY_TRADING", "FillMonitor stopped");
  }

  /**
   * Handle an order fill event
   */
  public async onOrderFilled(event: OrderFillEvent): Promise<void> {
    try {
      // Check if this is a leader trade
      const leaderTrade = await models.copyTradingTrade.findOne({
        where: {
          leaderOrderId: event.orderId,
          isLeaderTrade: true,
        },
      });

      if (leaderTrade) {
        await this.handleLeaderOrderFill(leaderTrade as any, event);
        return;
      }

      // Check if this is a follower trade
      const followerTrade = await models.copyTradingTrade.findOne({
        where: {
          leaderOrderId: event.orderId,
          isLeaderTrade: false,
        },
        include: [
          {
            model: models.copyTradingFollower,
            as: "follower",
            include: [{ model: models.copyTradingLeader, as: "leader" }],
          },
        ],
      });

      if (followerTrade) {
        await this.handleFollowerOrderFill(followerTrade as any, event);
      }
    } catch (error: any) {
      logger.error("COPY_TRADING", "Fill monitor error on order filled", error);
    }
  }

  /**
   * Handle a leader's order being filled
   */
  private async handleLeaderOrderFill(
    trade: any,
    event: OrderFillEvent
  ): Promise<void> {
    const t = await sequelize.transaction();

    try {
      // Update trade with fill info
      await trade.update(
        {
          executedAmount: event.filledAmount,
          executedPrice: event.filledPrice,
          fee: event.fee,
          status:
            event.status === "FILLED"
              ? "OPEN"
              : event.status === "CANCELLED"
              ? "CANCELLED"
              : "PARTIALLY_FILLED",
        },
        { transaction: t }
      );

      // If cancelled, mark all pending follower trades as cancelled too
      if (event.status === "CANCELLED") {
        await models.copyTradingTrade.update(
          { status: "CANCELLED" },
          {
            where: {
              leaderOrderId: trade.leaderOrderId,
              isLeaderTrade: false,
              status: "PENDING",
            },
            transaction: t,
          }
        );
      }

      await t.commit();

      // Create audit log
      await createAuditLog({
        entityType: "copyTradingTrade",
        entityId: trade.id,
        action: "ORDER_FILLED",
        metadata: {
          filledAmount: event.filledAmount,
          filledPrice: event.filledPrice,
          status: event.status,
        },
      });
    } catch (error: any) {
      await t.rollback();
      logger.error("COPY_TRADING", "Failed to handle leader order fill", error);
    }
  }

  /**
   * Handle a follower's order being filled
   */
  private async handleFollowerOrderFill(
    trade: any,
    event: OrderFillEvent
  ): Promise<void> {
    const t = await sequelize.transaction();

    try {
      // Calculate slippage
      const slippage =
        trade.price > 0
          ? ((event.filledPrice - trade.price) / trade.price) * 100
          : 0;

      // Update trade with fill info
      await trade.update(
        {
          executedAmount: event.filledAmount,
          executedPrice: event.filledPrice,
          slippage,
          fee: event.fee,
          status:
            event.status === "FILLED"
              ? "OPEN"
              : event.status === "CANCELLED"
              ? "CANCELLED"
              : "PARTIALLY_FILLED",
        },
        { transaction: t }
      );

      await t.commit();

      // Create audit log
      await createAuditLog({
        entityType: "copyTradingTrade",
        entityId: trade.id,
        action: "ORDER_FILLED",
        metadata: {
          filledAmount: event.filledAmount,
          filledPrice: event.filledPrice,
          slippage,
          status: event.status,
        },
      });
    } catch (error: any) {
      await t.rollback();
      logger.error("COPY_TRADING", "Failed to handle follower order fill", error);
    }
  }

  /**
   * Check for pending orders that need status updates
   */
  private async checkPendingOrders(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Find trades with PENDING status older than 30 seconds
      const cutoff = new Date(Date.now() - 30000);
      const pendingTrades = await models.copyTradingTrade.findAll({
        where: {
          status: "PENDING",
          createdAt: { [Op.lt]: cutoff },
        },
        limit: 100,
      });

      for (const trade of pendingTrades as any[]) {
        // Mark as failed if still pending after timeout
        await trade.update({
          status: "FAILED",
          errorMessage: "Order timeout - no fill received",
        });
      }
    } catch (error: any) {
      logger.error("COPY_TRADING", "Failed to check pending orders", error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// ============================================================================
// TRADE CLOSURE FUNCTIONS
// ============================================================================

/**
 * Close a trade and calculate P&L
 */
export async function closeTrade(
  tradeId: string,
  closePrice: number,
  closeAmount?: number
): Promise<CloseTradeResult> {
  const t = await sequelize.transaction();

  try {
    const trade = await models.copyTradingTrade.findByPk(tradeId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
      include: [
        {
          model: models.copyTradingFollower,
          as: "follower",
          include: [{ model: models.copyTradingLeader, as: "leader" }],
        },
      ],
    });

    if (!trade) {
      await t.rollback();
      return { success: false, error: "Trade not found" };
    }

    const tradeData = trade as any;

    if (tradeData.status === "CLOSED") {
      await t.rollback();
      return { success: false, error: "Trade already closed" };
    }

    const amount = closeAmount || tradeData.executedAmount || tradeData.amount;
    const entryPrice = tradeData.executedPrice || tradeData.price;
    const entryCost = tradeData.cost;

    // Calculate P&L
    let profit: number;
    if (tradeData.side === "BUY") {
      // Long position: profit = (closePrice - entryPrice) * amount
      profit = (closePrice - entryPrice) * amount;
    } else {
      // Short position: profit = (entryPrice - closePrice) * amount
      profit = (entryPrice - closePrice) * amount;
    }

    // Subtract fees
    profit -= tradeData.fee || 0;

    const profitPercent = entryCost > 0 ? (profit / entryCost) * 100 : 0;

    // Update trade
    await tradeData.update(
      {
        profit,
        profitPercent,
        status: "CLOSED",
        closedAt: new Date(),
      },
      { transaction: t }
    );

    // If this is a follower trade, handle profit distribution
    if (tradeData.followerId && tradeData.follower) {
      const follower = tradeData.follower;
      const leader = follower.leader;

      // Parse symbol to get currencies
      const [baseCurrency, quoteCurrency] = tradeData.symbol.split("/");

      // Get the allocation for this market
      const allocation = await models.copyTradingFollowerAllocation.findOne({
        where: {
          followerId: follower.id,
          symbol: tradeData.symbol,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      // Return funds based on trade side
      if (tradeData.side === "BUY") {
        // BUY trade: spent quote currency, received base currency
        // Return base currency to user wallet
        const receiveAmount = amount; // Amount of base currency
        if (receiveAmount > 0) {
          const baseWallet = await getWalletByUserIdAndCurrency(
            follower.userId,
            baseCurrency
          );
          if (baseWallet) {
            await updateWalletBalance(baseWallet, receiveAmount, "add");
          }
        }

        // Release used quote currency from allocation
        if (allocation) {
          await allocation.update(
            {
              quoteUsedAmount: literal(
                `GREATEST(0, "quoteUsedAmount" - ${entryCost})`
              ),
            },
            { transaction: t }
          );
        }
      } else {
        // SELL trade: spent base currency, received quote currency
        // Return quote currency (cost + profit) to user wallet
        const receiveAmount = entryCost + profit;
        if (receiveAmount > 0) {
          const quoteWallet = await getWalletByUserIdAndCurrency(
            follower.userId,
            quoteCurrency
          );
          if (quoteWallet) {
            await updateWalletBalance(quoteWallet, receiveAmount, "add");
          }
        }

        // Release used base currency from allocation
        if (allocation) {
          await allocation.update(
            {
              baseUsedAmount: literal(
                `GREATEST(0, "baseUsedAmount" - ${amount})`
              ),
            },
            { transaction: t }
          );
        }
      }

      // Update allocation stats
      if (allocation) {
        await allocation.update(
          {
            totalProfit: literal(`"totalProfit" + ${profit}`),
            winRate:
              profit > 0
                ? literal(
                    `(("winRate" * ("totalTrades" - 1) + 100) / "totalTrades")`
                  )
                : literal(
                    `(("winRate" * ("totalTrades" - 1)) / "totalTrades")`
                  ),
          },
          { transaction: t }
        );
      }

      // Update follower stats
      await follower.update(
        {
          totalProfit: literal(`"totalProfit" + ${profit}`),
          winRate:
            profit > 0
              ? literal(
                  `(("winRate" * ("totalTrades" - 1) + 100) / "totalTrades")`
                )
              : literal(
                  `(("winRate" * ("totalTrades" - 1)) / "totalTrades")`
                ),
          // ROI is now calculated from allocations, not at follower level
        },
        { transaction: t }
      );

      // Record loss for daily limits
      if (profit < 0) {
        await recordLoss(follower.id, Math.abs(profit));
      }

      // Distribute profit share if profitable
      if (profit > 0 && leader) {
        await distributeProfitShare(
          tradeData.id,
          follower,
          leader,
          profit,
          quoteCurrency,
          t
        );
      }

      // Create transaction record
      await models.copyTradingTransaction.create(
        {
          userId: follower.userId,
          followerId: follower.id,
          leaderId: tradeData.leaderId,
          tradeId: tradeData.id,
          type: profit >= 0 ? "TRADE_PROFIT" : "TRADE_LOSS",
          amount: Math.abs(profit),
          currency: quoteCurrency,
          fee: 0,
          balanceBefore: 0,
          balanceAfter: 0,
          description: `Trade closed: ${profit >= 0 ? "+" : ""}${profit.toFixed(2)} ${quoteCurrency}`,
          metadata: JSON.stringify({
            closePrice,
            profitPercent,
          }),
          status: "COMPLETED",
        },
        { transaction: t }
      );
    }

    await t.commit();

    // Update stats asynchronously
    updateLeaderStats(tradeData.leaderId).catch((e) =>
      logger.error("COPY_TRADING", "Failed to update leader stats", e)
    );
    if (tradeData.followerId) {
      updateFollowerStats(tradeData.followerId).catch((e) =>
        logger.error("COPY_TRADING", "Failed to update follower stats", e)
      );
    }

    // Create audit log
    await createAuditLog({
      entityType: "copyTradingTrade",
      entityId: tradeId,
      action: "TRADE_CLOSED",
      metadata: { closePrice, profit, profitPercent },
    });

    return { success: true, profit, profitPercent };
  } catch (error: any) {
    await t.rollback();
    logger.error("COPY_TRADING", "Failed to close trade", error);
    return { success: false, error: error.message };
  }
}

/**
 * Close all follower trades when leader closes their trade
 */
export async function closeLeaderTrade(
  leaderTradeId: string,
  closePrice: number
): Promise<{ closedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let closedCount = 0;

  try {
    // Close the leader's trade first
    const leaderResult = await closeTrade(leaderTradeId, closePrice);
    if (!leaderResult.success) {
      return { closedCount: 0, errors: [leaderResult.error || "Failed to close leader trade"] };
    }

    // Get all open follower trades
    const followerTrades = await models.copyTradingTrade.findAll({
      where: {
        leaderOrderId: (
          await models.copyTradingTrade.findByPk(leaderTradeId)
        )?.get("leaderOrderId"),
        isLeaderTrade: false,
        status: { [Op.in]: ["OPEN", "PARTIALLY_FILLED"] },
      },
    });

    // Close each follower trade
    for (const trade of followerTrades as any[]) {
      const result = await closeTrade(trade.id, closePrice);
      if (result.success) {
        closedCount++;
      } else {
        errors.push(`Trade ${trade.id}: ${result.error}`);
      }
    }

    return { closedCount, errors };
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to close leader trade", error);
    return { closedCount, errors: [error.message] };
  }
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

/**
 * Handle order filled event - entry point from ecosystem
 */
export async function handleOrderFilled(
  orderId: string,
  userId: string,
  symbol: string,
  side: "BUY" | "SELL",
  filledAmount: number,
  filledPrice: number,
  fee: number,
  status: "FILLED" | "PARTIALLY_FILLED" | "CANCELLED"
): Promise<void> {
  const monitor = FillMonitor.getInstance();
  await monitor.onOrderFilled({
    orderId,
    userId,
    symbol,
    side,
    filledAmount,
    filledPrice,
    fee,
    status,
    timestamp: new Date(),
  });
}
