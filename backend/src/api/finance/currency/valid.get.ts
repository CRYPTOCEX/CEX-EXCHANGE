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
  logModule: "FINANCE",
  logTitle: "Get valid currencies",
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

export default async (data: Handler) => {
  const { ctx } = data;
  const where = { status: true };

  try {
    ctx?.step("Fetching currencies from all wallet types");
    const [fiatCurrencies, spotCurrencies, ecoCurrencies] = await Promise.all([
      models.currency.findAll({ where }),
      models.exchangeCurrency.findAll({ where }),
      models.ecosystemToken.findAll({ where }),
    ]);

    ctx?.step("Formatting currency data");
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

    ctx?.success(`Retrieved ${fiatCurrencies.length} FIAT, ${spotCurrencies.length} SPOT, ${ecoCurrencies.length} ECO currencies`);
    return formattedCurrencies;
  } catch (error) {
    ctx?.fail("Failed to fetch currencies");
    throw createError(500, "An error occurred while fetching currencies");
  }
};
