import { RedisSingleton } from "@b/utils/redis";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseTickerSchema } from "../utils";
import { createError } from "@b/utils/error";

const redis = RedisSingleton.getInstance();

export const metadata: OperationObject = {
  summary: "Get All Market Tickers",
  operationId: "getAllMarketTickers",
  tags: ["Exchange", "Markets"],
  description: "Retrieves ticker information for all available market pairs.",
  responses: {
    200: {
      description: "All market tickers information",
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

export default async () => {
  const cachedData = await redis.get("exchange:tickers");

  if (!cachedData) {
    throw createError(404, "No tickers found in cache");
  }

  const tickers = JSON.parse(cachedData || "{}");

  return tickers;
};
