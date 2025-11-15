import { models } from "@b/db";
import {
  BigIntReplacer,
  fromBigInt,
  fromBigIntMultiply,
  removeTolerance,
} from "./blockchain";
import type { Order, OrderBook } from "./scylla/queries";
import { updateWalletBalance, updateWalletForFill } from "./wallet";
import { handleTradesBroadcast, handleOrderBroadcast } from "./ws";
import { logError } from "@b/utils/logger";

const SCALING_FACTOR = BigInt(10 ** 18);

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
        logError("match_calculate_orders", error, __filename);
        console.error(`Failed to process matched orders: ${error}`);
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

  // Retrieve all 4 wallets involved in the trade:
  // 1. Buyer's BASE wallet - will receive BASE tokens
  // 2. Buyer's QUOTE wallet - has locked QUOTE tokens (cost) in inOrder
  // 3. Seller's BASE wallet - has locked BASE tokens (amount) in inOrder
  // 4. Seller's QUOTE wallet - will receive QUOTE tokens (cost - fee)
  const buyerBaseWallet = await getUserEcosystemWalletByCurrency(
    buyOrder.userId,
    baseCurrency
  );
  const buyerQuoteWallet = await getUserEcosystemWalletByCurrency(
    buyOrder.userId,
    quoteCurrency
  );
  const sellerBaseWallet = await getUserEcosystemWalletByCurrency(
    sellOrder.userId,
    baseCurrency
  );
  const sellerQuoteWallet = await getUserEcosystemWalletByCurrency(
    sellOrder.userId,
    quoteCurrency
  );

  if (!buyerBaseWallet || !buyerQuoteWallet || !sellerBaseWallet || !sellerQuoteWallet) {
    throw new Error("Required wallets not found for buyer or seller.");
  }

  // Convert amount to fill to number for validation
  const amountToFillNum = fromBigInt(removeTolerance(amountToFill));

  // CRITICAL VALIDATION: Check if wallets have sufficient locked funds (inOrder)
  // This prevents errors from old orders that were created before inOrder locking was implemented
  const sellerInOrder = parseFloat(sellerBaseWallet.inOrder?.toString() || "0");
  if (sellerInOrder < amountToFillNum) {
    throw new Error(
      `Seller has insufficient locked funds: order requires ${amountToFillNum} ${baseCurrency} locked, but only ${sellerInOrder} is locked. Order may be stale or corrupted.`
    );
  }

  // Determine the final trade price
  // If one order is market, we take the other's price
  // If both are limit, use the maker's price (order placed first)
  const finalPrice =
    buyOrder.type.toUpperCase() === "MARKET"
      ? sellOrder.price
      : sellOrder.type.toUpperCase() === "MARKET"
        ? buyOrder.price
        : buyOrder.createdAt <= sellOrder.createdAt
          ? buyOrder.price  // Buyer was maker (placed first)
          : sellOrder.price; // Seller was maker (placed first)

  // Calculate cost: amountToFill * finalPrice (scaled by 10^18)
  const cost = (amountToFill * finalPrice) / SCALING_FACTOR;

  // CRITICAL FIX: Calculate proportional fees for partial fills
  //
  // BUY orders: Fee was locked upfront in cost. Release proportional amount.
  // SELL orders: Fee deducted from proceeds at match time. Calculate proportional amount.

  // Calculate fill ratios for proportional fee calculation
  const buyFillRatio = Number(amountToFill) / Number(buyOrder.amount);
  const sellFillRatio = Number(amountToFill) / Number(sellOrder.amount);

  // Proportional fee from sell order (deducted from seller's proceeds)
  const sellProportionalFee = (sellOrder.fee * BigInt(Math.floor(sellFillRatio * 1e18))) / SCALING_FACTOR;

  // Proportional cost+fee from buy order (to release from buyer's locked funds)
  const buyProportionalCostWithFee = (buyOrder.cost * BigInt(Math.floor(buyFillRatio * 1e18))) / SCALING_FACTOR;

  // Convert BigInt amounts to normal numbers (already declared amountToFillNum above)
  const costNum = fromBigInt(removeTolerance(cost));
  const sellFeeNum = fromBigInt(removeTolerance(sellProportionalFee));
  const buyReleaseNum = fromBigInt(removeTolerance(buyProportionalCostWithFee));

  // Validate buyer's locked funds as well
  const buyerInOrder = parseFloat(buyerQuoteWallet.inOrder?.toString() || "0");
  if (buyerInOrder < buyReleaseNum) {
    throw new Error(
      `Buyer has insufficient locked funds: order requires ${buyReleaseNum} ${quoteCurrency} locked, but only ${buyerInOrder} is locked. Order may be stale or corrupted.`
    );
  }

  // Execute the trade with proper wallet updates:
  //
  // BUYER:
  // - Receives BASE tokens (add to balance, no inOrder change)
  // - Releases locked QUOTE tokens INCLUDING proportional fee (no balance change, subtract from inOrder)
  await updateWalletForFill(
    buyerBaseWallet,
    amountToFillNum, // Add BASE tokens to balance
    0, // No inOrder change for received currency
    "buyer receives base"
  );
  await updateWalletForFill(
    buyerQuoteWallet,
    0, // No balance change (cost+fee was already locked)
    -buyReleaseNum, // Release locked QUOTE tokens INCLUDING proportional fee from inOrder
    "buyer releases quote"
  );

  // SELLER:
  // - Releases locked BASE tokens (no balance change, subtract from inOrder)
  // - Receives QUOTE tokens minus PROPORTIONAL fee (add to balance, no inOrder change)
  await updateWalletForFill(
    sellerBaseWallet,
    0, // No balance change (tokens were already locked)
    -amountToFillNum, // Release locked BASE tokens from inOrder
    "seller releases base"
  );
  await updateWalletForFill(
    sellerQuoteWallet,
    costNum - sellFeeNum, // Add QUOTE tokens minus PROPORTIONAL fee to balance
    0, // No inOrder change for received currency
    "seller receives quote"
  );

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

  // Broadcast the trades
  handleTradesBroadcast(buyOrder.symbol, [buyTradeDetail, sellTradeDetail]);

  // Broadcast order updates to both users so they see partial fills in real-time
  handleOrderBroadcast(buyOrder);
  handleOrderBroadcast(sellOrder);

  // Update the orderbook entries
  updateOrderBook(bookUpdates, buyOrder, currentOrderBook, amountToFill);
  updateOrderBook(bookUpdates, sellOrder, currentOrderBook, amountToFill);
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
        logError(
          "add_trade_to_order",
          new Error("Invalid trades format"),
          __filename
        );
        console.error("Invalid trades format, resetting trades:", order.trades);
        trades = [];
      }
    } catch (e) {
      logError("add_trade_to_order", e, __filename);
      console.error("Error parsing trades", e);
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

  if (currentOrderBook[bookSide][priceStr]) {
    currentOrderBook[bookSide][priceStr] -= amount;
  }

  bookUpdates[bookSide][priceStr] = currentOrderBook[bookSide][priceStr];
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
    logError(
      "validate_order",
      new Error("Order validation failed"),
      __filename
    );
    console.error("Order validation failed: ", order);
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
    logError("get_user_wallet", error, __filename);
    throw error;
  }
}
