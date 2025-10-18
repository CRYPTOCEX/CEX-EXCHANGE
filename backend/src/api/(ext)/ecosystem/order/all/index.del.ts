import { getWallet } from "@b/api/finance/wallet/utils";
import { fromBigInt } from "@b/api/(ext)/ecosystem/utils/blockchain";
import { MatchingEngine } from "@b/api/(ext)/ecosystem/utils/matchingEngine";
import {
  cancelOrderByUuid,
  getOrdersByUserId,
} from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import { updateWalletBalance } from "@b/api/(ext)/ecosystem/utils/wallet";
import { createError } from "@b/utils/error";

import {
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Cancels all open trading orders",
  description:
    "Cancels all open trading orders for the user and refunds the unfulfilled amounts.",
  operationId: "cancelAllOrders",
  tags: ["Trading", "Orders"],
  responses: {
    200: {
      description: "All orders cancelled successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string", description: "Success message" },
              cancelledCount: { type: "number", description: "Number of orders cancelled" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Get all orders for the user
    const allOrders = await getOrdersByUserId(user.id);

    // Filter only OPEN orders
    const openOrders = allOrders.filter(order => order.status === "OPEN");

    if (openOrders.length === 0) {
      return {
        message: "No open orders to cancel",
        cancelledCount: 0,
      };
    }

    const matchingEngine = await MatchingEngine.getInstance();
    let cancelledCount = 0;

    // Cancel each open order
    for (const order of openOrders) {
      try {
        const totalAmount = BigInt(order.amount);
        const remaining = BigInt(order.remaining);
        const totalCost = BigInt(order.cost);
        const side = order.side;
        const symbol = order.symbol;

        if (remaining === BigInt(0)) {
          continue; // Skip fully filled orders
        }

        const [currency, pair] = symbol.split("/");

        let refundAmount = 0;

        if (side === "BUY") {
          const leftoverRatio = Number(remaining) / Number(totalAmount);
          refundAmount = fromBigInt(totalCost) * leftoverRatio;
        } else {
          const leftoverRatio = Number(remaining) / Number(totalAmount);
          refundAmount = fromBigInt(totalAmount) * leftoverRatio;
        }

        const refundCurrency = side === "BUY" ? pair : currency;
        const wallet = await getWallet(user.id, "ECO", refundCurrency);

        if (!wallet) {
          console.error(`Wallet not found for ${refundCurrency}, skipping order ${order.id}`);
          continue;
        }

        // Cancel the order
        await cancelOrderByUuid(
          user.id,
          order.id,
          typeof order.createdAt === 'string' ? order.createdAt : order.createdAt.toISOString(),
          symbol,
          BigInt(order.price),
          side,
          totalAmount
        );

        // Refund the leftover funds
        await updateWalletBalance(wallet, refundAmount, "add");

        // Remove from orderbook and internal queues
        await matchingEngine.handleOrderCancellation(order.id, symbol);

        cancelledCount++;
      } catch (error) {
        console.error(`Failed to cancel order ${order.id}:`, error.message);
        // Continue with other orders even if one fails
      }
    }

    return {
      message: `Successfully cancelled ${cancelledCount} order(s)`,
      cancelledCount,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to cancel orders: ${error.message}`,
    });
  }
};
