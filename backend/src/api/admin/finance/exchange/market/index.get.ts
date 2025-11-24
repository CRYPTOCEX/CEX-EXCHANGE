// /server/api/exchange/markets/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { marketSchema } from "./utils";

export const metadata = {
  summary: "Lists all exchange markets with pagination and optional filtering",
  operationId: "listExchangeMarkets",
  tags: ["Admin", "Exchange", "Markets"],
  parameters: [
    ...crudParameters,
    {
      name: "symbol",
      in: "query",
      description: "Filter markets by trading symbol",
      schema: { type: "string" },
      required: false,
    },
    {
      name: "pair",
      in: "query",
      description: "Filter markets by trading pair",
      schema: { type: "string" },
      required: false,
    },
    {
      name: "status",
      in: "query",
      description: "Filter markets by status (active or not)",
      schema: { type: "boolean" },
      required: false,
    },
  ],
  responses: {
    200: {
      description: "List of exchange markets with detailed information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: marketSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Exchange Markets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.exchange.market",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.exchangeMarket,
    query,
    sortField: query.sortField || "currency",
    paranoid: false,
  });
};
