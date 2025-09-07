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
  summary:
    "Lists all AI investment durations with pagination and optional filtering",
  operationId: "listAIInvestmentDurations",
  tags: ["Admin", "AI Investment Duration"],
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
              data: {
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
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.aiInvestmentDuration,
    query,
    sortField: query.sortField || "duration",
    paranoid: false,
  });
};
