// Copy Processor - Process copy orders for followers
import { models, sequelize } from "@b/db";
import { Transaction, Op, literal } from "sequelize";
import { logger } from "@b/utils/console";
import {
  getWalletByUserIdAndCurrency,
  updateWalletBalance,
} from "@b/api/(ext)/ecosystem/utils/wallet";
import {
  createOrder,
  getOrderBook,
} from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import { toBigIntFloat } from "@b/api/(ext)/ecosystem/utils/blockchain";
import { checkDailyLimits, recordTrade, recordLoss } from "./dailyLimits";
import {
  getQuoteCurrency,
  getBaseCurrency,
  getTradeCurrency,
} from "./currency";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CopyOrderParams {
  leaderTrade: any;
  follower: any;
  leaderBalance: number;
}

interface CopyOrderResult {
  success: boolean;
  orderId?: string;
  copyTradeId?: string;
  amount?: number;
  price?: number;
  error?: string;
  latencyMs?: number;
}

interface CalculatedAmount {
  amount: number;
  cost: number;
  reason?: string;
}

// ============================================================================
// AMOUNT CALCULATION
// ============================================================================

/**
 * Calculate the amount a follower should copy based on their settings
 */
export function calculateCopyAmount(
  leaderAmount: number,
  leaderPrice: number,
  leaderBalance: number,
  follower: any,
  availableBalance: number
): CalculatedAmount {
  if (availableBalance <= 0) {
    return { amount: 0, cost: 0, reason: "No available balance" };
  }

  let copyAmount: number;
  const riskMultiplier = follower.riskMultiplier || 1;

  switch (follower.copyMode) {
    case "PROPORTIONAL": {
      // Copy the same percentage of balance as the leader
      if (leaderBalance <= 0) {
        return { amount: 0, cost: 0, reason: "Leader balance unknown" };
      }
      const leaderPercent = (leaderAmount * leaderPrice) / leaderBalance;
      copyAmount =
        ((availableBalance * leaderPercent) / leaderPrice) * riskMultiplier;
      break;
    }

    case "FIXED_AMOUNT": {
      // Use a fixed dollar amount per trade
      const fixedAmount = follower.fixedAmount || 0;
      if (fixedAmount <= 0) {
        return { amount: 0, cost: 0, reason: "Fixed amount not configured" };
      }
      copyAmount = (fixedAmount / leaderPrice) * riskMultiplier;
      break;
    }

    case "FIXED_RATIO": {
      // Copy a fixed ratio of the leader's trade
      const ratio = follower.fixedRatio || 0.1;
      copyAmount = leaderAmount * ratio * riskMultiplier;
      break;
    }

    default:
      return { amount: 0, cost: 0, reason: "Invalid copy mode" };
  }

  // Apply max position size limit
  if (follower.maxPositionSize && copyAmount > follower.maxPositionSize) {
    copyAmount = follower.maxPositionSize;
  }

  // Calculate cost
  const cost = copyAmount * leaderPrice;

  // Ensure we don't exceed available balance
  if (cost > availableBalance) {
    copyAmount = availableBalance / leaderPrice;
  }

  return {
    amount: Math.max(0, copyAmount),
    cost: Math.max(0, copyAmount * leaderPrice),
  };
}

// ============================================================================
// ORDER EXECUTION
// ============================================================================

/**
 * Process a copy order for a single follower
 */
