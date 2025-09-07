import ExchangeManager from "@b/utils/exchange";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a single currency by its ID",
  description: "This endpoint retrieves a single currency by its ID.",
  operationId: "getCurrencyById",
  tags: ["Finance", "Currency"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "type",
      in: "query",
      required: true,
      schema: {
        type: "string",
        enum: ["FIAT", "SPOT", "ECO"],
      },
    },
  ],
  responses: {
    200: {
      description: "Currency retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                value: { type: "string" },
                label: { type: "string" },
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
  const { user, query } = data;
  if (!user?.id) throw createError(401, "Unauthorized");
  const { type } = query;

  const where = { status: true };
  try {
    let currencies;
    let formatted;

    switch (type) {
      case "FIAT":
        currencies = await models.currency.findAll({ where });
        formatted = currencies.map((currency) => ({
          id: currency.id,
          name: `${currency.id} > ${currency.name}`,
        }));
        break;
      case "SPOT":
        currencies = await models.exchangeCurrency.findAll({ where });
        formatted = currencies.map((currency) => ({
          id: currency.currency,
          name: `${currency.currency} > ${currency.name}`,
        }));
        break;
      case "ECO":
        currencies = await models.ecosystemToken.findAll({ where });
        formatted = currencies
          .filter(
            (currency, index, self) =>
              self.findIndex((c) => c.currency === currency.currency) === index
          )
          .map((currency) => ({
            id: currency.currency,
            name: `${currency.currency} > ${currency.name}`,
          }));
        break;
      default:
        formatted = [];
    }

    return formatted;
  } catch (error) {
    throw createError(500, "An error occurred while fetching currencies");
  }
};
