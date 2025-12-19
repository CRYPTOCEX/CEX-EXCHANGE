// Profit Share - P&L calculation and profit share distribution
import { models, sequelize } from "@b/db";
import { Transaction, Op, literal } from "sequelize";
import { logger } from "@b/utils/console";
import {
  getWalletByUserIdAndCurrency,
  updateWalletBalance,
} from "@b/api/(ext)/ecosystem/utils/wallet";
import { getCopyTradingSettings, createAuditLog } from "./index";
import {
  getQuoteCurrency,
  convertToUSDT,
  formatCurrencyAmount,
} from "./currency";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProfitShareResult {
  success: boolean;
  leaderShare: number;
  platformFee: number;
  followerNet: number;
  currency: string;
  error?: string;
}

interface ProfitBreakdown {
  grossProfit: number;
  platformFee: number;
  platformFeePercent: number;
  leaderShare: number;
  leaderSharePercent: number;
  followerNet: number;
  currency: string;
}

// ============================================================================
// P&L CALCULATION
// ============================================================================

/**
 * Calculate P&L for a trade
 */
export function calculatePnL(
  entryPrice: number,
  exitPrice: number,
  amount: number,
  side: "BUY" | "SELL",
  fees: number = 0
): { profit: number; profitPercent: number } {
  let profit: number;

  if (side === "BUY") {
    // Long position: profit when price goes up
    profit = (exitPrice - entryPrice) * amount;
  } else {
    // Short position: profit when price goes down
    profit = (entryPrice - exitPrice) * amount;
  }

  // Subtract fees
  profit -= fees;

  const cost = entryPrice * amount;
  const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;

  return { profit, profitPercent };
}

/**
 * Calculate unrealized P&L for an open trade
 */
export function calculateUnrealizedPnL(
  entryPrice: number,
  currentPrice: number,
  amount: number,
  side: "BUY" | "SELL"
): { unrealizedProfit: number; unrealizedProfitPercent: number } {
  const { profit, profitPercent } = calculatePnL(
    entryPrice,
    currentPrice,
    amount,
    side,
    0
  );

  return {
    unrealizedProfit: profit,
    unrealizedProfitPercent: profitPercent,
  };
}

// ============================================================================
// PROFIT SHARE DISTRIBUTION
// ============================================================================

/**
 * Calculate profit share breakdown
 * @param grossProfit - The gross profit amount
 * @param leaderSharePercent - Leader's share percentage of profit
 * @param currency - The currency of the profit (e.g., "USDT", "BTC")
 */
export async function calculateProfitShareBreakdown(
  grossProfit: number,
  leaderSharePercent: number,
  currency: string = "USDT"
): Promise<ProfitBreakdown> {
  const settings = await getCopyTradingSettings();
  const platformFeePercent = settings.platformFeePercent || 2;

  // Validate leader share percent (should not exceed 100%)
  const validatedLeaderShare = Math.min(leaderSharePercent, 100);

  // If profit sharing is disabled, leader gets nothing
  const effectiveLeaderSharePercent = settings.enableProfitShare ? validatedLeaderShare : 0;

  if (grossProfit <= 0) {
    return {
      grossProfit,
      platformFee: 0,
      platformFeePercent,
      leaderShare: 0,
      leaderSharePercent: effectiveLeaderSharePercent,
      followerNet: grossProfit,
      currency,
    };
  }

  const platformFee = grossProfit * (platformFeePercent / 100);
  const afterPlatformFee = grossProfit - platformFee;
  const leaderShare = afterPlatformFee * (effectiveLeaderSharePercent / 100);
  const followerNet = afterPlatformFee - leaderShare;

  return {
    grossProfit,
    platformFee,
    platformFeePercent,
    leaderShare,
    leaderSharePercent: effectiveLeaderSharePercent,
    followerNet,
    currency,
  };
}

