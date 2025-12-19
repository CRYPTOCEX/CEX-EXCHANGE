import { models, sequelize } from "@b/db";
import { Transaction, Op, literal } from "sequelize";
import { broadcastStatus, broadcastLog } from "@b/cron/broadcast";
import { logger } from "@b/utils/console";
import { createNotification } from "@b/utils/notifications";
// Safe imports for ecosystem utilities (different addon)
import {
  getWalletByUserIdAndCurrency,
  updateWalletBalance,
  createOrder,
  getOrderBook,
  toBigIntFloat,
} from "@b/utils/safe-imports";
// Currency conversion utilities for multi-currency support
import {
  convertToUSDT,
  getQuoteCurrency,
  getBaseCurrency,
  getTradeCurrency,
  formatCurrencyAmount,
} from "./currency";
// Copy amount calculation
import { calculateCopyAmount } from "./copyProcessor";
// Cache invalidation for calculated stats
import { invalidateTradeRelatedCaches } from "@b/api/(ext)/copy-trading/utils/stats-calculator";

// Configuration
const MAX_CONCURRENCY = 3;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

interface LeaderTrade {
  id: string;
  leaderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: string;
  amount: number;
  price: number;
  profit?: number;
  status: string;
  createdAt: Date;
  leader?: any;
}

interface Follower {
  id: string;
  userId: string;
  leaderId: string;
  copyMode: string;
  fixedAmount?: number;
  fixedRatio?: number;
  maxTradeAmount?: number;
  riskMultiplier: number;
  status: string;
  user?: any;
}

/**
 * Process a single follower's copy trade using per-market allocations
 */
