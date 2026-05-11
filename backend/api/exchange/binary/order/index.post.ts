import ExchangeManager from "@b/utils/exchange";
// /server/api/exchange/binary/orders/store.post.ts

import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { sendBinaryOrderEmail } from "@b/utils/emails";
import { getBinaryOrder } from "./[id]/index.get";

export const orderIntervals = new Map<string, NodeJS.Timeout>();
const binaryStatus = process.env.NEXT_PUBLIC_BINARY_STATUS === "true" || false;
const binaryProfit = parseFloat(process.env.NEXT_PUBLIC_BINARY_PROFIT || "87");

import { createRecordResponses } from "@b/utils/query";
import { handleNotification } from "@b/utils/notifications";
import { sendMessageToRoute } from "@b/handler/Websocket";
import { handleBanStatus, loadBanStatus } from "../../utils";
import { processRewards } from "@b/utils/affiliate";

export const metadata: OperationObject = {
  summary: "Create Binary Order",
  operationId: "createBinaryOrder",
  tags: ["Binary", "Orders"],
  description: "Creates a new binary order for the authenticated user.",
  requestBody: {
    description: "Binary order data to be created.",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            currency: { type: "string" },
            pair: { type: "string" },
            amount: { type: "number" },
            side: { type: "string" },
            closedAt: { type: "string" },
            isDemo: { type: "boolean" },
            type: { type: "string" },
          },
        },
      },
    },
    required: true,
  },
  responses: createRecordResponses("Binary Order"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  if (!binaryStatus) {
    throw createError({
      statusCode: 400,
      message: "Binary trading is disabled",
    });
  }

  const { user, body } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { currency, pair, amount, side, type, closedAt, isDemo } = body;

  // Fetch market data
  const market = (await models.exchangeMarket.findOne({
    where: { currency, pair },
  })) as unknown as ExchangeMarket;

  if (!market || !market.metadata) {
    throw new Error("Market data not found");
  }
  const minAmount = Number(market.metadata?.limits?.amount?.min || 0);
  const maxAmount = Number(market.metadata?.limits?.amount?.max || 0);

  if (amount < minAmount || amount > maxAmount) {
    throw new Error(
      `Amount must be between ${minAmount} and ${maxAmount} ${currency}`
    );
  }

  try {
    // Check for ban status
    const unblockTime = await loadBanStatus();
    if (await handleBanStatus(unblockTime)) {
      throw createError({
        statusCode: 503,
        message: "Service temporarily unavailable. Please try again later.",
      });
    }

    const transaction = await createBinaryOrder(
      user.id,
      currency,
      pair,
      amount,
      side,
      type,
      closedAt,
      isDemo
    );

    startOrderMonitoring(
      user.id,
      transaction.id,
      `${currency}/${pair}`,
      new Date(closedAt).getTime()
    );

    return {
      order: transaction,
      message: "Binary order created successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

export async function createBinaryOrder(
  userId: string,
  currency: string,
  pair: string,
  amount: number,
  side: "RISE" | "FALL",
  type: "RISE_FALL",
  closedAt: string,
  isDemo: boolean = false
): Promise<any> {
  let wallet, balance;
  if (!isDemo) {
    wallet = await models.wallet.findOne({
      where: {
        userId: userId,
        currency: pair,
        type: "SPOT",
      },
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    balance = wallet.balance - amount;
    if (balance < 0) {
      throw new Error("Insufficient balance");
    }
    await models.wallet.update(
      {
        balance: balance,
      },
      {
        where: {
          id: wallet.id,
        },
      }
    );
  }

  const closeAtDate = new Date(closedAt);
  const exchange = await ExchangeManager.startExchange();

  if (!exchange) {
    throw createError({
      statusCode: 503,
      message: "Service temporarily unavailable. Please try again later.",
    });
  }

  let price;
  try {
    // Check for ban status before fetching ticker
    const unblockTime = await loadBanStatus();
    if (await handleBanStatus(unblockTime)) {
      throw createError({
        statusCode: 503,
        message: "Service temporarily unavailable. Please try again later.",
      });
    }

    const ticker = await exchange.fetchTicker(`${currency}/${pair}`);
    price = ticker.last;
  } catch (error) {
    if (error.statusCode === 503) {
      throw error;
    }
    throw new Error("Error fetching market data");
  }

  if (!price) {
    throw new Error("Error fetching ticker data");
  }

  const finalOrder = await models.binaryOrder.create({
    userId: userId,
    symbol: `${currency}/${pair}`,
    type: type,
    side: side,
    status: "PENDING",
    price: price,
    profit: binaryProfit,
    amount: amount,
    isDemo: isDemo,
    closedAt: closeAtDate,
  });

  if (!isDemo) {
    await models.transaction.create({
      userId: userId,
      walletId: wallet.id,
      type: "BINARY_ORDER",
      status: "PENDING",
      amount: amount,
      fee: 0,
      description: `Binary Position | Market: ${currency}/${pair} | Amount: ${amount} ${currency} | Price: ${price} | Profit Margin: ${binaryProfit}% | Side: ${side} | Expiration: ${closedAt.toLocaleString()} | Type: ${
        isDemo ? "Practice" : "Live"
      } Position`,
      referenceId: finalOrder.id,
    });
  }
  return finalOrder;
}

function startOrderMonitoring(
  userId: string,
  id: string,
  symbol: string,
  closedAt: number
) {
  const currentTimeUtc = new Date().getTime();
  const delay = closedAt - currentTimeUtc;

  const timer = setTimeout(() => {
    processOrder(userId, id, symbol);
  }, delay);

  orderIntervals.set(id, timer);
}

async function processOrder(userId: string, id: string, symbol: string) {
  try {
    // Check for ban status
    const unblockTime = await loadBanStatus();
    if (await handleBanStatus(unblockTime)) {
      // Reschedule the processing after a delay
      setTimeout(() => processOrder(userId, id, symbol), 60000); // Retry after 1 minute
      return;
    }

    const exchange = await (ExchangeManager as any).startExchange();

    const data = await exchange.fetchTicker(symbol);

    const order = await getBinaryOrder(userId, id);
    const price = data.last;

    const updateData: Partial<BinaryOrder> = determineOrderStatus(order, price);

    // Update the order in the database
    await updateBinaryOrder(id, updateData);

    // Remove the timeout entry for this order (optional, since it has already executed)
    orderIntervals.delete(id);

    // Process rewards after order is updated
    // await processBinaryRewards(
    //   userId,
    //   order.amount,
    //   updateData.status,
    //   order.symbol.split("/")[1]
    // );
  } catch (error) {
    console.error(`Error processing order ${id}: ${error}`);
    // If the error is due to a ban, we've already rescheduled. For other errors, we might want to implement a retry mechanism.
  }
}

export async function getBinaryOrdersByStatus(
  status: any
): Promise<BinaryOrder[]> {
  return (await models.binaryOrder.findAll({
    where: {
      status: status,
    },
  })) as unknown as BinaryOrder[];
}

export function determineOrderStatus(order: any, closePrice: number): any {
  const updateData: any = {
    closePrice: closePrice,
  };

  switch (order.type) {
    case "RISE_FALL":
      if (order.side === "RISE" && closePrice > order.price) {
        updateData.status = "WIN";
      } else if (order.side === "FALL" && closePrice < order.price) {
        updateData.status = "WIN";
      } else if (closePrice === order.price) {
        updateData.status = "DRAW";
      } else {
        updateData.status = "LOSS";
        updateData.profit = 100;
      }
      break;
  }

  return updateData;
}

export async function updateBinaryOrder(orderId: string, updateData: any) {
  await models.binaryOrder.update(updateData, {
    where: { id: orderId },
  });

  const order = await models.binaryOrder.findOne({
    where: {
      id: orderId,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  let wallet, balance, transaction;
  const isDemo = order.isDemo || false;
  if (!isDemo) {
    transaction = await models.transaction.findOne({
      where: {
        referenceId: order.id,
      },
    });
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await models.transaction.update(
      {
        status: "COMPLETED",
      },
      {
        where: {
          id: transaction.id,
        },
      }
    );

    wallet = await models.wallet.findOne({
      where: {
        id: transaction.walletId,
      },
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    balance = wallet.balance;
    switch (order.status) {
      case "WIN":
        balance += order.amount + order.amount * (order.profit / 100);
        break;
      case "LOSS":
        break;
      case "DRAW":
        balance += order.amount;
        break;
      case "PENDING":
        break;
    }

    await models.wallet.update(
      {
        balance: balance,
      },
      {
        where: {
          id: wallet.id,
        },
      }
    );
  }

  if (["WIN", "LOSS", "DRAW"].includes(order.status)) {
    await sendMessageToRoute(
      "/api/exchange/binary/order",
      { type: "order", symbol: order.symbol, userId: order.userId },
      {
        type: "ORDER_COMPLETED",
        order,
      }
    );
    try {
      const user = await models.user.findOne({
        where: {
          id: order.userId,
        },
      });
      if (!user) {
        throw new Error("User not found");
      }
      await sendBinaryOrderEmail(user, order);
      await handleNotification({
        userId: user.id,
        title: "Binary Order Completed",
        message: `Your binary order for ${order.symbol} has been completed with a status of ${order.status}`,
        type: "ACTIVITY",
      });
    } catch (error) {
      console.error("Error sending binary order email:", error);
    }
  }
}

async function processBinaryRewards(userId, amount, status, currency) {
  let rewardType;
  if (status === "WIN") {
    rewardType = "BINARY_WIN";
  } else if (status === "LOSS" || status === "DRAW") {
    rewardType = "BINARY_TRADE_VOLUME";
  }

  await processRewards(userId, amount, rewardType, currency);
}
