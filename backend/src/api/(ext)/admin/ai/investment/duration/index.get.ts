// /server/api/ai/investmentDurations/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { aiInvestmentDurationSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "List all AI investment durations",
  operationId: "listAiInvestmentDurations",
  tags: ["Admin", "AI Investment", "Duration"],
  description:
    "Retrieves a paginated list of all AI investment duration options. Supports filtering, sorting, and pagination for managing investment timeframes.",
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of AI investment durations with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: aiInvestmentDurationSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Investment Durations"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ai.investment.duration",
  logModule: "ADMIN_AI",
  logTitle: "List investment durations",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching investment durations");
  const result = await getFiltered({
    model: models.aiInvestmentDuration,
    query,
    sortField: query.sortField || "duration",
    paranoid: false,
  });

  ctx?.success(`Retrieved ${result.items?.length || 0} duration(s)`);
  return result;
};
