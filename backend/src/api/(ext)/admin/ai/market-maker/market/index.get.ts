import { models } from "@b/db";
import { aiMarketMakerSchema } from "../utils";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Lists all AI Market Makers with pagination and optional filtering",
  operationId: "listAiMarketMakers",
  tags: ["Admin", "AI Market Maker", "Market Maker"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of AI Market Makers with pool summaries",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: aiMarketMakerSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Market Makers"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ai.market-maker.market",
};

export default async (data: Handler) => {
  const { query } = data;

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