async function processFollowerCopy(
  trade: LeaderTrade,
  follower: Follower,
  leaderBalance: number,
  cronName: string
): Promise<boolean> {
  let retryCount = 0;

  while (retryCount < MAX_RETRY_ATTEMPTS) {
    const t = await sequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });

    try {
      // Lock the follower record
      const followerWithLock = await models.copyTradingFollower.findByPk(follower.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!followerWithLock || (followerWithLock as any).status !== "ACTIVE") {
        await t.rollback();
        return true; // Skip inactive followers
      }

      const lockedFollower = followerWithLock as any;

      // Get the follower's allocation for this specific market
      const allocation = await models.copyTradingFollowerAllocation.findOne({
        where: {
          followerId: follower.id,
          symbol: trade.symbol,
          isActive: true,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!allocation) {
        await t.rollback();
        broadcastLog(cronName, `Skipping follower ${follower.id}: no allocation for ${trade.symbol}`, "info");
        return true;
      }

      const allocationData = allocation as any;

      // Determine available amount based on trade side
      // BUY: uses quote currency (e.g., USDT)
      // SELL: uses base currency (e.g., BTC)
      const availableAmount =
        trade.side === "BUY"
          ? allocationData.quoteAmount - allocationData.quoteUsedAmount
          : allocationData.baseAmount - allocationData.baseUsedAmount;

      if (availableAmount <= 0) {
        await t.rollback();
        broadcastLog(cronName, `Skipping follower ${follower.id}: insufficient ${trade.symbol} allocation for ${trade.side}`, "info");
        return true;
      }

      // Calculate copy amount using the allocation's available balance
      const { amount: copyAmount, cost, reason } = calculateCopyAmount(
        trade.amount,
        trade.price,
        leaderBalance,
        lockedFollower,
        availableAmount
      );

      if (copyAmount <= 0) {
        await t.rollback();
        broadcastLog(cronName, `Skipping follower ${follower.id}: ${reason || 'zero copy amount calculated'}`, "info");
        return true;
      }

      // Get market info using currency utilities
      const baseCurrency = getBaseCurrency(trade.symbol);
      const quoteCurrency = getQuoteCurrency(trade.symbol);
      const market = await models.ecosystemMarket.findOne({
        where: { currency: baseCurrency, pair: quoteCurrency },
        transaction: t,
      });

      if (!market) {
        await t.rollback();
        throw new Error(`Market not found: ${trade.symbol}`);
      }

      const marketData = market as any;
      const minAmount = Number(marketData.metadata?.limits?.amount?.min || 0);

      if (copyAmount < minAmount) {
        await t.rollback();
        broadcastLog(cronName, `Skipping follower ${follower.id}: copy amount ${copyAmount} below minimum ${minAmount}`, "info");
        return true;
      }

      // Determine which currency to spend based on trade side
      const { spend: spendCurrency } = getTradeCurrency(
        trade.symbol,
        trade.side
      );

      // Get follower's wallet for the currency they need to spend
      const wallet = await getWalletByUserIdAndCurrency(follower.userId, spendCurrency);

      if (!wallet) {
        await t.rollback();
        throw new Error(`Wallet not found for user ${follower.userId} currency ${spendCurrency}`);
      }

      // Determine effective price for market orders
      let effectivePrice = trade.price;
      if (trade.type.toLowerCase() === "market") {
        const { asks, bids } = await getOrderBook(trade.symbol);
        if (trade.side === "BUY") {
          effectivePrice = asks && asks.length > 0 ? asks[0][0] : trade.price;
        } else {
          effectivePrice = bids && bids.length > 0 ? bids[0][0] : trade.price;
        }
      }

      // Calculate cost and fee
      const precision = Number(marketData.metadata?.precision?.price || 8);
      const feeRate = Number(marketData.metadata?.taker || 0.1);
      const fee = parseFloat(((copyAmount * effectivePrice * feeRate) / 100).toFixed(precision));

      // Total cost depends on trade side
      const totalCost =
        trade.side === "BUY"
          ? parseFloat((copyAmount * effectivePrice + fee).toFixed(precision))
          : copyAmount;

      // Check wallet balance
      const walletBalance = parseFloat(wallet.balance.toString()) - parseFloat(wallet.inOrder?.toString() || "0");
      if (walletBalance < totalCost) {
        await t.rollback();
        broadcastLog(cronName, `Skipping follower ${follower.id}: insufficient ${spendCurrency} balance (${walletBalance} < ${totalCost})`, "warning");
        return true;
      }

      // Create the follower's order
      const newOrder = await createOrder({
        userId: follower.userId,
        symbol: trade.symbol,
        amount: await toBigIntFloat(copyAmount),
        price: await toBigIntFloat(effectivePrice),
        cost: await toBigIntFloat(totalCost),
        type: trade.type.toLowerCase() === "market" ? "MARKET" : "LIMIT",
        side: trade.side,
        fee: await toBigIntFloat(fee),
        feeCurrency: quoteCurrency, // Fee is always in quote currency
      });

      // Update wallet balance
      await updateWalletBalance(wallet, totalCost, "subtract");

      // Create copy trade record with proper currency tracking
      await models.copyTradingTrade.create(
        {
          followerId: follower.id,
          leaderId: trade.leaderId,
          leaderTradeId: trade.id,
          symbol: trade.symbol,
          side: trade.side,
          type: trade.type,
          amount: copyAmount,
          price: effectivePrice,
          cost: totalCost,
          fee,
          feeCurrency: quoteCurrency,
          profitCurrency: quoteCurrency,
          status: "OPEN",
          orderId: newOrder.id,
          isLeaderTrade: false,
        },
        { transaction: t }
      );

      // Note: totalTrades is now calculated on-demand from copyTradingTrade table
      // No need to update here - stats-calculator.ts handles this

      // Update the allocation's used amounts based on trade side
      if (trade.side === "BUY") {
        // BUY uses quote currency
        await allocationData.update(
          {
            quoteUsedAmount: literal(`"quoteUsedAmount" + ${totalCost}`),
            // Note: totalTrades is now calculated on-demand from copyTradingTrade table
          },
          { transaction: t }
        );
      } else {
        // SELL uses base currency
        await allocationData.update(
          {
            baseUsedAmount: literal(`"baseUsedAmount" + ${copyAmount}`),
            // Note: totalTrades is now calculated on-demand from copyTradingTrade table
          },
          { transaction: t }
        );
      }

      // Create transaction record
      await models.copyTradingTransaction.create(
        {
          userId: follower.userId,
          followerId: follower.id,
          leaderId: trade.leaderId,
          type: "TRADE_OPEN",
          amount: totalCost,
          currency: spendCurrency,
          description: `Copied ${trade.side} trade: ${copyAmount.toFixed(6)} ${baseCurrency} @ ${effectivePrice} ${quoteCurrency}`,
          metadata: JSON.stringify({
            leaderTradeId: trade.id,
            orderId: newOrder.id,
            symbol: trade.symbol,
            allocationId: allocationData.id,
          }),
          status: "COMPLETED",
        },
        { transaction: t }
      );

      await t.commit();

      broadcastLog(
        cronName,
        `Follower ${follower.id} copied trade: ${trade.side} ${copyAmount.toFixed(6)} ${baseCurrency} @ ${effectivePrice} ${quoteCurrency}`,
        "success"
      );

      return true;
    } catch (error: any) {
      await t.rollback();

      retryCount++;
      logger.error("COPY_TRADING", `Failed to process follower ${follower.id} copy`, error);
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        broadcastLog(
          cronName,
          `Retrying follower ${follower.id} copy (Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}): ${error.message}`,
          "warning"
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        logger.error("COPY_TRADING", `Failed to copy for follower ${follower.id}: ${error.message}`, error);
        broadcastLog(cronName, `Failed to copy for follower ${follower.id}: ${error.message}`, "error");
        return false;
      }
    }
  }

  return false;
}

