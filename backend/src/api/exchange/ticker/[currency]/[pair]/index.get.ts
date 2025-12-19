import { baseTickerSchema } from "@b/api/exchange/utils";
import ExchangeManager from "@b/utils/exchange";
import { logger } from "@b/utils/console";

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
  logModule: "EXCHANGE",
  logTitle: "Get Ticker for Pair",
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
  const { params, ctx } = data;
  const { currency, pair } = params;
  const symbol = `${currency}/${pair}`;

  try {
    ctx?.step(`Fetching ticker for ${symbol}`);
    const unblockTime = await loadBanStatus();
    if (await handleBanStatus(unblockTime)) {
      return serverErrorResponse;
    }

    const exchange = await ExchangeManager.startExchange(ctx);
    if (!exchange) {
      logger.error("EXCHANGE", "Failed to start exchange");
      return serverErrorResponse;
    }

    const ticker = await exchange.fetchTicker(symbol);

    if (!ticker) {
      return notFoundMetadataResponse("Ticker");
    }

    ctx?.success(`Ticker retrieved for ${symbol}`);
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
    logger.error("EXCHANGE", "Failed to fetch ticker", error);
    return serverErrorResponse;
  }
};
