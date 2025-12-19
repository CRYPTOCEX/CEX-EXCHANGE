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
  logModule: "ECOSYSTEM",
  logTitle: "Cancel trading order",
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
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  const { timestamp } = query;

  ctx?.step("Validating request parameters");
  if (!id || !timestamp) {
    ctx?.fail("Missing order ID or timestamp");
    throw createError({
      statusCode: 400,
      message: "Invalid request parameters",
    });
  }

  try {
    ctx?.step("Retrieving order details");
    // Convert timestamp to Date object if it's a millisecond timestamp string
    const timestampValue = !isNaN(Number(timestamp))
      ? new Date(Number(timestamp)).toISOString()
      : timestamp;

    const order = await getOrderByUuid(user.id, id, timestampValue);
    if (!order) {
      ctx?.fail(`Order ${id} not found`);
      throw new Error("Order not found");
    }
    if (order.status !== "OPEN") {
      ctx?.fail(`Order ${id} is not open (status: ${order.status})`);
      throw new Error("Order is not open");
    }

    const totalAmount = BigInt(order.amount);
    const remaining = BigInt(order.remaining);
    const totalCost = BigInt(order.cost);
    const totalFee = BigInt(order.fee);
    const price = BigInt(order.price);
    const side = order.side;
    const symbol = order.symbol;

    if (remaining === BigInt(0)) {
      // No leftover portion to cancel.
      throw new Error("Order is fully filled; nothing to cancel.");
    }

    const [currency, pair] = symbol.split("/");

    ctx?.step("Calculating refund amount");
    let refundAmount = 0;

    if (side === "BUY") {
      // BUY order: user locked (amount * price + fee) in pair currency
      // For partial fills, the filled portion already released funds from inOrder
      // We need to refund what's STILL LOCKED for the remaining unfilled portion

      // Calculate proportional cost and fee for remaining amount
      const fillRatio = Number(remaining) / Number(totalAmount);
      const remainingCost = (remaining * price) / BigInt(1e18); // remaining * price
      const remainingFee = (totalFee * BigInt(Math.floor(fillRatio * 1e18))) / BigInt(1e18);

      // Total refund = remaining cost + remaining fee (what's still locked)
      refundAmount = fromBigInt(remainingCost + remainingFee);
    } else {
      // SELL order: user locked 'amount' in base currency
      // For partial fills, filled amount was already released from inOrder
      // Refund the remaining unfilled amount that's still locked
      refundAmount = fromBigInt(remaining);
    }

    const refundCurrency = side === "BUY" ? pair : currency;

    ctx?.step(`Retrieving ${refundCurrency} wallet`);
    const wallet = await getWallet(user.id, "ECO", refundCurrency, false, ctx);
    if (!wallet) {
      ctx?.fail(`${refundCurrency} wallet not found`);
      throw new Error(`${refundCurrency} wallet not found`);
    }

    ctx?.step("Cancelling order in database");
    // Update order status to CANCELED and remaining to 0, as we are cancelling the leftover portion.
    // After cancellation, the order no longer has any active portion on the orderbook.
    await cancelOrderByUuid(
      user.id,
      id,
      timestampValue,
      symbol,
      BigInt(order.price),
      side,
      totalAmount
    );

    ctx?.step(`Refunding ${refundAmount} ${refundCurrency} to wallet`);
    // Unlock and refund the leftover funds
    // Funds are locked in inOrder when order is created, need to unlock them and add back to balance
    await updateWalletBalance(wallet, refundAmount, "add");

    ctx?.step("Removing order from matching engine");
    // Remove from orderbook and internal queues
    const matchingEngine = await MatchingEngine.getInstance();
    await matchingEngine.handleOrderCancellation(id, symbol);

    // Trigger copy trading cancellation if user is a leader (async, non-blocking)
    ctx?.step("Checking for copy trading cancellation");
    try {
      const { triggerCopyTradingCancellation } = await import("@b/utils/safe-imports");
      triggerCopyTradingCancellation(id, user.id, symbol).catch(() => {});
    } catch (importError) {
      // Safe import failed, copy trading not available
    }

    ctx?.success(`Order ${id} cancelled, refunded ${refundAmount} ${refundCurrency}`);
    return {
      message: "Order cancelled and leftover balance refunded successfully",
    };
  } catch (error) {
    ctx?.fail(`Order cancellation failed: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: `Failed to cancel order: ${error.message}`,
    });
  }
};
