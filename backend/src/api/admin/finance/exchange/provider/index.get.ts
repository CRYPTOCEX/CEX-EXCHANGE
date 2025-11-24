// /server/api/exchange/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { exchangeSchema } from "./utils";

export const metadata = {
  summary: "Lists all exchanges with pagination and optional filtering",
  operationId: "listExchanges",
  tags: ["Admin", "Exchange"],
  parameters: [
    ...crudParameters,
    {
      name: "name",
      in: "query",
      description: "Filter exchanges by name",
      schema: { type: "string" },
      required: false,
    },
    {
      name: "type",
      in: "query",
      description: "Filter exchanges by type (e.g., spot, futures)",
      schema: { type: "string" },
      required: false,
    },
    {
      name: "status",
      in: "query",
      description: "Filter exchanges by operational status",
      schema: { type: "boolean" },
      required: false,
    },
  ],
  responses: {
    200: {
      description: "List of exchanges with detailed information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: exchangeSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Exchanges"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.exchange",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.exchange,
    query,
    sortField: query.sortField || "name",
    paranoid: false,
  });
};
