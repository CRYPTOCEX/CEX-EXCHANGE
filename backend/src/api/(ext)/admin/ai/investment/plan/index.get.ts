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
  summary: "Lists all AI Investment Plans",
  operationId: "listAiInvestmentPlans",
  tags: ["Admin", "AI Investment", "Plan"],
  description:
    "Retrieves a paginated list of all AI Investment Plans with support for filtering, sorting, and searching. Includes associated investments and durations for each plan.",
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of AI Investment Plans with detailed information including investments and durations, along with pagination metadata",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
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
  logModule: "ADMIN_AI",
  logTitle: "List investment plans",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching investment plans");
  const result = await getFiltered({
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

  ctx?.success(`Retrieved ${result.items?.length || 0} plan(s)`);
  return result;
};
