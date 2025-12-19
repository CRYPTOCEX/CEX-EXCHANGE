// /server/api/ai/investments/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { aiInvestmentSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all AI investments with pagination and optional filtering",
  operationId: "listAIInvestments",
  tags: ["Admin", "AI Investment"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of AI investments with detailed pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: aiInvestmentSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Investments"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ai.investment",
  logModule: "ADMIN_AI",
  logTitle: "List AI investments",
  demoMask: ["items.user.email"],
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching AI investments");
  const result = await getFiltered({
    model: models.aiInvestment,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.aiInvestmentPlan,
        as: "plan",
        attributes: ["title", "image"],
      },
      {
        model: models.aiInvestmentDuration,
        as: "duration",
        attributes: ["duration", "timeframe"],
      },
    ],
  });

  ctx?.success(`Retrieved ${result.items?.length || 0} investment(s)`);
  return result;
};
