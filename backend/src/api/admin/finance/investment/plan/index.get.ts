// /server/api/investment/plans/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { investmentPlanSchema } from "./utils";

export const metadata = {
  summary: "Lists all Investment Plans with pagination and optional filtering",
  operationId: "listInvestmentPlans",
  tags: ["Admin", "Investment", "Plans"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Investment Plans with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: investmentPlanSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Investment Plans"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.investment.plan",
};

export default async (data: Handler) => {
  const { query } = data;

  // Using the getFiltered function which processes all CRUD parameters, including sorting and filtering
  return getFiltered({
    model: models.investmentPlan,
    query,
    sortField: query.sortField || "createdAt",
    numericFields: [
      "minProfit",
      "maxProfit",
      "minAmount",
      "maxAmount",
      "invested",
      "profitPercentage",
      "defaultProfit",
      "defaultResult",
    ],
    includeModels: [
      {
        model: models.investmentDuration,
        as: "durations",
        through: { attributes: [] },
        attributes: ["id", "duration", "timeframe"],
      },
    ],
  });
};
