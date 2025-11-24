// /server/api/exchange/settings/fetch-missing-currencies.get.ts

import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata = {
  summary: "Fetch Missing Currencies",
  operationId: "fetchMissingCurrencies",
  tags: ["Admin", "Settings", "Exchange"],
  description:
    "Fetches all active markets, extracts unique currencies, compares with active currencies in the database, and returns the missing ones with their IDs.",
  requiresAuth: true,
  responses: {
    200: {
      description: "Missing currencies fetched successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              missingCurrencies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    currency: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Currencies"),
    500: serverErrorResponse,
  },
  permission: "view.spot.currency",
};

export default async (data: Handler) => {
  try {
    // Fetch all active markets
    const activeMarkets = await models.exchangeMarket.findAll({
      attributes: ["currency", "pair"],
      where: {
        status: true,
      },
    });

    // Extract unique currencies from markets
    const currencySet = new Set<string>();
    activeMarkets.forEach((market) => {
      const { currency, pair } = market;
      currencySet.add(currency);
      currencySet.add(pair);
    });
    const marketCurrencies = Array.from(currencySet);

    // Fetch all currencies
    const allCurrencies = await models.exchangeCurrency.findAll({
      attributes: ["id", "currency", "status"],
    });
    const activeCurrencies = allCurrencies.filter(
      (currency) => currency.status
    );

    const currencyList = activeCurrencies.map((currency) => currency.currency);

    // Find missing currencies
    const missingCurrencies = marketCurrencies
      .filter((currency) => !currencyList.includes(currency))
      .map((currency) => {
        const currencyRecord = allCurrencies.find(
          (cur) => cur.currency === currency
        );
        if (currencyRecord && currencyRecord.id) {
          return { id: currencyRecord.id, currency };
        }
        return null;
      })
      .filter(Boolean); // Remove null entries

    return missingCurrencies;
  } catch (error) {
    return {
      status: 500,
      body: serverErrorResponse,
    };
  }
};
