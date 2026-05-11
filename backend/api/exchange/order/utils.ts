import { models } from "@b/db";

export async function updateOrderData(id: string, orderData: any) {
  const updateData: Record<string, any> = {
    status: orderData.status.toUpperCase(),
    filled: orderData.filled,
    remaining: orderData.remaining,
    cost: orderData.cost,
    fee: orderData.fee?.cost,
    trades: orderData.trades,
    average: orderData.average,
  };

  // Remove undefined properties
  const filteredUpdateData = Object.fromEntries(
    Object.entries(updateData).filter(([_, value]) => value !== undefined)
  );

  await models.exchangeOrder.update(filteredUpdateData, {
    where: {
      id,
    },
  });

  const updatedOrder = await models.exchangeOrder.findOne({
    where: {
      id,
    },
  });

  if (!updatedOrder) {
    throw new Error("Order not found");
  }

  return updatedOrder.get({ plain: true });
}

import { baseStringSchema, baseNumberSchema } from "@b/utils/schema";

export const baseOrderSchema = {
  id: baseStringSchema("Unique identifier for the order"),
  referenceId: baseStringSchema("External reference ID for the order"),
  userId: baseStringSchema("User ID associated with the order"),
  status: baseStringSchema("Status of the order (e.g., pending, completed)"),
  symbol: baseStringSchema("Trading symbol for the order"),
  type: baseStringSchema("Type of order (e.g., market, limit)"),
  timeInForce: baseStringSchema("Time in force policy for the order"),
  side: baseStringSchema("Order side (buy or sell)"),
  price: baseNumberSchema("Price per unit"),
  average: baseNumberSchema("Average price per unit"),
  amount: baseNumberSchema("Total amount ordered"),
  filled: baseNumberSchema("Amount filled"),
  remaining: baseNumberSchema("Amount remaining"),
  cost: baseNumberSchema("Total cost"),
  trades: {
    type: "object",
    description: "Details of trades executed for this order",
    additionalProperties: true,
  },
  fee: baseNumberSchema("Transaction fee"),
  feeCurrency: baseStringSchema("Currency of the transaction fee"),
  createdAt: baseStringSchema("Creation date of the order"),
  updatedAt: baseStringSchema("Last update date of the order"),
};

export function adjustOrderData(order: any, provider: string | null): any {
  if (provider === "xt") {
    const info = order.info;
    const side = info.side.toUpperCase();
    let amount, filled, remaining, cost, fee;

    const avgPrice = parseFloat(info.avgPrice);
    const executedQty = parseFloat(info.executedQty);
    const leavingQty = parseFloat(info.leavingQty);

    if (side === "BUY") {
      // For BUY orders, executedQty is in quote currency (e.g., USDT)
      amount = executedQty / avgPrice; // Calculate base currency amount
      filled = amount;
      remaining = leavingQty / avgPrice; // Remaining amount in base currency
      cost = executedQty; // Amount of quote currency spent
      fee = { currency: info.feeCurrency, cost: parseFloat(info.fee) };
    } else if (side === "SELL") {
      // For SELL orders, executedQty is in base currency (e.g., TRX)
      amount = executedQty; // Amount of base currency sold
      filled = amount;
      remaining = leavingQty; // Remaining amount in base currency
      cost = parseFloat(info.tradeQuote); // Amount of quote currency received
      fee = { currency: info.feeCurrency, cost: parseFloat(info.fee) };
    } else {
      // Handle other sides if any
      amount = parseFloat(info.tradeBase);
      filled = parseFloat(info.executedQty);
      remaining = leavingQty;
      cost = parseFloat(info.tradeQuote);
      fee = { currency: info.feeCurrency, cost: parseFloat(info.fee) };
    }

    return {
      ...order,
      amount: amount,
      filled: filled,
      remaining: remaining,
      cost: cost,
      fee: fee,
      average: avgPrice,
      price: avgPrice,
    };
  }
  return order;
}
