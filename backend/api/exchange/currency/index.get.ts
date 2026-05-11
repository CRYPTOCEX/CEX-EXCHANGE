// /server/api/exchange/currencies/index.get.ts

import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";

const redis = RedisSingleton.getInstance();

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseCurrencySchema } from "./utils";

export const metadata: OperationObject = {
  summary: "List Currencies",
  operationId: "getCurrencies",
  tags: ["Currencies"],
  description: "Retrieves a list of all currencies.",
  responses: {
    200: {
      description: "A list of currencies",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseCurrencySchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Currency"),
    500: serverErrorResponse,
  },
};

export default async () => {
  try {
    const cachedCurrencies = await redis.get("exchangeCurrencies");
    if (cachedCurrencies) return JSON.parse(cachedCurrencies);
  } catch (err) {
    console.error("Redis error:", err);
  }
  return await getCurrencies();
};

export async function getCurrencies(): Promise<ExchangeCurrency[]> {
  const response = (
    await models.exchangeCurrency.findAll({
      where: {
        status: true,
      },
    })
  ).map((c) => c.get({ plain: true }));

  return response as unknown as ExchangeCurrency[];
}
