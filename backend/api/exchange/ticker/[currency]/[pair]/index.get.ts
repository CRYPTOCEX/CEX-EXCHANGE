import { baseTickerSchema } from "@b/api/exchange/utils";
import ExchangeManager from "@b/utils/exchange";
import { logError } from "@b/utils/logger";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import {
  loadBanStatus,
  handleBanStatus,
  handleExchangeError,
} from "@b/api/exchange/utils";

export const metadata: OperationObject = {
  summary: "Get Market Ticker",
  operationId: "getMarketTicker",
  tags: ["Exchange", "Markets"],
  description: "Retrieves ticker information for a specific market pair.",
  parameters: [
    {
      name: "currency",
      in: "path",
      required: true,
      description: "The base currency of the market pair.",
      schema: { type: "string" },
    },
    {
      name: "pair",
      in: "path",
      required: true,
      description: "The quote currency of the market pair.",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Ticker information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseTickerSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ticker"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { currency, pair } = data.params;
  const symbol = `${currency}/${pair}`;

  try {
    const unblockTime = await loadBanStatus();
    if (await handleBanStatus(unblockTime)) {
      return serverErrorResponse;
    }

    const exchange = await ExchangeManager.startExchange();
    if (!exchange) {
      logError("exchange", new Error("Failed to start exchange"), __filename);
      return serverErrorResponse;
    }

    const ticker = await exchange.fetchTicker(symbol);

    if (!ticker) {
      return notFoundMetadataResponse("Ticker");
    }

    return {
      symbol: ticker.symbol,
      bid: ticker.bid,
      ask: ticker.ask,
      close: ticker.close,
      last: ticker.last,
      change: ticker.percentage,
      baseVolume: ticker.baseVolume,
      quoteVolume: ticker.quoteVolume,
    };
  } catch (error) {
    const result = await handleExchangeError(error, ExchangeManager);
    if (typeof result === "number") {
      return serverErrorResponse;
    }
    logError("exchange", error, __filename);
    return serverErrorResponse;
  }
};
