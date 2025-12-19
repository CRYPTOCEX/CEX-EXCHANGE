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
import { logger } from "@b/utils/console";

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
  logModule: "EXCHANGE",
  logTitle: "Cancel exchange order",
};

export default async (data: Handler) => {
  const { user, params, ctx } = data;
  if (!user?.id) throw createError(401, "Unauthorized");
  const { id } = params;

  try {
    // Check for ban status
    ctx?.step("Checking service availability");
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

    ctx?.step("Fetching order details");
    const order = await getOrder(id);
    if (!order) throw createError(404, "Order not found");

    if (order.status === "CANCELED")
      throw createError(400, "Order already canceled");

    if (order.userId !== user.id) throw createError(401, "Unauthorized");

    ctx?.step("Connecting to exchange");
    const exchange = await ExchangeManager.startExchange(ctx);
    if (!exchange) throw createError(503, "Service currently unavailable");

    try {
      // Fetch the latest order data from the exchange
      ctx?.step("Fetching latest order status from exchange");
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
      ctx?.step("Updating local order status");
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

      ctx?.step(`Fetching wallets for ${currency} and ${pair}`);
      const currencyWallet = await getWalletSafe(user.id, "SPOT", currency, false, ctx);
      const pairWallet = await getWalletSafe(user.id, "SPOT", pair, false, ctx);

      if (!currencyWallet || !pairWallet)
        throw createError(500, "Failed to fetch wallets");

      // Refund the amount initially deducted
      ctx?.step("Cancelling order on exchange");
      await exchange.cancelOrder(order.referenceId, order.symbol);

      ctx?.step("Refunding wallet balance and removing order");
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

      ctx?.success(`Order cancelled successfully: ${order.side} ${order.amount} ${order.symbol}`);
      return {
        message: "Order cancelled successfully",
      };
    } catch (error) {
      logger.error("EXCHANGE", "Error cancelling order", error);
      throw new Error(error.message);
    }
  } catch (error) {
    logger.error("EXCHANGE", "Error processing order cancellation", error);
    if (error.statusCode === 503) {
      throw error;
    } else {
      throw createError(500, "Unable to process your request at this time");
    }
  }
};
