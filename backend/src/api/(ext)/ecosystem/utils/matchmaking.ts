import { models, sequelize } from "@b/db";
import {
  BigIntReplacer,
  fromBigInt,
  fromBigIntMultiply,
  removeTolerance,
} from "./blockchain";
import type { Order, OrderBook } from "./scylla/queries";
import { insertTrade } from "./scylla/queries";
import { updateWalletBalance, updateWalletForFill } from "./wallet";
import { handleTradesBroadcast, handleOrderBroadcast } from "./ws";
import { logger } from "@b/utils/console";

// ============================================
// AI Bot Position & PnL Tracking
// ============================================

/**
 * Record a real trade for a bot (when bot trades with a real user)
 * This updates the bot's position and calculates PnL
 *
 * @param botId - The AI bot's ID
 * @param marketId - The ecosystem market ID
 * @param symbol - Trading pair symbol (e.g., "BTC/USDT")
 * @param side - "BUY" or "SELL"
 * @param price - Trade price
 * @param amount - Trade amount
 * @param counterpartyUserId - The real user's ID
 */
async function recordBotRealTrade(
  botId: string,
  marketId: string | undefined,
  symbol: string,
  side: "BUY" | "SELL",
  price: number,
  amount: number,
  counterpartyUserId: string
): Promise<void> {
  try {
    // Get the bot from database
    const bot = await models.aiBot.findByPk(botId);
    if (!bot) {
      logger.warn("BOT_PNL", `Bot ${botId} not found, skipping trade recording`);
      return;
    }

    const botData = bot.get({ plain: true }) as any;
    const currentPosition = Number(botData.currentPosition || 0);
    const avgEntryPrice = Number(botData.avgEntryPrice || 0);

    let newPosition = currentPosition;
    let newAvgEntryPrice = avgEntryPrice;
    let realizedPnL = 0;
    let isProfitable = false;

    if (side === "BUY") {
      // Bot is BUYING - increasing position
      // If closing a short or adding to long
      if (currentPosition < 0) {
        // Closing short position - calculate PnL
        const closingAmount = Math.min(amount, Math.abs(currentPosition));
        // Short profit = (entry price - exit price) * amount
        realizedPnL = (avgEntryPrice - price) * closingAmount;
        isProfitable = realizedPnL > 0;

        // Remaining after closing short
        const remainingAmount = amount - closingAmount;
        if (remainingAmount > 0) {
          // Opening new long position with remaining
          newPosition = remainingAmount;
          newAvgEntryPrice = price;
        } else {
          // Just reduced short position
          newPosition = currentPosition + amount;
          // Keep avg entry price for remaining short
        }
      } else {
        // Adding to long position - calculate new average entry
        const totalCost = currentPosition * avgEntryPrice + amount * price;
        newPosition = currentPosition + amount;
        newAvgEntryPrice = newPosition > 0 ? totalCost / newPosition : 0;
      }
    } else {
      // Bot is SELLING - decreasing position
      // If closing a long or adding to short
      if (currentPosition > 0) {
        // Closing long position - calculate PnL
        const closingAmount = Math.min(amount, currentPosition);
        // Long profit = (exit price - entry price) * amount
        realizedPnL = (price - avgEntryPrice) * closingAmount;
        isProfitable = realizedPnL > 0;

        // Remaining after closing long
        const remainingAmount = amount - closingAmount;
        if (remainingAmount > 0) {
          // Opening new short position with remaining
          newPosition = -remainingAmount;
          newAvgEntryPrice = price;
        } else {
          // Just reduced long position
          newPosition = currentPosition - amount;
          // Keep avg entry price for remaining long
        }
      } else {
        // Adding to short position - calculate new average entry
        const totalCost = Math.abs(currentPosition) * avgEntryPrice + amount * price;
        newPosition = currentPosition - amount;
        newAvgEntryPrice = newPosition !== 0 ? totalCost / Math.abs(newPosition) : 0;
      }
    }

    // Update bot stats in database
    const updates: any = {
      currentPosition: newPosition,
      avgEntryPrice: newAvgEntryPrice,
      realTradesExecuted: (botData.realTradesExecuted || 0) + 1,
      totalVolume: (Number(botData.totalVolume) || 0) + amount,
      lastTradeAt: new Date(),
    };

    // If we realized any PnL, update those stats
    if (realizedPnL !== 0) {
      updates.totalRealizedPnL = (Number(botData.totalRealizedPnL) || 0) + realizedPnL;
      if (isProfitable) {
        updates.profitableTrades = (botData.profitableTrades || 0) + 1;
      }
    }

    await bot.update(updates);

    logger.info(
      "BOT_PNL",
      `Bot ${botId} ${side} ${amount.toFixed(4)} @ ${price.toFixed(6)} | Position: ${currentPosition.toFixed(4)} -> ${newPosition.toFixed(4)} | PnL: ${realizedPnL.toFixed(4)} | Profitable: ${isProfitable}`
    );
  } catch (error) {
    // Don't fail the trade if bot tracking fails
    logger.error("BOT_PNL", `Failed to record trade for bot ${botId}`, error);
  }
}

