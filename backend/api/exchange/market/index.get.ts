// /server/api/exchange/markets/index.get.ts

import { baseMarketSchema } from "./utils";
import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";
import { Op } from "sequelize";

const redis = RedisSingleton.getInstance();

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "List Exchange Markets",
  operationId: "listMarkets",
  tags: ["Exchange", "Markets"],
  description: "Retrieves a list of all available markets.",
  parameters: [
    {
      name: "eco",
      in: "query",
      required: true,
      description: "include eco",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "A list of markets",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseMarketSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Market"),
    500: serverErrorResponse,
  },
};

const CACHE_KEY_PREFIX = "ecosystem_token_icon:";
const CACHE_EXPIRY = 3600; // 1 hour in seconds

async function getTokenIconFromCache(currency: string): Promise<string | null> {
  const cacheKey = `${CACHE_KEY_PREFIX}${currency}`;
  const cachedIcon = await redis.get(cacheKey);
  return cachedIcon;
}

async function setTokenIconInCache(
  currency: string,
  icon: string
): Promise<void> {
  const cacheKey = `${CACHE_KEY_PREFIX}${currency}`;
  await redis.set(cacheKey, icon, "EX", CACHE_EXPIRY);
}

export default async (data: Handler) => {
  const { query } = data;
  const { eco } = query;
  const exchangeMarkets = await models.exchangeMarket.findAll({
    where: {
      status: true,
    },
  });

  let ecosystemMarkets: any[] = [];
  if (eco === "true") {
    ecosystemMarkets = await models.ecosystemMarket.findAll({
      where: {
        status: true,
      },
    });

    // Extract currencies and remove duplicates
    const currencies: string[] = Array.from(
      new Set(
        ecosystemMarkets
          .map((market) => market.currency)
          .filter((currency): currency is string => currency !== undefined)
      )
    );

    // Fetch icons from cache or database
    const tokenMap: Record<string, string | null> = {};
    const missingCurrencies: string[] = [];

    for (const currency of currencies) {
      const cachedIcon = await getTokenIconFromCache(currency);
      if (cachedIcon !== null) {
        tokenMap[currency] = cachedIcon;
      } else {
        missingCurrencies.push(currency);
      }
    }

    if (missingCurrencies.length > 0) {
      const tokens = await models.ecosystemToken.findAll({
        where: {
          currency: {
            [Op.in]: missingCurrencies,
          },
        },
      });

      for (const token of tokens) {
        if (token.currency && token.icon) {
          tokenMap[token.currency] = token.icon;
          await setTokenIconInCache(token.currency, token.icon);
        }
      }
    }

    // Add icons to ecosystem markets
    ecosystemMarkets = ecosystemMarkets.map((market) => {
      const icon = market.currency ? tokenMap[market.currency] || null : null;
      return {
        ...market.get({ plain: true }),
        icon,
        isEco: true,
      };
    });
  }

  const markets = [
    ...exchangeMarkets.map((market) => ({
      ...market.get({ plain: true }),
      isEco: false,
    })),
    ...ecosystemMarkets,
  ];

  return markets;
};
