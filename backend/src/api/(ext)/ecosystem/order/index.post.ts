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

export const metadata: OperationObject = {
  summary: "Creates a new trading order",
  description: "Submits a new trading order for the logged-in user.",
  operationId: "createOrder",
  tags: ["Trading", "Orders"],
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
  const { body, user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { currency, pair, amount, price, type, side } = body;

  // Basic validations
  if (!amount || Number(amount) <= 0) {
    throw createError({
      statusCode: 422,
      message: "Amount must be greater than zero.",
    });
  }
  if (!type) {
    throw createError({
      statusCode: 422,
      message: "Order type (limit/market) is required.",
    });
  }

  if (!currency || !pair) {
    throw createError({
      statusCode: 422,
      message: "Invalid currency/pair symbol.",
    });
  }

  const symbol = `${currency}/${pair}`;

  try {
    const market = (await models.ecosystemMarket.findOne({
      where: { currency, pair },
    })) as any;

    if (!market || !market.metadata) {
      throw createError({
        statusCode: 422,
        message: "Market data not found or incomplete.",
      });
    }

    if (
      !market.metadata.precision ||
      !market.metadata.precision.amount ||
      !market.metadata.precision.price
    ) {
      throw createError({
        statusCode: 422,
        message: "Market metadata missing precision details.",
      });
    }

    if (!market.metadata.maker || !market.metadata.taker) {
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
      const bestPrice = await getBestPriceFromOrderBook(symbol, side);
      if (!bestPrice) {
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

    const feeRate =
      side.toUpperCase() === "BUY"
        ? Number(market.metadata.taker)
        : Number(market.metadata.maker);

    if (isNaN(feeRate) || feeRate < 0) {
      throw createError({
        statusCode: 422,
        message: "Invalid fee rate from market metadata.",
      });
    }

    if (!effectivePrice || isNaN(effectivePrice)) {
      throw createError({
        statusCode: 422,
        message: "No valid price determined for the order.",
      });
    }

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

    const [currencyWallet, pairWallet] = await Promise.all([
      getWalletByUserIdAndCurrency(user.id, currency),
      getWalletByUserIdAndCurrency(user.id, pair),
    ]);

    if (side.toUpperCase() === "SELL") {
      if (
        !currencyWallet ||
        parseFloat(currencyWallet.balance.toString()) < amount
      ) {
        throw createError({
          statusCode: 400,
          message: `Insufficient balance. You need ${amount} ${currency}`,
        });
      }
    } else {
      // BUY
      if (!pairWallet || parseFloat(pairWallet.balance.toString()) < cost) {
        throw createError({
          statusCode: 400,
          message: `Insufficient balance. You need ${cost} ${pair}`,
        });
      }
    }

    // SELF-MATCH PREVENTION LOGIC
    const userOpenOrders = await getOrders(user.id, symbol, true);
    // For a SELL order, check if there's any BUY order at >= effectivePrice
    if (side.toUpperCase() === "SELL") {
      const conflictingBuy = userOpenOrders.find(
        (o) => o.side === "BUY" && o.price >= effectivePrice
      );
      if (conflictingBuy) {
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
        throw createError({
          statusCode: 400,
          message: `You already have a SELL order at ${conflictingSell.price} or lower, cannot place BUY at ${effectivePrice} or higher.`,
        });
      }
    }
    // END SELF-MATCH PREVENTION

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

    // Atomicity: Update wallet after order creation
    try {
      if (side.toUpperCase() === "BUY") {
        await updateWalletBalance(pairWallet, order.cost, "subtract");
      } else {
        await updateWalletBalance(currencyWallet, order.amount, "subtract");
      }
    } catch (e) {
      await rollbackOrderCreation(newOrder.id, user.id, newOrder.createdAt);
      throw createError({
        statusCode: 500,
        message: "Failed to update wallet balance. Order rolled back.",
      });
    }

    return {
      message: "Order created successfully",
      order: order,
    };
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 400,
      message: `Failed to create order: ${error.message}`,
    });
  }
};