/**
 * Distribute profit share to leader and record platform fee
 * @param tradeId - The trade ID
 * @param follower - The follower record
 * @param leader - The leader record
 * @param grossProfit - The gross profit amount in the specified currency
 * @param currency - The currency of the profit (quote currency from the trading pair)
 * @param transaction - Optional existing transaction
 */
export async function distributeProfitShare(
  tradeId: string,
  follower: any,
  leader: any,
  grossProfit: number,
  currency: string,
  transaction?: Transaction
): Promise<ProfitShareResult> {
  try {
    if (grossProfit <= 0) {
      return {
        success: true,
        leaderShare: 0,
        platformFee: 0,
        followerNet: grossProfit,
        currency,
      };
    }

    const breakdown = await calculateProfitShareBreakdown(
      grossProfit,
      leader.profitSharePercent || 20,
      currency
    );

    const t = transaction || (await sequelize.transaction());
    const useExternalTransaction = !!transaction;

    try {
      // Credit leader's wallet with their share
      if (breakdown.leaderShare > 0) {
        const leaderWallet = await getWalletByUserIdAndCurrency(
          leader.userId,
          currency
        );

        if (leaderWallet) {
          await updateWalletBalance(leaderWallet, breakdown.leaderShare, "add");

          // Create leader profit share transaction
          await models.copyTradingTransaction.create(
            {
              userId: leader.userId,
              leaderId: leader.id,
              followerId: follower.id,
              tradeId,
              type: "PROFIT_SHARE_RECEIVED",
              amount: breakdown.leaderShare,
              currency,
              fee: 0,
              balanceBefore: parseFloat(leaderWallet.balance.toString()),
              balanceAfter:
                parseFloat(leaderWallet.balance.toString()) +
                breakdown.leaderShare,
              description: `Profit share from follower trade: ${formatCurrencyAmount(breakdown.leaderShare, currency)}`,
              metadata: JSON.stringify({
                grossProfit,
                sharePercent: breakdown.leaderSharePercent,
                currency,
              }),
              status: "COMPLETED",
            },
            { transaction: t }
          );
        }
      }

      // Record follower's profit share paid
      await models.copyTradingTransaction.create(
        {
          userId: follower.userId,
          leaderId: leader.id,
          followerId: follower.id,
          tradeId,
          type: "PROFIT_SHARE_PAID",
          amount: breakdown.leaderShare,
          currency,
          fee: breakdown.platformFee,
          balanceBefore: 0,
          balanceAfter: 0,
          description: `Profit share paid to leader: ${formatCurrencyAmount(breakdown.leaderShare, currency)}`,
          metadata: JSON.stringify({
            grossProfit,
            leaderSharePercent: breakdown.leaderSharePercent,
            platformFeePercent: breakdown.platformFeePercent,
            currency,
          }),
          status: "COMPLETED",
        },
        { transaction: t }
      );

      // Record platform fee
      if (breakdown.platformFee > 0) {
        await models.copyTradingTransaction.create(
          {
            userId: follower.userId,
            followerId: follower.id,
            tradeId,
            type: "PLATFORM_FEE",
            amount: breakdown.platformFee,
            currency,
            fee: 0,
            balanceBefore: 0,
            balanceAfter: 0,
            description: `Platform fee for profitable trade: ${formatCurrencyAmount(breakdown.platformFee, currency)}`,
            metadata: JSON.stringify({
              grossProfit,
              feePercent: breakdown.platformFeePercent,
              currency,
            }),
            status: "COMPLETED",
          },
          { transaction: t }
        );
      }

      // Update leader's total profit from shares
      await models.copyTradingLeader.update(
        {
          totalProfit: literal(
            `"totalProfit" + ${breakdown.leaderShare}`
          ),
        },
        {
          where: { id: leader.id },
          transaction: t,
        }
      );

      if (!useExternalTransaction) {
        await t.commit();
      }

      // Create audit log
      await createAuditLog({
        entityType: "copyTradingTrade",
        entityId: tradeId,
        action: "PROFIT_DISTRIBUTED",
        userId: follower.userId,
        metadata: breakdown,
      });

      return {
        success: true,
        leaderShare: breakdown.leaderShare,
        platformFee: breakdown.platformFee,
        followerNet: breakdown.followerNet,
        currency,
      };
    } catch (error) {
      if (!useExternalTransaction) {
        await t.rollback();
      }
      throw error;
    }
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to distribute profit share", error);
    return {
      success: false,
      leaderShare: 0,
      platformFee: 0,
      followerNet: 0,
      currency,
      error: error.message,
    };
  }
}

