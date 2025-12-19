import { models } from "@b/db";
import { aiMarketMakerSchema } from "../utils";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { getFiltered } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "List all AI Market Maker markets",
  operationId: "listAiMarketMakerMarkets",
  tags: ["Admin", "AI Market Maker", "Market"],
  description:
    "Retrieves a paginated list of all AI Market Maker markets with their associated pool data, ecosystem market details, and current configuration. Supports filtering, sorting, and searching across market parameters.",
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of AI Market Maker markets retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ...aiMarketMakerSchema,
                    pool: {
                      type: "object",
                      description: "Market maker pool balances and P&L",
                    },
                    market: {
                      type: "object",
                      description: "Associated ecosystem market details",
                    },
                  },
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("AI Market Maker Markets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  logModule: "ADMIN_AI",
  logTitle: "Get Market Maker Markets",
  permission: "view.ai.market-maker.market",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Get Market Maker Markets");
  ctx?.success("Get Market Maker Markets retrieved successfully");
  return getFiltered({
    model: models.aiMarketMaker,
    query,
    sortField: query.sortField || "createdAt",
    paranoid: false,
    includeModels: [
      {
        model: models.aiMarketMakerPool,
        as: "pool",
      },
      {
        model: models.ecosystemMarket,
        as: "market",
      },
    ],
  });
};
