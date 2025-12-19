// backend\api\ext\ecosystem\order\index.post.ts

import { createError } from "@b/utils/error";
import {
  getWalletByUserIdAndCurrency,
  updateWalletBalance,
} from "@b/api/(ext)/ecosystem/utils/wallet";
import {
  createOrder,
  getOrders,
  getOrderBook,
  rollbackOrderCreation,
} from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import { fromBigInt, toBigIntFloat } from "@b/api/(ext)/ecosystem/utils/blockchain";
import { createRecordResponses } from "@b/utils/query";
import { models } from "@b/db";
import { handleOrderBroadcast } from "@b/api/(ext)/ecosystem/utils/ws";

export const metadata: OperationObject = {
  summary: "Creates a new trading order",
  description: "Submits a new trading order for the logged-in user.",
  operationId: "createOrder",
  tags: ["Trading", "Orders"],
  logModule: "ECO_ORDER",
  logTitle: "Create trading order",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            currency: {
              type: "string",
              description: "Currency symbol (e.g., BTC)",
            },
            pair: { type: "string", description: "Pair symbol (e.g., USDT)" },
            type: {
              type: "string",
              description: "Order type, limit or market",
            },
            side: { type: "string", description: "Order side, buy or sell" },
            amount: { type: "number", description: "Amount of the order" },
            price: {
              type: "number",
              description: "Price of the order (required if limit)",
            },
          },
          required: ["currency", "pair", "type", "side", "amount"],
        },
      },
    },
  },
  responses: createRecordResponses("Order"),
  requiresAuth: true,
};

// Helper: Get the best price from the order book for a given side.
async function getBestPriceFromOrderBook(
  symbol: string,
  side: string
): Promise<number | null> {
  const { asks, bids } = await getOrderBook(symbol);
  if (side.toUpperCase() === "BUY") {
    // best buy price is lowest ask
    if (!asks || asks.length === 0) return null;
    return asks[0][0];
  } else {
    // best sell price is highest bid
    if (!bids || bids.length === 0) return null;
    return bids[0][0];
  }
}

