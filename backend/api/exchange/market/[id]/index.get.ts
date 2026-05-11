// /server/api/exchange/markets/show.get.ts

import { RedisSingleton } from "@b/utils/redis";
import { models } from "@b/db";

const redis = RedisSingleton.getInstance();

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseMarketSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Show Market Details",
  operationId: "showMarket",
  tags: ["Exchange", "Markets"],
  description: "Retrieves details of a specific market by ID.",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "The ID of the market to retrieve.",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Market details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseMarketSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Market"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { id } = data.params;
  try {
    const cachedMarkets = await redis.get("exchangeMarkets");
    if (cachedMarkets) {
      const markets = JSON.parse(cachedMarkets);
      const market = markets.find((m) => m.id === id);
      if (market) return market;
    }
  } catch (err) {
    console.error("Redis error:", err);
  }
  return await getMarket(id);
};

export async function getMarket(id: string): Promise<ExchangeMarket> {
  const response = await models.exchangeMarket.findOne({
    where: {
      id: id,
    },
  });

  if (!response) {
    throw new Error("Market not found");
  }

  return response.get({ plain: true }) as unknown as ExchangeMarket;
}
