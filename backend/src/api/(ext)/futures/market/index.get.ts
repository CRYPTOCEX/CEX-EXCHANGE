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

export default async () => {
  const markets = await models.futuresMarket.findAll({
    where: { status: true },
  });
  
  // Add symbol property to each market using currency/pair format
  return markets.map((market) => ({
    ...market.toJSON(),
    symbol: `${market.currency}/${market.pair}`,
  }));
};
