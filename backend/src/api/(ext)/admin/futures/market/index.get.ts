import { marketSchema } from "@b/api/admin/finance/exchange/market/utils";
import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary:
    "Lists all futures market entries with pagination and optional filtering",
  operationId: "listFuturesMarkets",
  tags: ["Admin", "Futures", "Markets"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of futures markets with optional details on trending status and metadata",
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
    404: notFoundMetadataResponse("Futures Markets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.futures.market",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.futuresMarket,
    query,
    sortField: query.sortField || "currency",
  });
};
