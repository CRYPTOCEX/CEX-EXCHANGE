import { createError } from "@b/utils/error";

// Safe import for ecosystem modules
let fromBigInt: any;
let updateWalletBalance: any;
try {
  const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
  fromBigInt = blockchainModule.fromBigInt;

  const walletModule = require("@b/api/(ext)/ecosystem/utils/wallet");
  updateWalletBalance = walletModule.updateWalletBalance;
} catch (e) {
  // Ecosystem extension not available
}
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import {
  getPosition,
  updatePositionStatus,
} from "@b/api/(ext)/futures/utils/queries/positions";
import { getWallet } from "@b/api/finance/wallet/utils";

export const metadata: OperationObject = {
  summary: "Closes an open futures position",
  description: "Closes an open futures position for the logged-in user.",
  operationId: "closeFuturesPosition",
  tags: ["Futures", "Positions"],
  logModule: "FUTURES",
  logTitle: "Close futures position",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            currency: {
              type: "string",
              description: "Currency symbol (e.g., BTC)",
            },
            pair: { type: "string", description: "Pair symbol (e.g., USDT)" },
            side: {
              type: "string",
              description: "Position side, either buy or sell",
            },
          },
          required: ["currency", "pair", "side"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Position closed successfully",
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
    404: notFoundMetadataResponse("Position"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { body, user, ctx } = data;

  ctx?.step?.("Validating user authentication");
  if (!user?.id) {
    ctx?.fail?.("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { currency, pair, side } = body;

  ctx?.step?.("Validating request parameters");
  if (!currency || !pair || !side) {
    ctx?.fail?.("Missing required parameters");
    throw createError({
      statusCode: 400,
      message: "Invalid request parameters",
    });
  }
  const symbol = `${currency}/${pair}`;

  try {
    ctx?.step?.(`Fetching position for ${symbol} (${side})`);
    const position = await getPosition(user.id, symbol, side);
    if (!position) {
      ctx?.fail?.("Position not found");
      throw createError({
        statusCode: 404,
        message: "Position not found",
      });
    }

    if (position.status !== "OPEN") {
      ctx?.fail?.("Position is not open");
      throw createError({
        statusCode: 400,
        message: "Position is not open",
      });
    }

    ctx?.step?.("Calculating final balance change");
    const finalBalanceChange = calculateFinalBalanceChange(position);

    ctx?.step?.(`Fetching ${pair} wallet`);
    const wallet = await getWallet(
      position.userId,
      "FUTURES",
      symbol.split("/")[1],
      false,
      ctx
    );

    if (wallet) {
      if (!updateWalletBalance) {
        ctx?.fail?.("Ecosystem extension not available");
        throw new Error("Ecosystem extension not available for wallet operations");
      }

      ctx?.step?.(`Updating wallet balance by ${finalBalanceChange > 0 ? "+" : ""}${finalBalanceChange}`);
      if (finalBalanceChange > 0) {
        await updateWalletBalance(wallet, finalBalanceChange, "add");
      } else {
        await updateWalletBalance(
          wallet,
          Math.abs(finalBalanceChange),
          "subtract"
        );
      }
    }

    ctx?.step?.("Updating position status to CLOSED");
    await updatePositionStatus(position.userId, position.id, "CLOSED");

    ctx?.success?.(`Position closed successfully for ${symbol}`);
    return { message: "Position closed and balance updated successfully" };
  } catch (error) {
    ctx?.fail?.(`Failed to close position: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: `Failed to close position: ${error.message}`,
    });
  }
};

const calculateFinalBalanceChange = (position) => {
  if (!fromBigInt) {
    throw new Error("Ecosystem extension not available for number conversion");
  }

  const entryPrice = fromBigInt(position.entryPrice);
  const amount = fromBigInt(position.amount);
  const unrealizedPnl = fromBigInt(position.unrealizedPnl); // Ensure PnL is a number
  const investedAmount = entryPrice * amount;
  const finalBalanceChange = investedAmount + unrealizedPnl;
  return finalBalanceChange;
};
