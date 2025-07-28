// /server/api/exchange/orders/store.post.ts

import { models, sequelize } from "@b/db";
import {
  formatWaitTime,
  handleBanStatus,
  loadBanStatus,
  sanitizeErrorMessage,
} from "../utils";
import ExchangeManager from "@b/utils/exchange";
import { addOrderToTrackedOrders, addUserToWatchlist } from "./index.ws";
import { createRecordResponses } from "@b/utils/query";
import { adjustOrderData } from "./utils";

export const metadata: OperationObject = {
  summary: "Create Order",
  operationId: "createOrder",
  tags: ["Exchange", "Orders"],
  description: "Creates a new order for the authenticated user.",
  requestBody: {
    description: "Order creation data.",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            currency: {
              type: "string",
              description: "Currency symbol (e.g., BTC)",
            },
            pair: {
              type: "string",
              description: "Pair symbol (e.g., USDT)",
            },
            type: {
              type: "string",
              description: "Order type (e.g., limit, market)",
            },
            side: {
              type: "string",
              description: "Order side (buy or sell)",
            },
            amount: {
              type: "number",
              description: "Order amount",
            },
            price: {
              type: "number",
              description: "Order price, required for limit orders",
            },
          },
          required: ["currency", "pair", "type", "side", "amount"],
        },
      },
    },
    required: true,
  },
  responses: createRecordResponses("Order"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user) {
    throw new Error("User not found");
  }

  try {
    // Step 1: Check for ban status
    const unblockTime = await loadBanStatus();
    if (await handleBanStatus(unblockTime)) {
      const waitTime = unblockTime - Date.now();
      throw new Error(
        `Service temporarily unavailable. Please try again in ${formatWaitTime(
          waitTime
        )}.`
      );
    }

    // Step 2: Validate input data
    const { currency, pair, amount, price, type } = body;
    const side = body.side?.toUpperCase();
    if (!currency || !pair || !type || !side || amount == null) {
      throw new Error("Missing required parameters");
    }
    if (!["BUY", "SELL"].includes(side)) {
      throw new Error("Invalid order side. Must be 'buy' or 'sell'");
    }
    if (amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }
    if (type.toLowerCase() === "limit" && (price == null || price <= 0)) {
      throw new Error("Price must be greater than zero for limit orders");
    }

    // Step 3: Fetch market data and metadata
    const symbol = `${currency}/${pair}`;
    const market = await models.exchangeMarket.findOne({
      where: { currency, pair },
    });
    if (!market || !market.metadata) {
      throw new Error("Market data not found");
    }
    const metadata =
      typeof market.metadata === "string"
        ? JSON.parse(market.metadata)
        : market.metadata;

    const minAmount = Number(metadata?.limits?.amount?.min || 0);
    const maxAmount = Number(metadata?.limits?.amount?.max || 0);
    const minPrice = Number(metadata?.limits?.price?.min || 0);
    const maxPrice = Number(metadata?.limits?.price?.max || 0);
    const minCost = Number(metadata?.limits?.cost?.min || 0);
    const maxCost = Number(metadata?.limits?.cost?.max || 0);

    const amountPrecision = Number(metadata.precision?.amount) || 8;
    const pricePrecision = Number(metadata.precision?.price) || 8;

    // Step 4: Validate amount against minimum
    if (side === "SELL" && amount < minAmount) {
      throw new Error(
        `Amount is too low, you need at least ${minAmount.toFixed(
          amountPrecision
        )} ${currency}`
      );
    }

    if (side === "SELL" && maxAmount > 0 && amount > maxAmount) {
      throw new Error(
        `Amount is too high, maximum is ${maxAmount.toFixed(
          amountPrecision
        )} ${currency}`
      );
    }

    if (price && price < minPrice) {
      throw new Error(
        `Price is too low, you need at least ${minPrice.toFixed(pricePrecision)} ${pair}`
      );
    }

    if (maxPrice > 0 && price > maxPrice) {
      throw new Error(
        `Price is too high, maximum is ${maxPrice.toFixed(pricePrecision)} ${pair}`
      );
    }

    // Step 5: Initialize exchange and fetch ticker for price if market order
    const exchange = await ExchangeManager.startExchange();
    const provider = await ExchangeManager.getProvider();
    if (!exchange) {
      throw new Error("Exchange service is currently unavailable");
    }
    let orderPrice = price;
    if (type.toLowerCase() === "market") {
      const ticker = await exchange.fetchTicker(symbol);
      if (!ticker || !ticker.last) {
        throw new Error("Unable to fetch current market price");
      }
      orderPrice = ticker.last;
    }

    // Step 6: Calculate and validate cost
    const formattedAmount = parseFloat(amount.toFixed(amountPrecision));
    const formattedPrice = parseFloat(orderPrice.toFixed(pricePrecision));
    const cost = parseFloat(
      (formattedAmount * formattedPrice).toFixed(pricePrecision)
    );
    if (side === "BUY" && cost < minCost) {
      throw new Error(
        `Cost is too low, you need at least ${minCost.toFixed(pricePrecision)} ${pair}`
      );
    }
    if (side === "BUY" && maxCost > 0 && cost > maxCost) {
      throw new Error(
        `Cost is too high, maximum is ${maxCost.toFixed(pricePrecision)} ${pair}`
      );
    }

    // Step 7: Fetch wallets and validate balances
    const currencyWallet = await getOrCreateWallet(user.id, currency);
    const pairWallet = await getOrCreateWallet(user.id, pair);
    if (side === "BUY" && pairWallet.balance < cost) {
      throw new Error(
        `Insufficient balance. You need at least ${cost.toFixed(
          pricePrecision
        )} ${pair}`
      );
    }
    if (side === "SELL" && currencyWallet.balance < amount) {
      throw new Error(
        `Insufficient balance. You need at least ${amount.toFixed(
          amountPrecision
        )} ${currency}`
      );
    }

    // Step 8: Get custom fee rate and fee currency
    const feeRate =
      side === "BUY" ? Number(metadata.taker) : Number(metadata.maker);
    const feeCurrency = side === "BUY" ? currency : pair;

    // Step 9: Create order with provider
    let order;
    try {
      order = await exchange.createOrder(
        symbol,
        type.toLowerCase(),
        side.toLowerCase(),
        formattedAmount,
        type.toLowerCase() === "limit" ? formattedPrice : undefined
      );
    } catch (error) {
      throw new Error(
        `Unable to process order: ${sanitizeErrorMessage(error.message)}`
      );
    }
    if (!order || !order.id) {
      throw new Error("Unable to process order");
    }

    // Step 10: Fetch and adjust order data
    let orderData = await exchange.fetchOrder(order.id, symbol);
    if (!orderData) {
      throw new Error("Failed to fetch order");
    }
    orderData = adjustOrderData(orderData, provider, feeRate);

    // Step 11: Perform Sequelize transaction for wallet updates and order creation
    const response = await sequelize.transaction(async (transaction) => {
      if (side === "BUY") {
        await updateWalletQuery(
          pairWallet.id,
          pairWallet.balance - cost,
          transaction
        );
        if (["closed", "filled"].includes(orderData.status)) {
          const netAmount =
            Number(orderData.amount) - Number(orderData.fee || 0);
          await updateWalletQuery(
            currencyWallet.id,
            currencyWallet.balance + netAmount,
            transaction
          );
        }
      } else {
        await updateWalletQuery(
          currencyWallet.id,
          currencyWallet.balance - formattedAmount,
          transaction
        );
        if (["closed", "filled"].includes(orderData.status)) {
          const proceeds = Number(orderData.amount) * Number(orderData.price);
          const netProceeds = proceeds - Number(orderData.fee || 0);
          await updateWalletQuery(
            pairWallet.id,
            pairWallet.balance + netProceeds,
            transaction
          );
        }
      }

      // Store the order in the database
      const response = await createOrder(
        user.id,
        {
          ...orderData,
          referenceId: order.id,
          fee: Number(orderData.fee || 0), // Ensure fee is a number
          feeCurrency,
        },
        transaction
      );

      return response;
    });

    addOrderToTrackedOrders(user.id, {
      id: response.id,
      status: response.status,
      price: orderData.price,
      amount: orderData.amount,
      filled: orderData.filled,
      remaining: orderData.remaining,
      timestamp: orderData.timestamp,
      cost: orderData.cost,
    });

    addUserToWatchlist(user.id);
    return { message: "Order created successfully" };
  } catch (error) {
    console.error("Error creating order:", {
      userId: user.id,
      body,
      error: error.message,
    });
    throw new Error(sanitizeErrorMessage(error.message));
  }
};

