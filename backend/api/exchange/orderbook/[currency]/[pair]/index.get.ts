import { baseOrderBookSchema } from "@b/api/exchange/utils";
import ExchangeManager from "@b/utils/exchange";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import {
  loadBanStatus,
  handleBanStatus,
  formatWaitTime,
} from "@b/api/exchange/utils";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Get Market Order Book",
  operationId: "getMarketOrderBook",
  tags: ["Exchange", "Markets"],
  description: "Retrieves the order book for a specific market pair.",
  parameters: [
    {
      name: "currency",
      in: "path",
      description: "Currency symbol",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "pair",
      in: "path",
      description: "Pair symbol",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "limit",
      in: "query",
      description: "Limit the number of order book entries",
      schema: { type: "number" },
    },
  ],
  responses: {
    200: {
      description: "Order book information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseOrderBookSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Orderbook"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { currency, pair } = data.params;
  const limit = data.query.limit ? parseInt(data.query.limit, 10) : undefined;

  try {
    // Check for ban status
    const unblockTime = await loadBanStatus();
    if (await handleBanStatus(unblockTime)) {
      throw createError(
        503,
        "Service temporarily unavailable. Please try again later."
      );
    }

    const exchange = await ExchangeManager.startExchange();
    if (!exchange) {
      throw createError(
        503,
        "Service temporarily unavailable. Please try again later."
      );
    }

    const orderBook = await exchange.fetchOrderBook(
      `${currency}/${pair}`,
      limit
    );

    return {
      asks: orderBook.asks,
      bids: orderBook.bids,
    };
  } catch (error) {
    console.error(`Failed to fetch order book: ${error.message}`);
    if (error.statusCode === 503) {
      throw error;
    }
    throw createError(500, "Unable to fetch order book at this time");
  }
};
