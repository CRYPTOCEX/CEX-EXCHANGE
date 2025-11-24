// /server/api/admin/exchange/currencies/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseExchangeCurrencySchema } from "./utils";

export const metadata = {
  summary: "Lists exchange currencies with pagination and optional filtering",
  operationId: "listExchangeCurrencies",
  tags: ["Admin", "Exchange Currencies"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of exchange currencies with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: baseExchangeCurrencySchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Exchange Currencies"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.spot.currency",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.exchangeCurrency,
    query,
    sortField: query.sortField || "currency",
    numericFields: ["price", "precision"],
    timestamps: false,
    customStatus: [
      {
        key: "status",
        true: "ACTIVE",
        false: "INACTIVE",
      },
    ],
  });
};
