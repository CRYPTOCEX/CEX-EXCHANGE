import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { orderIntervals } from "../index.post";
import ExchangeManager from "@b/utils/exchange";
import { createError } from "@b/utils/error";
import { handleBanStatus, loadBanStatus } from "@b/api/exchange/utils";

const binaryProfit = parseFloat(process.env.NEXT_PUBLIC_BINARY_PROFIT || "87");

export const metadata: OperationObject = {
  summary: "Cancel Binary Order",
  operationId: "cancelBinaryOrder",
  tags: ["Binary", "Orders"],
  description: "Cancels a binary order for the authenticated user.",
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the binary order to cancel.",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Cancellation percentage data.",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            percentage: { type: "number" },
          },
        },
      },
    },
    required: false,
  },
  responses: {
    200: {
      description: "Binary order cancelled",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Binary Order"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { id } = data.params;
  const { percentage } = data.body;
  const order = await models.binaryOrder.findOne({
    where: {
      id,
    },
  });

  if (!order) {
    throw createError(404, "Order not found");
  }

  let wallet, balance, transaction;
  const isDemo = order.isDemo || false;

  try {
    // Check for ban status
    const unblockTime = await loadBanStatus();
    if (await handleBanStatus(unblockTime)) {
      throw createError(
        503,
        "Service temporarily unavailable. Please try again later."
      );
    }

    // Fetch current price from the ticker
    const exchange = await ExchangeManager.startExchange();
    if (!exchange) {
      throw createError(
        503,
        "Service temporarily unavailable. Please try again later."
      );
    }

    const ticker = await exchange.fetchTicker(order.symbol);
    const currentPrice = ticker.last;

    if (!isDemo) {
      transaction = await models.transaction.findOne({
        where: {
          referenceId: order.id,
        },
      });

      if (!transaction) {
        throw createError(404, "Transaction not found");
      }

      wallet = await models.wallet.findOne({
        where: {
          id: transaction.walletId,
        },
      });

      if (!wallet) {
        throw createError(404, "Wallet not found");
      }

      // Calculate the partial return based on the current price and order side
      let partialReturn = order.amount;

      if (order.side === "RISE") {
        if (currentPrice > order.price) {
          // Profiting scenario for RISE
          partialReturn += order.amount * (binaryProfit / 100);
        } else {
          // Losing scenario for RISE
          partialReturn -= order.amount * (binaryProfit / 100);
        }
      } else if (order.side === "FALL") {
        if (currentPrice < order.price) {
          // Profiting scenario for FALL
          partialReturn += order.amount * (binaryProfit / 100);
        } else {
          // Losing scenario for FALL
          partialReturn -= order.amount * (binaryProfit / 100);
        }
      }

      // Apply cancellation percentage if provided
      if (percentage !== undefined) {
        const cutAmount = order.amount * (Math.abs(percentage) / 100);
        partialReturn = wallet.balance + order.amount - cutAmount;
      }

      // Update the wallet balance
      balance = wallet.balance + partialReturn;

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

      await models.transaction.destroy({
        where: {
          id: transaction.id,
        },
        force: true,
      });
    }

    // Clear the order from monitoring
    if (orderIntervals.has(id)) {
      clearTimeout(orderIntervals.get(id));
      orderIntervals.delete(id);
    }

    await models.binaryOrder.update(
      {
        status: "CANCELED",
        closePrice: currentPrice,
      },
      {
        where: {
          id,
        },
      }
    );

    return { message: "Order cancelled" };
  } catch (error) {
    if (error.statusCode === 503) {
      throw error;
    }
    console.error("Error cancelling binary order:", error);
    throw createError(500, "An error occurred while cancelling the order");
  }
};
