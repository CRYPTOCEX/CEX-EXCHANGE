import { models } from "@b/db";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { binaryMarketSchema } from "./utils";

export const metadata = {
  summary: "Lists all binary markets with pagination and optional filtering",
  operationId: "listBinaryMarkets",
  tags: ["Admin", "Binary", "Markets"],
  parameters: [
    ...crudParameters,
    {
      name: "currency",
      in: "query",
      description: "Filter markets by currency",
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
      description: "List of binary markets with detailed information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: binaryMarketSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Binary Markets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.binary.market",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.binaryMarket,
    query,
    sortField: query.sortField || "currency",
    paranoid: false,
  });
};