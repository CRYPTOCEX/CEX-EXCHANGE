import { getWallet } from "@b/api/finance/wallet/utils";
import { FuturesMatchingEngine } from "@b/api/(ext)/futures/utils/matchingEngine";

// Safe imports for ecosystem modules
let fromBigInt: any;
let updateWalletBalance: any;
try {
  const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
  fromBigInt = blockchainModule.fromBigInt;
} catch (e) {
  // Ecosystem extension not available
}

try {
  const walletModule = require("@b/api/(ext)/ecosystem/utils/wallet");
  updateWalletBalance = walletModule.updateWalletBalance;
} catch (e) {
  // Ecosystem extension not available
}
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import {
  cancelOrderByUuid,
  getOrderByUuid,
} from "@b/api/(ext)/futures/utils/queries/order";

export const metadata: OperationObject = {
  summary: "Cancels an existing futures trading order",
  description:
    "Cancels an open futures trading order and refunds the unfulfilled amount.",
  operationId: "cancelFuturesOrder",
  tags: ["Futures", "Orders"],
  logModule: "FUTURES",
  logTitle: "Cancel futures order",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "UUID of the order" },
    },
    {
      name: "timestamp",
      in: "query",
      required: true,
      schema: { type: "string", description: "Timestamp of the order" },
    },
  ],
  responses: {
    200: {
      description: "Order cancelled successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string", description: "Success message" },
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
  const { params, query, user, ctx } = data;

  ctx?.step?.("Validating user authentication");
  if (!user?.id) {
    ctx?.fail?.("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  const { timestamp } = query;

  ctx?.step?.("Validating request parameters");
  if (!id || !timestamp) {
    ctx?.fail?.("Missing order ID or timestamp");
    throw createError({
      statusCode: 400,
      message: "Invalid request parameters",
    });
  }

  try {
    ctx?.step?.(`Fetching order ${id}`);
    const order = await getOrderByUuid(user.id, id, timestamp);
    if (!order) {
      ctx?.fail?.("Order not found");
      throw createError({
        statusCode: 404,
        message: "Order not found",
      });
    }
    if (order.status !== "OPEN") {
      ctx?.fail?.("Order is not open");
      throw createError({
        statusCode: 400,
        message: "Order is not open",
      });
    }

    ctx?.step?.(`Cancelling order for ${order.symbol}`);
    await cancelOrderByUuid(
      user.id,
      id,
      timestamp,
      order.symbol,
      BigInt(order.price),
      order.side,
      BigInt(order.amount)
    );

    const [currency, pair] = order.symbol.split("/");
    const refundAmount = fromBigInt(order.cost) + fromBigInt(order.fee); // Refund the cost and fee
    const walletCurrency = order.side === "BUY" ? pair : currency;

    ctx?.step?.(`Fetching ${walletCurrency} wallet for refund`);
    const wallet = await getWallet(user.id, "FUTURES", walletCurrency, false, ctx);
    if (!wallet) {
      ctx?.fail?.(`${walletCurrency} wallet not found`);
      throw createError({
        statusCode: 404,
        message: `${walletCurrency} wallet not found`,
      });
    }

    ctx?.step?.(`Refunding ${refundAmount} ${walletCurrency}`);
    await updateWalletBalance(wallet, refundAmount, "add");

    ctx?.step?.("Notifying matching engine of cancellation");
    const matchingEngine = await FuturesMatchingEngine.getInstance();
    await matchingEngine.handleOrderCancellation(id, order.symbol);

    ctx?.success?.(`Order ${id} cancelled and refunded successfully`);
    return { message: "Order cancelled and balance refunded successfully" };
  } catch (error) {
    ctx?.fail?.(`Failed to cancel order: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: `Failed to cancel order: ${error.message}`,
    });
  }
};
