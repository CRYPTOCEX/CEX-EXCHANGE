// Execution Utilities - Order execution and risk management
import { models, sequelize } from "@b/db";
import { Op, Transaction } from "sequelize";
import { logger } from "@b/utils/console";
import {
  getWalletByUserIdAndCurrency,
  updateWalletBalance,
} from "@b/api/(ext)/ecosystem/utils/wallet";
import {
  createOrder,
  cancelOrderByUuid,
  getOrdersByUserId,
  getOrderBook,
} from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import { toBigIntFloat, fromBigInt } from "@b/api/(ext)/ecosystem/utils/blockchain";
import { getCopyTradingSettings, createAuditLog } from "./index";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ExecutionParams {
  userId: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  amount: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
}

interface ExecutionResult {
  success: boolean;
  orderId?: string;
  executedAmount?: number;
  executedPrice?: number;
  fee?: number;
  error?: string;
}

interface RiskCheckResult {
  passed: boolean;
  reason?: string;
  adjustedAmount?: number;
}

// ============================================================================
// ORDER EXECUTION
// ============================================================================

/**
 * Execute an order with risk checks
 */
export async function executeOrder(
  params: ExecutionParams
): Promise<ExecutionResult> {
  const { userId, symbol, side, type, amount, price } = params;

  try {
    // Get market info
    const [currency, pair] = symbol.split("/");
    const market = await models.ecosystemMarket.findOne({
      where: { currency, pair },
    });

    if (!market) {
      return { success: false, error: `Market not found: ${symbol}` };
    }

    const marketData = market as any;

    // Validate amount against market limits
    const minAmount = Number(marketData.metadata?.limits?.amount?.min || 0);
    const maxAmount = Number(
      marketData.metadata?.limits?.amount?.max || Number.MAX_SAFE_INTEGER
    );

    if (amount < minAmount) {
      return { success: false, error: `Amount below minimum: ${minAmount}` };
    }
    if (amount > maxAmount) {
      return { success: false, error: `Amount above maximum: ${maxAmount}` };
    }

    // Get effective price for market orders
    let effectivePrice = price;
    if (type === "MARKET") {
      const { asks, bids } = await getOrderBook(symbol);
      if (side === "BUY" && asks && asks.length > 0) {
        effectivePrice = asks[0][0];
      } else if (side === "SELL" && bids && bids.length > 0) {
        effectivePrice = bids[0][0];
      }
    }

    // Calculate cost and fees
    const precision = Number(marketData.metadata?.precision?.price || 8);
    const feeRate = Number(marketData.metadata?.taker || 0.1);
    const fee = parseFloat(
      ((amount * effectivePrice * feeRate) / 100).toFixed(precision)
    );
    const cost =
      side === "BUY"
        ? parseFloat((amount * effectivePrice + fee).toFixed(precision))
        : amount;

    // Check wallet balance
    const walletCurrency = side === "BUY" ? pair : currency;
    const wallet = await getWalletByUserIdAndCurrency(userId, walletCurrency);

    if (!wallet) {
      return { success: false, error: `Wallet not found: ${walletCurrency}` };
    }

    const walletBalance =
      parseFloat(wallet.balance.toString()) -
      parseFloat(wallet.inOrder?.toString() || "0");

    if (walletBalance < cost) {
      return {
        success: false,
        error: `Insufficient balance: ${walletBalance} < ${cost}`,
      };
    }

    // Create the order
    const order = await createOrder({
      userId,
      symbol,
      amount: toBigIntFloat(amount),
      price: toBigIntFloat(effectivePrice),
      cost: toBigIntFloat(cost),
      type,
      side,
      fee: toBigIntFloat(fee),
      feeCurrency: pair,
    });

    // Update wallet balance
    await updateWalletBalance(wallet, cost, "subtract");

    return {
      success: true,
      orderId: order.id,
      executedAmount: amount,
      executedPrice: effectivePrice,
      fee,
    };
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to execute order", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel an existing order
 */
export async function cancelCopyOrder(
  orderId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all user orders to find the one we need to cancel
    const orders = await getOrdersByUserId(userId);
    const order = orders.find((o) => o.id === orderId);

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Format createdAt as ISO string for ScyllaDB
    const createdAtStr =
      order.createdAt instanceof Date
        ? order.createdAt.toISOString()
        : String(order.createdAt);

    // Call cancelOrderByUuid with all required parameters
    await cancelOrderByUuid(
      userId,
      orderId,
      createdAtStr,
      order.symbol,
      order.price,
      order.side,
      order.remaining || order.amount
    );
    return { success: true };
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to cancel order", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// RISK MANAGEMENT
// ============================================================================

/**
 * Check position size against follower limits
 */
export async function checkPositionSize(
  followerId: string,
  proposedAmount: number,
  price: number
): Promise<RiskCheckResult> {
  const follower = await models.copyTradingFollower.findByPk(followerId);
  if (!follower) {
    return { passed: false, reason: "Follower not found" };
  }

  const followerData = follower as any;
  const proposedCost = proposedAmount * price;

  // Check max position size
  if (
    followerData.maxPositionSize &&
    proposedAmount > followerData.maxPositionSize
  ) {
    return {
      passed: true,
      adjustedAmount: followerData.maxPositionSize,
      reason: "Adjusted to max position size",
    };
  }

  // Check available balance
  const availableBalance =
    followerData.allocatedAmount - followerData.usedAmount;
  if (proposedCost > availableBalance) {
    return {
      passed: true,
      adjustedAmount: availableBalance / price,
      reason: "Adjusted to available balance",
    };
  }

  return { passed: true };
}

/**
 * Check stop-loss and take-profit levels
 */
export async function checkStopLevels(
  tradeId: string,
  currentPrice: number
): Promise<{
  triggerStopLoss: boolean;
  triggerTakeProfit: boolean;
  stopLossPrice?: number;
  takeProfitPrice?: number;
}> {
  const trade = await models.copyTradingTrade.findByPk(tradeId, {
    include: [{ model: models.copyTradingFollower, as: "follower" }],
  });

  if (!trade) {
    return { triggerStopLoss: false, triggerTakeProfit: false };
  }

  const tradeData = trade as any;
  const follower = tradeData.follower;

  if (!follower) {
    return { triggerStopLoss: false, triggerTakeProfit: false };
  }

  const entryPrice = tradeData.executedPrice || tradeData.price;
  const isLong = tradeData.side === "BUY";

  // Calculate stop-loss price
  let stopLossPrice: number | undefined;
  if (follower.stopLossPercent) {
    stopLossPrice = isLong
      ? entryPrice * (1 - follower.stopLossPercent / 100)
      : entryPrice * (1 + follower.stopLossPercent / 100);
  }

  // Calculate take-profit price
  let takeProfitPrice: number | undefined;
  if (follower.takeProfitPercent) {
    takeProfitPrice = isLong
      ? entryPrice * (1 + follower.takeProfitPercent / 100)
      : entryPrice * (1 - follower.takeProfitPercent / 100);
  }

  // Check if stop-loss triggered
  const triggerStopLoss = stopLossPrice
    ? isLong
      ? currentPrice <= stopLossPrice
      : currentPrice >= stopLossPrice
    : false;

  // Check if take-profit triggered
  const triggerTakeProfit = takeProfitPrice
    ? isLong
      ? currentPrice >= takeProfitPrice
      : currentPrice <= takeProfitPrice
    : false;

  return {
    triggerStopLoss,
    triggerTakeProfit,
    stopLossPrice,
    takeProfitPrice,
  };
}

/**
 * Monitor and execute stop-loss/take-profit for open trades
 */
export async function monitorStopLevels(): Promise<{
  processed: number;
  triggered: number;
}> {
  let processed = 0;
  let triggered = 0;

  try {
    // Get all open follower trades with stop levels configured
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
      processed++;

      // Get current price
      const [currency, pair] = trade.symbol.split("/");
      const { asks, bids } = await getOrderBook(trade.symbol);
      const currentPrice =
        trade.side === "BUY"
          ? bids && bids.length > 0
            ? bids[0][0]
            : trade.price
          : asks && asks.length > 0
          ? asks[0][0]
          : trade.price;

      // Check stop levels
      const { triggerStopLoss, triggerTakeProfit } = await checkStopLevels(
        trade.id,
        currentPrice
      );

      if (triggerStopLoss || triggerTakeProfit) {
        triggered++;

        // Import closeTrade here to avoid circular dependency
        const { closeTrade } = await import("./fillMonitor");
        await closeTrade(trade.id, currentPrice);

        // Create audit log
        await createAuditLog({
          entityType: "copyTradingTrade",
          entityId: trade.id,
          action: triggerStopLoss ? "STOP_LOSS_TRIGGERED" : "TAKE_PROFIT_TRIGGERED",
          metadata: {
            currentPrice,
            entryPrice: trade.executedPrice || trade.price,
          },
        });
      }
    }

    return { processed, triggered };
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to monitor stop levels", error);
    return { processed, triggered };
  }
}

// ============================================================================
// SLIPPAGE PROTECTION
// ============================================================================

/**
 * Calculate expected slippage for an order
 */
export async function calculateExpectedSlippage(
  symbol: string,
  side: "BUY" | "SELL",
  amount: number,
  price: number
): Promise<{ slippage: number; effectivePrice: number }> {
  try {
    const { asks, bids } = await getOrderBook(symbol);
    const book = side === "BUY" ? asks : bids;

    if (!book || book.length === 0) {
      return { slippage: 0, effectivePrice: price };
    }

    let remainingAmount = amount;
    let totalCost = 0;

    for (const [levelPrice, levelAmount] of book) {
      const fillAmount = Math.min(remainingAmount, levelAmount);
      totalCost += fillAmount * levelPrice;
      remainingAmount -= fillAmount;

      if (remainingAmount <= 0) break;
    }

    const effectivePrice = totalCost / amount;
    const slippage = ((effectivePrice - price) / price) * 100;

    return { slippage: Math.abs(slippage), effectivePrice };
  } catch (error) {
    return { slippage: 0, effectivePrice: price };
  }
}

/**
 * Check if slippage is within acceptable limits
 */
export async function checkSlippageLimit(
  symbol: string,
  side: "BUY" | "SELL",
  amount: number,
  price: number,
  maxSlippagePercent: number = 2
): Promise<{ acceptable: boolean; expectedSlippage: number }> {
  const { slippage, effectivePrice } = await calculateExpectedSlippage(
    symbol,
    side,
    amount,
    price
  );

  return {
    acceptable: slippage <= maxSlippagePercent,
    expectedSlippage: slippage,
  };
}

// ============================================================================
// ORDER MATCHING STATUS
// ============================================================================

/**
 * Get order status from the matching engine
 */
export async function getOrderStatus(orderId: string): Promise<{
  status: string;
  filledAmount: number;
  filledPrice: number;
  fee: number;
} | null> {
  try {
    // This would integrate with the actual matching engine
    // For now, return null to indicate we need to check the database
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Sync trade status with order status
 */
export async function syncTradeStatus(tradeId: string): Promise<boolean> {
  try {
    const trade = await models.copyTradingTrade.findByPk(tradeId);
    if (!trade) return false;

    const tradeData = trade as any;
    const orderStatus = await getOrderStatus(tradeData.leaderOrderId);

    if (orderStatus) {
      await tradeData.update({
        executedAmount: orderStatus.filledAmount,
        executedPrice: orderStatus.filledPrice,
        fee: orderStatus.fee,
        status: orderStatus.status === "FILLED" ? "OPEN" : tradeData.status,
      });
      return true;
    }

    return false;
  } catch (error: any) {
    logger.error("COPY_TRADING", "Failed to sync trade status", error);
    return false;
  }
}
