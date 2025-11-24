// /server/api/forex/plans/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { forexPlanSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all Forex Plans with pagination and optional filtering",
  operationId: "listForexPlans",
  tags: ["Admin", "Forex", "Plans"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Forex Plans with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: forexPlanSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Plans"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.forex.plan",
};

export default async (data: Handler) => {
  const { query } = data;

  // Using the getFiltered function which processes all CRUD parameters, including sorting and filtering
  return getFiltered({
    model: models.forexPlan,
    query,
    sortField: query.sortField || "createdAt",
    numericFields: [
      "minProfit",
      "maxProfit",
      "minAmount",
      "maxAmount",
      "profitPercentage",
      "defaultProfit",
      "defaultResult",
    ],
    includeModels: [
      {
        model: models.forexDuration,
        as: "durations",
        through: { attributes: [] },
        attributes: ["id", "duration", "timeframe"],
      },
    ],
  });
};