// ============================================================================
// BATCH PROFIT DISTRIBUTION
// ============================================================================

/**
 * Process pending profit distributions
 */
export async function processPendingProfitDistributions(): Promise<{
  processed: number;
  failed: number;
}> {
  let processed = 0;
  let failed = 0;

  try {
    // Find closed trades that haven't had profit distributed
    const closedTrades = await models.copyTradingTrade.findAll({
      where: {
        status: "CLOSED",
        followerId: { [Op.ne]: null },
        profit: { [Op.gt]: 0 },
      },
      include: [
        {
          model: models.copyTradingFollower,
          as: "follower",
          include: [
            {
              model: models.copyTradingLeader,
              as: "leader",
            },
          ],
        },
      ],
    });

    for (const trade of closedTrades as any[]) {
      // Check if profit share already distributed
      const existingDistribution = await models.copyTradingTransaction.findOne({
        where: {
          tradeId: trade.id,
          type: "PROFIT_SHARE_PAID",
        },
      });

      if (existingDistribution) {
        continue; // Already distributed
      }

      const follower = trade.follower;
      const leader = follower?.leader;

      if (!follower || !leader) {
        continue;
      }

      // Get profit currency from trade or derive from symbol quote
      const profitCurrency = trade.profitCurrency || getQuoteCurrency(trade.symbol);
      const result = await distributeProfitShare(
        trade.id,
        follower,
        leader,
        trade.profit,
        profitCurrency
      );

      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    }

    return { processed, failed };
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to process pending profit distributions", error);
    return { processed, failed };
  }
}

// ============================================================================
// LEADER EARNINGS
// ============================================================================

/**
 * Get leader's earnings summary
 * All amounts are converted to USDT for consistent aggregation
 */
export async function getLeaderEarnings(
  leaderId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalEarnings: number;
  totalProfitShares: number;
  totalPlatformFees: number;
  tradeCount: number;
  currency: string;
  earningsByCurrency: Record<string, number>;
}> {
  const whereClause: any = {
    leaderId,
    type: "PROFIT_SHARE_RECEIVED",
    status: "COMPLETED",
  };

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt[Op.gte] = startDate;
    if (endDate) whereClause.createdAt[Op.lte] = endDate;
  }

  // Get all transactions with currency info for proper conversion
  const transactions = await models.copyTradingTransaction.findAll({
    where: whereClause,
    attributes: ["amount", "currency"],
  });

  // Convert all amounts to USDT and track by currency
  let totalEarningsUSDT = 0;
  const earningsByCurrency: Record<string, number> = {};
  let tradeCount = 0;

  for (const tx of transactions as any[]) {
    const amount = parseFloat(tx.amount) || 0;
    const currency = tx.currency || "USDT";

    // Track original currency amounts
    earningsByCurrency[currency] = (earningsByCurrency[currency] || 0) + amount;
    tradeCount++;

    // Convert to USDT for totals
    try {
      const amountInUSDT = await convertToUSDT(amount, currency);
      totalEarningsUSDT += amountInUSDT;
    } catch (conversionError) {
      // Fallback to raw amount if conversion fails
      logger.warn("COPY_TRADING", `Currency conversion failed for ${currency}`, conversionError);
      totalEarningsUSDT += amount;
    }
  }

  return {
    totalEarnings: totalEarningsUSDT,
    totalProfitShares: totalEarningsUSDT,
    totalPlatformFees: 0, // Platform fees go to platform, not leader
    tradeCount,
    currency: "USDT", // All totals are in USDT
    earningsByCurrency,
  };
}

