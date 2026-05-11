// /server/api/exchange/currencies/show.get.ts

import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";
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
  const { id } = data.params;
  try {
    const cachedCurrencies = await redis.get("exchangeCurrencies");
    if (cachedCurrencies) {
      const currencies = JSON.parse(cachedCurrencies);
      const currency = currencies.find((c) => c.id === Number(id));
      if (currency) return currency;
    }
  } catch (err) {
    console.error("Redis error:", err);
  }
  return await getCurrency(Number(id));
};

export async function getCurrency(
  id: number
): Promise<ExchangeCurrency | null> {
  const response = await models.exchangeCurrency.findOne({
    where: {
      id: id,
      status: true,
    },
  });

  if (!response) {
    throw new Error("Currency not found");
  }

  return response.get({ plain: true }) as unknown as ExchangeCurrency;
}
