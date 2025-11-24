// /server/api/ai/investmentPlans/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { aiInvestmentPlanSchema } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all AI investment plans with pagination and optional filtering",
  operationId: "listAIInvestmentPlans",
  tags: ["Admin", "AI Investment Plan"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of AI investment plans with detailed information and pagination",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: aiInvestmentPlanSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Investment Plans"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ai.investment.plan",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.aiInvestmentPlan,
    query,
    sortField: query.sortField || "name",
    includeModels: [
      {
        model: models.aiInvestment,
        as: "investments",
        attributes: ["id", "amount", "profit", "status"],
      },
      {
        model: models.aiInvestmentDuration,
        as: "durations",
        through: { attributes: [] },
        attributes: ["id", "duration", "timeframe"],
      },
    ],
  });
};