async function getOrCreateWallet(userId: string, currency: string) {
  let wallet = await models.wallet.findOne({
    where: {
      userId,
      currency,
      type: "SPOT",
    },
  });

  if (!wallet) {
    wallet = await createWallet(userId, currency);
  }
  return wallet;
}

const createWallet = async (userId: string, currency: string) => {
  return await models.wallet.create({
    userId,
    type: "SPOT",
    currency,
    balance: 0,
  });
};

export async function updateWalletQuery(
  id: string,
  balance: number,
  transaction?: any
): Promise<walletAttributes> {
  // Lock the wallet row for update only if a transaction is provided
  const wallet = await models.wallet.findByPk(id, {
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  if (balance < 0) {
    throw new Error("Invalid operation: balance cannot go below zero");
  }

  // Update the wallet balance, with or without a transaction based on the input
  await wallet.update({ balance }, transaction ? { transaction } : {});

  return wallet.get({ plain: true }) as unknown as walletAttributes;
}

export async function createOrder(
  userId: string,
  order: any,
  transaction: any
): Promise<ExchangeOrder> {
  const mappedOrder = mapOrderData(order);

  const newOrder = await models.exchangeOrder.create(
    {
      ...mappedOrder,
      userId: userId,
    },
    { transaction }
  );

  return newOrder.get({ plain: true }) as unknown as ExchangeOrder;
}

const mapOrderData = (order: any) => {
  return {
    referenceId: order.referenceId,
    status: order.status ? order.status.toUpperCase() : undefined,
    symbol: order.symbol,
    type: order.type ? order.type.toUpperCase() : undefined,
    timeInForce: order.timeInForce
      ? order.timeInForce.toUpperCase()
      : undefined,
    side: order.side ? order.side.toUpperCase() : undefined,
    price: Number(order.price),
    average: order.average != null ? Number(order.average) : undefined,
    amount: Number(order.amount),
    filled: Number(order.filled),
    remaining: Number(order.remaining),
    cost: Number(order.cost),
    trades: JSON.stringify(order.trades),
    fee: Number(order.fee || 0), // Ensure fee is a number
    feeCurrency: order.feeCurrency,
  };
};