// ============================================
// AI Market Maker Pool Integration
// ============================================

/**
 * Check if an order is from an AI bot (uses pool liquidity)
 */
function isBotOrder(order: Order): boolean {
  return !!order.marketMakerId;
}

/**
 * Get pool for a market maker
 */
async function getPoolForMarketMaker(marketMakerId: string) {
  const pool = await models.aiMarketMakerPool.findOne({
    where: { marketMakerId },
  });
  return pool;
}

/**
 * Update pool balance after a bot trade
 * @param marketMakerId - The market maker ID
 * @param baseDelta - Change in base currency (positive = add, negative = subtract)
 * @param quoteDelta - Change in quote currency (positive = add, negative = subtract)
 */
async function updatePoolBalance(
  marketMakerId: string,
  baseDelta: number,
  quoteDelta: number
): Promise<void> {
  const pool = await getPoolForMarketMaker(marketMakerId);
  if (!pool) {
    throw new Error(`Pool not found for market maker ${marketMakerId}`);
  }

  const poolData = pool as any;
  const newBaseBalance = Number(poolData.baseCurrencyBalance) + baseDelta;
  const newQuoteBalance = Number(poolData.quoteCurrencyBalance) + quoteDelta;

  // Validate pool has sufficient balance
  if (newBaseBalance < 0) {
    throw new Error(`Insufficient pool base balance: need ${Math.abs(baseDelta)}, have ${poolData.baseCurrencyBalance}`);
  }
  if (newQuoteBalance < 0) {
    throw new Error(`Insufficient pool quote balance: need ${Math.abs(quoteDelta)}, have ${poolData.quoteCurrencyBalance}`);
  }

  await pool.update({
    baseCurrencyBalance: newBaseBalance,
    quoteCurrencyBalance: newQuoteBalance,
  });
}

const SCALING_FACTOR = BigInt(10 ** 18);

// Rate limit error logging for AI system user and system-like users
// Includes various formats that may appear in errors
const AI_SYSTEM_USER_IDS = [
  "a1000000-0000-4000-a000-000000000001", // new AI user format
  "00000000-0000-0000-0000-000000000001", // legacy AI user format
  "00000000-0000-0000-0000-000000000000", // fallback from invalid UUID conversion
];
let aiUserErrorCount = 0;
let lastAiUserErrorTime = 0;
const AI_ERROR_LOG_INTERVAL = 60000; // Only log once per minute

function isAiSystemUser(userId: string): boolean {
  // Check direct match
  if (AI_SYSTEM_USER_IDS.includes(userId)) return true;
  // Check for system-like patterns (all zeros or starts with system prefix)
  if (userId.startsWith("00000000-0000-0000") || userId.startsWith("a1000000-0000-4000")) return true;
  return false;
}

