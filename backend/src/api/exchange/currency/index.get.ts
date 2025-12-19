// /server/api/exchange/currencies/index.get.ts

import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";
import { logger } from "@b/utils/console";

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
  logModule: "EXCHANGE",
  logTitle: "Get Currencies",
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

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Retrieving currencies from cache");
  try {
    const cachedCurrencies = await redis.get("exchangeCurrencies");
    if (cachedCurrencies) {
      const currencies = JSON.parse(cachedCurrencies);
      ctx?.success(`Retrieved ${currencies.length} currencies from cache`);
      return currencies;
    }
  } catch (err) {
    logger.error("EXCHANGE", "Redis error", err);
  }

  ctx?.step("Fetching currencies from database");
  const currencies = await getCurrencies();
  ctx?.success(`Retrieved ${currencies.length} currencies`);
  return currencies;
};

export async function getCurrencies(): Promise<exchangeCurrencyAttributes[]> {
  const response = (
    await models.exchangeCurrency.findAll({
      where: {
        status: true,
      },
    })
  ).map((c) => c.get({ plain: true }));

  return response as unknown as exchangeCurrencyAttributes[];
}