/**
 * Get follower's profit share payments
 * All amounts are converted to USDT for consistent aggregation
 */
export async function getFollowerProfitSharePayments(
  followerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalPaid: number;
  totalPlatformFees: number;
  tradeCount: number;
  currency: string;
  paidByCurrency: Record<string, number>;
}> {
  const whereClause: any = {
    followerId,
    status: "COMPLETED",
  };

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt[Op.gte] = startDate;
    if (endDate) whereClause.createdAt[Op.lte] = endDate;
  }

  // Get profit shares paid with currency info
  const profitShares = await models.copyTradingTransaction.findAll({
    where: { ...whereClause, type: "PROFIT_SHARE_PAID" },
    attributes: ["amount", "currency"],
  });

  // Get platform fees with currency info
  const platformFees = await models.copyTradingTransaction.findAll({
    where: { ...whereClause, type: "PLATFORM_FEE" },
    attributes: ["amount", "currency"],
  });

  // Convert profit shares to USDT
  let totalPaidUSDT = 0;
  const paidByCurrency: Record<string, number> = {};
  let tradeCount = 0;

  for (const tx of profitShares as any[]) {
    const amount = parseFloat(tx.amount) || 0;
    const currency = tx.currency || "USDT";

    paidByCurrency[currency] = (paidByCurrency[currency] || 0) + amount;
    tradeCount++;

    try {
      const amountInUSDT = await convertToUSDT(amount, currency);
      totalPaidUSDT += amountInUSDT;
    } catch (conversionError) {
      logger.warn("COPY_TRADING", `Currency conversion failed for ${currency}`, conversionError);
      totalPaidUSDT += amount;
    }
  }

  // Convert platform fees to USDT
  let totalFeesUSDT = 0;

  for (const tx of platformFees as any[]) {
    const amount = parseFloat(tx.amount) || 0;
    const currency = tx.currency || "USDT";

    try {
      const amountInUSDT = await convertToUSDT(amount, currency);
      totalFeesUSDT += amountInUSDT;
    } catch (conversionError) {
      logger.warn("COPY_TRADING", `Currency conversion failed for ${currency}`, conversionError);
      totalFeesUSDT += amount;
    }
  }

  return {
    totalPaid: totalPaidUSDT,
    totalPlatformFees: totalFeesUSDT,
    tradeCount,
    currency: "USDT", // All totals are in USDT
    paidByCurrency,
  };
}

// ============================================================================
// PROFIT SHARE PREVIEW
// ============================================================================

/**
 * Preview profit share for a potential trade close
 */
export async function previewProfitShare(
  tradeId: string,
  closePrice: number
): Promise<{
  grossProfit: number;
  breakdown: ProfitBreakdown | null;
}> {
  const trade = await models.copyTradingTrade.findByPk(tradeId, {
    include: [
      {
        model: models.copyTradingFollower,
        as: "follower",
        include: [{ model: models.copyTradingLeader, as: "leader" }],
      },
    ],
  });

  if (!trade) {
    return { grossProfit: 0, breakdown: null };
  }

  const tradeData = trade as any;
  const entryPrice = tradeData.executedPrice || tradeData.price;
  const amount = tradeData.executedAmount || tradeData.amount;

  const { profit } = calculatePnL(
    entryPrice,
    closePrice,
    amount,
    tradeData.side,
    tradeData.fee || 0
  );

  if (profit <= 0 || !tradeData.follower?.leader) {
    return { grossProfit: profit, breakdown: null };
  }

  const breakdown = await calculateProfitShareBreakdown(
    profit,
    tradeData.follower.leader.profitSharePercent || 20
  );

  return { grossProfit: profit, breakdown };
}
