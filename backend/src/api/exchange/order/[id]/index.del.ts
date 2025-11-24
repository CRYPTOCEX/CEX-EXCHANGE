// /server/api/exchange/orders/cancel.del.ts

import ExchangeManager from "@b/utils/exchange";
import { getOrder } from "./index.get";
import { models, sequelize } from "@b/db";
import { updateOrderData } from "../utils";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { getWalletSafe } from "@b/api/finance/wallet/utils";
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
    if (!exchange) throw createError(503, "Service currently unavailable");

    try {
      // Fetch the latest order data from the exchange
      let orderData;
      if (exchange.has["fetchOrder"]) {
        orderData = await exchange.fetchOrder(order.referenceId, order.symbol);
      } else {
        const orders = await exchange.fetchOrders(order.symbol);
        orderData = orders.find((o: any) => o.id === order.referenceId);
      }

      if (!orderData || !orderData.id)
        throw createError(404, "Order not found");

      // Update the order in your database with the latest status
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

      const [currency, pair] = order.symbol.split("/");

      const currencyWallet = await getWalletSafe(user.id, "SPOT", currency);
      const pairWallet = await getWalletSafe(user.id, "SPOT", pair);

      if (!currencyWallet || !pairWallet)
        throw createError(500, "Failed to fetch wallets");

      // Refund the amount initially deducted
      await exchange.cancelOrder(order.referenceId, order.symbol);

      await sequelize.transaction(async (transaction) => {
        if (order.side.toUpperCase() === "BUY") {
          // Refund cost to pairWallet (e.g., USDT)
          const cost = Number(order.amount) * Number(order.price);
          await models.wallet.update(
            { balance: pairWallet.balance + cost },
            { where: { id: pairWallet.id }, transaction }
          );
        } else {
          // Refund amount to currencyWallet (e.g., BTC)
          await models.wallet.update(
            { balance: currencyWallet.balance + Number(order.amount) },
            { where: { id: currencyWallet.id }, transaction }
          );
        }

        // delete the order
        await models.exchangeOrder.destroy({
          where: { id },
          force: true,
          transaction,
        });
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
      throw error;
    } else {
      throw createError(500, "Unable to process your request at this time");
    }
  }
};