export const matchAndCalculateOrders = async (
  orders: Order[],
  currentOrderBook: OrderBook
) => {
  const matchedOrders: Order[] = [];
  const bookUpdates: OrderBook = { bids: {}, asks: {} };
  const processedOrders: Set<string> = new Set();

  const buyOrders = filterAndSortOrders(orders, "BUY", true);
  const sellOrders = filterAndSortOrders(orders, "SELL", false);

  let buyIndex = 0,
    sellIndex = 0;

  while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
    const buyOrder = buyOrders[buyIndex];
    const sellOrder = sellOrders[sellIndex];

    if (processedOrders.has(buyOrder.id) || processedOrders.has(sellOrder.id)) {
      if (processedOrders.has(buyOrder.id)) buyIndex++;
      if (processedOrders.has(sellOrder.id)) sellIndex++;
      continue;
    }

    let matchFound = false;

    if (buyOrder.type === "LIMIT" && sellOrder.type === "LIMIT") {
      matchFound =
        (buyOrder.side === "BUY" && buyOrder.price >= sellOrder.price) ||
        (buyOrder.side === "SELL" && sellOrder.price >= buyOrder.price);
    } else if (buyOrder.type === "MARKET" || sellOrder.type === "MARKET") {
      matchFound = true;
    }

    if (matchFound) {
      processedOrders.add(buyOrder.id);
      processedOrders.add(sellOrder.id);

      try {
        await processMatchedOrders(
          buyOrder,
          sellOrder,
          currentOrderBook,
          bookUpdates
        );
        // Only add to matchedOrders if wallet updates succeeded
        matchedOrders.push(buyOrder, sellOrder);
      } catch (error) {
        // Rate limit error logging for AI system user wallet errors
        const errorStr = String(error);

        // Check if this is an AI/system user error - multiple ways to detect:
        // 1. Error message contains system user IDs
        // 2. Order belongs to system user
        // 3. Error is about wallet not found for zeros UUID (invalid/legacy orders)
        const errorContainsSystemId = AI_SYSTEM_USER_IDS.some(id => errorStr.includes(id));
        const orderFromSystemUser = isAiSystemUser(buyOrder.userId) || isAiSystemUser(sellOrder.userId);
        const isWalletNotFoundError = errorStr.includes("Wallet not found for user");

        // Suppress wallet errors for system users or invalid legacy orders
        const shouldSuppressError = errorContainsSystemId || orderFromSystemUser ||
          (isWalletNotFoundError && errorStr.includes("00000000"));

        if (shouldSuppressError) {
          aiUserErrorCount++;
          const now = Date.now();
          if (now - lastAiUserErrorTime > AI_ERROR_LOG_INTERVAL) {
            logger.warn("MATCHING", `System/AI user wallet errors: ${aiUserErrorCount} in the last minute. Suppressing to reduce log noise.`);
            lastAiUserErrorTime = now;
            aiUserErrorCount = 0;
          }
        } else {
          logger.error("MATCHING", "Failed to process matched orders", error);
        }
        // Remove from processed orders so they can be tried again
        processedOrders.delete(buyOrder.id);
        processedOrders.delete(sellOrder.id);
        // Skip this match and continue
        continue;
      }

      if (buyOrder.type === "LIMIT" && buyOrder.remaining === BigInt(0)) {
        buyIndex++;
      }
      if (sellOrder.type === "LIMIT" && sellOrder.remaining === BigInt(0)) {
        sellIndex++;
      }

      if (buyOrder.type === "MARKET" && buyOrder.remaining > BigInt(0)) {
        processedOrders.delete(buyOrder.id);
      }
      if (sellOrder.type === "MARKET" && sellOrder.remaining > BigInt(0)) {
        processedOrders.delete(sellOrder.id);
      }
    } else {
      if (
        buyOrder.type !== "MARKET" &&
        BigInt(buyOrder.price) < BigInt(sellOrder.price)
      ) {
        buyIndex++;
      }
      if (
        sellOrder.type !== "MARKET" &&
        BigInt(sellOrder.price) > BigInt(buyOrder.price)
      ) {
        sellIndex++;
      }
    }
  }

  return { matchedOrders, bookUpdates };
};

