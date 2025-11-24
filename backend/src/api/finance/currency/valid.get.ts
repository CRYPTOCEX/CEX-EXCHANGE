import { createError } from "@b/utils/error";
import { baseCurrencySchema, baseResponseSchema } from "./utils";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Lists all currencies with their current rates",
  description:
    "This endpoint retrieves all available currencies along with their current rates.",
  operationId: "getCurrencies",
  tags: ["Finance", "Currency"],
  responses: {
    200: {
      description: "Currencies retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...baseResponseSchema,
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: baseCurrencySchema,
                },
              },
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
  const where = { status: true };

  try {
    // Fetch currencies from all models
    const [fiatCurrencies, spotCurrencies, ecoCurrencies] = await Promise.all([
      models.currency.findAll({ where }),
      models.exchangeCurrency.findAll({ where }),
      models.ecosystemToken.findAll({ where }),
    ]);

    // Format and combine all currencies into categorized objects
    const formattedCurrencies = {
      FIAT: fiatCurrencies.map((currency) => ({
        value: currency.id,
        label: `${currency.id} - ${currency.name}`,
      })),
      SPOT: spotCurrencies.map((currency) => ({
        value: currency.currency,
        label: `${currency.currency} - ${currency.name}`,
      })),
      FUNDING: ecoCurrencies
        .filter(
          (currency, index, self) =>
            self.findIndex((c) => c.currency === currency.currency) === index
        ) // Filter duplicates
        .map((currency) => ({
          value: currency.currency,
          label: `${currency.currency} - ${currency.name}`,
        })),
    };

    return formattedCurrencies;
  } catch (error) {
    throw createError(500, "An error occurred while fetching currencies");
  }
};
