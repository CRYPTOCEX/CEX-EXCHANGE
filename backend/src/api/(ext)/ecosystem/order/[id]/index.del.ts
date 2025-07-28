import { getWallet } from "@b/api/finance/wallet/utils";
import { fromBigInt } from "@b/api/(ext)/ecosystem/utils/blockchain";
import { MatchingEngine } from "@b/api/(ext)/ecosystem/utils/matchingEngine";
import {
  cancelOrderByUuid,
  getOrderByUuid,
} from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import { updateWalletBalance } from "@b/api/(ext)/ecosystem/utils/wallet";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Cancels an existing trading order",
  description:
    "Cancels an open trading order and refunds the unfulfilled amount, including fee adjustments for partial fills.",
  operationId: "cancelOrder",
  tags: ["Trading", "Orders"],
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
  const { params, query, user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  const { timestamp } = query;

  if (!id || !timestamp) {
    throw createError({
      statusCode: 400,
      message: "Invalid request parameters",
    });
  }

  try {
    const order = await getOrderByUuid(user.id, id, timestamp);
    if (!order) {
      throw new Error("Order not found");
    }
    if (order.status !== "OPEN") {
      throw new Error("Order is not open");
    }

    const totalAmount = BigInt(order.amount);
    const remaining = BigInt(order.remaining);
    const totalCost = BigInt(order.cost);
    const side = order.side;
    const symbol = order.symbol;

    if (remaining === BigInt(0)) {
      // No leftover portion to cancel.
      throw new Error("Order is fully filled; nothing to cancel.");
    }

    const [currency, pair] = symbol.split("/");

    let refundAmount = 0;

    if (side === "BUY") {
      // The user locked 'totalCost' = amount*price + fee in 'pair' currency upfront.
      // Unused portion: (remaining/totalAmount) * totalCost
      const leftoverRatio = Number(remaining) / Number(totalAmount);
      refundAmount = fromBigInt(totalCost) * leftoverRatio;
      // Refund is in 'pair' currency.
    } else {
      // side === "SELL"
      // The user locked 'amount' of the base currency upfront and did not pay fee upfront.
      // Unused portion: (remaining/totalAmount) * amount
      const leftoverRatio = Number(remaining) / Number(totalAmount);
      refundAmount = fromBigInt(totalAmount) * leftoverRatio;
      // Refund is in 'currency' (base) since that's what was locked.
    }

    const refundCurrency = side === "BUY" ? pair : currency;
    const wallet = await getWallet(user.id, "ECO", refundCurrency);
    if (!wallet) {
      throw new Error(`${refundCurrency} wallet not found`);
    }

    // Update order status to CANCELED and remaining to 0, as we are cancelling the leftover portion.
    // After cancellation, the order no longer has any active portion on the orderbook.
    await cancelOrderByUuid(
      user.id,
      id,
      timestamp,
      symbol,
      BigInt(order.price),
      side,
      totalAmount
    );

    // Refund the leftover funds
    await updateWalletBalance(wallet, refundAmount, "add");

    // Remove from orderbook and internal queues
    const matchingEngine = await MatchingEngine.getInstance();
    await matchingEngine.handleOrderCancellation(id, symbol);

    return {
      message: "Order cancelled and leftover balance refunded successfully",
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to cancel order: ${error.message}`,
    });
  }
};