export async function processCopyOrder(
  params: CopyOrderParams
): Promise<CopyOrderResult> {
  const { leaderTrade, follower, leaderBalance } = params;
  const startTime = Date.now();

  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  try {
    // Lock the follower record to prevent concurrent modifications
    const lockedFollower = await models.copyTradingFollower.findByPk(
      follower.id,
      {
        transaction: t,
        lock: t.LOCK.UPDATE,
      }
    );

    if (!lockedFollower || (lockedFollower as any).status !== "ACTIVE") {
      await t.rollback();
      return { success: false, error: "Follower is not active" };
    }

    const followerData = lockedFollower as any;

    // Get the follower's allocation for this specific market
    const allocation = await models.copyTradingFollowerAllocation.findOne({
      where: {
        followerId: follower.id,
        symbol: leaderTrade.symbol,
        isActive: true,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!allocation) {
      await t.rollback();
      return {
        success: false,
        error: `No allocation for market ${leaderTrade.symbol}`,
      };
    }

    const allocationData = allocation as any;

    // Check daily limits
    const limitCheck = await checkDailyLimits(follower.id);
    if (!limitCheck.canTrade) {
      await t.rollback();
      return { success: false, error: limitCheck.reason };
    }

    // Determine available amount based on trade side using allocation
    // BUY: uses quote currency (e.g., USDT for BTC/USDT)
    // SELL: uses base currency (e.g., BTC for BTC/USDT)
    const availableAmount =
      leaderTrade.side === "BUY"
        ? allocationData.quoteAmount - allocationData.quoteUsedAmount
        : allocationData.baseAmount - allocationData.baseUsedAmount;

    if (availableAmount <= 0) {
      await t.rollback();
      return {
        success: false,
        error: `Insufficient allocation for ${leaderTrade.symbol} ${leaderTrade.side}. Available: ${availableAmount}`,
      };
    }

    // Calculate copy amount using the allocation's available balance
    const { amount: copyAmount, cost, reason } = calculateCopyAmount(
      leaderTrade.amount,
      leaderTrade.price,
      leaderBalance,
      followerData,
      availableAmount
    );

    if (copyAmount <= 0) {
      await t.rollback();
      return { success: false, error: reason || "Calculated amount is zero" };
    }

    // Get market info - use currency utilities for proper parsing
    const baseCurrency = getBaseCurrency(leaderTrade.symbol);
    const quoteCurrency = getQuoteCurrency(leaderTrade.symbol);
    const market = await models.ecosystemMarket.findOne({
      where: { currency: baseCurrency, pair: quoteCurrency },
      transaction: t,
    });

    if (!market) {
      await t.rollback();
      return { success: false, error: `Market not found: ${leaderTrade.symbol}` };
    }

    const marketData = market as any;
    const minAmount = Number(marketData.metadata?.limits?.amount?.min || 0);

    if (copyAmount < minAmount) {
      await t.rollback();
      return {
        success: false,
        error: `Amount ${copyAmount} ${baseCurrency} below minimum ${minAmount} ${baseCurrency}`,
      };
    }

    // Get effective price (use order book for market orders)
    let effectivePrice = leaderTrade.price;
    if (leaderTrade.type === "MARKET") {
      try {
        const { asks, bids } = await getOrderBook(leaderTrade.symbol);
        if (leaderTrade.side === "BUY" && asks && asks.length > 0) {
          effectivePrice = asks[0][0];
        } else if (leaderTrade.side === "SELL" && bids && bids.length > 0) {
          effectivePrice = bids[0][0];
        }
      } catch (e) {
        // Use leader's price if order book unavailable
      }
    }

    // Calculate fees - fee is always in quote currency
    const precision = Number(marketData.metadata?.precision?.price || 8);
    const feeRate = Number(marketData.metadata?.taker || 0.1);
    const fee = parseFloat(
      ((copyAmount * effectivePrice * feeRate) / 100).toFixed(precision)
    );

    // Determine which currency to spend based on trade side
    // BUY: spend quote currency (e.g., USDT) to receive base (e.g., BTC)
    // SELL: spend base currency (e.g., BTC) to receive quote (e.g., USDT)
    const { spend: spendCurrency, receive: receiveCurrency } = getTradeCurrency(
      leaderTrade.symbol,
      leaderTrade.side
    );

    const totalCost =
      leaderTrade.side === "BUY"
        ? parseFloat((copyAmount * effectivePrice + fee).toFixed(precision))
        : copyAmount;

    // Get follower's COPY_TRADING wallet for the currency they need to spend
    // Use transaction and lock to prevent race conditions
    const wallet = await getWalletByUserIdAndCurrency(
      follower.userId,
      spendCurrency,
      "COPY_TRADING",
      t,
      true // lock the row
    );

    if (!wallet) {
      await t.rollback();
      return {
        success: false,
        error: `Wallet not found for ${spendCurrency}`,
      };
    }

    // IMPORTANT: For copy trading, allocated funds are in COPY_TRADING wallet balance
    // Funds were transferred from ECO to CT wallet during allocation
    // When trade executes, ecosystem will lock CT wallet funds in inOrder
    const walletBalance = parseFloat(wallet.balance.toString());

    if (walletBalance < totalCost) {
      await t.rollback();
      return {
        success: false,
        error: `Insufficient ${spendCurrency} balance: ${walletBalance} < ${totalCost}`,
      };
    }

    // Create the order - fee currency is always quote currency
    const newOrder = await createOrder({
      userId: follower.userId,
      symbol: leaderTrade.symbol,
      amount: toBigIntFloat(copyAmount),
      price: toBigIntFloat(effectivePrice),
      cost: toBigIntFloat(totalCost),
      type: leaderTrade.type === "MARKET" ? "MARKET" : "LIMIT",
      side: leaderTrade.side,
      fee: toBigIntFloat(fee),
      feeCurrency: quoteCurrency, // Fee is always in quote currency
    });

    // Lock funds in inOrder when placing the order
    // This uses the standard wallet locking mechanism for ecosystem trades
    await updateWalletBalance(wallet, totalCost, "subtract", t);

    // Calculate latency
    const latencyMs = Date.now() - startTime;

    // Create copy trade record with proper currency tracking
    // Profit currency is always the quote currency (what you receive when selling or profit/loss measured in)
    const copyTrade = await models.copyTradingTrade.create(
      {
        leaderId: leaderTrade.leaderId,
        followerId: follower.id,
        leaderOrderId: leaderTrade.leaderOrderId,
        symbol: leaderTrade.symbol,
        side: leaderTrade.side,
        type: leaderTrade.type,
        amount: copyAmount,
        price: effectivePrice,
        cost: totalCost,
        fee,
        feeCurrency: quoteCurrency, // Fee is always in quote currency
        profitCurrency: quoteCurrency, // Profit/loss is measured in quote currency
        status: "OPEN",
        isLeaderTrade: false,
        latencyMs,
        executedAmount: 0,
        executedPrice: 0,
      },
      { transaction: t }
    );

    // Update follower's trade count
    await followerData.update(
      {
        totalTrades: literal(`"totalTrades" + 1`),
      },
      { transaction: t }
    );

    // Update the allocation's used amounts based on trade side
    if (leaderTrade.side === "BUY") {
      // BUY uses quote currency
      await allocationData.update(
        {
          quoteUsedAmount: literal(`"quoteUsedAmount" + ${totalCost}`),
          totalTrades: literal(`"totalTrades" + 1`),
        },
        { transaction: t }
      );
    } else {
      // SELL uses base currency
      await allocationData.update(
        {
          baseUsedAmount: literal(`"baseUsedAmount" + ${copyAmount}`),
          totalTrades: literal(`"totalTrades" + 1`),
        },
        { transaction: t }
      );
    }

    // Record trade for daily limits
    await recordTrade(follower.id, totalCost);

    // Create transaction record with proper currency
    await models.copyTradingTransaction.create(
      {
        userId: follower.userId,
        followerId: follower.id,
        leaderId: leaderTrade.leaderId,
        tradeId: (copyTrade as any).id,
        type: "TRADE_OPEN",
        amount: totalCost,
        currency: spendCurrency, // Currency being spent
        fee: 0,
        balanceBefore: walletBalance,
        balanceAfter: walletBalance - totalCost,
        description: `Copied ${leaderTrade.side} trade: ${copyAmount.toFixed(6)} ${baseCurrency} @ ${effectivePrice} ${quoteCurrency}`,
        metadata: JSON.stringify({
          symbol: leaderTrade.symbol,
          orderId: newOrder.id,
          latencyMs,
          baseCurrency,
          quoteCurrency,
          spendCurrency,
          receiveCurrency,
        }),
        status: "COMPLETED",
      },
      { transaction: t }
    );

    await t.commit();

    return {
      success: true,
      orderId: newOrder.id,
      copyTradeId: (copyTrade as any).id,
      amount: copyAmount,
      price: effectivePrice,
      latencyMs,
    };
  } catch (error: any) {
    await t.rollback();
    logger.error("COPY_TRADING_ORDER", `Error processing copy order: ${error.message}`, error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process copy orders for multiple followers in parallel with concurrency limit
 */
export async function processCopyOrdersBatch(
  leaderTrade: any,
  followers: any[],
  leaderBalance: number,
  concurrencyLimit: number = 5
): Promise<{ results: CopyOrderResult[]; successCount: number; failCount: number }> {
  const results: CopyOrderResult[] = [];
  let successCount = 0;
  let failCount = 0;

  // Process in batches to limit concurrency
  for (let i = 0; i < followers.length; i += concurrencyLimit) {
    const batch = followers.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map((follower) =>
        processCopyOrder({ leaderTrade, follower, leaderBalance })
      )
    );

    for (const result of batchResults) {
      results.push(result);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  return { results, successCount, failCount };
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Process a copy order with retry logic
 */
export async function processCopyOrderWithRetry(
  params: CopyOrderParams,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<CopyOrderResult> {
  let lastError: string = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await processCopyOrder(params);

    if (result.success) {
      return result;
    }

    lastError = result.error || "Unknown error";

    // Don't retry for certain error types
    if (
      lastError.includes("Insufficient balance") ||
      lastError.includes("not active") ||
      lastError.includes("daily limit")
    ) {
      return result;
    }

    // Wait before retry
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  return { success: false, error: `Failed after ${maxRetries} attempts: ${lastError}` };
}