export async function processMatchedOrders(
  buyOrder: Order,
  sellOrder: Order,
  currentOrderBook: OrderBook,
  bookUpdates: OrderBook
) {
  // Determine the amount to fill
  const amountToFill =
    buyOrder.remaining < sellOrder.remaining
      ? buyOrder.remaining
      : sellOrder.remaining;

  // Update the orders' filled and remaining fields
  [buyOrder, sellOrder].forEach((order) => {
    order.filled += amountToFill;
    order.remaining -= amountToFill;
    order.status = order.remaining === BigInt(0) ? "CLOSED" : "OPEN";
  });

  // Extract base and quote currency from symbol, e.g., "BTC/USDT" => base=BTC, quote=USDT
  const [baseCurrency, quoteCurrency] = buyOrder.symbol.split("/");

  // Check if orders are from bots (use pool liquidity)
  const buyerIsBot = isBotOrder(buyOrder);
  const sellerIsBot = isBotOrder(sellOrder);

  // Determine the final trade price
  const finalPrice =
    buyOrder.type.toUpperCase() === "MARKET"
      ? sellOrder.price
      : sellOrder.type.toUpperCase() === "MARKET"
        ? buyOrder.price
        : buyOrder.createdAt <= sellOrder.createdAt
          ? buyOrder.price
          : sellOrder.price;

  // Calculate cost: amountToFill * finalPrice (scaled by 10^18)
  const cost = (amountToFill * finalPrice) / SCALING_FACTOR;

  // Calculate fill ratios for proportional fee calculation
  const buyFillRatio = Number(amountToFill) / Number(buyOrder.amount);
  const sellFillRatio = Number(amountToFill) / Number(sellOrder.amount);

  // Proportional fees
  const sellProportionalFee = (sellOrder.fee * BigInt(Math.floor(sellFillRatio * 1e18))) / SCALING_FACTOR;
  const buyProportionalCostWithFee = (buyOrder.cost * BigInt(Math.floor(buyFillRatio * 1e18))) / SCALING_FACTOR;

  // Convert to numbers
  const amountToFillNum = fromBigInt(removeTolerance(amountToFill));
  const costNum = fromBigInt(removeTolerance(cost));
  const sellFeeNum = fromBigInt(removeTolerance(sellProportionalFee));
  const buyReleaseNum = fromBigInt(removeTolerance(buyProportionalCostWithFee));

  // ============================================
  // Handle Bot vs Bot trades (both use same pool)
  // ============================================
  if (buyerIsBot && sellerIsBot) {
    // Both are bots from the same market maker - this is an internal AI trade
    // Pool balance doesn't change (bot buys from bot = net zero)
    // Just record the trade for volume/stats
  }
  // ============================================
  // Handle Bot (buyer) vs User (seller)
  // ============================================
  else if (buyerIsBot && !sellerIsBot) {
    // Bot is buying from a real user
    // - Pool pays QUOTE currency (cost) to user
    // - Pool receives BASE currency (amount) from user
    // - User's BASE wallet releases locked tokens
    // - User's QUOTE wallet receives payment

    // Get seller's wallets
    const sellerBaseWallet = await getUserEcosystemWalletByCurrency(sellOrder.userId, baseCurrency);
    const sellerQuoteWallet = await getUserEcosystemWalletByCurrency(sellOrder.userId, quoteCurrency);

    if (!sellerBaseWallet || !sellerQuoteWallet) {
      throw new Error(`Wallets not found for seller ${sellOrder.userId}`);
    }

    // Validate seller has locked funds
    const sellerInOrder = parseFloat(sellerBaseWallet.inOrder?.toString() || "0");
    if (sellerInOrder < amountToFillNum) {
      throw new Error(`Seller has insufficient locked funds`);
    }

    // Update pool: receives BASE, pays QUOTE
    await updatePoolBalance(
      buyOrder.marketMakerId!,
      amountToFillNum,  // Add BASE to pool
      -costNum          // Subtract QUOTE from pool (payment to seller)
    );

    // Update seller's wallets
    await updateWalletForFill(sellerBaseWallet, 0, -amountToFillNum, "seller releases base to bot");
    await updateWalletForFill(sellerQuoteWallet, costNum - sellFeeNum, 0, "seller receives quote from bot");

    // Record bot's real trade for PnL tracking (bot is BUYING)
    if (buyOrder.botId) {
      const tradePrice = fromBigInt(finalPrice);
      recordBotRealTrade(
        buyOrder.botId,
        undefined, // marketId not on Order type
        buyOrder.symbol,
        "BUY",
        tradePrice,
        amountToFillNum,
        sellOrder.userId
      ).catch(err => logger.error("BOT_PNL", "Error recording bot trade", err));
    }
  }
  // ============================================
  // Handle User (buyer) vs Bot (seller)
  // ============================================
  else if (!buyerIsBot && sellerIsBot) {
    // User is buying from bot
    // - User pays QUOTE currency (cost) to pool
    // - User receives BASE currency (amount) from pool
    // - User's QUOTE wallet releases locked tokens
    // - User's BASE wallet receives tokens

    // Get buyer's wallets
    const buyerBaseWallet = await getUserEcosystemWalletByCurrency(buyOrder.userId, baseCurrency);
    const buyerQuoteWallet = await getUserEcosystemWalletByCurrency(buyOrder.userId, quoteCurrency);

    if (!buyerBaseWallet || !buyerQuoteWallet) {
      throw new Error(`Wallets not found for buyer ${buyOrder.userId}`);
    }

    // Validate buyer has locked funds
    const buyerInOrder = parseFloat(buyerQuoteWallet.inOrder?.toString() || "0");
    if (buyerInOrder < buyReleaseNum) {
      throw new Error(`Buyer has insufficient locked funds`);
    }

    // Update pool: pays BASE, receives QUOTE
    await updatePoolBalance(
      sellOrder.marketMakerId!,
      -amountToFillNum, // Subtract BASE from pool (payment to buyer)
      costNum           // Add QUOTE to pool (received from buyer)
    );

    // Update buyer's wallets
    await updateWalletForFill(buyerBaseWallet, amountToFillNum, 0, "buyer receives base from bot");
    await updateWalletForFill(buyerQuoteWallet, 0, -buyReleaseNum, "buyer releases quote to bot");

    // Record bot's real trade for PnL tracking (bot is SELLING)
    if (sellOrder.botId) {
      const tradePrice = fromBigInt(finalPrice);
      recordBotRealTrade(
        sellOrder.botId,
        undefined, // marketId not on Order type
        sellOrder.symbol,
        "SELL",
        tradePrice,
        amountToFillNum,
        buyOrder.userId
      ).catch(err => logger.error("BOT_PNL", "Error recording bot trade", err));
    }
  }
  // ============================================
  // Handle User vs User trades (standard flow)
  // ============================================
  else {
    // Standard user-to-user trade - use existing wallet logic
    const buyerBaseWallet = await getUserEcosystemWalletByCurrency(buyOrder.userId, baseCurrency);
    const buyerQuoteWallet = await getUserEcosystemWalletByCurrency(buyOrder.userId, quoteCurrency);
    const sellerBaseWallet = await getUserEcosystemWalletByCurrency(sellOrder.userId, baseCurrency);
    const sellerQuoteWallet = await getUserEcosystemWalletByCurrency(sellOrder.userId, quoteCurrency);

    if (!buyerBaseWallet || !buyerQuoteWallet || !sellerBaseWallet || !sellerQuoteWallet) {
      throw new Error("Required wallets not found for buyer or seller.");
    }

    // Validate locked funds
    const sellerInOrder = parseFloat(sellerBaseWallet.inOrder?.toString() || "0");
    if (sellerInOrder < amountToFillNum) {
      throw new Error(`Seller has insufficient locked funds`);
    }

    const buyerInOrder = parseFloat(buyerQuoteWallet.inOrder?.toString() || "0");
    if (buyerInOrder < buyReleaseNum) {
      throw new Error(`Buyer has insufficient locked funds`);
    }

    // Execute wallet updates
    await updateWalletForFill(buyerBaseWallet, amountToFillNum, 0, "buyer receives base");
    await updateWalletForFill(buyerQuoteWallet, 0, -buyReleaseNum, "buyer releases quote");
    await updateWalletForFill(sellerBaseWallet, 0, -amountToFillNum, "seller releases base");
    await updateWalletForFill(sellerQuoteWallet, costNum - sellFeeNum, 0, "seller receives quote");
  }

  // Record the trades
  const buyTradeDetail: TradeDetail = {
    id: `${buyOrder.id}`,
    amount: fromBigInt(amountToFill),
    price: fromBigInt(finalPrice),
    cost: fromBigIntMultiply(amountToFill, finalPrice),
    side: "BUY",
    timestamp: Date.now(),
  };

  const sellTradeDetail: TradeDetail = {
    id: `${sellOrder.id}`,
    amount: fromBigInt(amountToFill),
    price: fromBigInt(finalPrice),
    cost: fromBigIntMultiply(amountToFill, finalPrice),
    side: "SELL",
    timestamp: Date.now(),
  };

  addTradeToOrder(buyOrder, buyTradeDetail);
  addTradeToOrder(sellOrder, sellTradeDetail);

  // Insert into dedicated trades table for Recent Trades display
  // Using buy trade - both buy and sell represent the same trade
  insertTrade(
    buyOrder.symbol,
    buyTradeDetail.price,
    buyTradeDetail.amount,
    "BUY",
    false // Not an AI trade
  ).catch((err) => logger.error("MATCHING", "Failed to insert trade to trades table", err));

  // Broadcast the trades
  handleTradesBroadcast(buyOrder.symbol, [buyTradeDetail, sellTradeDetail]);

  // Broadcast order updates to both users so they see partial fills in real-time
  handleOrderBroadcast(buyOrder);
  handleOrderBroadcast(sellOrder);

  // Update the orderbook entries
  updateOrderBook(bookUpdates, buyOrder, currentOrderBook, amountToFill);
  updateOrderBook(bookUpdates, sellOrder, currentOrderBook, amountToFill);

  // Trigger copy trading fill handling (async, non-blocking)
  // This will update copy trading records when leader or follower orders are filled
  triggerCopyTradingFill(
    buyOrder.id,
    buyOrder.userId,
    buyOrder.symbol,
    buyOrder.side as "BUY" | "SELL",
    fromBigInt(amountToFill),
    fromBigInt(finalPrice),
    fromBigInt(removeTolerance((buyOrder.fee * BigInt(Math.floor(buyFillRatio * 1e18))) / SCALING_FACTOR)),
    buyOrder.status === "CLOSED" ? "FILLED" : "PARTIALLY_FILLED"
  );
  triggerCopyTradingFill(
    sellOrder.id,
    sellOrder.userId,
    sellOrder.symbol,
    sellOrder.side as "BUY" | "SELL",
    fromBigInt(amountToFill),
    fromBigInt(finalPrice),
    fromBigInt(removeTolerance(sellProportionalFee)),
    sellOrder.status === "CLOSED" ? "FILLED" : "PARTIALLY_FILLED"
  );
}

