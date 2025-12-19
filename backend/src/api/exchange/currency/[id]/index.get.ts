// /server/api/exchange/currencies/show.get.ts

import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";
import { logger } from "@b/utils/console";
const redis = RedisSingleton.getInstance();

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseCurrencySchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Show Currency",
  operationId: "getCurrency",
  tags: ["Currencies"],
  description: "Retrieves details of a specific currency by ID.",
  logModule: "EXCHANGE",
  logTitle: "Get Currency Details",
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the currency to retrieve.",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Currency details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseCurrencySchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Currency"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { params, ctx } = data;
  const { id } = params;

  ctx?.step(`Fetching currency ${id}`);
  try {
    const cachedCurrencies = await redis.get("exchangeCurrencies");
    if (cachedCurrencies) {
      const currencies = JSON.parse(cachedCurrencies);
      const currency = currencies.find((c) => c.id === Number(id));
      if (currency) {
        ctx?.success("Currency retrieved from cache");
        return currency;
      }
    }
  } catch (err) {
    logger.error("EXCHANGE", "Redis error", err);
  }

  const currency = await getCurrency(Number(id));
  ctx?.success("Currency retrieved successfully");
  return currency;
};

export async function getCurrency(
  id: number
): Promise<exchangeCurrencyAttributes | null> {
  const response = await models.exchangeCurrency.findOne({
    where: {
      id: id,
      status: true,
    },
  });

  if (!response) {
    throw new Error("Currency not found");
  }

  return response.get({ plain: true }) as unknown as exchangeCurrencyAttributes;
}