export default async (data: any) => {
  const { body, user, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { currency, pair, amount, price, type, side } = body;

  ctx?.step("Validating order request");
  // Basic validations
  if (!amount || Number(amount) <= 0) {
    ctx?.fail("Invalid amount");
    throw createError({
      statusCode: 422,
      message: "Amount must be greater than zero.",
    });
  }
  if (!type) {
    ctx?.fail("Order type missing");
    throw createError({
      statusCode: 422,
      message: "Order type (limit/market) is required.",
    });
  }

  if (!currency || !pair) {
    ctx?.fail("Invalid currency or pair");
    throw createError({
      statusCode: 422,
      message: "Invalid currency/pair symbol.",
    });
  }

  const symbol = `${currency}/${pair}`;

  try {
    ctx?.step("Fetching market configuration");
    const market = (await models.ecosystemMarket.findOne({
      where: { currency, pair },
    })) as any;

    if (!market || !market.metadata) {
      ctx?.fail("Market not found");
      throw createError({
        statusCode: 422,
        message: "Market data not found or incomplete.",
      });
    }

    ctx?.step("Validating market metadata");
    if (
      !market.metadata.precision ||
      !market.metadata.precision.amount ||
      !market.metadata.precision.price
    ) {
      ctx?.fail("Market metadata incomplete");
      throw createError({
        statusCode: 422,
        message: "Market metadata missing precision details.",
      });
    }

    if (!market.metadata.maker || !market.metadata.taker) {
      ctx?.fail("Market fee rates missing");
      throw createError({
        statusCode: 422,
        message: "Market metadata missing fee rates.",
      });
    }

    const minAmount = Number(market.metadata?.limits?.amount?.min || 0);
    const maxAmount = Number(market.metadata?.limits?.amount?.max || 0);
    const minPrice = Number(market.metadata?.limits?.price?.min || 0);
    const maxPrice = Number(market.metadata?.limits?.price?.max || 0);
    const minCost = Number(market.metadata?.limits?.cost?.min || 0);
    const maxCost = Number(market.metadata?.limits?.cost?.max || 0);

    if (side.toUpperCase() === "SELL" && amount < minAmount) {
      throw createError({
        statusCode: 422,
        message: `Amount is too low, you need at least ${minAmount} ${currency}`,
      });
    }

    // Optional check for BUY minimum amount:
    if (side.toUpperCase() === "BUY" && amount < minAmount) {
      throw createError({
        statusCode: 422,
        message: `Amount is too low, minimum is ${minAmount} ${currency}`,
      });
    }

    if (side.toUpperCase() === "SELL" && maxAmount > 0 && amount > maxAmount) {
      throw createError({
        statusCode: 422,
        message: `Amount is too high, maximum is ${maxAmount} ${currency}`,
      });
    }

    // For limit orders, price must be provided and > 0
    if (type.toLowerCase() === "limit" && (!price || price <= 0)) {
      throw createError({
        statusCode: 422,
        message: "Price must be greater than zero for limit orders.",
      });
    }

    let effectivePrice = price;
    // Market order: derive price from orderbook
    if (type.toLowerCase() === "market") {
      ctx?.step("Determining market price from order book");
      const bestPrice = await getBestPriceFromOrderBook(symbol, side);
      if (!bestPrice) {
        ctx?.fail("No market price available");
        throw createError({
          statusCode: 422,
          message: "Cannot execute market order: no price available.",
        });
      }
      effectivePrice = bestPrice;
    }

    if (effectivePrice && effectivePrice < minPrice) {
      throw createError({
        statusCode: 422,
        message: `Price is too low, you need at least ${minPrice} ${pair}`,
      });
    }

    if (maxPrice > 0 && effectivePrice && effectivePrice > maxPrice) {
      throw createError({
        statusCode: 422,
        message: `Price is too high, maximum is ${maxPrice} ${pair}`,
      });
    }

    const precision =
      Number(
        side.toUpperCase() === "BUY"
          ? market.metadata.precision.amount
          : market.metadata.precision.price
      ) || 8;

    ctx?.step("Determining maker/taker fee structure");
    // CORRECTED FEE LOGIC: Determine maker/taker based on whether order will immediately match
    // Market orders ALWAYS take liquidity (taker)
    // Limit orders: check if they cross the spread (taker) or rest on book (maker)
    let isTaker = false;

    if (type.toLowerCase() === "market") {
      // Market orders always take liquidity
      isTaker = true;
    } else {
      // Limit orders: check if they would immediately match
      const { asks, bids } = await getOrderBook(symbol);

      if (side.toUpperCase() === "BUY") {
        // BUY limit: if price >= lowest ask, it takes liquidity (crosses spread)
        if (asks && asks.length > 0 && effectivePrice >= asks[0][0]) {
          isTaker = true;
        }
      } else {
        // SELL limit: if price <= highest bid, it takes liquidity (crosses spread)
        if (bids && bids.length > 0 && effectivePrice <= bids[0][0]) {
          isTaker = true;
        }
      }
    }

    const feeRate = isTaker
      ? Number(market.metadata.taker)
      : Number(market.metadata.maker);

    if (isNaN(feeRate) || feeRate < 0) {
      ctx?.fail("Invalid fee rate");
      throw createError({
        statusCode: 422,
        message: "Invalid fee rate from market metadata.",
      });
    }

    if (!effectivePrice || isNaN(effectivePrice)) {
      ctx?.fail("Invalid price");
      throw createError({
        statusCode: 422,
        message: "No valid price determined for the order.",
      });
    }

    ctx?.step("Calculating order cost and fees");
    const feeCalculated = (amount * effectivePrice * feeRate) / 100;
    const fee = parseFloat(feeCalculated.toFixed(precision));
    const costCalculated =
      side.toUpperCase() === "BUY" ? amount * effectivePrice + fee : amount;
    const cost = parseFloat(costCalculated.toFixed(precision));

    if (side.toUpperCase() === "BUY" && (isNaN(cost) || cost <= 0)) {
      throw createError({
        statusCode: 422,
        message: "Calculated cost is invalid. Check your price and amount.",
      });
    }

    if (side.toUpperCase() === "BUY" && cost < minCost) {
      throw createError({
        statusCode: 422,
        message: `Cost is too low, you need at least ${minCost} ${pair}`,
      });
    }

    if (side.toUpperCase() === "BUY" && maxCost > 0 && cost > maxCost) {
      throw createError({
        statusCode: 422,
        message: `Cost is too high, maximum is ${maxCost} ${pair}`,
      });
    }

    ctx?.step("Retrieving user wallets");
    const [currencyWallet, pairWallet] = await Promise.all([
      getWalletByUserIdAndCurrency(user.id, currency),
      getWalletByUserIdAndCurrency(user.id, pair),
    ]);

    ctx?.step("Verifying wallet balance");
    if (side.toUpperCase() === "SELL") {
      const spendableBalance = parseFloat(currencyWallet.balance.toString()) - (parseFloat(currencyWallet.inOrder?.toString() || "0"));
      if (!currencyWallet || spendableBalance < amount) {
        ctx?.fail(`Insufficient ${currency} balance`);
        throw createError({
          statusCode: 400,
          message: `Insufficient balance. You need ${amount} ${currency}`,
        });
      }
    } else {
      // BUY
      const spendableBalance = parseFloat(pairWallet.balance.toString()) - (parseFloat(pairWallet.inOrder?.toString() || "0"));
      if (!pairWallet || spendableBalance < cost) {
        ctx?.fail(`Insufficient ${pair} balance`);
        throw createError({
          statusCode: 400,
          message: `Insufficient balance. You need ${cost} ${pair}`,
        });
      }
    }

    ctx?.step("Checking for self-matching orders");
    // SELF-MATCH PREVENTION LOGIC
    const userOpenOrders = await getOrders(user.id, symbol, true);
    // For a SELL order, check if there's any BUY order at >= effectivePrice
    if (side.toUpperCase() === "SELL") {
      const conflictingBuy = userOpenOrders.find(
        (o) => o.side === "BUY" && o.price >= effectivePrice
      );
      if (conflictingBuy) {
        ctx?.fail("Self-matching order detected");
        throw createError({
          statusCode: 400,
          message: `You already have a BUY order at ${conflictingBuy.price} or higher, cannot place SELL at ${effectivePrice} or lower.`,
        });
      }
    }

    // For a BUY order, check if there's any SELL order at <= effectivePrice
    if (side.toUpperCase() === "BUY") {
      const conflictingSell = userOpenOrders.find(
        (o) => o.side === "SELL" && o.price <= effectivePrice
      );
      if (conflictingSell) {
        ctx?.fail("Self-matching order detected");
        throw createError({
          statusCode: 400,
          message: `You already have a SELL order at ${conflictingSell.price} or lower, cannot place BUY at ${effectivePrice} or higher.`,
        });
      }
    }
    // END SELF-MATCH PREVENTION

    ctx?.step("Creating order in database");
    // Create the order
    const newOrder = await createOrder({
      userId: user.id,
      symbol,
      amount: toBigIntFloat(amount),
      price: toBigIntFloat(effectivePrice),
      cost: toBigIntFloat(cost),
      type,
      side,
      fee: toBigIntFloat(fee),
      feeCurrency: pair,
    });

    const order = {
      ...newOrder,
      amount: fromBigInt(newOrder.amount),
      price: fromBigInt(newOrder.price),
      cost: fromBigInt(newOrder.cost),
      fee: fromBigInt(newOrder.fee),
      remaining: fromBigInt(newOrder.remaining),
      filled: 0,
      average: 0,
    };

    ctx?.step("Updating wallet balance");
    // Atomicity: Update wallet after order creation
    try {
      if (side.toUpperCase() === "BUY") {
        await updateWalletBalance(pairWallet, order.cost, "subtract");
      } else {
        await updateWalletBalance(currencyWallet, order.amount, "subtract");
      }
    } catch (e) {
      ctx?.step("Rolling back order due to wallet update failure");
      await rollbackOrderCreation(newOrder.id, user.id, newOrder.createdAt);
      ctx?.fail("Failed to update wallet balance");
      throw createError({
        statusCode: 500,
        message: "Failed to update wallet balance. Order rolled back.",
      });
    }

    ctx?.step("Broadcasting order to WebSocket subscribers");
    // Broadcast the new order to WebSocket subscribers
    await handleOrderBroadcast({
      ...newOrder,
      status: "OPEN",
    });

    // Trigger copy trading if user is a leader (async, non-blocking)
    try {
      const { triggerCopyTrading } = await import("@b/utils/safe-imports");
      triggerCopyTrading(
        newOrder.id,
        user.id,
        symbol,
        side.toUpperCase() as "BUY" | "SELL",
        type.toUpperCase() as "MARKET" | "LIMIT",
        amount,
        effectivePrice
      ).catch(() => {
        // Silently catch errors - copy trading failures shouldn't affect order creation
      });
    } catch (importError) {
      // Safe import failed, copy trading not available
    }

    ctx?.success(`Created ${side} order for ${amount} ${currency} at ${effectivePrice} ${pair}`);
    return {
      message: "Order created successfully",
      order: order,
    };
  } catch (error) {
    ctx?.fail(`Order creation failed: ${error.message}`);
    throw createError({
      statusCode: error.statusCode || 400,
      message: `Failed to create order: ${error.message}`,
    });
  }
};