export function addTradeToOrder(order: Order, trade: TradeDetail) {
  let trades: TradeDetail[] = [];

  if (order.trades) {
    try {
      if (typeof order.trades === "string") {
        trades = JSON.parse(order.trades);
        if (!Array.isArray(trades) && typeof trades === "string") {
          trades = JSON.parse(trades);
        }
      } else if (Array.isArray(order.trades)) {
        trades = order.trades;
      } else {
        logger.error("MATCHING", `Invalid trades format, resetting trades: ${JSON.stringify(order.trades)}`, new Error("Invalid trades format"));
        trades = [];
      }
    } catch (e) {
      logger.error("MATCHING", "Error parsing trades", e);
      trades = [];
    }
  }

  const mergedTrades = [...trades, trade].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  order.trades = JSON.stringify(mergedTrades, BigIntReplacer);
  return order.trades;
}

const updateOrderBook = (
  bookUpdates: OrderBook,
  order: Order,
  currentOrderBook: OrderBook,
  amount: bigint
) => {
  const priceStr = order.price.toString();
  const bookSide = order.side === "BUY" ? "bids" : "asks";

  if (currentOrderBook[bookSide][priceStr] !== undefined) {
    // Price level exists - subtract the filled amount
    currentOrderBook[bookSide][priceStr] -= amount;
    bookUpdates[bookSide][priceStr] = currentOrderBook[bookSide][priceStr];
  } else {
    // Price level doesn't exist in orderbook - this can happen when:
    // 1. Order was placed but not yet synced to orderbook
    // 2. AI orders that exist in memory but not in ScyllaDB orderbook
    // Set to 0 to indicate this price level should be removed/ignored
    bookUpdates[bookSide][priceStr] = BigInt(0);
  }
};

