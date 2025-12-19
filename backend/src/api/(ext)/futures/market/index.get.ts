import { models } from "@b/db";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseFuturesMarketSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Retrieves all futures markets",
  description: "Fetches a list of all active futures markets.",
  operationId: "listFuturesMarkets",
  tags: ["Futures", "Markets"],
  logModule: "FUTURES",
  logTitle: "List futures markets",
  responses: {
    200: {
      description: "Futures markets retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseFuturesMarketSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Futures Market"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step?.("Fetching active futures markets");
  const markets = await models.futuresMarket.findAll({
    where: { status: true },
  });

  ctx?.step?.("Formatting market data");
  // Add symbol property to each market using currency/pair format
  const result = markets.map((market) => ({
    ...market.toJSON(),
    symbol: `${market.currency}/${market.pair}`,
  }));

  ctx?.success?.(`Retrieved ${result.length} active futures markets`);
  return result;
};
