import { models } from "@b/db";
import { processRewards } from "@b/utils/affiliate";
import ExchangeManager from "@b/utils/exchange";
import { handleBanStatus, loadBanStatus } from "@b/api/exchange/utils";
import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";
import { createError } from "@b/utils/error";

export const baseBinaryOrderSchema = {
  id: baseStringSchema(
    "ID of the binary order",
    undefined,
    undefined,
    false,
    undefined,
    "uuid"
  ),
  userId: baseStringSchema("User ID associated with the order"),
  symbol: baseStringSchema("Trading symbol"),
  price: baseNumberSchema("Entry price of the order"),
  amount: baseNumberSchema("Amount of the order"),
  profit: baseNumberSchema("Profit from the order"),
  side: baseStringSchema("Side of the order (e.g., BUY, SELL)"),
  type: baseStringSchema("Type of order (e.g., LIMIT, MARKET)"),
  barrier: baseNumberSchema("Barrier price of the order", true),
  strikePrice: baseNumberSchema("Strike price of the order", true),
  payoutPerPoint: baseNumberSchema("Payout per point of the order", true),
  status: baseStringSchema("Status of the order (e.g., OPEN, CLOSED)"),
  isDemo: baseBooleanSchema("Whether the order is a demo"),
  closedAt: baseDateTimeSchema("Time when the order was closed", true),
  closePrice: baseNumberSchema("Price at which the order was closed"),
  createdAt: baseDateTimeSchema("Creation date of the order"),
  updatedAt: baseDateTimeSchema("Last update date of the order", true),
};

export async function getBinaryOrder(
  userId: string,
  id: string
): Promise<binaryOrderAttributes> {
  const response = await models.binaryOrder.findOne({
    where: {
      id,
      userId,
    },
  });

  if (!response) {
    throw new Error(`Binary order with ID ${id} not found`);
  }

  return response.get({ plain: true }) as unknown as binaryOrderAttributes;
}

export async function getBinaryOrdersByStatus(
  status: string
): Promise<binaryOrderAttributes[]> {
  return (await models.binaryOrder.findAll({
    where: { status },
  })) as binaryOrderAttributes[];
}

// If you want to process rewards, call it here:
// await processBinaryRewards(order.userId, order.amount, order.status, order.symbol.split("/")[1]);
export async function processBinaryRewards(
  userId: string,
  amount: number,
  status: string,
  currency: string
) {
  let rewardType;
  if (status === "WIN") {
    rewardType = "BINARY_WIN";
  } else if (status === "LOSS" || status === "DRAW") {
    rewardType = "BINARY_TRADE_VOLUME";
  }

  await processRewards(userId, amount, rewardType, currency);
}

export function validateBinaryProfit(value?: string): number {
  const profit = parseFloat(value || "87");
  if (isNaN(profit) || profit < 0) return 87; // default profit margin
  return profit;
}

/**
 * Ensures that the user is not banned. Throws a 503 error if the service is unavailable due to a ban.
 */
export async function ensureNotBanned() {
  const unblockTime = await loadBanStatus();
  if (await handleBanStatus(unblockTime)) {
    throw createError({
      statusCode: 503,
      message: "Service temporarily unavailable. Please try again later.",
    });
  }
}

/**
 * Attempts to start the exchange multiple times before giving up.
 */
export async function ensureExchange(attempts = 3, delayMs = 500) {
  for (let i = 0; i < attempts; i++) {
    const exchange = await ExchangeManager.startExchange();
    if (exchange) return exchange;
    if (i < attempts - 1)
      await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw createError({
    statusCode: 503,
    message: "Service temporarily unavailable. Please try again later.",
  });
}