export const filterAndSortOrders = (
  orders: Order[],
  side: "BUY" | "SELL",
  isBuy: boolean
): Order[] => {
  return orders
    .filter((o) => o.side === side)
    .sort((a, b) => {
      if (isBuy) {
        return (
          Number(b.price) - Number(a.price) ||
          a.createdAt.getTime() - b.createdAt.getTime()
        );
      } else {
        return (
          Number(a.price) - Number(b.price) ||
          a.createdAt.getTime() - b.createdAt.getTime()
        );
      }
    })
    .filter((order) => !isBuy || BigInt(order.price) >= BigInt(0));
};

export function validateOrder(order: Order): boolean {
  if (
    !order ||
    !order.id ||
    !order.userId ||
    !order.symbol ||
    !order.type ||
    !order.side ||
    typeof order.price !== "bigint" ||
    typeof order.amount !== "bigint" ||
    typeof order.filled !== "bigint" ||
    typeof order.remaining !== "bigint" ||
    typeof order.cost !== "bigint" ||
    typeof order.fee !== "bigint" ||
    !order.feeCurrency ||
    !order.status ||
    !(order.createdAt instanceof Date) ||
    !(order.updatedAt instanceof Date)
  ) {
    logger.error("MATCHING", "Order validation failed", new Error(`Order validation failed: ${JSON.stringify(order)}`));
    return false;
  }
  return true;
}

