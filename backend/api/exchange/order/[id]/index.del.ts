import ExchangeManager from "@b/utils/exchange";
// /server/api/exchange/orders/cancel.del.ts

import { getOrder } from "./index.get";
import { models, sequelize } from "@b/db";
import { updateOrderData } from "../utils";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { getWallet } from "@b/api/finance/wallet/utils";
import { removeOrderFromTrackedOrders } from "../index.ws";
import { createError } from "@b/utils/error";
import { formatWaitTime, handleBanStatus, loadBanStatus } from "../../utils";

export const metadata: OperationObject = {
  summary: "Cancel Order",
  operationId: "cancelOrder",
  tags: ["Exchange", "Orders"],
  description: "Cancels a specific order for the authenticated user.",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the order to cancel.",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Order canceled successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                example: "Order canceled successfully",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Order"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) throw createError(401, "Unauthorized");
  const { id } = params;

  try {
    // Check for ban status
    const unblockTime = await loadBanStatus();
    if (await handleBanStatus(unblockTime)) {
      const waitTime = unblockTime - Date.now();
      throw createError(
        503,
        `Service temporarily unavailable. Please try again in ${formatWaitTime(
          waitTime
        )}.`
      );
    }

    const order = await getOrder(id);
    if (!order) throw createError(404, "Order not found");

    if (order.status === "CANCELED")
      throw createError(400, "Order already canceled");

    if (order.userId !== user.id) throw createError(401, "Unauthorized");

    const exchange = await ExchangeManager.startExchange();
    if (!exchange) throw createError(503, "Service temporarily unavailable");

    let orderData;
    try {
      if (exchange.has["fetchOrder"]) {
        orderData = await exchange.fetchOrder(order.referenceId, order.symbol);
      } else {
        const orders = await exchange.fetchOrders(order.symbol);
        orderData = orders.find((o: any) => o.id === order.referenceId);
      }

      if (!orderData || !orderData.id)
        throw createError(404, "Order not found");

      await updateOrderData(id, {
        status: orderData.status.toUpperCase(),
        filled: orderData.filled,
        remaining: orderData.remaining,
        cost: orderData.cost,
        fee: orderData.fee,
        trades: JSON.stringify(orderData.trades),
      });

      if (orderData.status !== "open")
        throw createError(400, "Order is not open");

      if (orderData.filled !== 0)
        throw createError(400, "Order has been partially filled");

      const [currency, pair] = order.symbol.split("/");

      const walletCurrency = order.side === "BUY" ? pair : currency;
      const wallet = await getWallet(user.id, "SPOT", walletCurrency);

      if (!wallet) throw createError(500, "Failed to fetch wallet");

      // Fetch fee rates and precision from exchangeMarket
      const market = (await models.exchangeMarket.findOne({
        where: { currency, pair },
      })) as unknown as ExchangeMarket;

      if (!market) throw createError(404, "Market data not found");

      if (!market.metadata) throw createError(404, "Market metadata not found");

      const precision =
        Number(
          order.side === "BUY"
            ? market.metadata.precision.amount
            : market.metadata.precision.price
        ) || 8;

      const feeRate =
        order.side === "BUY"
          ? Number(market.metadata.taker)
          : Number(market.metadata.maker);

      // Calculate fee and cost as done during order creation
      const feeCalculated = (order.price * order.amount * feeRate) / 100;
      const fee = parseFloat(feeCalculated.toFixed(precision));
      const costCalculated =
        order.side === "BUY" ? order.amount * order.price + fee : order.amount;
      const cost = parseFloat(costCalculated.toFixed(precision));

      const balanceUpdate =
        order.side === "BUY"
          ? wallet.balance + cost
          : wallet.balance + order.amount;

      await exchange.cancelOrder(order.referenceId, order.symbol);

      await sequelize
        .transaction(async (transaction) => {
          await models.wallet.update(
            { balance: balanceUpdate },
            { where: { id: wallet.id }, transaction }
          );

          await models.exchangeOrder.destroy({
            where: { id },
            force: true,
            transaction,
          });
        })
        .catch((error) => {
          console.error("Transaction rolled back due to error:", error);
          throw new Error("Transaction failed");
        });

      removeOrderFromTrackedOrders(user.id, id);

      return {
        message: "Order cancelled successfully",
      };
    } catch (error) {
      console.error("Error:", error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error("Error:", error);
    if (error.statusCode === 503) {
      // This is our custom service unavailable error
      throw error;
    } else {
      // For other errors, we'll give a generic message
      throw createError(500, "Unable to process your request at this time");
    }
  }
};
