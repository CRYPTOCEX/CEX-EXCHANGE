// /server/api/ecosystem/markets/index.get.ts

import { marketSchema } from "@b/api/admin/finance/exchange/market/utils";
import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
} from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Lists all ecosystem markets",
  description:
    "Retrieves a paginated list of all ecosystem markets with optional filtering and sorting. Markets include trading pairs, trending and hot status indicators, and metadata about precision, limits, and fees.",
  operationId: "listEcosystemMarkets",
  tags: ["Admin", "Ecosystem", "Market"],
  parameters: crudParameters,
  logModule: "ADMIN_ECO",
  logTitle: "List markets",
  responses: {
    200: {
      description:
        "List of ecosystem markets retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
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
    404: notFoundMetadataResponse("Ecosystem Markets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecosystem.market",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching ecosystem markets");
  const result = await getFiltered({
    model: models.ecosystemMarket,
    query,
    sortField: query.sortField || "currency",
  });

  ctx?.success("Markets retrieved successfully");
  return result;
};