export function sortOrders(orders: Order[], isBuy: boolean): Order[] {
  return orders.sort((a, b) => {
    const priceComparison = isBuy
      ? Number(b.price - a.price)
      : Number(a.price - b.price);
    if (priceComparison !== 0) return priceComparison;

    if (a.createdAt < b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;
    return 0;
  });
}

export async function getUserEcosystemWalletByCurrency(
  userId: string,
  currency: string
): Promise<walletAttributes> {
  try {
    const wallet = await models.wallet.findOne({
      where: {
        userId,
        currency,
        type: "ECO",
      },
    });

    if (!wallet) {
      throw new Error(
        `Wallet not found for user ${userId} and currency ${currency}`
      );
    }

    return wallet;
  } catch (error) {
    logger.error("ECOSYSTEM", "Failed to get user ecosystem wallet by currency", error);
    throw error;
  }
}

/**
 * Trigger copy trading fill handling (non-blocking)
 * This is called when any order is filled to check if it's a copy trading order
 */
async function triggerCopyTradingFill(
  orderId: string,
  userId: string,
  symbol: string,
  side: "BUY" | "SELL",
  filledAmount: number,
  filledPrice: number,
  fee: number,
  status: "FILLED" | "PARTIALLY_FILLED"
): Promise<void> {
  try {
    const { triggerCopyTradingOrderFilled } = await import("@b/utils/safe-imports");
    triggerCopyTradingOrderFilled(
      orderId,
      userId,
      symbol,
      side,
      filledAmount,
      filledPrice,
      fee,
      status
    ).catch(() => {});
  } catch (importError) {
    // Copy trading module not available, skip silently
  }
}
