import { models } from "@b/db";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { getFiltered } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { futuresMarketSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all futures markets with pagination and filtering",
  operationId: "listFuturesMarkets",
  tags: ["Admin", "Futures", "Market"],
  description:
    "Retrieves a paginated list of all futures markets with support for filtering, sorting, and search. Returns market details including currency pairs, status, trending indicators, and trading parameters.",
  parameters: crudParameters,
  responses: {
    200: {
      description: "Futures markets retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: futuresMarketSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Futures Markets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.futures.market",
  logModule: "ADMIN_FUT",
  logTitle: "Get Futures Markets",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching futures markets");
  const result = await getFiltered({
    model: models.futuresMarket,
    query,
    sortField: query.sortField || "currency",
  });

  ctx?.success(`Retrieved ${result.items.length} futures markets`);
  return result;
};