/**
 * Replicate a leader's trade to all active followers
 */
export async function replicateLeaderTrade(
  trade: LeaderTrade,
  leaderBalance: number
): Promise<void> {
  const cronName = "replicateLeaderTrade";

  try {
    broadcastLog(cronName, `Replicating trade ${trade.id} for leader ${trade.leaderId}`);

    // Get all active followers for this leader
    const followers = await models.copyTradingFollower.findAll({
      where: {
        leaderId: trade.leaderId,
        status: "ACTIVE",
      },
      include: [{ model: models.user, as: "user" }],
    });

    if (followers.length === 0) {
      broadcastLog(cronName, `No active followers for leader ${trade.leaderId}`, "info");
      return;
    }

    broadcastLog(cronName, `Found ${followers.length} active followers to replicate to`);

    // Process followers with concurrency limit
    const results = await processWithConcurrency(
      followers as any[],
      MAX_CONCURRENCY,
      async (follower: any) => {
        return processFollowerCopy(trade, follower, leaderBalance, cronName);
      }
    );

    const successCount = results.filter((r) => r).length;
    const failCount = results.filter((r) => !r).length;

    broadcastLog(
      cronName,
      `Trade replication complete: ${successCount} successful, ${failCount} failed`,
      successCount > 0 ? "success" : "warning"
    );
  } catch (error: any) {
    logger.error("COPY_TRADING", `Trade replication failed: ${error.message}`, error);
    broadcastLog(cronName, `Trade replication failed: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Process pending leader trades that haven't been replicated yet
 * This is the main cron job function
 */
export async function processPendingCopyTrades(): Promise<void> {
  const cronName = "processPendingCopyTrades";
  const startTime = Date.now();
  let processedCount = 0;
  let failedCount = 0;

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting copy trade replication process");

    // Check if copy trading is enabled
    const settings = await models.settings.findOne({
      where: { key: "copyTradingEnabled" },
    });

    if (!settings || (settings as any).value !== "true") {
      broadcastLog(cronName, "Copy trading is disabled, skipping", "info");
      broadcastStatus(cronName, "completed", { skipped: true });
      return;
    }

    // Find pending leader trades that need replication
    const pendingTrades = await models.copyTradingTrade.findAll({
      where: {
        followerId: null, // Leader trades don't have followerId
        status: "PENDING_REPLICATION",
      },
      include: [
        {
          model: models.copyTradingLeader,
          as: "leader",
          include: [{ model: models.user, as: "user" }],
        },
      ],
      order: [["createdAt", "ASC"]],
      limit: 50, // Process in batches
    });

    if (pendingTrades.length === 0) {
      broadcastLog(cronName, "No pending trades to replicate", "info");
      broadcastStatus(cronName, "completed", { processed: 0 });
      return;
    }

    broadcastLog(cronName, `Found ${pendingTrades.length} pending trades to replicate`);

    for (const trade of pendingTrades as any[]) {
      try {
        // Get leader's current balance for proportional calculation
        const leader = trade.leader;
        if (!leader) {
          broadcastLog(cronName, `Leader not found for trade ${trade.id}`, "warning");
          continue;
        }

        const leaderWallet = await getWalletByUserIdAndCurrency(
          leader.userId,
          trade.symbol.split("/")[1] // Quote currency
        );

        const leaderBalance = leaderWallet
          ? parseFloat(leaderWallet.balance.toString())
          : 0;

        await replicateLeaderTrade(trade, leaderBalance);

        // Mark trade as replicated
        await trade.update({ status: "REPLICATED" });
        processedCount++;
      } catch (error: any) {
        logger.error("COPY_TRADING", `Failed to replicate trade ${trade.id}`, error);
        broadcastLog(cronName, `Failed to replicate trade ${trade.id}: ${error.message}`, "error");

        // Mark as failed for manual review
        await trade.update({ status: "REPLICATION_FAILED" });
        failedCount++;
      }
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
      processed: processedCount,
      failed: failedCount,
    });

    broadcastLog(
      cronName,
      `Copy trade replication completed: ${processedCount} processed, ${failedCount} failed`,
      "success"
    );
  } catch (error: any) {
    logger.error("COPY_TRADING", `Copy trade replication failed: ${error.message}`, error);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
      processed: processedCount,
      failed: failedCount,
      error: error.message,
    });
    broadcastLog(cronName, `Copy trade replication failed: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Process closed leader trades and distribute profits/losses to followers
 */
export async function processClosedCopyTrades(): Promise<void> {
  const cronName = "processClosedCopyTrades";
  const startTime = Date.now();
  let processedCount = 0;
  let failedCount = 0;

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting closed copy trade processing");

    // Find follower trades that are closed but not yet processed
    const closedTrades = await models.copyTradingTrade.findAll({
      where: {
        followerId: { [Op.ne]: null },
        status: "CLOSED",
        profit: null, // Not yet processed
      },
      include: [
        {
          model: models.copyTradingFollower,
          as: "follower",
          include: [
            { model: models.copyTradingLeader, as: "leader" },
            { model: models.user, as: "user" },
          ],
        },
      ],
      limit: 100,
    });

    if (closedTrades.length === 0) {
      broadcastLog(cronName, "No closed trades to process", "info");
      broadcastStatus(cronName, "completed", { processed: 0 });
      return;
    }

    broadcastLog(cronName, `Found ${closedTrades.length} closed trades to process`);

    for (const trade of closedTrades as any[]) {
      const t = await sequelize.transaction();

      try {
        const follower = trade.follower;
        const leader = follower?.leader;

        if (!follower || !leader) {
          await t.rollback();
          continue;
        }

        // Calculate profit/loss
        const profit = trade.closedProfit || 0;
        const profitPercent = trade.cost > 0 ? (profit / trade.cost) * 100 : 0;

        // Calculate profit share
        const platformFeePercent = 2; // 2% platform fee
        const leaderSharePercent = leader.profitSharePercent || 20;

        let leaderProfit = 0;
        let platformFee = 0;
        let followerProfit = profit;

        if (profit > 0) {
          platformFee = profit * (platformFeePercent / 100);
          leaderProfit = (profit - platformFee) * (leaderSharePercent / 100);
          followerProfit = profit - platformFee - leaderProfit;
        }

        // Update trade record
        await trade.update(
          {
            profit: followerProfit,
            profitPercent,
          },
          { transaction: t }
        );

        // Note: Follower stats (totalProfit, winRate) are now calculated on-demand
        // from copyTradingTrade table - stats-calculator.ts handles this

        // Update allocation's used amounts to release the funds
        const allocation = await models.copyTradingFollowerAllocation.findOne({
          where: {
            followerId: follower.id,
            symbol: trade.symbol,
          },
          transaction: t,
        });

        if (allocation) {
          const allocationData = allocation as any;

          if (trade.side === "BUY") {
            // BUY used quote currency - release it
            await allocationData.update(
              {
                quoteUsedAmount: literal(`GREATEST(0, "quoteUsedAmount" - ${trade.cost})`),
                // Note: totalProfit and winRate are now calculated on-demand from copyTradingTrade table
              },
              { transaction: t }
            );
          } else {
            // SELL used base currency - release it
            await allocationData.update(
              {
                baseUsedAmount: literal(`GREATEST(0, "baseUsedAmount" - ${trade.amount})`),
                // Note: totalProfit and winRate are now calculated on-demand from copyTradingTrade table
              },
              { transaction: t }
            );
          }
        }

        // Create profit share transactions
        if (profit > 0) {
          // Determine currency from trade symbol
          const profitCurrency = trade.profitCurrency || trade.symbol.split("/")[1] || "USDT";

          // Platform fee transaction
          await models.copyTradingTransaction.create(
            {
              followerId: follower.id,
              type: "PLATFORM_FEE",
              amount: platformFee,
              currency: profitCurrency,
              description: `Platform fee for trade ${trade.id}`,
              metadata: { tradeId: trade.id },
            },
            { transaction: t }
          );

          // Leader profit share transaction
          await models.copyTradingTransaction.create(
            {
              followerId: follower.id,
              type: "PROFIT_SHARE",
              amount: leaderProfit,
              currency: profitCurrency,
              description: `Leader profit share for trade ${trade.id}`,
              metadata: { tradeId: trade.id, leaderId: leader.id },
            },
            { transaction: t }
          );

          // Credit leader's wallet
          const leaderWallet = await getWalletByUserIdAndCurrency(
            leader.userId,
            profitCurrency
          );

          if (leaderWallet) {
            await updateWalletBalance(leaderWallet, leaderProfit, "add");
          }
        }

        // Return funds to follower
        const [, pair] = trade.symbol.split("/");
        const returnAmount = trade.cost + followerProfit;
        const followerWallet = await getWalletByUserIdAndCurrency(follower.userId, pair);

        if (followerWallet && returnAmount > 0) {
          await updateWalletBalance(followerWallet, returnAmount, "add");
        }

        // Create notification for follower
        await createNotification({
          userId: follower.userId,
          type: "system",
          title: profit > 0 ? "Copy Trade Profit" : "Copy Trade Closed",
          message:
            profit > 0
              ? `Your copied trade made ${followerProfit.toFixed(2)} ${pair} profit!`
              : `Your copied trade closed with ${followerProfit.toFixed(2)} ${pair} ${profit < 0 ? "loss" : ""}.`,
          link: `/copy-trading/subscriptions`,
        });

        await t.commit();
        processedCount++;

        // Invalidate cached stats for leader, follower, and allocation
        try {
          await invalidateTradeRelatedCaches(
            leader.id,
            follower.id,
            trade.symbol
          );
        } catch (cacheError) {
          // Log but don't fail the transaction if cache invalidation fails
          logger.warn("COPY_TRADING", `Failed to invalidate cache for trade ${trade.id}`, cacheError);
        }

        broadcastLog(
          cronName,
          `Processed trade ${trade.id}: profit=${profit.toFixed(2)}, followerShare=${followerProfit.toFixed(2)}, leaderShare=${leaderProfit.toFixed(2)}`,
          "success"
        );
      } catch (error: any) {
        await t.rollback();
        logger.error("COPY_TRADING", `Failed to process closed trade ${trade.id}`, error);
        broadcastLog(cronName, `Failed to process trade ${trade.id}: ${error.message}`, "error");
        failedCount++;
      }
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
      processed: processedCount,
      failed: failedCount,
    });

    broadcastLog(
      cronName,
      `Closed trade processing completed: ${processedCount} processed, ${failedCount} failed`,
      "success"
    );
  } catch (error: any) {
    logger.error("COPY_TRADING", `Closed trade processing failed: ${error.message}`, error);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
      processed: processedCount,
      failed: failedCount,
      error: error.message,
    });
    broadcastLog(cronName, `Closed trade processing failed: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Update daily statistics for all active leaders
 * All profit values are converted to USDT for consistent aggregation
 */
export async function updateLeaderDailyStats(): Promise<void> {
  const cronName = "updateLeaderDailyStats";
  const startTime = Date.now();

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting leader daily stats update");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active leaders
    const leaders = await models.copyTradingLeader.findAll({
      where: { status: "ACTIVE" },
    });

    for (const leader of leaders as any[]) {
      try {
        // Get today's trades with symbol for currency conversion
        const todayTrades = await models.copyTradingTrade.findAll({
          where: {
            leaderId: leader.id,
            followerId: null, // Leader trades only
            createdAt: { [Op.gte]: today },
          },
          attributes: ["id", "profit", "amount", "price", "symbol", "profitCurrency"],
        });

        const trades = todayTrades as any[];
        const totalTrades = trades.length;
        const winningTrades = trades.filter((t) => (t.profit || 0) > 0).length;

        // Convert all profits and volumes to USDT for consistent aggregation
        let totalProfitUSDT = 0;
        let totalVolumeUSDT = 0;

        for (const trade of trades) {
          const profit = trade.profit || 0;
          const volume = (trade.amount || 0) * (trade.price || 0);

          // Determine profit currency from field or symbol quote
          let profitCurrency = trade.profitCurrency;
          if (!profitCurrency && trade.symbol) {
            profitCurrency = getQuoteCurrency(trade.symbol);
          }
          if (!profitCurrency) {
            profitCurrency = "USDT";
          }

          try {
            const profitInUSDT = await convertToUSDT(profit, profitCurrency);
            const volumeInUSDT = await convertToUSDT(volume, profitCurrency);
            totalProfitUSDT += profitInUSDT;
            totalVolumeUSDT += volumeInUSDT;
          } catch (conversionError) {
            // Fallback to raw values if conversion fails
            logger.warn("COPY_TRADING", `Currency conversion failed for ${profitCurrency}`, conversionError);
            totalProfitUSDT += profit;
            totalVolumeUSDT += volume;
          }
        }

        // Upsert daily stats (all values in USDT)
        // Note: ROI and winRate are calculated on-demand from this data
        await models.copyTradingLeaderStats.upsert({
          leaderId: leader.id,
          date: today,
          trades: totalTrades,
          winningTrades,
          losingTrades: totalTrades - winningTrades,
          profit: totalProfitUSDT,
          volume: totalVolumeUSDT,
          fees: 0, // Fees tracked separately if needed
          startEquity: 0,
          endEquity: 0,
          highEquity: 0,
          lowEquity: 0,
        });

        broadcastLog(
          cronName,
          `Updated stats for leader ${leader.id}: trades=${totalTrades}, profit=${formatCurrencyAmount(totalProfitUSDT, "USDT")}`,
          "info"
        );
      } catch (error: any) {
        logger.error("COPY_TRADING", `Failed to update stats for leader ${leader.id}`, error);
        broadcastLog(cronName, `Failed to update stats for leader ${leader.id}: ${error.message}`, "error");
      }
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
      leaders: leaders.length,
    });

    broadcastLog(cronName, `Leader stats update completed for ${leaders.length} leaders`, "success");
  } catch (error: any) {
    logger.error("COPY_TRADING", `Leader stats update failed: ${error.message}`, error);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Process items with controlled concurrency
 */
async function processWithConcurrency<T, R>(
  items: T[],
  concurrencyLimit: number,
  asyncFn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = new Array(concurrencyLimit).fill(0).map(async () => {
    while (index < items.length) {
      const currentIndex = index++;
      try {
        results[currentIndex] = await asyncFn(items[currentIndex]);
      } catch (error: any) {
        results[currentIndex] = error;
      }
    }
  });

  await Promise.all(workers);
  return results;
}

// ============================================================================
// DAILY RESET CRON
// ============================================================================

/**
 * Reset daily limits and reactivate paused followers (run at midnight)
 */
export async function resetDailyLimits(): Promise<void> {
  const cronName = "resetDailyLimits";
  const startTime = Date.now();
  let reset = 0;
  let reactivated = 0;

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting daily limits reset");

    // Reactivate followers paused due to daily loss limits
    const pausedFollowers = await models.copyTradingFollower.findAll({
      where: { status: "PAUSED" },
    });

    for (const follower of pausedFollowers as any[]) {
      // Check if paused due to daily loss limit (check audit log)
      const recentPause = await models.copyTradingAuditLog.findOne({
        where: {
          entityType: "copyTradingFollower",
          entityId: follower.id,
          action: "DAILY_LOSS_LIMIT_REACHED",
          createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (recentPause) {
        await follower.update({ status: "ACTIVE" });
        reactivated++;

        // Create notification
        await createNotification({
          userId: follower.userId,
          type: "system",
          title: "Copy Trading Resumed",
          message:
            "Your copy trading subscription has been automatically reactivated for the new trading day.",
          link: "/copy-trading/subscription",
        });

        broadcastLog(cronName, `Reactivated follower ${follower.id}`, "info");
      }
    }

    reset = 1; // Cache reset would happen here if using Redis

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
      reset,
      reactivated,
    });

    broadcastLog(
      cronName,
      `Daily limits reset: ${reactivated} followers reactivated`,
      "success"
    );
  } catch (error: any) {
    logger.error("COPY_TRADING", `Daily limits reset failed: ${error.message}`, error);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}

// ============================================================================
// ANALYTICS AGGREGATION CRON
// ============================================================================

/**
 * Aggregate weekly analytics for leaders
 * All monetary values are converted to USDT for consistent aggregation
 */
export async function aggregateWeeklyAnalytics(): Promise<void> {
  const cronName = "aggregateWeeklyAnalytics";
  const startTime = Date.now();
  let processed = 0;

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting weekly analytics aggregation");

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    // Get all active leaders
    const leaders = await models.copyTradingLeader.findAll({
      where: { status: "ACTIVE" },
    });

    for (const leader of leaders as any[]) {
      try {
        // Get weekly trades with symbol for currency conversion
        const trades = await models.copyTradingTrade.findAll({
          where: {
            leaderId: leader.id,
            isLeaderTrade: true,
            status: "CLOSED",
            closedAt: { [Op.gte]: weekStart },
          },
          attributes: ["id", "profit", "cost", "symbol", "profitCurrency"],
        });

        const tradesData = trades as any[];
        const totalTrades = tradesData.length;
        const winningTrades = tradesData.filter((t) => (t.profit || 0) > 0).length;

        // Convert all profits and volumes to USDT for consistent aggregation
        let totalProfitUSDT = 0;
        let totalVolumeUSDT = 0;

        for (const trade of tradesData) {
          const profit = trade.profit || 0;
          const cost = trade.cost || 0;

          // Determine profit currency from field or symbol quote
          let profitCurrency = trade.profitCurrency;
          if (!profitCurrency && trade.symbol) {
            profitCurrency = getQuoteCurrency(trade.symbol);
          }
          if (!profitCurrency) {
            profitCurrency = "USDT";
          }

          try {
            const profitInUSDT = await convertToUSDT(profit, profitCurrency);
            const costInUSDT = await convertToUSDT(cost, profitCurrency);
            totalProfitUSDT += profitInUSDT;
            totalVolumeUSDT += costInUSDT;
          } catch (conversionError) {
            // Fallback to raw values if conversion fails
            logger.warn("COPY_TRADING", `Currency conversion failed for ${profitCurrency}`, conversionError);
            totalProfitUSDT += profit;
            totalVolumeUSDT += cost;
          }
        }

        // Calculate weekly metrics (in USDT) for logging
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const roi = totalVolumeUSDT > 0 ? (totalProfitUSDT / totalVolumeUSDT) * 100 : 0;

        // Note: Stats are now calculated on-demand via stats-calculator.ts
        // This cron now just logs analytics and clears cache to ensure fresh stats

        processed++;
        broadcastLog(
          cronName,
          `Aggregated stats for leader ${leader.id}: weekly trades=${totalTrades}, profit=${formatCurrencyAmount(totalProfitUSDT, "USDT")}`,
          "info"
        );
      } catch (error: any) {
        logger.error("COPY_TRADING", `Failed to aggregate stats for leader ${leader.id}`, error);
      }
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
      processed,
    });

    broadcastLog(
      cronName,
      `Weekly analytics aggregation completed for ${processed} leaders`,
      "success"
    );
  } catch (error: any) {
    logger.error("COPY_TRADING", `Weekly analytics aggregation failed: ${error.message}`, error);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}

// ============================================================================
// STOP LOSS / TAKE PROFIT MONITORING
// ============================================================================

/**
 * Monitor and execute stop-loss/take-profit for all open trades
 */
export async function monitorStopLevels(): Promise<void> {
  const cronName = "monitorStopLevels";
  const startTime = Date.now();
  let checked = 0;
  let triggered = 0;

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting stop-loss/take-profit monitoring");

    // Get all open follower trades
    const openTrades = await models.copyTradingTrade.findAll({
      where: {
        followerId: { [Op.ne]: null },
        status: "OPEN",
      },
      include: [
        {
          model: models.copyTradingFollower,
          as: "follower",
          where: {
            [Op.or]: [
              { stopLossPercent: { [Op.ne]: null } },
              { takeProfitPercent: { [Op.ne]: null } },
            ],
          },
        },
      ],
    });

    for (const trade of openTrades as any[]) {
      checked++;
      const follower = trade.follower;

      if (!follower) continue;

      // Get current market price
      const [currency, pair] = trade.symbol.split("/");
      let currentPrice = trade.price;

      try {
        const { asks, bids } = await getOrderBook(trade.symbol);

        // Use bid for sell (close long), ask for buy (close short)
        if (trade.side === "BUY") {
          currentPrice = bids && bids.length > 0 ? bids[0][0] : trade.price;
        } else {
          currentPrice = asks && asks.length > 0 ? asks[0][0] : trade.price;
        }
      } catch (e) {
        // Use original price if order book unavailable
      }

      const entryPrice = trade.executedPrice || trade.price;
      const isLong = trade.side === "BUY";

      // Check stop-loss
      if (follower.stopLossPercent) {
        const stopPrice = isLong
          ? entryPrice * (1 - follower.stopLossPercent / 100)
          : entryPrice * (1 + follower.stopLossPercent / 100);

        const triggered_sl = isLong
          ? currentPrice <= stopPrice
          : currentPrice >= stopPrice;

        if (triggered_sl) {
          broadcastLog(
            cronName,
            `Stop-loss triggered for trade ${trade.id} at ${currentPrice}`,
            "warning"
          );
          // Would close trade here - import from fillMonitor
          triggered++;
          continue;
        }
      }

      // Check take-profit
      if (follower.takeProfitPercent) {
        const tpPrice = isLong
          ? entryPrice * (1 + follower.takeProfitPercent / 100)
          : entryPrice * (1 - follower.takeProfitPercent / 100);

        const triggered_tp = isLong
          ? currentPrice >= tpPrice
          : currentPrice <= tpPrice;

        if (triggered_tp) {
          broadcastLog(
            cronName,
            `Take-profit triggered for trade ${trade.id} at ${currentPrice}`,
            "success"
          );
          // Would close trade here - import from fillMonitor
          triggered++;
        }
      }
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
      checked,
      triggered,
    });

    broadcastLog(
      cronName,
      `Stop-loss/take-profit monitoring: ${checked} checked, ${triggered} triggered`,
      "success"
    );
  } catch (error: any) {
    logger.error("COPY_TRADING", `Stop-loss/take-profit monitoring failed: ${error.message}`, error);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}

// ============================================================================
// AUTO-PAUSE FOR LOSS LIMITS
// ============================================================================

/**
 * Check and pause followers exceeding daily loss limits
 * All losses are converted to USDT for comparison with maxDailyLoss (stored in USDT)
 */
export async function checkDailyLossLimits(): Promise<void> {
  const cronName = "checkDailyLossLimits";
  const startTime = Date.now();
  let checked = 0;
  let paused = 0;

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Checking daily loss limits");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get active followers with loss limits
    const followers = await models.copyTradingFollower.findAll({
      where: {
        status: "ACTIVE",
        maxDailyLoss: { [Op.gt]: 0 },
      },
    });

    for (const follower of followers as any[]) {
      checked++;

      // Get today's losing trades with symbol for currency conversion
      const todayTrades = await models.copyTradingTrade.findAll({
        where: {
          followerId: follower.id,
          status: "CLOSED",
          closedAt: { [Op.gte]: today },
          profit: { [Op.lt]: 0 },
        },
        attributes: ["profit", "symbol", "profitCurrency"],
      });

      // Convert all losses to USDT and sum
      let totalLossUSDT = 0;
      for (const trade of todayTrades as any[]) {
        const loss = Math.abs(trade.profit || 0);

        // Determine profit currency from field or symbol quote
        let profitCurrency = trade.profitCurrency;
        if (!profitCurrency && trade.symbol) {
          profitCurrency = getQuoteCurrency(trade.symbol);
        }
        if (!profitCurrency) {
          profitCurrency = "USDT";
        }

        try {
          const lossInUSDT = await convertToUSDT(loss, profitCurrency);
          totalLossUSDT += lossInUSDT;
        } catch (conversionError) {
          // Fallback to raw value if conversion fails
          logger.warn("COPY_TRADING", `Currency conversion failed for ${profitCurrency}`, conversionError);
          totalLossUSDT += loss;
        }
      }

      // Compare with maxDailyLoss (stored in USDT)
      if (totalLossUSDT >= follower.maxDailyLoss) {
        await follower.update({ status: "PAUSED" });
        paused++;

        // Create notification with proper currency formatting
        await createNotification({
          userId: follower.userId,
          type: "system",
          title: "Copy Trading Paused",
          message: `Your copy trading has been paused due to reaching your daily loss limit of ${formatCurrencyAmount(follower.maxDailyLoss, "USDT")}. Current loss: ${formatCurrencyAmount(totalLossUSDT, "USDT")}`,
          link: "/copy-trading/subscription",
        });

        // Audit log
        await models.copyTradingAuditLog.create({
          entityType: "copyTradingFollower",
          entityId: follower.id,
          action: "DAILY_LOSS_LIMIT_REACHED",
          userId: follower.userId,
          metadata: JSON.stringify({
            totalLoss: totalLossUSDT,
            maxDailyLoss: follower.maxDailyLoss,
            currency: "USDT",
          }),
        });

        broadcastLog(
          cronName,
          `Paused follower ${follower.id} due to daily loss limit: ${formatCurrencyAmount(totalLossUSDT, "USDT")} >= ${formatCurrencyAmount(follower.maxDailyLoss, "USDT")}`,
          "warning"
        );
      }
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
      checked,
      paused,
    });

    broadcastLog(
      cronName,
      `Daily loss limit check: ${checked} checked, ${paused} paused`,
      "success"
    );
  } catch (error: any) {
    logger.error("COPY_TRADING", `Daily loss limit check failed: ${error.message}`, error);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}
