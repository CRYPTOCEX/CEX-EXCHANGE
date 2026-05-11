// /server/api/exchange/orders/store.post.ts

import { models, sequelize } from "@b/db";
import {
  formatWaitTime,
  handleBanStatus,
  loadBanStatus,
  sanitizeErrorMessage,
} from "../utils";
import ExchangeManager from "@b/utils/exchange";
import { getWallet } from "@b/api/finance/wallet/utils";
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
            pair: { type: "string", description: "Pair symbol (e.g., USDT)" },
            type: {
              type: "string",
              description: "Order type (e.g., limit, market)",
            },
            side: { type: "string", description: "Order side (buy or sell)" },
            amount: { type: "number", description: "Order amount" },
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
    // Check for ban status
    const unblockTime = await loadBanStatus();
    if (await handleBanStatus(unblockTime)) {
      const waitTime = unblockTime - Date.now();
      throw new Error(
        `Service temporarily unavailable. Please try again in ${formatWaitTime(
          waitTime
        )}.`
      );
    }

    const { currency, pair, amount, price, type, side } = body;

    if (!currency || !pair) {
      throw new Error("Invalid symbol");
    }
    const symbol = `${currency}/${pair}`;

    // Fetch market data
    const market = (await models.exchangeMarket.findOne({
      where: { currency, pair },
    })) as unknown as ExchangeMarket;

    if (!market || !market.metadata) {
      throw new Error("Market data not found");
    }

    const minAmount = Number(market.metadata?.limits?.amount?.min || 0);
    const minCost = Number(market.metadata?.limits?.cost?.min || 0);

    if (amount < minAmount) {
      throw new Error(`Amount is too low. You need ${minAmount} ${currency}`);
    }

    const precision =
      Number(
        side === "BUY"
          ? market.metadata.precision.amount
          : market.metadata.precision.price
      ) || 8;
    const feeCurrency = side === "BUY" ? currency : pair;
    const feeRate =
      side === "BUY"
        ? Number(market.metadata.taker)
        : Number(market.metadata.maker);

    const exchange = await ExchangeManager.startExchange();
    const provider = await ExchangeManager.getProvider();

    if (!exchange) {
      throw new Error("Exchange service is currently unavailable");
    }

    // Fetch current market price if it's a market order
    let orderPrice: number;
    if (type.toLowerCase() === "market") {
      const ticker = await exchange.fetchTicker(symbol);
      if (!ticker || !ticker.last) {
        throw new Error("Unable to fetch current market price");
      }
      orderPrice = ticker.last;
    } else {
      if (!price) {
        throw new Error("Price is required for limit orders");
      }
      orderPrice = price;
    }

    // Calculate fee and cost based on the order type
    const feeCalculated = (amount * orderPrice * feeRate) / 100;
    const fee = parseFloat(feeCalculated.toFixed(precision));
    const costCalculated = side === "BUY" ? amount * orderPrice + fee : amount;
    const cost = parseFloat(costCalculated.toFixed(precision));

    if (cost < minCost) {
      console.log("Cost is too low:", { cost, minCost });
      throw new Error(`Cost is too low. You need ${minCost} ${pair}`);
    }

    // Check and update wallets
    const currencyWallet = await getOrCreateWallet(user.id, currency);
    const pairWallet = await getOrCreateWallet(user.id, pair);

    if (side === "BUY") {
      if (pairWallet.balance < cost) {
        throw new Error(`Insufficient balance. You need ${cost} ${pair}`);
      }
    } else {
      if (currencyWallet.balance < amount) {
        throw new Error(`Insufficient balance. You need ${amount} ${currency}`);
      }
    }

    let order;
    const isXT = provider === "xt";
    const isMarketOrder = type.toLowerCase() === "market";
    try {
      order = await exchange.createOrder(
        symbol,
        type.toLowerCase(),
        side.toLowerCase(),
        amount,
        type.toLowerCase() === "limit" || (isXT && isMarketOrder)
          ? orderPrice
          : undefined
      );
    } catch (error) {
      const sanitizedErrorMessage = sanitizeErrorMessage(error.message);
      throw new Error(`Unable to process order: ${sanitizedErrorMessage}`);
    }

    if (!order || !order.id) {
      throw new Error("Unable to process order");
    }

    let orderData = await exchange.fetchOrder(order.id, symbol);
    if (!orderData) {
      throw new Error("Failed to fetch order");
    }

    orderData = adjustOrderData(orderData, provider);

    // Update wallets based on order data
    if (side === "BUY") {
      await updateWalletQuery(
        pairWallet.id,
        pairWallet.balance - orderData.cost
      );
      if (orderData.status === "closed") {
        const receivedAmount =
          Number(orderData.amount) - (Number(orderData.fee?.cost) || fee);
        await updateWalletQuery(
          currencyWallet.id,
          currencyWallet.balance + receivedAmount
        );
      }
    } else {
      await updateWalletQuery(
        currencyWallet.id,
        currencyWallet.balance - orderData.amount
      );
      if (orderData.status === "closed") {
        const receivedAmount =
          Number(orderData.cost) - (Number(orderData.fee?.cost) || fee);
        await updateWalletQuery(
          pairWallet.id,
          pairWallet.balance + receivedAmount
        );
      }
    }

    const response = (await createOrder(user.id, {
      ...orderData,
      referenceId: order.id,
      feeCurrency: feeCurrency,
      fee: orderData.fee?.cost || fee,
    })) as unknown as ExchangeOrder;

    if (!response) {
      throw new Error("Failed to create order");
    }

    addUserToWatchlist(user.id);
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

    return {
      message: "Order created successfully",
    };
  } catch (error) {
    const sanitizedErrorMessage = sanitizeErrorMessage(error.message);
    throw new Error(sanitizedErrorMessage);
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
  balance: number
): Promise<any> {
  await models.wallet.update(
    {
      balance,
    },
    {
      where: {
        id,
      },
    }
  );

  const wallet = await models.wallet.findByPk(id);

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  return wallet.get({ plain: true }) as unknown as Wallet;
}

export async function createOrder(
  userId: string,
  order: any
): Promise<ExchangeOrder> {
  const mappedOrder = mapOrderData(order);

  // Start a transaction for creating an order
  return (await sequelize
    .transaction(async (transaction) => {
      const newOrder = await models.exchangeOrder.create(
        {
          ...mappedOrder,
          userId: userId, // Directly set the foreign key for the user
        },
        { transaction }
      );

      // Assuming you want to return a simplified version of the new order object
      return newOrder.get({ plain: true });
    })
    .catch((error) => {
      console.error("Failed to create order:", error);
      throw error; // Rethrow or handle error as needed
    })) as unknown as ExchangeOrder;
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
    average: Number(order.average) || undefined,
    amount: Number(order.amount),
    filled: Number(order.filled),
    remaining: Number(order.remaining),
    cost: Number(order.cost),
    trades: JSON.stringify(order.trades),
    fee: order.fee,
    feeCurrency: order.feeCurrency,
  };
};
