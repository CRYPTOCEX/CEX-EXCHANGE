// /server/api/exchange/markets/show.get.ts

import { RedisSingleton } from "@b/utils/redis";
import { models } from "@b/db";
import { logger } from "@b/utils/console";

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
  logModule: "EXCHANGE",
  logTitle: "Get Market Details",
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
  const { params, ctx } = data;
  const { id } = params;

  ctx?.step(`Fetching market ${id}`);
  try {
    const cachedMarkets = await redis.get("exchangeMarkets");
    if (cachedMarkets) {
      const markets = JSON.parse(cachedMarkets);
      const market = markets.find((m) => m.id === id);
      if (market) {
        ctx?.success("Market retrieved from cache");
        return market;
      }
    }
  } catch (err) {
    logger.error("EXCHANGE", "Redis error", err);
  }

  const market = await getMarket(id);
  ctx?.success("Market retrieved successfully");
  return market;
};

export async function getMarket(id: string): Promise<exchangeMarketAttributes> {
  const response = await models.exchangeMarket.findOne({
    where: {
      id: id,
    },
  });

  if (!response) {
    throw new Error("Market not found");
  }

  return response.get({ plain: true }) as unknown as exchangeMarketAttributes;
}
