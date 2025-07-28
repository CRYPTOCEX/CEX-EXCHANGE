import { createError } from "@b/utils/error";
import { serverErrorResponse, unauthorizedResponse } from "@b/utils/query";
import ExchangeManager from "@b/utils/exchange";
import ccxt from "ccxt";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary:
    "Calculates and compares the fees for exchange orders, grouped by fee currency",
  description:
    "Fetches the orders, calculates the fees, and groups them by fee currency.",
  operationId: "getOrderFeesByCurrency",
  tags: ["Admin", "Exchange", "Fees"],
  requiresAuth: true,
  responses: {
    200: {
      description:
        "Fees calculated and compared successfully, grouped by fee currency",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              feesComparison: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    currency: {
                      type: "string",
                      description: "The fee currency",
                    },
                    totalAmount: {
                      type: "number",
                      description: "The total order amount",
                    },
                    totalCalculatedFee: {
                      type: "number",
                      description: "The total calculated fee",
                    },
                    totalExchangeFee: {
                      type: "number",
                      description: "The total fee from the exchange",
                    },
                    totalExtraFee: {
                      type: "number",
                      description: "The total extra fee we charged",
                    },
                  },
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
  permission: "view.exchange.fee",
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

    const markets = await exchange.fetchMarkets();

    const orders = await models.exchangeOrder.findAll({
      where: { userId: user.id },
      attributes: ["id", "amount", "fee", "symbol", "side", "feeCurrency"],
    });

    const feeSummary = {};

    orders.forEach((order) => {
      const market = markets.find((m) => m.symbol === order.symbol);
      const exchangeFeeRate =
        order.side === "BUY" ? market.taker : market.maker;
      const calculatedFee = (order.amount * order.fee) / 100;
      const exchangeFeeAmount = (order.amount * exchangeFeeRate) / 100;
      const extraFee = calculatedFee - exchangeFeeAmount;

      if (!feeSummary[order.feeCurrency]) {
        feeSummary[order.feeCurrency] = {
          currency: order.feeCurrency,
          totalAmount: 0,
          totalCalculatedFee: 0,
          totalExchangeFee: 0,
          totalExtraFee: 0,
        };
      }

      feeSummary[order.feeCurrency].totalAmount += order.amount;
      feeSummary[order.feeCurrency].totalCalculatedFee += calculatedFee;
      feeSummary[order.feeCurrency].totalExchangeFee += exchangeFeeAmount;
      feeSummary[order.feeCurrency].totalExtraFee += extraFee;
    });

    const feesComparison = Object.values(feeSummary);

    return {
      feesComparison,
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
        `An error occurred while fetching the exchange fees for userId: ${user.id}`,
        error
      );
      throw createError({
        statusCode: 500,
        message: "Failed to retrieve exchange fees",
      });
    }
  }
};
