import { createError } from "@b/utils/error";
import { serverErrorResponse, unauthorizedResponse } from "@b/utils/query";
import ExchangeManager from "@b/utils/exchange";
import ccxt from "ccxt";

export const metadata: OperationObject = {
  summary: "Retrieves the exchange balance for the logged-in user",
  description:
    "Fetches the exchange balance associated with the currently authenticated user.",
  operationId: "getExchangeBalance",
  tags: ["Admin", "Exchange", "Balance"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Exchange balance retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset: {
                  type: "string",
                  description: "The asset symbol",
                },
                available: {
                  type: "number",
                  description: "The available balance",
                },
                inOrder: {
                  type: "number",
                  description: "The balance locked in orders",
                },
                total: {
                  type: "number",
                  description: "The total balance",
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "view.exchange.balance",
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const exchange = await ExchangeManager.startExchange();

    if (!exchange) {
      throw createError({
        statusCode: 500,
        message: "Exchange or provider not available",
      });
    }

    const balance = await exchange.fetchBalance();
    const structuredBalance = Object.entries(balance.total)
      .map(([asset, total]) => ({
        asset,
        available: balance.free[asset] || 0,
        inOrder: balance.used[asset] || 0,
        total,
      }))
      .filter((balance) => balance.available > 0 || balance.inOrder > 0);

    return {
      balance: structuredBalance,
    };
  } catch (error) {
    if (error instanceof ccxt.AuthenticationError) {
      console.error(`Authentication error for userId: ${user.id}`, error);
      throw createError({
        statusCode: 401,
        message: "Authentication error: please check your API credentials.",
      });
    } else if (error instanceof ccxt.NetworkError) {
      console.error(`Network error for userId: ${user.id}`, error);
      throw createError({
        statusCode: 503,
        message: "Network error: unable to reach the exchange.",
      });
    } else {
      console.error(
        `An error occurred while fetching the exchange balance for userId: ${user.id}`,
        error
      );
      throw createError({
        statusCode: 500,
        message: "Failed to retrieve exchange balance",
      });
    }
  }
};
